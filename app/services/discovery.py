import socket
import threading
import time
import json
import logging

class LANDiscoveryService:
    def __init__(self, server_name="LAN Saturn Server", broadcast_port=5001, web_port=5000):
        self.server_name = server_name
        self.broadcast_port = broadcast_port
        self.web_port = web_port
        self.is_running = False
        self.discovered_servers = {}
        
    def start(self):
        self.is_running = True
        self.broadcast_thread = threading.Thread(target=self._broadcast_loop, daemon=True)
        self.listen_thread = threading.Thread(target=self._listen_loop, daemon=True)
        
        self.broadcast_thread.start()
        self.listen_thread.start()
        
    def stop(self):
        self.is_running = False

    def _get_local_ip(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        try:
            # doesn't even have to be reachable
            s.connect(('10.255.255.255', 1))
            IP = s.getsockname()[0]
        except Exception:
            IP = '127.0.0.1'
        finally:
            s.close()
        return IP

    def _broadcast_loop(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        
        while self.is_running:
            try:
                ip = self._get_local_ip()
                payload = json.dumps({
                    "service": "lan_saturn",
                    "name": self.server_name,
                    "ip": ip,
                    "port": self.web_port
                }).encode('utf-8')
                
                sock.sendto(payload, ('<broadcast>', self.broadcast_port))
            except Exception as e:
                logging.error(f"Broadcast error: {e}")
                
            time.sleep(3) # Broadcast every 3 seconds
            
    def _listen_loop(self):
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        
        try:
            sock.bind(('', self.broadcast_port))
        except Exception as e:
            logging.error(f"Discovery listen error: {e}")
            return
            
        sock.settimeout(1.0)
        
        while self.is_running:
            try:
                data, addr = sock.recvfrom(1024)
                message = json.loads(data.decode('utf-8'))
                
                if message.get("service") == "lan_saturn":
                    server_id = f"{message.get('ip')}:{message.get('port')}"
                    self.discovered_servers[server_id] = {
                        "name": message.get("name"),
                        "ip": message.get("ip"),
                        "port": message.get("port"),
                        "last_seen": time.time()
                    }
            except socket.timeout:
                continue
            except Exception as e:
                pass
                
            # Cleanup stale servers (not seen in 10 seconds)
            current_time = time.time()
            stale = [k for k, v in self.discovered_servers.items() if current_time - v["last_seen"] > 10]
            for k in stale:
                del self.discovered_servers[k]

    def get_servers(self):
        return list(self.discovered_servers.values())

discovery_service = LANDiscoveryService()
