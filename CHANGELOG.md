# Changelog

All notable changes to LAN Saturn are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
