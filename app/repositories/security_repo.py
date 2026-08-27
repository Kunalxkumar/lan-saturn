import time
import hashlib
from typing import List, Dict, Optional, Any
from app.repositories.db import get_connection

class SecurityRepository:
    # --- Channel Passwords ---
    def set_channel_password(self, channel_id: str, password: str) -> None:
        # Simple SHA-256 for local LAN application, standard practice
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO channel_passwords (channel_id, password_hash)
                VALUES (?, ?)
                ON CONFLICT(channel_id) DO UPDATE SET password_hash = excluded.password_hash
                """,
                (channel_id, password_hash)
            )
            conn.commit()

    def remove_channel_password(self, channel_id: str) -> None:
        with get_connection() as conn:
            conn.execute("DELETE FROM channel_passwords WHERE channel_id = ?", (channel_id,))
            conn.commit()

    def is_channel_locked(self, channel_id: str) -> bool:
        with get_connection() as conn:
            cursor = conn.execute("SELECT 1 FROM channel_passwords WHERE channel_id = ?", (channel_id,))
            return cursor.fetchone() is not None

    def verify_channel_password(self, channel_id: str, password: str) -> bool:
        if not self.is_channel_locked(channel_id):
            return True
        password_hash = hashlib.sha256(password.encode('utf-8')).hexdigest()
        with get_connection() as conn:
            cursor = conn.execute("SELECT password_hash FROM channel_passwords WHERE channel_id = ?", (channel_id,))
            row = cursor.fetchone()
            if row:
                return row['password_hash'] == password_hash
        return False

    # --- Invite Codes ---
    def create_invite_code(self, channel_id: str, code: str, duration_seconds: int = 86400) -> None:
        expires_at = time.time() + duration_seconds
        with get_connection() as conn:
            conn.execute(
                "INSERT OR REPLACE INTO invite_codes (code, channel_id, expires_at) VALUES (?, ?, ?)",
                (code, channel_id, expires_at)
            )
            conn.commit()

    def validate_invite_code(self, code: str, channel_id: str) -> bool:
        with get_connection() as conn:
            cursor = conn.execute(
                "SELECT channel_id, expires_at FROM invite_codes WHERE code = ?",
                (code,)
            )
            row = cursor.fetchone()
            if not row:
                return False
            # Check matching channel and non-expired time
            if row['channel_id'] == channel_id and row['expires_at'] > time.time():
                return True
        return False

    # --- Device Trust ---
    def record_device(self, ip_addr: str, user_agent: str) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT OR IGNORE INTO trusted_devices (ip_addr, user_agent, trusted)
                VALUES (?, ?, 0)
                """,
                (ip_addr, user_agent)
            )
            conn.commit()

    def set_device_trust(self, ip_addr: str, user_agent: str, trusted: bool) -> None:
        with get_connection() as conn:
            conn.execute(
                "UPDATE trusted_devices SET trusted = ? WHERE ip_addr = ? AND user_agent = ?",
                (1 if trusted else 0, ip_addr, user_agent)
            )
            conn.commit()

    def is_device_trusted(self, ip_addr: str, user_agent: str) -> bool:
        # Loopback is always trusted
        if ip_addr in ('127.0.0.1', '::1'):
            return True
        with get_connection() as conn:
            cursor = conn.execute(
                "SELECT trusted FROM trusted_devices WHERE ip_addr = ? AND user_agent = ?",
                (ip_addr, user_agent)
            )
            row = cursor.fetchone()
            if row:
                return bool(row['trusted'])
        return False

    def get_all_devices(self) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.execute("SELECT ip_addr, user_agent, trusted FROM trusted_devices")
            rows = cursor.fetchall()
            return [
                {
                    'ip': row['ip_addr'],
                    'userAgent': row['user_agent'],
                    'trusted': bool(row['trusted'])
                }
                for row in rows
            ]
