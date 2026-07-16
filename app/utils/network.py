import socket
from app.constants import PORT

def get_lan_urls() -> list:
    urls = []
    try:
        hostname = socket.gethostname()
        candidates = socket.getaddrinfo(hostname, None, socket.AF_INET)
        for candidate in candidates:
            ip_address = candidate[4][0]
            if ip_address.startswith('127.'):
                continue
            url = f'http://{ip_address}:{PORT}'
            if url not in urls:
                urls.append(url)
    except socket.gaierror:
        pass

    hotspot_url = f'http://192.168.137.1:{PORT}'
    if hotspot_url not in urls:
        urls.append(hotspot_url)

    return urls
