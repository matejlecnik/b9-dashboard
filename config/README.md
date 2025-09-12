# Configuration Directory

This directory contains essential configuration files for the Reddit analytics system, including multi-account setups, database schemas, and dependency specifications. All configuration files are version-controlled except for sensitive credentials which should be managed via environment variables.

## Directory Documentation Block

### Overview
- Centralized configuration and schema for database and scraper dependencies. Credentials belong in environment variables, not in this repo.

### TODO List
- [ ] Add seed SQL for minimal dev dataset and example accounts
- [ ] Create migration scripts for dashboard indexes and RLS examples
- [ ] Document environment variable matrix for dev/staging/prod

### Current Errors
- None tracked here; see scraper and API READMEs for runtime issues

### Potential Improvements
- Split schema into modular migration files and add checksums
- Provide a local Supabase Docker compose for offline dev

## 🗂️ Directory Structure

```
config/
├── requirements.txt               # Python dependencies for scraper
└── supabase_database_setup.sql    # Database schema and initial setup
```

## 🔧 Configuration Files

### Reddit Accounts Configuration (Supabase Database)
**Purpose**: Multi-account setup for distributed Reddit API access managed via Supabase database
**Business Value**: Enables 17,100 requests/hour capacity across multiple Reddit accounts

**Current Implementation**: Reddit accounts are now managed directly in the Supabase `scraper_accounts` table instead of a JSON file. This provides:

**Database Schema** (from `scraper_accounts` table):
```sql
CREATE TABLE scraper_accounts (
  id SERIAL PRIMARY KEY,
  account_name VARCHAR(255) UNIQUE NOT NULL,
  client_id VARCHAR(255) NOT NULL,
  client_secret VARCHAR(255) NOT NULL,
  username VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  user_agent VARCHAR(255) NOT NULL,
  proxy_host VARCHAR(255),
  proxy_port INTEGER,
  proxy_username VARCHAR(255),
  proxy_password VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',
  is_enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1,
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  consecutive_failures INTEGER DEFAULT 0,
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  last_error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Benefits of Database Management**:
- **Real-time Monitoring**: Track account health and performance metrics
- **Dynamic Configuration**: Enable/disable accounts without restarting scraper
- **Performance Analytics**: Detailed success rates and failure tracking
- **Security**: Encrypted storage of credentials in Supabase
- **Failover Protection**: Automatic account switching based on health status
- **Load Balancing**: Priority-based request distribution

### Python Dependencies (`requirements.txt`)
**Purpose**: Specify exact Python package versions for consistent deployments
**Business Value**: Ensures reliable scraper operation across development and production

**Core Dependencies**:
```txt
# Reddit API Access
asyncpraw==7.7.1                   # Async Reddit API wrapper
asyncprawcore==2.4.0               # Core Reddit API functionality

# Database Integration  
supabase==2.3.4                    # Supabase Python client
psycopg2-binary==2.9.9             # PostgreSQL adapter

# HTTP and Networking
aiohttp==3.9.1                     # Async HTTP client
requests==2.31.0                   # Synchronous HTTP client
fake-useragent==1.4.0              # User agent rotation

