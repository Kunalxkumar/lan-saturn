import os
import sys
import secrets
from app.constants import MAX_UPLOAD_SIZE

if getattr(sys, 'frozen', False):
    # PyInstaller temporary folder
    BASE_DIR = sys._MEIPASS
else:
    # Project root directory
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    NOTES_FOLDER = os.path.join(BASE_DIR, 'notes')
    MAX_CONTENT_LENGTH = MAX_UPLOAD_SIZE
    DATABASE_PATH = os.path.join(BASE_DIR, 'lan_saturn.db')
    SOCKET_ALLOWED_ORIGINS = [
        'http://127.0.0.1:5000',
        'http://localhost:5000',
        'http://127.0.0.1:5173',
        'http://localhost:5173'
    ]

    @classmethod
    def init_app(cls, app):
        os.makedirs(cls.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(cls.NOTES_FOLDER, exist_ok=True)
