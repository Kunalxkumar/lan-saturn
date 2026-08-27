import threading

from app.constants import MAX_CLIPBOARD_ITEMS

_lock = threading.Lock()
_users = {}
_shares = {}
_shared_directory = None
_clipboard_history = []


def set_user(socket_id, username):
    with _lock:
        _users[socket_id] = username


def get_username(socket_id):
    with _lock:
        return _users.get(socket_id, "Anonymous")


def remove_user(socket_id):
    with _lock:
        return _users.pop(socket_id, None)


def get_online_users():
    with _lock:
        return list(_users.values())


def get_user_sid(username):
    with _lock:
        for sid, name in _users.items():
            if name == username:
                return sid
    return None


def add_share(username, ip, port, folder_name):
    with _lock:
        _shares[username] = {"ip": ip, "port": port, "folderName": folder_name}


def remove_share(username):
    with _lock:
        _shares.pop(username, None)


def get_all_shares():
    with _lock:
        return dict(_shares)


def set_shared_directory(path):
    global _shared_directory
    with _lock:
        _shared_directory = path


def get_shared_directory():
    with _lock:
        return _shared_directory


def add_clipboard_item(item):
    with _lock:
        if _clipboard_history and _clipboard_history[0]["text"] == item["text"]:
            return False
        _clipboard_history.insert(0, item)
        if len(_clipboard_history) > MAX_CLIPBOARD_ITEMS:
            _clipboard_history.pop()
        return True


def get_clipboard_history():
    with _lock:
        return list(_clipboard_history)


def reset_state():
    global _shared_directory
    with _lock:
        _users.clear()
        _shares.clear()
        _clipboard_history.clear()
        _shared_directory = None
