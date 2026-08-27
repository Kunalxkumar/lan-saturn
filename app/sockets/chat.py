import uuid
import time
from flask import request
from flask_socketio import emit, join_room
from pydantic import ValidationError

from app.extensions import socketio
from app.services import state_manager
from app.services.auth import (
    add_channel_membership,
    bind_socket_session,
    get_session_username,
    get_socket_session,
    has_channel_access,
    require_socket_admin,
    require_socket_channel,
    require_socket_trusted,
    set_session_username,
    unbind_socket_session,
)
from app.repositories.chat_repo import ChatRepository
from app.repositories.security_repo import SecurityRepository
from app.models.models import Message
from app.schemas.validation import SendMessageSchema

chat_repo = ChatRepository()
security_repo = SecurityRepository()

def update_user_list():
    users_list = state_manager.get_online_users()
    emit('user_list', {'users': users_list}, broadcast=True)

@socketio.on('connect')
def handle_connect():
    sid = request.sid
    security_repo.record_device(request.remote_addr, request.headers.get('User-Agent', ''))
    session = bind_socket_session(sid)
    unique_name = session.get('username') or f'User-{sid[:4]}'
    state_manager.set_user(sid, unique_name)
    emit('user_joined', {'username': unique_name}, broadcast=True)
    update_user_list()

@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    username = state_manager.get_username(sid)
    unbind_socket_session(sid)
    state_manager.remove_user(sid)
    state_manager.remove_share(username)

    shares = state_manager.get_all_shares()
    emit('shares_list', {'shares': shares}, broadcast=True)
    emit('user_left', {'username': username}, broadcast=True)
    update_user_list()

@socketio.on('join_channel')
def handle_join_channel(data):
    try:
        session = get_socket_session()
        if not session:
            emit('security_error', {'message': 'Authentication required'}, to=request.sid)
            return
        data = data or {}
        channel = data.get('channel', 'general')
        username = data.get('username', f'User-{request.sid[:4]}').strip()[:50]
        password = data.get('password', '').strip()
        invite_code = data.get('inviteCode', '').strip()
        sid = request.sid

        # Enforce password / invite check if channel is locked
        if security_repo.is_channel_locked(channel):
            is_valid = False
            if invite_code:
                is_valid = security_repo.validate_invite_code(invite_code, channel)
            if not is_valid and password:
                is_valid = security_repo.verify_channel_password(channel, password)
            
            if not is_valid:
                emit('password_required', {'channel': channel})
                return

        set_session_username(session, username)
        state_manager.set_user(sid, get_session_username(session, username))
        add_channel_membership(session, channel)

        room_name = f'channel_{channel}'
        join_room(room_name)
        update_user_list()

        # Load from SQLite database and seed to client on room enter
        history = chat_repo.get_messages(channel)
        emit('messages_history', {
            'channel': channel,
            'messages': [msg.to_dict() for msg in history]
        })
    except Exception as exc:
        print("ERROR in handle_join_channel:", exc)

