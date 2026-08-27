import time
from flask import request
from flask_socketio import emit
from app.extensions import socketio
from app.services.auth import get_session_username, get_socket_session, require_socket_trusted
from app.services import state_manager

@socketio.on('clipboard_sync')
def handle_clipboard_sync(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    text = data.get('text', '').strip()
    session = get_socket_session()
    username = get_session_username(session or {}, 'Anonymous')
    if not text:
        return

    item = {
        'id': f'cb_{int(time.time() * 1000)}',
        'text': text,
        'username': username,
        'timestamp': time.time()
    }

    added = state_manager.add_clipboard_item(item)
    if added:
        emit('clipboard_updated', {
            'text': text,
            'username': username
        }, broadcast=True, include_self=False)

@socketio.on('get_clipboard_history')
def handle_get_clipboard_history():
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    history = state_manager.get_clipboard_history()
    emit('clipboard_history_list', {'history': history}, to=request.sid)
