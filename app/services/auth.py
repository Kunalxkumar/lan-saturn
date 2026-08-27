import secrets
from typing import Optional

from flask import Request, current_app, request

from app.repositories.security_repo import SecurityRepository

SESSION_COOKIE_NAME = "lan_saturn_session"

_sessions = {}
_sid_to_session = {}
_security_repo = SecurityRepository()


def _is_loopback(remote_addr: Optional[str]) -> bool:
    return remote_addr in {"127.0.0.1", "::1", "localhost"}


def _get_remote_addr(req: Request):
    override = req.headers.get("X-Lan-Saturn-Remote-Addr")
    if override:
        return override
    if current_app.config.get("TESTING"):
        return None
    return req.remote_addr


def _get_user_agent(req: Request):
    return req.headers.get("User-Agent", "")


def _new_session(remote_addr: Optional[str], user_agent: str):
    session_id = secrets.token_urlsafe(32)
    trusted = _is_loopback(remote_addr) or _security_repo.is_device_trusted(remote_addr or "", user_agent or "")
    _sessions[session_id] = {
        "id": session_id,
        "username": None,
        "channels": set(),
        "is_admin": _is_loopback(remote_addr),
        "trusted": trusted,
        "remote_addr": remote_addr,
        "user_agent": user_agent or "",
    }
    return _sessions[session_id]


def create_session(remote_addr: Optional[str], user_agent: str, username: Optional[str] = None):
    session = _new_session(remote_addr, user_agent)
    if username:
        session["username"] = username
    return session


def reset_auth_state():
    _sessions.clear()
    _sid_to_session.clear()


def issue_request_session(req: Optional[Request] = None):
    req = req or request
    session_id = req.cookies.get(SESSION_COOKIE_NAME)
    if session_id and session_id in _sessions:
        refresh_session(_sessions[session_id], _get_remote_addr(req), _get_user_agent(req))
        return _sessions[session_id], False
    return _new_session(_get_remote_addr(req), _get_user_agent(req)), True


def get_request_session(required: bool = True):
    session_id = request.cookies.get(SESSION_COOKIE_NAME)
    session = _sessions.get(session_id)
    if session:
        refresh_session(session, _get_remote_addr(request), _get_user_agent(request))
    if required and not session:
        return None
    return session


def bind_socket_session(sid: str):
    session, _created = issue_request_session(request)
    _sid_to_session[sid] = session["id"]
    return session


def unbind_socket_session(sid: str):
    _sid_to_session.pop(sid, None)


def get_socket_session(sid: Optional[str] = None, required: bool = True):
    sid = sid or request.sid
    session_id = _sid_to_session.get(sid)
    session = _sessions.get(session_id)
    if session:
        refresh_session(session, _get_remote_addr(request), _get_user_agent(request))
    if required and not session:
        return None
    return session


def refresh_session(session, remote_addr: Optional[str], user_agent: str):
    if remote_addr is None:
        remote_addr = session.get("remote_addr")
    session["remote_addr"] = remote_addr
    session["user_agent"] = user_agent or session.get("user_agent", "")
    session["is_admin"] = _is_loopback(remote_addr)
    session["trusted"] = session["is_admin"] or _security_repo.is_device_trusted(
        remote_addr or "", session["user_agent"] or ""
    )


def set_session_username(session, username: str):
    if username:
        session["username"] = username.strip()[:50]


def add_channel_membership(session, channel: str):
    session["channels"].add(channel)


def remove_channel_membership(session, channel: str):
    session["channels"].discard(channel)


def has_channel_access(session, channel: str):
    return channel in session["channels"]


def require_socket_admin():
    session = get_socket_session()
    return bool(session and session["is_admin"])


def require_socket_trusted():
    session = get_socket_session()
    return bool(session and session["trusted"])


def require_socket_channel(channel: str):
    session = get_socket_session()
    return bool(session and has_channel_access(session, channel))


def require_request_admin():
    session = get_request_session()
    return bool(session and session["is_admin"])


def require_request_trusted():
    session = get_request_session()
    return bool(session and session["trusted"])


def get_session_username(session, fallback: str):
    return session.get("username") or fallback


def set_session_cookie(response, session):
    secure_cookie = not current_app.config.get("TESTING", False)
    response.set_cookie(
        SESSION_COOKIE_NAME,
        session["id"],
        httponly=True,
        samesite="Lax",
        secure=secure_cookie,
    )
    return response
