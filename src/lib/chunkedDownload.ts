import sodium from 'libsodium-wrappers-sumo';
import { decryptStreamFile, decryptBytes, fromBase64 } from './crypto';
import { ChunkProgress, UploadState } from './chunkedUpload';

export interface DownloadOptions {
    expectedHash?: string;
    passphrase?: string;
    onProgress?: (progress: ChunkProgress) => void;
    signal?: AbortSignal;
    isEncrypted?: boolean;
    encryptionMetadata?: {
        header?: string;
        salt?: string;
        nonce?: string;
        originalSize?: number;
        originalType?: string;
        chunkSize?: number;
    };
}

export interface DownloadResult {
    success: boolean;
    blobUrl: string;
    filename: string;
    totalBytes: number;
    hash: string;
    verified: boolean;
}

/**
 * Downloads a file using chunked progressive streaming with real-time SHA-256
 * checksum calculation and optional streaming E2EE decryption.
 */
export async function downloadFileStreaming(
    fileUrl: string,
    filename: string,
    options?: DownloadOptions
): Promise<DownloadResult> {
    await sodium.ready;

    const reportProgress = (
        state: UploadState,
        uploadedBytes: number,
        totalBytes: number,
        speedMBs: number,
        etaSeconds: number,
        error?: string
    ) => {
        const percent = totalBytes > 0
            ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100))
            : (state === 'completed' ? 100 : 0);

        options?.onProgress?.({
            state,
            percent,
            uploadedBytes,
            totalBytes,
            speedMBs: Math.max(0, parseFloat(speedMBs.toFixed(2))),
            etaSeconds: Math.max(0, Math.round(etaSeconds)),
            error,
        });
    };

    reportProgress('starting', 0, 0, 0, 0);

    const response = await fetch(fileUrl, {
        signal: options?.signal,
    });

    if (!response.ok) {
        const errMsg = `Download failed: HTTP ${response.status} ${response.statusText}`;
        reportProgress('failed', 0, 0, 0, 0, errMsg);
        throw new Error(errMsg);
    }

    if (!response.body) {
        throw new Error('ReadableStream not supported on this response body');
    }

    const contentLengthHeader = response.headers.get('content-length');
    const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

    const wireHasher = sodium.crypto_hash_sha256_init();
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];

    let receivedBytes = 0;
    const startTime = performance.now();
    let lastSampleTime = startTime;
    let lastSampleBytes = 0;
    let currentSpeedMBs = 0;

    reportProgress('uploading', 0, totalBytes, 0, 0);

    while (true) {
        if (options?.signal?.aborted) {
            reportProgress('cancelled', receivedBytes, totalBytes, 0, 0, 'Download cancelled');
            throw new Error('Download cancelled by user');
        }

        const { done, value } = await reader.read();
        if (done) break;

        if (value && value.length > 0) {
            chunks.push(value);
            receivedBytes += value.length;
            sodium.crypto_hash_sha256_update(wireHasher, value);

            const now = performance.now();
            const timeDelta = (now - lastSampleTime) / 1000;
            if (timeDelta >= 0.25) {
                const bytesDelta = receivedBytes - lastSampleBytes;
                const instantSpeed = (bytesDelta / (1024 * 1024)) / timeDelta;
                currentSpeedMBs = currentSpeedMBs === 0 ? instantSpeed : (0.35 * instantSpeed + 0.65 * currentSpeedMBs);
                lastSampleTime = now;
                lastSampleBytes = receivedBytes;
            }

            const remainingBytes = totalBytes > receivedBytes ? totalBytes - receivedBytes : 0;
            const etaSeconds = currentSpeedMBs > 0 ? (remainingBytes / (1024 * 1024)) / currentSpeedMBs : 0;

            reportProgress('uploading', receivedBytes, totalBytes, currentSpeedMBs, etaSeconds);
        }
    }

    // Verify cryptographic SHA-256 checksum
    reportProgress('verifying', receivedBytes, totalBytes, currentSpeedMBs, 0);
    const calculatedHash = sodium.to_hex(sodium.crypto_hash_sha256_final(wireHasher));
    const expectedHash = options?.expectedHash?.toLowerCase()?.trim();
    const verified = Boolean(!expectedHash || expectedHash === calculatedHash);

    if (expectedHash && !verified) {
        const errorMsg = `SHA-256 integrity mismatch: received ${calculatedHash.slice(0, 8)}..., expected ${expectedHash.slice(0, 8)}...`;
        reportProgress('failed', receivedBytes, totalBytes, 0, 0, errorMsg);
        throw new Error(errorMsg);
    }

    // Concatenate all wire chunks
    const totalWireBytes = chunks.reduce((acc, c) => acc + c.length, 0);
    const wireBuffer = new Uint8Array(totalWireBytes);
    let offset = 0;
    for (const chunk of chunks) {
        wireBuffer.set(chunk, offset);
        offset += chunk.length;
    }

    let finalBlob: Blob;
    let finalFilename = filename;

    // Decrypt if encrypted
    if (options?.isEncrypted && options.passphrase) {
        const meta = options.encryptionMetadata;
        let plainBytes: Uint8Array;

        if (meta?.salt && meta?.header) {
            plainBytes = decryptStreamFile(
                wireBuffer,
                options.passphrase,
                meta.salt,
                meta.chunkSize || (2 * 1024 * 1024)
            );
        } else if (meta?.salt && meta?.nonce) {
            plainBytes = decryptBytes(
                wireBuffer,
                options.passphrase,
                meta.salt,
                fromBase64(meta.nonce)
            );
        } else {
            throw new Error('Encrypted file is missing header or salt metadata');
        }

        finalFilename = filename.replace(/\.lsenc$/i, '');
        finalBlob = new Blob([plainBytes as unknown as BlobPart], {
            type: meta?.originalType || 'application/octet-stream',
        });
    } else {
        finalBlob = new Blob([wireBuffer as unknown as BlobPart], {
            type: response.headers.get('content-type') || 'application/octet-stream',
        });
    }

    const blobUrl = URL.createObjectURL(finalBlob);
    reportProgress('completed', receivedBytes, totalBytes, currentSpeedMBs, 0);

    return {
        success: true,
        blobUrl,
        filename: finalFilename,
        totalBytes: receivedBytes,
        hash: calculatedHash,
        verified,
    };
}
