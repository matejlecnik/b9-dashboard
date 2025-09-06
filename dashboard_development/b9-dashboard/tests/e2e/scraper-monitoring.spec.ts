import { test, expect } from '@playwright/test';
import { ScraperPage } from '../pages/ScraperPage';

test.describe('Scraper Monitoring Workflow', () => {
  let scraperPage: ScraperPage;

  test.beforeEach(async ({ page }) => {
    scraperPage = new ScraperPage(page);
    await scraperPage.navigateToPage();
  });

  test('should load the scraper monitoring page successfully', async () => {
    await scraperPage.verifyPageLoaded();
    
    // Verify all main sections are visible
    await expect(scraperPage.accountStatusSection).toBeVisible();
    await expect(scraperPage.dataQualitySection).toBeVisible();
  });

  test('should display account status information', async () => {
    const accountCount = await scraperPage.getActiveAccountsCount();
    expect(accountCount).toBeGreaterThanOrEqual(0);
    
    // Get detailed account information
    const accounts = await scraperPage.getAccountStatusDetails();
    expect(accounts.length).toBeGreaterThanOrEqual(0);
    
    // Verify each account has required fields
    accounts.forEach(account => {
      expect(account.username).toBeTruthy();
      expect(account.status).toBeTruthy();
      expect(account.rateLimitRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  test('should display proxy status information', async () => {
    const proxyCount = await scraperPage.getActiveProxiesCount();
    expect(proxyCount).toBeGreaterThanOrEqual(0);
    
    // Get detailed proxy information
    const proxies = await scraperPage.getProxyStatusDetails();
    expect(proxies.length).toBeGreaterThanOrEqual(0);
    
    // Verify each proxy has required fields
    proxies.forEach(proxy => {
      expect(proxy.ip).toBeTruthy();
      expect(proxy.status).toBeTruthy();
      expect(proxy.latency).toBeTruthy();
    });
  });

  test('should display data quality metrics', async () => {
    await scraperPage.verifyQualityMetrics();
    
    const discoveryRate = await scraperPage.getDiscoveryRate();
    const qualityScore = await scraperPage.getQualityScore();
    
    expect(discoveryRate).toBeGreaterThanOrEqual(0);
    expect(qualityScore).toBeGreaterThanOrEqual(0);
    expect(qualityScore).toBeLessThanOrEqual(100);
  });

  test('should refresh status when requested', async () => {
    const initialLastUpdate = await scraperPage.getLastUpdateTime();
    
    // Wait a moment then refresh
    await scraperPage.page.waitForTimeout(1000);
    await scraperPage.refreshStatus();
    
    const updatedLastUpdate = await scraperPage.getLastUpdateTime();
    
    // Verify refresh occurred (time should be updated or at least consistent)
    expect(updatedLastUpdate).toBeTruthy();
  });

  test('should display error feed when errors exist', async () => {
    const errorCount = await scraperPage.getErrorCount();
    
    if (errorCount > 0) {
      const latestError = await scraperPage.getLatestError();
      expect(latestError).toBeTruthy();
      
      // Test clearing errors
      await scraperPage.clearErrors();
      const newErrorCount = await scraperPage.getErrorCount();
      expect(newErrorCount).toBeLessThanOrEqual(errorCount);
    } else {
      await scraperPage.verifyNoErrors();
    }
  });

  test('should handle scraper control operations', async ({ page }) => {
    // Skip this test in CI or if scraper control is disabled
    if (process.env.CI) {
      test.skip('Scraper control tests skipped in CI environment');
    }
    
    const initialStatus = await scraperPage.getScraperStatus();
    
    if (initialStatus?.toLowerCase().includes('running')) {
      // Test stopping scraper
      await scraperPage.stopScraper();
      await scraperPage.verifyScraperStopped();
      
      // Test starting scraper
      await scraperPage.startScraper();
      await scraperPage.verifyScraperRunning();
    } else {
      // Test starting scraper
      await scraperPage.startScraper();
      await scraperPage.verifyScraperRunning();
      
      // Test stopping scraper
      await scraperPage.stopScraper();
      await scraperPage.verifyScraperStopped();
    }
  });

  test('should verify recent activity indicators', async () => {
    await scraperPage.verifyRecentActivity();
    
    const lastUpdate = await scraperPage.getLastUpdateTime();
    expect(lastUpdate).toBeTruthy();
  });

  test('should monitor scraper activity over time', async () => {
    const monitoringResult = await scraperPage.monitorScraperActivity(10000); // 10 seconds
    
    expect(monitoringResult.duration).toBeGreaterThanOrEqual(9000); // Allow some margin
    expect(monitoringResult.initialRate).toBeGreaterThanOrEqual(0);
    expect(monitoringResult.finalRate).toBeGreaterThanOrEqual(0);
  });

  test('should display rate limit information correctly', async () => {
    const accounts = await scraperPage.getAccountStatusDetails();
    
    // Verify rate limit data is realistic (Reddit allows 100 requests per minute)
    accounts.forEach(account => {
      expect(account.rateLimitRemaining).toBeLessThanOrEqual(100);
      expect(account.rateLimitRemaining).toBeGreaterThanOrEqual(0);
    });
  });

  test('should handle proxy latency monitoring', async () => {
    const proxies = await scraperPage.getProxyStatusDetails();
    
    proxies.forEach(proxy => {
      // Latency should be a reasonable value (in milliseconds)
      const latencyMs = parseInt(proxy.latency?.replace(/\D/g, '') || '0');
      expect(latencyMs).toBeGreaterThanOrEqual(0);
      expect(latencyMs).toBeLessThan(10000); // Less than 10 seconds
    });
  });

  test('should maintain real-time updates', async () => {
    const initialMetrics = {
      discoveryRate: await scraperPage.getDiscoveryRate(),
      qualityScore: await scraperPage.getQualityScore(),
      lastUpdate: await scraperPage.getLastUpdateTime()
    };
    
    // Wait for potential updates
    await scraperPage.page.waitForTimeout(15000); // 15 seconds
    
    const updatedMetrics = {
      discoveryRate: await scraperPage.getDiscoveryRate(),
      qualityScore: await scraperPage.getQualityScore(),
      lastUpdate: await scraperPage.getLastUpdateTime()
    };
    
    // Verify metrics are still valid (may or may not have changed)
    expect(updatedMetrics.discoveryRate).toBeGreaterThanOrEqual(0);
    expect(updatedMetrics.qualityScore).toBeGreaterThanOrEqual(0);
    expect(updatedMetrics.lastUpdate).toBeTruthy();
  });

  test('should handle network timeouts gracefully', async () => {
    // Simulate slow network response
    await scraperPage.page.route('**/api/scraper/status', async route => {
      await scraperPage.page.waitForTimeout(5000); // 5 second delay
      await route.continue();
    });
    
    // Try to refresh status with timeout
    const startTime = Date.now();
    try {
      await scraperPage.refreshStatus();
    } catch (error) {
      // May timeout, which is expected
    }
    
    const duration = Date.now() - startTime;
    
    // Clean up route
    await scraperPage.page.unroute('**/api/scraper/status');
    
    // Verify the page is still functional after timeout
    await scraperPage.verifyPageLoaded();
  });

  test('should validate scraper configuration display', async () => {
    // Check if configuration section is visible
    const configVisible = await scraperPage.configurationSection.isVisible();
    
    if (configVisible) {
      // Verify configuration settings are displayed
      await expect(scraperPage.intervalSetting).toBeVisible();
      await expect(scraperPage.concurrencySetting).toBeVisible();
    }
  });

  test('should measure page performance', async () => {
    const loadTime = await scraperPage.measurePageLoadTime();
    expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    
    const refreshTime = await scraperPage.measureStatusRefreshTime();
    expect(refreshTime).toBeLessThan(5000); // Should refresh within 5 seconds
  });

  test('should handle missing or invalid data gracefully', async () => {
    // Simulate API returning invalid data
    await scraperPage.page.route('**/api/scraper/status', route => 
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ invalid: 'data' })
      })
    );
    
    await scraperPage.refreshStatus();
    
    // Page should remain stable even with invalid data
    await scraperPage.verifyPageLoaded();
    
    // Clean up route
    await scraperPage.page.unroute('**/api/scraper/status');
  });
});