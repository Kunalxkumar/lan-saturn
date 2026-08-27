import time
import pytest
from app import create_app
from app.config import Config
from app.services import discovery, bluetooth_service
from app.services.auth import create_session, SESSION_COOKIE_NAME

@pytest.fixture
def client():
    class TestConfig(Config):
        TESTING = True
        DATABASE_PATH = ":memory:"
        SECRET_KEY = "test-secret-key-123"

    app = create_app(TestConfig)
    with app.test_client() as test_client:
        yield test_client

def test_get_peers_api(client):
    now = time.time()
    peer = {
        "device_id": "test-peer-uuid-1",
        "name": "Peer Alpha",
        "ip": "192.168.1.120",
        "port": 5000,
        "capabilities": ["chat", "file-transfer"]
    }
    discovery.process_peer_announcement(peer, now)

    res = client.get('/api/peers')
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["peers"]) >= 1

def test_connect_peer_request(client):
    payload = {
        "device_id": "test-peer-uuid-1",
        "ip": "192.168.1.120",
        "port": 5000
    }
    res = client.post('/api/peers/connect', json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["status"] == "pending"
    assert "request_id" in data

def test_connect_peer_missing_ip(client):
    res = client.post('/api/peers/connect', json={})
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False

def test_approve_peer_trust(client):
    session = create_session("127.0.0.1", "test-agent")
    client.set_cookie(SESSION_COOKIE_NAME, session["id"])
    payload = {
        "ip": "192.168.1.120",
        "trusted": True
    }
    res = client.post('/api/peers/approve', json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["trusted"] is True
