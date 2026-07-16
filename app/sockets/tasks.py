import time
from flask import request
from flask_socketio import emit
from pydantic import ValidationError

from app.extensions import socketio
from app.repositories.task_repo import TaskRepository
from app.models.models import Task
from app.schemas.validation import CreateTaskSchema, ToggleTaskSchema, DeleteTaskSchema

task_repo = TaskRepository()

@socketio.on('create_task')
def handle_create_task(data):
    try:
        schema = CreateTaskSchema(**data)
    except ValidationError:
        return

    task_id = f'task_{int(time.time() * 1000)}'
    task = Task(
        id=task_id,
        channel=schema.channel,
        text=schema.text,
        done=False,
        creator=schema.username
    )

    task_repo.add_task(task)
    emit('task_created', {'channel': schema.channel, 'task': task.to_dict()}, to=f'channel_{schema.channel}')

@socketio.on('toggle_task')
def handle_toggle_task(data):
    try:
        schema = ToggleTaskSchema(**data)
    except ValidationError:
        return

    task = task_repo.toggle_task(schema.taskId)
    if task:
        emit('task_updated', {'channel': schema.channel, 'task': task.to_dict()}, to=f'channel_{schema.channel}')

@socketio.on('delete_task')
def handle_delete_task(data):
    try:
        schema = DeleteTaskSchema(**data)
    except ValidationError:
        return

    task_repo.delete_task(schema.taskId)
    emit('task_deleted', {'channel': schema.channel, 'taskId': schema.taskId}, to=f'channel_{schema.channel}')

@socketio.on('get_tasks')
def handle_get_tasks(data):
    channel = data.get('channel', 'general')
    tasks_list = task_repo.get_channel_tasks(channel)
    emit('tasks_list', {'channel': channel, 'tasks': [t.to_dict() for t in tasks_list]}, to=request.sid)
