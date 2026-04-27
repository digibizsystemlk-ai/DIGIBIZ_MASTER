# Distribution Pilot V1 (bdkariyapperuma@gmail.com)

## Scope
- Business type: distributor
- Feature owner email: `bdkariyapperuma@gmail.com`
- Phase 1 completed in this patch: data models + Main Stock -> Lorry Stock transfer UI
- Phase 2 completed: sales order lorry selection + lorry stock validation/decrement + order list lorry filter
- Phase 3 completed: cheque management CRUD + upcoming cheque dashboard widget
- Phase 4 completed: credit aging report + cheque schedule CSV/print + widget financial alerts
- Phase 5 completed: rep commission configuration + auto order commission + commission reports

## New File Structure (target architecture)
- `public/core/distributor-lorry-stock.js` - lorry stock data model helpers, business/email feature gating
- `public/modules/distributor/web/warehouse.html` - stock transfer UI + transaction logic (Main -> Lorry)
- `public/modules/distributor/web/new-order.html` - (next) lorry selection at order/sale capture
- `public/modules/distributor/web/reports.html` - (next) lorry stock and aging report widgets
- `public/modules/distributor/mobile/order.html` - (next) rep mobile flow with lorry scope

## Firestore Collections (non-breaking additions)

### `lorries` (new)
Document ID: auto
```json
{
  "businessId": "string",
  "lorryCode": "LORRY-01",
  "name": "Lorry 1",
  "repId": "string",
  "repName": "string",
  "isActive": true,
  "createdAt": "Timestamp",
  "createdBy": "uid"
}
```

### `lorryStock` (new)
Document ID: `${businessId}__${lorryId}__${productId}`
```json
{
  "businessId": "string",
  "lorryId": "string",
  "lorryCode": "LORRY-01",
  "lorryName": "Lorry 1",
  "productId": "string",
  "productName": "string",
  "qty": 0,
  "minStockLevel": 10,
  "updatedAt": "Timestamp",
  "updatedBy": "uid"
}
```

### `stockTransfers` (new log collection)
Document ID: auto
```json
{
  "businessId": "string",
  "transferType": "MAIN_TO_LORRY",
  "fromStock": "MAIN",
  "toLorryId": "string",
  "toLorryCode": "LORRY-01",
  "productId": "string",
  "productName": "string",
  "qty": 0,
  "note": "string",
  "performedBy": "uid",
  "performedAt": "Timestamp",
  "oldMainStock": 100,
  "newMainStock": 90,
  "oldLorryStock": 15,
  "newLorryStock": 25
}
```

### `cheques` (new)
Document ID: auto
```json
{
  "businessId": "string",
  "customerId": "string",
  "customerName": "string",
  "orderId": "string",
  "invoiceNumber": "string",
  "bankName": "string",
  "chequeNumber": "string",
  "amount": 0,
  "issueDate": "Timestamp",
  "depositDueDate": "Timestamp",
  "status": "pending_deposit|deposited|cleared|bounced",
  "bounceReason": "string",
  "isActive": true,
  "createdAt": "Timestamp",
  "updatedAt": "Timestamp"
}
```

### `commissionConfig` (new)
Document ID: repId (recommended)
```json
{
  "businessId": "string",
  "repId": "string",
  "repName": "string",
  "commissionType": "percentage|tiered",
  "percentageValue": 5,
  "tiers": [{"threshold":100000,"rate":5},{"threshold":200000,"rate":7}],
  "updatedAt": "Timestamp",
  "updatedBy": "uid"
}
```

### `commissionTransactions` (new)
Document ID: `${orderId}__${repId}` (recommended)
```json
{
  "businessId": "string",
  "orderId": "string",
  "repId": "string",
  "repName": "string",
  "orderTotal": 0,
  "commissionRate": 0,
  "commissionAmount": 0,
  "calculatedAt": "Timestamp",
  "status": "pending|paid"
}
```

## Business Isolation Strategy
- Existing collections are untouched (no schema changes to current docs).
- New features are available only when:
  - logged-in email = `bdkariyapperuma@gmail.com`
  - same session-locked businessId is active
- All new writes include `businessId` and remain tenant-scoped.

## Test Instructions (Pilot Tenant)
1. Login as `bdkariyapperuma@gmail.com`.
2. Open `Warehouse` -> `Stock` tab.
3. Confirm "Main -> Lorry stock transfer" card appears.
4. Transfer a known product quantity to Lorry 1.
5. Verify:
   - `products/{productId}.currentStock` decreased
   - `lorryStock/{businessId__lorryId__productId}.qty` increased
   - one `stockTransfers` log created
