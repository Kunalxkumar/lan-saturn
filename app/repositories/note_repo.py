import os
from typing import List
from werkzeug.utils import secure_filename
from app.config import Config

class NoteRepository:
    def __init__(self, notes_folder: str = None):
        self.notes_folder = notes_folder or Config.NOTES_FOLDER
        os.makedirs(self.notes_folder, exist_ok=True)

    def _get_channel_dir(self, channel: str) -> str:
        safe_channel = secure_filename(channel)
        channel_dir = os.path.join(self.notes_folder, safe_channel)
        os.makedirs(channel_dir, exist_ok=True)
        return channel_dir

    def list_notes(self, channel: str) -> List[str]:
        channel_dir = self._get_channel_dir(channel)
        try:
            return [f[:-3] for f in os.listdir(channel_dir) if f.endswith('.md')]
        except Exception:
            return []

    def get_note_content(self, channel: str, note_name: str) -> str:
        safe_note = secure_filename(note_name)
        note_path = os.path.join(self._get_channel_dir(channel), f"{safe_note}.md")
        if not os.path.exists(note_path):
            return ""
        try:
            with open(note_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print("Error reading note file:", e)
            return ""

    def save_note(self, channel: str, note_name: str, content: str) -> bool:
        safe_note = secure_filename(note_name)
        note_path = os.path.join(self._get_channel_dir(channel), f"{safe_note}.md")
        try:
            with open(note_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print("Error writing note file:", e)
            return False

    def delete_note(self, channel: str, note_name: str) -> bool:
        safe_note = secure_filename(note_name)
        note_path = os.path.join(self._get_channel_dir(channel), f"{safe_note}.md")
        if os.path.exists(note_path):
            try:
                os.remove(note_path)
                return True
            except Exception as e:
                print("Error removing note file:", e)
                return False
        return False
