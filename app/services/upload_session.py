import os
import time
import uuid
import shutil
import hashlib
import logging
import threading
from typing import Dict, Optional, Any
from werkzeug.utils import secure_filename

from app.config import Config
from app.models.models import TransferItem
from app.repositories.chat_repo import ChatRepository

logger = logging.getLogger(__name__)


class UploadSession:
    def __init__(
        self,
        upload_id: str,
        session_id: str,
        filename: str,
        stored_filename: str,
        temp_path: str,
        total_size: int,
        expected_hash: Optional[str] = None,
        encryption_metadata: Optional[Dict[str, Any]] = None,
    ):
        self.upload_id = upload_id
        self.session_id = session_id
        self.filename = filename
        self.stored_filename = stored_filename
        self.temp_path = temp_path
        self.total_size = total_size
        self.current_offset = 0
        self.expected_hash = (expected_hash or "").strip().lower()
        self.hasher = hashlib.sha256()
        self.created_at = time.time()
        self.last_activity = self.created_at
        self.expires_at = self.created_at + Config.UPLOAD_SESSION_TIMEOUT
        self.status = "active"  # 'active', 'completed', 'cancelled', 'expired', 'failed'
        self.encryption_metadata = encryption_metadata or {}
        self.final_hash: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "uploadId": self.upload_id,
            "filename": self.filename,
            "storedFilename": self.stored_filename,
            "totalSize": self.total_size,
            "currentOffset": self.current_offset,
            "expectedHash": self.expected_hash,
            "createdAt": self.created_at,
            "lastActivity": self.last_activity,
            "expiresAt": self.expires_at,
            "status": self.status,
            "isComplete": self.status == "completed",
            "encryptionMetadata": self.encryption_metadata,
            "hash": self.final_hash,
        }


