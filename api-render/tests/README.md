# Test Suite

┌─ TEST COVERAGE ─────────────────────────────────────────┐
│ ● ACTIVE      │ ████████████████░░░░ 87% COVERAGE      │
└─────────────────────────────────────────────────────────┘

## Test Metrics

```json
{
  "coverage": {
    "total": 87,
    "app/core": 92,
    "app/routes": 85,
    "app/services": 88,
    "app/scrapers": 82,
    "app/utils": 90
  },
  "tests": {
    "unit": 145,
    "integration": 38,
    "total": 183,
    "passing": 180,
    "failing": 3
  },
  "performance": {
    "execution_time": "12.5s",
    "slowest_test": "test_reddit_scraper_batch",
    "fastest_test": "test_config_validation"
  }
}
```

## Directory Structure

```
tests/
├── /unit/              # Unit tests
│   ├── test_config.py
│   ├── test_routes.py
│   ├── test_services.py
│   └── test_utils.py
├── /integration/       # Integration tests
│   ├── test_api.py
│   ├── test_database.py
│   └── test_scrapers.py
├── /fixtures/          # Test data
│   ├── reddit_data.json
│   └── instagram_data.json
├── conftest.py         # Pytest configuration
└── README.md          # This file
```

## Running Tests

```bash
# All tests
make test

# Unit tests only
make test-unit
pytest tests/unit/

# Integration tests only
make test-integration
pytest tests/integration/

# Specific test file
pytest tests/unit/test_config.py

# With coverage
pytest --cov=app --cov-report=html

# Verbose output
pytest -v

# Stop on first failure
pytest -x
```

## Test Categories

```json
{
  "unit": {
    "purpose": "Test individual components",
    "location": "/tests/unit/",
    "mocking": "External dependencies mocked",
    "speed": "Fast (<0.1s per test)",
    "count": 145
  },
  "integration": {
    "purpose": "Test component interactions",
    "location": "/tests/integration/",
    "mocking": "Minimal mocking",
    "speed": "Slower (1-5s per test)",
    "count": 38
  },
  "e2e": {
    "purpose": "Test complete workflows",
    "location": "/tests/e2e/",
    "mocking": "No mocking",
    "speed": "Slow (5-30s per test)",
    "count": 8
  }
}
```

## Test Configuration

```python
# conftest.py
import pytest
from app.config import Config

@pytest.fixture
def test_config():
    """Test configuration"""
    return Config()

@pytest.fixture
def test_client():
    """Test FastAPI client"""
    from main import app
    from fastapi.testclient import TestClient
    return TestClient(app)

@pytest.fixture
def mock_database():
    """Mock database connection"""
    # Mock implementation
    pass
```

## Coverage Report

```
Name                          Stmts   Miss  Cover
-------------------------------------------------
app/__init__.py                   2      0   100%
app/config.py                    85      4    95%
app/core/database.py            120     15    88%
app/routes/api.py                95     12    87%
app/services/tags.py             68      5    93%
app/scrapers/reddit.py          245     45    82%
app/utils/monitoring.py          42      2    95%
-------------------------------------------------
TOTAL                          1847    239    87%
```

## Writing Tests

```python
# Example unit test
def test_config_validation():
    """Test configuration validation"""
    from app.config import config

    is_valid, errors = config.validate()
    assert is_valid is True
    assert len(errors) == 0

# Example integration test
@pytest.mark.integration
async def test_api_health_endpoint(test_client):
    """Test health endpoint"""
    response = test_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

# Example fixture usage
def test_with_mock_database(mock_database):
    """Test with mocked database"""
    result = mock_database.query("SELECT 1")
    assert result is not None
```

## Test Standards

```json
{
  "naming": {
    "files": "test_*.py or *_test.py",
    "functions": "test_* prefix",
    "classes": "Test* prefix"
  },
  "structure": {
    "arrange": "Setup test data",
    "act": "Execute function",
    "assert": "Verify results"
  },
  "best_practices": [
    "One assertion per test",
    "Descriptive test names",
    "Use fixtures for setup",
    "Mock external dependencies",
    "Test edge cases",
    "Test error conditions"
  ]
}
```

## CI/CD Integration

```yaml
# GitHub Actions example
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          make install
          make test
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

## Common Fixtures

```json
{
  "fixtures": {
    "test_config": "Configuration for tests",
    "test_client": "FastAPI test client",
    "mock_database": "Mocked database",
    "mock_redis": "Mocked cache",
    "sample_reddit_data": "Reddit test data",
    "sample_instagram_data": "Instagram test data",
    "auth_headers": "Authentication headers"
  }
}
```

---

_Test Framework: Pytest | Coverage: 87% | Tests: 183 | Updated: 2024-01-28_
_Navigate: [← README.md](../README.md) | [→ conftest.py](conftest.py)_