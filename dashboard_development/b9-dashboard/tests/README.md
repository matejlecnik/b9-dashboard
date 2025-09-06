# E2E Testing Suite Documentation

This comprehensive testing suite ensures the reliability and quality of the B9 Reddit Analytics Dashboard using Playwright for end-to-end testing.

## 🧪 Test Structure

```
tests/
├── e2e/                          # End-to-end workflow tests
│   ├── subreddit-review.spec.ts  # Subreddit review workflow
│   ├── categorization.spec.ts    # Categorization workflow  
│   ├── scraper-monitoring.spec.ts # Scraper monitoring tests
│   ├── user-analysis.spec.ts     # User analysis workflow
│   └── full-workflow-integration.spec.ts # Complete integration tests
├── visual/                       # Visual regression tests
│   └── visual-regression.spec.ts # Screenshot comparisons
├── performance/                  # Performance benchmarking
│   └── performance.perf.spec.ts  # Load time and interaction tests
├── accessibility/                # Accessibility compliance
│   └── accessibility.spec.ts     # WCAG 2.1 AA compliance tests
├── pages/                        # Page Object Models
│   ├── BasePage.ts               # Common page functionality
│   ├── SubredditReviewPage.ts    # Subreddit review page model
│   ├── CategorizationPage.ts     # Categorization page model
│   ├── ScraperPage.ts            # Scraper monitoring page model
│   └── UserAnalysisPage.ts       # User analysis page model
├── fixtures/                     # Test data and utilities
│   ├── test-data.ts              # Mock data for consistent testing
│   └── api-mocks.ts              # API mocking utilities
└── utils/                        # Testing utilities
    └── test-reporter.ts          # Custom test reporting
```

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
npm install

# Install Playwright browsers
npm run test:install
```

### Environment Setup

Create a `.env.local` file with required environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:e2e           # End-to-end tests
npm run test:visual        # Visual regression tests
npm run test:performance   # Performance tests
npm run test:accessibility # Accessibility tests
npm run test:mobile        # Mobile device tests

# Development modes
npm run test:headed        # Run with browser UI
npm run test:debug         # Debug mode with step-by-step execution
npm run test:codegen       # Generate test code interactively
```

### Viewing Results

```bash
# View test report
npm run test:report

# Reports are generated in:
# - playwright-report/     # HTML report
# - test-results/         # Screenshots, videos, traces
# - test-reports/         # Custom detailed reports
```

## 📋 Test Coverage

### Critical User Workflows

1. **Subreddit Review Workflow** ✅
   - Page loading and navigation
   - Filter subreddits (unreviewed/ok)
   - Search functionality
   - Individual review actions (Ok/No Seller/Non Related)
   - Bulk review operations
   - Real-time updates
   - Error handling

2. **Categorization Workflow** ✅
   - Filter by Ok subreddits
   - Category assignment (individual/bulk)
   - AI suggestion handling
   - Category management
   - Search and filtering
   - Data persistence

3. **Scraper Monitoring** ✅
   - Account status monitoring
   - Proxy status verification
   - Data quality metrics
   - Error feed management
   - Real-time status updates
   - Performance monitoring

4. **User Analysis** ✅
   - User filtering (creators/quality score)
   - Creator status management
   - User detail views
   - Export functionality
   - Search and sorting
   - Bulk operations

5. **AI Categorization** ✅
   - AI suggestion acceptance/rejection
   - Bulk AI categorization
   - Confidence scoring
   - Accuracy metrics

### Cross-Browser Testing

- ✅ Chromium (Chrome/Edge)
- ✅ Firefox
- ✅ WebKit (Safari)
- ✅ Mobile Chrome
- ✅ Mobile Safari

### Performance Testing

- ✅ Page load times (< 3 seconds)
- ✅ Interaction response (< 100ms)
- ✅ API response times (< 1.5 seconds)
- ✅ Core Web Vitals compliance
- ✅ Memory usage monitoring
- ✅ Network optimization

### Visual Regression Testing

- ✅ Component-level screenshots
- ✅ Full page comparisons
- ✅ Responsive design verification
- ✅ Dark mode compatibility
- ✅ Focus state indicators
- ✅ Loading states

### Accessibility Testing

- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation
- ✅ Screen reader compatibility
- ✅ Color contrast verification
- ✅ Focus management
- ✅ ARIA attributes
- ✅ Touch target sizing

## 🔧 Configuration

### Playwright Configuration

Key settings in `playwright.config.ts`:

```typescript
export default defineConfig({
  // Test timeout: 30 seconds
  timeout: 30000,
  
  // Performance thresholds
  expect: { timeout: 5000 },
  
  // Cross-browser testing
  projects: ['chromium', 'firefox', 'webkit', 'mobile-chrome', 'mobile-safari'],
  
  // Visual testing
  expect: {
    toHaveScreenshot: {
      mode: 'css',
      animations: 'disabled'
    }
  },
  
  // Reporting
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ]
});
```

### Performance Thresholds

