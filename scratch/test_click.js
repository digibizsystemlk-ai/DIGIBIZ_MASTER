const { chromium } = require('playwright');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
    console.log('Launching browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    // Listen to console messages
    page.on('console', msg => {
        console.log(`[BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`);
    });

    page.on('pageerror', err => {
        console.error(`[BROWSER ERROR] ${err.toString()}`);
    });

    console.log('Navigating to login...');
    await page.goto('https://digibiz-sys.web.app/auth/login.html');

    // Fill in E2E credentials
    const email = 'bdkariyapperuma@gmail.com';
    const password = '123456';
    const businessId = '3slrMTT9dVNlIETKbozzIsVZjjQ2';

    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"], button:has-text("Login")');

    console.log('Waiting for authentication...');
    await page.waitForFunction(() => {
        return !!(window.firebase && window.firebase.auth && window.firebase.auth().currentUser);
    }, { timeout: 15000 });

    console.log('Pinning business ID...');
    await page.evaluate((bId) => {
        localStorage.setItem('currentBusinessId', bId);
        sessionStorage.setItem('currentBusinessId', bId);
        localStorage.setItem('selectedBusinessId', bId);
        sessionStorage.setItem('selectedBusinessId', bId);
    }, businessId);

    console.log('Navigating to scrap-buying page...');
    await page.goto('https://digibiz-sys.web.app/modules/admin/scrap-buying.html');
    await page.waitForTimeout(5000);

    // Let's print the DOM structure of activeSuppliersSection
    const html = await page.evaluate(() => {
        const el = document.getElementById('activeSuppliersSection');
        return el ? el.outerHTML : 'Not found';
    });
    console.log('activeSuppliersSection HTML:', html);

    // Let's click on the first active supplier if any
    const clicked = await page.evaluate(() => {
        const list = document.getElementById('activeSuppliersList');
        if (list && list.firstElementChild) {
            list.firstElementChild.click();
            return `Clicked on: ${list.firstElementChild.textContent}`;
        }
        return 'No active suppliers to click';
    });
    console.log('Action:', clicked);

    await page.waitForTimeout(2000);

    // Print the value of supplierName input
    const supplierValue = await page.inputValue('#supplierName');
    console.log('Current supplierName input value:', supplierValue);

    await browser.close();
}
run().catch(console.error);
