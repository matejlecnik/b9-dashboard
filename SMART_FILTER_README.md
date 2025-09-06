# Smart Subreddit Filter System

## Overview

The Smart Subreddit Filter is a conservative keyword-based pre-filtering system designed to reduce manual review workload by 60-70% while maintaining <5% false negatives. It implements intelligent filtering **after** basic data collection, with learning capabilities and manual override options.

## Architecture

### Core Components

1. **SmartSubredditFilter Class** (`smart_subreddit_filter.py`)
   - Conservative filtering logic requiring 2+ keywords to filter
   - Auto-categorization of seller bans and verification requirements
   - Whitelist management and learning pattern recording

2. **Enhanced Scraper** (`filtered_reddit_scraper.py`)
   - Integration with existing Reddit scraper pipeline
   - Batch filtering and re-filtering capabilities
   - Maintains all existing functionality

3. **Dashboard Interface** (`/filters`)
   - Real-time filtering statistics and management
   - Keyword category management
   - Whitelist and learning pattern visualization

4. **API Endpoints** (`/api/filters/`)
   - Filter settings CRUD operations
   - Whitelist management
   - Statistics and learning patterns

### Database Schema

**New Tables Added:**
- `filter_settings` - Keyword categories and weights
- `subreddit_whitelist` - Approved subreddits
- `filter_learning_patterns` - User decision tracking

**Enhanced Subreddits Table:**
```sql
-- New filtering fields added
filter_status VARCHAR(20) DEFAULT 'unprocessed'
filter_reason TEXT
filter_keywords TEXT[]
seller_ban_detected BOOLEAN DEFAULT FALSE
verification_required_detected BOOLEAN DEFAULT FALSE
filtered_at TIMESTAMP
manual_override BOOLEAN DEFAULT FALSE
learning_feedback JSONB
```

## Filtering Logic

### Conservative Approach
- **Requires 2+ keywords** from ANY category to filter out
- **Always preserves** subreddits marked as "Ok" (whitelist)
- **Conservative scoring** prevents false negatives

### Keyword Categories

1. **Explicit Porn** (Weight: 1.5)
   - `gonewild`, `nsfw`, `nude`, `naked`, `porn`, `sex`, `hardcore`, `xxx`, `amateur`, `hookup`

2. **Male-Focused** (Weight: 1.2)
   - `cock`, `dick`, `penis`, `gay`, `men`, `dudes`, `bros`, `male`, `masculine`, `straight guys`

3. **Unrelated Content** (Weight: 1.0)
   - `gaming`, `politics`, `news`, `sports`, `crypto`, `stocks`, `tech`, `programming`, `food`, `recipes`, `cooking`, `travel`

4. **Seller Ban Indicators** (Weight: 2.0)
   - `no sellers`, `no onlyfans`, `no selling`, `sellers banned`, `no promotion`

### Special Detection

- **Seller Bans**: Auto-detected from rules, automatically marked as "No Seller"
- **Verification Requirements**: Detected but not filtered, flagged for attention
- **Whitelist Protection**: Subreddits marked as "Ok" always pass

## Installation & Setup

### 1. Database Migration
```bash
# Run the database migration to add filtering fields
# This is already completed in the implementation
```

### 2. Python Dependencies
```bash
# Install in your existing environment
pip install python-dotenv supabase
```

### 3. Environment Variables
Ensure your `.env` file contains:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

### 4. Test the System
```bash
python3 test_smart_filter.py
```

## Usage

### For Python Scraper

#### Option 1: Use Enhanced Scraper
```python
from filtered_reddit_scraper import FilteredProxyEnabledMultiScraper

async def main():
    scraper = FilteredProxyEnabledMultiScraper()
    await scraper.initialize()
    
    # Re-filter existing subreddits
    stats = scraper.batch_refilter_existing_subreddits(limit=1000)
    print(f"Filtered {stats['processed']} subreddits")
    
    # Continue with normal scraping (with filtering)
    await scraper.test_proxy_scraping()
```

