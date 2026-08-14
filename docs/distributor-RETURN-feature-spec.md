# 🚚 DISTRIBUTOR REP APP — RETURN (ආපසු බාර ගැනීම) විශේෂාංගය | සම්පූර්ණ තාක්ෂණික වාර්තාව

> **අරමුණ:** Distributor REP App (`distributor-repapp.html`) හි "RETURN" (ආපසු බාරගැනීමේ) ක්‍රියාවලියක් එක් කිරීම. මෙම වාර්තාව අවශ්‍යතා සම්පූර්ණයෙන් අර්ථ දක්වා, කෙටමය (කෙතමය) සැකැස්ම සහ ක්‍රියාත්මක කිරීමේ සැලැස්ම ඉදිරිපත් කරයි.

---

## 1. පසුබිම සහ ගොනු ව්‍යුහය (Context & File Layout)

මෙම විශේෂාංගය එක් කරනු ලබන්නේ පහත ගොනුවටය:

| ගොනුව | විස්තරය |
|---|---|
| `public/modules/distributor/web/distributor-repapp.html` | ඉලක්කගත REP app ගොනුව (URL: `https://digibiz-sys.web.app/modules/distributor/web/distributor-repapp.html`) |
| `public/snapshots/STABLE_FREEZE_2026_08_11/modules/distributor/web/distributor-repapp.html` | Stable freeze (අනුවර්තනය නොකරන අනුරුවක් — නිදර්ශනයට) |

**වත්මන් පිරිසැලසුම (අදාළ කොටස):** Step 3 ("🛒 3. Order Items Summary") කාඩ් එකේ, පහත අනුපිළිවෙලින්:

1. `cartItemsList` — එකතු කළ අයිතම ලැයිස්තුව
2. `Payment Method` dropdown (`paymentMethodSelect`)
3. `Total Payable` + `SUBMIT SALES ORDER` බොත්තම

**Required placement:** RETURN පටිය **Payment Method එකට ඉහළින්** (එනම් `cartItemsList` ට පසු, `paymentMethodSelect` ට පෙර) තැබිය යුතුය.

---

## 2. අවශ්‍යතා අර්ථ නිරූපණය (Functional Requirements)

### FR-1: RETURN පටිය (Collapsible Band)
- **ස්ථානය:** Payment Method dropdown එකට ඉහළින්.
- **මුලින් පෙනෙන රූපය:** "⬅️ RETURN" ලෙස පටියක් ({{ RETURN }} වචනය ඇති පටිය) පමණි.
- **විහිදීම (expand):** පටිය මත ඇගිල්ල තැබූ විට (touch / click) එය පහළට විහිදී, RETURN ක්‍රියාවලියේ අයිතම තේරීමේ ප්‍රදේශය දිස්වේ. නැවත ක්ලික් කළ විට (collapse) හැකිලේ.

### FR-2: අයිතම තේරීම — TYPE හරහා පමණි
- RETURN අයිතම දැනට ඇති Product search ප්‍රතිපත්තිය ලෙසම **Type-to-search** හරහා පමණක් තෝරනු ලැබේ.
- සෙවුම් කොටුවකට ටයිප් කළ විට, පැමිණෙන නිෂ්පාදන ලැයිස්තුවේ නම/කේතය අනුව filter වී දිස්වේ.
- පළමුව පටිය විවෘත වූ විට (query එක හිස්ව තිබියදී) "Type to search" හිස්-තත්ව (empty-state) message එකක් පමණක් දිස්වේ — සම්පූර්ණ ලැයිස්තුව ලෝඩ් නොකරයි. (මෙය දැනට `renderProductsList()` හි ඇති ප්‍රතිපත්තියටම අනුකූලයි.)

