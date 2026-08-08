import os
import hashlib
import zipfile
import uuid
import time
from typing import Optional
from werkzeug.utils import secure_filename
from app.config import Config
from app.models.models import TransferItem
from app.repositories.chat_repo import ChatRepository

MAX_ZIP_ENTRIES = 2000
MAX_FILENAME_LEN = 255

class FileService:
    def __init__(self, chat_repo: Optional[ChatRepository] = None):
        self.chat_repo = chat_repo or ChatRepository()

    def save_uploaded_file(self, file_storage) -> dict:
        filename = secure_filename(file_storage.filename)
        if not filename:
            raise ValueError("Invalid filename")

        ext = os.path.splitext(filename)[1]
        stored_filename = f"{uuid.uuid4()}{ext}"
        file_path = os.path.join(Config.UPLOAD_FOLDER, stored_filename)
        file_storage.save(file_path)

        # Compute SHA-256 hash
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(8192):
                sha256.update(chunk)
        file_hash = sha256.hexdigest()

        # Log to transfer history database
        file_size = os.path.getsize(file_path)
        item = TransferItem(
            id=f"tx_{int(time.time() * 1000)}",
            filename=filename,
            size=file_size,
            hash=file_hash,
            timestamp=time.time(),
            type="upload",
            direction="sent"
        )
        self.chat_repo.add_transfer_history(item)

        return {
            "fileUrl": f"/files/{stored_filename}",
            "filename": filename,
            "hash": file_hash
        }

    def get_zip_contents(self, filename: str) -> list:
        safe_filename = secure_filename(filename)
        file_path = os.path.join(Config.UPLOAD_FOLDER, safe_filename)
        if not os.path.exists(file_path) or not zipfile.is_zipfile(file_path):
            raise FileNotFoundError("Not a valid zip file")

        with zipfile.ZipFile(file_path, "r") as z:
            info_list = z.infolist()
            if len(info_list) > MAX_ZIP_ENTRIES:
                raise ValueError(f"ZIP archive exceeds maximum entry limit of {MAX_ZIP_ENTRIES}")

            return [
                {
                    "name": info.filename[:MAX_FILENAME_LEN],
                    "size": info.file_size,
                    "is_dir": info.is_dir()
                }
                for info in info_list
            ]
