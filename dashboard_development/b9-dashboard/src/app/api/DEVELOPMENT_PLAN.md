# API Routes Development Plan

**Priority**: PHASE 1 & 3 (Critical Infrastructure + Intelligence)
**Agent Assignments**: Scraper Monitoring Agent, AI Categorization Agent
**Status**: Needs Enhancement & New Features

## 🎯 Current State Analysis

### ✅ **Working API Routes**
- **Categories API** (`/api/categories`) - GET/POST working ✅
- **Health Check** (`/api/health`) - Basic connectivity test ✅
- **User Management** (`/api/users/toggle-creator`) - Creator status toggle ✅

### ⚠️ **APIs Needing Enhancement**
- **Scraper APIs** (`/api/scraper/*`) - Limited monitoring data
- **Reddit Integration** (`/api/reddit/user`) - Basic user fetching only

### 🔧 **Missing API Routes**
- **Comprehensive Scraper Monitoring** - Real-time status, metrics, logs
- **AI Categorization** - Automated subreddit classification
- **Advanced Analytics** - Business intelligence endpoints
- **Bulk Operations** - Batch updates for efficiency
- **Export/Import** - Data export for analysis

## 📋 Target Goals by Phase

### **Phase 1: Scraper Monitoring APIs (URGENT)**
1. **Real-time Scraper Status** - Account health, activity metrics
2. **Log Integration** - PythonAnywhere log access or Supabase storage
3. **Performance Metrics** - Throughput, success rates, discovery stats
4. **Alert System** - Error detection and notification endpoints

### **Phase 3: Intelligence APIs (AI Integration)**
1. **AI Categorization** - Automated subreddit classification
2. **Smart Filtering** - Keyword-based pre-filtering
3. **Analytics Engine** - Advanced business intelligence
4. **Bulk Operations** - Efficient batch processing

## ❓ Questions for You

### **Scraper Monitoring APIs (Phase 1)**

1. **What scraper metrics are most important to monitor?**
   - [ ] Individual Reddit account status (active/failed/rate-limited)?
   - [ ] Requests per hour/day for each account?
   - [ ] Success/failure rates with error details?
   - [ ] New subreddits discovered in last 24h/7d?
   - [ ] Data quality scores (missing fields, validation errors)?
   - [ ] Processing speed (subreddits analyzed per hour)?
Yes please

2. **How should PythonAnywhere logs be handled?**
   ```
   Option A: Store logs in Supabase table for dashboard display
   - Pro: Searchable, filterable in dashboard
   - Con: Increased database storage costs
   
   Option B: Direct API to read PythonAnywhere log files
   - Pro: No additional storage needed
   - Con: More complex integration
   
   Option C: Use external logging service (LogTail, BetterStack)
   - Pro: Professional monitoring tools
   - Con: Additional monthly cost (~$10-20)
   ```
   Option A -> HOW MUCH BIGGER WILL BE THE COSTS THO?

3. **What actions should be available via API?**
   - [ ] Manually trigger scraper refresh?
   - [ ] Enable/disable individual Reddit accounts?
   - [ ] Clear error states and reset counters?
   - [ ] Export monitoring data for analysis?
   - [ ] Configure scraper settings remotely?
Not necessary

### **AI Categorization APIs (Phase 3)**

4. **AI Categorization Approach - Which sounds best?**
   ```
   Option A: Analyze existing 425 "Ok" subreddits first
   - Generate category list from your approved data
   - Use those categories to classify new subreddits
   
   Option B: Use general AI knowledge + your examples
   - Broader category understanding
   - Learn from your specific preferences
   
   Option C: Hybrid approach
   - Start with your data, expand with AI knowledge
Option C i THINK   ```

5. **Category Confidence Scoring:**
   - [ ] Show confidence percentage (0-100%) for each suggestion? Yes
   - [ ] Only suggest categories above certain confidence threshold? No
   - [ ] Allow manual correction to improve AI learning? Yes
   - [ ] Track AI accuracy over time? Yes

6. **Bulk Categorization Workflow:**
   - [ ] Process all uncategorized subreddits in batches? Yes
   - [ ] Allow review of AI suggestions before applying? Yes
   - [ ] Enable bulk approval/rejection of AI categories? Yes
   - [ ] Export categorization results for review? Yes

### **Analytics & Business Intelligence**

7. **What analytics would be most valuable?**
   - [ ] Subreddit performance trends (subscribers, engagement)? Yes
   - [ ] Category performance comparison? Yes
   - [ ] Creator success patterns in different subreddits? Yes
   - [ ] Competitive analysis (other OF creators)? Yes
   - [ ] Optimal posting time predictions? Yes
   - [ ] Content type performance by subreddit? Yes

8. **Reporting & Export Needs:**
   - [ ] CSV/Excel export for external analysis?
   - [ ] PDF reports for client/team sharing?
   - [ ] Scheduled automated reports?
   - [ ] Custom dashboard widgets?
   - [ ] API access for third-party tools?
Not necesary at all

### **Smart Filtering (Subreddit Pre-filtering)**

