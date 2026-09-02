# LAN Saturn Transfer Benchmarks

**Version:** Step 1 Benchmark Foundation  
**Harness Script:** [`benchmarks/transfer_benchmark.py`](../benchmarks/transfer_benchmark.py)

---

## 1. Overview

LAN Saturn provides a reproducible, empirical benchmark harness (`benchmarks/transfer_benchmark.py`) to measure actual file transfer performance over HTTP/TCP network interfaces.

### Measured Metrics
- **Setup Time (ms)**: Time elapsed during HTTP connection handshake and payload initialization.
- **Transfer Time (s)**: Duration required to transmit the complete payload buffer across network interfaces.
- **Average Speed (MB/s)**: Megabytes transferred per second ($1 \text{ MB} = 1,000,000 \text{ bytes}$).
- **Throughput (Mbps)**: Megabits transferred per second ($\text{Mbps} = \text{MB/s} \times 8$).
- **Integrity Verification**: Pre-transfer and post-transfer SHA-256 hash comparison (`PASS` / `FAIL`).
- **Resource Utilization**: Peak CPU percentage (%) and RAM delta (MB) logged during execution.

---

## 2. Running Benchmarks

### Single-Machine Loopback Benchmark (Harness Verification)
To verify the benchmark harness and test payload streaming locally on `127.0.0.1`:

```bash
python benchmarks/transfer_benchmark.py --size 100MB
```

Supported size arguments: `10MB`, `100MB`, `1GB`, `5GB`.

### Multi-Machine Physical Network Benchmark
To perform a true LAN transfer benchmark between two physical Windows devices:

1. **Receiver (Server Node)**: Start LAN Saturn on machine A:
   ```bash
   python run.py
   ```
2. **Sender (Benchmark Client Node)**: Run the benchmark harness on machine B targeting machine A's IP address:
   ```bash
   python benchmarks/transfer_benchmark.py --target http://192.168.1.50:5000 --size 1GB
   ```

---

## 3. Sample Benchmark Output

```text
================================================================================
                    LAN Saturn Transfer Benchmark Report
================================================================================
Target URL         : http://127.0.0.1:5000/upload
Test Payload Size : 100 MB (104,857,600 bytes)
Payload Hashing   : SHA-256
--------------------------------------------------------------------------------
Connection Setup  : 14.20 ms
Transfer Time     : 0.45 s
Average Speed     : 222.22 MB/s
Average Throughput: 1777.76 Mbps
--------------------------------------------------------------------------------
Resource Metrics  : Peak CPU: 12.40% | RAM Delta: 4.80 MB
Sender SHA-256    : e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Receiver SHA-256  : e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
Integrity Check   : PASS
================================================================================
```

---

## 4. Benchmark Guidelines

> [!IMPORTANT]
> **No Fabricated Benchmarks**: Never record unverified transfer speeds in documentation. All reported throughput figures must come directly from runs of `benchmarks/transfer_benchmark.py` on specified hardware and network topologies.
