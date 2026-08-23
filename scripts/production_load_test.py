"""
Phase 16 — Production Load & Stress Testing Tool
Simulates concurrent virtual users issuing requests against the live API,
measuring p50/p95/p99 latency, throughput (requests/sec), and error rates.
"""

import sys
import time
import json
import argparse
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.request
import urllib.error

DEFAULT_BASE_URL = "http://127.0.0.1:8000"

ENDPOINTS = [
    ("/api/health", "GET"),
    ("/api/risk", "GET"),
    ("/api/risk/HORMUZ", "GET"),
    ("/api/risk/RED_SEA", "GET"),
    ("/api/forecast/HORMUZ", "GET"),
    ("/api/observability/metrics", "GET"),
    ("/metrics", "GET"),
]


def send_single_request(base_url: str, endpoint: str, method: str = "GET", headers: dict = None) -> tuple:
    url = f"{base_url}{endpoint}"
    req = urllib.request.Request(url, method=method)
    if headers:
        for k, v in headers.items():
            req.add_header(k, v)

    start_time = time.perf_counter()
    status_code = 500
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            status_code = response.getcode()
            elapsed_ms = (time.perf_counter() - start_time) * 1000.0
            return (status_code, elapsed_ms, True, None)
    except urllib.error.HTTPError as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return (e.code, elapsed_ms, e.code < 500, str(e))
    except Exception as e:
        elapsed_ms = (time.perf_counter() - start_time) * 1000.0
        return (500, elapsed_ms, False, str(e))


def run_load_test(base_url: str, concurrency: int = 10, requests_per_user: int = 20) -> dict:
    total_requests = concurrency * requests_per_user
    print(f"[START] Load test: {concurrency} virtual users x {requests_per_user} requests = {total_requests} total requests against {base_url}")

    latencies = []
    status_counts = {}
    success_count = 0
    failure_count = 0

    start_wall_time = time.perf_counter()

    def worker_task(user_id: int):
        results = []
        for i in range(requests_per_user):
            endpoint, method = ENDPOINTS[(user_id + i) % len(ENDPOINTS)]
            res = send_single_request(base_url, endpoint, method)
            results.append(res)
        return results

    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(worker_task, u) for u in range(concurrency)]
        for future in as_completed(futures):
            res_list = future.result()
            for status_code, elapsed_ms, is_success, err in res_list:
                latencies.append(elapsed_ms)
                status_counts[status_code] = status_counts.get(status_code, 0) + 1
                if is_success:
                    success_count += 1
                else:
                    failure_count += 1

    total_wall_sec = time.perf_counter() - start_wall_time
    rps = total_requests / total_wall_sec if total_wall_sec > 0 else 0

    latencies_sorted = sorted(latencies) if latencies else [0]
    p50 = latencies_sorted[int(len(latencies_sorted) * 0.50)]
    p95 = latencies_sorted[int(len(latencies_sorted) * 0.95)] if len(latencies_sorted) >= 20 else latencies_sorted[-1]
    p99 = latencies_sorted[int(len(latencies_sorted) * 0.99)] if len(latencies_sorted) >= 100 else latencies_sorted[-1]
    avg_latency = statistics.mean(latencies) if latencies else 0

    report = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "target_url": base_url,
        "concurrency": concurrency,
        "total_requests": total_requests,
        "total_duration_sec": round(total_wall_sec, 2),
        "requests_per_sec": round(rps, 2),
        "success_count": success_count,
        "failure_count": failure_count,
        "error_rate_pct": round((failure_count / total_requests) * 100.0, 2) if total_requests > 0 else 0,
        "latencies_ms": {
            "p50": round(p50, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "mean": round(avg_latency, 2),
            "min": round(latencies_sorted[0], 2),
            "max": round(latencies_sorted[-1], 2),
        },
        "status_distribution": status_counts,
    }

    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Phase 16 API Load & Stress Testing Tool")
    parser.add_argument("--url", default=DEFAULT_BASE_URL, help="Base URL of API target")
    parser.add_argument("--concurrency", type=int, default=10, help="Number of concurrent virtual users")
    parser.add_argument("--requests", type=int, default=20, help="Requests per user")
    parser.add_argument("--out", default="docs/phase-16-performance-report.json", help="Path to write JSON report")

    args = parser.parse_args()
    report = run_load_test(args.url, args.concurrency, args.requests)

    print("\n[RESULTS] LOAD TEST PERFORMANCE SUMMARY:")
    print(f"  Total Requests:  {report['total_requests']}")
    print(f"  Duration:        {report['total_duration_sec']} sec")
    print(f"  Throughput:      {report['requests_per_sec']} req/sec")
    print(f"  Error Rate:      {report['error_rate_pct']}%")
    print(f"  p50 Latency:     {report['latencies_ms']['p50']} ms")
    print(f"  p95 Latency:     {report['latencies_ms']['p95']} ms")
    print(f"  p99 Latency:     {report['latencies_ms']['p99']} ms")

    with open(args.out, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\n[DONE] Performance report saved to: {args.out}")
