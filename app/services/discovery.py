import json
import logging
import socket
import threading
import time

server_name = "LAN Saturn Server"
broadcast_port = 5001
web_port = 5000
is_running = False
discovered_servers = {}


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


def get_servers():
    return list(discovered_servers.values())


def _get_local_ip():
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
                    "service": "lan_saturn",
                    "name": server_name,
                    "ip": _get_local_ip(),
                    "port": web_port,
                }
            ).encode("utf-8")
            sock.sendto(payload, ("<broadcast>", broadcast_port))
        except Exception as exc:
            logging.error("Broadcast error: %s", exc)
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
            data, _addr = sock.recvfrom(1024)
            message = json.loads(data.decode("utf-8"))
            if message.get("service") == "lan_saturn":
                server_id = f"{message.get('ip')}:{message.get('port')}"
                discovered_servers[server_id] = {
                    "name": message.get("name"),
                    "ip": message.get("ip"),
                    "port": message.get("port"),
                    "last_seen": time.time(),
                }
        except socket.timeout:
            pass
        except Exception:
            pass

        current_time = time.time()
        stale = [key for key, value in discovered_servers.items() if current_time - value["last_seen"] > 10]
        for key in stale:
            del discovered_servers[key]