#### Option 2: Add to Existing Scraper
```python
from smart_subreddit_filter import SmartSubredditFilter

# In your existing scraper class
def __init__(self):
    # ... existing initialization ...
    self.smart_filter = SmartSubredditFilter(self.supabase)

def save_subreddit(self, subreddit_data):
    # Apply filtering before saving
    filtered_data = self.smart_filter.filter_subreddit(subreddit_data)
    
    # Save with filter results
    self.supabase.table('subreddits').upsert(filtered_data, on_conflict='name').execute()
```

### For Dashboard

Navigate to `/filters` in your dashboard to:
- View filtering statistics and efficiency
- Manage keyword categories and weights
- Control whitelist and learning patterns
- Trigger batch re-filtering

### API Usage

```javascript
// Get filter statistics
const response = await fetch('/api/filters/stats')
const { stats } = await response.json()

// Re-filter subreddits
await fetch('/api/filters/refilter', {
  method: 'POST',
  body: JSON.stringify({ limit: 500 })
})

// Manage whitelist
await fetch('/api/filters/whitelist', {
  method: 'POST',
  body: JSON.stringify({ 
    subreddit_name: 'SFWAmIHot',
    reason: 'High-quality target subreddit'
  })
})
```

## Performance Metrics

### Expected Results
- **60-70% reduction** in manual review workload
- **<5% false negatives** (good subreddits filtered)
- **>90% accuracy** on obvious non-matches
- **Automatic categorization** of seller bans
- **Whitelist preservation** of approved subreddits

### Current Test Results
Based on sample testing:
- ✅ `r/rateme` - Passed (target audience)
- ✅ `r/SFWAmIHot` - Whitelisted (already approved)
- 🚫 `r/gonewild` - Filtered (explicit + seller ban)
- 🚫 `r/programming` - Filtered (unrelated)
- 🚫 `r/gaybrosgw` - Filtered (male-focused + explicit)

## Monitoring & Maintenance

### Learning System
The system tracks user decisions vs. filter predictions to improve accuracy:

```python
# Automatically recorded when users review subreddits
smart_filter.record_learning_pattern(
    subreddit_name='example',
    predicted_filter=False,
    actual_decision='Ok',  # User's actual decision
    keywords_matched=['keyword1', 'keyword2'],
    confidence_score=0.8
)
```

### Adjusting Filters
1. **Monitor dashboard statistics** for filter efficiency
2. **Review learning patterns** for false positives/negatives
3. **Adjust keyword weights** based on accuracy data
4. **Update whitelist** for high-value subreddits

### Maintenance Commands

```bash
# Test current filter performance
python3 test_smart_filter.py

# Batch re-filter existing data
python3 filtered_reddit_scraper.py

# Check filter statistics
curl http://your-dashboard/api/filters/stats
```

## Success Criteria Achievement

✅ **Conservative filtering** - Requires 2+ keywords to filter
✅ **Filter after collection** - Applied post-data-gathering
✅ **Auto-categorization** - Seller bans marked as "No Seller"
✅ **Verification detection** - Flagged but not filtered
✅ **Whitelist protection** - "Ok" subreddits always pass
✅ **Learning system** - Tracks and improves accuracy
✅ **Manual override** - Dashboard management interface
✅ **API integration** - Full CRUD operations
✅ **Performance monitoring** - Real-time statistics

## Integration Checklist

- [ ] Run `test_smart_filter.py` to verify setup
- [ ] Replace main scraper with `FilteredProxyEnabledMultiScraper`
- [ ] Navigate to `/filters` dashboard to monitor performance
- [ ] Set up regular monitoring of filter accuracy
- [ ] Configure alerting for low accuracy or high false negative rates
- [ ] Schedule periodic re-training based on learning patterns

## Support & Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify Supabase credentials in `.env`
   - Check database schema is updated

2. **Filter Not Working**
   - Run test script to verify setup
   - Check filter_settings table has data
   - Verify keyword categories are active

3. **High False Negatives**
   - Review learning patterns in dashboard
   - Adjust keyword weights or add to whitelist
   - Lower minimum keyword threshold (carefully)

### Performance Tuning

- **Increase keyword weights** for categories with high accuracy
- **Add specific subreddits to whitelist** to prevent filtering
- **Monitor learning patterns** for systematic errors
- **Adjust minimum keyword requirements** based on data volume

This Smart Filter system provides a robust, conservative approach to reducing manual review workload while maintaining high accuracy and preserving valuable subreddits.