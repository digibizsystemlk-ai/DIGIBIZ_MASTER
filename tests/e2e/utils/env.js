const REQUIRED_KEYS = [
  'E2E_BDK_EMAIL',
  'E2E_BDK_PASSWORD',
  'E2E_BDK_BUSINESS_ID'
];

function getEnv() {
  return {
    email: process.env.E2E_BDK_EMAIL || '',
    password: process.env.E2E_BDK_PASSWORD || '',
    businessId: process.env.E2E_BDK_BUSINESS_ID || '',
    repId: process.env.E2E_REP_ID || '',
    shopId: process.env.E2E_SHOP_ID || '',
    lorryId: process.env.E2E_LORRY_ID || '',
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://digibiz-sys.web.app'
  };
}

function missingRequiredEnv(env) {
  const map = {
    E2E_BDK_EMAIL: env.email,
    E2E_BDK_PASSWORD: env.password,
    E2E_BDK_BUSINESS_ID: env.businessId
  };
  return REQUIRED_KEYS.filter((k) => !String(map[k] || '').trim());
}

module.exports = {
  getEnv,
  missingRequiredEnv
};
