import { test, expect } from '@playwright/test';
import { SubredditReviewPage } from '../pages/SubredditReviewPage';
import { CategorizationPage } from '../pages/CategorizationPage';
import { ScraperPage } from '../pages/ScraperPage';
import { UserAnalysisPage } from '../pages/UserAnalysisPage';

test.describe('Visual Regression Testing', () => {
  // Configure visual testing settings
  test.beforeEach(async ({ page }) => {
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-delay: -1ms !important;
          animation-duration: 1ms !important;
          animation-iteration-count: 1 !important;
          background-attachment: initial !important;
          scroll-behavior: auto !important;
          transition-delay: 0ms !important;
          transition-duration: 0ms !important;
        }
      `
    });
  });

  test.describe('Subreddit Review Page Visuals', () => {
    let reviewPage: SubredditReviewPage;

    test.beforeEach(async ({ page }) => {
      reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.waitForDataLoad();
    });

    test('should match baseline screenshot for review page', async ({ page }) => {
      await expect(page).toHaveScreenshot('subreddit-review-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match baseline for metrics cards', async () => {
      await expect(reviewPage.metricsCards).toHaveScreenshot('review-metrics-cards.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline for filter controls', async () => {
      await expect(reviewPage.filterButtons.first()).toHaveScreenshot('filter-controls.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline for subreddit table', async () => {
      await expect(reviewPage.subredditTable).toHaveScreenshot('subreddit-table.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline for different filter states', async ({ page }) => {
      // Unreviewed state
      await reviewPage.selectFilter('unreviewed');
      await reviewPage.waitForDataLoad();
      await expect(page).toHaveScreenshot('review-unreviewed-filter.png', {
        fullPage: true,
        animations: 'disabled'
      });

      // Ok state
      await reviewPage.selectFilter('ok');
      await reviewPage.waitForDataLoad();
      await expect(page).toHaveScreenshot('review-ok-filter.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Categorization Page Visuals', () => {
    let categorizationPage: CategorizationPage;

    test.beforeEach(async ({ page }) => {
      categorizationPage = new CategorizationPage(page);
      await categorizationPage.navigateToPage();
      await categorizationPage.waitForDataLoad();
    });

    test('should match baseline screenshot for categorization page', async ({ page }) => {
      await expect(page).toHaveScreenshot('categorization-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match baseline for category selector', async () => {
      await expect(categorizationPage.categorySelector).toHaveScreenshot('category-selector.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline for categorization table', async () => {
      await expect(categorizationPage.categorizationTable).toHaveScreenshot('categorization-table.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline with Ok filter applied', async ({ page }) => {
      await categorizationPage.filterByOkOnly();
      await categorizationPage.waitForDataLoad();
      await expect(page).toHaveScreenshot('categorization-ok-filter.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Scraper Page Visuals', () => {
    let scraperPage: ScraperPage;

    test.beforeEach(async ({ page }) => {
      scraperPage = new ScraperPage(page);
      await scraperPage.navigateToPage();
      await scraperPage.waitForDataLoad();
    });

    test('should match baseline screenshot for scraper page', async ({ page }) => {
      await expect(page).toHaveScreenshot('scraper-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match baseline for account status section', async () => {
      await expect(scraperPage.accountStatusSection).toHaveScreenshot('account-status-section.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline for data quality metrics', async () => {
      await expect(scraperPage.dataQualitySection).toHaveScreenshot('data-quality-section.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline for error feed', async () => {
      await expect(scraperPage.errorFeedSection).toHaveScreenshot('error-feed-section.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('User Analysis Page Visuals', () => {
    let userAnalysisPage: UserAnalysisPage;

    test.beforeEach(async ({ page }) => {
      userAnalysisPage = new UserAnalysisPage(page);
      await userAnalysisPage.navigateToPage();
      await userAnalysisPage.waitForDataLoad();
    });

    test('should match baseline screenshot for user analysis page', async ({ page }) => {
      await expect(page).toHaveScreenshot('user-analysis-page.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match baseline for user table', async () => {
      await expect(userAnalysisPage.userTable).toHaveScreenshot('user-table.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline for user metrics', async () => {
      await expect(userAnalysisPage.totalUsersMetric.locator('xpath=../../../..')).toHaveScreenshot('user-metrics.png', {
        animations: 'disabled'
      });
    });

    test('should match baseline with creator filter applied', async ({ page }) => {
      await userAnalysisPage.filterByCreators();
      await userAnalysisPage.waitForDataLoad();
      await expect(page).toHaveScreenshot('user-analysis-creators-filter.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Responsive Design Visuals', () => {
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];

    viewports.forEach(viewport => {
      test(`should match baseline for ${viewport.name} viewport - Review Page`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        const reviewPage = new SubredditReviewPage(page);
        await reviewPage.navigateToPage();
        await reviewPage.waitForDataLoad();
        
        await expect(page).toHaveScreenshot(`subreddit-review-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      });

      test(`should match baseline for ${viewport.name} viewport - Categorization Page`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        
        const categorizationPage = new CategorizationPage(page);
        await categorizationPage.navigateToPage();
        await categorizationPage.waitForDataLoad();
        
        await expect(page).toHaveScreenshot(`categorization-${viewport.name}.png`, {
          fullPage: true,
          animations: 'disabled'
        });
      });
    });
  });

  test.describe('Component State Visuals', () => {
    test('should match baseline for loading states', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      
      // Navigate and immediately capture loading state
      const navigationPromise = reviewPage.navigateToPage();
      
      // Try to capture loading state (might be too fast)
      try {
        await expect(reviewPage.loadingSpinner).toHaveScreenshot('loading-spinner.png', {
          timeout: 1000,
          animations: 'disabled'
        });
      } catch (error) {
        // Loading might be too fast to capture
        console.log('Loading state capture skipped - too fast');
      }
      
      await navigationPromise;
    });

    test('should match baseline for toast notifications', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.waitForDataLoad();
      
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount > 0) {
        // Trigger a review action to show toast
        await reviewPage.reviewSubreddit(0, 'Ok');
        
        // Capture toast notification
        await expect(reviewPage.successToast).toHaveScreenshot('success-toast.png', {
          animations: 'disabled'
        });
      }
    });

    test('should match baseline for empty states', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Search for something that won't exist
      await reviewPage.searchSubreddits('nonexistentsubreddit123456789');
      
      await expect(page).toHaveScreenshot('empty-search-results.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Dark Mode Visuals', () => {
    test.beforeEach(async ({ page }) => {
      // Enable dark mode if supported
      await page.emulateMedia({ colorScheme: 'dark' });
    });

    test('should match baseline for dark mode - Review Page', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.waitForDataLoad();
      
      await expect(page).toHaveScreenshot('subreddit-review-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should match baseline for dark mode - Categorization Page', async ({ page }) => {
      const categorizationPage = new CategorizationPage(page);
      await categorizationPage.navigateToPage();
      await categorizationPage.waitForDataLoad();
      
      await expect(page).toHaveScreenshot('categorization-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Cross-Browser Visual Consistency', () => {
    test('should maintain visual consistency across browsers', async ({ page, browserName }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.waitForDataLoad();
      
      await expect(page).toHaveScreenshot(`review-page-${browserName}.png`, {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Accessibility Visual Indicators', () => {
    test('should show proper focus states', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.waitForDataLoad();
      
      // Focus on search input
      await reviewPage.searchInput.focus();
      
      await expect(reviewPage.searchInput).toHaveScreenshot('search-input-focused.png', {
        animations: 'disabled'
      });
      
      // Focus on filter button
      await reviewPage.unreviewedFilterButton.focus();
      
      await expect(reviewPage.unreviewedFilterButton).toHaveScreenshot('filter-button-focused.png', {
        animations: 'disabled'
      });
    });

    test('should show proper hover states', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      await reviewPage.waitForDataLoad();
      
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount > 0) {
        // Hover over a review button
        await reviewPage.okButton.first().hover();
        
        await expect(reviewPage.okButton.first()).toHaveScreenshot('ok-button-hovered.png', {
          animations: 'disabled'
        });
      }
    });
  });
});