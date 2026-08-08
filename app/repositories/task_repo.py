from typing import List, Optional
from app.repositories.db import db_manager
from app.models.models import Task

class TaskRepository:
    def add_task(self, task: Task) -> None:
        with db_manager.get_connection() as conn:
            conn.execute(
                """
                INSERT INTO tasks (id, channel, text, done, creator)
                VALUES (?, ?, ?, ?, ?)
                """,
                (task.id, task.channel, task.text, 1 if task.done else 0, task.creator)
            )
            conn.commit()

    def get_task(self, task_id: str) -> Optional[Task]:
        with db_manager.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM tasks WHERE id = ?", (task_id,))
            row = cursor.fetchone()
            return Task.from_row(row) if row else None

    def get_channel_tasks(self, channel: str) -> List[Task]:
        with db_manager.get_connection() as conn:
            cursor = conn.execute("SELECT * FROM tasks WHERE channel = ?", (channel,))
            rows = cursor.fetchall()
            return [Task.from_row(row) for row in rows]

    def toggle_task(self, task_id: str) -> Optional[Task]:
        task = self.get_task(task_id)
        if not task:
            return None
        new_done = not task.done
        with db_manager.get_connection() as conn:
            conn.execute("UPDATE tasks SET done = ? WHERE id = ?", (1 if new_done else 0, task_id))
            conn.commit()
        task.done = new_done
        return task

    def delete_task(self, task_id: str) -> None:
        with db_manager.get_connection() as conn:
            conn.execute("DELETE FROM tasks WHERE id = ?", (task_id,))
            conn.commit()
