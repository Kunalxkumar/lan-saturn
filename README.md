# LAN Saturn 🌟

A **Discord-inspired LAN chat application** for offline Wi-Fi/Hotspot use. Perfect for gaming sessions, study groups, or any local network communication without internet dependency.

## ✨ Features

- **Real-time Instant Messaging** - WebSocket-powered chat with zero latency
- **Discord-like Interface** - Familiar UI with servers, channels, and direct messages
- **User Management** - Join/leave notifications and live member lists
- **Rich Text Formatting** - Support for **bold**, *italic*, and `code` text
- **Typing Indicators** - See when others are typing
- **Settings Panel** - Customize username, theme, and preferences
- **Local Network Access** - Works on `0.0.0.0:5000` for hotspot sharing
- **Educational Comments** - Hinglish explanations of networking concepts (Layer 4/7)

## 🚀 Quick Start

### Prerequisites
- Python 3.7+
- Node.js (for frontend dependencies)
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   cd lan-saturn
   ```

2. **Install Python dependencies**
   ```bash
   pip install flask flask-socketio
   ```

3. **Install frontend dependencies**
   ```bash
   npm install
   ```

4. **Build the frontend** (optional - for production)
   ```bash
   npm run build
   ```

### Running the Application

1. **Start the server**
   ```bash
   python app.py
   ```

2. **Access the app**
   - Local: http://127.0.0.1:5000
   - Network: http://YOUR_LOCAL_IP:5000 (share with friends on hotspot)

3. **Find your local IP** (Windows)
   ```cmd
   ipconfig
   ```
   Look for "IPv4 Address" under your active network adapter.

## 🛠️ Tech Stack

- **Backend**: Python Flask + Flask-SocketIO
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Networking**: WebSocket over TCP (Layer 4 Transport / Layer 7 Application)
- **Build Tool**: Webpack
- **Styling**: Custom CSS with Discord-inspired dark theme

## 📚 Educational Value

This project includes **detailed Hinglish comments** explaining:
- **Layer 4 (Transport)**: TCP connection establishment and reliability
- **Layer 7 (Application)**: HTTP/WebSocket protocols and real-time communication
- **Socket Programming**: Event-driven architecture and message routing
- **Network Discovery**: Local IP address identification for LAN access

Perfect for **CSE students** learning computer networks and web development!

## 🎯 Usage

1. **Join the chat** with your username
2. **Switch between servers** using the left sidebar
3. **Navigate channels** (#general, #random, etc.)
4. **Send direct messages** by clicking on users
5. **Customize settings** via the gear icon
6. **Share with friends** using your network IP address

## 🔧 Development

### Project Structure
```
lan-saturn/
├── app.py                 # Flask backend with SocketIO
├── templates/
│   └── index.html        # Main HTML template
├── src/
│   ├── index.js          # Main JavaScript entry point
│   ├── App.js            # React-like main component
│   ├── styles.css        # Discord-inspired styling
│   └── components/       # UI components
├── static/               # Static assets
├── package.json          # Node.js dependencies
└── webpack.config.js     # Build configuration
```

### Key Networking Concepts Explained
- **TCP Handshake**: 3-way connection establishment
- **WebSocket Upgrade**: HTTP to WebSocket protocol switching
- **Event-driven Architecture**: SocketIO event handling
- **Broadcasting**: Message distribution to multiple clients
- **Connection Management**: Join/leave event handling

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🙏 Acknowledgments

- Inspired by Discord's excellent UX design
- Built for educational purposes in computer networking
- Perfect for offline LAN parties and study groups

---

**Made with ❤️ for LAN gaming and learning!** 🎮📚