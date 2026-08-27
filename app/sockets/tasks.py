import time
from flask import request
from flask_socketio import emit
from pydantic import ValidationError

from app.extensions import socketio
from app.services.auth import get_session_username, get_socket_session, require_socket_channel, require_socket_trusted
from app.repositories.task_repo import add_task, get_channel_tasks, toggle_task, delete_task
from app.models.models import Task
from app.schemas.validation import CreateTaskSchema, ToggleTaskSchema, DeleteTaskSchema

@socketio.on('create_task')
def handle_create_task(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    try:
        schema = CreateTaskSchema(**data)
    except ValidationError:
        return
    if not require_socket_channel(schema.channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    session = get_socket_session()

    task_id = f'task_{int(time.time() * 1000)}'
    task = Task(
        id=task_id,
        channel=schema.channel,
        text=schema.text,
        done=False,
        creator=get_session_username(session or {}, f'User-{request.sid[:4]}')
    )

    add_task(task)
    emit('task_created', {'channel': schema.channel, 'task': task.to_dict()}, to=f'channel_{schema.channel}')

@socketio.on('toggle_task')
def handle_toggle_task(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    try:
        schema = ToggleTaskSchema(**data)
    except ValidationError:
        return
    if not require_socket_channel(schema.channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return

    task = toggle_task(schema.taskId)
    if task:
        emit('task_updated', {'channel': schema.channel, 'task': task.to_dict()}, to=f'channel_{schema.channel}')

@socketio.on('delete_task')
def handle_delete_task(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    try:
        schema = DeleteTaskSchema(**data)
    except ValidationError:
        return
    if not require_socket_channel(schema.channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return

    delete_task(schema.taskId)
    emit('task_deleted', {'channel': schema.channel, 'taskId': schema.taskId}, to=f'channel_{schema.channel}')

@socketio.on('get_tasks')
def handle_get_tasks(data):
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    tasks_list = get_channel_tasks(channel)
    emit('tasks_list', {'channel': channel, 'tasks': [t.to_dict() for t in tasks_list]}, to=request.sid)

