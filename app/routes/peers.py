import time
from flask import Blueprint, request, jsonify, current_app
from app.services import discovery, bluetooth_service
from app.services.auth import require_request_trusted, get_request_session, require_request_admin
from app.repositories.security_repo import SecurityRepository

peers_bp = Blueprint('peers', __name__)
security_repo = SecurityRepository()

_pending_peer_requests = {}

@peers_bp.route('/api/peers', methods=['GET'])
def get_peers():
    """List all active discovered peers (UDP + BLE) with trust status."""
    udp_peers = discovery.get_servers()
    ble_peers = bluetooth_service.get_bluetooth_peers()

    # Deduplicate peers by device_id or IP
    peers_by_id = {}
    for p in udp_peers:
        dev_id = p.get('device_id', f"{p['ip']}:{p['port']}")
        is_trusted = security_repo.is_device_trusted(p['ip'], "")
        peers_by_id[dev_id] = {
            'device_id': dev_id,
            'name': p['name'],
            'ip': p['ip'],
            'port': p['port'],
            'source': 'udp',
            'trusted': is_trusted,
            'capabilities': p.get('capabilities', ['chat', 'file-transfer'])
        }

    for bp in ble_peers:
        dev_id = bp['device_id']
        if dev_id not in peers_by_id:
            is_trusted = security_repo.is_device_trusted(bp['ip'], "")
            peers_by_id[dev_id] = {
                'device_id': dev_id,
                'name': bp['name'],
                'ip': bp['ip'],
                'port': bp['port'],
                'source': 'ble',
                'trusted': is_trusted,
                'capabilities': ['chat', 'file-transfer']
            }

    return jsonify({
        'success': True,
        'peers': list(peers_by_id.values())
    })

@peers_bp.route('/api/peers/connect', methods=['POST'])
def connect_peer():
    """Initiate a peer pairing request."""
    data = request.json or {}
    device_id = data.get('device_id')
    ip = data.get('ip')
    user_agent = request.headers.get('User-Agent', '')

    if not ip:
        return jsonify({'success': False, 'error': 'Missing peer IP address'}), 400

    # Record device entry in repository
    security_repo.record_device(ip, user_agent)
    req_id = f"req_{int(time.time() * 1000)}"
    _pending_peer_requests[req_id] = {
        'req_id': req_id,
        'device_id': device_id,
        'ip': ip,
        'user_agent': user_agent,
        'timestamp': time.time()
    }

    return jsonify({
        'success': True,
        'request_id': req_id,
        'status': 'pending',
        'message': f'Pairing request initiated for {ip}'
    })

@peers_bp.route('/api/peers/approve', methods=['POST'])
def approve_peer():
    """Approve a peer pairing request and mark device trusted."""
    if not require_request_admin():
        return jsonify({'success': False, 'error': 'Administrator access required'}), 403

    data = request.json or {}
    ip = data.get('ip')
    user_agent = data.get('user_agent', '')
    trusted = data.get('trusted', True)

    if not ip:
        return jsonify({'success': False, 'error': 'Missing IP parameter'}), 400

    security_repo.set_device_trust(ip, user_agent, bool(trusted))
    return jsonify({
        'success': True,
        'ip': ip,
        'trusted': bool(trusted),
        'message': 'Device trust state updated successfully'
    })
