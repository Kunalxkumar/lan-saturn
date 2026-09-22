import sodium from 'libsodium-wrappers-sumo';

const CRYPTO_VERSION = 'sodium-xchacha20poly1305-v1';
const CRYPTO_CONTEXT = 'lan-saturn-e2ee-v1';

function toBase64(bytes) {
    return sodium.to_base64(bytes, sodium.base64_variants.ORIGINAL);
}

function fromBase64(value) {
    return sodium.from_base64(value, sodium.base64_variants.ORIGINAL);
}

function deriveKey(passphrase, salt) {
    return sodium.crypto_pwhash(
        sodium.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
        passphrase,
        salt,
        sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
        sodium.crypto_pwhash_ALG_ARGON2ID13
    );
}

export function encryptBytes(bytes, passphrase) {
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const nonce = sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
    const key = deriveKey(passphrase, salt);
    const cipherBytes = sodium.crypto_aead_xchacha20poly1305_ietf_encrypt(
        bytes,
        CRYPTO_CONTEXT,
        null,
        nonce,
        key
    );

    return {
        encrypted: true,
        encryptionVersion: CRYPTO_VERSION,
        salt: toBase64(salt),
        nonce: toBase64(nonce),
        cipherBytes
    };
}

export function decryptBytes(cipherBytes, passphrase, salt, nonce) {
    const key = deriveKey(passphrase, fromBase64(salt));
    return sodium.crypto_aead_xchacha20poly1305_ietf_decrypt(
        null,
        cipherBytes,
        CRYPTO_CONTEXT,
        fromBase64(nonce),
        key
    );
}

export function encryptText(message, passphrase) {
    const plainBytes = sodium.from_string(message);
    const encrypted = encryptBytes(plainBytes, passphrase);
    return {
        encrypted: true,
        encryptionVersion: encrypted.encryptionVersion,
        salt: encrypted.salt,
        nonce: encrypted.nonce,
        data: toBase64(encrypted.cipherBytes)
    };
}

export function decryptText(encryptedData, passphrase, salt, nonce) {
    const plainBytes = decryptBytes(fromBase64(encryptedData), passphrase, salt, nonce);
    return sodium.to_string(plainBytes);
}

export const STREAM_CRYPTO_VERSION = 'sodium-secretstream-xchacha20poly1305-v1';

export function initStreamEncryption(passphrase) {
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const key = deriveKey(passphrase, salt);
    const streamPush = sodium.crypto_secretstream_xchacha20poly1305_init_push(key);
    return {
        state: streamPush.state,
        header: toBase64(streamPush.header),
        salt: toBase64(salt),
        version: STREAM_CRYPTO_VERSION
    };
}

export function encryptStreamChunk(state, plainBytes, isFinal = false) {
    const tag = isFinal
        ? sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL
        : sodium.crypto_secretstream_xchacha20poly1305_TAG_MESSAGE;
    return sodium.crypto_secretstream_xchacha20poly1305_push(state, plainBytes, null, tag);
}

export function initStreamDecryption(passphrase, saltBase64, headerBase64) {
    const salt = fromBase64(saltBase64);
    const header = fromBase64(headerBase64);
    const key = deriveKey(passphrase, salt);
    return sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, key);
}

export function decryptStreamFile(
    encryptedBytes,
    passphrase,
    saltBase64,
    plainChunkSize = 2 * 1024 * 1024
) {
    if (encryptedBytes.length < 24) {
        throw new Error('Encrypted file payload too short: missing stream header');
    }
    const header = encryptedBytes.subarray(0, 24);
    const salt = fromBase64(saltBase64);
    const key = deriveKey(passphrase, salt);
    const pullState = sodium.crypto_secretstream_xchacha20poly1305_init_pull(header, key);

    const cipherChunkSize = plainChunkSize + sodium.crypto_secretstream_xchacha20poly1305_ABYTES;
    const plainChunks = [];
    let totalPlainLen = 0;

    let offset = 24;
    while (offset < encryptedBytes.length) {
        const nextOffset = Math.min(offset + cipherChunkSize, encryptedBytes.length);
        const chunkCipher = encryptedBytes.subarray(offset, nextOffset);
        const pullRes = sodium.crypto_secretstream_xchacha20poly1305_pull(pullState, chunkCipher, null);
        plainChunks.push(pullRes.message);
        totalPlainLen += pullRes.message.length;
        offset = nextOffset;
        if (pullRes.tag === sodium.crypto_secretstream_xchacha20poly1305_TAG_FINAL) {
            break;
        }
    }

    const result = new Uint8Array(totalPlainLen);
    let currentPos = 0;
    for (const chunk of plainChunks) {
        result.set(chunk, currentPos);
        currentPos += chunk.length;
    }
    return result;
}

export { toBase64, fromBase64, CRYPTO_VERSION, CRYPTO_CONTEXT, sodium };

