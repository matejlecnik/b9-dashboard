#!/usr/bin/env python3
"""Test Cloudflare R2 setup"""
import os
import sys


sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=" * 60)
print("Cloudflare R2 Setup Test")
print("=" * 60)
print()

# Test 1: Check environment variables
print("Test 1: Checking environment variables...")
from dotenv import load_dotenv


load_dotenv()

required_vars = [
    'R2_ACCOUNT_ID',
    'R2_ACCESS_KEY_ID',
    'R2_SECRET_ACCESS_KEY',
    'R2_BUCKET_NAME'
]

missing = []
for var in required_vars:
    value = os.getenv(var)
    if value:
        # Show first 10 chars only for security
        masked = value[:10] + "..." if len(value) > 10 else value
        print(f"  ✅ {var}: {masked}")
    else:
        print(f"  ❌ {var}: NOT SET")
        missing.append(var)

if missing:
    print(f"\n❌ Missing variables: {', '.join(missing)}")
    print("Please add them to your .env file")
    sys.exit(1)

print()

# Test 2: Load R2 config
print("Test 2: Loading R2 configuration...")
try:
    from app.core.config.r2_config import r2_config

    is_valid, error = r2_config.validate_config()
    if is_valid:
        print("  ✅ R2 config valid")
        print(f"  ✅ Enabled: {r2_config.ENABLED}")
        print(f"  ✅ Bucket: {r2_config.BUCKET_NAME}")
    else:
        print(f"  ❌ Config error: {error}")
        sys.exit(1)
except Exception as e:
    print(f"  ❌ Failed to load config: {e}")
    sys.exit(1)

print()

# Test 3: Connect to R2
print("Test 3: Connecting to R2...")
try:
    from app.utils.media_storage import R2Client

    client = R2Client().get_client()
    print("  ✅ R2 client created successfully")

    # Test bucket access
    response = client.head_bucket(Bucket=r2_config.BUCKET_NAME)
    print(f"  ✅ Bucket '{r2_config.BUCKET_NAME}' accessible")

except Exception as e:
    print(f"  ❌ Connection failed: {e}")
    print("\nTroubleshooting:")
    print("  1. Check your credentials are correct")
    print("  2. Verify bucket name matches Cloudflare dashboard")
    print("  3. Ensure API token has Read & Write permissions")
    sys.exit(1)

print()

# Test 4: Upload test file
print("Test 4: Testing upload...")
try:
    from app.utils.media_storage import upload_to_r2

    test_data = b"Hello from B9 Dashboard!"
    test_key = "test/hello.txt"

    url = upload_to_r2(
        file_data=test_data,
        object_key=test_key,
        content_type='text/plain'
    )

    print("  ✅ Upload successful!")
    print(f"  ✅ File URL: {url}")

    # Try to delete test file
    try:
        client.delete_object(Bucket=r2_config.BUCKET_NAME, Key=test_key)
        print("  ✅ Test file cleaned up")
    except:
        print("  ⚠️  Could not delete test file (not a problem)")

except Exception as e:
    print(f"  ❌ Upload failed: {e}")
    sys.exit(1)

print()

# Test 5: Check FFmpeg
print("Test 5: Checking FFmpeg installation...")
import subprocess


try:
    result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
    if result.returncode == 0:
        version = result.stdout.split('\n')[0]
        print(f"  ✅ FFmpeg installed: {version}")
    else:
        print("  ❌ FFmpeg not working")
        sys.exit(1)
except FileNotFoundError:
    print("  ❌ FFmpeg not installed")
    print("\nInstall FFmpeg:")
    print("  macOS: brew install ffmpeg")
    print("  Linux: sudo apt-get install ffmpeg")
    sys.exit(1)

print()
print("=" * 60)
print("🎉 ALL TESTS PASSED!")
print("=" * 60)
print()
print("Your R2 storage is ready to use!")
print("Next: Run Instagram scraper to test full workflow")
print()
