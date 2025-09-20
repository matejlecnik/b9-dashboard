# Middleware - Request Processing Pipeline

## Overview
This directory contains FastAPI middleware for handling cross-cutting concerns like CORS, error handling, and request processing.

## TODO List
- [x] ~~Add request rate limiting middleware~~ (Completed)
- [x] ~~Implement request ID tracking for better debugging~~ (Completed)
- [x] ~~Add request/response logging middleware~~ (Completed)

## Current Errors
- No known errors at this time

## Potential Improvements
- Could add authentication middleware when user system is implemented
- Consider adding request validation middleware
- Add metrics collection middleware for monitoring

## Files

### __init__.py
Empty initialization file for the middleware module.

### cors.py
**CORS Configuration Middleware**

Handles Cross-Origin Resource Sharing settings:
- Allows requests from dashboard frontend (localhost:3000 and Vercel deployments)
- Configures allowed methods: GET, POST, PUT, DELETE, OPTIONS
- Sets allowed headers for API communication
- Enables credentials for authenticated requests

**Key Configuration:**
```python
allowed_origins = [
    "http://localhost:3000",
    "https://*.vercel.app",
    "https://b9-dashboard.vercel.app"
]
```

## Integration with Main App

The middleware is applied in `main.py` during app initialization:
1. CORS middleware - Handles cross-origin requests
2. GZip middleware - Compresses responses
3. TrustedHost middleware - Security for host headers

## Error Handling Pattern

All middleware follows the FastAPI error handling pattern:
- Catches exceptions during request processing
- Logs errors to system_logs table
- Returns appropriate HTTP status codes
- Provides user-friendly error messages

## Performance Considerations

- Middleware is executed for every request
- Keep middleware lightweight to avoid latency
- Use async operations where possible
- Consider caching for repeated operations