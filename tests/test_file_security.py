import os
import zipfile
import pytest
from app import create_app
from app.config import Config
from app.routes.shared_dir import is_safe_subpath
from app.services.file_service import FileService, MAX_ZIP_ENTRIES

@pytest.fixture
def app():
    test_config = Config()
    test_config.TESTING = True
    app = create_app(test_config)
    return app

@pytest.fixture
def client(app):
    return app.test_client()

def test_secret_key_generation():
    assert Config.SECRET_KEY is not None
    assert len(Config.SECRET_KEY) >= 32

def test_is_safe_subpath(tmp_path):
    base_dir = tmp_path / "shared"
    base_dir.mkdir()

    safe_file = base_dir / "doc.txt"
    safe_file.write_text("hello")

    outside_dir = tmp_path / "shared_secret"
    outside_dir.mkdir()
    outside_file = outside_dir / "secret.txt"
    outside_file.write_text("secret")

    assert is_safe_subpath(str(base_dir), str(safe_file)) is True
    assert is_safe_subpath(str(base_dir), str(outside_file)) is False
    assert is_safe_subpath(str(base_dir), str(base_dir / ".." / "shared_secret")) is False

def test_zip_preview_limit(tmp_path, monkeypatch):
    zip_path = tmp_path / "large.zip"
    monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))

    with zipfile.ZipFile(zip_path, "w") as z:
        for i in range(MAX_ZIP_ENTRIES + 10):
            z.writestr(f"file_{i}.txt", "test")

    service = FileService()
    with pytest.raises(ValueError, match="exceeds maximum entry limit"):
        service.get_zip_contents("large.zip")
