# Security Policy

## 1. Security Architecture & Boundaries

LAN Saturn operates on a local-first model for offline local area networks and mobile hotspots:

- **Peer Discovery Boundary**: Discovery packets (UDP 5001) announce device availability only. **Discovery is not authentication**. Discovered peers are never automatically granted administrative access or untrusted session privileges.
- **Client Session Security**: Loopback connections (`127.0.0.1` / `::1`) are trusted administrative nodes by default. Remote LAN devices require explicit approval by an administrator (`/api/peers/approve`) before gaining trusted session privileges. Spoofed remote address headers (`X-Lan-Saturn-Remote-Addr`) are strictly ignored in production environments.
- **End-to-End Cryptography**: Client-side message and payload encryption utilizes `libsodium-wrappers-sumo` with Argon2id key derivation and XChaCha20-Poly1305 authenticated encryption. In v1.2.1, large file transfers utilize libsodium `crypto_secretstream_xchacha20poly1305` streaming encryption; no unencrypted fallbacks exist for large files or chunked transports.
- **Directory Traversal Defense**: All file access endpoints enforce strict path normalization (`is_safe_subpath`) and rejection of path separators, preventing directory traversal outside configured upload or shared directory roots.
- **Upload Isolation & Staging**: Incomplete chunk uploads are quarantined in `.partial/<upload_id>.part`. Download endpoints (`/files/<filename>`) forbid access to `.partial` files. Completed transfers are atomically moved into place only after contiguous transmission and cryptographic SHA-256 integrity verification.
- **Concurrency & Race Condition Defenses**: Per-upload recursive locks (`threading.RLock`) serialize writes to the same upload session, strictly enforcing server-authoritative offset progression (`offset == current_offset`).

---

## 2. Cryptographic Specifications

| Function | Algorithm / Primitive | Purpose |
| :--- | :--- | :--- |
| **Key Derivation** | Argon2id (`crypto_pwhash_ALG_ARGON2ID13`) | Derives 256-bit symmetric keys from user passphrases with salt |
| **Stream Cipher** | XChaCha20-Poly1305 Secretstream | Streaming chunk-by-chunk authenticated encryption (24B header + 17B tag/chunk) |
| **AEAD Messages** | XChaCha20-Poly1305 IETF | Single-frame message and payload encryption with 192-bit random nonces |
| **Transfer Integrity** | SHA-256 (`hashlib` / `crypto_hash_sha256`) | End-to-end cryptographic checksum verification of uploaded bytes |
| **Tokens & Invites** | `secrets.choice` (CSPRNG) | Cryptographically secure random tokens for channel invite links |

---

## 3. Reporting Vulnerabilities

If you discover a security vulnerability in LAN Saturn, please report it privately:

1. **Do not create public GitHub issues** for zero-day security vulnerabilities.
2. Submit vulnerability details directly to the repository maintainers or file a private GitHub Security Advisory.
3. Include clear steps to reproduce, impact assessment, and any proposed fixes.
