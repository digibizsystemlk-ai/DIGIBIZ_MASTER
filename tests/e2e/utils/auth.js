const { expect } = require('@playwright/test');

async function loginAsBdk(page, env) {
  await page.goto('/auth/login.html');

  const emailInput = page.locator('#email, input[type="email"]').first();
  const passwordInput = page.locator('#password, input[type="password"]').first();
  await emailInput.fill(env.email);
  await passwordInput.fill(env.password);

  const loginButton = page
    .locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')
    .first();
  await loginButton.click();

  // Wait until Firebase auth user is present.
  await page.waitForFunction(() => {
    return !!(window.firebase && window.firebase.auth && window.firebase.auth().currentUser);
  }, { timeout: 30000 });

  // Keep selected business pinned to test tenant.
  await page.evaluate((businessId) => {
    localStorage.setItem('currentBusinessId', businessId);
    sessionStorage.setItem('currentBusinessId', businessId);
    localStorage.setItem('selectedBusinessId', businessId);
    sessionStorage.setItem('selectedBusinessId', businessId);
  }, env.businessId);
}

async function openAsAuthed(page, path, env) {
  await page.goto(path);
  await page.evaluate((businessId) => {
    localStorage.setItem('currentBusinessId', businessId);
    sessionStorage.setItem('currentBusinessId', businessId);
    localStorage.setItem('selectedBusinessId', businessId);
    sessionStorage.setItem('selectedBusinessId', businessId);
  }, env.businessId);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}

module.exports = {
  loginAsBdk,
  openAsAuthed
};
