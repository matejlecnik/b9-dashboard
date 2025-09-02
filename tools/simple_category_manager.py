#!/usr/bin/env python3
"""
Simplified Category Manager for OnlyFans Agency
3 categories: Ok, No Seller, Non Related
"""

import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

class SimpleCategoryManager:
    def __init__(self):
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')
        self.supabase = create_client(supabase_url, supabase_key)
    
    def show_uncategorized_subreddits(self, limit=20):
        """Show subreddits that need categorization (NULL category)"""
        try:
            response = self.supabase.table('subreddits').select(
                'name, display_name_prefixed, subscribers, category, last_scraped_at'
            ).is_('category', 'null').order('subscribers', desc=True).limit(limit).execute()
            
            print(f"\n📋 UNCATEGORIZED SUBREDDITS (Need Manual Review)")
            print("="*80)
            print("⚪ NULL = New discovery, needs categorization")
            print("🟢 Ok = Good for OnlyFans marketing (WILL BE PROCESSED)")
            print("🟡 No Seller = Doesn't allow selling content (EXCLUDED)")
            print("🔴 Non Related = Completely irrelevant (EXCLUDED)")
            print("="*80)
            
            for i, sub in enumerate(response.data, 1):
                name = sub['name']
                subscribers = sub['subscribers'] or 'Unknown'
                analyzed = "✅ Analyzed" if sub['last_scraped_at'] else "⏳ Pending"
                category = sub['category']
                if category is None:
                    category_emoji = '⚪'
                    category_display = 'NULL'
                else:
                    category_emoji = {'Ok': '🟢', 'No Seller': '🟡', 'Non Related': '🔴'}[category]
                    category_display = category
                
                print(f"{i:2d}. r/{name:<25} | {str(subscribers):>8} subs | {category_emoji} {category_display:<12} | {analyzed}")
            
            return response.data
            
        except Exception as e:
            print(f"❌ Error: {e}")
            return []
    
    def categorize_subreddit(self, subreddit_name: str, category: str):
        """Update category for a subreddit"""
        valid_categories = ['Ok', 'No Seller', 'Non Related']
        
        if category not in valid_categories:
            print(f"❌ Invalid category. Use: {', '.join(valid_categories)}")
            return False
        
        try:
            response = self.supabase.table('subreddits').update({
                'category': category
            }).eq('name', subreddit_name).execute()
            
            if response.data:
                status_emoji = {'Ok': '🟢', 'No Seller': '🟡', 'Non Related': '🔴'}[category]
                print(f"✅ {status_emoji} Updated r/{subreddit_name} → {category}")
                
                if category == 'Non Related':
                    print(f"   ⚠️ r/{subreddit_name} will now be EXCLUDED from all processing")
                elif category == 'No Seller':
                    print(f"   ⚠️ r/{subreddit_name} marked as no-seller community")
                
                return True
            else:
                print(f"❌ Subreddit r/{subreddit_name} not found")
                return False
                
        except Exception as e:
            print(f"❌ Error updating category: {e}")
            return False
    
    def bulk_categorize(self, updates: dict):
        """Bulk update categories"""
        print(f"🔄 Bulk updating {len(updates)} subreddits...")
        
        success_count = 0
        for subreddit_name, category in updates.items():
            if self.categorize_subreddit(subreddit_name, category):
                success_count += 1
        
        print(f"\n✅ Successfully updated {success_count}/{len(updates)} subreddits")
        self.show_summary()
    
    def show_summary(self):
        """Show category summary"""
        try:
            response = self.supabase.table('subreddits').select('category').execute()
            
            categories = {}
            for item in response.data:
                category = item['category']
                categories[category] = categories.get(category, 0) + 1
            
            total = sum(categories.values())
            
            print(f"\n📊 CATEGORY SUMMARY")
            print("="*50)
            print(f"📋 Total Subreddits: {total}")
            
            # Handle NULL category first
            null_count = categories.get(None, 0)
            if null_count > 0:
                percentage = (null_count / total * 100) if total > 0 else 0
                print(f"⚪ Uncategorized: {null_count} subreddits ({percentage:.1f}%) (NEEDS REVIEW)")
            
            for category in ['Ok', 'No Seller', 'Non Related']:
                count = categories.get(category, 0)
                percentage = (count / total * 100) if total > 0 else 0
                emoji = {'Ok': '🟢', 'No Seller': '🟡', 'Non Related': '🔴'}[category]
                
                status = ""
                if category == 'Ok':
                    status = "(ACTIVE PROCESSING)"
                elif category == 'No Seller':
                    status = "(EXCLUDED)"
                elif category == 'Non Related':
                    status = "(EXCLUDED)"
                
                print(f"{emoji} {category}: {count} subreddits ({percentage:.1f}%) {status}")
            
            # Processing summary
            will_process = categories.get('Ok', 0)
            excluded = categories.get('Non Related', 0) + categories.get('No Seller', 0)
            needs_review = categories.get(None, 0)
            
            print(f"\n🎯 PROCESSING IMPACT:")
            print(f"✅ Will Process: {will_process} subreddits")
            print(f"❌ Excluded: {excluded} subreddits")
            print(f"⚪ Needs Review: {needs_review} subreddits")
            print(f"📈 Processing Rate: {will_process/total*100:.1f}% of total")
            
        except Exception as e:
            print(f"❌ Error: {e}")

def main():
    """Interactive category management"""
    manager = SimpleCategoryManager()
    
    while True:
        print(f"\n🏷️ SIMPLIFIED CATEGORY MANAGER")
        print("="*50)
        print("1. Show subreddits to categorize")
        print("2. Categorize single subreddit")
        print("3. Show category summary")
        print("4. Bulk categorize examples")
        print("5. Exit")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == "1":
            limit = input("How many to show? (default 20): ").strip()
            limit = int(limit) if limit.isdigit() else 20
            manager.show_uncategorized_subreddits(limit)
        
        elif choice == "2":
            subreddit = input("Subreddit name (without r/): ").strip()
            print("\nCategories:")
            print("🟢 Ok - Good for OnlyFans marketing")
            print("🟡 No Seller - Doesn't allow selling content")
            print("🔴 Non Related - Completely irrelevant")
            
            category = input("Category (Ok/No Seller/Non Related): ").strip()
            manager.categorize_subreddit(subreddit, category)
        
        elif choice == "3":
            manager.show_summary()
        
        elif choice == "4":
            # Example bulk updates
            examples = {
                'porn_gifs': 'Non Related',
                'HoesOnTheGo': 'Non Related',
                'HomewreckerGonewildd': 'Non Related',
                'politics': 'Non Related',
                'news': 'Non Related'
            }
            print(f"Example bulk update: {examples}")
            confirm = input("Apply examples? (y/n): ").strip().lower()
            if confirm == 'y':
                manager.bulk_categorize(examples)
        
        elif choice == "5":
            break
        
        else:
            print("❌ Invalid choice")

if __name__ == "__main__":
    main()
