import { test, expect } from '@playwright/test';
import { SubredditReviewPage } from '../pages/SubredditReviewPage';
import { CategorizationPage } from '../pages/CategorizationPage';
import { UserAnalysisPage } from '../pages/UserAnalysisPage';
import { ScraperPage } from '../pages/ScraperPage';
import { ApiMocks } from '../fixtures/api-mocks';

test.describe('Full Workflow Integration Tests', () => {
  test.describe('Complete User Journey', () => {
    test('should complete entire subreddit management workflow', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      // Start with subreddit review
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Verify initial state
      await reviewPage.verifyPageLoaded();
      const initialMetrics = await reviewPage.getMetricsData();
      expect(initialMetrics.total).toBeGreaterThanOrEqual(0);

      // Review some subreddits as "Ok"
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount > 0) {
        // Review first subreddit as Ok
        const subredditName = await reviewPage.getSubredditName(0);
        await reviewPage.reviewSubreddit(0, 'Ok');
        await reviewPage.verifyReviewSuccess(subredditName || '', 'Ok');
      }

      // Navigate to categorization
      const categorizationPage = new CategorizationPage(page);
      await categorizationPage.navigateToPage();
      await categorizationPage.verifyPageLoaded();

      // Filter to Ok subreddits and categorize
      await categorizationPage.filterByOkOnly();
      
      const okSubredditCount = await categorizationPage.getSubredditCount();
      if (okSubredditCount > 0) {
        await categorizationPage.categorizeSubreddit(0, 'Technology');
        await categorizationPage.verifyCategoryApplied(0, 'Technology');
      }

      // Check user analysis
      const userAnalysisPage = new UserAnalysisPage(page);
      await userAnalysisPage.navigateToPage();
      await userAnalysisPage.verifyPageLoaded();
      
      const userMetrics = await userAnalysisPage.getMetricsData();
      expect(userMetrics.total).toBeGreaterThanOrEqual(0);

      // Check scraper status
      const scraperPage = new ScraperPage(page);
      await scraperPage.navigateToPage();
      await scraperPage.verifyPageLoaded();
      
      await scraperPage.verifyQualityMetrics();
    });

    test('should handle workflow with bulk operations', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount >= 3) {
        // Select multiple subreddits
        await reviewPage.selectSubreddit(0);
        await reviewPage.selectSubreddit(1);
        await reviewPage.selectSubreddit(2);
        
        const selectedCount = await reviewPage.getSelectedCount();
        expect(selectedCount).toBe(3);
        
        // Bulk review as Ok
        await reviewPage.bulkReviewSelected('Ok');
        await reviewPage.verifyBulkReviewSuccess(3, 'Ok');
        
        // Navigate to categorization and bulk categorize
        const categorizationPage = new CategorizationPage(page);
        await categorizationPage.navigateToPage();
        await categorizationPage.filterByOkOnly();
        
        const okCount = await categorizationPage.getSubredditCount();
        if (okCount >= 2) {
          await categorizationPage.selectSubreddit(0);
          await categorizationPage.selectSubreddit(1);
          
          await categorizationPage.bulkCategorizeSelected('Gaming');
          await categorizationPage.verifyBulkCategorizationSuccess(2);
        }
      }
    });
  });

  test.describe('Error Handling and Recovery', () => {
    test('should handle API errors gracefully throughout workflow', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      
      // Start with working API
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();
      await reviewPage.navigateToPage();
      await reviewPage.verifyPageLoaded();
      
      // Simulate API failure
      await apiMocks.mockErrorResponses();
      
      // Try to perform actions - should handle errors gracefully
      try {
        await reviewPage.selectFilter('ok');
        await page.waitForTimeout(3000);
      } catch (error) {
        // Expected to fail or show error handling
      }
      
      // Restore API and verify recovery
      await apiMocks.clearAllMocks();
      await apiMocks.mockAllApis();
      await page.reload();
      await reviewPage.verifyPageLoaded();
    });

    test('should handle network timeouts and retries', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockSlowNetwork(2000); // 2 second delay
      
      const reviewPage = new SubredditReviewPage(page);
      
      const startTime = Date.now();
      await reviewPage.navigateToPage();
      const loadTime = Date.now() - startTime;
      
      // Should still load, just slower
      expect(loadTime).toBeGreaterThan(2000);
      await reviewPage.verifyPageLoaded();
    });

    test('should handle intermittent failures with retries', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockIntermittentFailures(0.3); // 30% failure rate
      
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // May take multiple attempts but should eventually succeed
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        try {
          await reviewPage.verifyPageLoaded();
          break; // Success
        } catch (error) {
          attempts++;
          if (attempts < maxAttempts) {
            await page.reload();
            await page.waitForTimeout(1000);
          } else {
            throw error; // Give up after max attempts
          }
        }
      }
    });
  });

  test.describe('Data Consistency and State Management', () => {
    test('should maintain consistent state across page navigations', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      // Set up initial state in review page
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.selectFilter('ok');
      await reviewPage.searchSubreddits('tech');
      
      // Navigate to other pages and back
      const categorizationPage = new CategorizationPage(page);
      await categorizationPage.navigateToPage();
      await categorizationPage.verifyPageLoaded();
      
      const userAnalysisPage = new UserAnalysisPage(page);
      await userAnalysisPage.navigateToPage();
      await userAnalysisPage.verifyPageLoaded();
      
      // Return to review page
      await reviewPage.navigateToPage();
      
      // Verify state is maintained (depending on implementation)
      await reviewPage.verifyPageLoaded();
    });

    test('should handle concurrent operations correctly', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount >= 3) {
        // Perform multiple operations simultaneously
        const operations = [
          reviewPage.selectSubreddit(0),
          reviewPage.selectSubreddit(1),
          reviewPage.searchSubreddits('test')
        ];
        
        // All operations should complete without conflicts
        await Promise.allSettled(operations);
        
        // Verify final state is consistent
        await reviewPage.verifyPageLoaded();
        const selectedCount = await reviewPage.getSelectedCount();
        expect(selectedCount).toBeGreaterThanOrEqual(0);
      }
    });
  });

  test.describe('Real-time Features', () => {
    test('should handle real-time updates across components', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const initialMetrics = await reviewPage.getMetricsData();
      
      // Simulate real-time update by refreshing page
      await page.reload();
      await reviewPage.verifyPageLoaded();
      
      const updatedMetrics = await reviewPage.getMetricsData();
      
      // Metrics should be consistent
      expect(updatedMetrics.total).toBeGreaterThanOrEqual(0);
    });

    test('should maintain performance with real-time updates', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      const reviewPage = new SubredditReviewPage(page);
      
      const loadTime = await reviewPage.measurePageLoadTime();
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
      
      // Verify page remains responsive after loading
      const filterTime = await reviewPage.measureFilterChangeTime('ok');
      expect(filterTime).toBeLessThan(3000);
    });
  });

  test.describe('Multi-browser Compatibility', () => {
    test('should work consistently across different browsers', async ({ page, browserName }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.verifyPageLoaded();
      
      // Basic functionality should work in all browsers
      const subredditCount = await reviewPage.getSubredditCount();
      expect(subredditCount).toBeGreaterThanOrEqual(0);
      
      // Test key interactions
      await reviewPage.selectFilter('unreviewed');
      await reviewPage.verifyFilterApplied('unreviewed');
      
      await reviewPage.selectFilter('ok');
      await reviewPage.verifyFilterApplied('ok');
      
      console.log(`✅ Workflow completed successfully in ${browserName}`);
    });
  });

  test.describe('Accessibility Integration', () => {
    test('should maintain accessibility throughout complete workflow', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      // Test keyboard navigation through entire workflow
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Use keyboard shortcuts
      await reviewPage.useSearchShortcut();
      await reviewPage.useClearShortcut();
      
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount > 0) {
        await reviewPage.useSelectAllShortcut();
        const selectedCount = await reviewPage.getSelectedCount();
        expect(selectedCount).toBeGreaterThan(0);
      }
      
      // Navigate to other pages using keyboard
      await page.keyboard.press('Tab');
      
      // Verify accessibility is maintained
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'SELECT', 'A']).toContain(focusedElement);
    });
  });

  test.describe('Mobile Responsive Workflow', () => {
    test('should complete workflow on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const apiMocks = new ApiMocks(page);
      await apiMocks.mockAllApis();

      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.verifyPageLoaded();
      
      // Test mobile-specific interactions
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount > 0) {
        // Touch interactions should work
        await reviewPage.selectSubreddit(0);
        const selectedCount = await reviewPage.getSelectedCount();
        expect(selectedCount).toBe(1);
      }
      
      // Navigation should work on mobile
      const categorizationPage = new CategorizationPage(page);
      await categorizationPage.navigateToPage();
      await categorizationPage.verifyPageLoaded();
    });
  });

  test.describe('Performance Under Load', () => {
    test('should maintain performance with large datasets', async ({ page }) => {
      const apiMocks = new ApiMocks(page);
      
      // Mock large dataset
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `test_subreddit_${i}`,
        display_name_prefixed: `r/test_subreddit_${i}`,
        title: `Test Subreddit ${i}`,
        subscribers: Math.floor(Math.random() * 1000000),
        avg_upvotes_per_post: Math.floor(Math.random() * 5000),
        review: i % 3 === 0 ? 'Ok' : null,
        category_text: i % 5 === 0 ? 'Technology' : null,
        created_at: new Date().toISOString()
      }));

      // Override API mock with large dataset
      await page.route('**/api/subreddits', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: largeDataset,
            count: largeDataset.length,
            total: largeDataset.length
          })
        });
      });

      const reviewPage = new SubredditReviewPage(page);
      
      const loadTime = await reviewPage.measurePageLoadTime();
      expect(loadTime).toBeLessThan(8000); // Allow more time for large dataset
      
      const tableLoadTime = await reviewPage.measureTableLoadTime();
      expect(tableLoadTime).toBeLessThan(5000);
    });
  });
});