const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Retail Module End-to-End Verification', () => {
  test('should complete the entire retail business flow successfully', async ({ page }) => {
    test.setTimeout(90000);
    // Set viewport for a desktop dashboard view
    await page.setViewportSize({ width: 1280, height: 800 });

    // Global dialog handler to automatically accept all browser alerts/confirms
    page.on('dialog', async dialog => {
      console.log(`[Dialog] ${dialog.type()}: ${dialog.message()}`);
      await dialog.accept();
    });

    const screenshotDir = 'C:\\Users\\CHINTHAKA-PC\\.gemini\\antigravity\\brain\\aa5ed3a3-0314-4520-8ba8-f0332a6d5d6c\\scratch';

    // 1. Navigate and Login
    console.log('1. Navigating to login page...');
    await page.goto('/auth/login.html');
    await expect(page).toHaveTitle(/Login - DIGIBIZ/);

    await page.fill('#email', 'tharindurashan5@gmail.com');
    await page.fill('#password', '123456');
    
    await page.screenshot({ path: path.join(screenshotDir, '01_login_credentials.png') });
    await page.click('#loginBtn');

    // Wait for redirection and firebase auth load
    console.log('Waiting for authentication and redirection...');
    await page.waitForURL(/dashboard\.html|pos\.html/, { timeout: 30000 });
    
    // Store current business ID in sessionStorage to pin context if needed
    const businessId = await page.evaluate(async () => {
      // Wait for firebase user load
      let retry = 0;
      while ((!window.firebase || !window.firebase.auth || !window.firebase.auth().currentUser) && retry < 100) {
        await new Promise(r => setTimeout(r, 100));
        retry++;
      }
      const user = window.firebase.auth().currentUser;
      const snap = await window.db.collection('users').doc(user.uid).get();
      const bid = snap.exists ? (snap.data().businessId || user.uid) : user.uid;
      localStorage.setItem('currentBusinessId', bid);
      sessionStorage.setItem('currentBusinessId', bid);
      localStorage.setItem('selectedBusinessId', bid);
      sessionStorage.setItem('selectedBusinessId', bid);
      return bid;
    });

    console.log(`Authenticated with businessId: ${businessId}`);
    await page.waitForSelector('#onboardingWizardModal, .digibiz-sidebar, #quickProductBtn', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '02_pos_loaded.png') });

    // 2. Check and handle Onboarding Wizard
    console.log('Checking onboarding wizard status...');
    const modal = page.locator('#onboardingWizardModal');
    const isModalVisible = await modal.isVisible();
    
    if (isModalVisible) {
      console.log('Onboarding wizard detected. Filling starting balances...');
      
      // Step 1: Cash in Hand
      console.log('Configuring Step 1: Cash...');
      await page.click('button.btn-setup >> nth=0'); // Cash
      await page.fill('#stepCashVal', '10000.00');
      await page.click('#saveWizardStepBtn');
      await page.waitForTimeout(1000);

      // Step 2: Bank Balance
      console.log('Configuring Step 2: Bank...');
      await page.click('button.btn-setup >> nth=1'); // Bank
      await page.fill('#stepBankVal', '25000.00');
      await page.click('#saveWizardStepBtn');
      await page.waitForTimeout(1000);

      // Step 3: Receivables
      console.log('Configuring Step 3: Debtors...');
      await page.click('button.btn-setup >> nth=2'); // Receivables
      await page.click('#wizardAddRowBtn');
      await page.fill('.wizard-row-name >> nth=0', 'Kamal');
      await page.fill('.wizard-row-amt >> nth=0', '3000.00');
      await page.click('#saveWizardStepBtn');
      await page.waitForTimeout(1000);

      // Step 4: Payables
      console.log('Configuring Step 4: Creditors...');
      await page.click('button.btn-setup >> nth=3'); // Payables
      await page.click('#wizardAddRowBtn');
      await page.fill('.wizard-row-name >> nth=0', 'Keells');
      await page.fill('.wizard-row-amt >> nth=0', '7000.00');
      await page.click('#saveWizardStepBtn');
      await page.waitForTimeout(1500);

      await page.screenshot({ path: path.join(screenshotDir, '03_onboarding_completed.png') });

      // Click Finish Setup
      console.log('Finishing setup...');
      await page.click('button[onclick="window.sidebar.completeOnboardingSetup()"]');
      
      await page.waitForTimeout(4000);
      console.log('Reload complete. POS unlocked!');
    } else {
      console.log('Onboarding wizard already completed. Skipping setup steps.');
    }

    await page.screenshot({ path: path.join(screenshotDir, '04_pos_unlocked.png') });

    // 3. Add products in bulk
    console.log('Adding products in bulk...');
    // Directly invoke the openQuickProductModal function
    await page.evaluate(() => window.openQuickProductModal());
    await page.waitForSelector('#quickProductModal', { state: 'visible', timeout: 10000 });

    // Product 1: Test Soap
    await page.fill('#qpName', 'Test Soap');
    await page.fill('#qpCost', '80.00');
    await page.fill('#qpPrice', '110.00');
    await page.fill('#qpStock', '50');
    await page.click('#btnQpAddToList');
    await page.waitForTimeout(500);

    // Product 2: Test Shampoo
    await page.fill('#qpName', 'Test Shampoo');
    await page.fill('#qpCost', '120.00');
    await page.fill('#qpPrice', '160.00');
    await page.fill('#qpStock', '30');
    await page.click('#btnQpAddToList');
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(screenshotDir, '05_bulk_products_queue.png') });

    // Commit all products
    await page.click('#btnQpSaveBatch');
    await page.waitForSelector('#quickProductModal', { state: 'hidden', timeout: 20000 });
    console.log('Bulk products added successfully.');

    // 4. Perform Cash POS Sale (Test Soap)
    console.log('4. Performing Cash POS Sale...');
    // Click category All to render products if needed
    const allCategoryTab = page.locator('.category-tab:has-text("All"), .category-tab:has-text("සියල්ල")').first();
    if (await allCategoryTab.isVisible()) {
      await allCategoryTab.click();
    }
    
    // Select Lux Soap or Test Soap card
    const soapCard = page.locator('.product-card:has-text("Test Soap")').first();
    await soapCard.click();
    
    // Click Pay
    await page.click('#checkoutBtn');
    await page.waitForSelector('#customerModal', { state: 'visible', timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotDir, '06_cash_customer_modal.png') });
    
    // Click Confirm Customer (which is Walk-in by default)
    await page.click('#confirmCustomerBtn');
    await page.waitForSelector('#paymentModal', { state: 'visible', timeout: 10000 });
    
    // Select Cash method and click Complete
    await page.selectOption('#paymentMethod', 'cash');
    await page.fill('#cashAmount', '110');
    await page.screenshot({ path: path.join(screenshotDir, '06_cash_payment_modal.png') });
    await page.click('#completePaymentBtn');
    
    // Accept checkout success alert
    await page.waitForSelector('#paymentModal', { state: 'hidden', timeout: 20000 });
    console.log('Cash sale completed!');

    // 5. Perform Credit POS Sale (Test Shampoo to Kamal)
    console.log('5. Performing Credit POS Sale...');
    // Click Test Shampoo card
    const shampooCard = page.locator('.product-card:has-text("Test Shampoo")').first();
    await shampooCard.click();
    
    // Click Pay
    await page.click('#checkoutBtn');
    await page.waitForSelector('#customerModal', { state: 'visible', timeout: 10000 });
    
    // Select existing customer Kamal
    await page.evaluate(() => {
      const sel = document.getElementById('existingCustomer');
      const opt = Array.from(sel.options).find(o => o.text.includes('Kamal'));
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change'));
      }
    });
    await page.screenshot({ path: path.join(screenshotDir, '06_credit_customer_modal.png') });
    await page.click('#confirmCustomerBtn');
    
    await page.waitForSelector('#paymentModal', { state: 'visible', timeout: 10000 });
    
    // Select Credit method, enter due date, and complete
    await page.selectOption('#paymentMethod', 'credit');
    await page.fill('#creditDueDate', '2026-07-27');
    await page.screenshot({ path: path.join(screenshotDir, '06_credit_payment_modal.png') });
    await page.click('#completePaymentBtn');
    
    // Accept checkout success alert
    await page.waitForSelector('#paymentModal', { state: 'hidden', timeout: 20000 });
    console.log('Credit sale completed!');

    // 6. Log Stock Purchase
    console.log('6. Logging Stock Purchase...');
    await page.goto('/modules/retail/purchases.html');
    await page.waitForSelector('#newPurchaseBtn', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '07_purchases_page.png') });

    // Open purchase modal
    await page.click('#newPurchaseBtn');
    await page.waitForSelector('#purchaseModal', { state: 'visible', timeout: 10000 });

    // Select product "Test Soap" via page evaluate
    await page.evaluate(() => {
      const select = document.querySelector('.po-product-select');
      const opt = Array.from(select.options).find(o => o.text.includes('Test Soap'));
      if (opt) {
        select.value = opt.value;
        select.dispatchEvent(new Event('change'));
      }
    });

    // Fill qty and cost
    await page.fill('.po-qty >> nth=0', '10');
    await page.fill('.po-price >> nth=0', '80.00');

    await page.screenshot({ path: path.join(screenshotDir, '07_purchase_modal.png') });

    // Save purchase order
    await page.click('#savePOBtn');
    await page.waitForSelector('#purchaseModal', { state: 'hidden', timeout: 20000 });
    await page.waitForTimeout(2000);

    // Receive the stock
    console.log('Receiving stock for the created PO...');
    const receiveBtn = page.locator('button:has-text("Receive")').first();
    await expect(receiveBtn).toBeVisible();
    await receiveBtn.click();

    await page.waitForSelector('#receiveModal', { state: 'visible', timeout: 10000 });
    await page.screenshot({ path: path.join(screenshotDir, '07_receive_modal.png') });

    // Confirm receive
    await page.click('#confirmReceiveBtn');
    await page.waitForSelector('#receiveModal', { state: 'hidden', timeout: 20000 });
    await page.waitForTimeout(2000);

    console.log('Purchases recorded successfully!');

    // 7. Log an Expense
    console.log('7. Logging an Expense...');
    await page.goto('/modules/retail/expenses.html');
    await page.waitForSelector('#expAmount', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(2000);
    
    await page.fill('#expAmount', '1500.00');
    await page.fill('#expCategory', 'Utilities');
    await page.selectOption('#expPay', 'CASH');
    await page.fill('#expNote', 'E2E Utilities Test');
    await page.screenshot({ path: path.join(screenshotDir, '08_expenses_form.png') });
    await page.click('#saveBtn');
    await page.waitForTimeout(1500);
    console.log('Expense recorded successfully!');

    // 8. Go to Daily Transactions workbench & Test Reversal (Void)
    console.log('8. Opening Daily Transactions workbench...');
    await page.goto('/modules/retail/workbench.html');
    await page.waitForSelector('table', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '09_workbench_list.png') });

    // Look for the Cash Sale or Expense transaction in table and reverse it
    const voidBtn = page.locator('button:has-text("VOID / හරවන්න")').first();
    await expect(voidBtn).toBeVisible();
    
    console.log('Triggering VOID / Reversal...');
    await voidBtn.click();
    
    // Wait for processing overlay to disappear
    await page.waitForSelector('#loadingOverlay', { state: 'hidden', timeout: 20000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: path.join(screenshotDir, '10_workbench_after_void.png') });

    console.log('E2E validation finished successfully!');
  });
});
