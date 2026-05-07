const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow Verification', () => {
  test('should show login page with all elements', async ({ page }) => {
    await page.goto('/auth/login.html');
    await expect(page).toHaveTitle(/Login - DIGIBIZ/);
    
    // Check for essential UI elements
    await expect(page.locator('h1')).toContainText('Welcome Back');
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#loginBtn')).toBeVisible();
    await expect(page.locator('#googleBtn')).toBeVisible();
    await expect(page.locator('a[href="register.html"]')).toBeVisible();
  });

  test('should show error on empty login attempt', async ({ page }) => {
    await page.goto('/auth/login.html');
    await page.click('#loginBtn');
    await expect(page.locator('#error')).toContainText('Please enter email and password');
  });

  test('should show error on invalid credentials', async ({ page }) => {
    await page.goto('/auth/login.html');
    await page.fill('#email', 'nonexistent@digibiz.test');
    await page.fill('#password', 'wrongpassword');
    await page.click('#loginBtn');
    
    // Wait for Firebase response error
    await expect(page.locator('#error')).not.toBeEmpty({ timeout: 10000 });
  });

  test('should toggle password reset box', async ({ page }) => {
    await page.goto('/auth/login.html');
    const resetBox = page.locator('#resetBox');
    
    // Check initial state
    await expect(resetBox).not.toBeVisible();
    
    // Toggle on
    await page.click('#forgotPasswordLink');
    await expect(resetBox).toBeVisible({ timeout: 5000 });
    
    // Toggle off
    await page.click('#forgotPasswordLink');
    await expect(resetBox).not.toBeVisible({ timeout: 5000 });
  });
});
