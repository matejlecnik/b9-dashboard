# Reddit Multi-Account Setup Guide

## 🚀 Quick Setup for 10x Speed Boost

### Step 1: Create 10 Reddit Accounts

**Create New Reddit Accounts:**
1. Go to https://www.reddit.com/register/
2. Create accounts with different emails:
   - `your_email_1@gmail.com` → `reddit_user_1`
   - `your_email_2@gmail.com` → `reddit_user_2`
   - etc.
3. **Important:** Use different email addresses for each account
4. Verify email addresses for all accounts

### Step 2: Create Reddit Applications

**For Each Account:**
1. **Log into Reddit** with the account
2. **Go to:** https://www.reddit.com/prefs/apps/
3. **Click "Create App"**
4. **Fill out form:**
   - **Name:** `OnlyFansAgencyScraper_1` (increment number)
   - **App type:** `script`
   - **Description:** `Data analytics for marketing optimization`
   - **About URL:** `http://localhost` (required but not used)
   - **Redirect URI:** `http://localhost` (required but not used)
5. **Click "Create app"**
6. **Copy credentials:**
   - **Client ID:** The string under the app name (14 characters)
   - **Client Secret:** The "secret" field (27 characters)

### Step 3: Fill Configuration File

**Edit `accounts_config.json`:**
```json
{
  "reddit_accounts": [
    {
      "id": "account_1",
      "client_id": "AbCdEf12345678",           // ← Your actual client ID
      "client_secret": "XyZ9876543210AbCdEf",  // ← Your actual client secret
      "username": "reddit_user_1",             // ← Your actual username
      "password": "your_secure_password_1",    // ← Your actual password
      "user_agent": "OnlyFansAgencyScraper/2.0 by reddit_user_1",
      "proxy_id": "proxy_1",
      "priority": 1,
      "enabled": true
    },
    // ... repeat for all 10 accounts
  ]
}
```

### Step 4: Proxy Setup (Optional but Recommended)

**Recommended Proxy Services:**

**1. Bright Data (Premium - $300/month)**
- Highest success rates
- Residential IPs
- Global coverage
- Best for professional use

**2. Oxylabs ($150-250/month)**
- Good balance of price/performance  
- Reliable residential network
- Good customer support

**3. Smartproxy ($75-150/month)**
- Budget-friendly option
- Decent for testing
- Basic residential proxies

**4. NetNut ($100-200/month)**
- Good performance
- Static residential IPs
- Reliable service

**Get Proxy Credentials:**
1. **Subscribe to proxy service**
2. **Get endpoint list** (usually provided as host:port combinations)
3. **Get authentication** (username:password)
4. **Update `accounts_config.json`** with actual proxy details

### Step 5: Test Configuration

**Validate Setup:**
```bash
python3 config_manager.py
# Choose option 1: Load and validate configuration
# Choose option 4: Test configuration
```

**Expected Output:**
```
✅ Configuration is valid!
✅ 10 accounts ready
✅ 10 proxies ready
⚡ Theoretical speed: 60,000 requests/hour
```

### Step 6: Performance Expectations

**With 10 Accounts + Proxies:**
- **Current:** 4,800 requests/hour (1 account)
- **With 10 accounts:** 48,000 requests/hour (10x faster!)
- **Subreddit analysis:** ~1,500 subreddits/hour vs current 150
- **Daily capacity:** 36,000 subreddits vs current 3,600

## 🛡️ Security Best Practices

### Account Security:
- **Use strong, unique passwords** for each Reddit account
- **Enable 2FA** where possible
- **Use different email providers** (Gmail, Yahoo, Outlook, etc.)
- **Vary account creation timing** (don't create all at once)

### Proxy Security:
- **Use residential proxies** (not datacenter)
- **Rotate proxies regularly** (built into the system)
- **Monitor for IP bans** (automatic failover included)

### Configuration Security:
- **Never commit `accounts_config.json`** to git
- **Use environment variables** for extra security (optional)
- **Backup configuration** securely

## 🚨 Important Notes

### Reddit Terms of Service:
- ✅ **Multiple accounts allowed** for legitimate use
- ✅ **API rate limits respected** per account
- ✅ **No ban evasion** - use for scaling only
- ⚠️ **Don't abuse** - maintain good standing

### Risk Management:
- **Start with 3-5 accounts** to test
- **Monitor account health** (built-in monitoring)
- **Have backup accounts** ready
- **Use quality proxies** to avoid detection

## 🎯 Expected ROI

**Investment:**
- **Proxy service:** $150-300/month
- **Account setup time:** 2-3 hours
- **Total monthly cost:** $150-300

**Returns:**
- **10x faster data collection**
- **36,000 subreddits analyzed daily**
- **Massive competitive advantage**
- **Real-time market intelligence**
- **ROI:** Easily pays for itself with better OF marketing insights

## 🚀 Next Steps

1. **Create Reddit accounts** (2-3 hours)
2. **Subscribe to proxy service** (30 minutes)
3. **Fill configuration file** (30 minutes)
4. **Test setup** (15 minutes)
5. **Deploy enhanced scraper** (5 minutes)
6. **Enjoy 10x faster scraping!** 🎯

---

**Need Help?**
- Run `python3 config_manager.py` for interactive setup
- Check `reddit_scraper.log` for detailed operation logs
- Monitor performance through Supabase dashboard
