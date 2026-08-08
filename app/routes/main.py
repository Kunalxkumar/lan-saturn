import os
from flask import Blueprint, render_template, send_from_directory, current_app
from app.utils.network import get_lan_urls
from app.constants import PORT

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def index():
    bundle_path = os.path.join(current_app.static_folder, 'js', 'bundle.js')
    asset_version = int(os.path.getmtime(bundle_path)) if os.path.exists(bundle_path) else 1
    return render_template('index.html', asset_version=asset_version)

@main_bp.route('/static/<path:filename>')
def static_files(filename):
    response = send_from_directory(current_app.static_folder, filename)
    response.cache_control.no_cache = True
    response.cache_control.max_age = 0
    return response

@main_bp.route('/health')
def health():
    return {'success': True, 'message': 'LAN Saturn is running'}

@main_bp.route('/lan-info')
def lan_info():
    return {
        'success': True,
        'urls': get_lan_urls(),
        'port': PORT
    }

@main_bp.route('/api/discover')
def api_discover():
    from app.services.discovery import discovery_service
    return {
        'success': True,
        'servers': discovery_service.get_servers()
    }
