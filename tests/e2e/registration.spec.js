const { test, expect } = require('@playwright/test');

test.describe('Registration Page Verification', () => {
  test('should load the registration page and populate business types dropdown', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/auth/register.html');
    
    // Check title
    await expect(page).toHaveTitle(/Register - DIGIBIZ/);
    
    // Wait for the dropdown to be populated
    // The populateBusinessTypes function clears and then repopulates.
    // We wait for the "Select your business type..." option to be present (default)
    // and then check for actual business types.
    const dropdown = page.locator('#businessType');
    await expect(dropdown).toBeVisible();
    
    // We expect at least the "Other" option to appear eventually
    // and 'Retail' or 'Distributor' (since they are isReady: true)
    await expect(page.locator('#businessType option[value="retail"]')).toBeAttached({ timeout: 10000 });
    await expect(page.locator('#businessType option[value="distributor"]')).toBeAttached();
    await expect(page.locator('#businessType option[value="other"]')).toBeAttached();
    
    // Verify the "Other" option text (Sinhala support check)
    const otherOption = page.locator('#businessType option[value="other"]');
    await expect(otherOption).toContainText('මම සොයන ව්‍යාපාර වර්ගය මෙහි නැත');
  });

  test('should toggle the other business description box when "Other" is selected', async ({ page }) => {
    await page.goto('/auth/register.html');
    
    const dropdown = page.locator('#businessType');
    const otherGroup = page.locator('#otherBusinessGroup');
    
    // Initially hidden
    await expect(otherGroup).not.toBeVisible();
    
    // Select "Other"
    await dropdown.selectOption('other');
    
    // Should be visible
    await expect(otherGroup).toBeVisible();
    await expect(page.locator('#businessDescription')).toBeFocused();
  });
});
