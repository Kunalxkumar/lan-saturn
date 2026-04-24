<h1 align="center">🪐 LAN Saturn</h1>

<p align="center">
  <strong>A Discord-inspired, LAN-based real-time chat application with End-to-End Encryption (E2EE).</strong>
</p>

LAN Saturn is built specifically for local networks (Wi-Fi or Mobile Hotspots) when there is no active internet connection. It is perfect for small groups, study sessions, or local offline gaming setups where you need reliable, fast, and secure communication.

---

## ✨ Features

* **Real-Time Messaging**: Lightning-fast bidrectional communication powered by WebSockets.
* **End-to-End Encryption (E2EE)**: Messages and files are securely encrypted using `libsodium` (XChaCha20-Poly1305) with a shared passphrase.
* **Channels & DMs**: Switch between public channels (e.g., `#general`, `#study`) or send Private Direct Messages to specific users.
* **File Sharing**: Securely upload, encrypt, and share files (up to 50MB) across the local network.
* **Live User Presence**: See who is currently online and active in the network.
* **Typing Indicators**: Real-time "user is typing..." feedback.
* **Discord-like UI**: Familiar, responsive interface with Dark and Light mode support.

## 🚀 Quick Start

### Prerequisites

* **Python 3.7+** (For the Flask backend)
* **Node.js & npm** (For building the React frontend)
* A modern web browser

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
cd lan-saturn
```

install backend:

```bash
pip install flask flask-socketio
```

install frontend:

```bash
npm install
```

(optional) build:

```bash
npm run build
```

---

### Run

start server:

```bash
python app.py
```

open in browser:

```
http://127.0.0.1:5000
```

to use on hotspot:

```
http://your-ip:5000
```

find ip:

```cmd
ipconfig
```

---

## Tech Stack

* backend: flask + socketio
* frontend: js, html, css
* networking: websocket over tcp
* build: webpack

---

## Notes

this project was built mainly to understand:

* how websockets work
* basic networking (tcp, application layer)
* real-time communication between clients

---

## Usage

* enter a username and join
* switch channels from sidebar
* send messages
* open settings if needed

---


made for learning and small LAN setups
