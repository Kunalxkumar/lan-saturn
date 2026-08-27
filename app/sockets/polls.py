import time
from flask import request
from flask_socketio import emit
from pydantic import ValidationError

from app.extensions import socketio
from app.services.auth import get_session_username, get_socket_session, require_socket_channel, require_socket_trusted
from app.repositories import poll_repo
from app.models.models import Poll
from app.schemas.validation import CreatePollSchema, VotePollSchema

@socketio.on('create_poll')
def handle_create_poll(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    try:
        schema = CreatePollSchema(**data)
    except ValidationError:
        return
    if not require_socket_channel(schema.channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    session = get_socket_session()

    poll_id = f'poll_{int(time.time() * 1000)}'
    poll = Poll(
        id=poll_id,
        question=schema.question,
        options=schema.options,
        creator=get_session_username(session or {}, f'User-{request.sid[:4]}'),
        closed=False,
        channel=schema.channel,
        timestamp=schema.timestamp or str(int(time.time() * 1000)),
        votes={i: [] for i in range(len(schema.options))}
    )

    poll_repo.add_poll(poll)
    emit('poll_created', poll.to_dict(), to=f'channel_{schema.channel}')

@socketio.on('vote_poll')
def handle_vote_poll(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    try:
        schema = VotePollSchema(**data)
    except ValidationError:
        return

    poll = poll_repo.get_poll(schema.pollId)
    if not poll or poll.closed:
        return
    if not require_socket_channel(poll.channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return

    if schema.optionIndex < 0 or schema.optionIndex >= len(poll.options):
        return

    session = get_socket_session()
    poll_repo.vote(schema.pollId, schema.optionIndex, get_session_username(session or {}, f'User-{request.sid[:4]}'))

    # Reload database record to retrieve complete options votes array
    updated_poll = poll_repo.get_poll(schema.pollId)
    if updated_poll:
        emit('poll_updated', updated_poll.to_dict(), to=f'channel_{updated_poll.channel}')

@socketio.on('close_poll')
def handle_close_poll(data):
    if not require_socket_trusted():
        emit('security_error', {'message': 'Authentication required'}, to=request.sid)
        return
    poll_id = data.get('pollId', '')

    poll = poll_repo.get_poll(poll_id)
    if not poll or poll.closed:
        return
    if not require_socket_channel(poll.channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return

    session = get_socket_session()
    username = get_session_username(session or {}, f'User-{request.sid[:4]}')
    if poll.creator != username:
        return

    poll_repo.close_poll(poll_id)
    poll.closed = True
    emit('poll_updated', poll.to_dict(), to=f'channel_{poll.channel}')

@socketio.on('get_polls')
def handle_get_polls(data):
    channel = data.get('channel', 'general')
    if not require_socket_channel(channel):
        emit('security_error', {'message': 'Channel access denied'}, to=request.sid)
        return
    polls_list = poll_repo.get_channel_polls(channel)
    emit('polls_list', {'polls': [p.to_dict() for p in polls_list]}, to=request.sid)
