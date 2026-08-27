import uuid
from flask import request
from flask_socketio import emit
from app.extensions import socketio
from app.services.auth import get_session_username, get_socket_session, require_socket_channel, require_socket_trusted
from app.repositories.calendar_repo import CalendarRepository

calendar_repo = CalendarRepository()

@socketio.on('create_event')
def handle_create_event(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    start_time = data.get('startTime', '').strip()  # ISO format string
    end_time = data.get('endTime', '').strip()      # ISO format string
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    session = get_socket_session()
    creator = get_session_username(session or {}, f'User-{request.sid[:4]}')

    if not title or not start_time:
        return

    event_id = f'evt_{uuid.uuid4().hex}'
    calendar_repo.add_event(event_id, title, description, start_time, end_time, creator, channel)
    
    # Broadcast event creation to the channel room
    event_data = {
        'id': event_id,
        'title': title,
        'description': description,
        'startTime': start_time,
        'endTime': end_time,
        'creator': creator,
        'channel': channel
    }
    emit('event_created', event_data, to=f'channel_{channel}')

@socketio.on('delete_event')
def handle_delete_event(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    event_id = data.get('id', '')
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    
    if not event_id:
        return

    calendar_repo.delete_event(event_id)
    emit('event_deleted', {'id': event_id}, to=f'channel_{channel}')

@socketio.on('get_events')
def handle_get_events(data):
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    events = calendar_repo.get_channel_events(channel)
    emit('calendar_events_list', {'events': events}, to=request.sid)
