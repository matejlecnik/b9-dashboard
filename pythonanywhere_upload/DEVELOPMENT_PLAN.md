# Python Scraper Development Plan

**Priority**: PHASE 1 & 3 (Critical Infrastructure + Smart Filtering)
**Agent Assignments**: Smart Filter Agent, Monitoring Agent  
**Status**: Working but Needs Smart Filtering Enhancement

## 🎯 Current State Analysis

### ✅ **Working Scraper Features**
- **Multi-Account System** - 3 Reddit accounts with proxy rotation ✅
- **Rate Limiting** - 100 requests/min per account compliance ✅
- **Data Collection** - Comprehensive subreddit, user, and post analysis ✅
- **Database Integration** - Supabase upserts working ✅
- **Error Handling** - Retry logic and circuit breakers ✅
- **Logging System** - Detailed debug and performance logs ✅

### ⚠️ **Areas Needing Enhancement**
- **Subreddit Filtering** - No pre-filtering, processes all discoveries
- **Monitoring Integration** - No API for dashboard status display
- **Performance Metrics** - Limited business intelligence data
- **Quality Assurance** - No automated data validation

### 🚫 **What NOT to Change**
- **Core scraping logic** - Working perfectly, don't touch
- **Account management** - Proxy rotation working well
- **Database schema** - Data structure is solid
- **Rate limiting** - Compliant and efficient

## 📋 Target Goals

### **Phase 1: Monitoring Integration (Week 1)**
1. **API Status Endpoints** - Enable dashboard monitoring
2. **Performance Metrics** - Business intelligence data
3. **Log Integration** - Dashboard log viewing capability
4. **Health Checks** - Automated status reporting

### **Phase 3: Smart Pre-filtering (Week 5-6)**
1. **Keyword-based Filtering** - Reduce manual review workload
2. **Rule Analysis** - Auto-detect seller restrictions  
3. **Quality Scoring** - Pre-rank subreddit potential
4. **Whitelist System** - Preserve high-value discoveries

## ❓ Questions for You

### **Smart Subreddit Pre-filtering (Your Priority)**

Since you manually review 10k subreddits, smart filtering could save massive time:

1. **Filtering Conservatism Level:**
   ```
   Conservative (Recommended): Only filter obvious non-matches
   - Requires 2+ negative keywords to exclude
   - Manual review still required for borderline cases
   - Risk: 5% might miss good subreddits
   - Benefit: 60% reduction in review time
   
   Moderate: Balance efficiency with accuracy
   - Single keyword filtering for clear cases  
   - Description analysis for context
   - Risk: 10% might miss good subreddits
   - Benefit: 75% reduction in review time
   ```
Conservative

2. **Specific Keywords to ALWAYS Exclude (2+ required):**
   ```
   Explicit Porn Keywords:
   - gonewild, nsfw, nude, naked, porn, sex
   - hardcore, xxx, amateur, hookup
   
   Male-Focused Keywords:
   - cock, dick, penis, gay, men, dudes, bros
   - male, masculine, straight guys
   
   Unrelated Categories:
   - gaming, politics, news, sports
   - crypto, stocks, tech, programming
   - food, recipes, cooking, travel
   ```

3. **Which combination would you prefer for filtering?**
   - [ ] 2+ porn keywords (conservative, very safe)
   - [ ] 1+ porn keyword AND 1+ unrelated keyword  
   - [ ] 2+ keywords from any negative category
   - [ ] Custom algorithm based on your examples
   Whatever you think is more conservatibve


4. **Rule-based Filtering:**
   - [ ] Auto-exclude subreddits mentioning "no sellers" in rules? Put them in "No Seller"
   - [ ] Flag subreddits with "verification required"? mark "verification" as true in supabase we already do this but no need to filter them
   - [ ] Skip subreddits with "no OnlyFans" in description? -> add them to "No Seller"
   - [ ] Filter subreddits requiring account age >30 days? No


### **Monitoring & Dashboard Integration**

5. **Performance Metrics Priority:**
   ```
   High Priority (show on dashboard):
   - Active accounts and their status
   - Subreddits discovered today/this week  
   - Success/failure rates per account
   - Processing speed (subreddits/hour)
   
   Medium Priority:
   - Data quality scores
   - Error trends and patterns
   - Discovery source analysis
   - Competition metrics
   ```

   LEts show all

6. **Log Integration Approach:**
   ```
   Option A: Store key logs in Supabase
   - Create 'scraper_logs' table
   - Store important events and errors
   - Enable dashboard log viewing
   
   Option B: File-based with API access
   - Keep current file logging
   - Add API to read recent logs
   - More complex but no extra DB cost
   ```
   Whatever you think is best

