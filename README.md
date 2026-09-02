<h1 align="center">🪐 LAN Saturn</h1>

<p align="center">
  <strong>LAN Saturn is a local-first Windows application for file sharing, messaging, and collaboration over trusted local networks.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6.svg?logo=windows&logoColor=white" alt="Platform">
  <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/Encryption-XChaCha20--Poly1305-success.svg" alt="Encryption">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

LAN Saturn is designed for Wi-Fi networks and mobile hotspots, allowing connected devices to communicate and transfer files without requiring internet access or third-party cloud infrastructure.

Inspired by local and peer-to-peer communication systems such as LocalSend, Google Nearby Connections, and AirDrop. LAN Saturn is an independent project and does not provide interoperability with these systems.

---

## 🚧 Development Status

LAN Saturn is currently under active development. Features and APIs may change between releases.

### Stable
- **UDP Peer Discovery**: Versioned protocol (`lan-saturn` v1) with persistent node device UUIDs (`device_id`).
- **Persistent Device Identification**: Stable identifiers preserved across IP and network changes.
- **Peer Lifecycle Tracking**: Continuous heartbeat tracking with automatic timeout cleanup.
- **Local HTTP File Transfers**: Direct high-speed transfers without third-party intermediaries.
- **Byte-Range / Resumable Transfer Support**: Accelerated file streaming with `Accept-Ranges: bytes` support.
- **Real-Time Chat & Channels**: Multi-channel messaging and direct client communication over Socket.IO.
- **Session Authentication**: Role validation, loopback trust, and administrative access control.
- **Administrative Access Control**: Privileged operations isolated to authenticated sessions.
- **Client-Side Encryption**: XChaCha20-Poly1305 AEAD + Argon2id key derivation via `libsodium`.

### Experimental
- **Bluetooth Device Discovery & Integration**: Local Bluetooth adapter discovery and RFCOMM/PAN metadata sharing groundwork (see [`docs/ARCHITECTURE_AUDIT.md`](docs/ARCHITECTURE_AUDIT.md)).
- **RFCOMM / PAN Functionality**: Bluetooth personal area network primitives.
- **Other features explicitly marked experimental in the repository**

### Planned / Not Yet Fully Validated
- **Physical Multi-Machine Wi-Fi Throughput Benchmarking**: Reproducible benchmark tooling exists in [`benchmarks/transfer_benchmark.py`](benchmarks/transfer_benchmark.py); physical multi-device validation across diverse topologies is underway.
- **Additional Transport Capabilities**: Evaluating auxiliary connection fallback channels.
- **Further Hardening & Testing**: Broadened test coverage across diverse network topology configurations.

---

## What is LAN Saturn?

LAN Saturn is a peer-to-peer local networking application focused on communication and file sharing between devices on the same network.

It uses a Python/Flask backend and React/TypeScript frontend, with UDP-based peer discovery and Socket.IO-based real-time communication.

The application is designed to operate locally rather than relying on a hosted backend or cloud storage service.

---

## ✨ Features

### Peer Discovery
- Automatic discovery of LAN peers
- Versioned UDP discovery protocol
- Persistent device UUIDs
- Peer lifecycle tracking
- IP-change deduplication

### File Sharing
- Local HTTP file transfers
- HTTP byte-range support
- Resumable transfer infrastructure
- Configurable shared/upload directories

### Communication
- Real-time messaging
- Public channels
- Direct client messaging
- Socket.IO communication

### Security
- Session-based authentication
- Administrative access controls
- Client-side cryptography
- Argon2id key derivation
- XChaCha20-Poly1305 AEAD
- Directory traversal protections

### Desktop
- Windows executable distribution
- Portable executable
- Windows installer

---

## 🏗️ Architecture

```text
┌──────────────────────────────┐
│        React / TypeScript    │
│             UI               │
└──────────────┬───────────────┘
               │
          Socket.IO / HTTP
               │
┌──────────────▼───────────────┐
│       Flask Backend          │
│                              │
│  Authentication              │
│  File Transfers              │
│  Peer Management             │
│  Chat / Channels             │
│  Shared Directories          │
└──────────────┬───────────────┘
               │
       UDP Peer Discovery
               │
┌──────────────▼───────────────┐
│       Local Network          │
│       Wi-Fi / Hotspot        │
└──────────────────────────────┘
```

---

## 📁 Repository Structure

```text
lan-saturn/
├── app/                  # Flask backend
│   ├── routes/           # HTTP routes
│   ├── services/         # Backend services
│   └── sockets/          # Socket.IO handlers
├── src/                  # React / TypeScript frontend
├── tests/                # Automated tests
├── benchmarks/           # Transfer benchmarks
├── docs/                 # Architecture and technical documentation
├── scripts/              # Build and packaging utilities
├── assets/               # Application assets
├── dist-release/         # Release artifacts
├── dist-installer/       # Installer artifacts
├── launcher.py           # Desktop launcher
├── run.py                # Backend entry point
├── server_manager.py     # Server lifecycle management
├── installer.iss         # Windows installer configuration
├── package.json          # Node dependencies/scripts
├── requirements.txt      # Python dependencies
├── LICENSE               # MIT License
├── SECURITY.md           # Security policy
├── CONTRIBUTING.md       # Contribution guidelines
└── CHANGELOG.md          # Release history
```

