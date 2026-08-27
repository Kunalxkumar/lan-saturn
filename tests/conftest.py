import pytest
from app import create_app
from app.extensions import socketio
from app.repositories.db import get_connection, init_db, set_db_path
from app.services import state_manager
from app.services.auth import SESSION_COOKIE_NAME, create_session, reset_auth_state

@pytest.fixture(scope="session")
def app(tmp_path_factory):
    test_db = str(tmp_path_factory.mktemp("lan_saturn") / "test_lan_saturn.db")
    set_db_path(test_db)
    init_db()
    app = create_app()
    app.config.update({
        "TESTING": True
    })
    yield app

@pytest.fixture(autouse=True)
def reset_test_state(app):
    reset_auth_state()
    state_manager.reset_state()
    with get_connection() as conn:
        for table in [
            "messages",
            "tasks",
            "polls",
            "poll_votes",
            "announcements",
            "transfer_history",
            "channel_passwords",
            "invite_codes",
            "trusted_devices",
            "calendar_events",
        ]:
            conn.execute(f"DELETE FROM {table}")
        conn.commit()

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def socket_client(app):
    client = app.test_client()
    session = create_session("127.0.0.1", "pytest-local")
    client.set_cookie(SESSION_COOKIE_NAME, session["id"])
    test_client = socketio.test_client(app, flask_test_client=client)
    yield test_client
    test_client.disconnect()
