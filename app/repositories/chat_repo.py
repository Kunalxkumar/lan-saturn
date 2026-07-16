from typing import List, Optional
from app.repositories.db import db_manager
from app.models.models import Message, TransferItem

class ChatRepository:
    def add_message(self, msg: Message) -> None:
        with db_manager.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO messages (id, username, message, channel, timestamp, encrypted, encryption_version, salt, nonce, type, dm_user, file_url, original_type, original_size)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    msg.id, msg.username, msg.message, msg.channel, msg.timestamp,
                    1 if msg.encrypted else 0, msg.encryption_version, msg.salt, msg.nonce,
                    msg.type, msg.dm_user, msg.file_url, msg.original_type, msg.original_size
                )
            )
            conn.commit()

    def get_messages(self, channel: str) -> List[Message]:
        with db_manager.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM messages WHERE channel = ? AND type != 'private' ORDER BY timestamp ASC",
                (channel,)
            )
            rows = cursor.fetchall()
            return [
                Message(
                    id=row['id'], username=row['username'], message=row['message'],
                    channel=row['channel'], timestamp=row['timestamp'],
                    encrypted=bool(row['encrypted']), encryption_version=row['encryption_version'],
                    salt=row['salt'], nonce=row['nonce'], type=row['type'],
                    dm_user=row['dm_user'], file_url=row['file_url'],
                    original_type=row['original_type'], original_size=row['original_size']
                )
                for row in rows
            ]

    def get_private_messages(self, user1: str, user2: str) -> List[Message]:
        with db_manager.get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT * FROM messages 
                WHERE type = 'private' AND 
                ((username = ? AND dm_user = ?) OR (username = ? AND dm_user = ?))
                ORDER BY timestamp ASC
                """,
                (user1, user2, user2, user1)
            )
            rows = cursor.fetchall()
            return [
                Message(
                    id=row['id'], username=row['username'], message=row['message'],
                    channel=row['channel'], timestamp=row['timestamp'],
                    encrypted=bool(row['encrypted']), encryption_version=row['encryption_version'],
                    salt=row['salt'], nonce=row['nonce'], type=row['type'],
                    dm_user=row['dm_user'], file_url=row['file_url'],
                    original_type=row['original_type'], original_size=row['original_size']
                )
                for row in rows
            ]

    def add_transfer_history(self, item: TransferItem) -> None:
        with db_manager.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO transfer_history (id, filename, size, hash, timestamp, type, direction)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (item.id, item.filename, item.size, item.hash, item.timestamp, item.type, item.direction)
            )
            conn.commit()

    def get_transfer_history(self, limit: int = 50) -> List[TransferItem]:
        with db_manager.get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM transfer_history ORDER BY timestamp DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            return [
                TransferItem(
                    id=row['id'], filename=row['filename'], size=row['size'],
                    hash=row['hash'], timestamp=row['timestamp'], type=row['type'],
                    direction=row['direction']
                )
                for row in rows
            ]

    def clear_history(self) -> None:
        with db_manager.get_connection() as conn:
            conn.execute("DELETE FROM messages")
            conn.commit()
