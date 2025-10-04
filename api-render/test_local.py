#!/usr/bin/env python3
"""
Local Testing Script for Phase 2b Architecture
Verifies all refactoring changes work correctly before Render deployment
"""

import sys
import os
import time
import subprocess
import requests
from datetime import datetime

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'

def print_header(text):
    """Print colored header"""
    print(f"\n{BLUE}{'='*60}{RESET}")
    print(f"{BLUE}{text}{RESET}")
    print(f"{BLUE}{'='*60}{RESET}\n")

def print_success(text):
    """Print success message"""
    print(f"{GREEN}✅ {text}{RESET}")

def print_error(text):
    """Print error message"""
    print(f"{RED}❌ {text}{RESET}")

def print_info(text):
    """Print info message"""
    print(f"{YELLOW}ℹ️  {text}{RESET}")

# Test results tracker
results = {
    'passed': 0,
    'failed': 0,
    'errors': []
}

def test_static_imports():
    """Phase 1: Test all imports load correctly"""
    print_header("Phase 1: Static Checks")

    try:
        # Test 1: Import main modules
        print_info("Testing imports...")
        sys.path.insert(0, '.')

        from app.core.database import get_db, get_supabase_client
        print_success("Import: app.core.database")
        results['passed'] += 1

        from app.logging import get_logger
        print_success("Import: app.logging")
        results['passed'] += 1

        from app.middleware import configure_middleware
        print_success("Import: app.middleware")
        results['passed'] += 1

        from app.core.lifespan import create_lifespan_manager
        print_success("Import: app.core.lifespan")
        results['passed'] += 1

        # Test 2: Verify singleton unification
        print_info("Testing singleton pattern...")
        if get_db == get_supabase_client:
            print_success("Singleton: get_db and get_supabase_client unified")
            results['passed'] += 1
        else:
            print_error("Singleton: Functions not unified")
            results['failed'] += 1
            results['errors'].append("Singleton pattern not unified")

        # Test 3: Check lru_cache decorator
        if hasattr(get_db, '__wrapped__'):
            print_success("Singleton: @lru_cache decorator detected")
            results['passed'] += 1
        else:
            print_info("Singleton: No lru_cache (might be OK)")

        # Test 4: Compile main.py
        print_info("Compiling main.py...")
        import py_compile
        py_compile.compile('main.py', doraise=True)
        print_success("Compile: main.py compiles successfully")
        results['passed'] += 1

        # Test 5: Import main and count routers
        print_info("Checking router registration...")
        import main
        router_count = 0
        if hasattr(main, 'app'):
            # Count registered routes (approximate)
            router_count = len([r for r in main.app.routes if hasattr(r, 'path')])
            print_success(f"Routers: {router_count} routes registered")
            results['passed'] += 1

        return True

    except Exception as e:
        print_error(f"Static checks failed: {e}")
        results['failed'] += 1
        results['errors'].append(f"Static checks: {str(e)}")
        return False

def test_server_startup():
    """Phase 2: Test server starts without errors"""
    print_header("Phase 2: Server Startup Test")

    try:
        print_info("Starting server on port 8001...")

        # Start server in background
        process = subprocess.Popen(
            [sys.executable, 'main.py'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd='.',
            env={**os.environ, 'PORT': '8001'}
        )

        # Wait for startup
        print_info("Waiting 5 seconds for server startup...")
        time.sleep(5)

        # Check if process is running
        if process.poll() is None:
            print_success("Server: Started successfully on port 8001")
            results['passed'] += 1
            return process
        else:
            stdout, stderr = process.communicate()
            print_error("Server: Failed to start")
            print_error(f"STDOUT: {stdout.decode()[:200]}")
            print_error(f"STDERR: {stderr.decode()[:200]}")
            results['failed'] += 1
            results['errors'].append("Server failed to start")
            return None

    except Exception as e:
        print_error(f"Server startup failed: {e}")
        results['failed'] += 1
        results['errors'].append(f"Server startup: {str(e)}")
        return None

def test_endpoints(base_url="http://localhost:8001"):
    """Phase 3: Test key endpoints respond"""
    print_header("Phase 3: Endpoint Tests")

    endpoints = [
        ('GET', '/', 'Root endpoint'),
        ('GET', '/health', 'Health check'),
        ('GET', '/ready', 'Readiness check'),
        ('GET', '/alive', 'Liveness check'),
        ('GET', '/metrics', 'System metrics'),
    ]

    for method, path, description in endpoints:
        try:
            print_info(f"Testing {method} {path}...")
            response = requests.get(f"{base_url}{path}", timeout=5)

            if response.status_code == 200:
                print_success(f"{method} {path}: {response.status_code} OK ({description})")
                results['passed'] += 1
            else:
                print_error(f"{method} {path}: {response.status_code} ({description})")
                results['failed'] += 1
                results['errors'].append(f"{method} {path} returned {response.status_code}")

        except requests.exceptions.ConnectionError:
            print_error(f"{method} {path}: Connection refused (server not running)")
            results['failed'] += 1
            results['errors'].append(f"{method} {path} connection refused")
        except Exception as e:
            print_error(f"{method} {path}: {str(e)}")
            results['failed'] += 1
            results['errors'].append(f"{method} {path}: {str(e)}")

def cleanup_server(process):
    """Phase 4: Cleanup - stop server"""
    print_header("Phase 4: Cleanup")

    if process and process.poll() is None:
        print_info("Stopping server...")
        process.terminate()
        try:
            process.wait(timeout=5)
            print_success("Cleanup: Server stopped successfully")
            results['passed'] += 1
        except subprocess.TimeoutExpired:
            process.kill()
            print_info("Cleanup: Server force killed")
    else:
        print_info("Cleanup: Server already stopped")

def print_summary():
    """Print test summary"""
    print_header("Test Summary")

    total = results['passed'] + results['failed']
    pass_rate = (results['passed'] / total * 100) if total > 0 else 0

    print(f"Total Tests: {total}")
    print(f"{GREEN}Passed: {results['passed']}{RESET}")
    print(f"{RED}Failed: {results['failed']}{RESET}")
    print(f"Pass Rate: {pass_rate:.1f}%")

    if results['errors']:
        print(f"\n{RED}Errors:{RESET}")
        for error in results['errors']:
            print(f"  - {error}")

    if results['failed'] == 0:
        print(f"\n{GREEN}{'='*60}{RESET}")
        print(f"{GREEN}🎉 All tests passed! Ready for Render deployment.{RESET}")
        print(f"{GREEN}{'='*60}{RESET}\n")
        return 0
    else:
        print(f"\n{RED}{'='*60}{RESET}")
        print(f"{RED}⚠️  Some tests failed. Please fix before deployment.{RESET}")
        print(f"{RED}{'='*60}{RESET}\n")
        return 1

def main():
    """Run all tests"""
    print(f"\n{BLUE}🧪 Phase 2b Local Testing{RESET}")
    print(f"{BLUE}Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{RESET}")

    # Phase 1: Static checks
    if not test_static_imports():
        print_error("Static checks failed. Aborting server tests.")
        return print_summary()

    # Phase 2: Server startup
    server_process = test_server_startup()

    # Phase 3: Endpoint tests (only if server started)
    if server_process:
        # Give server a moment to fully initialize
        time.sleep(2)
        test_endpoints()

    # Phase 4: Cleanup
    cleanup_server(server_process)

    # Print summary and exit
    return print_summary()

if __name__ == "__main__":
    try:
        exit_code = main()
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n{YELLOW}Test interrupted by user{RESET}")
        sys.exit(1)
    except Exception as e:
        print_error(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