# Utilities
python-dotenv==1.0.0               # Environment variable loading
python-dateutil==2.8.2             # Date/time utilities
```

**Version Management**:
- **Pinned Versions**: Exact versions to prevent compatibility issues
- **Security Updates**: Regular updates for security patches
- **Testing Protocol**: Validate updates in development before production
- **Rollback Strategy**: Keep previous working versions documented

**Dependency Categories**:
- **Core Reddit**: AsyncPRAW and related packages for API access
- **Database**: Supabase client and PostgreSQL connectivity
- **Network**: HTTP clients and proxy support
- **Utilities**: Helper libraries for common tasks

### Database Schema (`supabase_database_setup.sql`)
**Purpose**: Complete database schema definition and initial setup
**Business Value**: Provides structured storage for 4,865+ subreddits and 337,803+ posts

**Core Tables Structure**:

#### Subreddits Table
```sql
CREATE TABLE subreddits (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  display_name_prefixed VARCHAR(255),
  title TEXT,
  subscribers INTEGER,
  review VARCHAR(50) CHECK (review IN ('Ok', 'No Seller', 'Non Related', 'User Feed')),
  category_text VARCHAR(255),
  -- Engagement metrics
  subscriber_engagement_ratio DECIMAL(10,4) DEFAULT 0,
  avg_upvotes_per_post DECIMAL(10,2) DEFAULT 0,
  avg_comments_per_post DECIMAL(10,2) DEFAULT 0,
  comment_to_upvote_ratio DECIMAL(10,4) DEFAULT 0,
  -- Content analysis
  top_content_type VARCHAR(100),
  best_posting_day VARCHAR(20),
  best_posting_hour INTEGER,
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_scraped_at TIMESTAMP DEFAULT NOW()
);
```

#### Posts Table  
```sql
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  reddit_id VARCHAR(255) UNIQUE NOT NULL,
  title TEXT,
  selftext TEXT,
  author_username VARCHAR(255),
  subreddit_name VARCHAR(255) REFERENCES subreddits(name),
  -- Engagement metrics
  score INTEGER DEFAULT 0,
  upvote_ratio DECIMAL(4,3),
  num_comments INTEGER DEFAULT 0,
  comment_to_upvote_ratio DECIMAL(10,4),
  -- Content classification
  content_type VARCHAR(50),
  is_video BOOLEAN DEFAULT FALSE,
  over_18 BOOLEAN DEFAULT FALSE,
  -- Performance metrics
  engagement_velocity DECIMAL(10,4),
  organic_engagement_score DECIMAL(10,2) DEFAULT 0,
  -- Timestamps
  created_utc TIMESTAMP,
  scraped_at TIMESTAMP DEFAULT NOW()
);
```

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  reddit_id VARCHAR(255),
  -- Account metrics
  account_age_days INTEGER,
  comment_karma INTEGER DEFAULT 0,
  link_karma INTEGER DEFAULT 0,
  total_karma INTEGER DEFAULT 0,
  -- Quality scoring (0-10 scale)
  username_quality_score DECIMAL(3,2) DEFAULT 0,
  age_quality_score DECIMAL(3,2) DEFAULT 0,
  karma_quality_score DECIMAL(3,2) DEFAULT 0,
  overall_user_score DECIMAL(3,2) DEFAULT 0,
  -- Activity analysis
  avg_posts_per_month DECIMAL(8,2) DEFAULT 0,
  cross_subreddit_activity INTEGER DEFAULT 0,
  primary_subreddits TEXT[],
  our_creator BOOLEAN DEFAULT FALSE,
  -- Timestamps
  created_utc TIMESTAMP,
  last_scraped_at TIMESTAMP DEFAULT NOW()
);
```

#### Scraper Accounts Table
```sql
CREATE TABLE scraper_accounts (
  id SERIAL PRIMARY KEY,
  account_name VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  is_enabled BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 1,
  -- Performance metrics
  total_requests INTEGER DEFAULT 0,
  successful_requests INTEGER DEFAULT 0,
  failed_requests INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.00,
  avg_response_time DECIMAL(8,2) DEFAULT 0,
  consecutive_failures INTEGER DEFAULT 0,
  -- Timestamps
  last_success_at TIMESTAMP,
  last_failure_at TIMESTAMP,
  last_error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Database Relationships**:
```sql
-- Foreign key constraints
ALTER TABLE posts ADD CONSTRAINT fk_posts_subreddit 
  FOREIGN KEY (subreddit_name) REFERENCES subreddits(name);
  
ALTER TABLE posts ADD CONSTRAINT fk_posts_author 
  FOREIGN KEY (author_username) REFERENCES users(username);
