import os
import time
import hashlib
import concurrent.futures
from io import BytesIO
import pytest

from app import create_app
from app.config import Config
from app.services.auth import SESSION_COOKIE_NAME, create_session
from app.services.upload_session import upload_manager


@pytest.fixture
def app(tmp_path):
    test_config = Config()
    test_config.TESTING = True
    test_config.UPLOAD_FOLDER = str(tmp_path / "uploads")
    test_config.PARTIAL_UPLOAD_FOLDER = str(tmp_path / "uploads" / ".partial")
    os.makedirs(test_config.UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(test_config.PARTIAL_UPLOAD_FOLDER, exist_ok=True)
    app = create_app(test_config)
    return app


@pytest.fixture
def auth_client(app):
    client = app.test_client()
    session = create_session("127.0.0.1", "test-agent")
    client.set_cookie(SESSION_COOKIE_NAME, session["id"])
    return client, session["id"]


def test_upload_init_and_contiguous_chunks(auth_client):
    client, session_id = auth_client

    # Initialize upload
    init_res = client.post(
        "/api/upload/init",
        json={"filename": "document.txt", "totalSize": 10},
    )
    assert init_res.status_code == 200
    data = init_res.get_json()
    assert data["success"] is True
    upload_id = data["uploadId"]
    assert upload_id is not None
    assert data["currentOffset"] == 0

    # First chunk (5 bytes)
    chunk1_res = client.post(
        "/upload-chunk",
        data={
            "uploadId": upload_id,
            "offset": "0",
            "file": (BytesIO(b"HELLO"), "document.txt"),
        },
    )
    assert chunk1_res.status_code == 200
    chunk1_data = chunk1_res.get_json()
    assert chunk1_data["currentOffset"] == 5
    assert chunk1_data["isComplete"] is False

    # Second chunk (5 bytes) - contiguous
    expected_hash = hashlib.sha256(b"HELLOWORLD").hexdigest()
    chunk2_res = client.post(
        "/upload-chunk",
        data={
            "uploadId": upload_id,
            "offset": "5",
            "expectedHash": expected_hash,
            "file": (BytesIO(b"WORLD"), "document.txt"),
        },
    )
    assert chunk2_res.status_code == 200
    chunk2_data = chunk2_res.get_json()
    assert chunk2_data["isComplete"] is True
    assert chunk2_data["hash"] == expected_hash
    assert chunk2_data["fileUrl"] is not None


def test_negative_offset_rejected(auth_client):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "neg.txt", "totalSize": 20})
    upload_id = init_res.get_json()["uploadId"]

    res = client.post(
        "/upload-chunk",
        data={
            "uploadId": upload_id,
            "offset": "-1",
            "file": (BytesIO(b"data"), "neg.txt"),
        },
    )
    assert res.status_code == 409
    assert "contiguous offset violation" in res.get_json()["error"]


def test_future_gap_offset_rejected(auth_client):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "gap.txt", "totalSize": 100})
    upload_id = init_res.get_json()["uploadId"]

    # Server expects offset 0, sending offset 10 should be rejected
    res = client.post(
        "/upload-chunk",
        data={
            "uploadId": upload_id,
            "offset": "10",
            "file": (BytesIO(b"data"), "gap.txt"),
        },
    )
    assert res.status_code == 409
    assert "contiguous offset violation" in res.get_json()["error"]


def test_backward_offset_rejected(auth_client):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "back.txt", "totalSize": 20})
    upload_id = init_res.get_json()["uploadId"]

    # Write first 5 bytes
    client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(b"12345"), "back.txt")},
    )

    # Attempt to write at offset 0 again
    res = client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(b"99999"), "back.txt")},
    )
    assert res.status_code == 409
    assert "contiguous offset violation" in res.get_json()["error"]


def test_zero_size_chunk_rejected(auth_client):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "zero.txt", "totalSize": 20})
    upload_id = init_res.get_json()["uploadId"]

    res = client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(b""), "zero.txt")},
    )
    assert res.status_code == 400
    assert "Empty chunk" in res.get_json()["error"]


def test_oversized_upload_rejected(auth_client):
    client, _ = auth_client
    # Over 4 GB limit
    oversized = 5 * 1024 * 1024 * 1024
    res = client.post(
        "/api/upload/init",
        json={"filename": "huge.iso", "totalSize": oversized},
    )
    assert res.status_code == 400
    assert "exceeds maximum allowed limit" in res.get_json()["error"]


def test_oversized_chunk_rejected(auth_client):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "chunk.bin", "totalSize": 20 * 1024 * 1024})
    upload_id = init_res.get_json()["uploadId"]

    # Chunk > MAX_CHUNK_SIZE (10 MB)
    huge_chunk = b"A" * (11 * 1024 * 1024)
    res = client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(huge_chunk), "chunk.bin")},
    )
    assert res.status_code in (400, 413)


def test_chunk_exceeds_total_size_rejected(auth_client):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "overflow.bin", "totalSize": 10})
    upload_id = init_res.get_json()["uploadId"]

    # Offset 0 + chunk length 15 > totalSize 10
    res = client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(b"123456789012345"), "overflow.bin")},
    )
    assert res.status_code == 400
    assert "exceeds total declared file size" in res.get_json()["error"]


def test_invalid_upload_id_rejected(auth_client):
    client, _ = auth_client
    res = client.post(
        "/upload-chunk",
        data={"uploadId": "nonexistent_id", "offset": "0", "file": (BytesIO(b"data"), "file.txt")},
    )
    assert res.status_code in (400, 404)


