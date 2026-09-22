import sodium from 'libsodium-wrappers-sumo';
import {
    initStreamEncryption,
    encryptStreamChunk,
    STREAM_CRYPTO_VERSION,
} from './crypto';

export type UploadState =
    | 'idle'
    | 'starting'
    | 'uploading'
    | 'paused'
    | 'resuming'
    | 'verifying'
    | 'completed'
    | 'failed'
    | 'cancelled';

export interface ChunkProgress {
    state: UploadState;
    percent: number;
    uploadedBytes: number;
    totalBytes: number;
    speedMBs: number;
    etaSeconds: number;
    uploadId?: string;
    error?: string;
}

export interface ChunkedUploadOptions {
    chunkSize?: number;
    passphrase?: string;
    uploadId?: string;
    onProgress?: (progress: ChunkProgress) => void;
    signal?: AbortSignal;
}

export interface ChunkedUploadResult {
    success: boolean;
    uploadId: string;
    fileUrl: string;
    filename: string;
    originalFilename?: string;
    hash?: string;
    currentSize?: number;
    totalSize?: number;
    isComplete?: boolean;
    encryptedFile: boolean;
    encryptionVersion?: string;
    salt?: string;
    header?: string;
    chunkSize?: number;
}

const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2 MB plain chunks
const STREAM_HEADER_SIZE = 24; // libsodium crypto_secretstream header bytes
const STREAM_TAG_OVERHEAD = 17; // libsodium crypto_secretstream tag bytes (ABYTES)

/**
 * Cancel an active upload session on the server.
 */
export async function cancelChunkedUpload(uploadId: string): Promise<boolean> {
    try {
        const res = await fetch('/api/upload/cancel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uploadId }),
        });
        return res.ok;
    } catch {
        return false;
    }
}

/**
 * Fetch the server-authoritative upload status and current offset.
 */
export async function getChunkedUploadStatus(uploadId: string): Promise<any> {
    const res = await fetch(`/api/upload/status/${encodeURIComponent(uploadId)}`);
    if (!res.ok) {
        throw new Error(`Failed to query upload status: HTTP ${res.status}`);
    }
    return res.json();
}

/**
 * Uploads a file using explicit server sessions, strict contiguous offsets,
 * incremental SHA-256 integrity, and streaming E2EE encryption if a passphrase is provided.
 */
