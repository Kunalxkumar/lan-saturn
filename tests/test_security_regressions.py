from io import BytesIO
from types import SimpleNamespace

from app.sockets import chat, security
from app.repositories.chat_repo import ChatRepository
from app.repositories.security_repo import SecurityRepository
from app.services.auth import SESSION_COOKIE_NAME, create_session


def _remote_client(app):
    client = app.test_client()
    session = create_session("10.10.10.50", "remote-test-agent")
    client.set_cookie(SESSION_COOKIE_NAME, session["id"])
    return client


def test_remote_client_cannot_configure_shared_directory(app, tmp_path):
    client = _remote_client(app)
    response = client.post(
        "/api/shared-directory/config",
        json={"path": str(tmp_path)},
        headers={"X-Lan-Saturn-Remote-Addr": "10.10.10.50", "User-Agent": "remote-test-agent"},
    )
    assert response.status_code == 403


def test_untrusted_http_upload_is_rejected(app):
    client = _remote_client(app)
    response = client.post(
        "/upload",
        data={"file": (BytesIO(b"hello"), "hello.txt")},
        content_type="multipart/form-data",
        headers={"X-Lan-Saturn-Remote-Addr": "10.10.10.50", "User-Agent": "remote-test-agent"},
    )
    assert response.status_code == 401


def test_remote_socket_cannot_approve_itself(monkeypatch):
    captured = []
    monkeypatch.setattr(security, "require_socket_admin", lambda: False)
    monkeypatch.setattr(security, "emit", lambda name, payload, **kwargs: captured.append((name, payload, kwargs)))
    monkeypatch.setattr(security, "request", SimpleNamespace(sid="sid-1"))
    repo = SecurityRepository()
    before = repo.get_all_devices()

    security.handle_update_device_trust({"ip": "10.10.10.50", "userAgent": "remote-test-agent", "trusted": True})

    assert any(name == "security_error" for name, _payload, _kwargs in captured)
    after = repo.get_all_devices()
    assert before == after


def test_server_derives_message_sender_from_session(monkeypatch):
    monkeypatch.setattr(chat, "require_socket_trusted", lambda: True)
    monkeypatch.setattr(chat, "require_socket_channel", lambda channel: channel == "general")
    monkeypatch.setattr(chat, "get_socket_session", lambda: {"username": "Alice"})
    monkeypatch.setattr(chat, "request", SimpleNamespace(sid="sid-2"))
    monkeypatch.setattr(chat, "emit", lambda *args, **kwargs: None)

    chat.handle_message(
        {
            "username": "Mallory",
            "message": "spoof attempt",
            "channel": "general",
            "timestamp": "123",
            "encrypted": False,
        }
    )

    messages = ChatRepository().get_messages("general")
    assert messages[-1].username == "Alice"


def test_remote_socket_cannot_clear_global_history(monkeypatch):
    captured = []
    monkeypatch.setattr(chat, "require_socket_admin", lambda: False)
    monkeypatch.setattr(chat, "emit", lambda name, payload, **kwargs: captured.append((name, payload, kwargs)))
    monkeypatch.setattr(chat, "request", SimpleNamespace(sid="sid-3"))

    chat.handle_clear_chat_history()

    assert any(name == "security_error" for name, _payload, _kwargs in captured)
