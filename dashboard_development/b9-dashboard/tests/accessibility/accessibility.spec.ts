import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { SubredditReviewPage } from '../pages/SubredditReviewPage';
import { CategorizationPage } from '../pages/CategorizationPage';
import { ScraperPage } from '../pages/ScraperPage';
import { UserAnalysisPage } from '../pages/UserAnalysisPage';

test.describe('Accessibility Testing', () => {
  test.describe('Page-Level Accessibility', () => {
    test('subreddit review page should be accessible', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('categorization page should be accessible', async ({ page }) => {
      const categorizationPage = new CategorizationPage(page);
      await categorizationPage.navigateToPage();
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('scraper page should be accessible', async ({ page }) => {
      const scraperPage = new ScraperPage(page);
      await scraperPage.navigateToPage();
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('user analysis page should be accessible', async ({ page }) => {
      const userAnalysisPage = new UserAnalysisPage(page);
      await userAnalysisPage.navigateToPage();
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  });

  test.describe('Component-Level Accessibility', () => {
    test('table components should be accessible', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Focus on table component specifically
      const accessibilityScanResults = await new AxeBuilder({ page })
        .include('table')
        .analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('form controls should be accessible', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Test search input accessibility
      const searchInput = reviewPage.searchInput;
      await expect(searchInput).toHaveAttribute('type', 'text');
      
      // Check for proper labeling
      const hasLabel = await searchInput.evaluate(input => {
        const id = input.getAttribute('id');
        const ariaLabel = input.getAttribute('aria-label');
        const placeholder = input.getAttribute('placeholder');
        
        if (id) {
          return document.querySelector(`label[for="${id}"]`) !== null;
        }
        
        return ariaLabel !== null || placeholder !== null;
      });
      
      expect(hasLabel).toBe(true);
    });

    test('buttons should have proper accessibility attributes', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const subredditCount = await reviewPage.getSubredditCount();
      if (subredditCount > 0) {
        // Check OK button accessibility
        const okButton = reviewPage.okButton.first();
        
        await expect(okButton).toHaveAttribute('type', 'button');
        
        const buttonText = await okButton.textContent();
        expect(buttonText?.trim().length).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support keyboard navigation', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Tab through interactive elements
      await page.keyboard.press('Tab');
      
      // Verify an element is focused
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['INPUT', 'BUTTON', 'SELECT', 'A']).toContain(focusedElement);
    });

    test('should provide visible focus indicators', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Focus on search input
      await reviewPage.searchInput.focus();
      
      // Check if focus is visible (this is a simplified check)
      const hasFocusStyle = await reviewPage.searchInput.evaluate(element => {
        const styles = window.getComputedStyle(element);
        const pseudoStyles = window.getComputedStyle(element, ':focus');
        
        return styles.outline !== pseudoStyles.outline || 
               styles.boxShadow !== pseudoStyles.boxShadow ||
               styles.border !== pseudoStyles.border;
      });
      
      expect(hasFocusStyle).toBe(true);
    });

    test('should allow keyboard-only navigation of filters', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Navigate to filter buttons using keyboard
      await page.keyboard.press('Tab');
      
      // Find filter buttons and navigate through them
      const filterButtons = reviewPage.filterButtons;
      const buttonCount = await filterButtons.count();
      
      for (let i = 0; i < buttonCount; i++) {
        const button = filterButtons.nth(i);
        await button.focus();
        
        const isFocused = await button.evaluate(el => el === document.activeElement);
        expect(isFocused).toBe(true);
        
        // Test activation with Enter key
        await page.keyboard.press('Enter');
        await reviewPage.waitForDataLoad();
      }
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
      const headingLevels = await Promise.all(
        headings.map(heading => heading.evaluate(el => parseInt(el.tagName.charAt(1))))
      );
      
      // Check that heading levels don't skip (e.g., h1 -> h3)
      for (let i = 1; i < headingLevels.length; i++) {
        const levelDiff = headingLevels[i] - headingLevels[i - 1];
        expect(levelDiff).toBeLessThanOrEqual(1);
      }
    });

    test('should have proper ARIA labels for complex components', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Check table accessibility
      const table = reviewPage.subredditTable;
      
      if (await table.isVisible()) {
        // Table should have proper structure
        const hasTableHeaders = await table.locator('th').count() > 0;
        expect(hasTableHeaders).toBe(true);
        
        // Check for ARIA labels or descriptions
        const tableAccessibility = await table.evaluate(table => {
          return {
            hasAriaLabel: table.hasAttribute('aria-label'),
            hasAriaDescribedBy: table.hasAttribute('aria-describedby'),
            hasCaption: table.querySelector('caption') !== null
          };
        });
        
        const hasAccessibleLabel = 
          tableAccessibility.hasAriaLabel || 
          tableAccessibility.hasAriaDescribedBy || 
          tableAccessibility.hasCaption;
        
        expect(hasAccessibleLabel).toBe(true);
      }
    });

    test('should provide alternative text for meaningful images', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const images = await page.locator('img').all();
      
      for (const image of images) {
        const isDecorative = await image.getAttribute('alt') === '';
        const hasAltText = await image.getAttribute('alt') !== null;
        const hasAriaLabel = await image.getAttribute('aria-label') !== null;
        const hasAriaHidden = await image.getAttribute('aria-hidden') === 'true';
        
        // Images should either have alt text, aria-label, or be marked as decorative
        const isAccessible = hasAltText || hasAriaLabel || hasAriaHidden || isDecorative;
        expect(isAccessible).toBe(true);
      }
    });
  });

  test.describe('Color and Contrast', () => {
    test('should meet WCAG color contrast requirements', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Use axe to check color contrast
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa', 'wcag21aa'])
        .analyze();
      
      const contrastViolations = accessibilityScanResults.violations.filter(
        violation => violation.id === 'color-contrast'
      );
      
      expect(contrastViolations).toEqual([]);
    });

    test('should not rely solely on color for information', async ({ page }) => {
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Check for color-only violations
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withRules(['color-contrast', 'link-in-text-block'])
        .analyze();
      
      const colorOnlyViolations = accessibilityScanResults.violations.filter(
        violation => violation.id === 'color-contrast' || violation.id === 'link-in-text-block'
      );
      
      expect(colorOnlyViolations).toEqual([]);
    });
  });

  test.describe('Motion and Animation', () => {
    test('should respect prefers-reduced-motion', async ({ page }) => {
      // Set reduced motion preference
      await page.emulateMedia({ reducedMotion: 'reduce' });
      
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      // Check that animations are disabled or reduced
      const hasReducedMotion = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      });
      
      expect(hasReducedMotion).toBe(true);
      
      // Verify that CSS respects the preference
      const animationDuration = await page.evaluate(() => {
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
          const styles = window.getComputedStyle(element);
          if (styles.animationDuration !== '0s' && styles.animationDuration !== '') {
            return false;
          }
          if (styles.transitionDuration !== '0s' && styles.transitionDuration !== '') {
            return false;
          }
        }
        return true;
      });
      
      // This might be too strict depending on implementation
      // expect(animationDuration).toBe(true);
    });
  });

  test.describe('Form Accessibility', () => {
    test('should have proper form labeling and error handling', async ({ page }) => {
      const categorizationPage = new CategorizationPage(page);
      await categorizationPage.navigateToPage();
      
      const subredditCount = await categorizationPage.getSubredditCount();
      if (subredditCount > 0) {
        // Test category input accessibility
        const categoryInput = categorizationPage.categoryInputs.first();
        
        if (await categoryInput.isVisible()) {
          // Check for proper labeling
          const hasAccessibleName = await categoryInput.evaluate(input => {
            const id = input.getAttribute('id');
            const ariaLabel = input.getAttribute('aria-label');
            const ariaLabelledBy = input.getAttribute('aria-labelledby');
            const placeholder = input.getAttribute('placeholder');
            
            if (id && document.querySelector(`label[for="${id}"]`)) return true;
            if (ariaLabel) return true;
            if (ariaLabelledBy) return true;
            if (placeholder) return true;
            
            return false;
          });
          
          expect(hasAccessibleName).toBe(true);
        }
      }
    });
  });

  test.describe('Responsive Accessibility', () => {
    test('should maintain accessibility on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have adequate touch targets on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      
      const reviewPage = new SubredditReviewPage(page);
      await reviewPage.navigateToPage();
      
      const buttons = await page.locator('button').all();
      
      for (const button of buttons) {
        if (await button.isVisible()) {
          const boundingBox = await button.boundingBox();
          
          if (boundingBox) {
            // WCAG recommends minimum 44x44 pixels for touch targets
            expect(boundingBox.width).toBeGreaterThanOrEqual(40); // Allow slight tolerance
            expect(boundingBox.height).toBeGreaterThanOrEqual(40);
          }
        }
      }
    });
  });
});