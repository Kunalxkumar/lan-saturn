# LAN Saturn

A simple LAN-based chat app inspired by Discord. Built mainly for use over Wi-Fi/hotspot when there’s no internet. Works well for small groups like friends, study sessions, or local gaming setups.

---

## Setup

### Requirements

* python 3.7+
* node.js
* browser

---

### Installation

clone the repo:

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
