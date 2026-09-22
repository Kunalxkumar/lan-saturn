import os

PORT = 5000
DEFAULT_USERNAME = "Anonymous"
DEFAULT_CHANNEL = "general"
MAX_SINGLE_UPLOAD_SIZE = 55 * 1024 * 1024  # 55 MB for single POST /upload
MAX_UPLOAD_SIZE = 4 * 1024 * 1024 * 1024   # 4 GB max transfer limit
DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024       # 2 MB default chunk
MAX_CHUNK_SIZE = 10 * 1024 * 1024          # 10 MB maximum single chunk
UPLOAD_SESSION_TIMEOUT = 1800              # 30 minutes in seconds
MAX_TEXT_LEN = 300
MAX_ANNOUNCEMENTS = 10
MAX_CLIPBOARD_ITEMS = 20

