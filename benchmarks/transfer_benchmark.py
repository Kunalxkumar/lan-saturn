"""
LAN Saturn Production Transfer Benchmark Harness (v1.2.1 Hardened)
Measures end-to-end upload and download throughput, latency, resource utilization,
and cryptographic SHA-256 integrity against real stored bytes.
"""

import os
import sys
import time
import hashlib
import argparse
import urllib.request
import urllib.parse
import json
from datetime import datetime

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False


def generate_test_payload(size_bytes: int) -> bytes:
    """Generate deterministic pseudo-random binary payload."""
    seed = b"LAN-SATURN-BENCHMARK-SEED-2026-V121"
    repeat_count = (size_bytes // len(seed)) + 1
    return (seed * repeat_count)[:size_bytes]


def parse_size_str(size_str: str) -> int:
    """Parse human readable size strings like 10MB, 100MB, 1GB into bytes."""
    size_str = size_str.strip().upper()
    if size_str.endswith("GB"):
        return int(float(size_str[:-2]) * 1024 * 1024 * 1024)
    elif size_str.endswith("MB"):
        return int(float(size_str[:-2]) * 1024 * 1024)
    elif size_str.endswith("KB"):
        return int(float(size_str[:-2]) * 1024)
    elif size_str.endswith("B"):
        return int(size_str[:-1])
    return int(size_str)


def run_benchmark(base_url: str, size_bytes: int, chunk_size: int = 2 * 1024 * 1024, transport: str = "LAN / Wi-Fi"):
    base_url = base_url.rstrip("/")
    parsed = urllib.parse.urlparse(base_url)
    target_ip = parsed.hostname or "127.0.0.1"
    target_port = parsed.port or (443 if parsed.scheme == "https" else 80)

    print(f"Generating test payload: {size_bytes / (1024 * 1024):.2f} MB ({size_bytes:,} bytes)...")
    payload = generate_test_payload(size_bytes)
    sender_hash = hashlib.sha256(payload).hexdigest()

    if HAS_PSUTIL:
        process = psutil.Process(os.getpid())
        cpu_start = process.cpu_percent(interval=None)
        mem_start = process.memory_info().rss
    else:
        cpu_start = 0.0
        mem_start = 0

    # 1. Establish Session
    t0_conn = time.perf_counter()
    session_req = urllib.request.Request(f"{base_url}/")
    cookie_header = ""
    try:
        with urllib.request.urlopen(session_req, timeout=10) as resp:
            raw_cookie = resp.headers.get("Set-Cookie", "")
            if "lan_saturn_session=" in raw_cookie:
                cookie_header = raw_cookie.split(";")[0]
        t1_conn = time.perf_counter()
        conn_time_ms = (t1_conn - t0_conn) * 1000.0
    except Exception as e:
        print(f"Failed to connect to {base_url}: {e}")
        return

    # 2. Initialize Chunked Upload Session
    init_url = f"{base_url}/api/upload/init"
    filename = f"bench_{int(time.time())}.bin"
    init_body = json.dumps({
        "filename": filename,
        "totalSize": size_bytes,
        "expectedHash": sender_hash
    }).encode("utf-8")

    headers = {
        "Content-Type": "application/json",
        "Cookie": cookie_header
    }

    init_req = urllib.request.Request(init_url, data=init_body, headers=headers)
    try:
        with urllib.request.urlopen(init_req, timeout=10) as resp:
            init_res = json.loads(resp.read().decode("utf-8"))
            upload_id = init_res["uploadId"]
    except Exception as e:
        print(f"Upload initialization failed: {e}")
        return

    # 3. Stream Chunks to Server
    t_upload_start = time.perf_counter()
    offset = 0
    final_res = {}

    while offset < size_bytes:
        chunk_end = min(offset + chunk_size, size_bytes)
        chunk_bytes = payload[offset:chunk_end]

        boundary = f"----SaturnBoundary{int(time.time()*1000)}"
        body = []
        body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"uploadId\"\r\n\r\n{upload_id}\r\n".encode())
        body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"offset\"\r\n\r\n{offset}\r\n".encode())
        body.append(f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"chunk.bin\"\r\nContent-Type: application/octet-stream\r\n\r\n".encode())
        body.append(chunk_bytes)
        body.append(f"\r\n--{boundary}--\r\n".encode())
        multipart_data = b"".join(body)

        chunk_headers = {
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Cookie": cookie_header
        }

        chunk_req = urllib.request.Request(f"{base_url}/upload-chunk", data=multipart_data, headers=chunk_headers)
        with urllib.request.urlopen(chunk_req, timeout=30) as chunk_resp:
            final_res = json.loads(chunk_resp.read().decode("utf-8"))

        offset = chunk_end

    t_upload_end = time.perf_counter()
    upload_time_s = max(t_upload_end - t_upload_start, 0.000001)
    upload_speed_mbs = (size_bytes / (1024 * 1024)) / upload_time_s
    upload_throughput_mbps = upload_speed_mbs * 8.0

    file_url = final_res.get("fileUrl", "")
    server_computed_hash = final_res.get("hash", "")

    # 4. Download and Verify Actual Stored Bytes
    t_download_start = time.perf_counter()
    download_req = urllib.request.Request(f"{base_url}{file_url}", headers={"Cookie": cookie_header})
    hasher = hashlib.sha256()
    downloaded_bytes = 0

    try:
        with urllib.request.urlopen(download_req, timeout=60) as resp:
            while chunk := resp.read(64 * 1024):
                hasher.update(chunk)
                downloaded_bytes += len(chunk)
        t_download_end = time.perf_counter()
        receiver_hash = hasher.hexdigest()
        download_time_s = max(t_download_end - t_download_start, 0.000001)
        download_speed_mbs = (downloaded_bytes / (1024 * 1024)) / download_time_s
        download_throughput_mbps = download_speed_mbs * 8.0
    except Exception as e:
        print(f"Download verification failed: {e}")
        receiver_hash = "ERROR"
        download_time_s = 0.001
        download_speed_mbs = 0.0
        download_throughput_mbps = 0.0

    if HAS_PSUTIL:
        cpu_peak = process.cpu_percent(interval=None)
        mem_delta_mb = (process.memory_info().rss - mem_start) / (1024 * 1024)
    else:
        cpu_peak = 0.0
        mem_delta_mb = 0.0

    integrity = "PASS" if (sender_hash == receiver_hash and sender_hash == server_computed_hash) else "FAIL"

    # Report Output
    print("\n" + "=" * 80)
    print("           LAN Saturn Transfer Benchmark & Integrity Report (v1.2.1)")
    print("=" * 80)
    print(f"Timestamp          : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Transport Interface: {transport}")
    print(f"Target Endpoint    : {target_ip}:{target_port} ({base_url})")
    print(f"Payload Size       : {size_bytes / (1024*1024):.2f} MB ({size_bytes:,} bytes)")
    print(f"Chunk Size         : {chunk_size / (1024*1024):.2f} MB")
    print("-" * 80)
    print(f"Connection Latency : {conn_time_ms:.2f} ms")
    print(f"Upload Time        : {upload_time_s:.2f} s")
    print(f"Upload Speed       : {upload_speed_mbs:.2f} MB/s ({upload_throughput_mbps:.2f} Mbps)")
    print(f"Download Time      : {download_time_s:.2f} s")
    print(f"Download Speed     : {download_speed_mbs:.2f} MB/s ({download_throughput_mbps:.2f} Mbps)")
    print("-" * 80)
    if HAS_PSUTIL:
        print(f"Resource Metrics   : Peak CPU: {cpu_peak:.1f}% | RAM Delta: {mem_delta_mb:.2f} MB")
    print(f"Sender SHA-256     : {sender_hash}")
    print(f"Server Stored Hash : {server_computed_hash}")
    print(f"Receiver SHA-256   : {receiver_hash}")
    print(f"Integrity Check    : {integrity}")
    print("=" * 80 + "\n")


def main():
    parser = argparse.ArgumentParser(description="LAN Saturn Transfer Benchmark Harness")
    parser.add_argument("--base-url", default="http://127.0.0.1:5000", help="Base URL of server")
    parser.add_argument("--size", default="10MB", help="Payload size (e.g. 10MB, 100MB, 1GB)")
    parser.add_argument("--chunk-size", default="2MB", help="Chunk size (e.g. 1MB, 2MB, 5MB)")
    parser.add_argument("--transport", default="LAN / Wi-Fi", help="Network interface (Wi-Fi, Hotspot, Localhost)")
    args = parser.parse_args()

    size_bytes = parse_size_str(args.size)
    chunk_bytes = parse_size_str(args.chunk_size)
    run_benchmark(args.base_url, size_bytes, chunk_bytes, args.transport)


if __name__ == "__main__":
    main()