export async function uploadFileInChunks(
    file: File,
    options?: ChunkedUploadOptions
): Promise<ChunkedUploadResult> {
    await sodium.ready;

    const plainChunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const isEncrypted = Boolean(options?.passphrase && options.passphrase.trim().length > 0);
    const originalSize = file.size;

    let uploadId = options?.uploadId;
    let streamCipherState: any = null;
    let streamSalt = '';
    let streamHeader = '';

    // Calculate total wire size and chunk structure
    let totalUploadSize = originalSize;
    let targetFilename = file.name;

    if (isEncrypted) {
        targetFilename = `${file.name}.lsenc`;
        const streamCrypto = initStreamEncryption(options!.passphrase!.trim());
        streamCipherState = streamCrypto.state;
        streamSalt = streamCrypto.salt;
        streamHeader = streamCrypto.header;

        // Number of chunks: at least 1 even for 0-byte file
        const numChunks = originalSize > 0 ? Math.ceil(originalSize / plainChunkSize) : 1;
        totalUploadSize = STREAM_HEADER_SIZE + originalSize + (numChunks * STREAM_TAG_OVERHEAD);
    }

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
            uploadId,
            error,
        });
    };

    reportProgress('starting', 0, totalUploadSize, 0, 0);

    // If no existing session, initialize session on server
    let serverOffset = 0;
    if (!uploadId) {
        const initPayload = {
            filename: targetFilename,
            totalSize: totalUploadSize,
            encryptionMetadata: isEncrypted ? {
                version: STREAM_CRYPTO_VERSION,
                salt: streamSalt,
                header: streamHeader,
                plainChunkSize,
                originalSize,
                originalName: file.name,
                originalType: file.type || 'application/octet-stream',
            } : null,
        };

        const initRes = await fetch('/api/upload/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initPayload),
            signal: options?.signal,
        });

        if (!initRes.ok) {
            let errMsg = `Upload initialization failed (${initRes.status})`;
            try {
                const errData = await initRes.json();
                if (errData.error) errMsg = errData.error;
            } catch {
                // Ignore parse error
            }
            reportProgress('failed', 0, totalUploadSize, 0, 0, errMsg);
            throw new Error(errMsg);
        }

        const initData = await initRes.json();
        uploadId = initData.uploadId;
        serverOffset = initData.currentOffset || 0;
    } else {
        // Query server for authoritative resume offset
        reportProgress('resuming', 0, totalUploadSize, 0, 0);
        const statusData = await getChunkedUploadStatus(uploadId);
        serverOffset = statusData.currentOffset || 0;
        if (statusData.isComplete || statusData.status === 'completed') {
            reportProgress('completed', totalUploadSize, totalUploadSize, 0, 0);
            return {
                success: true,
                uploadId,
                fileUrl: `/files/${statusData.storedFilename || statusData.filename}`,
                filename: statusData.storedFilename || statusData.filename,
                originalFilename: file.name,
                totalSize: totalUploadSize,
                hash: statusData.hash,
                isComplete: true,
                encryptedFile: isEncrypted,
                encryptionVersion: isEncrypted ? STREAM_CRYPTO_VERSION : undefined,
                salt: streamSalt || undefined,
                header: streamHeader || undefined,
            };
        }
    }

    // Set up incremental SHA-256 hasher for wire bytes
    const wireHasher = sodium.crypto_hash_sha256_init();

    let uploadedBytes = 0;
    let fileOffset = 0;
    const startTime = performance.now();
    let lastSampleTime = startTime;
    let lastSampleBytes = 0;
    let currentSpeedMBs = 0;
    let lastServerResponse: any = null;

    // Helper to check abort
    const checkAbort = () => {
        if (options?.signal?.aborted) {
            if (uploadId) {
                cancelChunkedUpload(uploadId).catch(() => {});
            }
            reportProgress('cancelled', uploadedBytes, totalUploadSize, 0, 0, 'Upload cancelled by user');
            throw new Error('Upload cancelled');
        }
    };

    // Edge case: 0-byte file (encrypted or plain)
    if (originalSize === 0) {
        checkAbort();
        let payloadBytes: Uint8Array;
        if (isEncrypted) {
            const rawHeader = sodium.from_base64(streamHeader, sodium.base64_variants.ORIGINAL);
            const cipherChunk = encryptStreamChunk(streamCipherState, new Uint8Array(0), true);
            payloadBytes = new Uint8Array(STREAM_HEADER_SIZE + cipherChunk.length);
            payloadBytes.set(rawHeader, 0);
            payloadBytes.set(cipherChunk, STREAM_HEADER_SIZE);
        } else {
            payloadBytes = new Uint8Array(0);
        }

        sodium.crypto_hash_sha256_update(wireHasher, payloadBytes);
        const finalHash = sodium.to_hex(sodium.crypto_hash_sha256_final(wireHasher));

        const formData = new FormData();
        formData.append('uploadId', uploadId!);
        formData.append('offset', '0');
        formData.append('expectedHash', finalHash);
        formData.append('file', new Blob([payloadBytes as unknown as BlobPart]), targetFilename);

        const res = await fetch('/upload-chunk', {
            method: 'POST',
            body: formData,
            signal: options?.signal,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
            throw new Error(err.error || 'Failed to upload empty file chunk');
        }

        const data = await res.json();
        reportProgress('completed', totalUploadSize, totalUploadSize, 0, 0);
        return {
            success: true,
            uploadId: uploadId!,
            fileUrl: data.fileUrl,
            filename: data.filename,
            originalFilename: file.name,
            totalSize: totalUploadSize,
            hash: data.hash || finalHash,
            isComplete: true,
            encryptedFile: isEncrypted,
            encryptionVersion: isEncrypted ? STREAM_CRYPTO_VERSION : undefined,
            salt: streamSalt || undefined,
            header: streamHeader || undefined,
            chunkSize: plainChunkSize,
        };
    }

    // Normal chunk loop
    let isFirstChunk = true;
    while (fileOffset < originalSize) {
        checkAbort();

        const plainEnd = Math.min(fileOffset + plainChunkSize, originalSize);
        const isFinal = plainEnd === originalSize;
        const plainSliceBlob = file.slice(fileOffset, plainEnd);
        const plainBuffer = await plainSliceBlob.arrayBuffer();
        const plainBytes = new Uint8Array(plainBuffer);

        let chunkPayload: Uint8Array;

        if (isEncrypted) {
            const cipherChunk = encryptStreamChunk(streamCipherState, plainBytes, isFinal);
            if (isFirstChunk) {
                // Prepend 24-byte secretstream header to the first chunk
                const rawHeader = sodium.from_base64(streamHeader, sodium.base64_variants.ORIGINAL);
                chunkPayload = new Uint8Array(STREAM_HEADER_SIZE + cipherChunk.length);
                chunkPayload.set(rawHeader, 0);
                chunkPayload.set(cipherChunk, STREAM_HEADER_SIZE);
                isFirstChunk = false;
            } else {
                chunkPayload = cipherChunk;
            }
        } else {
            chunkPayload = plainBytes;
        }

        // Update wire hash
        sodium.crypto_hash_sha256_update(wireHasher, chunkPayload);

        const currentOffset = uploadedBytes;
        const chunkBlob = new Blob([chunkPayload as unknown as BlobPart], { type: 'application/octet-stream' });
        const formData = new FormData();
        formData.append('uploadId', uploadId!);
        formData.append('offset', currentOffset.toString());

        if (isFinal) {
            const finalHash = sodium.to_hex(sodium.crypto_hash_sha256_final(wireHasher));
            formData.append('expectedHash', finalHash);
            reportProgress('verifying', uploadedBytes, totalUploadSize, currentSpeedMBs, 0);
        } else {
            reportProgress('uploading', uploadedBytes, totalUploadSize, currentSpeedMBs, 0);
        }

        formData.append('file', chunkBlob, targetFilename);

        const response = await fetch('/upload-chunk', {
            method: 'POST',
            body: formData,
            signal: options?.signal,
        });

        if (!response.ok) {
            let errorMsg = `Upload failed with status ${response.status}`;
            try {
                const errData = await response.json();
                if (errData.error) errorMsg = errData.error;
            } catch {
                // Ignore parse failure
            }
            reportProgress('failed', uploadedBytes, totalUploadSize, 0, 0, errorMsg);
            throw new Error(errorMsg);
        }

        const result = await response.json();
        if (!result.success) {
            const msg = result.error || 'Server rejected chunk';
            reportProgress('failed', uploadedBytes, totalUploadSize, 0, 0, msg);
            throw new Error(msg);
        }

        lastServerResponse = result;
        uploadedBytes += chunkPayload.length;
        fileOffset = plainEnd;

        // Calculate transfer speed and ETA based on elapsed time
        const now = performance.now();
        const timeDelta = (now - lastSampleTime) / 1000;
        if (timeDelta >= 0.5 || isFinal) {
            const bytesDelta = uploadedBytes - lastSampleBytes;
            currentSpeedMBs = (bytesDelta / (1024 * 1024)) / timeDelta;
            lastSampleTime = now;
            lastSampleBytes = uploadedBytes;
        }

        const remainingBytes = totalUploadSize - uploadedBytes;
        const etaSeconds = currentSpeedMBs > 0 ? (remainingBytes / (1024 * 1024)) / currentSpeedMBs : 0;

        reportProgress(
            isFinal ? 'completed' : 'uploading',
            uploadedBytes,
            totalUploadSize,
            currentSpeedMBs,
            etaSeconds
        );
    }

    if (!lastServerResponse) {
        throw new Error('Upload completed without receiving a server response');
    }

    return {
        success: true,
        uploadId: uploadId!,
        fileUrl: lastServerResponse.fileUrl,
        filename: lastServerResponse.filename,
        originalFilename: file.name,
        totalSize: totalUploadSize,
        hash: lastServerResponse.hash,
        isComplete: true,
        encryptedFile: isEncrypted,
        encryptionVersion: isEncrypted ? STREAM_CRYPTO_VERSION : undefined,
        salt: streamSalt || undefined,
        header: streamHeader || undefined,
        chunkSize: plainChunkSize,
    };
}
