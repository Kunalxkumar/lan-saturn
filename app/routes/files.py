from flask import Blueprint, request, send_from_directory, current_app, jsonify
from app.services.file_service import FileService
from app.repositories.chat_repo import ChatRepository

files_bp = Blueprint('files', __name__)
chat_repo = ChatRepository()
file_service = FileService(chat_repo)

@files_bp.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400

    try:
        res = file_service.save_uploaded_file(file)
        return jsonify(dict(success=True, **res))
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@files_bp.route('/files/<filename>')
def serve_file(filename):
    return send_from_directory(current_app.config['UPLOAD_FOLDER'], filename)

@files_bp.route('/api/transfer-history', methods=['GET'])
def get_transfer_history():
    history = chat_repo.get_transfer_history()
    return jsonify({
        'success': True,
        'history': [item.to_dict() for item in history]
    })

@files_bp.route('/api/zip-preview/<filename>', methods=['GET'])
def zip_preview(filename):
    try:
        contents = file_service.get_zip_contents(filename)
        return jsonify({'success': True, 'files': contents})
    except FileNotFoundError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