### FR-3: අයිතම තේරීමෙන් පසු "RETURN" බොත්තම සක්‍රිය වීම (Enable)
- අවම වශයෙන් **එක් RETURN අයිතමයක්** (qty > 0) තෝරාගත් විට පමණක් "RETURN" (Submission) බොත්තම සක්‍රිය (enabled) වේ.
- කිසිදු අයිතමයක් නොතෝරාගත් විට බොත්තම අක්‍රිය (disabled / grey) වේ. → "යමක් RETURN කරනවාද" කියා තහවුරු කිරීමක් ලෙස ක්‍රියා කරයි.

### FR-4: Returned භාණ්ඩයේ "පිහිටීම" (Destination / Disposition) තේරීම
RETURN භාණ්ඩය යන්නේ කොහේටද යන්න තෝරා ගත යුතුය:

| අගය | අර්ථය | Default |
|---|---|---|
| **STOCK** | නැවත (Company) **stock එකටම** එකතු වේ (stock + ආපසු) | ✅ **Default** |
| **COMPANY** | ආපසු (head office / distributor) **ගොඩට යවන** ආකාරය | ❌ |
| **DESTROY** | භාණ්ඩය **විනාශ** කරන බව (stock ට එකතු නොවේ) | ❌ |

- තේරීම **radio buttons** හෝ **dropdown** ලෙසිනි — තේරීමට පහසුම radio buttons නිර්දේශ වේ.

### FR-5: Returned වටිනාකමේ "ප්‍රතිස්ථාපන ක්‍රමය" (Compensation / Refund Mode) තේරීම
"එම RETURN හි වටිනාකමට, මුල් අයිතමයම නැවත දෙනවාද, නැතිනම් මුදල් දෙනවාද" යන්න තේරීමට අවශ්‍යය:

| අගය | අර්ථය | Default |
|---|---|---|
| **REPLACE** (භාණ්ඩයම) | ආපසු පැමිණි අයිතමය **අලුත් අයිතමයකින් ප්‍රතිස්ථාපනය** (exchange) කරයි | ✅ **Default** |
| **REFUND** (මුදල්) | ආපසු ගත් අගයට **මුදල් ආපසු** (cash refund / credit note) දෙයි | ❌ |

> **ව්‍යාපාරික පැහැදිලි කිරීම:** "REPLACE" = මුල් අයිතමයේම (product) නව කෑල්ලක් ආදේශ කිරීම. "REFUND" = මුදල්මය වන්දිය. මෙය shipment (FR-4) තේරීම සමඟ එක්ව ව්‍යාපාරික හැසිරීම තීරණය කරයි.

---

## 3. හැසිරීම් අනුරූපකරණය (Behavioral Matrix)

පහත Matrix එක FR-4 × FR-5 එකතුවෙන් සිදුවන දේ විස්තර කරයි. `S = stock`, `D = destroy`, `Q = returnedQty`, `P = product cost price (unit)`:

| Shipment (FR-4) | Compensation (FR-5) | Stock හැසිරීම | GL/Acct හැසිරීම | Result |
|---|---|---|---|---|
| **STOCK** | **REPLACE** | stock **+Q** නැවත එකතු වේ | — (අදාළ නොවේ, exchange) | භාණ්ඩය stock ට යයි; ගැණුම්කරුට අලුත ලැබේ |
| **STOCK** | **REFUND** | stock **+Q** නැවත එකතු වේ | Cash/Receivable ඍණ වේ, Sales Refund credit | stock ට එකතු; මුදල් ආපසු |
| **COMPANY** | **REPLACE** | stock ට **+Q...** (හෝ සමාන ප්‍රතිස්ථාපන) | — | ආපසු ගොඩට යයි |
| **COMPANY** | **REFUND** | — | Cash/Receivable ඍණ | ආපසු යවා මුදල් ආපසු |
| **DESTROY** | **REFUND** | stock **−Q** (භෞතික විනාශය) | Cost of Goods/Spoilage ලෙස | විනාශ කර මුදල් ආපසු |
| **DESTROY** | **REPLACE** | stock **−Q**, ප්‍රතිස්ථාපන නොවේ (logical) | — | (විකල්ප) ප්‍රතිස්ථාපනය පමණි |

