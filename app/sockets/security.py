import random
import string
from flask import request
from flask_socketio import emit
from app.extensions import socketio
from app.services.auth import require_socket_admin
from app.repositories.security_repo import SecurityRepository

security_repo = SecurityRepository()

@socketio.on('set_channel_lock')
def handle_set_channel_lock(data):
    if not require_socket_admin():
        emit('security_error', {'message': 'Administrator access required'}, to=request.sid)
        return
    channel = data.get('channel', 'general')
    password = data.get('password', '').strip()
    # For safety, general channel can never be locked
    if channel == 'general':
        emit('security_error', {'message': 'General channel cannot be locked'}, to=request.sid)
        return

    if password:
        security_repo.set_channel_password(channel, password)
        emit('channel_locked_status', {'channel': channel, 'locked': True}, broadcast=True)
    else:
        security_repo.remove_channel_password(channel)
        emit('channel_locked_status', {'channel': channel, 'locked': False}, broadcast=True)

@socketio.on('generate_invite')
def handle_generate_invite(data):
    if not require_socket_admin():
        emit('security_error', {'message': 'Administrator access required'}, to=request.sid)
        return
    channel = data.get('channel', 'general')
    # Generate random 6 character code
    code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    security_repo.create_invite_code(channel, code)
    emit('invite_generated', {'channel': channel, 'code': code}, to=request.sid)

@socketio.on('get_device_list')
def handle_get_device_list():
    if not require_socket_admin():
        emit('security_error', {'message': 'Administrator access required'}, to=request.sid)
        return
    devices = security_repo.get_all_devices()
    emit('device_list_updated', {'devices': devices}, to=request.sid)

@socketio.on('update_device_trust')
def handle_update_device_trust(data):
    if not require_socket_admin():
        emit('security_error', {'message': 'Administrator access required'}, to=request.sid)
        return
    ip = data.get('ip', '')
    user_agent = data.get('userAgent', '')
    trusted = bool(data.get('trusted', False))

    security_repo.set_device_trust(ip, user_agent, trusted)
    
    # Broadcast updated list to all clients
    devices = security_repo.get_all_devices()
    emit('device_list_updated', {'devices': devices}, broadcast=True)
