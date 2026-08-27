import os
from flask import Blueprint, render_template, send_from_directory, current_app
from app.utils.network import get_lan_urls
from app.constants import PORT
from app.services.auth import issue_request_session, set_session_cookie

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    bundle_path = os.path.join(current_app.static_folder, 'js', 'bundle.js')
    asset_version = int(os.path.getmtime(bundle_path)) if os.path.exists(bundle_path) else 1
    session, _created = issue_request_session()
    response = current_app.make_response(render_template('index.html', asset_version=asset_version))
    return set_session_cookie(response, session)

@main_bp.route('/static/<path:filename>')
def static_files(filename):
    response = send_from_directory(current_app.static_folder, filename)
    response.cache_control.no_cache = True
    response.cache_control.max_age = 0
    return response

@main_bp.route('/health')
def health():
    return {'success': True, 'message': 'LAN Saturn is running'}

from app.services.bluetooth_service import get_bluetooth_info

@main_bp.route('/lan-info')
def lan_info():
    return {
        'success': True,
        'urls': get_lan_urls(),
        'bluetooth': get_bluetooth_info(),
        'port': PORT
    }

@main_bp.route('/api/discover')
def api_discover():
    from app.services import discovery
    return {
        'success': True,
        'servers': discovery.get_servers()
    }