7. **Alert Thresholds - When should you be notified?**
   - [ ] Account failure (can't authenticate)?
   - [ ] Rate limiting exceeded?
   - [ ] No new discoveries in 24h?
   - [ ] Error rate above 10%?
   - [ ] Database connection failures?
   Whatever you think would be interesting

### **Quality Assurance & Data Validation**

8. **Data Quality Checks:**
   - [ ] Validate all required fields are present? -> Not necessary
   - [ ] Check for duplicate subreddits? -> Already done I htink
   - [ ] Verify subscriber count ranges? -> Yes
   - [ ] Flag suspicious activity patterns? -> What do you mean by that
   - [ ] Ensure engagement ratios are realistic? -> yno need

9. **Business Intelligence Enhancements:**
   - [ ] Track discovery source effectiveness? Yes
   - [ ] Analyze user quality score distributions?  Yes
   - [ ] Monitor category distribution trends? Yes
   - [ ] Compare current vs historical performance? Yes

### **Smart Filtering Implementation Details**

10. **Filtering Location in Pipeline:**
    ```
    Option A: Filter before detailed analysis
    - Save processing time and API calls
    - Risk of missing borderline cases
    
    Option B: Filter after basic data collection
    - More informed filtering decisions
    - Uses more resources but safer
    ```
    Option B

11. **Whitelist Management:**
    - [ ] Always include subreddits you've marked "Ok"? Yes
    - [ ] Bypass filtering for high-subscriber subreddits?  No
    - [ ] Manual whitelist for specific subreddits? Yes
    - [ ] Learn from your review patterns? Yes

## 🔧 Technical Implementation Plan

### **Phase 1: Monitoring Integration (Week 1)**

#### **New Functions to Add:**
```python
class ScraperMonitor:
    def get_status_summary(self) -> dict:
        """Return real-time scraper status for API"""
        return {
            'accounts': self.get_account_status(),
            'discovery': self.get_discovery_metrics(),
            'performance': self.get_performance_metrics(),
            'errors': self.get_recent_errors()
        }
    
    def log_to_database(self, level: str, message: str, context: dict = None):
        """Store important logs in Supabase for dashboard"""
        self.supabase.table('scraper_logs').insert({
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': level,
            'message': message,
            'context': context
        }).execute()
```

### **Phase 3: Smart Filtering (Week 5-6)**

#### **Pre-filtering Algorithm:**
```python
class SmartSubredditFilter:
    def __init__(self):
        # Conservative filtering keywords (require 2+ matches)
        self.porn_keywords = {
            'explicit': ['gonewild', 'nsfw', 'nude', 'naked', 'porn'],
            'hardcore': ['xxx', 'sex', 'hookup', 'amateur'],
            'male_focused': ['cock', 'dick', 'penis', 'gay', 'bros']
        }
        
        self.unrelated_keywords = {
            'gaming': ['gaming', 'games', 'xbox', 'playstation'],
            'tech': ['programming', 'coding', 'tech', 'crypto'],  
            'other': ['politics', 'news', 'sports', 'food']
        }
    
    def should_filter_out(self, subreddit_name: str, description: str, rules: str) -> tuple[bool, str]:
        """
        Conservative filtering: require 2+ negative indicators
        Returns: (should_filter, reason)
        """
        negative_matches = []
        
        # Check subreddit name
        for category, keywords in self.porn_keywords.items():
            for keyword in keywords:
                if keyword in subreddit_name.lower():
                    negative_matches.append(f"name:{keyword}")
        
        # Check description  
        if description:
            for category, keywords in self.unrelated_keywords.items():
                for keyword in keywords:
                    if keyword in description.lower():
                        negative_matches.append(f"desc:{keyword}")
        
        # Check rules for seller restrictions
        if rules and any(term in rules.lower() for term in ['no seller', 'no onlyfans', 'no promotion']):
            negative_matches.append("rules:no_sellers")
        
        # Filter only if 2+ negative indicators
        if len(negative_matches) >= 2:
            return True, f"Filtered: {', '.join(negative_matches[:2])}"
        
        return False, "Passed filtering"
```

## 🤖 Agent Responsibilities

### **Smart Filter Agent** (Phase 3)
- **Primary Focus**: Intelligent pre-filtering system
- **Deliverables**:
  - Conservative keyword-based filtering
  - Rule analysis for seller restrictions
  - Quality scoring algorithm
  - Whitelist management system
  - Manual override capabilities

### **Monitoring Agent** (Phase 1)  
- **Primary Focus**: Dashboard integration and status reporting
- **Deliverables**:
  - Real-time status API endpoints
  - Performance metrics collection
  - Log integration system
  - Alert and notification framework
  - Business intelligence data

### **Quality Assurance Agent** (Ongoing)
- **Primary Focus**: Data validation and integrity
- **Deliverables**:
  - Automated data validation
  - Duplicate detection and prevention
  - Error pattern analysis
  - Performance optimization
  - Database health monitoring

## 📊 Success Metrics

### **Smart Filtering Success**
- **60-70% reduction** in manual review workload
- **<5% false negatives** (good subreddits filtered out)
- **>90% accuracy** on obvious non-matches
- **Manual override** capability working

### **Monitoring Integration Success**
- **Real-time status** visible in dashboard
- **Performance metrics** updating correctly  
- **Alert system** catching issues promptly
- **Log integration** providing debugging info

### **Overall System Health**
- **100% uptime** for data collection
- **99%+ accuracy** in data quality
- **<1 second** processing time per subreddit
- **Compliance maintained** with Reddit rate limits

## 🚫 Protected Elements (DO NOT MODIFY)

### **Core Scraping Logic**
- Multi-account management system
- Proxy rotation and authentication  
- Rate limiting and retry mechanisms
- Database upsert operations
- Error handling and recovery

### **Working Configurations**
- Account credentials and proxy settings
- API request patterns and headers
- Database connection parameters
- Logging configuration

### **Data Collection Pipeline**
- Subreddit analysis algorithms
- User quality scoring system
- Post engagement calculations
- Discovery source tracking

---

**Please answer the questions above so I can enhance your scraper with smart filtering while keeping the working core intact!**

The Smart Filter Agent is ready to reduce your manual review workload by 60-70% while maintaining the reliability of your current system.