@socketio.on('send_message')
def handle_message(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Your device is untrusted. Please request administrator approval.'}, to=request.sid)
        return

    try:
        schema = SendMessageSchema(**data)
    except ValidationError:
        emit('error', {'message': 'Invalid message validation format'}, to=request.sid)
        return

    if not require_socket_channel(schema.channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return

    session = get_socket_session()
    username = get_session_username(session, f'User-{request.sid[:4]}')

    msg_id = f'msg_{uuid.uuid4().hex}'
    msg = Message(
        id=msg_id,
        username=username,
        message=schema.message,
        channel=schema.channel,
        timestamp=schema.timestamp or str(int(time.time() * 1000)),
        encrypted=schema.encrypted,
        encryption_version=schema.encryptionVersion or '',
        salt=schema.salt or '',
        nonce=schema.nonce or '',
        type=schema.type or 'text',
        dm_user=schema.dmUser,
        file_url=schema.fileUrl,
        original_type=schema.originalType,
        original_size=schema.originalSize
    )

    chat_repo.add_message(msg)

    room_name = f'channel_{schema.channel}'
    emit('receive_message', msg.to_dict(), to=room_name, include_self=False)

@socketio.on('typing_start')
def handle_typing_start(data):
    session = get_socket_session()
    username = get_session_username(session or {}, f'User-{request.sid[:4]}')
    emit('user_typing', {'username': username}, broadcast=True, include_self=False)

@socketio.on('typing_stop')
def handle_typing_stop(data):
    emit('user_stopped_typing', {}, broadcast=True, include_self=False)

@socketio.on('file_share')
def handle_file_share(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Your device is untrusted. Please request administrator approval.'}, to=request.sid)
        return

    try:
        schema = SendMessageSchema(**data)
    except ValidationError:
        return

    if not require_socket_channel(schema.channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return

    session = get_socket_session()
    username = get_session_username(session, f'User-{request.sid[:4]}')

    msg_id = f'msg_{uuid.uuid4().hex}'
    msg = Message(
        id=msg_id,
        username=username,
        message=schema.message,
        channel=schema.channel,
        timestamp=schema.timestamp or str(int(time.time() * 1000)),
        encrypted=schema.encrypted,
        encryption_version=schema.encryptionVersion or '',
        salt=schema.salt or '',
        nonce=schema.nonce or '',
        type=schema.type or 'file',
        dm_user=schema.dmUser,
        file_url=schema.fileUrl,
        original_type=schema.originalType,
        original_size=schema.originalSize
    )

    chat_repo.add_message(msg)

    room_name = f'channel_{schema.channel}'
    emit('file_shared', msg.to_dict(), to=room_name, include_self=False)

@socketio.on('add_reaction')
def handle_reaction(data):
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    session = get_socket_session()
    emit('reaction_added', {
        'messageId': data.get('messageId', ''),
        'emoji': data.get('emoji', ''),
        'username': get_session_username(session or {}, f'User-{request.sid[:4]}')
    }, to=f'channel_{channel}')

@socketio.on('private_message')
def handle_private_message(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Your device is untrusted. Please request administrator approval.'}, to=request.sid)
        return

    try:
        schema = SendMessageSchema(**data)
    except ValidationError:
        return

    if not schema.dmUser:
        return

    session = get_socket_session()
    username = get_session_username(session, f'User-{request.sid[:4]}')
    target_sid = state_manager.get_user_sid(schema.dmUser)

    msg_id = f'msg_{uuid.uuid4().hex}'
    msg = Message(
        id=msg_id,
        username=username,
        message=schema.message,
        channel=schema.channel,
        timestamp=schema.timestamp or str(int(time.time() * 1000)),
        encrypted=schema.encrypted,
        encryption_version=schema.encryptionVersion or '',
        salt=schema.salt or '',
        nonce=schema.nonce or '',
        type='private',
        dm_user=schema.dmUser,
        file_url=schema.fileUrl,
        original_type=schema.originalType,
        original_size=schema.originalSize
    )

    chat_repo.add_message(msg)

    if target_sid:
        emit('private_message', msg.to_dict(), to=target_sid)

@socketio.on('announce_share')
def handle_announce_share(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    session = get_socket_session()
    username = get_session_username(session or {}, 'Anonymous')
    ip = request.remote_addr
    port = data.get('port', 5000)
    folder_name = data.get('folderName', 'Shared Folder')

    state_manager.add_share(username, ip, port, folder_name)
    shares = state_manager.get_all_shares()
    emit('shares_list', {'shares': shares}, broadcast=True)

@socketio.on('get_shares')
def handle_get_shares():
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    shares = state_manager.get_all_shares()
    emit('shares_list', {'shares': shares}, to=request.sid)

@socketio.on('clear_chat_history')
def handle_clear_chat_history():
    if not require_socket_admin():
        emit('security_error', {'message': 'Administrator access required'}, to=request.sid)
        return
    chat_repo.clear_history()
    emit('chat_history_cleared', {}, broadcast=True)
