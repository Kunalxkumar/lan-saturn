import json
from typing import List, Optional
from app.repositories.db import get_connection
from app.models.models import Poll

class PollRepository:
    def add_poll(self, poll: Poll) -> None:
        options_json = json.dumps(poll.options)
        with get_connection() as conn:
            conn.execute(
                """
                INSERT INTO polls (id, question, options, creator, closed, channel, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (poll.id, poll.question, options_json, poll.creator, 1 if poll.closed else 0, poll.channel, poll.timestamp)
            )
            conn.commit()

    def get_poll(self, poll_id: str) -> Optional[Poll]:
        with get_connection() as conn:
            cursor = conn.execute("SELECT * FROM polls WHERE id = ?", (poll_id,))
            row = cursor.fetchone()
            if not row:
                return None

            votes = self.get_poll_votes(poll_id)
            # Initialize empty vote arrays for all option indexes
            options = json.loads(row['options'])
            for i in range(len(options)):
                if i not in votes:
                    votes[i] = []

            return Poll(
                id=row['id'],
                question=row['question'],
                options=options,
                creator=row['creator'],
                closed=bool(row['closed']),
                channel=row['channel'],
                timestamp=row['timestamp'],
                votes=votes
            )

    def get_channel_polls(self, channel: str) -> List[Poll]:
        polls = []
        with get_connection() as conn:
            cursor = conn.execute("SELECT id FROM polls WHERE channel = ?", (channel,))
            poll_ids = [row['id'] for row in cursor.fetchall()]

        for pid in poll_ids:
            poll = self.get_poll(pid)
            if poll:
                polls.append(poll)
        return polls

    def get_poll_votes(self, poll_id: str) -> dict:
        votes = {}
        with get_connection() as conn:
            cursor = conn.execute("SELECT option_index, username FROM poll_votes WHERE poll_id = ?", (poll_id,))
            for row in cursor.fetchall():
                opt_idx = row['option_index']
                username = row['username']
                if opt_idx not in votes:
                    votes[opt_idx] = []
                votes[opt_idx].append(username)
        return votes

    def vote(self, poll_id: str, option_index: int, username: str) -> None:
        with get_connection() as conn:
            # Delete user's previous votes for this poll
            conn.execute("DELETE FROM poll_votes WHERE poll_id = ? AND username = ?", (poll_id, username))
            # Insert the new vote
            conn.execute(
                "INSERT INTO poll_votes (poll_id, option_index, username) VALUES (?, ?, ?)",
                (poll_id, option_index, username)
            )
            conn.commit()

    def close_poll(self, poll_id: str) -> None:
        with get_connection() as conn:
            conn.execute("UPDATE polls SET closed = 1 WHERE id = ?", (poll_id,))
            conn.commit()
