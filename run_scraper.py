#!/usr/bin/env python3
"""
OnlyFans Agency Reddit Scraper Launcher
Easy access to all scraper functionality from root directory.
"""

import os
import sys
import subprocess

def main():
    """Main launcher interface"""
    print("🚀 OnlyFans Agency Reddit Scraper")
    print("="*50)
    print("1. Run Proxy-Enabled Multi-Account Scraper")
    print("2. Manage Subreddit Categories")
    print("3. View Project Documentation")
    print("4. Install Dependencies")
    print("5. Exit")
    
    while True:
        choice = input("\nEnter your choice (1-5): ").strip()
        
        if choice == "1":
            print("🚀 Starting proxy-enabled multi-account scraper...")
            subprocess.run([sys.executable, "src/reddit_scraper.py"])
        
        elif choice == "2":
            print("🏷️ Opening category manager...")
            subprocess.run([sys.executable, "tools/simple_category_manager.py"])
        
        elif choice == "3":
            print("📚 Opening documentation...")
            print("📋 Plan.md - Complete project documentation")
            print("📖 README.md - Quick start guide") 
            print("🔧 docs/REDDIT_ACCOUNTS_SETUP.md - Multi-account setup")
            input("Press Enter to continue...")
        
        elif choice == "4":
            print("📦 Installing dependencies...")
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "config/requirements.txt"])
            print("✅ Dependencies installed!")
        
        elif choice == "5":
            print("👋 Goodbye!")
            break
        
        else:
            print("❌ Invalid choice. Please enter 1-5.")

if __name__ == "__main__":
    main()