> **නිගමනය:** FR-4 (shipment) **Stock එකට බලපාන** තීරණයයි. FR-5 (compensation) **ගිණුම්/මුදල් බලපෑම** සහ "ආපසු මොනවාද දෙන්නේ" යන්න තීරණය කරයි. මේ නිසා දෙකම **වෙනම, පැහැදිලිව** තෝරාගත හැකි විය යුතුය.

---

## 4. UI/UX සැलැස්ම (Wireframe)

### 4.1 Collapsed (මුල් තත්වය) — Payment Method ට ඉහළින්
```
┌────────────────────────────────────┐
│ 🛒 3. Order Items Summary (0)   LKR 0.00│
│ ---------------------------------- │
│ [cart items list / "No items yet"] │
│ ---------------------------------- │
│ ┌────────────────────────────┐     │
│ │  ⬅️  RETURN               ▼ │     │  ← پටිය (Collapsed)
│ └────────────────────────────┘     │
│ Payment Method                     │  ← මේ ට පසුව
│ [ CASH PAYMENT ▼ ]                 │
│ Total Payable:            LKR 0.00 │
│ [🚀 SUBMIT SALES ORDER]            │
└────────────────────────────────────┘
```

### 4.2 Expanded (ඇගිල්ල තැබූ විට)
```
┌────────────────────────────────────┐
│ ┌────────────────────────────┐     │
│ │  ⬅️  RETURN               ▲ │     │ ← click හී (toggle)
│ └────────────────────────────┘     │
│ ┌────────────────────────────────┐ │
│ │ RETURN Items Search            │ │
│ │ [ 🔍 Type product name/code ] ✕│ │
│ │ Type to search...              │ │  ← empty-state
│ │ ------------------------------ │ │
│ │ (matකි product cards appear)   │ │
│ │  · Product A   Qty[+/-] 📦s    │ │
│ │  · Product B   Qty[+/-] 📦s    │ │
│ └────────────────────────────────┘ │
│ [Shipment: •Stock ◦Company ◦Destroy]│  ← FR-4 radio
│ [Comp:  •Replace ◦Refund(cash)   ] │  ← FR-5 radio
│ [ ⬅️ CONFIRM RETURN  (disabled/en) ]│  ← FR-3 enable
└────────────────────────────────────┘
```

---

## 5. දත්ත සැකැස්ම (Data Model / Firestore)

### 5.1 නව එකතුවක් හෝ collection — RECOMMENDED: `returns` collection

RETURN සිද්ධිය වාර්තා කිරීමට විකල්ප දෙකකි:

**විකල්ප A (RECOMMENDED): වෙනම `returns` collection**

```
returns/
  {returnId}
    ├─ businessId:  "<currentBusinessId>"
    ├─ repEmail / repName / repId
    ├─ shopId / shopName / customerName
    ├─ shipment:  "STOCK" | "COMPANY" | "DESTROY"     // FR-4
    ├─ compMode:  "REPLACE" | "REFUND"                // FR-5
    ├─ status:    "returned"
    ├─ createdAt: serverTimestamp
    ├─ totalRefund: <money>                            // FR-5 originalSaleAmount *
    └─ items: [
         { productId, productName, qty, unitCost,
           shipment, compMode }
       ]
```

**විකල්ප B: සමඟ sold `orders` document හි `returnItems` උප-කොටසක්**
(පවතින order එකටම RETURN තොරතුරු ඇමිණීම).

### 5.2 Stock update (FR-4 විධිමත්ව)

`adjustRepAppStockForOrder()` හි දැනට stock **deduct** කරන logic පවතී. RETURN සඳහා **ප්‍රතිලෝම (inverse) logic** එකක් අවශ්‍යය — එනම් `shipment = STOCK` හෝ `COMPANY(REPLACE)` තෝරන විට **+Q stock එකට එකතු** කරන්න.

```
function adjustRepAppStockForReturn(returnData) {
   // shipment=STOCK  -> stock += qty
   // shipment=DESTROY-> stock -= qty (භෞතික විනාශය)
   // එම product document search/reference හරහාම (byId/byName)
   batch.update(ref, { stock: nextStock, currentStock: nextStock, updatedAt: new Date() });
}
```