class UploadSessionManager:
    def __init__(self):
        self._sessions: Dict[str, UploadSession] = {}
        self._locks: Dict[str, threading.RLock] = {}
        self._global_lock = threading.Lock()
        self._chat_repo = ChatRepository()

    def get_upload_lock(self, upload_id: str) -> threading.RLock:
        with self._global_lock:
            if upload_id not in self._locks:
                self._locks[upload_id] = threading.RLock()
            return self._locks[upload_id]

    def init_session(
        self,
        session_id: str,
        filename: str,
        total_size: int,
        expected_hash: Optional[str] = None,
        encryption_metadata: Optional[Dict[str, Any]] = None,
    ) -> UploadSession:
        safe_filename = secure_filename(filename)
        if not safe_filename or safe_filename.startswith("."):
            raise ValueError("Invalid filename")

        if not isinstance(total_size, int) or total_size <= 0:
            raise ValueError("totalSize must be a positive integer")

        if total_size > Config.MAX_UPLOAD_SIZE:
            max_mb = Config.MAX_UPLOAD_SIZE // (1024 * 1024)
            raise ValueError(f"File size exceeds maximum allowed limit of {max_mb} MB")

        upload_id = uuid.uuid4().hex
        ext = os.path.splitext(safe_filename)[1]
        stored_filename = f"{uuid.uuid4().hex}{ext}"

        os.makedirs(Config.PARTIAL_UPLOAD_FOLDER, exist_ok=True)
        temp_path = os.path.abspath(
            os.path.join(Config.PARTIAL_UPLOAD_FOLDER, f"{upload_id}.part")
        )

        # Create empty staging file
        with open(temp_path, "wb") as f:
            pass

        session = UploadSession(
            upload_id=upload_id,
            session_id=session_id,
            filename=safe_filename,
            stored_filename=stored_filename,
            temp_path=temp_path,
            total_size=total_size,
            expected_hash=expected_hash,
            encryption_metadata=encryption_metadata,
        )

        with self._global_lock:
            self._sessions[upload_id] = session

        logger.info(
            "Upload session started: upload_id=%s, file=%s, size=%d",
            upload_id,
            safe_filename,
            total_size,
        )
        return session

    def get_session(self, upload_id: str) -> Optional[UploadSession]:
        with self._global_lock:
            session = self._sessions.get(upload_id)
        if not session:
            return None

        now = time.time()
        if session.status == "active" and now > session.expires_at:
            with self.get_upload_lock(upload_id):
                session.status = "expired"
                if os.path.exists(session.temp_path):
                    try:
                        os.remove(session.temp_path)
                    except OSError:
                        pass
                logger.warning("Upload session expired: upload_id=%s", upload_id)
        return session

    def append_chunk(
        self,
        upload_id: str,
        session_id: str,
        chunk_data: bytes,
        offset: int,
        expected_hash: Optional[str] = None,
    ) -> Dict[str, Any]:
        lock = self.get_upload_lock(upload_id)
        with lock:
            session = self.get_session(upload_id)
            if not session:
                raise ValueError("Upload session not found")

            if session.session_id != session_id:
                raise PermissionError("Access denied: session ownership mismatch")

            if expected_hash and not session.expected_hash:
                session.expected_hash = expected_hash.strip().lower()

            if session.status != "active":
                raise ValueError(
                    f"Cannot write chunk: upload session status is '{session.status}'"
                )

            chunk_len = len(chunk_data) if chunk_data else 0
            if chunk_len == 0:
                raise ValueError("Empty chunk data")

            if chunk_len > Config.MAX_CHUNK_SIZE:
                max_chunk_mb = Config.MAX_CHUNK_SIZE // (1024 * 1024)
                raise ValueError(
                    f"Chunk size exceeds maximum allowed chunk of {max_chunk_mb} MB"
                )

            # Strict contiguous offset check: must match server authoritative offset
            if offset != session.current_offset:
                raise ValueError(
                    f"Strict contiguous offset violation: received {offset}, expected {session.current_offset}"
                )

            if offset + chunk_len > session.total_size:
                raise ValueError(
                    f"Chunk exceeds total declared file size {session.total_size}"
                )

            if not os.path.exists(session.temp_path):
                raise FileNotFoundError("Partial upload staging file missing")

            with open(session.temp_path, "r+b") as f:
                f.seek(offset)
                f.write(chunk_data)

            session.hasher.update(chunk_data)
            session.current_offset += chunk_len
            session.last_activity = time.time()
            session.expires_at = (
                session.last_activity + Config.UPLOAD_SESSION_TIMEOUT
            )

            is_complete = session.current_offset == session.total_size
            if is_complete:
                return self._finalize_session(session)

            return {
                "success": True,
                "uploadId": session.upload_id,
                "filename": session.stored_filename,
                "originalFilename": session.filename,
                "currentOffset": session.current_offset,
                "totalSize": session.total_size,
                "isComplete": False,
                "status": session.status,
            }

    def _finalize_session(self, session: UploadSession) -> Dict[str, Any]:
        calculated_hash = session.hasher.hexdigest()
        session.final_hash = calculated_hash

        # Cryptographic Hash Integrity Check
        if session.expected_hash and session.expected_hash != calculated_hash:
            session.status = "failed"
            if os.path.exists(session.temp_path):
                try:
                    os.remove(session.temp_path)
                except OSError:
                    pass
            logger.error(
                "Integrity failure for upload_id=%s: calculated=%s, expected=%s",
                session.upload_id,
                calculated_hash,
                session.expected_hash,
            )
            raise ValueError(
                f"Integrity check failed: calculated hash {calculated_hash} does not match expected {session.expected_hash}"
            )

        final_path = os.path.abspath(
            os.path.join(Config.UPLOAD_FOLDER, session.stored_filename)
        )
        os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

        # Atomic move from .partial to uploads/
        shutil.move(session.temp_path, final_path)
        session.status = "completed"

        # Record verified transfer history item
        self._chat_repo.add_transfer_history(
            TransferItem(
                id=f"tx_{session.upload_id}",
                filename=session.filename,
                size=session.total_size,
                hash=calculated_hash,
                timestamp=time.time(),
                type="chunked_upload",
                direction="sent",
            )
        )

        logger.info(
            "Upload finalized: upload_id=%s, stored=%s, size=%d, hash=%s",
            session.upload_id,
            session.stored_filename,
            session.total_size,
            calculated_hash,
        )

        return {
            "success": True,
            "uploadId": session.upload_id,
            "fileUrl": f"/files/{session.stored_filename}",
            "filename": session.stored_filename,
            "originalFilename": session.filename,
            "currentOffset": session.current_offset,
            "totalSize": session.total_size,
            "isComplete": True,
            "status": "completed",
            "hash": calculated_hash,
        }

    def cancel_session(self, upload_id: str, session_id: str) -> Dict[str, Any]:
        lock = self.get_upload_lock(upload_id)
        with lock:
            session = self.get_session(upload_id)
            if not session:
                raise ValueError("Upload session not found")

            if session.session_id != session_id:
                raise PermissionError("Access denied: session ownership mismatch")

            if session.status in ("completed", "cancelled"):
                raise ValueError(f"Cannot cancel upload in status '{session.status}'")

            session.status = "cancelled"
            if os.path.exists(session.temp_path):
                try:
                    os.remove(session.temp_path)
                except OSError:
                    pass

            logger.info("Upload session cancelled: upload_id=%s", upload_id)
            return {"success": True, "uploadId": upload_id, "status": "cancelled"}

    def cleanup_expired_sessions(self) -> int:
        cleaned_count = 0
        now = time.time()

        with self._global_lock:
            all_sessions = list(self._sessions.values())

        for session in all_sessions:
            if session.status == "active" and now > session.expires_at:
                lock = self.get_upload_lock(session.upload_id)
                with lock:
                    session.status = "expired"
                    if os.path.exists(session.temp_path):
                        try:
                            os.remove(session.temp_path)
                            cleaned_count += 1
                        except OSError:
                            pass

        # Also purge any orphaned files in partial upload folder older than timeout
        if os.path.exists(Config.PARTIAL_UPLOAD_FOLDER):
            for entry in os.listdir(Config.PARTIAL_UPLOAD_FOLDER):
                entry_path = os.path.join(Config.PARTIAL_UPLOAD_FOLDER, entry)
                if os.path.isfile(entry_path):
                    try:
                        mtime = os.path.getmtime(entry_path)
                        if now - mtime > Config.UPLOAD_SESSION_TIMEOUT:
                            os.remove(entry_path)
                            cleaned_count += 1
                    except OSError:
                        pass

        return cleaned_count


# Global singleton instance
upload_manager = UploadSessionManager()
