# Distributor E2E Suite (Playwright)

## Required environment variables

- `E2E_BDK_EMAIL`
- `E2E_BDK_PASSWORD`
- `E2E_BDK_BUSINESS_ID`
- `E2E_REP_ID` (for order-with-lorry test)
- `E2E_SHOP_ID` (for cheque/order tests)
- `E2E_LORRY_ID` (for transfer/order tests)
- `PLAYWRIGHT_BASE_URL` (optional, defaults to `https://digibiz-sys.web.app`)

## Run locally

```bash
npx playwright test tests/e2e --project=chromium
```

or

```bash
npm run test:e2e:distributor
```

## Scenarios

- GRN flow: stock + accounting entries verification
- Stock transfer: main stock down, lorry stock up
- Order with lorry: saved with `lorryId` and lorry stock decrement
- Cheque management: cheque document creation
- Accounting dashboard: non-zero stock/purchases in core dashboard widget
