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

export { toBase64, fromBase64, CRYPTO_VERSION, CRYPTO_CONTEXT };