---

## 🚀 Installation & Getting Started

### For Users

Download the latest Windows release from the Releases page. No development environment or dependencies are required.

- 🚀 **Portable Version**: Download [`LAN-Saturn.exe`](https://github.com/Kunalxkumar/lan-saturn/releases/download/v1.1.0/LAN-Saturn.exe) (single standalone executable, no installation needed).
- ⚡ **Installer Version**: Download [`LAN-Saturn-Setup.exe`](https://github.com/Kunalxkumar/lan-saturn/releases/download/v1.1.0/LAN-Saturn-Setup.exe) (standard Windows setup wizard with Start Menu and desktop shortcuts).
- 🏷️ **All Releases**: Visit the **[Releases Page](https://github.com/Kunalxkumar/lan-saturn/releases)** for changelogs and previous builds.

### For Developers

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kunalxkumar/lan-saturn.git
   cd lan-saturn
   ```

2. **Install backend and frontend dependencies:**
   ```bash
   pip install -r requirements.txt
   npm install
   ```

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   *Runs the Vite development server (port 5173) and the Flask/Socket.IO backend (port 5000) concurrently.*

4. **Run the automated test suite:**
   ```bash
   python -m pytest -v tests/
   ```

5. **Run transfer benchmarks:**
   ```bash
   python benchmarks/transfer_benchmark.py --size 100MB
   ```

---

## 🌐 Network Requirements

| Component | Port | Protocol | Description |
| :--- | :--- | :--- | :--- |
| **Peer Discovery** | `5001` | UDP | Broadcasts and listens for local device announcements |
| **Backend API & Web** | `5000` | HTTP / Socket.IO | Handles file transfer streaming and real-time messaging |
| **Dev Frontend** | `5173` | HTTP | Vite development server (development environment only) |

> Ports may be configurable or differ between production and development builds. Check the current configuration before deploying in restricted network environments.

---

## 🔐 Security & Trust Model

LAN Saturn is designed with security boundaries appropriate for local-network communication. However, LAN access should not automatically be considered trusted.

- **Discovery ≠ Authentication**: Discovered peers announce presence only. They are never granted automatic access to private channels or admin endpoints.
- **Remote Authorization**: Remote peers require explicit session trust approval.
- **Loopback Isolation**: Localhost (`127.0.0.1`) operates with loopback administration privileges, whereas remote LAN addresses face strict boundary checks.
- **Path Traversal Defense**: All file paths are strictly normalized with directory confinement checks (`is_safe_subpath`).
- **Cryptographic Operations**: Message and content encryption uses `libsodium` (Argon2id key derivation and XChaCha20-Poly1305 AEAD).
- **Vulnerability Reporting**: If you find a potential vulnerability, please review [`SECURITY.md`](SECURITY.md) for private reporting instructions.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 18 + TypeScript |
| **UI / Styling** | Tailwind CSS v4 |
| **Backend** | Python 3 + Flask |
| **Real-Time Communication** | Flask-SocketIO / Socket.IO |
| **Peer Discovery** | Versioned UDP Broadcast |
| **Cryptography** | libsodium (`libsodium-wrappers-sumo`) |
| **Key Derivation** | Argon2id |
| **Authenticated Encryption** | XChaCha20-Poly1305 AEAD |
| **Desktop Packaging** | Windows Executable (PyInstaller) & Inno Setup Wizard |

---

## 🗺️ Roadmap

- [x] UDP peer discovery
- [x] Local file transfers
- [x] Real-time messaging
- [x] Channels
- [x] Session authentication
- [x] Client-side cryptography
- [x] Windows releases
- [x] Automated tests
- [x] Transfer benchmark tooling
- [ ] Validate physical multi-machine Wi-Fi performance
- [ ] Expand Bluetooth functionality
- [ ] Additional transport improvements
- [ ] Continued security hardening
- [ ] Performance optimization

---

## ⚠️ Current Limitations

- **Platform Target**: LAN Saturn currently targets Windows.
- **Bluetooth Status**: Bluetooth functionality is experimental.
- **Physical Wi-Fi Validation**: Physical multi-machine throughput has not yet been fully benchmarked across diverse consumer hardware.
- **Network Dependency**: Local-network operation depends on the underlying router or hotspot allowing UDP broadcast and local client-to-client traffic (some enterprise guest networks isolate clients).
- **Active Development**: APIs and features may change while the project remains under active development.

---

## 📚 Technical Documentation

- **[Architecture Audit & Specifications](docs/ARCHITECTURE_AUDIT.md)**: Deep dive into current implementation, limitations, open-source citations, and Windows Bluetooth evaluation.
- **[Transfer Benchmarks Guide](docs/BENCHMARKS.md)**: Protocol and benchmark execution instructions.
- **[Security Policy](SECURITY.md)**: Security architecture, boundaries, and private vulnerability disclosure guidelines.
- **[Contributing Guide](CONTRIBUTING.md)**: Contribution guidelines and areas for contribution.
- **[Changelog](CHANGELOG.md)**: Complete release history.

---

## 📜 License

Distributed under the [MIT License](LICENSE).
