from flask import Flask
from app.config import Config
from app.extensions import socketio
from app.errors import register_error_handlers

def create_app(config_class=Config) -> Flask:
    # Initialize Flask app and specify static/templates directory names relative to this package path
    flask_app = Flask(__name__, 
                static_folder='static',
                template_folder='templates')
    
    flask_app.config.from_object(config_class)
    config_class.init_app(flask_app)

    # Initialize extensions
    socketio.init_app(flask_app)

    # Register Blueprints
    from app.routes.main import main_bp
    from app.routes.files import files_bp
    from app.routes.shared_dir import shared_dir_bp

    flask_app.register_blueprint(main_bp)
    flask_app.register_blueprint(files_bp)
    flask_app.register_blueprint(shared_dir_bp)

    # Import Socket.IO handlers to load event listener decorators
    from app.sockets import chat, polls, tasks, notes, clipboard, announcements, security, calendar

    # Register central error management
    register_error_handlers(flask_app)

    from app.services.discovery import discovery_service
    # Only start discovery if not testing to avoid threading issues in tests
    if not flask_app.config.get('TESTING'):
        discovery_service.start()

    return flask_app
