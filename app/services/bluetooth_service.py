import socket
import logging
import platform

def get_bluetooth_info() -> dict:
    """
    Detect local Bluetooth adapter availability and return Bluetooth pairing/sharing metadata.
    Coexists with Wi-Fi Hotspot for dual network/Bluetooth connection sharing.
    """
    bt_available = hasattr(socket, 'AF_BLUETOOTH')
    hostname = socket.gethostname()
    
    info = {
        "supported": bt_available,
        "enabled": False,
        "device_name": hostname,
        "protocol": "RFCOMM/SPP + Bluetooth PAN",
        "hotspot_coexistence": True,
        "link_uri": f"btspp://{hostname}:5000"
    }

    if bt_available and platform.system() == "Windows":
        try:
            # Check if Bluetooth socket can be instantiated on Windows
            s = socket.socket(socket.AF_BLUETOOTH, socket.SOCK_STREAM, socket.BTPROTO_RFCOMM)
            s.close()
            info["enabled"] = True
        except Exception as exc:
            logging.debug("Bluetooth socket check: %s", exc)
            info["enabled"] = False

    return info
