import hashlib
import os
import time
import uuid
import zipfile

from werkzeug.utils import secure_filename

from app.config import Config
from app.models.models import TransferItem
from app.repositories.chat_repo import ChatRepository

MAX_ZIP_ENTRIES = 2000
MAX_FILENAME_LEN = 255


def save_uploaded_file(file_storage, chat_repo=None):
    filename = secure_filename(file_storage.filename)
    if not filename:
        raise ValueError("Invalid filename")

    ext = os.path.splitext(filename)[1]
    stored_filename = f"{uuid.uuid4()}{ext}"
    file_path = os.path.join(Config.UPLOAD_FOLDER, stored_filename)
    file_storage.save(file_path)

    sha256 = hashlib.sha256()
    with open(file_path, "rb") as file_handle:
        while chunk := file_handle.read(8192):
            sha256.update(chunk)

    repo = chat_repo or ChatRepository()
    repo.add_transfer_history(
        TransferItem(
            id=f"tx_{int(time.time() * 1000)}",
            filename=filename,
            size=os.path.getsize(file_path),
            hash=sha256.hexdigest(),
            timestamp=time.time(),
            type="upload",
            direction="sent",
        )
    )

    return {"fileUrl": f"/files/{stored_filename}", "filename": filename, "hash": sha256.hexdigest()}


def get_zip_contents(filename):
    safe_filename = secure_filename(filename)
    file_path = os.path.join(Config.UPLOAD_FOLDER, safe_filename)
    if not os.path.exists(file_path) or not zipfile.is_zipfile(file_path):
        raise FileNotFoundError("Not a valid zip file")

    with zipfile.ZipFile(file_path, "r") as archive:
        info_list = archive.infolist()
        if len(info_list) > MAX_ZIP_ENTRIES:
            raise ValueError(f"ZIP archive exceeds maximum entry limit of {MAX_ZIP_ENTRIES}")
        return [
            {"name": info.filename[:MAX_FILENAME_LEN], "size": info.file_size, "is_dir": info.is_dir()}
            for info in info_list
        ]
