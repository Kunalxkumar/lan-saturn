# Security Policy

## 1. Security Architecture & Boundaries

LAN Saturn operates on a local-first model for offline networks and mobile hotspots:

- **Peer Discovery Boundary**: Discovery packets (UDP 5001) announce device availability only. **Discovery is not authentication**. Discovered peers are never automatically granted administrative access or untrusted session privileges.
- **Client Session Security**: Loopback connections (`127.0.0.1`) are trusted by default. Remote LAN devices require explicit approval or valid session authorization.
- **End-to-End Cryptography**: Client-side message and payload encryption utilizes `libsodium-wrappers` (Argon2id key derivation and XChaCha20-Poly1305 AEAD).
- **Directory Traversal Defense**: All file access endpoints enforce strict path normalization (`is_safe_subpath`) preventing directory traversal outside configured upload/shared directories.

---

## 2. Reporting Vulnerabilities

If you discover a security vulnerability in LAN Saturn, please report it privately:

1. **Do not create public GitHub issues** for zero-day security vulnerabilities.
2. Submit vulnerability details directly to the repository maintainers or file a private GitHub Security Advisory.
3. Include clear steps to reproduce, impact assessment, and any proposed fixes.
