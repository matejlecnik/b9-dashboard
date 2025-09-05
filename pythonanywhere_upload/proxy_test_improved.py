#!/usr/bin/env python3
"""
Improved Proxy Test Script
Tests each proxy 3 times and requires at least 1 success for the test to pass
"""

import requests
import json
import time
import random
from datetime import datetime
from fake_useragent import UserAgent

def test_proxy_configuration():
    """Test all 3 proxy configurations with improved resilience"""
    
    print("🔍 IMPROVED PROXY CONFIGURATION TEST")
    print("=" * 60)
    print(f"⏰ Started at: {datetime.now()}")
    print("🎯 Testing strategy: 3 attempts per proxy, require ≥1 success")
    print("🌐 Using fake-useragent for realistic headers")
    print()
    
    # Initialize fake-useragent
    try:
        ua_generator = UserAgent()
        print("✅ fake-useragent initialized successfully")
    except Exception as e:
        print(f"⚠️ fake-useragent initialization failed: {e}. Will use fallback user agents.")
        ua_generator = None
    print()
    
    # Updated proxy configurations with unified format (auth embedded in proxy string)
    proxy_configs = [
        {
            'service': 'beyondproxy',
            'proxy': '9b1a4c15700a:654fa0b97850@proxy.beyondproxy.io:12321',
            'auth': None,  # Auth already embedded in proxy string
            'display_name': 'BeyondProxy'
        },
        {
            'service': 'nyronproxy',
            'proxy': 'uxJNWsLXw3XnJE-zone-resi:cjB3tG2ij@residential-ww.nyronproxies.com:16666',
            'auth': None,  # Auth now embedded in proxy string
            'display_name': 'NyronProxy'
        },
        {
            'service': 'rapidproxy',
            'proxy': 'admin123-residential-GLOBAL:admin123@us.rapidproxy.io:5001',
            'auth': None,  # Auth now embedded in proxy string
            'display_name': 'RapidProxy'
        }
    ]
    
    results = {}
    
    for i, config in enumerate(proxy_configs):
        service_name = config['display_name']
        print(f"🔵 Testing {service_name} ({i+1}/3)")
        print("-" * 40)
        
        # Create proxy dict for requests (all proxies now have auth embedded)
        proxy_str = config['proxy']
        proxies = {"http": f"http://{proxy_str}", "https": f"http://{proxy_str}"}
        
        # Test each proxy 3 times
        connectivity_attempts = []
        reddit_attempts = []
        
        for attempt in range(3):
            print(f"📍 Attempt {attempt+1}/3: Testing connectivity...")
            conn_result = test_connectivity(proxies, service_name, attempt+1, ua_generator)
            connectivity_attempts.append(conn_result['success'])
            
            print(f"🔴 Attempt {attempt+1}/3: Testing Reddit API...")
            reddit_result = test_reddit_api(proxies, service_name, attempt+1, ua_generator)
            reddit_attempts.append(reddit_result['success'])
            
            # Small delay between attempts
            if attempt < 2:
                time.sleep(2)
        
        # Evaluate results: at least 1 success required
        connectivity_passed = any(connectivity_attempts)
        reddit_passed = any(reddit_attempts)
        overall_passed = connectivity_passed and reddit_passed
        
        conn_successes = sum(connectivity_attempts)
        reddit_successes = sum(reddit_attempts)
        
        # Store results
        results[service_name] = {
            'connectivity_passed': connectivity_passed,
            'reddit_passed': reddit_passed,
            'overall': overall_passed,
            'conn_successes': conn_successes,
            'reddit_successes': reddit_successes
        }
        
        if overall_passed:
            print(f"🎉 {service_name}: PASSED")
            print(f"   📡 Connectivity: {conn_successes}/3 successful")
            print(f"   🔴 Reddit API: {reddit_successes}/3 successful")
        else:
            print(f"❌ {service_name}: FAILED")
            print(f"   📡 Connectivity: {conn_successes}/3 successful {'❌' if not connectivity_passed else '✅'}")
            print(f"   🔴 Reddit API: {reddit_successes}/3 successful {'❌' if not reddit_passed else '✅'}")
        
        print()
        
        # Delay between different proxy services
        if i < len(proxy_configs) - 1:
            time.sleep(3)
    
    # Final Summary
    print("📋 FINAL RESULTS")
    print("=" * 60)
    
    all_working = True
    for service_name, result in results.items():
        status = "✅ WORKING" if result['overall'] else "❌ FAILED"
        print(f"{service_name:15} {status}")
        if not result['overall']:
            all_working = False
            conn_status = f"{result['conn_successes']}/3" + (" ✅" if result['connectivity_passed'] else " ❌")
            reddit_status = f"{result['reddit_successes']}/3" + (" ✅" if result['reddit_passed'] else " ❌")
            print(f"                 Connectivity: {conn_status}")
            print(f"                 Reddit API: {reddit_status}")
    
    print()
    if all_working:
        print("🎉 ALL PROXIES WORKING - Script can proceed!")
        print("✨ All proxies passed the resilience test (≥1/3 successes)")
        return True
    else:
        print("⚠️ SOME PROXIES FAILED - Script should NOT run!")
        print("🔧 Fix failing proxies before running the main script")
        return False

