import json
import logging
import socket
import threading
import time
import uuid
from typing import Dict, List, Optional, Any

PROTOCOL_NAME = "lan-saturn"
PROTOCOL_VERSION = 1
MAX_PACKET_SIZE = 2048
PEER_TTL_SECONDS = 15.0

server_name = "LAN Saturn Server"
broadcast_port = 5001
web_port = 5000
is_running = False

_device_id = str(uuid.uuid4())
discovered_peers: Dict[str, Dict[str, Any]] = {}

def get_device_id() -> str:
    """Return the persistent unique identifier for this node."""
    return _device_id

def set_device_id(custom_id: str) -> None:
    """Set the node device identifier (used for testing and configuration)."""
    global _device_id
    if custom_id and isinstance(custom_id, str):
        _device_id = custom_id

def parse_discovery_packet(raw_bytes: bytes, sender_ip: str) -> Optional[Dict[str, Any]]:
    """
    Safely parse and validate a versioned discovery packet.
    Returns a normalized peer dictionary if valid, or None if packet is invalid/malformed.
    """
    if not raw_bytes or len(raw_bytes) > MAX_PACKET_SIZE:
        return None

    try:
        data = json.loads(raw_bytes.decode("utf-8"))
    except Exception:
        return None

    if not isinstance(data, dict):
        return None

    # Validate protocol specification and versioning
    if data.get("protocol") != PROTOCOL_NAME or data.get("version") != PROTOCOL_VERSION:
        # Compatibility fallback for legacy announcements
        if data.get("service") != "lan_saturn":
            return None

    device_id = data.get("device_id")
    if not device_id or not isinstance(device_id, str) or len(device_id) > 100:
        # Fallback device ID for legacy format
        device_id = f"legacy_{sender_ip}_{data.get('port', 5000)}"

    device_name = data.get("device_name") or data.get("name") or "Unknown Saturn Peer"
    if not isinstance(device_name, str):
        return None
    device_name = device_name.strip()[:50]

    service_port = data.get("service_port") or data.get("port")
    try:
        service_port = int(service_port)
        if not (1 <= service_port <= 65535):
            return None
    except (TypeError, ValueError):
        return None

    capabilities = data.get("capabilities", ["chat", "file-transfer"])
    if not isinstance(capabilities, list):
        capabilities = ["chat", "file-transfer"]

    return {
        "device_id": device_id,
        "name": device_name,
        "ip": sender_ip,
        "port": service_port,
        "capabilities": capabilities,
        "protocol": PROTOCOL_NAME,
        "version": PROTOCOL_VERSION
    }

def process_peer_announcement(peer_info: Dict[str, Any], current_time: float) -> None:
    """Update active peer lifecycle state, handling IP changes and deduplication."""
    device_id = peer_info["device_id"]
    if device_id in discovered_peers:
        existing = discovered_peers[device_id]
        existing["ip"] = peer_info["ip"]
        existing["port"] = peer_info["port"]
        existing["name"] = peer_info["name"]
        existing["capabilities"] = peer_info["capabilities"]
        existing["last_seen"] = current_time
    else:
        discovered_peers[device_id] = {
            "device_id": device_id,
            "name": peer_info["name"],
            "ip": peer_info["ip"],
            "port": peer_info["port"],
            "capabilities": peer_info["capabilities"],
            "first_seen": current_time,
            "last_seen": current_time,
        }

def cleanup_stale_peers(current_time: float) -> None:
    """Purge peers that have not broadcasted within the TTL threshold."""
    stale_keys = [
        dev_id for dev_id, peer in discovered_peers.items()
        if (current_time - peer["last_seen"]) > PEER_TTL_SECONDS
    ]
    for key in stale_keys:
        del discovered_peers[key]

def start():
    global is_running
    if is_running:
        return
    is_running = True
    threading.Thread(target=_broadcast_loop, daemon=True).start()
    threading.Thread(target=_listen_loop, daemon=True).start()

def stop():
    global is_running
    is_running = False

def get_servers() -> List[Dict[str, Any]]:
    cleanup_stale_peers(time.time())
    return [
        {
            "device_id": peer["device_id"],
            "name": peer["name"],
            "ip": peer["ip"],
            "port": peer["port"],
            "capabilities": peer.get("capabilities", ["chat", "file-transfer"]),
            "first_seen": peer.get("first_seen", peer["last_seen"]),
            "last_seen": peer["last_seen"],
        }
        for peer in discovered_peers.values()
    ]

def _get_local_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("10.255.255.255", 1))
        return sock.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        sock.close()

def _broadcast_loop():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

    while is_running:
        try:
            payload = json.dumps(
                {
                    "protocol": PROTOCOL_NAME,
                    "version": PROTOCOL_VERSION,
                    "device_id": get_device_id(),
                    "device_name": server_name,
                    "service_port": web_port,
                    "capabilities": ["chat", "file-transfer"],
                    # Maintain legacy fields for backward compatibility
                    "service": "lan_saturn",
                    "name": server_name,
                    "ip": _get_local_ip(),
                    "port": web_port,
                }
            ).encode("utf-8")
            sock.sendto(payload, ("<broadcast>", broadcast_port))
        except Exception as exc:
            logging.error("Discovery broadcast error: %s", exc)
        time.sleep(3)

def _listen_loop():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        sock.bind(("", broadcast_port))
    except Exception as exc:
        logging.error("Discovery listen error: %s", exc)
        return

    sock.settimeout(1.0)
    while is_running:
        try:
            data, addr = sock.recvfrom(MAX_PACKET_SIZE + 512)
            peer_info = parse_discovery_packet(data, addr[0])
            if peer_info:
                process_peer_announcement(peer_info, time.time())
        except socket.timeout:
            pass
        except Exception as exc:
            logging.debug("Discovery packet receive error: %s", exc)

        cleanup_stale_peers(time.time())
