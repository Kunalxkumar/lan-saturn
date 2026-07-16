import threading
from typing import Dict, List, Optional, Any
from app.constants import MAX_CLIPBOARD_ITEMS

class ServerStateManager:
    def __init__(self):
        self._lock = threading.Lock()
        self._users: Dict[str, str] = {}  # socket_id -> username
        self._shares: Dict[str, Dict[str, Any]] = {}  # username -> {ip, port, folderName}
        self._shared_directory: Optional[str] = None
        self._clipboard_history: List[Dict[str, Any]] = []

    # User Management
    def set_user(self, socket_id: str, username: str) -> None:
        with self._lock:
            self._users[socket_id] = username

    def get_username(self, socket_id: str) -> str:
        with self._lock:
            return self._users.get(socket_id, "Anonymous")

    def remove_user(self, socket_id: str) -> Optional[str]:
        with self._lock:
            if socket_id in self._users:
                return self._users.pop(socket_id)
            return None

    def get_online_users(self) -> List[str]:
        with self._lock:
            return list(self._users.values())

    def get_user_sid(self, username: str) -> Optional[str]:
        with self._lock:
            for sid, name in self._users.items():
                if name == username:
                    return sid
            return None

    # Folder Share Management
    def add_share(self, username: str, ip: str, port: int, folder_name: str) -> None:
        with self._lock:
            self._shares[username] = {
                "ip": ip,
                "port": port,
                "folderName": folder_name
            }

    def remove_share(self, username: str) -> None:
        with self._lock:
            if username in self._shares:
                del self._shares[username]

    def get_all_shares(self) -> Dict[str, Dict[str, Any]]:
        with self._lock:
            # Return copy to avoid mutation outside lock
            return dict(self._shares)

    # Local shared directory config
    def set_shared_directory(self, path: Optional[str]) -> None:
        with self._lock:
            self._shared_directory = path

    def get_shared_directory(self) -> Optional[str]:
        with self._lock:
            return self._shared_directory

    # Clipboard Sync
    def add_clipboard_item(self, item: Dict[str, Any]) -> bool:
        with self._lock:
            # Check for duplicate sequential items
            if self._clipboard_history and self._clipboard_history[0]["text"] == item["text"]:
                return False
            self._clipboard_history.insert(0, item)
            if len(self._clipboard_history) > MAX_CLIPBOARD_ITEMS:
                self._clipboard_history.pop()
            return True

    def get_clipboard_history(self) -> List[Dict[str, Any]]:
        with self._lock:
            return list(self._clipboard_history)

state_manager = ServerStateManager()
