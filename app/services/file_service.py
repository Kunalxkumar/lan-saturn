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
MAX_UPLOAD_SIZE = 4 * 1024 * 1024 * 1024  # 4 GB maximum transfer limit


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


def append_chunk_offset(stored_filename, chunk_data, offset, total_size, chat_repo=None):
    """Append a chunk at a specified byte offset for resumable file transfers."""
    safe_stored = secure_filename(stored_filename)
    if not safe_stored or safe_stored.startswith("."):
        raise ValueError("Invalid target filename")

    if total_size <= 0 or total_size > MAX_UPLOAD_SIZE:
        raise ValueError(f"Total size must be between 1 byte and {MAX_UPLOAD_SIZE // (1024 * 1024)} MB")

    if offset < 0:
        raise ValueError("Offset cannot be negative")

    chunk_len = len(chunk_data) if chunk_data else 0
    if chunk_len == 0:
        raise ValueError("Empty chunk data")

    if offset + chunk_len > total_size:
        raise ValueError("Chunk data exceeds declared total file size")

    upload_dir = os.path.abspath(Config.UPLOAD_FOLDER)
    file_path = os.path.abspath(os.path.join(upload_dir, safe_stored))
    if not file_path.startswith(upload_dir):
        raise ValueError("Target path escapes upload directory")

    if os.path.exists(file_path):
        current_disk_size = os.path.getsize(file_path)
        if offset > current_disk_size:
            raise ValueError(f"Invalid chunk offset {offset} exceeds current written file size {current_disk_size}")
        mode = "r+b"
    else:
        if offset != 0:
            raise ValueError("First chunk must start at offset 0")
        mode = "wb"
    
    with open(file_path, mode) as f:
        f.seek(offset)
        f.write(chunk_data)

    current_size = os.path.getsize(file_path)
    is_complete = current_size >= total_size
    file_hash = None

    if is_complete:
        sha256 = hashlib.sha256()
        with open(file_path, "rb") as f:
            while c := f.read(8192):
                sha256.update(c)
        file_hash = sha256.hexdigest()

        repo = chat_repo or ChatRepository()
        repo.add_transfer_history(
            TransferItem(
                id=f"tx_{int(time.time() * 1000)}",
                filename=safe_stored,
                size=current_size,
                hash=file_hash,
                timestamp=time.time(),
                type="chunked_upload",
                direction="sent",
            )
        )

    return {
        "fileUrl": f"/files/{safe_stored}",
        "filename": safe_stored,
        "currentSize": current_size,
        "totalSize": total_size,
        "isComplete": is_complete,
        "hash": file_hash
    }


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
