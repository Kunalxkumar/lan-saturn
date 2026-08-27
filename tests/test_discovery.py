import json
import time
import pytest
from app.services import discovery

def setup_function():
    discovery.discovered_peers.clear()

def test_valid_discovery_packet():
    packet = {
        "protocol": "lan-saturn",
        "version": 1,
        "device_id": "node-uuid-12345",
        "device_name": "Test Desktop Node",
        "service_port": 5000,
        "capabilities": ["chat", "file-transfer"]
    }
    raw_bytes = json.dumps(packet).encode("utf-8")
    result = discovery.parse_discovery_packet(raw_bytes, "192.168.1.100")
    
    assert result is not None
    assert result["device_id"] == "node-uuid-12345"
    assert result["name"] == "Test Desktop Node"
    assert result["ip"] == "192.168.1.100"
    assert result["port"] == 5000
    assert result["capabilities"] == ["chat", "file-transfer"]

def test_malformed_json():
    raw_bytes = b"{invalid_json_bytes_here"
    result = discovery.parse_discovery_packet(raw_bytes, "192.168.1.100")
    assert result is None

def test_missing_fields():
    packet = {
        "protocol": "lan-saturn",
        "version": 1,
        "device_id": "node-uuid-12345"
        # missing device_name and service_port
    }
    raw_bytes = json.dumps(packet).encode("utf-8")
    result = discovery.parse_discovery_packet(raw_bytes, "192.168.1.100")
    assert result is None

def test_wrong_protocol():
    packet = {
        "protocol": "unknown-protocol",
        "version": 1,
        "device_id": "node-uuid-12345",
        "device_name": "Rogue Node",
        "service_port": 5000
    }
    raw_bytes = json.dumps(packet).encode("utf-8")
    result = discovery.parse_discovery_packet(raw_bytes, "192.168.1.100")
    assert result is None

def test_unsupported_version():
    packet = {
        "protocol": "lan-saturn",
        "version": 999,
        "device_id": "node-uuid-12345",
        "device_name": "Future Node",
        "service_port": 5000
    }
    raw_bytes = json.dumps(packet).encode("utf-8")
    result = discovery.parse_discovery_packet(raw_bytes, "192.168.1.100")
    assert result is None

def test_duplicate_device_ip_change():
    t0 = 1000.0
    peer1 = {
        "device_id": "unique-device-42",
        "name": "Laptop-Node",
        "ip": "192.168.1.10",
        "port": 5000,
        "capabilities": ["chat"]
    }
    discovery.process_peer_announcement(peer1, t0)
    assert len(discovery.discovered_peers) == 1
    assert discovery.discovered_peers["unique-device-42"]["ip"] == "192.168.1.10"
    assert discovery.discovered_peers["unique-device-42"]["first_seen"] == t0

    # Peer changes IP address on Wi-Fi reconnect
    t1 = 1005.0
    peer2 = {
        "device_id": "unique-device-42",
        "name": "Laptop-Node",
        "ip": "192.168.1.55",
        "port": 5000,
        "capabilities": ["chat", "file-transfer"]
    }
    discovery.process_peer_announcement(peer2, t1)
    assert len(discovery.discovered_peers) == 1
    assert discovery.discovered_peers["unique-device-42"]["ip"] == "192.168.1.55"
    assert discovery.discovered_peers["unique-device-42"]["first_seen"] == t0
    assert discovery.discovered_peers["unique-device-42"]["last_seen"] == t1

def test_stale_peer_expiration():
    t0 = 1000.0
    peer = {
        "device_id": "temp-device",
        "name": "Transient Peer",
        "ip": "192.168.1.20",
        "port": 5000,
        "capabilities": []
    }
    discovery.process_peer_announcement(peer, t0)
    assert len(discovery.discovered_peers) == 1

    # Cleanup at t0 + 10s (within TTL)
    discovery.cleanup_stale_peers(t0 + 10.0)
    assert len(discovery.discovered_peers) == 1

    # Cleanup at t0 + 16s (past 15s TTL threshold)
    discovery.cleanup_stale_peers(t0 + 16.0)
    assert len(discovery.discovered_peers) == 0

def test_spoofed_device_name():
    long_name = "A" * 200
    packet = {
        "protocol": "lan-saturn",
        "version": 1,
        "device_id": "node-uuid-spoof",
        "device_name": long_name,
        "service_port": 5000
    }
    raw_bytes = json.dumps(packet).encode("utf-8")
    result = discovery.parse_discovery_packet(raw_bytes, "192.168.1.100")
    assert result is not None
    assert len(result["name"]) == 50

def test_invalid_port():
    for invalid_port in [-1, 0, 65536, 70000, "invalid_string_port"]:
        packet = {
            "protocol": "lan-saturn",
            "version": 1,
            "device_id": "node-uuid-port-test",
            "device_name": "Port Node",
            "service_port": invalid_port
        }
        raw_bytes = json.dumps(packet).encode("utf-8")
        result = discovery.parse_discovery_packet(raw_bytes, "192.168.1.100")
        assert result is None

def test_unexpected_data_types():
    for bad_payload in [b"12345", b'"just_a_string"', b"true", b"[1, 2, 3]"]:
        result = discovery.parse_discovery_packet(bad_payload, "192.168.1.100")
        assert result is None

def test_oversized_discovery_packet():
    large_payload = {
        "protocol": "lan-saturn",
        "version": 1,
        "device_id": "node-uuid-large",
        "device_name": "Large Node",
        "service_port": 5000,
        "junk": "X" * 3000
    }
    raw_bytes = json.dumps(large_payload).encode("utf-8")
    assert len(raw_bytes) > 2048
    result = discovery.parse_discovery_packet(raw_bytes, "192.168.1.100")
    assert result is None
