#!/usr/bin/env python3
"""
Test script for Smart Subreddit Filter system
Demonstrates filtering capabilities and integration with existing data
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from smart_subreddit_filter import SmartSubredditFilter
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

async def test_smart_filter():
    """Test the Smart Filter system with real and mock data"""
    
    print("🧠 Testing Smart Subreddit Filter System")
    print("=" * 60)
    
    # Initialize Supabase client
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_ANON_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Error: Supabase credentials not found in environment")
        return
    
    supabase = create_client(supabase_url, supabase_key)
    
    # Initialize Smart Filter
    smart_filter = SmartSubredditFilter(supabase)
    print(f"✅ Smart Filter initialized with {len(smart_filter.filter_keywords)} keyword categories")
    print(f"📋 Whitelist contains {len(smart_filter.whitelist)} subreddits")
    
    # Test with sample subreddits
    test_subreddits = [
        {
            'name': 'gonewild',
            'title': 'Gone Wild',
            'description': 'A place for open-minded Adult Redditors to show off',
            'public_description': 'Adult content subreddit',
            'rules_data': {'rule1': 'No sellers allowed', 'rule2': 'Verification required'}
        },
        {
            'name': 'programming',
            'title': 'Programming',
            'description': 'Computer Programming',
            'public_description': 'Discussion about programming and software development',
            'rules_data': {}
        },
        {
            'name': 'rateme',
            'title': 'Rate Me',
            'description': 'A place to get ratings on your appearance',
            'public_description': 'Rate and be rated on appearance',
            'rules_data': {}
        },
        {
            'name': 'SFWAmIHot',
            'title': 'SFW Am I Hot',
            'description': 'Safe for work rating subreddit',
            'public_description': 'SFW appearance rating',
            'rules_data': {}
        },
        {
            'name': 'OnlyFansBestEver',
            'title': 'OnlyFans Best Ever',
            'description': 'Share your OnlyFans content here',
            'public_description': 'OnlyFans promotion',
            'rules_data': {'rule1': 'No sellers banned here', 'rule2': 'Promote freely'}
        },
        {
            'name': 'gaybrosgw',
            'title': 'Gay Bros Gone Wild',
            'description': 'Gay men showing off',
            'public_description': 'Male focused adult content',
            'rules_data': {}
        }
    ]
    
    print("\n🔍 Testing individual subreddit filtering:")
    print("-" * 50)
    
    passed_subreddits = []
    filtered_subreddits = []
    
    for subreddit in test_subreddits:
        result = smart_filter.filter_subreddit(subreddit)
        
        status_emoji = {
            'whitelist': '✅',
            'passed': '🔍', 
            'filtered': '🚫'
        }.get(result['filter_status'], '❓')
        
        print(f"{status_emoji} r/{result['name']}: {result['filter_status']}")
        if result.get('filter_reason'):
            print(f"   📝 Reason: {result['filter_reason']}")
        if result.get('filter_keywords'):
            print(f"   🏷️ Keywords: {', '.join(result['filter_keywords'])}")
        print()
        
        if result['filter_status'] in ['passed', 'whitelist']:
            passed_subreddits.append(result)
        else:
            filtered_subreddits.append(result)
    
    print(f"📊 Test Results Summary:")
    print(f"   • Passed for review: {len(passed_subreddits)}")
    print(f"   • Filtered out: {len(filtered_subreddits)}")
    print(f"   • Filter efficiency: {len(filtered_subreddits) / len(test_subreddits) * 100:.1f}% reduction")
    
    # Test batch filtering
    print(f"\n🏭 Testing batch filtering:")
    print("-" * 50)
    
    passed_batch, filtered_batch = smart_filter.batch_filter_subreddits(test_subreddits)
    print(f"✅ Batch filtering complete: {len(passed_batch)} passed, {len(filtered_batch)} filtered")
    
    # Get filter statistics
    print(f"\n📈 Current Filter Statistics:")
    print("-" * 50)
    
    try:
        stats = smart_filter.get_filter_stats()
        if 'error' not in stats:
            print(f"📊 Total subreddits in database: {stats.get('total_subreddits', 0):,}")
            print(f"📋 Whitelist count: {stats.get('whitelist_count', 0):,}")
            print(f"🚫 Seller bans detected: {stats.get('seller_bans_detected', 0):,}")
            print(f"✅ Verification required: {stats.get('verification_required', 0):,}")
            
            by_status = stats.get('by_status', {})
            for status, count in by_status.items():
                print(f"   • {status}: {count:,}")
                
            efficiency = stats.get('filter_efficiency', {})
            if efficiency.get('total_processed', 0) > 0:
                print(f"\n🎯 Filter Efficiency:")
                print(f"   • Total processed: {efficiency['total_processed']:,}")
                print(f"   • Filtered out: {efficiency.get('filtered_percentage', '0')}%")
                print(f"   • Passed for review: {efficiency.get('passed_percentage', '0')}%")
                print(f"   • Whitelisted: {efficiency.get('whitelist_percentage', '0')}%")
        else:
            print(f"❌ Error getting stats: {stats['error']}")
    except Exception as e:
        print(f"❌ Error getting filter statistics: {e}")
    
    # Test learning pattern recording
    print(f"\n🧮 Testing learning pattern recording:")
    print("-" * 50)
    
    for result in [passed_subreddits[0]] if passed_subreddits else []:
        try:
            smart_filter.record_learning_pattern(
                subreddit_name=result['name'],
                predicted_filter=False,  # We predicted it would pass
                actual_decision='Ok',     # User marked it as Ok (correct prediction)
                keywords_matched=result.get('filter_keywords', []),
                confidence_score=0.5
            )
            print(f"📝 Recorded learning pattern for r/{result['name']}")
        except Exception as e:
            print(f"❌ Error recording learning pattern: {e}")
    
    print(f"\n✅ Smart Filter testing complete!")
    print("=" * 60)
    
    # Integration suggestions
    print(f"\n💡 Integration Instructions:")
    print("-" * 50)
    print("1. 🔄 Run the filtered scraper:")
    print("   python3 filtered_reddit_scraper.py")
    print()
    print("2. 🌐 View filter management dashboard:")
    print("   Navigate to /filters in your dashboard")
    print()
    print("3. 🚀 Deploy to production:")
    print("   - Update your main scraper to use FilteredProxyEnabledMultiScraper")
    print("   - Monitor filter accuracy via the dashboard")
    print("   - Adjust keyword weights based on learning patterns")
    print()
    print("4. 📊 Expected results:")
    print(f"   - {len(filtered_subreddits) / len(test_subreddits) * 100:.0f}% reduction in manual review workload")
    print("   - Automatic categorization of seller bans")
    print("   - Preservation of high-quality subreddits via whitelist")

if __name__ == "__main__":
    asyncio.run(test_smart_filter())