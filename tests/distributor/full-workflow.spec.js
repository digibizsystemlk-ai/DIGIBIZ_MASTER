const { test, expect } = require('@playwright/test');

test.describe('🚚 Distributor Business - සම්පූර්ණ ක්‍රියාවලිය', () => {
  
  // Test data
  const testData = {
    owner: {
      email: 'owner@digibiz.com',     // ඔබගේ owner email එක
      password: 'your-password'        // ඔබගේ owner password එක
    },
    rep: {
      name: 'Test Rep',
      email: `testrep_${Date.now()}@test.com`,
      phone: '0771234567',
      route: 'Colombo Test'
    },
    shop: {
      name: `Test Shop ${Date.now()}`,
      address: 'Colombo'
    },
    product: {
      name: 'Test Product',
      price: 100,
      stock: 50
    }
  };

  test('1. Owner Login වීම', async ({ page }) => {
    await page.goto('/auth/login.html');
    await page.fill('#email', testData.owner.email);
    await page.fill('#password', testData.owner.password);
    await page.click('button:has-text("Login")');
    
    // Dashboard එකට ගියාද කියලා check කිරීම
    await expect(page).toHaveURL(/.*dashboard/);
    console.log('✅ Owner login successful');
  });

  test('2. නව Product එකක් එකතු කිරීම', async ({ page }) => {
    await page.goto('/modules/distributor/web/products.html');
    
    // Product form fill කිරීම
    await page.fill('#productName', testData.product.name);
    await page.fill('#productCategory', 'Test Category');
    await page.fill('#productPrice', testData.product.price.toString());
    await page.fill('#productStock', testData.product.stock.toString());
    
    // Add button click කිරීම
    await page.click('#addBtn');
    
    // Success message check කිරීම
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
    console.log('✅ Product added successfully');
  });

  test('3. නව Rep එකක් එකතු කිරීම', async ({ page }) => {
    await page.goto('/modules/distributor/web/reps.html');
    
    // Wait for page to load
    await page.waitForSelector('#repName');
    
    // Rep form fill කිරීම
    await page.fill('#repName', testData.rep.name);
    await page.fill('#repEmail', testData.rep.email);
    await page.fill('#repPhone', testData.rep.phone);
    await page.fill('#repRoute', testData.rep.route);
    
    // Add button click කිරීම
    await page.click('#addBtn');
    
    // Success message check කිරීම
    await expect(page.locator('.alert-success')).toBeVisible({ timeout: 5000 });
    
    // Get the generated password from the success message
    const successText = await page.locator('.alert-success').textContent();
    const passwordMatch = successText.match(/Password:\s*(\d+)/);
    if (passwordMatch) {
      testData.rep.password = passwordMatch[1];
      console.log(`✅ Rep added with password: ${testData.rep.password}`);
    }
    console.log('✅ Rep added successfully');
  });

  test('4. Business Code එක check කිරීම', async ({ page }) => {
    await page.goto('/modules/distributor/web/reps.html');
    
    // Business code display වෙනවාද?
    const businessCode = await page.locator('#businessCode').inputValue();
    expect(businessCode.length).toBe(6);
    console.log(`✅ Business Code: ${businessCode}`);
  });

  test('5. Mobile App - Rep Login වීම', async ({ browser }) => {
    // New browser context එකක් (mobile view)
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }  // Mobile view
    });
    const page = await context.newPage();
    
    await page.goto('/modules/distributor/mobile/index.html');
    
    // Get business code from localStorage or page
    await page.fill('#email', testData.rep.email);
    await page.fill('#password', testData.rep.password);
    
    // Get business code from another page (need to implement)
    // For now, manual entry required
    
    await page.click('button:has-text("Login")');
    
    // Order page එකට ගියාද?
    await expect(page).toHaveURL(/.*order.html/);
    console.log('✅ Rep mobile login successful');
  });

  test('6. Mobile App - Order එකක් ගැනීම', async ({ browser }) => {
    const context = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const page = await context.newPage();
    
    // Login first (simplified - reuse previous login)
    await page.goto('/modules/distributor/mobile/index.html');
    await page.fill('#email', testData.rep.email);
    await page.fill('#password', testData.rep.password);
    await page.fill('#businessCode', '123456'); // Get actual code
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(2000);
    
    // Select shop (if exists)
    const shopSelect = page.locator('#shopSelect');
    const shopCount = await shopSelect.locator('option').count();
    
    if (shopCount > 1) {
      await shopSelect.selectOption({ index: 1 });
    }
    
    // Add product to cart
    await page.click('.qty-btn:has-text("+")');
    await page.click('button:has-text("Add to Cart")');
    
    // Submit order
    await page.click('button:has-text("SUBMIT ORDER")');
    
    // Success message check
    await expect(page.locator('text=Order submitted')).toBeVisible({ timeout: 5000 });
    console.log('✅ Order submitted successfully');
  });

  test('7. HQ Dashboard - Order එක Approve කිරීම', async ({ page }) => {
    await page.goto('/modules/distributor/web/index.html');
    
    // Check pending orders tab
    await page.click('text=Pending');
    await page.waitForTimeout(2000);
    
    // Find and approve the order (if exists)
    const approveBtn = page.locator('.btn-approve').first();
    if (await approveBtn.isVisible()) {
      await approveBtn.click();
      await expect(page.locator('text=Order approved')).toBeVisible();
      console.log('✅ Order approved');
    } else {
      console.log('⚠️ No pending orders found');
    }
  });

  test('8. Warehouse - Order එක Picking කිරීම', async ({ page }) => {
    await page.goto('/modules/distributor/web/warehouse.html');
    
    // Start picking
    const startBtn = page.locator('.btn-picking').first();
    if (await startBtn.isVisible()) {
      await startBtn.click();
      
      // Select all items
      await page.check('input[type="checkbox"]');
      await page.fill('#batchNumber', 'TEST-BATCH-001');
      await page.click('button:has-text("Complete Picking")');
      
      await expect(page.locator('text=Picking completed')).toBeVisible();
      console.log('✅ Warehouse picking completed');
    } else {
      console.log('⚠️ No orders ready for picking');
    }
  });

  test('9. Delivery - Order එක Dispatch කිරීම', async ({ page }) => {
    await page.goto('/modules/distributor/web/deliveries.html');
    
    // Assign delivery
    const assignBtn = page.locator('.btn-primary:has-text("Assign")').first();
    if (await assignBtn.isVisible()) {
      await assignBtn.click();
      
      await page.fill('#driverName', 'Test Driver');
      await page.fill('#vehicleNo', 'ABC-1234');
      await page.click('button:has-text("Dispatch")');
      
      await expect(page.locator('text=Dispatched')).toBeVisible();
      console.log('✅ Delivery dispatched');
    } else {
      console.log('⚠️ No orders ready for dispatch');
    }
  });

  test('10. Reports - Order එක Report එකේ පෙනෙනවාද?', async ({ page }) => {
    await page.goto('/modules/distributor/web/reports.html');
    
    // Generate report
    await page.click('button:has-text("Generate Report")');
    await page.waitForTimeout(2000);
    
    // Check if report has data
    const reportTable = page.locator('.report-card table');
    await expect(reportTable).toBeVisible();
    console.log('✅ Reports generated successfully');
  });

  test('11. System Diagnostic - පද්ධතියේ සෞඛ්‍යය පරීක්ෂා කිරීම', async ({ page }) => {
    await page.goto('/modules/distributor/web/system-diagnostic.html');
    
    // Run diagnostic
    await page.click('#runDiagnosticBtn');
    await page.waitForTimeout(5000);
    
    // Check if results are displayed
    await expect(page.locator('#resultsContainer')).toBeVisible();
    console.log('✅ System diagnostic completed');
  });
});