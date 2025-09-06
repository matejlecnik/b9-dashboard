import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // Test directory
  testDir: './tests',
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use. See https://playwright.dev/docs/test-reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  // Shared settings for all the projects below
  use: {
    // Base URL to use in actions like `await page.goto('/')`
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    // Collect trace when retrying the failed test
    trace: 'on-first-retry',
    
    // Record video on failure
    video: 'retain-on-failure',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Global test timeout
    actionTimeout: 10000,
  },

  // Global test timeout
  timeout: 30000,
  
  // Expect timeout
  expect: {
    timeout: 5000,
    // Custom screenshot comparison options for visual regression
    toHaveScreenshot: {
      animations: 'disabled'
    }
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable trace collection for debugging
        trace: 'on',
        video: 'retain-on-failure'
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        trace: 'on',
        video: 'retain-on-failure'
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        trace: 'on',
        video: 'retain-on-failure'
      },
    },

    // Mobile viewports for responsive testing
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
        trace: 'on',
        video: 'retain-on-failure'
      },
    },
    
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
        trace: 'on',
        video: 'retain-on-failure'
      },
    },

    // Performance testing project with special configuration
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        // Enable performance metrics collection
        trace: 'on',
        video: 'retain-on-failure',
        // Disable images and CSS for performance testing
        javaScriptEnabled: true,
      },
      testMatch: /.*\.perf\.spec\.ts/
    }
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run build && npm run start',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for build and start
  },
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
  
  // Output directories
  outputDir: 'test-results/',
});