def test_cancelled_upload_flow(auth_client):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "cancelled.bin", "totalSize": 100})
    upload_id = init_res.get_json()["uploadId"]

    # Write partial chunk
    client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(b"chunk1"), "cancelled.bin")},
    )

    # Cancel upload
    cancel_res = client.post("/api/upload/cancel", json={"uploadId": upload_id})
    assert cancel_res.status_code == 200
    assert cancel_res.get_json()["status"] == "cancelled"

    # Attempt further write must be rejected
    write_res = client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "6", "file": (BytesIO(b"chunk2"), "cancelled.bin")},
    )
    assert write_res.status_code == 400
    assert "cancelled" in write_res.get_json()["error"]


def test_sha256_integrity_match_and_mismatch(auth_client):
    client, _ = auth_client

    # Test Mismatch
    init_res = client.post(
        "/api/upload/init",
        json={"filename": "tampered.bin", "totalSize": 8, "expectedHash": "0000000000000000000000000000000000000000000000000000000000000000"},
    )
    upload_id = init_res.get_json()["uploadId"]

    mismatch_res = client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(b"TAMPERED"), "tampered.bin")},
    )
    assert mismatch_res.status_code == 400
    assert "Integrity check failed" in mismatch_res.get_json()["error"]

    # Verify partial file removed on failure
    session = upload_manager.get_session(upload_id)
    assert session.status == "failed"
    assert not os.path.exists(session.temp_path)


def test_expired_session_cleanup(auth_client, monkeypatch):
    client, session_id = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "expire.bin", "totalSize": 50})
    upload_id = init_res.get_json()["uploadId"]

    # Write 10 bytes
    client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(b"0123456789"), "expire.bin")},
    )
    session = upload_manager.get_session(upload_id)
    assert os.path.exists(session.temp_path)

    # Fast-forward time past timeout
    session.expires_at = time.time() - 100
    cleaned = upload_manager.cleanup_expired_sessions()
    assert cleaned >= 1
    assert session.status == "expired"
    assert not os.path.exists(session.temp_path)


def test_partial_file_download_forbidden(auth_client, app):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "secret.dat", "totalSize": 100})
    upload_id = init_res.get_json()["uploadId"]

    # Direct request to .partial path must be blocked
    res = client.get(f"/files/.partial/{upload_id}.part")
    assert res.status_code in (400, 403, 404)

    # Direct traversal attempt
    res2 = client.get("/files/..%2F..%2Fetc%2Fpasswd")
    assert res2.status_code in (400, 404)


def test_concurrency_same_upload_serialized(auth_client):
    client, _ = auth_client
    init_res = client.post("/api/upload/init", json={"filename": "race.bin", "totalSize": 20})
    upload_id = init_res.get_json()["uploadId"]

    # Two concurrent requests both trying offset 0
    results = []
    def try_write():
        return client.post(
            "/upload-chunk",
            data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(b"1234567890"), "race.bin")},
        )

    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(try_write)
        f2 = executor.submit(try_write)
        results = [f1.result(), f2.result()]

    status_codes = [r.status_code for r in results]
    # Exactly one must succeed (200) and one must be rejected (409 contiguous offset violation)
    assert 200 in status_codes
    assert 409 in status_codes


def test_concurrency_multiple_distinct_uploads(auth_client):
    client, _ = auth_client

    def run_full_upload(idx):
        payload = f"content_for_upload_{idx}".encode()
        expected_hash = hashlib.sha256(payload).hexdigest()
        init_res = client.post(
            "/api/upload/init",
            json={"filename": f"file_{idx}.bin", "totalSize": len(payload), "expectedHash": expected_hash},
        )
        assert init_res.status_code == 200
        uid = init_res.get_json()["uploadId"]

        chunk_res = client.post(
            "/upload-chunk",
            data={"uploadId": uid, "offset": "0", "file": (BytesIO(payload), f"file_{idx}.bin")},
        )
        return chunk_res.status_code == 200 and chunk_res.get_json().get("isComplete") is True

    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(run_full_upload, i) for i in range(5)]
        results = [f.result() for f in futures]

    assert all(results)


def test_interrupted_and_resumed_upload(auth_client):
    client, _ = auth_client
    full_payload = b"PART_ONE_DATA_AND_PART_TWO_DATA_RESUMED"
    total_size = len(full_payload)
    expected_hash = hashlib.sha256(full_payload).hexdigest()

    init_res = client.post(
        "/api/upload/init",
        json={"filename": "resume_test.dat", "totalSize": total_size, "expectedHash": expected_hash},
    )
    assert init_res.status_code == 200
    upload_id = init_res.get_json()["uploadId"]

    # Part 1 (14 bytes)
    part1 = full_payload[:14]
    chunk1_res = client.post(
        "/upload-chunk",
        data={"uploadId": upload_id, "offset": "0", "file": (BytesIO(part1), "resume_test.dat")},
    )
    assert chunk1_res.status_code == 200
    assert chunk1_res.get_json()["currentOffset"] == 14

    # Interruption occurs. Client queries status to determine authoritative resume point
    status_res = client.get(f"/api/upload/status/{upload_id}")
    assert status_res.status_code == 200
    status_data = status_res.get_json()
    assert status_data["currentOffset"] == 14
    assert status_data["status"] == "active"
    assert status_data["isComplete"] is False

    # Resume upload with remainder
    part2 = full_payload[14:]
    chunk2_res = client.post(
        "/upload-chunk",
        data={
            "uploadId": upload_id,
            "offset": str(status_data["currentOffset"]),
            "file": (BytesIO(part2), "resume_test.dat"),
        },
    )
    assert chunk2_res.status_code == 200
    final_data = chunk2_res.get_json()
    assert final_data["isComplete"] is True
    assert final_data["hash"] == expected_hash

