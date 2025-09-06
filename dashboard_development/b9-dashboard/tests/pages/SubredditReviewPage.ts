import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class SubredditReviewPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page-specific locators
  get pageTitle() {
    return this.page.locator('h2:has-text("Unreviewed Subreddits"), h2:has-text("Ok Subreddits")');
  }

  get metricsCards() {
    return this.page.locator('[data-testid="metrics-cards"]');
  }

  get totalSubredditsMetric() {
    return this.page.locator('[data-testid="total-subreddits"]');
  }

  get unreviewedMetric() {
    return this.page.locator('[data-testid="status-count"]');
  }

  get newTodayMetric() {
    return this.page.locator('[data-testid="new-today-count"]');
  }

  // Filter controls
  get filterButtons() {
    return this.page.locator('[data-testid="filter-button"]');
  }

  get unreviewedFilterButton() {
    return this.page.locator('[data-testid="filter-button"]:has-text("Unreviewed")');
  }

  get okFilterButton() {
    return this.page.locator('[data-testid="filter-button"]:has-text("Ok")');
  }

  // Table elements
  get subredditTable() {
    return this.page.locator('table');
  }

  get tableRows() {
    return this.page.locator('tbody tr');
  }

  get selectAllCheckbox() {
    return this.page.locator('th input[type="checkbox"]');
  }

  get rowCheckboxes() {
    return this.page.locator('td input[type="checkbox"]');
  }

  // Review action buttons
  get reviewButtons() {
    return this.page.locator('[data-testid="review-button"]');
  }

  get okButton() {
    return this.page.locator('button:has-text("Ok")');
  }

  get noSellerButton() {
    return this.page.locator('button:has-text("No Seller")');
  }

  get nonRelatedButton() {
    return this.page.locator('button:has-text("Non Related")');
  }

  // Bulk action buttons
  get bulkActionButtons() {
    return this.page.locator('[data-testid="bulk-action"]');
  }

  get bulkOkButton() {
    return this.page.locator('[data-testid="bulk-action"]:has-text("Ok")');
  }

  get bulkNoSellerButton() {
    return this.page.locator('[data-testid="bulk-action"]:has-text("No Seller")');
  }

  get bulkNonRelatedButton() {
    return this.page.locator('[data-testid="bulk-action"]:has-text("Non Related")');
  }

  // Toast notifications
  get toastNotification() {
    return this.page.locator('[data-testid="toast"]');
  }

  get successToast() {
    return this.page.locator('[data-testid="toast"][data-type="success"]');
  }

  get errorToast() {
    return this.page.locator('[data-testid="toast"][data-type="error"]');
  }

  // Methods for interacting with the page
  async navigateToPage() {
    await this.navigateToSubredditReview();
    await this.waitForPageLoad();
  }

  async selectFilter(filter: 'unreviewed' | 'ok') {
    if (filter === 'unreviewed') {
      await this.unreviewedFilterButton.click();
    } else {
      await this.okFilterButton.click();
    }
    await this.waitForDataLoad();
  }

  async selectSubreddit(index: number) {
    await this.rowCheckboxes.nth(index).check();
  }

  async selectAllSubreddits() {
    await this.selectAllCheckbox.check();
  }

  async deselectAllSubreddits() {
    await this.selectAllCheckbox.uncheck();
  }

  async reviewSubreddit(index: number, review: 'Ok' | 'No Seller' | 'Non Related') {
    const row = this.tableRows.nth(index);
    
    switch (review) {
      case 'Ok':
        await row.locator('button:has-text("Ok")').click();
        break;
      case 'No Seller':
        await row.locator('button:has-text("No Seller")').click();
        break;
      case 'Non Related':
        await row.locator('button:has-text("Non Related")').click();
        break;
    }
    
    // Wait for toast notification
    await this.successToast.waitFor({ timeout: 5000 });
  }

  async bulkReviewSelected(review: 'Ok' | 'No Seller' | 'Non Related') {
    switch (review) {
      case 'Ok':
        await this.bulkOkButton.click();
        break;
      case 'No Seller':
        await this.bulkNoSellerButton.click();
        break;
      case 'Non Related':
        await this.bulkNonRelatedButton.click();
        break;
    }
    
    // Wait for success toast
    await this.successToast.waitFor({ timeout: 10000 });
  }

  async searchSubreddits(query: string) {
    await this.search(query);
    await this.waitForDataLoad();
  }

  async getSubredditCount() {
    return await this.tableRows.count();
  }

  async getSelectedCount() {
    return await this.rowCheckboxes.locator(':checked').count();
  }

  async getSubredditName(index: number) {
    return await this.tableRows.nth(index).locator('td:first-child').textContent();
  }

  async getMetricsData() {
    const total = await this.totalSubredditsMetric.textContent();
    const unreviewed = await this.unreviewedMetric.textContent();
    const newToday = await this.newTodayMetric.textContent();
    
    return {
      total: parseInt(total?.replace(/\D/g, '') || '0'),
      unreviewed: parseInt(unreviewed?.replace(/\D/g, '') || '0'),
      newToday: parseInt(newToday?.replace(/\D/g, '') || '0')
    };
  }

  // Verification methods
  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.subredditTable).toBeVisible();
    await expect(this.metricsCards).toBeVisible();
  }

  async verifyFilterApplied(filter: 'unreviewed' | 'ok') {
    if (filter === 'unreviewed') {
      await expect(this.pageTitle).toContainText('Unreviewed Subreddits');
    } else {
      await expect(this.pageTitle).toContainText('Ok Subreddits');
    }
  }

  async verifySearchResults(query: string) {
    // Verify that visible subreddits contain the search query
    const count = await this.getSubredditCount();
    if (count > 0) {
      const firstSubredditName = await this.getSubredditName(0);
      expect(firstSubredditName?.toLowerCase()).toContain(query.toLowerCase());
    }
  }

  async verifyReviewSuccess(subredditName: string, review: string) {
    await expect(this.successToast).toBeVisible();
    await expect(this.successToast).toContainText(`marked as ${review}`);
  }

  async verifyBulkReviewSuccess(count: number, review: string) {
    await expect(this.successToast).toBeVisible();
    await expect(this.successToast).toContainText(`${count} subreddit`);
    await expect(this.successToast).toContainText(`marked as ${review}`);
  }

  // Performance testing methods
  async measureTableLoadTime() {
    const startTime = Date.now();
    await this.subredditTable.waitFor();
    return Date.now() - startTime;
  }

  async measureFilterChangeTime(filter: 'unreviewed' | 'ok') {
    const startTime = Date.now();
    await this.selectFilter(filter);
    return Date.now() - startTime;
  }

  // Keyboard shortcut methods
  async useSelectAllShortcut() {
    await this.useKeyboardShortcut('Control+a');
  }

  async useClearShortcut() {
    await this.useKeyboardShortcut('Escape');
  }

  async useSearchShortcut() {
    await this.useKeyboardShortcut('Control+k');
    await expect(this.searchInput).toBeFocused();
  }
}