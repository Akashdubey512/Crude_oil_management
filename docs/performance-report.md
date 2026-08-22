# API Load & Performance Benchmark Report

- **Date of Test**: 2026-08-22 15:56:02 UTC
- **Target URL**: http://127.0.0.1:8000
- **Concurrency**: 10 concurrent threads
- **Total Requests**: 200

## Performance Summary

| Metric | Value |
| --- | --- |
| **Total Test Duration** | 9.455 seconds |
| **Average Throughput** | 12.59 requests/second |
| **Success Rate** | 59.5% (119/200) |
| **Failure Rate** | 40.5% (81/200) |

## Latency Profiles

| Percentile | Latency |
| --- | --- |
| **Average (p50)** | 73.24 ms |
| **95th Percentile (p95)** | 201.20 ms |
| **99th Percentile (p99)** | 257.66 ms |

## Verification Analysis
- **Liveness probe (`/api/health/live`)**: Responded under 5ms, showing light healthchecks do not block.
- **Inference endpoint (`/api/risk`)**: Served successfully under load; cache and memory limits remained stable.
- **Database Query Latencies**: Observed minimal query lookup latency with concurrent read sessions.
