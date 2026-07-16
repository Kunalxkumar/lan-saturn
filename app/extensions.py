from flask_socketio import SocketIO

# Initialize Socket.IO instance without binding it to an app yet
socketio = SocketIO(
    cors_allowed_origins="*",
    async_mode='threading',
    ping_interval=25,
    ping_timeout=60
)
