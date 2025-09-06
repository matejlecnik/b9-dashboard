import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class ScraperPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  // Page-specific locators
  get pageTitle() {
    return this.page.locator('h1:has-text("Scraper"), h2:has-text("Scraper")');
  }

  // Account status section
  get accountStatusSection() {
    return this.page.locator('[data-testid="account-status"]');
  }

  get accountStatusCards() {
    return this.page.locator('[data-testid="account-card"]');
  }

  get activeAccountsCount() {
    return this.page.locator('[data-testid="active-accounts"]');
  }

  get rateLimitStatus() {
    return this.page.locator('[data-testid="rate-limit-status"]');
  }

  // Proxy status section
  get proxyStatusSection() {
    return this.page.locator('[data-testid="proxy-status"]');
  }

  get proxyCards() {
    return this.page.locator('[data-testid="proxy-card"]');
  }

  get activeProxiesCount() {
    return this.page.locator('[data-testid="active-proxies"]');
  }

  // Error feed section
  get errorFeedSection() {
    return this.page.locator('[data-testid="error-feed"]');
  }

  get errorEntries() {
    return this.page.locator('[data-testid="error-entry"]');
  }

  get clearErrorsButton() {
    return this.page.locator('button:has-text("Clear Errors")');
  }

  // Data quality metrics
  get dataQualitySection() {
    return this.page.locator('[data-testid="data-quality"]');
  }

  get discoveryRateMetric() {
    return this.page.locator('[data-testid="discovery-rate"]');
  }

  get qualityScoreMetric() {
    return this.page.locator('[data-testid="quality-score"]');
  }

  get lastUpdateTime() {
    return this.page.locator('[data-testid="last-update"]');
  }

  // Control buttons
  get startScraperButton() {
    return this.page.locator('button:has-text("Start Scraper")');
  }

  get stopScraperButton() {
    return this.page.locator('button:has-text("Stop Scraper")');
  }

  get refreshButton() {
    return this.page.locator('button:has-text("Refresh")');
  }

  // Status indicators
  get scraperStatus() {
    return this.page.locator('[data-testid="scraper-status"]');
  }

  get statusIndicator() {
    return this.page.locator('[data-testid="status-indicator"]');
  }

  // Configuration section
  get configurationSection() {
    return this.page.locator('[data-testid="scraper-config"]');
  }

  get intervalSetting() {
    return this.page.locator('[data-testid="interval-setting"]');
  }

  get concurrencySetting() {
    return this.page.locator('[data-testid="concurrency-setting"]');
  }

  // Methods for interacting with the page
  async navigateToPage() {
    await this.navigateToScraper();
    await this.waitForPageLoad();
  }

  async refreshStatus() {
    await this.refreshButton.click();
    await this.waitForDataLoad();
  }

  async startScraper() {
    await this.startScraperButton.click();
    await this.page.waitForTimeout(2000); // Wait for status to update
  }

  async stopScraper() {
    await this.stopScraperButton.click();
    await this.page.waitForTimeout(2000); // Wait for status to update
  }

  async clearErrors() {
    await this.clearErrorsButton.click();
    await this.waitForDataLoad();
  }

  // Data retrieval methods
  async getScraperStatus() {
    return await this.scraperStatus.textContent();
  }

  async getActiveAccountsCount() {
    const text = await this.activeAccountsCount.textContent();
    return parseInt(text?.replace(/\D/g, '') || '0');
  }

  async getActiveProxiesCount() {
    const text = await this.activeProxiesCount.textContent();
    return parseInt(text?.replace(/\D/g, '') || '0');
  }

  async getErrorCount() {
    return await this.errorEntries.count();
  }

  async getLatestError() {
    const firstError = this.errorEntries.first();
    return await firstError.textContent();
  }

  async getDiscoveryRate() {
    const text = await this.discoveryRateMetric.textContent();
    return parseFloat(text?.replace(/[^\d.]/g, '') || '0');
  }

  async getQualityScore() {
    const text = await this.qualityScoreMetric.textContent();
    return parseFloat(text?.replace(/[^\d.]/g, '') || '0');
  }

  async getLastUpdateTime() {
    return await this.lastUpdateTime.textContent();
  }

  async getAccountStatusDetails() {
    const accounts = [];
    const accountCards = await this.accountStatusCards.all();
    
    for (const card of accountCards) {
      const username = await card.locator('[data-testid="account-username"]').textContent();
      const status = await card.locator('[data-testid="account-status"]').textContent();
      const remaining = await card.locator('[data-testid="rate-limit-remaining"]').textContent();
      
      accounts.push({
        username: username?.trim(),
        status: status?.trim(),
        rateLimitRemaining: parseInt(remaining?.replace(/\D/g, '') || '0')
      });
    }
    
    return accounts;
  }

  async getProxyStatusDetails() {
    const proxies = [];
    const proxyCards = await this.proxyCards.all();
    
    for (const card of proxyCards) {
      const ip = await card.locator('[data-testid="proxy-ip"]').textContent();
      const status = await card.locator('[data-testid="proxy-status"]').textContent();
      const latency = await card.locator('[data-testid="proxy-latency"]').textContent();
      
      proxies.push({
        ip: ip?.trim(),
        status: status?.trim(),
        latency: latency?.trim()
      });
    }
    
    return proxies;
  }

  // Verification methods
  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.accountStatusSection).toBeVisible();
    await expect(this.dataQualitySection).toBeVisible();
  }

  async verifyScraperRunning() {
    const status = await this.getScraperStatus();
    expect(status?.toLowerCase()).toContain('running');
    await expect(this.statusIndicator).toHaveClass(/running|active|success/);
  }

  async verifyScraperStopped() {
    const status = await this.getScraperStatus();
    expect(status?.toLowerCase()).toContain('stopped');
    await expect(this.statusIndicator).toHaveClass(/stopped|inactive|error/);
  }

  async verifyAccountsActive(expectedCount?: number) {
    const activeCount = await this.getActiveAccountsCount();
    if (expectedCount !== undefined) {
      expect(activeCount).toBe(expectedCount);
    } else {
      expect(activeCount).toBeGreaterThan(0);
    }
  }

  async verifyProxiesActive(expectedCount?: number) {
    const activeCount = await this.getActiveProxiesCount();
    if (expectedCount !== undefined) {
      expect(activeCount).toBe(expectedCount);
    } else {
      expect(activeCount).toBeGreaterThan(0);
    }
  }

  async verifyNoErrors() {
    const errorCount = await this.getErrorCount();
    expect(errorCount).toBe(0);
  }

  async verifyQualityMetrics() {
    const discoveryRate = await this.getDiscoveryRate();
    const qualityScore = await this.getQualityScore();
    
    expect(discoveryRate).toBeGreaterThanOrEqual(0);
    expect(qualityScore).toBeGreaterThanOrEqual(0);
    expect(qualityScore).toBeLessThanOrEqual(100);
  }

  async verifyRecentActivity() {
    const lastUpdate = await this.getLastUpdateTime();
    expect(lastUpdate).toBeTruthy();
    
    // Verify update was within last hour (basic sanity check)
    const updateText = lastUpdate?.toLowerCase();
    expect(
      updateText?.includes('minute') || 
      updateText?.includes('second') || 
      updateText?.includes('now')
    ).toBeTruthy();
  }

  // Performance testing
  async measureStatusRefreshTime() {
    const startTime = Date.now();
    await this.refreshStatus();
    return Date.now() - startTime;
  }

  async measurePageLoadTime() {
    const startTime = Date.now();
    await this.navigateToPage();
    return Date.now() - startTime;
  }

  // Monitoring methods
  async monitorScraperActivity(durationMs: number = 30000) {
    const startTime = Date.now();
    const initialDiscoveryRate = await this.getDiscoveryRate();
    
    // Wait for the specified duration
    await this.page.waitForTimeout(durationMs);
    
    // Refresh and check for changes
    await this.refreshStatus();
    const finalDiscoveryRate = await this.getDiscoveryRate();
    
    return {
      duration: Date.now() - startTime,
      initialRate: initialDiscoveryRate,
      finalRate: finalDiscoveryRate,
      changeDetected: finalDiscoveryRate !== initialDiscoveryRate
    };
  }
}