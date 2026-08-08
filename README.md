<h1 align="center">🪐 LAN Saturn</h1>

<p align="center">
  <strong>A modern, Discord-inspired, LAN-based real-time collaboration application with strict End-to-End Encryption (E2EE) and Cryptographic Identity verification.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.7+-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/React-18-blue.svg" alt="React">
  <img src="https://img.shields.io/badge/Encryption-XChaCha20--Poly1305-success.svg" alt="Encryption">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

LAN Saturn is designed for fully offline local networks (Wi-Fi or Mobile Hotspots). It enables seamless communication for teams, study groups, or offline deployments without relying on any external internet connection or cloud servers.

## ✨ Features

* **Zero-Config LAN Discovery**: Automatically finds other LAN Saturn servers on your network using UDP broadcast / mDNS.
* **Cryptographic Identity**: Devices are authenticated using Ed25519 Keypairs, preventing username impersonation.
* **End-to-End Encryption (E2EE)**: All messages and files are encrypted client-side using `libsodium` (XChaCha20-Poly1305) before transmission. The server never sees plaintext data.
* **Resilient File Transfers**: Chunked file uploading (with automatic resumes and progress bars) handles network instability gracefully.
* **Channels & DMs**: Switch between public channels (e.g., `#general`, `#study`) or send Private Direct Messages to specific users.
* **Discord-like UI**: A familiar, responsive interface optimized for speed and clarity.

---

## 🏗️ Architecture Flow

```mermaid
graph TD
    subgraph Client A (Browser/Tauri)
        A1[React UI] --> A2[libsodium E2EE Module]
        A2 --> A3[Socket.IO Client]
        A1 --> A4[Ed25519 Keypair]
    end

    subgraph Client B (Browser/Tauri)
        B1[React UI] --> B2[libsodium E2EE Module]
        B2 --> B3[Socket.IO Client]
        B1 --> B4[Ed25519 Keypair]
    end

    subgraph Server (Flask)
        S1[UDP Broadcast Discovery]
        S2[Socket.IO Server]
        S3[SQLite State Manager]
        S4[Chunked File Upload API]
    end

    A3 -- WebSocket (Encrypted Payload) --> S2
    S2 -- Broadcast --> B3
    S1 -. UDP Broadcast (Port 5001) .-> A1
    A4 -. Device Signature Check .-> S2
```

## 🔐 Security Flow

LAN Saturn employs a Zero-Trust architecture regarding the server.

1. **Identity Generation**: Upon first launch, the client generates an `Ed25519` keypair. The Public Key acts as the user's unforgeable identity.
2. **Encryption**: When sending a message, the payload is symmetrically encrypted via `XChaCha20-Poly1305` using a shared network passphrase.
3. **Signing**: The encrypted cipherbytes are then signed by the client's Private Key.
4. **Verification**: Upon receiving the packet, the server (and other clients) verify the `Ed25519` signature against the registered public key, guaranteeing sender authenticity.
5. **Decryption**: Receiving clients use the shared passphrase to decrypt the payload.

```text
Message ➡️ XChaCha20-Poly1305 ➡️ Ciphertext ➡️ Ed25519 Signature ➡️ [WebSocket Transmission] ➡️ Signature Verification ➡️ Decryption ➡️ Read
```

---

## 🚀 Installation & Usage

### For Non-Developers (End Users)

1. Download the latest `LAN Saturn.exe` from the [Releases](#) tab.
2. Run the application.
3. If hosting, the app will automatically start a server and broadcast itself to the LAN.
4. Other devices on the same Wi-Fi/Hotspot will see the server via **Automatic LAN Discovery** and can click to join.
5. *(Optional)* Mobile users can join by typing the host's IP address (e.g., `http://192.168.1.5:5000`) in their browser.

### For Developers

**Prerequisites**: Python 3.9+, Node.js 18+, Rust (optional for Tauri desktop apps).

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/lan-saturn.git
cd lan-saturn
```

2. **Install Dependencies:**
```bash
pip install -r requirements.txt
npm install
```

3. **Start Development Environment:**
```bash
npm run dev
```
*This launches the Vite development server on port 5173 with proxy routing to the Python Flask backend on port 5000.*

4. **Environment Variables (Optional):**
- `SECRET_KEY`: Set a custom secret key (defaults to dynamic 32-byte cryptographically random hex if omitted).
- `PORT`: Set custom backend server port (defaults to 5000).

5. **Run Unit & Integration Tests:**
```bash
pytest -v tests/
```

---

## 🛠️ Tech Stack

* **Frontend**: TypeScript, React, Vite, Lucide Icons
* **Desktop Wrapper**: Tauri (Rust)
* **Backend**: Python, Flask, Flask-SocketIO
* **Database**: SQLite (SQLAlchemy)
* **Cryptography**: `libsodium-wrappers`

---
*Built for fully offline, secure collaboration.*
