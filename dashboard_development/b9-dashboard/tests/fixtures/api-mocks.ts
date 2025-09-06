import { Page } from '@playwright/test';
import { TestDataFixtures } from './test-data';

/**
 * API mocking utilities for consistent testing
 */
export class ApiMocks {
  constructor(private page: Page) {}

  /**
   * Mock all API endpoints with test data
   */
  async mockAllApis() {
    await this.mockSubredditApi();
    await this.mockUserApi();
    await this.mockScraperApi();
    await this.mockCategoryApi();
    await this.mockHealthApi();
  }

  /**
   * Mock Subreddit-related API endpoints
   */
  async mockSubredditApi() {
    const mockData = TestDataFixtures.getMockApiResponses();

    // GET /api/subreddits - List all subreddits
    await this.page.route('**/api/subreddits', async route => {
      const url = new URL(route.request().url());
      const review = url.searchParams.get('review');
      const search = url.searchParams.get('search');
      
      let subreddits = mockData.subreddits.list;
      
      if (review === 'null' || review === '') {
        subreddits = mockData.subreddits.unreviewed;
      } else if (review === 'Ok') {
        subreddits = mockData.subreddits.ok;
      }
      
      if (search) {
        subreddits = mockData.subreddits.search(search);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: subreddits,
          count: subreddits.length,
          total: mockData.subreddits.list.length
        })
      });
    });

    // PATCH /api/subreddits/:id - Update subreddit review
    await this.page.route('**/api/subreddits/*', async route => {
      if (route.request().method() === 'PATCH') {
        const body = await route.request().postDataJSON();
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: `Subreddit updated with review: ${body.review}`
          })
        });
      } else {
        await route.continue();
      }
    });

    // POST /api/subreddits/bulk-update - Bulk update reviews
    await this.page.route('**/api/subreddits/bulk-update', async route => {
      const body = await route.request().postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: `${body.ids.length} subreddits updated with review: ${body.review}`,
          updated: body.ids.length
        })
      });
    });
  }

  /**
   * Mock User-related API endpoints
   */
  async mockUserApi() {
    const mockData = TestDataFixtures.getMockApiResponses();

    // GET /api/users - List users
    await this.page.route('**/api/users', async route => {
      const url = new URL(route.request().url());
      const creators = url.searchParams.get('creators');
      const search = url.searchParams.get('search');
      const minQuality = url.searchParams.get('minQuality');
      
      let users = mockData.users.list;
      
      if (creators === 'true') {
        users = mockData.users.creators;
      }
      
      if (search) {
        users = mockData.users.search(search);
      }
      
      if (minQuality) {
        const threshold = parseInt(minQuality);
        users = users.filter(user => user.quality_score >= threshold);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: users,
          count: users.length,
          total: mockData.users.list.length,
          metrics: {
            totalUsers: mockData.users.list.length,
            creators: mockData.users.creators.length,
            averageQuality: mockData.users.list.reduce((sum, user) => sum + user.quality_score, 0) / mockData.users.list.length,
            activeUsers: mockData.users.list.filter(user => user.post_count > 0).length
          }
        })
      });
    });

    // POST /api/users/toggle-creator - Toggle creator status
    await this.page.route('**/api/users/toggle-creator', async route => {
      const body = await route.request().postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: `User ${body.userId} creator status toggled`,
          isCreator: !body.currentStatus
        })
      });
    });

    // POST /api/users/bulk-toggle-creator - Bulk toggle creator status
    await this.page.route('**/api/users/bulk-toggle-creator', async route => {
      const body = await route.request().postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: `${body.userIds.length} users creator status toggled`,
          updated: body.userIds.length
        })
      });
    });

    // GET /api/users/:id - Get user details
    await this.page.route('**/api/users/*', async route => {
      if (route.request().method() === 'GET') {
        const userId = route.request().url().split('/').pop();
        const user = mockData.users.list.find(u => u.id.toString() === userId);
        
        if (user) {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              ...user,
              profile: {
                bio: `Mock bio for ${user.username}`,
                location: 'Mock Location',
                joinedDate: user.created_at
              },
              postHistory: [
                { title: 'Mock Post 1', upvotes: 150, subreddit: 'r/test' },
                { title: 'Mock Post 2', upvotes: 89, subreddit: 'r/mock' }
              ],
              engagement: {
                averageUpvotes: Math.floor(user.total_upvotes / user.post_count),
                engagementRate: 0.85,
                bestPost: { title: 'Best Mock Post', upvotes: 500 }
              }
            })
          });
        } else {
          await route.fulfill({ status: 404 });
        }
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Mock Scraper-related API endpoints
   */
  async mockScraperApi() {
    const mockData = TestDataFixtures.getMockApiResponses();

    // GET /api/scraper/status - Get scraper status
    await this.page.route('**/api/scraper/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'running',
          accounts: {
            total: mockData.scraper.status.accounts.length,
            active: TestDataFixtures.getActiveScraperAccounts().length,
            rateLimited: mockData.scraper.status.accounts.filter(a => a.status === 'rate_limited').length,
            details: mockData.scraper.status.accounts
          },
          proxies: {
            total: mockData.scraper.status.proxies.length,
            active: TestDataFixtures.getActiveProxies().length,
            details: mockData.scraper.status.proxies
          },
          metrics: {
            discoveryRate: mockData.scraper.status.discoveryRate,
            qualityScore: mockData.scraper.status.qualityScore,
            lastUpdate: new Date().toISOString(),
            errors: mockData.scraper.status.errors,
            subredditsDiscovered: Math.floor(Math.random() * 1000) + 500,
            usersAnalyzed: Math.floor(Math.random() * 5000) + 2000
          }
        })
      });
    });

    // GET /api/scraper/accounts - Get scraper accounts
    await this.page.route('**/api/scraper/accounts', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accounts: mockData.scraper.status.accounts,
          summary: {
            total: mockData.scraper.status.accounts.length,
            active: TestDataFixtures.getActiveScraperAccounts().length,
            rateLimited: mockData.scraper.status.accounts.filter(a => a.status === 'rate_limited').length
          }
        })
      });
    });

    // POST /api/scraper/start - Start scraper
    await this.page.route('**/api/scraper/start', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Scraper started successfully',
          status: 'running'
        })
      });
    });

    // POST /api/scraper/stop - Stop scraper
    await this.page.route('**/api/scraper/stop', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Scraper stopped successfully',
          status: 'stopped'
        })
      });
    });

    // DELETE /api/scraper/errors - Clear errors
    await this.page.route('**/api/scraper/errors', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Errors cleared successfully',
            cleared: 0
          })
        });
      } else {
        await route.continue();
      }
    });
  }

  /**
   * Mock Category-related API endpoints
   */
  async mockCategoryApi() {
    const mockData = TestDataFixtures.getMockApiResponses();

    // GET /api/categories - List categories
    await this.page.route('**/api/categories', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          categories: mockData.categories,
          count: mockData.categories.length
        })
      });
    });

    // POST /api/categories - Create new category
    await this.page.route('**/api/categories', async route => {
      if (route.request().method() === 'POST') {
        const body = await route.request().postDataJSON();
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            category: body.name,
            message: `Category "${body.name}" created successfully`
          })
        });
      } else {
        await route.continue();
      }
    });

    // PATCH /api/categories/bulk-update - Bulk categorize
    await this.page.route('**/api/categories/bulk-update', async route => {
      const body = await route.request().postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: `${body.subredditIds.length} subreddits categorized as "${body.category}"`,
          updated: body.subredditIds.length
        })
      });
    });
  }

  /**
   * Mock AI-related API endpoints
   */
  async mockAiApi() {
    // POST /api/ai/categorize - AI categorization
    await this.page.route('**/api/ai/categorize', async route => {
      const body = await route.request().postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          suggestions: body.subredditIds.map((id: number) => ({
            subredditId: id,
            category: TestDataFixtures.MOCK_CATEGORIES[Math.floor(Math.random() * TestDataFixtures.MOCK_CATEGORIES.length)],
            confidence: Math.random() * 0.3 + 0.7 // 70-100% confidence
          }))
        })
      });
    });

    // POST /api/ai/bulk-categorize - AI bulk categorization
    await this.page.route('**/api/ai/bulk-categorize', async route => {
      const body = await route.request().postDataJSON();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: `AI categorized ${body.subredditIds.length} subreddits`,
          processed: body.subredditIds.length,
          suggestions: body.subredditIds.length
        })
      });
    });

    // GET /api/ai/accuracy-metrics - AI accuracy metrics
    await this.page.route('**/api/ai/accuracy-metrics', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          accuracy: 0.87,
          precision: 0.89,
          recall: 0.85,
          totalPredictions: 1250,
          correctPredictions: 1087,
          lastUpdated: new Date().toISOString()
        })
      });
    });
  }

  /**
   * Mock Health check API
   */
  async mockHealthApi() {
    await this.page.route('**/api/health', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          services: {
            database: 'healthy',
            redis: 'healthy',
            scraper: 'running'
          },
          version: '1.0.0'
        })
      });
    });
  }

  /**
   * Mock error responses for testing error handling
   */
  async mockErrorResponses() {
    // Simulate server errors
    await this.page.route('**/api/error-test', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error',
          message: 'This is a test error for error handling'
        })
      });
    });

    // Simulate network timeouts
    await this.page.route('**/api/timeout-test', async route => {
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second timeout
      await route.continue();
    });

    // Simulate rate limiting
    await this.page.route('**/api/rate-limit-test', async route => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests',
          retryAfter: 60
        })
      });
    });
  }

  /**
   * Remove all mocked routes
   */
  async clearAllMocks() {
    await this.page.unroute('**/api/**');
  }

  /**
   * Mock slow network conditions
   */
  async mockSlowNetwork(delayMs = 1000) {
    await this.page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      await route.continue();
    });
  }

  /**
   * Mock intermittent failures
   */
  async mockIntermittentFailures(failureRate = 0.1) {
    await this.page.route('**/api/**', async route => {
      if (Math.random() < failureRate) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service temporarily unavailable',
            message: 'Intermittent failure simulation'
          })
        });
      } else {
        await route.continue();
      }
    });
  }
}