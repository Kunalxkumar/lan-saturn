import time
from flask import request
from flask_socketio import emit
from pydantic import ValidationError

from app.extensions import socketio
from app.repositories.db import db_manager
from app.models.models import Announcement
from app.schemas.validation import BroadcastAnnouncementSchema
from app.constants import MAX_ANNOUNCEMENTS

class AnnouncementRepository:
    def add_announcement(self, ann: Announcement) -> None:
        with db_manager.get_connection() as conn:
            # Enforce max limit by deleting oldest items
            cursor = conn.execute("SELECT COUNT(*) as count FROM announcements")
            count = cursor.fetchone()['count']
            if count >= MAX_ANNOUNCEMENTS:
                conn.execute(
                    """
                    DELETE FROM announcements 
                    WHERE id IN (
                        SELECT id FROM announcements 
                        ORDER BY timestamp ASC 
                        LIMIT 1
                    )
                    """
                )
            conn.execute(
                "INSERT INTO announcements (id, text, username, timestamp) VALUES (?, ?, ?, ?)",
                (ann.id, ann.text, ann.username, ann.timestamp)
            )
            conn.commit()

    def get_announcements(self) -> list:
        with db_manager.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM announcements ORDER BY timestamp DESC")
            rows = cursor.fetchall()
            return [
                Announcement(
                    id=row['id'], text=row['text'], username=row['username'], timestamp=row['timestamp']
                )
                for row in rows
            ]

ann_repo = AnnouncementRepository()

@socketio.on('broadcast_announcement')
def handle_broadcast_announcement(data):
    try:
        schema = BroadcastAnnouncementSchema(**data)
    except ValidationError:
        return

    ann_id = f'ann_{int(time.time() * 1000)}'
    ann = Announcement(
        id=ann_id,
        text=schema.text,
        username=schema.username,
        timestamp=schema.timestamp or str(int(time.time() * 1000))
    )

    ann_repo.add_announcement(ann)
    emit('announcement', ann.to_dict(), broadcast=True)

@socketio.on('get_announcements')
def handle_get_announcements():
    announcements = ann_repo.get_announcements()
    emit('announcements_list', {'announcements': [ann.to_dict() for ann in announcements]}, to=request.sid)
