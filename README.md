<h1 align="center">🪐 LAN Saturn</h1>

<p align="center">
  <strong>Open-source, local-first file sharing and chat for Windows.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/Encryption-XChaCha20--Poly1305-success.svg" alt="Encryption">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

LAN Saturn is an open-source application designed for local network collaboration (Wi-Fi networks or Mobile Hotspots) without internet connectivity or third-party cloud servers.

Inspired by the architecture of modern peer-to-peer systems such as **[LocalSend](https://github.com/localsend/localsend)**, **[Google Nearby Connections](https://github.com/google/nearby)**, and **[Apple AirDrop](https://support.apple.com/guide/security/airdrop-security-sec2261183f4/web)**. *(Note: LAN Saturn does not claim interoperability with these systems).*

---

## 🚦 Current Status

LAN Saturn is under active development. Current system status:

- **Stable**:
  - **UDP Peer Discovery**: Versioned protocol (`lan-saturn` v1) with persistent node device UUIDs and peer lifecycle tracking.
  - **Local File Transfers**: Accelerated HTTP file serving with byte-range request support (`Accept-Ranges: bytes`).
  - **Real-time Chat & Channels**: Multi-channel communication over Socket.IO.
  - **Security & Session Boundary**: Session authentication, loopback auto-trust, and administrative access control.
  - **Client-Side Cryptography**: XChaCha20-Poly1305 AEAD + Argon2id key derivation via `libsodium-wrappers`.
- **Experimental**:
  - **Bluetooth Integration**: Local Bluetooth adapter discovery and RFCOMM/PAN metadata sharing groundwork (see [`docs/ARCHITECTURE_AUDIT.md`](file:///w:/Project/lan-saturn-main/docs/ARCHITECTURE_AUDIT.md)).
- **Not Yet Benchmarked**:
  - **Physical Wi-Fi Throughput**: Throughput on physical multi-machine LAN topologies is unbenchmarked. Reproducible benchmark infrastructure is available in [`benchmarks/transfer_benchmark.py`](file:///w:/Project/lan-saturn-main/benchmarks/transfer_benchmark.py) and documented in [`docs/BENCHMARKS.md`](file:///w:/Project/lan-saturn-main/docs/BENCHMARKS.md).

---

## ✨ Core Features

* **Versioned UDP Discovery**: Automatically discovers peers on UDP port 5001 with stable device UUIDs, avoiding duplicate entries across IP changes.
* **Resilient HTTP Transfers**: Byte-range enabled HTTP file transfers for reliable local network file distribution.
* **Cryptographic Identity & Encryption**: Client-side message and payload encryption using `libsodium` (Argon2id + XChaCha20-Poly1305).
* **Channels & Private Messaging**: Discord-inspired UI for switching between public channels and direct client messages.
* **Offline-First Operating Model**: Functions completely offline on local subnets and Wi-Fi Hotspots without cloud dependencies.

---

## 🚀 Getting Started

### Prerequisites
- Python 3.10+
- Node.js 18+

### Developer Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/Kunalxkumar/lan-saturn.git
   cd lan-saturn
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   npm install
   ```

3. **Launch Development Server:**
   ```bash
   npm run dev
   ```
   *Launches Vite frontend (port 5173) and Flask/Socket.IO backend (port 5000).*

4. **Run Test Suite:**
   ```bash
   python -m pytest -v tests/
   ```

5. **Run Transfer Benchmarks:**
   ```bash
   python benchmarks/transfer_benchmark.py --size 100MB
   ```

---

## 📚 Documentation & Research

- **[Architecture Audit & Specifications](file:///w:/Project/lan-saturn-main/docs/ARCHITECTURE_AUDIT.md)**: Deep dive into current implementation, limitations, open-source citations, and Windows Bluetooth evaluation.
- **[Transfer Benchmarks Guide](file:///w:/Project/lan-saturn-main/docs/BENCHMARKS.md)**: Protocol and benchmark execution instructions.
- **[Security Policy](file:///w:/Project/lan-saturn-main/SECURITY.md)**: Security architecture and vulnerability disclosure guidelines.
- **[Contributing Guide](file:///w:/Project/lan-saturn-main/CONTRIBUTING.md)**: Community development standards and guidelines.

---

## 📜 License

Distributed under the [MIT License](file:///w:/Project/lan-saturn-main/LICENSE).
