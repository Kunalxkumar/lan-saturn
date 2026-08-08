import pytest
from app import create_app
from app.extensions import socketio
from app.repositories.db import db_manager

@pytest.fixture
def app(tmp_path):
    test_db = str(tmp_path / "test_lan_saturn.db")
    db_manager.db_path = test_db
    db_manager.init_db()
    app = create_app()
    app.config.update({
        "TESTING": True
    })
    yield app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def socket_client(app):
    return socketio.test_client(app)
