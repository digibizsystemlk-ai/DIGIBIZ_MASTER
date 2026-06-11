const { test, expect } = require('@playwright/test');

test.describe('Registration Page Verification', () => {
  test('should load the registration page and populate business types dropdown with only distributor', async ({ page }) => {
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
    
    // We expect only 'distributor' option to be present
    const distributorOption = page.locator('#businessType option[value="distributor"]');
    await expect(distributorOption).toBeAttached({ timeout: 10000 });
    
    // We expect the dropdown to have selected 'distributor' by default
    await expect(dropdown).toHaveValue('distributor');
    
    // Check that 'retail' and 'other' options are not present
    await expect(page.locator('#businessType option[value="retail"]')).not.toBeAttached();
    await expect(page.locator('#businessType option[value="other"]')).not.toBeAttached();
  });
});
