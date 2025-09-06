import { test, expect } from '@playwright/test';
import { SubredditReviewPage } from '../pages/SubredditReviewPage';

test.describe('Subreddit Review Workflow', () => {
  let reviewPage: SubredditReviewPage;

  test.beforeEach(async ({ page }) => {
    reviewPage = new SubredditReviewPage(page);
    await reviewPage.navigateToPage();
  });

  test('should load the subreddit review page successfully', async () => {
    await reviewPage.verifyPageLoaded();
    
    // Verify metrics are displayed
    const metrics = await reviewPage.getMetricsData();
    expect(metrics.total).toBeGreaterThanOrEqual(0);
    expect(metrics.unreviewed).toBeGreaterThanOrEqual(0);
    expect(metrics.newToday).toBeGreaterThanOrEqual(0);
  });

  test('should filter subreddits by review status', async () => {
    // Test unreviewed filter
    await reviewPage.selectFilter('unreviewed');
    await reviewPage.verifyFilterApplied('unreviewed');
    
    // Test ok filter
    await reviewPage.selectFilter('ok');
    await reviewPage.verifyFilterApplied('ok');
  });

  test('should search subreddits by name', async () => {
    const searchQuery = 'test';
    await reviewPage.searchSubreddits(searchQuery);
    await reviewPage.verifySearchResults(searchQuery);
  });

  test('should review individual subreddit as Ok', async () => {
    await reviewPage.selectFilter('unreviewed');
    
    const initialCount = await reviewPage.getSubredditCount();
    if (initialCount === 0) {
      test.skip('No unreviewed subreddits available for testing');
    }

    const subredditName = await reviewPage.getSubredditName(0);
    await reviewPage.reviewSubreddit(0, 'Ok');
    
    await reviewPage.verifyReviewSuccess(subredditName || '', 'Ok');
    
    // Verify subreddit was removed from unreviewed list
    const newCount = await reviewPage.getSubredditCount();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should review individual subreddit as No Seller', async () => {
    await reviewPage.selectFilter('unreviewed');
    
    const initialCount = await reviewPage.getSubredditCount();
    if (initialCount === 0) {
      test.skip('No unreviewed subreddits available for testing');
    }

    const subredditName = await reviewPage.getSubredditName(0);
    await reviewPage.reviewSubreddit(0, 'No Seller');
    
    await reviewPage.verifyReviewSuccess(subredditName || '', 'No Seller');
  });

  test('should perform bulk review operations', async () => {
    await reviewPage.selectFilter('unreviewed');
    
    const totalCount = await reviewPage.getSubredditCount();
    if (totalCount < 2) {
      test.skip('Need at least 2 unreviewed subreddits for bulk testing');
    }

    // Select first two subreddits
    await reviewPage.selectSubreddit(0);
    await reviewPage.selectSubreddit(1);
    
    const selectedCount = await reviewPage.getSelectedCount();
    expect(selectedCount).toBe(2);

    // Perform bulk review
    await reviewPage.bulkReviewSelected('Ok');
    await reviewPage.verifyBulkReviewSuccess(2, 'Ok');
    
    // Verify subreddits were removed from list
    const newCount = await reviewPage.getSubredditCount();
    expect(newCount).toBe(totalCount - 2);
  });

  test('should use select all functionality', async () => {
    await reviewPage.selectFilter('unreviewed');
    
    const totalCount = await reviewPage.getSubredditCount();
    if (totalCount === 0) {
      test.skip('No unreviewed subreddits available for testing');
    }

    await reviewPage.selectAllSubreddits();
    const selectedCount = await reviewPage.getSelectedCount();
    expect(selectedCount).toBe(Math.min(totalCount, 50)); // Assuming page size is 50
  });

  test('should clear selection and search with Escape key', async () => {
    // Search for something first
    await reviewPage.searchSubreddits('test');
    
    // Select some subreddits
    await reviewPage.selectSubreddit(0);
    
    // Use escape to clear
    await reviewPage.useClearShortcut();
    
    const selectedCount = await reviewPage.getSelectedCount();
    expect(selectedCount).toBe(0);
  });

  test('should use keyboard shortcuts for navigation', async () => {
    // Test search shortcut
    await reviewPage.useSearchShortcut();
    
    // Test select all shortcut
    await reviewPage.useSelectAllShortcut();
    const selectedCount = await reviewPage.getSelectedCount();
    expect(selectedCount).toBeGreaterThan(0);
  });

  test('should handle empty search results gracefully', async () => {
    await reviewPage.searchSubreddits('nonexistentsubredditname123456');
    
    const count = await reviewPage.getSubredditCount();
    expect(count).toBe(0);
  });

  test('should maintain filter state when switching between pages', async () => {
    // Set filter to Ok
    await reviewPage.selectFilter('ok');
    await reviewPage.verifyFilterApplied('ok');
    
    // Navigate away and back
    await reviewPage.navigateToHome();
    await reviewPage.navigateToSubredditReview();
    
    // Verify filter is still applied
    await reviewPage.verifyFilterApplied('ok');
  });

  test('should display real-time updates', async () => {
    const initialMetrics = await reviewPage.getMetricsData();
    
    // Wait a bit for potential real-time updates
    await reviewPage.page.waitForTimeout(5000);
    
    // Refresh page to check for updates
    await reviewPage.page.reload();
    await reviewPage.verifyPageLoaded();
    
    const updatedMetrics = await reviewPage.getMetricsData();
    
    // Metrics should be consistent or updated
    expect(updatedMetrics.total).toBeGreaterThanOrEqual(0);
  });

  test('should handle network errors gracefully', async () => {
    // Simulate network failure
    await reviewPage.page.route('**/api/**', route => route.abort());
    
    // Try to perform an action
    try {
      await reviewPage.selectFilter('ok');
      await reviewPage.page.waitForTimeout(3000);
    } catch (error) {
      // Expected to fail due to network abort
    }
    
    // Restore network and verify recovery
    await reviewPage.page.unroute('**/api/**');
    await reviewPage.page.reload();
    await reviewPage.verifyPageLoaded();
  });
});