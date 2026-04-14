const { test, expect } = require('@playwright/test');

// සියලුම පිටු වල URL
const pages = [
  { name: 'Login Page', url: '/auth/login.html' },
  { name: 'Register Page', url: '/auth/register.html' },
  { name: 'Distributor Dashboard', url: '/modules/distributor/web/index.html' },
  { name: 'Products Page', url: '/modules/distributor/web/products.html' },
  { name: 'Reps Page', url: '/modules/distributor/web/reps.html' },
  { name: 'Mobile Login', url: '/modules/distributor/mobile/index.html' },
  { name: 'Mobile Order', url: '/modules/distributor/mobile/order.html' },
];

test.describe('📄 පිටු පරීක්ෂාව', () => {
  for (const page of pages) {
    test(`${page.name} එක 404 නොවිය යුතුයි`, async ({ page: browserPage }) => {
      const response = await browserPage.goto(page.url);
      expect(response.status()).not.toBe(404);
      console.log(`✅ ${page.name} - OK`);
    });
  }
});