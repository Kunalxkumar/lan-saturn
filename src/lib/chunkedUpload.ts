export interface ChunkedUploadOptions {
    chunkSize?: number;
    onProgress?: (percent: number, uploadedBytes: number, totalBytes: number) => void;
}

export interface ChunkedUploadResult {
    success: boolean;
    fileUrl: string;
    filename: string;
    hash?: string;
    currentSize?: number;
    totalSize?: number;
    isComplete?: boolean;
}

const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Generates a safe stored filename using timestamp, random hex string, and sanitized file extension.
 */
function generateSafeFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const lastDotIndex = originalName.lastIndexOf('.');
    const extension = lastDotIndex !== -1
        ? originalName.substring(lastDotIndex).replace(/[^a-zA-Z0-9._-]/g, '')
        : '';
    return `${timestamp}_${randomStr}${extension}`;
}

/**
 * Uploads a file in chunks to the backend endpoint `/upload-chunk`.
 *
 * @param file The file to upload.
 * @param options Optional configuration for chunk size and progress callbacks.
 * @returns Promise resolving to the final server response.
 */
export async function uploadFileInChunks(
    file: File,
    options?: ChunkedUploadOptions
): Promise<ChunkedUploadResult> {
    const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
    const totalBytes = file.size;
    const safeStoredFilename = generateSafeFilename(file.name);

    let uploadedBytes = 0;
    let offset = 0;
    let lastResponse: ChunkedUploadResult | null = null;

    // Handle 0-byte edge case with at least one chunk request
    if (totalBytes === 0) {
        const formData = new FormData();
        formData.append('file', file.slice(0, 0), safeStoredFilename);
        formData.append('filename', safeStoredFilename);
        formData.append('offset', '0');
        formData.append('totalSize', '0');

        const response = await fetch('/upload-chunk', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorMessage = `Upload failed with status ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch {
                // Ignore JSON parsing failure for error response
            }
            throw new Error(errorMessage);
        }

        const data = (await response.json()) as ChunkedUploadResult;
        options?.onProgress?.(100, 0, 0);
        return data;
    }

    while (offset < totalBytes) {
        const chunkEnd = Math.min(offset + chunkSize, totalBytes);
        const chunkBlob = file.slice(offset, chunkEnd);

        const formData = new FormData();
        formData.append('file', chunkBlob, safeStoredFilename);
        formData.append('filename', safeStoredFilename);
        formData.append('offset', offset.toString());
        formData.append('totalSize', totalBytes.toString());

        const response = await fetch('/upload-chunk', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            let errorMessage = `Upload failed with status ${response.status}`;
            try {
                const errorData = await response.json();
                if (errorData.error) {
                    errorMessage = errorData.error;
                }
            } catch {
                // Ignore JSON parsing failure for error response
            }
            throw new Error(errorMessage);
        }

        const data = (await response.json()) as ChunkedUploadResult;
        if (!data.success) {
            throw new Error('Server returned unsuccessful upload response');
        }

        lastResponse = data;
        uploadedBytes = chunkEnd;
        offset = chunkEnd;

        const percent = Math.min(100, Math.round((uploadedBytes / totalBytes) * 100));
        options?.onProgress?.(percent, uploadedBytes, totalBytes);
    }

    if (!lastResponse) {
        throw new Error('Upload completed without receiving a server response');
    }

    return lastResponse;
}
