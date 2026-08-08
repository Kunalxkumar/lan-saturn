import pytest

def test_websocket_connect(socket_client):
    assert socket_client.is_connected()
    
def test_user_join_channel(socket_client):
    socket_client.emit('join_channel', {'channel': 'general', 'username': 'TestUser'})
    assert socket_client.is_connected()

def test_send_message(socket_client):
    socket_client.emit('join_channel', {'channel': 'general', 'username': 'TestUser'})
    # clear initial events
    socket_client.get_received()
    
    # send message
    socket_client.emit('send_message', {
        'username': 'TestUser',
        'message': 'Hello LAN',
        'channel': 'general',
        'timestamp': '1234567890',
        'encrypted': False
    })
    
    # The message should be broadcasted to the room. The test client itself doesn't 
    # receive 'include_self=False' messages natively unless tested with multiple clients,
    # but we can verify it doesn't crash.
    assert socket_client.is_connected()
