/**
 * Test data fixtures for consistent testing across the dashboard
 */

export interface MockSubreddit {
  id: number;
  name: string;
  display_name_prefixed: string;
  title: string;
  subscribers: number;
  avg_upvotes_per_post: number;
  review?: 'Ok' | 'No Seller' | 'Non Related' | null;
  category_text?: string;
  created_at: string;
  top_content_type?: string;
}

export interface MockUser {
  id: number;
  username: string;
  quality_score: number;
  is_creator: boolean;
  post_count: number;
  total_upvotes: number;
  created_at: string;
}

export interface MockScraperAccount {
  id: number;
  username: string;
  status: 'active' | 'rate_limited' | 'error';
  rate_limit_remaining: number;
  last_used: string;
}

export interface MockProxy {
  id: number;
  ip: string;
  port: number;
  status: 'active' | 'timeout' | 'error';
  latency_ms: number;
  last_checked: string;
}

export class TestDataFixtures {
  // Sample subreddits for testing
  static readonly MOCK_SUBREDDITS: MockSubreddit[] = [
    {
      id: 1,
      name: 'technology',
      display_name_prefixed: 'r/technology',
      title: 'Technology',
      subscribers: 10500000,
      avg_upvotes_per_post: 2500,
      review: null,
      category_text: null,
      created_at: new Date().toISOString(),
      top_content_type: 'link'
    },
    {
      id: 2,
      name: 'programming',
      display_name_prefixed: 'r/programming',
      title: 'Programming',
      subscribers: 3200000,
      avg_upvotes_per_post: 850,
      review: 'Ok',
      category_text: 'Technology',
      created_at: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      top_content_type: 'self'
    },
    {
      id: 3,
      name: 'gaming',
      display_name_prefixed: 'r/gaming',
      title: 'Gaming',
      subscribers: 35000000,
      avg_upvotes_per_post: 4200,
      review: 'Ok',
      category_text: 'Entertainment',
      created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      top_content_type: 'image'
    },
    {
      id: 4,
      name: 'testsubreddit',
      display_name_prefixed: 'r/testsubreddit',
      title: 'Test Subreddit for E2E Testing',
      subscribers: 100,
      avg_upvotes_per_post: 5,
      review: null,
      category_text: null,
      created_at: new Date().toISOString(),
      top_content_type: 'self'
    }
  ];

  // Sample users for testing
  static readonly MOCK_USERS: MockUser[] = [
    {
      id: 1,
      username: 'testuser1',
      quality_score: 85.5,
      is_creator: true,
      post_count: 250,
      total_upvotes: 15000,
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: 2,
      username: 'testuser2',
      quality_score: 72.3,
      is_creator: false,
      post_count: 89,
      total_upvotes: 3200,
      created_at: new Date(Date.now() - 172800000).toISOString()
    },
    {
      id: 3,
      username: 'highqualityuser',
      quality_score: 95.8,
      is_creator: true,
      post_count: 500,
      total_upvotes: 45000,
      created_at: new Date(Date.now() - 259200000).toISOString()
    }
  ];

  // Sample scraper accounts for testing
  static readonly MOCK_SCRAPER_ACCOUNTS: MockScraperAccount[] = [
    {
      id: 1,
      username: 'scraper_account_1',
      status: 'active',
      rate_limit_remaining: 95,
      last_used: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
    },
    {
      id: 2,
      username: 'scraper_account_2',
      status: 'active',
      rate_limit_remaining: 78,
      last_used: new Date(Date.now() - 180000).toISOString() // 3 minutes ago
    },
    {
      id: 3,
      username: 'scraper_account_3',
      status: 'rate_limited',
      rate_limit_remaining: 0,
      last_used: new Date(Date.now() - 60000).toISOString() // 1 minute ago
    }
  ];

  // Sample proxies for testing
  static readonly MOCK_PROXIES: MockProxy[] = [
    {
      id: 1,
      ip: '192.168.1.100',
      port: 8080,
      status: 'active',
      latency_ms: 45,
      last_checked: new Date(Date.now() - 120000).toISOString() // 2 minutes ago
    },
    {
      id: 2,
      ip: '10.0.0.50',
      port: 3128,
      status: 'active',
      latency_ms: 32,
      last_checked: new Date(Date.now() - 180000).toISOString() // 3 minutes ago
    },
    {
      id: 3,
      ip: '172.16.0.75',
      port: 8888,
      status: 'timeout',
      latency_ms: 5000,
      last_checked: new Date(Date.now() - 300000).toISOString() // 5 minutes ago
    }
  ];

  // Categories for testing
  static readonly MOCK_CATEGORIES = [
    'Technology',
    'Entertainment',
    'Gaming',
    'Sports',
    'Business',
    'Education',
    'Health',
    'Travel',
    'Food',
    'Art'
  ];

