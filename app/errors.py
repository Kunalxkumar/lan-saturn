from flask import jsonify
from werkzeug.exceptions import RequestEntityTooLarge, BadRequest, NotFound

def register_error_handlers(app):
    def handle_file_too_large(error):
        return jsonify({
            'success': False,
            'error': 'File size too large. Maximum 50MB allowed.'
        }), 413

    def handle_bad_request(error):
        return jsonify({
            'success': False,
            'error': f'Bad request: {error.description}'
        }), 400

    def handle_not_found(error):
        return jsonify({
            'success': False,
            'error': 'Resource not found'
        }), 404

    def handle_generic_exception(error):
        app.logger.error("Unhandled Exception: %s", error, exc_info=True)
        return jsonify({
            'success': False,
            'error': 'An internal server error occurred'
        }), 500

    app.register_error_handler(RequestEntityTooLarge, handle_file_too_large)
    app.register_error_handler(BadRequest, handle_bad_request)
    app.register_error_handler(NotFound, handle_not_found)
    app.register_error_handler(Exception, handle_generic_exception)
