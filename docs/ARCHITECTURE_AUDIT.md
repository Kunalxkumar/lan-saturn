# LAN Saturn Architecture Audit & Peer Discovery Blueprint

**Date:** August 2026  
**Repository:** [github.com/Kunalxkumar/lan-saturn](https://github.com/Kunalxkumar/lan-saturn)  
**Version:** 1.0.0 (Step 1 Architecture Upgrade)

---

## 1. Current Architecture (As Implemented)

An empirical inspection of the codebase confirms the following actual architecture:

```
+-----------------------------------------------------------------------+
|                            LAN Saturn Node                            |
|                                                                       |
|  +-----------------------+               +-------------------------+  |
|  |   React / Vite UI     | <---HTTP/WS-> |  Flask / Socket.IO App  |  |
|  |  (TypeScript Frontend)|               |    (Python Backend)     |  |
|  +-----------------------+               +-------------------------+  |
|                                                      |                |
|           +-----------------------+------------------+                |
|           |                       |                                   |
|  +------------------+   +--------------------+   +-----------------+  |
|  | UDP Broadcast    |   | HTTP File Serving  |   | SQLite Database |  |
|  | Discovery (5001) |   | send_from_directory|   |  (lan_saturn.db)|  |
|  +------------------+   +--------------------+   +-----------------+  |
+-----------------------------------------------------------------------+
```

### Components Summary
- **Backend**: Python 3.10+ Flask application with Flask-SocketIO (threading async mode) in `app/`.
- **Frontend**: React 18 with TypeScript and Vite in `src/`.
- **Desktop Packaging**: Windows PyInstaller single-file launcher (`launcher.py`) + Inno Setup installer (`installer.iss`).
- **Database**: SQLite embedded database managed via `sqlite3` in `app/repositories/db.py`.
- **Discovery**: UDP broadcast announcing server IP & port on UDP port 5001 (`app/services/discovery.py`).
- **File Transfers**: HTTP `GET` / `POST` file routes in `app/routes/files.py` and `app/routes/shared_dir.py` using Flask `send_from_directory()`.

---

## 2. Known Limitations & Technical Realities

### Bluetooth is NOT a Real Transport (Experimental Groundwork)
- **Current Code**: `app/services/bluetooth_service.py` checks whether `socket.AF_BLUETOOTH` exists, attempts to open an RFCOMM socket on Windows, and exposes Bluetooth metadata / `btspp://` URI.
- **Reality**: The app does **not** currently implement Bluetooth BLE advertising/scanning, Bluetooth pairing workflows, peer authentication over Bluetooth, Bluetooth-to-Wi-Fi socket negotiation, or Bluetooth file transfers.
- **Directive**: Bluetooth must be described strictly as experimental discovery/capability groundwork until a proven transport pipeline is implemented in Step 2.

### Discovery Protocol Limitations
- **Previous Code**: Announced unversioned JSON packets `{ "service": "lan_saturn", "name": ..., "ip": ..., "port": ... }` using `f"{ip}:{port}"` as the key.
- **Reality**: IP addresses change frequently on mobile hotspots and Wi-Fi networks. Using IP:port as a key caused duplicate peer entries whenever a device's IP changed.
- **Upgrade**: Replaced with a versioned discovery schema (`lan-saturn` v1) utilizing a persistent device UUID (`device_id`) generated per node.

### File Transfer Throughput Claims
- **Previous Claims**: References to 300–800 Mbps transfer speeds.
- **Reality**: No formal transfer benchmark was conducted on LAN Saturn to verify this range. Transfer speeds depend strictly on local physical network media (Wi-Fi 5/6, Ethernet, router backplane).
- **Upgrade**: Removed unverified speed numbers; created `benchmarks/transfer_benchmark.py` and `docs/BENCHMARKS.md` for reproducible empirical measurement.

### End-to-End Encryption (E2EE) Audit
- **Current Crypto**: `src/lib/crypto.ts` uses `libsodium-wrappers-sumo` (Argon2id key derivation + XChaCha20-Poly1305 AEAD).
- **Web App Decryption**: Messages are encrypted client-side in the browser before sending via Socket.IO. Passphrases are stored in client `localStorage`.
- **Limitation**: Passphrase distribution is manual (shared passphrase model per channel). File upload routes (`/upload`) store files on server disk; E2EE applies when file bytes are encrypted prior to submission. Server does not decrypt messages if passphrase is not provided to server.

---

## 3. Established Open-Source Projects & Standards Reference

| Project / Standard | Repository / Reference | License | Relevant Component | What LAN Saturn Can Learn | What LAN Saturn Should NOT Copy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **LocalSend** | [github.com/localsend/localsend](https://github.com/localsend/localsend) | MIT | Multicast/UDP Discovery, REST Transfer API, DTO Schemas | Versioned JSON schemas, fingerprint-based device identity, clean separation between discovery & transfer auth. | Flutter-specific UI dependencies or HTTPS pin requirement for simple LAN setups. |
| **Google Nearby Connections** | [github.com/google/nearby](https://github.com/google/nearby) | Apache-2.0 | Medium Selection, Bandwidth Upgrades, BLE Handshake | Separating discovery mediums (BLE/UDP) from high-speed payload transfer mediums (Wi-Fi Direct/LAN). | Do not claim Nearby interoperability or copy complex C++ CROS bindings. |
| **Wi-Fi Direct** | [wi-fi.org/discover-wi-fi/wi-fi-direct](https://www.wi-fi.org/discover-wi-fi/wi-fi-direct) | Industry Standard | Peer-to-Peer Wi-Fi Group Formation | Concept of P2P Group Owner (GO) and client negotiation for direct device-to-device Wi-Fi links. | Do not depend on fragile OS-specific Wi-Fi Direct APIs in Python without fallback. |
| **Apple AirDrop** | [support.apple.com/.../sec2261183f4](https://support.apple.com/guide/security/airdrop-security-sec2261183f4/web) | Proprietary / Spec | BLE Discovery + AWDL High-Speed Transfer | Conceptual separation: BLE discovery → TLS handshake → AWDL Wi-Fi transfer. | Proprietary AWDL frame headers or Apple iCloud identity certificate chains. |
| **PairDrop** | [github.com/hashtopolis/pairdrop](https://github.com/hashtopolis/pairdrop) | GPL-3.0 | WebRTC / Peer-to-Peer Signaling | WebRTC data channel fallback for NAT traversal when local IP discovery fails. | Dependence on external TURN/STUN signaling servers for local-only networks. |
| **Snapdrop** | [github.com/RobinLinus/snapdrop](https://github.com/RobinLinus/snapdrop) | GPL-3.0 | WebRTC / WebSockets Local Pairing | Instant zero-install browser-based peer pairing and lightweight room discovery. | In-memory room state that breaks when signaling server restarts. |
| **Warpinator** | [github.com/linuxmint/warpinator](https://github.com/linuxmint/warpinator) | GPL-3.0 | gRPC / Zeroconf LAN Transfers | Dedicated authentication port and gRPC streaming for large file transfers. | Linux-centric GTK/DBus system dependencies. |
| **NitroShare** | [github.com/nitroshare/nitroshare-desktop](https://github.com/nitroshare/nitroshare-desktop) | MIT | Qt C++ HTTP Transport Engine | High-throughput HTTP multi-threaded socket file chunking. | Abandoned C++ Qt dependencies. |
| **KDE Connect** | [invent.kde.org/network/kdeconnect-kde](https://invent.kde.org/network/kdeconnect-kde) | GPL-2.0 | TLS Certificate Pairing & Device Encryption | Long-term RSA/ECC device certificate pairing for trusted devices. | Complex Plasma/KDE desktop daemon prerequisites. |
| **Dukto** | [sourceforge.net/projects/dukto](https://sourceforge.net/projects/dukto) | GPL-3.0 | Lightweight UDP Broadcast + TCP Stream | Dead-simple LAN broadcast and direct TCP socket file streaming. | Outdated Qt4 codebase and unencrypted TCP socket transfer. |
| **Croc** | [github.com/schollz/croc](https://github.com/schollz/croc) | MIT | PAKE (Password-Authenticated Key Exchange) + Relay | Relay-assisted PAKE encryption for firewall-bypassing peer file transfers. | Mandatory relay dependency when both peers are on the same local subnet. |

---

## 4. Windows Bluetooth Technology Evaluation (Options A–F)

To prepare for Step 2 (Bluetooth-assisted discovery), we evaluated 6 technical approaches for Windows desktop applications:

| Option | Technology Stack | Windows Support | Python Support | Rust Support | BLE Support | Classic Support | Discovery | Pairing | Security & Complexity | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Option A** | BLE Advertising + Scanning | Windows 10/11 (Native) | Moderate (`bleak`) | High (`btleplug`) | Yes | No | Excellent (Beacon) | Not required for beacon | Low security risk; async complexity | **Recommended for Discovery** |
| **Option B** | Bluetooth Classic RFCOMM | Windows 10/11 | Partial (`socket.AF_BLUETOOTH`) | Moderate | No | Yes | Poor (Requires pairing) | Required | Requires OS pairing dialogs; high friction | Not Recommended |
| **Option C** | Win32 Bluetooth APIs | Windows 7–11 | Low (ctypes wrappers) | Low (`winapi`) | Partial | Yes | Legacy C APIs | Manual | High C-binding maintenance overhead | Not Recommended |
| **Option D** | WinRT Bluetooth APIs | Windows 10/11 | Moderate (`winsdk` / `PyWinRT`) | High (`windows` crate) | Yes | Yes | Native Windows UI | Integrated | Modern API, requires Win10+ runtime | Secondary Choice |
| **Option E** | Rust Bluetooth Crate (`btleplug`) | Windows 10/11 | N/A (Rust only) | Excellent | Yes | No | Cross-platform | N/A | Clean Tauri native integration | Best for Tauri Frontend |
| **Option F** | Python Windows Lib (`bleak`) | Windows 10/11 | Excellent (`bleak`) | N/A (Python only) | Yes | No | Asyncio beacon | N/A | Pure Python, active maintenance | **Best for Python Backend** |

### Step 2 Technical Recommendation: Option F (`bleak` for Python Backend) / Option A (BLE Beacon)
- **Rationale**: `bleak` is the standard, actively-maintained Python library for Bluetooth Low Energy on Windows 10/11. It allows the Python backend to advertise BLE beacons containing the LAN Saturn device ID and Wi-Fi Hotspot IP without requiring OS-level Bluetooth pairing dialogs or legacy RFCOMM COM ports.
- **Execution Strategy**: Keep Bluetooth capability detection experimental in Step 1. Implement `bleak` BLE beacon advertising & scanning in Step 2.

---

## 5. E2EE Cryptographic Safety Review

- **Primitives**: Argon2id for key derivation, XChaCha20-Poly1305 for authenticated encryption (`libsodium-wrappers-sumo`).
- **Nonce Safety**: `sodium.randombytes_buf(sodium.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES)` generates a fresh 192-bit random nonce for every message/file buffer. 192-bit nonces prevent nonce reuse collisions even with random generation.
- **Recommendation**: Retain current cryptographic primitives. Do not invent custom ciphers or alter sodium wrappers without security review.
