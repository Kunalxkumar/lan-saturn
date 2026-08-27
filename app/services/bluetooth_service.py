import json
import logging
import socket
import platform
import asyncio
import threading
import time
from typing import Dict, List, Optional, Any

BLE_BEACON_MAGIC = "SATURN_BLE_v1"
MAX_BLE_PAYLOAD_LEN = 512

_discovered_ble_peers: Dict[str, Dict[str, Any]] = {}
_ble_running = False

def create_ble_beacon_payload(device_id: str, device_name: str, ip: str, port: int) -> bytes:
    """Serialize node metadata into a compact BLE advertisement payload."""
    payload = {
        "magic": BLE_BEACON_MAGIC,
        "id": device_id,
        "name": device_name[:30],
        "ip": ip,
        "port": port,
        "ts": int(time.time())
    }
    return json.dumps(payload).encode("utf-8")

def parse_ble_beacon_payload(raw_bytes: bytes) -> Optional[Dict[str, Any]]:
    """Parse and validate incoming BLE beacon raw bytes."""
    if not raw_bytes or len(raw_bytes) > MAX_BLE_PAYLOAD_LEN:
        return None
    try:
        data = json.loads(raw_bytes.decode("utf-8"))
        if not isinstance(data, dict):
            return None
        if data.get("magic") != BLE_BEACON_MAGIC:
            return None
        dev_id = data.get("id")
        ip = data.get("ip")
        port = data.get("port")
        if not dev_id or not ip or not port:
            return None
        return {
            "device_id": str(dev_id),
            "name": str(data.get("name", "BLE Saturn Peer"))[:30],
            "ip": str(ip),
            "port": int(port),
            "last_seen": time.time(),
            "source": "ble"
        }
    except Exception:
        return None

def process_ble_peer(peer_info: Dict[str, Any]) -> None:
    """Store or update active BLE discovered peer."""
    dev_id = peer_info["device_id"]
    _discovered_ble_peers[dev_id] = peer_info

def get_bluetooth_peers() -> List[Dict[str, Any]]:
    """Return active BLE peers seen within 30 seconds."""
    now = time.time()
    stale = [k for k, v in _discovered_ble_peers.items() if (now - v["last_seen"]) > 30.0]
    for k in stale:
        del _discovered_ble_peers[k]
    return list(_discovered_ble_peers.values())

def get_bluetooth_info() -> dict:
    """
    Detect local Bluetooth adapter availability and return Bluetooth metadata.
    Includes BLE Beacon advertising and background scanning status.
    """
    bt_available = hasattr(socket, 'AF_BLUETOOTH')
    hostname = socket.gethostname()
    
    info = {
        "supported": bt_available,
        "enabled": False,
        "mode": "BLE Beacon + RFCOMM",
        "device_name": hostname,
        "hotspot_coexistence": True,
        "active_ble_peers": len(get_bluetooth_peers()),
        "link_uri": f"btspp://{hostname}:5000"
    }

    if bt_available and platform.system() == "Windows":
        try:
            s = socket.socket(socket.AF_BLUETOOTH, socket.SOCK_STREAM, socket.BTPROTO_RFCOMM)
            s.close()
            info["enabled"] = True
        except Exception as exc:
            logging.debug("Bluetooth hardware check: %s", exc)
            info["enabled"] = False

    return info