def generate_user_agent(ua_generator):
    """Generate a realistic user agent using fake-useragent"""
    # Extended fallback pool of realistic user agents 
    fallback_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0"
    ]
    
    # Prefer fake-useragent (80% chance)
    if ua_generator and random.random() < 0.80:
        try:
            rand = random.random()
            if rand < 0.30:
                return ua_generator.random
            elif rand < 0.50:
                return ua_generator.chrome
            elif rand < 0.70:
                return ua_generator.firefox
            elif rand < 0.85:
                return ua_generator.safari
            else:
                return ua_generator.edge
        except Exception:
            pass
    
    # Use fallback pool
    return random.choice(fallback_agents)

def test_connectivity(proxies, service_name, attempt_num, ua_generator):
    """Test proxy connectivity via Reddit API"""
    try:
        # Use Reddit's API for connectivity test with realistic user agent
        user_agent = generate_user_agent(ua_generator)
        response = requests.get(
            "https://www.reddit.com/api/v1/me.json",
            proxies=proxies,
            timeout=15,
            headers={'User-Agent': user_agent}
        )
        
        # Reddit API returns various status codes, but any response means proxy works
        if response.status_code in [200, 401, 403]:  # 401/403 are expected without auth
            print(f"   ✅ Success (HTTP {response.status_code})")
            return {'success': True, 'status': response.status_code}
        else:
            print(f"   ⚠️ Failed (HTTP {response.status_code})")
            return {'success': False, 'error': f"HTTP {response.status_code}"}
            
    except Exception as e:
        print(f"   ⚠️ Failed ({str(e)[:50]}...)")
        return {'success': False, 'error': str(e)}

def test_reddit_api(proxies, service_name, attempt_num, ua_generator):
    """Test Reddit API call (get user profile)"""
    try:
        # Test with a well-known Reddit user using realistic user agent
        user_agent = generate_user_agent(ua_generator)
        response = requests.get(
            "https://www.reddit.com/user/spez/about.json",
            proxies=proxies,
            timeout=15,
            headers={'User-Agent': user_agent}
        )
        
        if response.status_code == 200:
            data = response.json()
            if 'data' in data and 'name' in data['data']:
                username = data['data']['name']
                karma = data['data'].get('total_karma', 0)
                print(f"   ✅ Success (User: {username}, Karma: {karma})")
                return {'success': True, 'username': username, 'karma': karma}
            else:
                print(f"   ⚠️ Invalid response format")
                return {'success': False, 'error': "Invalid response format"}
        else:
            print(f"   ⚠️ Failed (HTTP {response.status_code})")
            return {'success': False, 'error': f"HTTP {response.status_code}"}
            
    except Exception as e:
        print(f"   ⚠️ Failed ({str(e)[:50]}...)")
        return {'success': False, 'error': str(e)}

if __name__ == "__main__":
    try:
        success = test_proxy_configuration()
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        exit(1)