```typescript
const PERFORMANCE_THRESHOLDS = {
  PAGE_LOAD: 3000,      // 3 seconds
  INTERACTION: 100,     // 100ms
  DATA_LOAD: 2000,      // 2 seconds
  NAVIGATION: 1000,     // 1 second
  API_RESPONSE: 1500    // 1.5 seconds
};
```

## 🏗️ Page Object Model Pattern

All tests use the Page Object Model pattern for maintainability:

```typescript
export class SubredditReviewPage extends BasePage {
  // Locators
  get pageTitle() {
    return this.page.locator('h2:has-text("Unreviewed Subreddits")');
  }
  
  // Actions
  async selectFilter(filter: 'unreviewed' | 'ok') {
    if (filter === 'unreviewed') {
      await this.unreviewedFilterButton.click();
    } else {
      await this.okFilterButton.click();
    }
    await this.waitForDataLoad();
  }
  
  // Verifications
  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible();
    await expect(this.subredditTable).toBeVisible();
  }
}
```

## 📊 Test Reporting

### Custom Test Reporter

The custom reporter generates comprehensive reports including:

- **Summary Report**: Test counts, success rates, duration
- **Performance Report**: Slowest/fastest tests, browser comparison
- **Failure Analysis**: Error patterns, recommendations
- **Visual Diff Report**: Screenshot comparisons
- **Accessibility Report**: WCAG compliance issues

### CI/CD Integration

GitHub Actions workflow includes:

1. **Multi-browser testing** across Chromium, Firefox, WebKit
2. **Mobile device testing** on iOS and Android viewports
3. **Visual regression detection** with screenshot comparisons
4. **Performance monitoring** with Core Web Vitals
5. **Accessibility scanning** with axe-core
6. **Automated reporting** with PR comments and artifact uploads

### Report Artifacts

Generated reports include:

- `test-reports/test-summary.json` - Overall test metrics
- `test-reports/performance-report.json` - Performance analysis
- `test-reports/failure-analysis.json` - Failure patterns and recommendations
- `test-reports/test-report.md` - Human-readable summary
- `playwright-report/` - Interactive HTML report
- `test-results/` - Screenshots, videos, traces

## 🛠️ Best Practices

### Writing Tests

1. **Use Page Object Models** - Keep locators and actions centralized
2. **Mock APIs consistently** - Use fixtures for predictable test data
3. **Test user journeys** - Focus on complete workflows, not just individual features
4. **Handle async operations** - Always wait for elements and data loading
5. **Write descriptive test names** - Clearly indicate what is being tested

### Performance Testing

1. **Set realistic thresholds** - Based on actual user experience requirements
2. **Test on various networks** - Simulate slow 3G conditions
3. **Monitor Core Web Vitals** - LCP, FID, CLS metrics
4. **Test with large datasets** - Ensure performance scales

### Visual Testing

1. **Disable animations** - For consistent screenshots
2. **Test responsive breakpoints** - Mobile, tablet, desktop
3. **Test different states** - Loading, error, empty states
4. **Use stable test data** - Avoid dynamic content in visual tests

### Accessibility Testing

1. **Test with keyboard only** - Ensure all functionality is keyboard accessible
2. **Check focus management** - Verify focus indicators and tab order
3. **Test with screen readers** - Use proper ARIA labels and roles
4. **Verify color contrast** - Meet WCAG 2.1 AA standards

## 🚨 Troubleshooting

### Common Issues

**Tests timing out:**
```bash
# Increase timeout in playwright.config.ts
timeout: 60000  // 60 seconds
```

**Flaky tests:**
```bash
# Add retries for unstable tests
retries: process.env.CI ? 2 : 0
```

**Visual test failures:**
```bash
# Update baseline screenshots
npx playwright test --update-snapshots
```

**Browser installation issues:**
```bash
# Force reinstall browsers
npx playwright install --force
```

### Debug Mode

```bash
# Run tests in debug mode
npm run test:debug

# Generate test code interactively
npm run test:codegen
```

## 📈 Continuous Improvement

### Monitoring Test Health

1. **Track test execution times** - Identify slow tests
2. **Monitor flaky test rates** - Improve test stability
3. **Review failure patterns** - Update tests for application changes
4. **Analyze coverage gaps** - Add tests for new features

### Regular Maintenance

1. **Update test data** - Keep fixtures current with application changes
2. **Review performance thresholds** - Adjust based on infrastructure changes
3. **Update browser versions** - Stay current with Playwright releases
4. **Refactor page objects** - Keep locators and methods up to date

## 🔗 Resources

- [Playwright Documentation](https://playwright.dev/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Page Object Model Pattern](https://playwright.dev/docs/pom)
- [Visual Testing Best Practices](https://playwright.dev/docs/test-screenshots)

## 📞 Support

For questions or issues with the testing suite:

1. Check existing GitHub Issues
2. Review test failure reports in CI/CD artifacts
3. Run tests locally with debug mode
4. Consult Playwright documentation

---

**Last Updated:** December 2024
**Test Suite Version:** 1.0.0
**Playwright Version:** 1.55.0