9. **Keyword-based Filtering Approach:**
   ```
   Conservative: Only filter obvious non-matches
   - Require 2+ negative keywords to filter out
   - Focus on explicit porn/spam indicators
   
   Moderate: Balance efficiency with accuracy  
   - Single keyword filtering for clear cases
   - Description and rules analysis
   
   Aggressive: Maximum time savings
   - Broad keyword matching
   - Size and activity filters
   ```
Conservative

10. **Which categories should be filtered out automatically?**
    - [ ] Explicit porn subreddits (hardcore, gonewild variations)?
    - [ ] Male-focused subreddits (specific keywords)?
    - [ ] Gaming/tech subreddits (unrelated content)?
    - [ ] News/politics subreddits (off-topic)?
    - [ ] Subreddits with seller bans in rules?
All of them, seller bans go to "No Seller"
## 🔧 Technical Implementation Plan

### **Phase 1: Scraper Monitoring APIs**

#### **New API Endpoints Needed:**

```typescript
// Real-time scraper status
GET /api/scraper/status
Response: {
  accounts: Array<{
    name: string
    status: 'active' | 'rate_limited' | 'failed'
    requests_today: number
    success_rate: number
    last_success: string
    last_error?: string
  }>
  discovery: {
    subreddits_found_today: number
    subreddits_analyzed: number
    processing_speed: number // per hour
  }
  data_quality: {
    complete_records: number
    missing_fields: number
    error_rate: number
  }
}

// Historical metrics
GET /api/scraper/metrics?timeframe=24h|7d|30d
Response: {
  timeframe: string
  total_requests: number
  success_rate: number
  subreddits_discovered: number
  data_points_collected: number
  performance_trend: Array<{ date: string, value: number }>
}

// Logs endpoint (if using Supabase storage)
GET /api/scraper/logs?level=info|warn|error&limit=100
Response: {
  logs: Array<{
    timestamp: string
    level: string
    message: string
    account?: string
    context?: object
  }>
}

// Control actions
POST /api/scraper/control
Body: {
  action: 'trigger_refresh' | 'enable_account' | 'disable_account'
  account_name?: string
  parameters?: object
}
```

### **Phase 3: AI Categorization APIs**

```typescript
// Analyze existing categories
GET /api/ai/analyze-categories
Response: {
  categories: Array<{
    name: string
    count: number
    keywords: string[]
    confidence: number
  }>
  suggestions: Array<{
    current_name: string
    suggested_name: string
    reason: string
  }>
}

// Categorize subreddit(s)
POST /api/ai/categorize
Body: {
  subreddit_names: string[]
  use_existing_categories: boolean
  confidence_threshold: number
}
Response: {
  results: Array<{
    subreddit_name: string
    suggested_category: string
    confidence: number
    reasoning: string
  }>
}

// Bulk categorization
POST /api/ai/categorize-bulk
Body: {
  filter_criteria: object
  auto_apply: boolean
  confidence_threshold: number
}
Response: {
  processed: number
  categorized: number
  low_confidence: number
  results: Array<CategorySuggestion>
}
```

### **Performance Optimizations**

```typescript
// Caching Strategy
interface CacheConfig {
  scraper_status: 30, // seconds
  metrics: 300,       // 5 minutes  
  categories: 3600,   // 1 hour
  ai_results: 86400   // 24 hours
}

// Rate Limiting
interface RateLimits {
  monitoring_apis: 60,    // requests per minute
  ai_categorization: 10,  // requests per minute
  bulk_operations: 2      // requests per minute
}
```

## 🤖 Agent Responsibilities

### **Scraper Monitoring Agent** (Phase 1)
- **Primary Focus**: Comprehensive backend monitoring
- **Deliverables**:
  - Real-time status API endpoints
  - Performance metrics collection
  - Log integration system  
  - Alert and notification APIs
  - Control action endpoints

### **AI Categorization Agent** (Phase 3)
- **Primary Focus**: Intelligent subreddit classification  
- **Deliverables**:
  - Category analysis endpoints
  - AI-powered classification API
  - Bulk processing system
  - Learning and improvement mechanisms
  - Export and reporting features

### **Performance Agent** (Ongoing)
- **Primary Focus**: API optimization and reliability
- **Deliverables**:
  - Caching system implementation
  - Rate limiting and throttling
  - Error handling and recovery
  - Performance monitoring
  - Database query optimization

## 📊 Success Metrics

### **Phase 1: Monitoring APIs**
- Scraper page loads with real-time data
- 100% uptime for monitoring endpoints
- <200ms response time for status checks
- Comprehensive error detection and alerting

### **Phase 3: AI Integration**
- 80%+ accuracy in category suggestions
- 70% reduction in manual categorization time
- Successful processing of 1k+ subreddits
- Cost efficiency at <$100 for full categorization

### **Overall API Performance**
- Sub-200ms average response times
- 99.9% API availability
- Proper error handling for all endpoints
- Efficient database queries with indexes

---

**Please answer the questions above so I can create the perfect API system for your dashboard monitoring and AI categorization needs!**

The Scraper Monitoring Agent is ready to fix your broken monitoring system and provide comprehensive backend visibility.