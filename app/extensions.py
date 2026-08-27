from flask_socketio import SocketIO
from app.config import Config

# Initialize Socket.IO instance without binding it to an app yet
socketio = SocketIO(
    cors_allowed_origins=Config.SOCKET_ALLOWED_ORIGINS,
    async_mode='threading',
    ping_interval=25,
    ping_timeout=60
)
