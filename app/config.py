import os
import sys
from app.constants import MAX_UPLOAD_SIZE

if getattr(sys, 'frozen', False):
    # PyInstaller temporary folder
    BASE_DIR = sys._MEIPASS
else:
    # Project root directory
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'lan-saturn-secret-key-12984')
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    NOTES_FOLDER = os.path.join(BASE_DIR, 'notes')
    MAX_CONTENT_LENGTH = MAX_UPLOAD_SIZE
    DATABASE_PATH = os.path.join(BASE_DIR, 'lan_saturn.db')

    @classmethod
    def init_app(cls, app):
        os.makedirs(cls.UPLOAD_FOLDER, exist_ok=True)
        os.makedirs(cls.NOTES_FOLDER, exist_ok=True)
