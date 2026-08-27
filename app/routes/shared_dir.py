from flask import Blueprint, request, jsonify, send_from_directory
from pydantic import ValidationError
import os
import time
from app.services import state_manager
from app.services.auth import require_request_admin, require_request_trusted
from app.schemas.validation import SetSharedDirectorySchema
from app.models.models import TransferItem
from app.repositories.chat_repo import ChatRepository

shared_dir_bp = Blueprint('shared_dir', __name__)
chat_repo = ChatRepository()

def is_safe_subpath(base_dir: str, target_path: str) -> bool:
    try:
        real_base = os.path.realpath(base_dir)
        real_target = os.path.realpath(target_path)
        return os.path.commonpath([real_base, real_target]) == real_base
    except Exception:
        return False

@shared_dir_bp.route('/api/shared-directory/config', methods=['POST'])
def set_shared_directory():
    if not require_request_admin():
        return jsonify({'success': False, 'error': 'Administrator access required'}), 403
    try:
        # Validate incoming request with Pydantic
        schema = SetSharedDirectorySchema(**(request.json or {}))
    except ValidationError as e:
        return jsonify({'success': False, 'error': e.errors()}), 400

    path = schema.path.strip()
    if not path:
        state_manager.set_shared_directory(None)
        return jsonify({'success': True, 'message': 'Sharing disabled'})

    if not os.path.isdir(path):
        return jsonify({'success': False, 'error': 'Invalid directory path'}), 400

    state_manager.set_shared_directory(path)
    return jsonify({'success': True, 'message': 'Shared directory updated'})

@shared_dir_bp.route('/api/shared-directory/config', methods=['GET'])
def get_shared_directory_config():
    if not require_request_admin():
        return jsonify({'success': False, 'error': 'Administrator access required'}), 403
    path = state_manager.get_shared_directory()
    return jsonify({'success': True, 'path': path})

@shared_dir_bp.route('/api/shared-directory/files', methods=['GET'])
def list_shared_directory_files():
    if not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    shared_directory = state_manager.get_shared_directory()
    if not shared_directory:
        return jsonify({'success': False, 'error': 'Sharing not configured'}), 403

    subpath = request.args.get('path', '').strip()
    target_dir = os.path.abspath(os.path.join(shared_directory, subpath))

    # Safely restrict access to the shared root directory only
    if not is_safe_subpath(shared_directory, target_dir):
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    if not os.path.exists(target_dir) or not os.path.isdir(target_dir):
        return jsonify({'success': False, 'error': 'Directory not found'}), 404

    try:
        items = []
        for entry in os.scandir(target_dir):
            stat = entry.stat()
            items.append({
                'name': entry.name,
                'is_dir': entry.is_dir(),
                'size': stat.st_size if not entry.is_dir() else 0,
                'mtime': stat.st_mtime
            })
        return jsonify({'success': True, 'files': items})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@shared_dir_bp.route('/api/shared-directory/download', methods=['GET'])
def download_shared_file():
    if not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    shared_directory = state_manager.get_shared_directory()
    if not shared_directory:
        return jsonify({'success': False, 'error': 'Sharing not configured'}), 403

    filepath = request.args.get('path', '').strip()
    target_file = os.path.abspath(os.path.join(shared_directory, filepath))

    # Directory traversal prevention
    if not is_safe_subpath(shared_directory, target_file):
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    if not os.path.exists(target_file) or os.path.isdir(target_file):
        return jsonify({'success': False, 'error': 'File not found'}), 404

    dir_name = os.path.dirname(target_file)
    file_name = os.path.basename(target_file)

    # Log to transfer history database
    transfer_item = TransferItem(
        id=f'tx_{int(time.time() * 1000)}',
        filename=file_name,
        size=os.path.getsize(target_file),
        hash='N/A',
        timestamp=time.time(),
        type='download',
        direction='received'
    )
    chat_repo.add_transfer_history(transfer_item)

    return send_from_directory(dir_name, file_name, as_attachment=True, conditional=True)