  // Helper methods to generate test data
  static generateSubreddit(overrides: Partial<MockSubreddit> = {}): MockSubreddit {
    const baseSubreddit = this.MOCK_SUBREDDITS[0];
    const randomId = Math.floor(Math.random() * 10000);
    
    return {
      ...baseSubreddit,
      id: randomId,
      name: `test_subreddit_${randomId}`,
      display_name_prefixed: `r/test_subreddit_${randomId}`,
      title: `Test Subreddit ${randomId}`,
      subscribers: Math.floor(Math.random() * 1000000),
      avg_upvotes_per_post: Math.floor(Math.random() * 5000),
      ...overrides
    };
  }

  static generateUser(overrides: Partial<MockUser> = {}): MockUser {
    const baseUser = this.MOCK_USERS[0];
    const randomId = Math.floor(Math.random() * 10000);
    
    return {
      ...baseUser,
      id: randomId,
      username: `test_user_${randomId}`,
      quality_score: Math.random() * 100,
      is_creator: Math.random() > 0.7, // 30% chance of being creator
      post_count: Math.floor(Math.random() * 1000),
      total_upvotes: Math.floor(Math.random() * 50000),
      ...overrides
    };
  }

  static generateBatchSubreddits(count: number, overrides: Partial<MockSubreddit> = {}): MockSubreddit[] {
    return Array.from({ length: count }, () => this.generateSubreddit(overrides));
  }

  static generateBatchUsers(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
    return Array.from({ length: count }, () => this.generateUser(overrides));
  }

  // Test scenarios
  static getUnreviewedSubreddits(): MockSubreddit[] {
    return this.MOCK_SUBREDDITS.filter(sub => sub.review === null);
  }

  static getOkSubreddits(): MockSubreddit[] {
    return this.MOCK_SUBREDDITS.filter(sub => sub.review === 'Ok');
  }

  static getCategorizedSubreddits(): MockSubreddit[] {
    return this.MOCK_SUBREDDITS.filter(sub => sub.category_text !== null);
  }

  static getUncategorizedSubreddits(): MockSubreddit[] {
    return this.MOCK_SUBREDDITS.filter(sub => sub.category_text === null);
  }

  static getCreatorUsers(): MockUser[] {
    return this.MOCK_USERS.filter(user => user.is_creator);
  }

  static getHighQualityUsers(threshold = 80): MockUser[] {
    return this.MOCK_USERS.filter(user => user.quality_score >= threshold);
  }

  static getActiveScraperAccounts(): MockScraperAccount[] {
    return this.MOCK_SCRAPER_ACCOUNTS.filter(account => account.status === 'active');
  }

  static getActiveProxies(): MockProxy[] {
    return this.MOCK_PROXIES.filter(proxy => proxy.status === 'active');
  }

  // Mock API responses
  static getMockApiResponses() {
    return {
      subreddits: {
        list: this.MOCK_SUBREDDITS,
        unreviewed: this.getUnreviewedSubreddits(),
        ok: this.getOkSubreddits(),
        search: (query: string) => this.MOCK_SUBREDDITS.filter(sub => 
          sub.name.toLowerCase().includes(query.toLowerCase()) ||
          sub.title.toLowerCase().includes(query.toLowerCase())
        )
      },
      users: {
        list: this.MOCK_USERS,
        creators: this.getCreatorUsers(),
        highQuality: this.getHighQualityUsers(),
        search: (query: string) => this.MOCK_USERS.filter(user => 
          user.username.toLowerCase().includes(query.toLowerCase())
        )
      },
      scraper: {
        status: {
          running: true,
          accounts: this.MOCK_SCRAPER_ACCOUNTS,
          proxies: this.MOCK_PROXIES,
          discoveryRate: 15.7,
          qualityScore: 87.3,
          errors: []
        }
      },
      categories: this.MOCK_CATEGORIES
    };
  }

  // Validation helpers
  static isValidSubreddit(subreddit: any): subreddit is MockSubreddit {
    return (
      typeof subreddit.id === 'number' &&
      typeof subreddit.name === 'string' &&
      typeof subreddit.display_name_prefixed === 'string' &&
      typeof subreddit.title === 'string' &&
      typeof subreddit.subscribers === 'number' &&
      typeof subreddit.avg_upvotes_per_post === 'number'
    );
  }

  static isValidUser(user: any): user is MockUser {
    return (
      typeof user.id === 'number' &&
      typeof user.username === 'string' &&
      typeof user.quality_score === 'number' &&
      typeof user.is_creator === 'boolean' &&
      typeof user.post_count === 'number' &&
      typeof user.total_upvotes === 'number'
    );
  }

  // Performance test data
  static generateLargeDataset(size: 'small' | 'medium' | 'large' = 'medium') {
    const sizes = {
      small: { subreddits: 50, users: 20 },
      medium: { subreddits: 500, users: 200 },
      large: { subreddits: 5000, users: 2000 }
    };

    const config = sizes[size];

    return {
      subreddits: this.generateBatchSubreddits(config.subreddits),
      users: this.generateBatchUsers(config.users)
    };
  }
}