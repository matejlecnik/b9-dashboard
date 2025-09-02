# OnlyFans Agency Reddit Scraper

Comprehensive Reddit analytics system for OnlyFans agency marketing optimization.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip3 install -r config/requirements.txt
```

### 2. Set Up Environment Variables
Create a `.env` file with your Reddit API credentials:

```env
# Reddit API Credentials (get from https://www.reddit.com/prefs/apps/)
REDDIT_CLIENT_ID=your_client_id_here
REDDIT_CLIENT_SECRET=your_client_secret_here  
REDDIT_USERNAME=your_reddit_username
REDDIT_PASSWORD=your_reddit_password

# Supabase Configuration (already configured)
SUPABASE_URL=https://cetrhongdrjztsrsffuh.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldHJob25nZHJqenRzcnNmZnVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4MTU4MTMsImV4cCI6MjA3MjM5MTgxM30.DjuEhcfDpdd7gmHFVaqcZP838FXls9-HiXJg-QF-vew

# Scraper Configuration
SCRAPER_MODE=background  # 'single' for one-time run, 'background' for continuous
CYCLE_INTERVAL_MINUTES=60
```

### 3. Run the Scraper
```bash
# Main scraper (proxy-enabled multi-account)
python3 src/reddit_scraper.py

# Easy launcher
python3 run_scraper.py

# Category management
python3 tools/simple_category_manager.py
```

## 📊 Features

- **User Quality Scoring** - 0-10 scale based on username, age, karma
- **Engagement Analysis** - Comment-to-upvote ratios, velocity tracking  
- **Content Optimization** - Best posting times and content types
- **Subreddit Discovery** - Find new communities through user behavior
- **Rate Limiting** - Automatic compliance with Reddit's 100/min limit

## 🏗️ Architecture

- **Database**: Supabase with 5 optimized tables
- **API**: AsyncPRAW for Reddit data collection
- **Analytics**: Real-time engagement metrics
- **Discovery**: User-driven subreddit finding

## 📈 Performance

- **4,800 requests/hour** (practical limit with processing)
- **~150 subreddit analyses/hour** (complete workflow)
- **~800 user profiles/hour** analyzed
- **500-1,000 new subreddits** discovered daily

## 📋 Project Files

```
Dashboard/
├── src/                                  # Core application
│   └── reddit_scraper.py                # Main proxy-enabled multi-account scraper
│
├── tools/                               # Management utilities
│   └── simple_category_manager.py      # Categorize subreddits (Ok/No Seller/Non Related)
│
├── config/                             # Configuration files
│   ├── accounts_config.json            # Multi-account + proxy configuration
│   ├── requirements.txt                # Python dependencies
│   └── supabase_database_setup.sql     # Database schema (backup)
│
├── docs/                               # Documentation
│   └── REDDIT_ACCOUNTS_SETUP.md        # Multi-account setup guide
│
├── logs/                               # Runtime logs
│   └── proxy_scraper.log              # Application logs
│
├── run_scraper.py                      # Easy launcher
├── Plan.md                             # Complete project documentation
└── README.md                           # This file
```

## 🎯 Usage

The scraper starts with "SFWAmIHot" subreddit and:
1. Analyzes 30 recent posts + engagement metrics
2. Discovers users and calculates quality scores
3. Maps user activity across subreddits  
4. Finds new high-value subreddits
5. Stores comprehensive analytics in Supabase

Perfect for OnlyFans agency content strategy optimization!
