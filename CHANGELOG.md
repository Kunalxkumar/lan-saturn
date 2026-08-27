# Changelog

All notable changes to LAN Saturn are documented in this file.

## [1.0.0] - 2026-08-27 (Step 1 Release)

### Added
- **Versioned Peer Discovery Protocol**: Implemented `lan-saturn` v1 schema with persistent node device UUIDs (`device_id`).
- **Peer Lifecycle Management**: Added `first_seen`, `last_seen`, and 15-second TTL expiration tracking with IP change deduplication.
- **Discovery Input Validation**: Hardened UDP discovery parser against malformed JSON, missing fields, wrong protocols, invalid ports, unexpected types, and oversized (>2KB) packets.
- **Discovery Test Suite**: Added 11 comprehensive discovery edge-case tests in `tests/test_discovery.py`.
- **Benchmarking Infrastructure**: Added reproducible transfer benchmark harness `benchmarks/transfer_benchmark.py` and benchmark documentation `docs/BENCHMARKS.md`.
- **Architecture Audit & Research Documentation**: Added `docs/ARCHITECTURE_AUDIT.md` with comparative research of 11 open-source peer-to-peer projects and Windows Bluetooth technology evaluations (Options A–F).
- **Governance & Open Source Standards**: Added `LICENSE` (MIT), `CONTRIBUTING.md`, `SECURITY.md`, and updated `README.md`.

### Changed
- **Accelerated File Transfers**: Enabled `conditional=True` on `send_from_directory()` routes for HTTP byte-range request streaming (`Accept-Ranges: bytes`).
- **Pydantic V2 Compatibility**: Updated schema field validators (`min_items` -> `min_length`, `max_items` -> `max_length`).

### Fixed
- Fixed duplicate peer creation when a device changes IP address on Wi-Fi reconnects.
- Corrected inaccurate README claims regarding mDNS, completed Bluetooth transport, and unverified throughput numbers.
