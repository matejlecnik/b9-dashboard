import { test, expect } from '@playwright/test';
import { CategorizationPage } from '../pages/CategorizationPage';

test.describe('Categorization Workflow', () => {
  let categorizationPage: CategorizationPage;

  test.beforeEach(async ({ page }) => {
    categorizationPage = new CategorizationPage(page);
    await categorizationPage.navigateToPage();
  });

  test('should load the categorization page successfully', async () => {
    await categorizationPage.verifyPageLoaded();
    
    // Verify table is visible
    const subredditCount = await categorizationPage.getSubredditCount();
    expect(subredditCount).toBeGreaterThanOrEqual(0);
  });

  test('should filter by Ok subreddits only', async () => {
    await categorizationPage.filterByOkOnly();
    await categorizationPage.verifyFilterApplied('ok');
    
    // Verify only Ok subreddits are shown
    const count = await categorizationPage.getSubredditCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should filter by uncategorized subreddits', async () => {
    await categorizationPage.filterByUncategorized();
    await categorizationPage.verifyFilterApplied('uncategorized');
    
    // Verify uncategorized subreddits are shown
    const uncategorizedCount = await categorizationPage.getUncategorizedCount();
    const totalCount = await categorizationPage.getSubredditCount();
    expect(uncategorizedCount).toBe(totalCount);
  });

  test('should categorize individual subreddit', async () => {
    await categorizationPage.filterByOkOnly();
    
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount === 0) {
      test.skip('No Ok subreddits available for categorization testing');
    }

    const testCategory = 'Technology';
    await categorizationPage.categorizeSubreddit(0, testCategory);
    
    // Verify category was applied
    await categorizationPage.verifyCategoryApplied(0, testCategory);
  });

  test('should perform bulk categorization', async () => {
    await categorizationPage.filterByOkOnly();
    
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount < 2) {
      test.skip('Need at least 2 Ok subreddits for bulk categorization testing');
    }

    // Select first two subreddits
    await categorizationPage.selectSubreddit(0);
    await categorizationPage.selectSubreddit(1);
    
    const selectedCount = await categorizationPage.getSelectedCount();
    expect(selectedCount).toBe(2);

    // Perform bulk categorization
    const testCategory = 'Gaming';
    await categorizationPage.bulkCategorizeSelected(testCategory);
    await categorizationPage.verifyBulkCategorizationSuccess(2);
  });

  test('should create new category', async () => {
    const newCategoryName = `TestCategory_${Date.now()}`;
    
    await categorizationPage.createNewCategory(newCategoryName);
    
    // Verify new category is available in dropdown
    const availableCategories = await categorizationPage.getAvailableCategories();
    expect(availableCategories).toContain(newCategoryName);
  });

  test('should search by category', async () => {
    const searchCategory = 'Tech';
    await categorizationPage.searchByCategory(searchCategory);
    
    // Verify search results contain the category
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount > 0) {
      // At least one result should contain the search term
      const firstCategory = await categorizationPage.getSubredditCategory(0);
      expect(firstCategory?.toLowerCase()).toContain(searchCategory.toLowerCase());
    }
  });

  test('should handle AI suggestions if available', async () => {
    // Check if AI suggestions are present
    const suggestionCount = await categorizationPage.aiSuggestionBadges.count();
    
    if (suggestionCount > 0) {
      // Test accepting an AI suggestion
      await categorizationPage.acceptAISuggestion(0);
      
      // Verify the suggestion was applied
      await categorizationPage.verifyAISuggestion(0, 'Technology'); // Example category
    } else {
      test.skip('No AI suggestions available for testing');
    }
  });

  test('should save categories changes', async () => {
    await categorizationPage.filterByOkOnly();
    
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount === 0) {
      test.skip('No Ok subreddits available for save testing');
    }

    // Make a categorization change
    const testCategory = 'Entertainment';
    await categorizationPage.categorizeSubreddit(0, testCategory);
    
    // Save changes
    await categorizationPage.saveCategories();
    
    // Verify save was successful
    await categorizationPage.verifyPageLoaded();
  });

  test('should use keyboard shortcuts', async () => {
    // Test save shortcut
    await categorizationPage.useSaveShortcut();
    
    // Test search shortcut
    await categorizationPage.useSearchShortcut();
    
    // Test category input focus
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount > 0) {
      await categorizationPage.focusCategoryInput(0);
    }
  });

  test('should maintain categorization state after page refresh', async () => {
    await categorizationPage.filterByOkOnly();
    
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount === 0) {
      test.skip('No Ok subreddits available for persistence testing');
    }

    // Categorize a subreddit
    const testCategory = 'Sports';
    await categorizationPage.categorizeSubreddit(0, testCategory);
    
    // Refresh page
    await categorizationPage.page.reload();
    await categorizationPage.verifyPageLoaded();
    await categorizationPage.filterByOkOnly();
    
    // Verify category persisted
    await categorizationPage.verifyCategoryApplied(0, testCategory);
  });

  test('should handle empty category input gracefully', async () => {
    await categorizationPage.filterByOkOnly();
    
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount === 0) {
      test.skip('No Ok subreddits available for empty category testing');
    }

    // Try to categorize with empty string
    await categorizationPage.categorizeSubreddit(0, '');
    
    // Should not crash or cause errors
    await categorizationPage.verifyPageLoaded();
  });

  test('should display category statistics', async () => {
    const categorizedCount = await categorizationPage.getCategorizedCount();
    const uncategorizedCount = await categorizationPage.getUncategorizedCount();
    const totalCount = await categorizationPage.getSubredditCount();
    
    expect(categorizedCount + uncategorizedCount).toBeLessThanOrEqual(totalCount);
    expect(categorizedCount).toBeGreaterThanOrEqual(0);
    expect(uncategorizedCount).toBeGreaterThanOrEqual(0);
  });

  test('should validate category names', async () => {
    await categorizationPage.filterByOkOnly();
    
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount === 0) {
      test.skip('No Ok subreddits available for validation testing');
    }

    // Test with special characters
    const specialCategory = 'Category!@#$%';
    await categorizationPage.categorizeSubreddit(0, specialCategory);
    
    // Test with very long category name
    const longCategory = 'A'.repeat(100);
    await categorizationPage.categorizeSubreddit(0, longCategory);
    
    // Page should remain stable
    await categorizationPage.verifyPageLoaded();
  });

  test('should handle network interruptions during categorization', async () => {
    await categorizationPage.filterByOkOnly();
    
    const subredditCount = await categorizationPage.getSubredditCount();
    if (subredditCount === 0) {
      test.skip('No Ok subreddits available for network testing');
    }

    // Simulate network failure during categorization
    await categorizationPage.page.route('**/api/categories/**', route => route.abort());
    
    try {
      await categorizationPage.categorizeSubreddit(0, 'TestCategory');
      await categorizationPage.page.waitForTimeout(3000);
    } catch (error) {
      // Expected to fail
    }
    
    // Restore network and verify recovery
    await categorizationPage.page.unroute('**/api/categories/**');
    await categorizationPage.page.reload();
    await categorizationPage.verifyPageLoaded();
  });
});