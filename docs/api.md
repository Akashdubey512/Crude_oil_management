# API Reference — India Energy Supply Chain Resilience Platform

**Base URL**: `http://127.0.0.1:8000`  
**Interactive Docs**: `http://127.0.0.1:8000/docs` (Swagger UI)  
**Alternative Docs**: `http://127.0.0.1:8000/redoc`

---

## Authentication
No authentication required for the current local deployment. CORS is currently open (`*`). Lock to specific origins in production.

---

## Endpoints

### `GET /health`
Returns service health status, active model version, and data freshness.

**Response Schema**
```json
{
  "status": "healthy",
  "model_version": "1.0",
  "data_timestamp": "2026-08-16",
  "environment": "development"
}
```

**Error Responses** — None (always returns 200 if server is running).

---

### `GET /api/corridors`
Returns all supported maritime energy corridors with geographic metadata and source citations.

**Response Schema** (array of CorridorResponse)
```json
[
  {
    "corridor_id": "HORMUZ",
    "name": "Strait of Hormuz",
    "description": "Narrow waterway between Iran and Oman...",
    "source": "IMF PortWatch (ArcGIS FeatureServer) + Caldara-Iacoviello GPR",
    "source_url": "https://portwatch.imf.org/"
  }
]
```

---

### `GET /api/risk`
Returns risk snapshots for all supported corridors (HORMUZ, BAB_EL_MANDEB, SUEZ, RED_SEA).

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `date` | `string` | No | Target date (YYYY-MM-DD). Defaults to latest available PortWatch date. |

**Response Schema** (array of RiskSnapshotResponse)
```json
[
  {
    "corridor": "HORMUZ",
    "risk_score": 0.1700,
    "risk_level": "LOW",
    "probability": 0.0017,
    "prediction_date": "2026-08-16",
    "model_version": "1.0",
    "data_freshness": {
      "traffic": "2026-08-16",
      "geopolitical": "2026-08-17",
      "price": "2026-08-18"
    },
    "risk_decomposition": {
      "geopolitical": 0.0,
      "maritime": 0.0,
      "energy_market": 0.0,
      "infrastructure": 1.0,
      "historical_pattern": 0.0
    },
    "top_factors": ["anomaly_type_drop", "tanker_zscore_28d", "anomaly_flag"],
    "limitations": ["GDELT event coverage is sparse before July 2026..."]
  }
]
```

---

### `GET /api/risk/{corridor_id}`
Returns risk snapshot for a specific corridor.

**Path Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `corridor_id` | `string` | Yes | One of: `HORMUZ`, `BAB_EL_MANDEB`, `SUEZ`, `RED_SEA` |

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `date` | `string` | No | Target date (YYYY-MM-DD) |

**Error Responses**
| Code | Reason |
| :--- | :--- |
| `400` | Invalid date format |
| `404` | Unknown corridor |
| `503` | Model artifacts missing |

---

### `GET /api/events`
Returns all normalized geopolitical events (GDELT + OFAC SDN).

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `start_date` | `string` | No | Filter start date (YYYY-MM-DD) |
| `end_date` | `string` | No | Filter end date (YYYY-MM-DD) |
| `limit` | `integer` | No | Max events (1–1000, default 100) |

**Response Schema** (array of GeopoliticalEventResponse)
```json
[
  {
    "event_id": "abc123",
    "event_date": "2024-01-15",
    "source": "GDELT",
    "event_type": "tanker attack",
    "corridor_id": "BAB_EL_MANDEB",
    "text_reference": "Houthi forces attack commercial vessel...",
    "source_url": "https://..."
  }
]
```

---

### `GET /api/events/{corridor_id}`
Returns corridor-specific geopolitical events. Same query params as `/api/events`.

**Error Responses**
| Code | Reason |
| :--- | :--- |
| `404` | Unknown corridor |

---

### `GET /api/traffic/{corridor_id}`
Returns IMF PortWatch daily transit observations with anomaly flags.

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `start_date` | `string` | No | Start date filter |
| `end_date` | `string` | No | End date filter |
| `limit` | `integer` | No | Max observations (1–1000, default 90) |

**Response Schema** (array of TrafficObservationResponse)
```json
[
  {
    "date": "2026-08-16",
    "corridor_id": "HORMUZ",
    "vessel_count": 82,
    "tanker_count": 42,
    "cargo_count": 31,
    "anomaly_flag": false,
    "anomaly_type": "NORMAL",
    "data_availability": "OBSERVED"
  }
]
```

**Error Responses**
| Code | Reason |
| :--- | :--- |
| `404` | Unknown corridor or no observations |

---

### `GET /api/infrastructure`
Returns India's crude-oil supply chain infrastructure nodes (refineries, ports, SPR facilities).

**Response Schema** (array of InfrastructureNodeResponse)
```json
[
  {
    "facility_id": "6968454d524e5395",
    "name": "Mundra Port",
    "facility_type": "port",
    "operator": "Adani Ports & SEZ",
    "country": "India",
    "state": "Gujarat",
    "latitude": 22.73,
    "longitude": 69.70,
    "capacity": null,
    "unit": "MMTPA"
  }
]
```

---

### `GET /api/metrics`
Returns Phase 4 model comparison metrics from the training evaluation report.

**Response Schema**
```json
{
  "timestamp": "...",
  "results": {
    "HORMUZ": {
      "XGBoost": {
        "validation": {"roc_auc": 1.0, "pr_auc": 1.0, ...},
        "test": {"roc_auc": 1.0, ...}
      }
    }
  },
  "best_per_corridor": {
    "HORMUZ": {"model": "XGBoost", "test_roc_auc": 1.0}
  }
}
```

---

### `GET /api/model-info`
Returns model card for a specific corridor's trained classifier.

**Query Parameters**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `corridor_id` | `string` | No | One of `HORMUZ`, `BAB_EL_MANDEB`, `SUEZ` (default: `HORMUZ`) |

**Error Responses**
| Code | Reason |
| :--- | :--- |
| `404` | No model trained for corridor (e.g. RED_SEA) |
| `503` | Model registry not found |