### 5.3 GL / Accounting (FR-5 REFUND මාදිලියට)
- `REFUND` තෝරන විට journal ඇතුළත් කිරීමක් (Sales Return / Refund) — පවතින `journal` collection ආකෘතිය අනුව:
  - debit `Sales Returns & Allowances` (4-4010 ශ්‍රේණියේ අඩු කිරීම)
  - credit `Cash in Drawer` / `Accounts Receivable`
- `REPLACE` මාදිලියට මුදල් ගනුදේනුවක් අවශ්‍ය නොවේ (exchange) — එබැවින් journal විකල්පයකි.

---

## 6. ක්‍රියාත්මක කිරීමේ සැලැස්ම (Implementation Plan)

පහත අනුපිළිවෙලින්, `distributor-repapp.html` හි සංශෝධනය:

### පියවර 1 — HTML (UI) එකතු කිරීම
- **`cartItemsList` div එකෙන් පසු, `Payment Method` label එකට පෙර** RETURN collapsible block එකක් එක් කරන්න.
  - Header button (⬅️ RETURN) — click පිට `toggleReturnPanel()`.
  - Hidden panel:

```html
<div id="returnPanel" style="display:none;">
  <div class="search-wrapper">
    <input type="text" id="returnSearchInput" ... placeholder="🔍 Type to find return product..."
           oninput="renderReturnProductsList()">
  </div>
  <div id="returnProductsList"></div>

  <!-- FR-4 Shipment -->
  <div>
    <label>Shipment Destination</label>
    <label><input type="radio" name="returnShipment" value="STOCK" checked> 📦 Return to Stock</label>
    <label><input type="radio" name="returnShipment" value="COMPANY"> 🏭 Send Back to Company</label>
    <label><input type="radio" name="returnShipment" value="DESTROY"> 🗑️ Destroy</label>
  </div>

  <!-- FR-5 Compensation -->
  <div>
    <label>Compensation Mode</label>
    <label><input type="radio" name="returnComp" value="REPLACE" checked> 🔁 Replace with New Item</label>
    <label><input type="radio" name="returnComp" value="REFUND"> 💵 Cash Refund</label>
  </div>

  <button id="returnSubmitBtn" onclick="submitReturn()" disabled>⬅️ CONFIRM RETURN</button>
</div>
```

### පියවර 2 — JS: State කුසලාන
- `let returnItems = [];` — RETURN අයිතම.
- `returnItems.length > 0` විට `returnSubmitBtn.disabled = false`; එසේ නැතිනම් `true`. (FR-3)

### පියවර 3 — JS: `renderReturnProductsList()`
- `renderProductsList()` හි Type-to-search empty-state ප්‍රතිපත්තියම copy කරන්න.
- සෑම product card එකකම **Qty stepper** එකක් (Return qty). පවතින product card ස්ටයිලිං භාවිතයෙන්.
- අයිතම තේරුණු විට `returnItems` ට push/update + `syncReturnSubmitButton()`.

### පියවර 4 — JS: `toggleReturnPanel()`
- click කළ විට panel (display none ↔ block) toggle. (FR-1)

### පියවර 5 — JS: `submitReturn()`
1. Validation: අවම එක් අයිතමයක් තිබිය යුතුය.
2. `shipment` + `compMode` radio අගයන් read.
3. **Stock adjust** — `shipment==='STOCK' || shipment==='COMPANY'` විට `+qty`; `shipment==='DESTROY'` විට `-qty`.
4. **GL** — `compMode==='REFUND'` විට journal entry (Sales Return).
5. `returns` collection එකට document එකක් save (විකල්ප A).
6. toast + reset `returnItems` සහ input.

### පියවර 6 — Regression
- `tests/e2e/` suite ට RETURN flow test එකක් එක් කිරීම (පවතින `order-with-lorry.spec.js` / `retail-flow.spec.js` ආකෘතියෙන්).
- `npx playwright test` ධාවනය.
- Multi-tenant හුදකලාව — `businessId` gate භාවිතා කිරීම (PROJECT_GUIDELINES §3).

