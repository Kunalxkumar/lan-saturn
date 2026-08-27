from flask import request
from flask_socketio import emit
from app.extensions import socketio
from app.services.auth import require_socket_channel, require_socket_trusted
from app.repositories import note_repo

@socketio.on('get_notes')
def handle_get_notes(data):
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    notes = note_repo.list_notes(channel)
    emit('notes_list', {'channel': channel, 'notes': notes}, to=request.sid)

@socketio.on('get_note_content')
def handle_get_note_content(data):
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    note_name = data.get('noteName', '').strip()
    if not note_name:
        return
    content = note_repo.get_note_content(channel, note_name)
    emit('note_content', {'channel': channel, 'noteName': note_name, 'content': content}, to=request.sid)

@socketio.on('save_note')
def handle_save_note(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    note_name = data.get('noteName', '').strip()
    content = data.get('content', '')
    username = data.get('username', 'Anonymous')
    if not note_name:
        return

    success = note_repo.save_note(channel, note_name, content)
    if success:
        room_name = f'channel_{channel}'
        emit('note_updated', {
            'channel': channel,
            'noteName': note_name,
            'content': content,
            'username': username
        }, to=room_name, include_self=False)

@socketio.on('create_note')
def handle_create_note(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    note_name = data.get('noteName', '').strip()
    if not note_name:
        return

    existing = note_repo.get_note_content(channel, note_name)
    if not existing:
        initial_content = f"# {note_name}\n\nStart typing notes here..."
        note_repo.save_note(channel, note_name, initial_content)

    notes = note_repo.list_notes(channel)
    room_name = f'channel_{channel}'
    emit('notes_list', {'channel': channel, 'notes': notes}, to=room_name)

@socketio.on('delete_note')
def handle_delete_note(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    note_name = data.get('noteName', '').strip()
    if not note_name:
        return

    note_repo.delete_note(channel, note_name)
    notes = note_repo.list_notes(channel)
    room_name = f'channel_{channel}'
    emit('notes_list', {'channel': channel, 'notes': notes}, to=room_name)
    emit('note_deleted', {'channel': channel, 'noteName': note_name}, to=room_name)
