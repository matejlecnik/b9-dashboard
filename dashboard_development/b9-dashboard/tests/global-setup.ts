import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global test setup...');
  
  // Ensure environment variables are set
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.warn('⚠️ Supabase environment variables not set - some tests may fail');
  }

  // Create a browser instance for authentication setup if needed
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Pre-warm the application - navigate to the base URL to ensure it's running
    const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';
    console.log(`🌐 Pre-warming application at ${baseURL}`);
    
    await page.goto(baseURL, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    console.log('✅ Application is running and ready for tests');

    // Optional: Set up test data or authentication states here
    // For now, we'll rely on the application's existing state
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;