---

## 7. පවත්නා කේතය සමඟ අනුකූලතා (Integration Points)

| අංශය | වත්මන් කේතය | RETURN සමඟ ඇති සම්බන්ධය |
|---|---|---|
| Product list | `productsList` (global) | RETURN සෙවුමට එකම list භාවිතය |
| Stock | `adjustRepAppStockForOrder()` deducts | Return එක stock **add** කළ යුතුය (inverse) |
| GL | `journal...entries` in `submitSalesOrder()` | REFUND mode හි Sales Return journal |
| Payment | `paymentMethodSelect` | RETURN panel ඊට ඉහළින් |
| Toast | `showToast(msg)` | Success/failure දැන්වීම් |
| Session | `currentBusinessId`, `currentRepName` | Return doc හි metadata |

---

## 8. ආරක්ෂාව සහ හුදකලාව (Security & Isolation)

- **Firestore Rules:** `returns` collection එකට නව write rule එකක් එක් කිරීම — authenticated REP ට පමණක් තමන්ගේ `businessId` හි return ලිවිය හැකි විය යුතුය.
- **Multi-tenant:** stock/GL changes හැම විටම `currentBusinessId` හරහා scope කරන්න (PROJECT_GUIDELINES §3).
- **Idempotency:** duplicate return submission වැළැක්වීමට දෙවරක් click වළක්වා (disable) දැමීම.

---

## 9. ප්‍රශ්න/පැහැදිලි කිරීම් (Open Questions for Stakeholders)

නිර්මාණයට පෙර පැහැදිලි කළ යුතු:

1. **COMPANY shipment** — භාණ්ඩය ආපසු ගොඩට යවන විට stock `-Q` කළ යුතුද, නැතහොත් මුල් stock එකේම තබාද? (සම්භාවිතව stock −Q).
2. **REPLACE mode** — ප්‍රතිස්ථාපනය යනු එකම product එකේම නව කෑල්ලක්ද, නැතහොත් වෙනත් product එකක් තෝරා ගැනීමට අවසරද?
3. **REFUND computing** — ආපසු මුදල ගණනය වන්නේ product හි **selling price** හෝ **cost price** අනුවද?
4. **Return items එකකට විවිධ FR-4/FR-5** — එක් return submission එකක් තුළ මුළු batch එකටම එකම shipment/comp තේරීමද, නැතහොත් එක් එක් අයිතමයට වෙන වෙනමද?
5. **"COMPANY → REPLACE"** ව්‍යාපාරික අර්ථය — company ගෙන් ආදේශනයක් ලබා දීමද?
6. **Receipt / printing** — RETURN සඳහා වෙනම receipt එකක් print කළ යුතුද?

---

## 10. සාරාංශය (Summary)

| අංශය | තීරණය |
|---|---|
| **ස්ථානය** | Step 3 කාඩ් එකේ, Payment Method ට ඉහළින් |
| **FR-1** | Collapsible "RETURN" පටිය (click → expand) |
| **FR-2** | Type-to-search හරහා පමණක් අයිතම තේරීම |
| **FR-3** | අවම එක් අයිතමයක් තෝරන විට පමණක් RETURN බොත්තම සක්‍රිය |
| **FR-4** | Shipment: **STOCK (default) / COMPANY / DESTROY** |
| **FR-5** | Compensation: **REPLACE (default) / REFUND** |
| **දත්ත** | `returns` collection (RECOMMENDED) හෝ order-subdoc |
| **Stock** | STOCK/COMPANY→ +Q; DESTROY→ −Q |
| **GL** | REFUND mode හි Sales Return journal |
| **Isolation** | `businessId` gate + Firestore rules + E2E tests |

---
*සකසන ලද්දේ: DIGIBIZ Technical Specification — Distributor REP RETURN module (නිර්‍මාණ අවධිය)*
