from flask import jsonify
from werkzeug.exceptions import RequestEntityTooLarge, BadRequest, NotFound

def register_error_handlers(app):
    def make_error_response(message, code):
        return jsonify({'success': False, 'error': message}), code

    app.register_error_handler(RequestEntityTooLarge, lambda e: make_error_response('File size too large. Maximum 50MB allowed.', 413))
    app.register_error_handler(BadRequest, lambda e: make_error_response(f'Bad request: {e.description}', 400))
    app.register_error_handler(NotFound, lambda e: make_error_response('Resource not found', 404))

    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        app.logger.error("Unhandled Exception: %s", error, exc_info=True)
        return make_error_response('An internal server error occurred', 500)

