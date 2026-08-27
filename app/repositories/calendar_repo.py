from typing import List, Dict, Any
from app.repositories.db import get_connection

class CalendarRepository:
    def add_event(self, event_id: str, title: str, description: str, start_time: str, end_time: str, creator: str, channel: str) -> None:
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO calendar_events (id, title, description, start_time, end_time, creator, channel)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (event_id, title, description, start_time, end_time, creator, channel)
            )
            conn.commit()

    def get_channel_events(self, channel: str) -> List[Dict[str, Any]]:
        with get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM calendar_events WHERE channel = ? ORDER BY start_time ASC",
                (channel,)
            )
            rows = cursor.fetchall()
            return [
                {
                    'id': row['id'],
                    'title': row['title'],
                    'description': row['description'],
                    'startTime': row['start_time'],
                    'endTime': row['end_time'],
                    'creator': row['creator'],
                    'channel': row['channel']
                }
                for row in rows
            ]

    def delete_event(self, event_id: str) -> None:
        with get_connection() as conn:
            conn.execute("DELETE FROM calendar_events WHERE id = ?", (event_id,))
            conn.commit()
