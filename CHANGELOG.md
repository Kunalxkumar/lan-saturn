# Changelog

All notable changes to LAN Saturn are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-09-22 (Phase 1 — Security & Transfer Hardening)

### Security
- **Eliminated E2EE Bypass for Large Files**: Removed unencrypted fallback logic that downgraded transfers over 50 MB or chunked paths to plaintext. Files are now stream-encrypted chunk-by-chunk using Argon2id and libsodium `crypto_secretstream_xchacha20poly1305`.
- **Cryptographically Secure Random Invites**: Replaced pseudo-random generation with `secrets.choice` for channel invite tokens, resolving Bandit B311 advisory.
- **Confinement & Staging Isolation**: Sealed staging files inside `.partial/<upload_id>.part`, strictly blocking path traversal attempts, dotfiles, and partial upload downloads.

### Added
- **Stateful Upload Sessions**: Created explicit `UploadSession` architecture with UUID-keyed sessions, state machine (`active`, `completed`, `cancelled`, `expired`, `failed`), and server-authoritative offset management.
- **Per-Upload Synchronization Locks**: Added per-upload `RLock` serialization to eliminate race conditions during concurrent chunk transmissions while allowing parallel distinct transfers.
- **Atomic File Finalization**: Staging files are atomically promoted via `shutil.move` only after all contiguous bytes arrive and SHA-256 cryptographic verification succeeds.
- **Server-Authoritative Resumption & Cancellation**: Added `GET /api/upload/status/<upload_id>` for accurate resume points and `POST /api/upload/cancel` for immediate staging cleanup.
- **Receiver Integrity Verification in Benchmarks**: Benchmark harness now independently downloads and computes real SHA-256 digests of server-stored payloads before asserting `PASS`.
- **Pynt Security API Collection**: Created Postman/Pynt test collection `tests/pynt_api_collection.json` covering 13 critical API endpoints for automated vulnerability assessment.

### Changed
- **Contiguous Offset Enforcement**: Server strictly enforces `offset == current_offset`, rejecting gaps, negative offsets, and backwards overwrite attempts with HTTP 409.
- **Measured Transfer Telemetry**: UI and benchmark harness calculate speed (MB/s and Mbps) and ETA using real measured bytes and clock deltas rather than percentage interpolations.

---

## [1.2.0] - 2026-09-22

### Security
- **Mitigated `X-Lan-Saturn-Remote-Addr` Header Spoofing**: Secured remote address resolution in peer authentication workflows against untrusted reverse-proxy and client-forged headers.

### Added
- **Frontend Multi-Gigabyte Chunked Upload Support**: Added resumable client-side chunk streaming engine capable of reliable multi-gigabyte file transfers with progress tracking and validation.
- **SQLite WAL Mode & Database Indexing**: Configured Write-Ahead Logging (WAL) and targeted performance indexes for high-throughput concurrent database operations.

### Changed
- **Chunked Upload Engine Hardening**: Hardened server-side chunked upload session management, offset integrity validation, and atomic file finalization.

### Fixed
- **UDP Discovery Thread Safety**: Resolved concurrency race conditions in background UDP peer discovery listener and broadcast routines.

---

## [1.1.0] - 2026-08-27

### Added
- **Peer Handshake API**: Added structured peer connection endpoints (`/api/peers/connect`, `/api/peers/trust`) with remote peer authorization workflows.
- **Resumable Chunked Transfer Engine**: Implemented chunk-level range upload and download protocols with resumability safeguards.
- **Experimental BLE Discovery Engine**: Added lightweight Bluetooth Low Energy beacon broadcasting and scanning infrastructure.
- **Windows Desktop Distribution**: Added standalone Windows executable launcher with system tray integration and Inno Setup installer wizard.
- **Modern Dark Slate Interface**: Redesigned UI with compact channels, Lucide vector icons, and unified dark slate design system.
- **Productivity Tool Workspaces**: Fully integrated responsive layouts for Shared Notes (Markdown editor), Remote File Browser, Clipboard Sync, Channel Calendar, and Security Panel.

### Changed
- **Packaging & Version Metadata**: Unified application metadata, versioning (`1.1.0.0`), and sidecar configuration across Windows installers.
- **Session-Derived Authorship**: Enforced server-side session identity validation for all chat messages and administrative socket operations.
- **File Transfer Serving**: Enhanced byte-range request streaming performance across local subnets.

### Fixed
- **PyInstaller Bundling**: Removed deprecated Eventlet PyInstaller hooks ensuring seamless compatibility with Python 3.10 through 3.13.
- **Layout Alignment**: Standardized 3-column header heights and container flexbox/grid displays across all workspaces.
- **Header Avatar Synchronization**: Replaced static placeholders with real dynamic connected user presence.

---

## [1.0.0] - 2026-08-27

### Added
- **Versioned Peer Discovery Protocol**: Implemented `lan-saturn` v1 schema with persistent node device UUIDs (`device_id`).
- **Peer Lifecycle Management**: Added `first_seen`, `last_seen`, and 15-second TTL expiration tracking with IP change deduplication.
- **Discovery Input Validation**: Hardened UDP discovery parser against malformed JSON, missing fields, wrong protocols, invalid ports, unexpected types, and oversized (>2KB) packets.
- **Discovery Test Suite**: Added 11 comprehensive discovery edge-case tests in `tests/test_discovery.py`.
- **Benchmarking Infrastructure**: Added reproducible transfer benchmark harness `benchmarks/transfer_benchmark.py` and benchmark documentation `docs/BENCHMARKS.md`.
- **Architecture Audit & Research Documentation**: Added `docs/ARCHITECTURE_AUDIT.md` with comparative research of 11 open-source peer-to-peer projects and Windows Bluetooth technology evaluations.
- **Governance & Open Source Standards**: Added `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, and updated `README.md`.

### Changed
- **Accelerated File Transfers**: Enabled `conditional=True` on `send_from_directory()` routes for HTTP byte-range request streaming (`Accept-Ranges: bytes`).
- **Pydantic V2 Compatibility**: Updated schema field validators (`min_items` -> `min_length`, `max_items` -> `max_length`).

### Fixed
- Fixed duplicate peer creation when a device changes IP address on Wi-Fi reconnects.
- Corrected inaccurate README claims regarding mDNS, completed Bluetooth transport, and unverified throughput numbers.
