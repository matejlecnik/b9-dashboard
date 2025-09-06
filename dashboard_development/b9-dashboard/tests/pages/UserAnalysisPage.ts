import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class UserAnalysisPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page-specific locators
  get pageTitle() {
    return this.page.locator('h1:has-text("User Analysis"), h2:has-text("User Analysis")');
  }

  // Filter controls
  get creatorFilter() {
    return this.page.locator('button:has-text("Creators Only"), [data-testid="creator-filter"]');
  }

  get allUsersFilter() {
    return this.page.locator('button:has-text("All Users"), [data-testid="all-users-filter"]');
  }

  get qualityScoreFilter() {
    return this.page.locator('[data-testid="quality-score-filter"]');
  }

  get activityFilter() {
    return this.page.locator('[data-testid="activity-filter"]');
  }

  get successToast() {
    return this.page.locator('[data-testid="success-toast"], .toast-success, [role="alert"]:has-text("success"), .sonner-toast[data-type="success"]');
  }

  // User table elements
  get userTable() {
    return this.page.locator('table');
  }

  get userRows() {
    return this.page.locator('tbody tr');
  }

  get usernames() {
    return this.page.locator('td [data-testid="username"]');
  }

  get qualityScores() {
    return this.page.locator('td [data-testid="quality-score"]');
  }

  get creatorBadges() {
    return this.page.locator('[data-testid="creator-badge"]');
  }

  get toggleCreatorButtons() {
    return this.page.locator('button:has-text("Toggle Creator"), [data-testid="toggle-creator"]');
  }

  // User detail modal/section
  get userDetailModal() {
    return this.page.locator('[data-testid="user-detail-modal"]');
  }

  get userProfileSection() {
    return this.page.locator('[data-testid="user-profile"]');
  }

  get postHistorySection() {
    return this.page.locator('[data-testid="post-history"]');
  }

  get engagementMetrics() {
    return this.page.locator('[data-testid="engagement-metrics"]');
  }

  get closeModalButton() {
    return this.page.locator('[data-testid="close-modal"]');
  }

  // Bulk actions
  get bulkToggleCreatorButton() {
    return this.page.locator('button:has-text("Bulk Toggle Creator"), [data-testid="bulk-toggle-creator"]');
  }

  get bulkExportButton() {
    return this.page.locator('button:has-text("Export Selected"), [data-testid="bulk-export"]');
  }

  // Metrics cards
  get totalUsersMetric() {
    return this.page.locator('[data-testid="total-users"]');
  }

  get creatorsMetric() {
    return this.page.locator('[data-testid="creators-count"]');
  }

  get averageQualityMetric() {
    return this.page.locator('[data-testid="average-quality"]');
  }

  get activeUsersMetric() {
    return this.page.locator('[data-testid="active-users"]');
  }

  // Sorting controls
  get sortByUsername() {
    return this.page.locator('th:has-text("Username")');
  }

  get sortByQualityScore() {
    return this.page.locator('th:has-text("Quality Score")');
  }

  get sortByActivity() {
    return this.page.locator('th:has-text("Activity")');
  }

  // Methods for interacting with the page
  async navigateToPage() {
    await this.navigateToUserAnalysis();
    await this.waitForPageLoad();
  }

  async filterByCreators() {
    await this.creatorFilter.click();
    await this.waitForDataLoad();
  }

  async filterByAllUsers() {
    await this.allUsersFilter.click();
    await this.waitForDataLoad();
  }

  async filterByQualityScore(minScore: number) {
    const filter = this.qualityScoreFilter;
    await filter.fill(minScore.toString());
    await filter.press('Enter');
    await this.waitForDataLoad();
  }

  async toggleCreatorStatus(index: number) {
    await this.toggleCreatorButtons.nth(index).click();
    await this.successToast.waitFor({ timeout: 5000 });
  }

  async bulkToggleCreatorStatus() {
    await this.bulkToggleCreatorButton.click();
    await this.successToast.waitFor({ timeout: 10000 });
  }

  async viewUserDetails(index: number) {
    const username = this.usernames.nth(index);
    await username.click();
    await this.userDetailModal.waitFor();
  }

  async closeUserDetails() {
    await this.closeModalButton.click();
    await this.userDetailModal.waitFor({ state: 'detached' });
  }

  async exportSelectedUsers() {
    await this.bulkExportButton.click();
    // Wait for download or success notification
    await this.successToast.waitFor({ timeout: 10000 });
  }

  async sortBy(column: 'username' | 'quality' | 'activity') {
    switch (column) {
      case 'username':
        await this.sortByUsername.click();
        break;
      case 'quality':
        await this.sortByQualityScore.click();
        break;
      case 'activity':
        await this.sortByActivity.click();
        break;
    }
    await this.waitForDataLoad();
  }

  async searchUsers(query: string) {
    await this.search(query);
    await this.waitForDataLoad();
  }

  // Data retrieval methods
  async getUserCount() {
    return await this.userRows.count();
  }

  async getUsername(index: number) {
    return await this.usernames.nth(index).textContent();
  }

  async getQualityScore(index: number) {
    const scoreText = await this.qualityScores.nth(index).textContent();
    return parseFloat(scoreText?.replace(/[^\d.]/g, '') || '0');
  }

  async isCreator(index: number) {
    const creatorBadge = this.creatorBadges.nth(index);
    return await creatorBadge.isVisible();
  }

  async getCreatorCount() {
    return await this.creatorBadges.count();
  }

  async getMetricsData() {
    const total = await this.totalUsersMetric.textContent();
    const creators = await this.creatorsMetric.textContent();
    const averageQuality = await this.averageQualityMetric.textContent();
    const active = await this.activeUsersMetric.textContent();
    
    return {
      total: parseInt(total?.replace(/\D/g, '') || '0'),
      creators: parseInt(creators?.replace(/\D/g, '') || '0'),
      averageQuality: parseFloat(averageQuality?.replace(/[^\d.]/g, '') || '0'),
      active: parseInt(active?.replace(/\D/g, '') || '0')
    };
  }

  async getUserDetailData() {
    await expect(this.userDetailModal).toBeVisible();
    
    const profile = await this.userProfileSection.textContent();
    const postHistory = await this.postHistorySection.textContent();
    const engagement = await this.engagementMetrics.textContent();
    
    return {
      profile: profile?.trim(),
      postHistory: postHistory?.trim(),
      engagement: engagement?.trim()
    };
  }

  // Verification methods
  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.userTable).toBeVisible();
  }

  async verifyCreatorFilterApplied() {
    await expect(this.creatorFilter).toHaveClass(/active|selected/);
    
    // Verify all visible users are creators
    const userCount = await this.getUserCount();
    const creatorCount = await this.getCreatorCount();
    expect(creatorCount).toBe(userCount);
  }

  async verifyQualityScoreFilter(minScore: number) {
    const userCount = await this.getUserCount();
    
    for (let i = 0; i < userCount; i++) {
      const score = await this.getQualityScore(i);
      expect(score).toBeGreaterThanOrEqual(minScore);
    }
  }

  async verifyCreatorToggleSuccess(username: string, isCreator: boolean) {
    await expect(this.successToast).toBeVisible();
    await expect(this.successToast).toContainText(username);
    
    if (isCreator) {
      await expect(this.successToast).toContainText('marked as creator');
    } else {
      await expect(this.successToast).toContainText('creator status removed');
    }
  }

  async verifyUserSearchResults(query: string) {
    const userCount = await this.getUserCount();
    
    if (userCount > 0) {
      // Check that at least the first result matches the search
      const firstUsername = await this.getUsername(0);
      expect(firstUsername?.toLowerCase()).toContain(query.toLowerCase());
    }
  }

  async verifySortingApplied(column: 'username' | 'quality' | 'activity') {
    const userCount = await this.getUserCount();
    if (userCount < 2) return; // Can't verify sorting with less than 2 items
    
    if (column === 'username') {
      const first = await this.getUsername(0);
      const second = await this.getUsername(1);
      expect(first?.localeCompare(second || '') || 0).toBeLessThanOrEqual(0);
    } else if (column === 'quality') {
      const first = await this.getQualityScore(0);
      const second = await this.getQualityScore(1);
      expect(first).toBeGreaterThanOrEqual(second);
    }
  }

  async verifyUserDetailsDisplayed(username: string) {
    await expect(this.userDetailModal).toBeVisible();
    await expect(this.userDetailModal).toContainText(username);
    await expect(this.userProfileSection).toBeVisible();
    await expect(this.postHistorySection).toBeVisible();
    await expect(this.engagementMetrics).toBeVisible();
  }

  // Performance testing
  async measureFilterPerformance(filter: 'creators' | 'quality') {
    const startTime = Date.now();
    
    if (filter === 'creators') {
      await this.filterByCreators();
    } else {
      await this.filterByQualityScore(80);
    }
    
    return Date.now() - startTime;
  }

  async measureUserDetailLoadTime(index: number) {
    const startTime = Date.now();
    await this.viewUserDetails(index);
    return Date.now() - startTime;
  }

  async measureBulkOperationTime() {
    // Select some users first
    await this.selectSubreddit(0);
    await this.selectSubreddit(1);
    
    const startTime = Date.now();
    await this.bulkToggleCreatorStatus();
    return Date.now() - startTime;
  }
}