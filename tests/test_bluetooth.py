import time
import pytest
from app.services import bluetooth_service

def setup_function():
    bluetooth_service._discovered_ble_peers.clear()

def test_create_and_parse_ble_beacon_payload():
    raw_payload = bluetooth_service.create_ble_beacon_payload(
        device_id="node-ble-99",
        device_name="Saturn BLE Node",
        ip="192.168.137.1",
        port=5000
    )
    assert raw_payload is not None
    assert len(raw_payload) < 512

    parsed = bluetooth_service.parse_ble_beacon_payload(raw_payload)
    assert parsed is not None
    assert parsed["device_id"] == "node-ble-99"
    assert parsed["name"] == "Saturn BLE Node"
    assert parsed["ip"] == "192.168.137.1"
    assert parsed["port"] == 5000
    assert parsed["source"] == "ble"

def test_parse_invalid_ble_magic():
    raw_payload = b'{"magic": "WRONG_MAGIC", "id": "123", "ip": "1.1.1.1", "port": 5000}'
    result = bluetooth_service.parse_ble_beacon_payload(raw_payload)
    assert result is None

def test_parse_malformed_ble_bytes():
    assert bluetooth_service.parse_ble_beacon_payload(b"not_json") is None
    assert bluetooth_service.parse_ble_beacon_payload(b"") is None
    assert bluetooth_service.parse_ble_beacon_payload(b"X" * 600) is None

def test_process_and_expire_ble_peers():
    peer = {
        "device_id": "ble-peer-1",
        "name": "BLE Peer 1",
        "ip": "192.168.1.88",
        "port": 5000,
        "last_seen": time.time(),
        "source": "ble"
    }
    bluetooth_service.process_ble_peer(peer)
    peers = bluetooth_service.get_bluetooth_peers()
    assert len(peers) == 1
    assert peers[0]["device_id"] == "ble-peer-1"

    # Simulate stale peer (> 30s)
    peer_stale = {
        "device_id": "ble-peer-stale",
        "name": "Old Peer",
        "ip": "192.168.1.89",
        "port": 5000,
        "last_seen": time.time() - 35.0,
        "source": "ble"
    }
    bluetooth_service.process_ble_peer(peer_stale)
    active_peers = bluetooth_service.get_bluetooth_peers()
    assert len(active_peers) == 1
    assert active_peers[0]["device_id"] == "ble-peer-1"

def test_bluetooth_info_structure():
    info = bluetooth_service.get_bluetooth_info()
    assert "supported" in info
    assert "enabled" in info
    assert "mode" in info
    assert info["hotspot_coexistence"] is True