```

**Indexes for Performance**:
```sql
-- Optimize common queries
CREATE INDEX idx_subreddits_review ON subreddits(review);
CREATE INDEX idx_subreddits_category ON subreddits(category_text);
CREATE INDEX idx_subreddits_scraped ON subreddits(last_scraped_at);
CREATE INDEX idx_posts_subreddit ON posts(subreddit_name);
CREATE INDEX idx_posts_created ON posts(created_utc);
CREATE INDEX idx_users_score ON users(overall_user_score);
```

## 🔐 Security & Environment Management

### Environment Variables Setup
**Production Configuration**:
```bash
# Dashboard Environment (.env.local)
NEXT_PUBLIC_SUPABASE_URL=https://cetrhongdrjztsrsffuh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Scraper Environment (.env)
SUPABASE_URL=https://cetrhongdrjztsrsffuh.supabase.co
SUPABASE_SERVICE_KEY=service_role_key_here
SCRAPER_MODE=background
CYCLE_INTERVAL_MINUTES=15
LOG_LEVEL=INFO
```

**Security Best Practices**:
- **Separate Keys**: Use different keys for client-side vs. server-side access
- **Service Role**: Scraper uses service role key for elevated permissions
- **Environment Isolation**: Different configurations for dev/staging/production
- **Credential Rotation**: Regular rotation of API keys and passwords

### Account Management
Accounts are managed through the dashboard's scraper monitoring interface or directly via SQL:

```sql
-- Add a new Reddit account
INSERT INTO scraper_accounts (
  account_name, client_id, client_secret, username, password, 
  user_agent, proxy_host, proxy_port, priority, is_enabled
) VALUES (
  'account_name', 'reddit_client_id', 'reddit_client_secret', 
  'reddit_username', 'reddit_password', 'User-Agent/1.0', 
  'proxy.host.com', 8080, 1, true
);

-- Monitor account performance
SELECT account_name, success_rate, total_requests, last_success_at, status
FROM scraper_accounts 
ORDER BY priority, success_rate DESC;

-- Disable underperforming accounts
UPDATE scraper_accounts 
SET is_enabled = false, status = 'disabled'
WHERE success_rate < 80 OR consecutive_failures > 5;
```

## 📊 Configuration Monitoring

### Account Health Tracking
```sql
-- Monitor account performance
SELECT 
  account_name,
  status,
  success_rate,
  total_requests,
  last_success_at,
  consecutive_failures
FROM scraper_accounts 
ORDER BY priority, success_rate DESC;
```

### Database Performance Metrics
```sql
-- Check database health
SELECT 
  table_name,
  pg_size_pretty(pg_total_relation_size(table_name::regclass)) as size,
  n_tup_ins as inserts,
  n_tup_upd as updates,
  n_tup_del as deletes
FROM pg_stat_user_tables 
WHERE table_name IN ('subreddits', 'posts', 'users');
```

## 🔄 Configuration Management Workflow

### Development Setup
1. **Clone Repository**: Get latest configuration files
2. **Environment Setup**: Copy .env.example to .env and configure
3. **Database Migration**: Run supabase_database_setup.sql
4. **Account Configuration**: Set up test Reddit accounts
5. **Validation**: Test configuration with scraper dry run

### Production Deployment
1. **Secure Transfer**: Encrypt configuration files during transfer
2. **Environment Isolation**: Use production-specific configurations
3. **Health Checks**: Validate all connections before going live
4. **Monitoring Setup**: Enable comprehensive logging and alerting
5. **Backup Strategy**: Regular configuration and data backups

### Configuration Updates
1. **Version Control**: Track all configuration changes in git
2. **Testing Protocol**: Test configuration changes in staging
3. **Rollback Plan**: Maintain previous working configurations
4. **Team Communication**: Notify team of configuration changes
5. **Documentation**: Update README files with changes

## 📈 Business Configuration Insights

### Account Performance Optimization
- **Priority Ordering**: Higher performing accounts get priority
- **Load Balancing**: Distribute requests based on account health
- **Failure Recovery**: Automatic failover to backup accounts
- **Cost Optimization**: Monitor proxy usage and costs

### Data Collection Strategy
- **Schema Evolution**: Plan for future data requirements
- **Retention Policies**: Archive old data to manage costs
- **Index Optimization**: Regular index analysis and optimization
- **Query Performance**: Monitor and optimize slow queries

### Scalability Planning
- **Account Scaling**: Plan for additional Reddit accounts
- **Database Growth**: Monitor storage usage and plan scaling
- **Proxy Capacity**: Ensure adequate proxy bandwidth
- **Rate Limit Management**: Optimize request distribution

This configuration management system provides the foundation for reliable, scalable, and secure Reddit data collection operations.