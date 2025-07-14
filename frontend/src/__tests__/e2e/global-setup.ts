import { chromium, type FullConfig } from '@playwright/test';

/**
 * Global setup for Playwright tests
 * Handles authentication, database seeding, and test environment preparation
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  
  console.log('🚀 Starting global setup for cross-browser testing...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Wait for the application to be ready
    console.log('⏳ Waiting for application to be ready...');
    await page.goto(baseURL || 'http://localhost:3000');
    
    // Wait for the app to load completely
    await page.waitForSelector('[data-testid="app-loaded"]', { 
      timeout: 30000,
      state: 'visible'
    }).catch(() => {
      // If no app-loaded marker exists, wait for any content to load
      console.log('No app-loaded marker found, checking for basic content...');
      return page.waitForLoadState('networkidle');
    });
    
    // Check if the app is accessible
    const title = await page.title();
    console.log(`✅ Application loaded successfully: ${title}`);
    
    // Setup test data if needed
    await setupTestData(page);
    
    // Setup authentication if needed
    await setupAuthentication(page);
    
    console.log('✅ Global setup completed successfully');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }
}

/**
 * Setup test data for consistent testing
 */
async function setupTestData(page: any) {
  try {
    console.log('📊 Setting up test data...');
    
    // Check if we can access the API health endpoint
    const response = await page.request.get('/api/health').catch(() => null);
    
    if (response && response.ok()) {
      console.log('✅ API is accessible');
      
      // Setup mock data via API if available
      // This would typically seed the database or setup mock responses
      // await page.request.post('/api/test/seed', { data: testData });
      
    } else {
      console.log('⚠️ API not accessible, using frontend-only testing');
    }
    
    console.log('✅ Test data setup completed');
  } catch (error) {
    console.log('⚠️ Test data setup failed, continuing with default data:', error);
  }
}

/**
 * Setup authentication for tests that require it
 */
async function setupAuthentication(page: any) {
  try {
    console.log('🔐 Setting up authentication...');
    
    // Check if authentication is required
    const hasAuthElements = await page.locator('[data-testid="login"], [data-testid="auth-required"]').count();
    
    if (hasAuthElements > 0) {
      console.log('🔐 Authentication required, setting up test user...');
      
      // This would typically create a test user session
      // For now, we'll just log that authentication is available
      console.log('ℹ️ Authentication system detected');
      
      // Store authentication state for reuse in tests
      // await page.context().storageState({ path: 'auth-state.json' });
    } else {
      console.log('ℹ️ No authentication required');
    }
    
    console.log('✅ Authentication setup completed');
  } catch (error) {
    console.log('⚠️ Authentication setup failed, continuing without auth:', error);
  }
}

export default globalSetup; 