import os
import zipfile
import pytest
from app import create_app
from app.config import Config
from app.routes.shared_dir import is_safe_subpath
from app.services.file_service import MAX_ZIP_ENTRIES, get_zip_contents

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

    with pytest.raises(ValueError, match="exceeds maximum entry limit"):
        get_zip_contents("large.zip")


def test_append_chunk_offset_validation(tmp_path, monkeypatch):
    from app.services.file_service import append_chunk_offset
    monkeypatch.setattr(Config, "UPLOAD_FOLDER", str(tmp_path))

    # Reject non-zero offset on new file
    with pytest.raises(ValueError, match="First chunk must start at offset 0"):
        append_chunk_offset("test.bin", b"chunk", 100, 1000)

    # Reject negative offset
    with pytest.raises(ValueError, match="Offset cannot be negative"):
        append_chunk_offset("test.bin", b"chunk", -1, 1000)

    # Reject empty chunk
    with pytest.raises(ValueError, match="Empty chunk data"):
        append_chunk_offset("test.bin", b"", 0, 1000)

    # Valid first chunk
    res = append_chunk_offset("test.bin", b"hello", 0, 10)
    assert res["currentSize"] == 5
    assert res["isComplete"] is False

    # Reject offset exceeding written size (gap / sparse file attempt)
    with pytest.raises(ValueError, match="exceeds current written file size"):
        append_chunk_offset("test.bin", b"world", 8, 20)

    # Valid contiguous second chunk
    res2 = append_chunk_offset("test.bin", b"world", 5, 10)
    assert res2["currentSize"] == 10
    assert res2["isComplete"] is True
    assert res2["hash"] is not None

