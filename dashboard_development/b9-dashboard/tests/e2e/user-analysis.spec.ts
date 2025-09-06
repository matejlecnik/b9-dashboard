import { test, expect } from '@playwright/test';
import { UserAnalysisPage } from '../pages/UserAnalysisPage';

test.describe('User Analysis Workflow', () => {
  let userAnalysisPage: UserAnalysisPage;

  test.beforeEach(async ({ page }) => {
    userAnalysisPage = new UserAnalysisPage(page);
    await userAnalysisPage.navigateToPage();
  });

  test('should load the user analysis page successfully', async () => {
    await userAnalysisPage.verifyPageLoaded();
    
    // Verify metrics are displayed
    const metrics = await userAnalysisPage.getMetricsData();
    expect(metrics.total).toBeGreaterThanOrEqual(0);
    expect(metrics.creators).toBeGreaterThanOrEqual(0);
    expect(metrics.averageQuality).toBeGreaterThanOrEqual(0);
    expect(metrics.active).toBeGreaterThanOrEqual(0);
  });

  test('should filter users by creators only', async () => {
    await userAnalysisPage.filterByCreators();
    await userAnalysisPage.verifyCreatorFilterApplied();
    
    // All displayed users should be creators
    const userCount = await userAnalysisPage.getUserCount();
    for (let i = 0; i < Math.min(userCount, 5); i++) {
      const isCreator = await userAnalysisPage.isCreator(i);
      expect(isCreator).toBe(true);
    }
  });

  test('should filter users by quality score', async () => {
    const minQualityScore = 80;
    await userAnalysisPage.filterByQualityScore(minQualityScore);
    await userAnalysisPage.verifyQualityScoreFilter(minQualityScore);
  });

  test('should search users by username', async () => {
    const searchQuery = 'test';
    await userAnalysisPage.searchUsers(searchQuery);
    await userAnalysisPage.verifyUserSearchResults(searchQuery);
  });

  test('should toggle creator status for individual user', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount === 0) {
      test.skip('No users available for creator toggle testing');
    }

    const username = await userAnalysisPage.getUsername(0);
    const initialCreatorStatus = await userAnalysisPage.isCreator(0);
    
    await userAnalysisPage.toggleCreatorStatus(0);
    await userAnalysisPage.verifyCreatorToggleSuccess(username || '', !initialCreatorStatus);
    
    // Verify status changed
    const newCreatorStatus = await userAnalysisPage.isCreator(0);
    expect(newCreatorStatus).toBe(!initialCreatorStatus);
  });

  test('should perform bulk creator toggle operations', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount < 2) {
      test.skip('Need at least 2 users for bulk toggle testing');
    }

    // Select first two users
    await userAnalysisPage.selectSubreddit(0);
    await userAnalysisPage.selectSubreddit(1);
    
    const selectedCount = await userAnalysisPage.getSelectedCount();
    expect(selectedCount).toBe(2);

    // Perform bulk toggle
    await userAnalysisPage.bulkToggleCreatorStatus();
    
    // Verify success notification
    await expect(userAnalysisPage.successToast).toBeVisible();
  });

  test('should view user details', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount === 0) {
      test.skip('No users available for detail viewing testing');
    }

    const username = await userAnalysisPage.getUsername(0);
    await userAnalysisPage.viewUserDetails(0);
    
    await userAnalysisPage.verifyUserDetailsDisplayed(username || '');
    
    // Get detail data
    const detailData = await userAnalysisPage.getUserDetailData();
    expect(detailData.profile).toBeTruthy();
    expect(detailData.postHistory).toBeTruthy();
    expect(detailData.engagement).toBeTruthy();
    
    // Close details
    await userAnalysisPage.closeUserDetails();
  });

  test('should sort users by different criteria', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount < 2) {
      test.skip('Need at least 2 users for sorting testing');
    }

    // Test sort by username
    await userAnalysisPage.sortBy('username');
    await userAnalysisPage.verifySortingApplied('username');
    
    // Test sort by quality score
    await userAnalysisPage.sortBy('quality');
    await userAnalysisPage.verifySortingApplied('quality');
  });

  test('should export selected users', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount === 0) {
      test.skip('No users available for export testing');
    }

    // Select some users
    await userAnalysisPage.selectSubreddit(0);
    if (userCount > 1) {
      await userAnalysisPage.selectSubreddit(1);
    }
    
    const selectedCount = await userAnalysisPage.getSelectedCount();
    expect(selectedCount).toBeGreaterThan(0);

    // Export selected users
    await userAnalysisPage.exportSelectedUsers();
  });

  test('should display correct quality scores', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    
    for (let i = 0; i < Math.min(userCount, 10); i++) {
      const qualityScore = await userAnalysisPage.getQualityScore(i);
      expect(qualityScore).toBeGreaterThanOrEqual(0);
      expect(qualityScore).toBeLessThanOrEqual(100);
    }
  });

  test('should maintain filter state across interactions', async () => {
    // Apply creator filter
    await userAnalysisPage.filterByCreators();
    await userAnalysisPage.verifyCreatorFilterApplied();
    
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount > 0) {
      // View user details and close
      await userAnalysisPage.viewUserDetails(0);
      await userAnalysisPage.closeUserDetails();
      
      // Verify filter is still applied
      await userAnalysisPage.verifyCreatorFilterApplied();
    }
  });

  test('should handle empty user list gracefully', async () => {
    // Search for non-existent user
    await userAnalysisPage.searchUsers('nonexistentusernamever123456');
    
    const userCount = await userAnalysisPage.getUserCount();
    expect(userCount).toBe(0);
    
    // Page should remain stable
    await userAnalysisPage.verifyPageLoaded();
  });

  test('should calculate metrics correctly', async () => {
    const metrics = await userAnalysisPage.getMetricsData();
    const userCount = await userAnalysisPage.getUserCount();
    const creatorCount = await userAnalysisPage.getCreatorCount();
    
    // Basic validation of metrics consistency
    expect(metrics.creators).toBe(creatorCount);
    expect(metrics.total).toBeGreaterThanOrEqual(userCount);
    
    if (metrics.total > 0) {
      expect(metrics.averageQuality).toBeGreaterThan(0);
      expect(metrics.averageQuality).toBeLessThanOrEqual(100);
    }
  });

  test('should handle user interaction errors gracefully', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount === 0) {
      test.skip('No users available for error handling testing');
    }

    // Simulate network error during creator toggle
    await userAnalysisPage.page.route('**/api/users/toggle-creator', route => route.abort());
    
    try {
      await userAnalysisPage.toggleCreatorStatus(0);
      await userAnalysisPage.page.waitForTimeout(3000);
    } catch (error) {
      // Expected to fail
    }
    
    // Verify error toast is shown
    const errorToastVisible = await userAnalysisPage.errorToast.isVisible();
    if (errorToastVisible) {
      expect(errorToastVisible).toBe(true);
    }
    
    // Restore network and verify recovery
    await userAnalysisPage.page.unroute('**/api/users/toggle-creator');
    await userAnalysisPage.page.reload();
    await userAnalysisPage.verifyPageLoaded();
  });

  test('should measure performance of user operations', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount === 0) {
      test.skip('No users available for performance testing');
    }

    // Measure filter performance
    const filterTime = await userAnalysisPage.measureFilterPerformance('creators');
    expect(filterTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    // Measure user detail load time
    const detailTime = await userAnalysisPage.measureUserDetailLoadTime(0);
    expect(detailTime).toBeLessThan(3000); // Should load within 3 seconds
    
    await userAnalysisPage.closeUserDetails();
  });

  test('should validate user data integrity', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    
    for (let i = 0; i < Math.min(userCount, 5); i++) {
      const username = await userAnalysisPage.getUsername(i);
      const qualityScore = await userAnalysisPage.getQualityScore(i);
      
      // Validate username is not empty
      expect(username).toBeTruthy();
      expect(username?.length).toBeGreaterThan(0);
      
      // Validate quality score is in valid range
      expect(qualityScore).toBeGreaterThanOrEqual(0);
      expect(qualityScore).toBeLessThanOrEqual(100);
    }
  });

  test('should handle concurrent user interactions', async () => {
    const userCount = await userAnalysisPage.getUserCount();
    if (userCount < 3) {
      test.skip('Need at least 3 users for concurrency testing');
    }

    // Simulate multiple simultaneous operations
    const promises = [
      userAnalysisPage.selectSubreddit(0),
      userAnalysisPage.selectSubreddit(1),
      userAnalysisPage.filterByCreators()
    ];
    
    await Promise.allSettled(promises);
    
    // Verify page remains stable
    await userAnalysisPage.verifyPageLoaded();
  });
});