6. Login with any other business/email and confirm transfer card does not show.

## Phase 2 Test Instructions (Sales with Lorry)
1. Login as `bdkariyapperuma@gmail.com` and open `/modules/distributor/web/new-order.html`.
2. Confirm `Select Lorry` dropdown appears.
3. Select `LORRY-01` and add products to cart.
4. Verify lorry stock hint shows `need` vs `available` values from `lorryStock`.
5. Try submitting quantity larger than available; confirm block message:
   - `Insufficient stock in Lorry {lorryId}. Available: {qty}`
6. Submit valid order.
7. Verify:
   - `pendingOrders` new document contains `lorryId`
   - matching `lorryStock` docs are decremented
   - `products.currentStock` does not change on submit
8. Approve order from order status page.
9. Confirm approved `orders` document keeps `lorryId`, and main stock is not decremented for lorry-tagged orders.
10. Open order list page and verify:
    - new `Lorry` column visible
    - `Filter by lorry` works for pilot tenant only.

## Phase 3 Test Instructions (Cheques + Widget)
1. Login as `bdkariyapperuma@gmail.com`.
2. Open `/modules/distributor/web/cheques.html`.
3. Add a cheque with valid data:
   - amount > 0
   - due date >= issue date
4. Verify cheque row appears in list and Firestore `cheques` collection.
5. Test status transitions:
   - `pending_deposit -> deposited -> cleared`
   - `pending_deposit -> bounced` (with reason)
   - `bounced -> pending_deposit`
6. Try invalid cases and confirm blocked:
   - due date before issue date
   - bounced without reason
   - delete when status is `cleared`
7. Soft delete a non-cleared cheque and verify `isActive: false`.
8. Open `/modules/distributor/web/index.html`:
   - verify `Upcoming Cheques to Deposit` widget appears only for pilot tenant
   - change horizon 7/14/30 and confirm list updates
   - click a row and verify it opens cheque management page.
9. Login with other businesses/users and confirm:
   - cheque page shows restricted state
   - widget is hidden.

## Phase 4 Test Instructions (Credit Aging + Exports)
1. Login as `bdkariyapperuma@gmail.com`.
2. Open `/modules/distributor/web/credit-aging.html`.
3. Verify table shows only shops with outstanding credit.
4. Confirm bucket values map to:
   - current (0-30), 31-60, 61-90, 90+ by order age.
5. Test filters:
   - shop name
   - bucket filter
6. Export CSV and verify fields:
   - shop name, contact, outstanding, each bucket, last transaction date, credit limit, overdue flag.
7. Use print and verify print-friendly layout.
8. Open `/modules/distributor/web/cheques.html`:
   - summary bar shows pending/deposited/cleared totals
   - CSV export contains: customer, bank, cheque no, amount, issue, due, status, days until due
   - print report uses current filters
9. Open `/modules/distributor/web/index.html` and verify widget enhancements:
   - Total Pending Cheques Amount visible
   - Overdue Credit Alert appears in red if any customer exceeds credit limit
   - View Aging Report button navigates to `credit-aging.html`
10. Login with non-pilot tenant and confirm:
   - `credit-aging.html` restricted
   - enhanced cheque/credit widget hidden.

## Phase 5 Test Instructions (Rep Commission)
1. Login as `bdkariyapperuma@gmail.com`.
2. Open `/modules/distributor/web/commission-config.html`.
3. Configure one rep with:
   - percentage mode (e.g. 5%), save
   - tiered mode JSON, save
4. Create and approve an order for configured rep.
5. Verify on approved order doc (`orders/{orderId}`):
   - `commissionAmount`, `commissionRate`, `commissionCalculatedAt`
6. Verify `commissionTransactions` contains one record for that order/rep.
7. Open `/modules/distributor/web/rep-commission-report.html`:
   - summary by rep populated
   - order-level rows visible
   - date range filter works
   - CSV + print work
8. Click `Mark Paid` and confirm transaction status updates to `paid`.
9. Open dashboard (`/modules/distributor/web/index.html`) and verify:
   - Top Rep by Commission (current month)
   - Total commission pending to pay
10. Non-pilot tenant check:
   - commission config/report restricted
   - commission widget hidden.
