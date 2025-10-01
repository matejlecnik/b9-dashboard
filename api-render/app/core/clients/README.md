# API Client Pool Management

┌─ CLIENT POOL STATUS ────────────────────────────────────┐
│ ● OPERATIONAL │ ████████████████████ 100% ACTIVE       │
└─────────────────────────────────────────────────────────┘

## Navigation

```json
{
  "parent": "../README.md",
  "current": "clients/README.md",
  "files": [
    {"path": "api_pool.py", "desc": "Connection pool manager", "status": "STABLE"},
    {"path": "__init__.py", "desc": "Module exports", "status": "OK"}
  ]
}
```

## Pool Configuration

```json
{
  "connection_pool": {
    "type": "Thread-safe pool",
    "min_connections": 5,
    "max_connections": 10,
    "idle_timeout": 300,
    "max_age": 3600,
    "validation": true
  },
  "client_settings": {
    "timeout": 30,
    "retries": 3,
    "backoff_factor": 2,
    "keepalive": true
  },
  "performance": {
    "avg_acquisition_time": "1ms",
    "avg_release_time": "0.5ms",
    "connection_reuse_rate": "85%",
    "pool_efficiency": "92%"
  }
}
```

## Connection Statistics

```json
{
  "current_state": {
    "active_connections": 7,
    "idle_connections": 3,
    "total_connections": 10,
    "pending_requests": 0,
    "pool_utilization": "70%"
  },
  "last_24h": {
    "connections_created": 45,
    "connections_destroyed": 42,
    "reuse_count": 8945,
    "timeout_errors": 3,
    "validation_failures": 1
  }
}
```

## Health Monitoring

```json
{
  "connection_health": {
    "healthy_connections": 10,
    "unhealthy_connections": 0,
    "last_health_check": "2024-01-29T12:00:00Z",
    "check_interval": 60
  },
  "performance_metrics": {
    "avg_request_time": "180ms",
    "p95_request_time": "450ms",
    "p99_request_time": "800ms",
    "error_rate": "0.03%"
  }
}
```

## Usage Example

```python
from app.core.clients import api_pool

## Get client from pool
async with api_pool.get_client() as client:
    response = await client.get("/api/data")
    # Client automatically returns to pool

## Manual management
client = api_pool.acquire()
try:
    response = client.get("/api/data")
finally:
    api_pool.release(client)
```

---

_Client Pool Version: 2.0.0 | Status: Stable | Updated: 2024-01-29_
_Navigate: [← core/](../README.md) | [→ config/](../config/README.md)_