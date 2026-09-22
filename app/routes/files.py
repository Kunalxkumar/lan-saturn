import os
from flask import Blueprint, request, send_from_directory, current_app, jsonify
from werkzeug.utils import secure_filename

from app.services.file_service import get_zip_contents, save_uploaded_file
from app.services.upload_session import upload_manager
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


@files_bp.route('/api/upload/init', methods=['POST'])
def init_chunked_upload():
    session = get_request_session()
    if not session or not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    data = request.get_json(silent=True) or {}
    filename = data.get('filename')
    total_size = data.get('totalSize')
    expected_hash = data.get('expectedHash')
    encryption_metadata = data.get('encryptionMetadata')

    if not filename or total_size is None:
        return jsonify({'success': False, 'error': 'filename and totalSize are required'}), 400

    try:
        total_size_int = int(total_size)
    except (TypeError, ValueError):
        return jsonify({'success': False, 'error': 'totalSize must be an integer'}), 400

    try:
        upload_session = upload_manager.init_session(
            session_id=session['id'],
            filename=filename,
            total_size=total_size_int,
            expected_hash=expected_hash,
            encryption_metadata=encryption_metadata,
        )
        return jsonify(dict(success=True, **upload_session.to_dict()))
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        current_app.logger.exception("Failed to initialize chunked upload")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@files_bp.route('/upload-chunk', methods=['POST'])
@files_bp.route('/api/upload/chunk', methods=['POST'])
def upload_chunk():
    session = get_request_session()
    if not session or not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No chunk file part'}), 400

    upload_id = request.form.get('uploadId')
    offset_raw = request.form.get('offset')
    expected_hash = request.form.get('expectedHash')
    chunk_file = request.files['file']

    if offset_raw is None:
        return jsonify({'success': False, 'error': 'offset parameter is required'}), 400

    try:
        offset = int(offset_raw)
    except (TypeError, ValueError):
        return jsonify({'success': False, 'error': 'offset must be an integer'}), 400

    # Backwards compatibility: If uploadId not provided, check if filename + totalSize provided
    if not upload_id:
        filename = request.form.get('filename')
        total_size_raw = request.form.get('totalSize')
        if not filename or total_size_raw is None:
            return jsonify({'success': False, 'error': 'uploadId is required'}), 400
        try:
            total_size = int(total_size_raw)
            legacy_session = upload_manager.init_session(
                session_id=session['id'],
                filename=filename,
                total_size=total_size,
            )
            upload_id = legacy_session.upload_id
        except ValueError as e:
            return jsonify({'success': False, 'error': str(e)}), 400

    try:
        chunk_data = chunk_file.read()
        res = upload_manager.append_chunk(
            upload_id=upload_id,
            session_id=session['id'],
            chunk_data=chunk_data,
            offset=offset,
            expected_hash=expected_hash,
        )
        return jsonify(res)
    except PermissionError as e:
        return jsonify({'success': False, 'error': str(e)}), 403
    except ValueError as e:
        err_msg = str(e)
        status_code = 409 if "contiguous offset" in err_msg else 400
        return jsonify({'success': False, 'error': err_msg}), status_code
    except FileNotFoundError as e:
        return jsonify({'success': False, 'error': str(e)}), 404
    except Exception as e:
        current_app.logger.exception("Chunk upload failed")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@files_bp.route('/api/upload/status/<upload_id>', methods=['GET'])
def get_upload_status(upload_id):
    session = get_request_session()
    if not session or not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    upload_session = upload_manager.get_session(upload_id)
    if not upload_session:
        return jsonify({'success': False, 'error': 'Upload session not found or expired'}), 404

    if upload_session.session_id != session['id']:
        return jsonify({'success': False, 'error': 'Access denied'}), 403

    return jsonify(dict(success=True, **upload_session.to_dict()))


@files_bp.route('/api/upload/cancel', methods=['POST'])
def cancel_upload():
    session = get_request_session()
    if not session or not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    data = request.get_json(silent=True) or {}
    upload_id = data.get('uploadId')
    if not upload_id:
        return jsonify({'success': False, 'error': 'uploadId is required'}), 400

    try:
        res = upload_manager.cancel_session(upload_id, session['id'])
        return jsonify(res)
    except PermissionError as e:
        return jsonify({'success': False, 'error': str(e)}), 403
    except ValueError as e:
        return jsonify({'success': False, 'error': str(e)}), 400
    except Exception as e:
        current_app.logger.exception("Cancel upload failed")
        return jsonify({'success': False, 'error': 'Internal server error'}), 500


@files_bp.route('/files/<filename>')
def serve_file(filename):
    if not require_request_trusted():
        return jsonify({'success': False, 'error': 'Authentication required'}), 401

    safe_name = secure_filename(filename)
    if not safe_name or safe_name.startswith('.') or '.partial' in safe_name:
        return jsonify({'success': False, 'error': 'Invalid file requested'}), 400

    upload_dir = os.path.abspath(current_app.config['UPLOAD_FOLDER'])
    target_path = os.path.abspath(os.path.join(upload_dir, safe_name))

    # Confinement & completed-only verification
    if not target_path.startswith(upload_dir) or not os.path.isfile(target_path):
        return jsonify({'success': False, 'error': 'File not found'}), 404

    # Deny access if inside .partial
    partial_dir = os.path.abspath(current_app.config.get('PARTIAL_UPLOAD_FOLDER', os.path.join(upload_dir, '.partial')))
    if target_path.startswith(partial_dir):
        return jsonify({'success': False, 'error': 'Access denied to partial transfer'}), 403

    return send_from_directory(upload_dir, safe_name, conditional=True)


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

