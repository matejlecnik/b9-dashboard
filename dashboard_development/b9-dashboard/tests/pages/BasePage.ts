import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // Common navigation elements
  get sidebar() {
    return this.page.locator('[data-testid="sidebar"]');
  }

  get header() {
    return this.page.locator('header');
  }

  get searchInput() {
    return this.page.locator('input[placeholder*="Search"]');
  }

  get loadingSpinner() {
    return this.page.locator('[data-testid="loading-spinner"]');
  }

  // Navigation methods
  async navigateToHome() {
    await this.page.goto('/');
  }

  async navigateToSubredditReview() {
    await this.page.goto('/subreddit-review');
  }

  async navigateToCategorization() {
    await this.page.goto('/categorization');
  }

  async navigateToUserAnalysis() {
    await this.page.goto('/user-analysis');
  }

  async navigateToScraper() {
    await this.page.goto('/scraper');
  }

  async navigateToAICategorization() {
    await this.page.goto('/ai-categorization');
  }

  async navigateToFilters() {
    await this.page.goto('/filters');
  }

  async navigateToSettings() {
    await this.page.goto('/settings');
  }

  async navigateToAnalytics() {
    await this.page.goto('/analytics');
  }

  // Common interactions
  async search(query: string) {
    await this.searchInput.fill(query);
    await this.searchInput.press('Enter');
  }

  async clearSearch() {
    await this.searchInput.clear();
    await this.page.keyboard.press('Escape');
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async waitForDataLoad() {
    // Wait for loading spinners to disappear
    await this.page.waitForSelector('[data-testid="loading-spinner"]', { 
      state: 'detached', 
      timeout: 10000 
    });
  }

  // Utility methods
  async takeScreenshot(name: string) {
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}.png`,
      fullPage: true 
    });
  }

  async getPageTitle() {
    return await this.page.title();
  }

  async getCurrentUrl() {
    return this.page.url();
  }

  // Common keyboard shortcuts
  async useKeyboardShortcut(shortcut: string) {
    const keys = shortcut.split('+');
    if (keys.length === 2) {
      await this.page.keyboard.press(`${keys[0]}+${keys[1]}`);
    } else {
      await this.page.keyboard.press(shortcut);
    }
  }

  // Performance utilities
  async measurePageLoadTime(): Promise<number> {
    const startTime = Date.now();
    await this.page.waitForLoadState('domcontentloaded');
    return Date.now() - startTime;
  }

  async measureInteractionTime(action: () => Promise<void>): Promise<number> {
    const startTime = Date.now();
    await action();
    return Date.now() - startTime;
  }

  // Error handling
  async getConsoleErrors(): Promise<string[]> {
    const errors: string[] = [];
    this.page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    return errors;
  }

  async getNetworkErrors(): Promise<any[]> {
    const errors: any[] = [];
    this.page.on('response', response => {
      if (response.status() >= 400) {
        errors.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });
    return errors;
  }
}