from flask import Blueprint, request, send_from_directory, current_app, jsonify
from app.services.file_service import get_zip_contents, save_uploaded_file
from app.repositories.chat_repo import ChatRepository
from app.services.auth import get_request_session, require_request_trusted

files_bp = Blueprint('files', __name__)
chat_repo = ChatRepository()

@files_bp.route('/upload', methods=['POST'])
def upload_file():
    session = get_request_session()
    if not session or not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    try:
        res = save_uploaded_file(file, chat_repo)
        return jsonify(dict(success=True, **res))
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        current_app.logger.exception("File upload failed")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500

@files_bp.route('/files/<filename>')
def serve_file(filename):
    if not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@files_bp.route('/api/transfer-history', methods=['GET'])
def get_transfer_history():
    if not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    history = chat_repo.get_transfer_history()
    return jsonify({
        'success': True,
        'history': [item.to_dict() for item in history]
    })

@files_bp.route('/api/zip-preview/<filename>', methods=['GET'])
def zip_preview(filename):
    if not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    try:
        contents = get_zip_contents(filename)
        return jsonify({'success': True, 'files': contents})
    except (FileNotFoundError, ValueError) as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        current_app.logger.exception("ZIP preview failed")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500
