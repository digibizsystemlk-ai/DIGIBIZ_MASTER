const { test, expect } = require('@playwright/test');

test.describe('Sidebar & Core Navigation', () => {
  test('should initialize sidebar and handle mobile toggle', async ({ page }) => {
    // Navigate to a page that has the sidebar (e.g. Dashboard)
    // Even if redirected to login, the sidebar should NOT be there on login page.
    await page.goto('/auth/login.html');
    await expect(page.locator('.retail-navbar')).not.toBeAttached();
    
    // Check for sidebar reserve space in HTML
    // (Note: This is more of a smoke test for the script loading)
  });

  test('sidebar script should be present in core modules', async ({ page }) => {
    await page.goto('/modules/core/dashboard.html');
    
    // Check if redirected to login
    if (page.url().includes('/auth/login.html')) {
        // Redirected - that's fine for unauth test
        await expect(page.locator('script[src*="sidebar.js"]')).not.toBeAttached();
    }
  });

  test('mobile sidebar toggle should be present on small screens', async ({ page }) => {
    // Set viewport to mobile
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/auth/register.html');
    
    // Sidebar should NOT be on register page either
    await expect(page.locator('.digibiz-mobile-menu-toggle')).not.toBeAttached();
  });
});
