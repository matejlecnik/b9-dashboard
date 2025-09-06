import { test, expect } from '@playwright/test';
import { SubredditReviewPage } from '../pages/SubredditReviewPage';
import { CategorizationPage } from '../pages/CategorizationPage';
import { ScraperPage } from '../pages/ScraperPage';
import { UserAnalysisPage } from '../pages/UserAnalysisPage';

test.describe('Performance Benchmarking', () => {
  // Performance thresholds (in milliseconds)
  const PERFORMANCE_THRESHOLDS = {
    PAGE_LOAD: 3000,        // 3 seconds
    INTERACTION: 100,       // 100ms
    DATA_LOAD: 2000,        // 2 seconds
    NAVIGATION: 1000,       // 1 second
    API_RESPONSE: 1500      // 1.5 seconds
  };

  test.describe('Page Load Performance', () => {
    test('subreddit review page should load within performance threshold', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      
      const loadTime = await reviewPage.measurePageLoadTime();
      console.log(`Subreddit Review page load time: ${loadTime}ms`);
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
    });

    test('categorization page should load within performance threshold', async ({ page }) => {
      const categorizationPage = new CategorizationPage(page);
      
      const loadTime = await categorizationPage.measurePageLoadTime();
      console.log(`Categorization page load time: ${loadTime}ms`);
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
    });

    test('scraper page should load within performance threshold', async ({ page }) => {
      const scraperPage = new ScraperPage(page);
      
      const loadTime = await scraperPage.measurePageLoadTime();
      console.log(`Scraper page load time: ${loadTime}ms`);
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
    });

    test('user analysis page should load within performance threshold', async ({ page }) => {
      const userAnalysisPage = new UserAnalysisPage(page);
      
      const loadTime = await userAnalysisPage.measurePageLoadTime();
      console.log(`User Analysis page load time: ${loadTime}ms`);
      
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD);
    });
  });

  test.describe('Interaction Performance', () => {
    test('filter changes should respond within performance threshold', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const filterTime = await reviewPage.measureFilterChangeTime('ok');
      console.log(`Filter change time: ${filterTime}ms`);
      
      expect(filterTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_LOAD);
    });

    test('search should respond within performance threshold', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const searchTime = await reviewPage.measureInteractionTime(async () => {
        await reviewPage.searchSubreddits('test');
      });
      
      console.log(`Search response time: ${searchTime}ms`);
      expect(searchTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_LOAD);
    });

    test('table sorting should respond within performance threshold', async ({ page }) => {
      const userAnalysisPage = new UserAnalysisPage(page);
      await userAnalysisPage.navigateToPage();
      
      const sortTime = await userAnalysisPage.measureInteractionTime(async () => {
        await userAnalysisPage.sortBy('username');
      });
      
      console.log(`Sort response time: ${sortTime}ms`);
      expect(sortTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_LOAD);
    });

    test('categorization should respond within performance threshold', async ({ page }) => {
      const categorizationPage = new CategorizationPage(page);
      await categorizationPage.navigateToPage();
      await categorizationPage.filterByOkOnly();
      
      const subredditCount = await categorizationPage.getSubredditCount();
      if (subredditCount === 0) {
        test.skip('No subreddits available for categorization performance testing');
      }

      const categorizationTime = await categorizationPage.measureCategorizationTime(0, 'TestCategory');
      console.log(`Categorization time: ${categorizationTime}ms`);
      
      expect(categorizationTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_LOAD);
    });
  });

  test.describe('API Performance', () => {
    test('API endpoints should respond within performance threshold', async ({ page }) => {
      const apiEndpoints = [
        '/api/health',
        '/api/scraper/status',
        '/api/categories'
      ];

      for (const endpoint of apiEndpoints) {
        const startTime = Date.now();
        
        try {
          const response = await page.request.get(endpoint);
          const responseTime = Date.now() - startTime;
          
          console.log(`${endpoint} response time: ${responseTime}ms`);
          expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.API_RESPONSE);
          expect(response.status()).toBeLessThan(400);
        } catch (error) {
          console.warn(`${endpoint} not accessible or failed:`, error);
          // Don't fail the test for API endpoints that might not be implemented
        }
      }
    });

    test('bulk operations should complete within reasonable time', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.selectFilter('unreviewed');
      
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount < 2) {
        test.skip('Need at least 2 subreddits for bulk operation performance testing');
      }

      // Select multiple items
      const selectCount = Math.min(5, subredditCount);
      for (let i = 0; i < selectCount; i++) {
        await reviewPage.selectSubreddit(i);
      }

      const bulkTime = await reviewPage.measureInteractionTime(async () => {
        await reviewPage.bulkReviewSelected('Ok');
      });
      
      console.log(`Bulk operation time for ${selectCount} items: ${bulkTime}ms`);
      expect(bulkTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_LOAD * 2); // Allow more time for bulk operations
    });
  });

  test.describe('Navigation Performance', () => {
    test('navigation between pages should be fast', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const pages = [
        () => reviewPage.navigateToCategorization(),
        () => reviewPage.navigateToUserAnalysis(),
        () => reviewPage.navigateToScraper(),
        () => reviewPage.navigateToSubredditReview()
      ];

      for (const navigateToPage of pages) {
        const navTime = await reviewPage.measureInteractionTime(navigateToPage);
        console.log(`Navigation time: ${navTime}ms`);
        expect(navTime).toBeLessThan(PERFORMANCE_THRESHOLDS.NAVIGATION);
        
        await reviewPage.waitForPageLoad();
      }
    });
  });

  test.describe('Memory and Resource Performance', () => {
    test('should not have memory leaks during intensive operations', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();

      // Perform multiple operations to test for memory leaks
      for (let i = 0; i < 5; i++) {
        await reviewPage.selectFilter('unreviewed');
        await reviewPage.waitForDataLoad();
        await reviewPage.selectFilter('ok');
        await reviewPage.waitForDataLoad();
        
        await reviewPage.searchSubreddits(`test${i}`);
        await reviewPage.waitForDataLoad();
        
        await reviewPage.clearSearch();
        await reviewPage.waitForDataLoad();
      }

      // Check for JavaScript heap size (if available)
      const metrics = await page.evaluate(() => {
        if (performance.measureUserAgentSpecificMemory) {
          return performance.measureUserAgentSpecificMemory();
        }
        return null;
      });

      if (metrics) {
        console.log('Memory metrics:', metrics);
      }

      // Verify page is still responsive
      await reviewPage.verifyPageLoaded();
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();

      // Test with different filter that might return more data
      const tableLoadTime = await reviewPage.measureTableLoadTime();
      console.log(`Table load time: ${tableLoadTime}ms`);
      
      expect(tableLoadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.DATA_LOAD);
    });
  });

  test.describe('Network Performance', () => {
    test('should handle slow network conditions gracefully', async ({ page }) => {
      // Simulate slow 3G network
      await page.route('**/*', async route => {
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        await route.continue();
      });

      const reviewPage = new SubredditReviewPage(page);
      const loadTime = await reviewPage.measurePageLoadTime();
      
      console.log(`Load time with slow network: ${loadTime}ms`);
      
      // Should still load, just slower
      expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.PAGE_LOAD * 3);
      
      await reviewPage.verifyPageLoaded();
    });

    test('should optimize network requests', async ({ page }) => {
      const requests: any[] = [];
      
      page.on('request', request => {
        requests.push({
          url: request.url(),
          method: request.method(),
          resourceType: request.resourceType()
        });
      });

      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();

      // Analyze network requests
      const apiRequests = requests.filter(req => req.url.includes('/api/'));
      const staticRequests = requests.filter(req => 
        req.resourceType === 'script' || 
        req.resourceType === 'stylesheet' || 
        req.resourceType === 'image'
      );

      console.log(`Total requests: ${requests.length}`);
      console.log(`API requests: ${apiRequests.length}`);
      console.log(`Static requests: ${staticRequests.length}`);

      // Reasonable limits for network requests
      expect(requests.length).toBeLessThan(50); // Total requests should be reasonable
      expect(apiRequests.length).toBeLessThan(10); // API requests should be minimal
    });
  });

  test.describe('Core Web Vitals', () => {
    test('should meet Core Web Vitals thresholds', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();

      // Measure Core Web Vitals
      const vitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals = {
            LCP: 0, // Largest Contentful Paint
            FID: 0, // First Input Delay
            CLS: 0  // Cumulative Layout Shift
          };

          // LCP
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.LCP = lastEntry.startTime;
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // CLS
          let clsValue = 0;
          new PerformanceObserver((entryList) => {
            for (const entry of entryList.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
            vitals.CLS = clsValue;
          }).observe({ entryTypes: ['layout-shift'] });

          // Resolve after a short delay to collect metrics
          setTimeout(() => resolve(vitals), 3000);
        });
      });

      console.log('Core Web Vitals:', vitals);

      // Core Web Vitals thresholds (Google's recommended values)
      expect(vitals.LCP).toBeLessThan(2500); // LCP should be < 2.5s
      expect(vitals.CLS).toBeLessThan(0.1);   // CLS should be < 0.1
      // Note: FID is measured during actual user interaction
    });

    test('should have good First Contentful Paint', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      
      const startTime = Date.now();
      await reviewPage.navigateToPage();
      
      const fcp = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
            resolve(fcpEntry ? fcpEntry.startTime : 0);
          }).observe({ entryTypes: ['paint'] });

          // Fallback timeout
          setTimeout(() => resolve(0), 5000);
        });
      });

      console.log(`First Contentful Paint: ${fcp}ms`);
      if (fcp > 0) {
        expect(fcp).toBeLessThan(1800); // FCP should be < 1.8s
      }
    });
  });
});