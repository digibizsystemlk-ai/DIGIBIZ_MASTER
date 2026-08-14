# GRN හි මුදල් ගෙවන මාදිලිය (Payment Mode) එකතු කිරීම සඳහා උපදෙස් පත්රිකාව

> **දිනය:** 2026
> **අදාළ ගොනුව:** `public/modules/retail/grn.html`
> **මෙය උපදෙස් (guide) පමණි — කිසිදු file එකක් edit නොකරයි.**

---

## 1. වර්ථමාන තත්ත්වය පැහැදිලි කිරීම

### 1.1 ඔබේ ප්‍රශ්නයට කෙටි පිළිතුර

**ඔව්, ඔබ සත්‍යයකි — දැනට `grn.html` තුළ මුදල් ගෙවන මාදිලිය (Cash / Bank / Cheque) තෝරන තැනක් නොමැත.**

දැනට GRN create කරන විට `paymentStatus: 'unpaid'` ලෙස පමණක් save වන අතර, **payment mode/kay** (මුදල් ගෙවූ ආකාරය) සුරක්ෂිත නොවේ.

### 1.2 දැනට සිදුවන දේ

1. **GRN Create** — `createPurchaseOrder()` function එකේදී මෙම data object එක save වේ:
```javascript
const poData = {
    poNo: poNo,
    supplierId: supplierId,
    supplierName: supplierName,
    grnNo: poNo,
    billDate: billDate,
    items: items,
    total: total,
    notes: notes,
    status: 'pending',
    paymentStatus: 'unpaid',   // ← මෙතනින් බලන්න, payment mode නැහැ!
    createdAt: new Date()
};
```
   👉 **payment mode කියන field එකක් නැහැ.**

2. **Stock ලැබීම (Receive)** — `confirmReceiveBtn` onclick handler එකේදී accounting event පහත පරිදි publish වේ:
```javascript
window.eventBus.publish('PURCHASE_MADE', {
    orderNo: po.poNo,
    amount: po.total,
    supplierName: po.supplierName,
    paymentStatus: po.paymentStatus || 'unpaid',
    businessId: currentBusinessId,
    items: po.items
});
```
   👉 මෙතනින් `paymentMode` හෝ `paymentMethod` දත්ත යවන්නේ නැහැ. ඉන් අදහස් වන්නේ accounts-core එක එය සැමවිටම **Cash account එකට** පළමුව record කරනවාටයි.

3. **පසුව ගෙවීම (Payables)** — `payables.html` හි "Pay Supplier" modal එකේදී Payment Method select (CASH / BANK) තියෙනවා. නමුත් **cheque option එකක් නැහැ.**

---

## 2. ප්‍රියතම විසඳුම (Recommended Approach)

GRN form එක තුළම **"Payment Mode"** select dropdown එකක් එකතු කර, එහි අගය Firestore හි GRN document තුළ සුරක්ෂිත කර, accounting event එකටද යවන්න.

### 2.1 අවශ්‍ය වන අගයන් (payment mode constants)

| මාදිලිය | අගය (value) | Firebase storage අගය |
|---------|--------------|------------------------|
| අතින් (Cash) | `CASH` | `paymentMode: 'CASH'` |
| බැංකුවෙන් (Bank) | `BANK` | `paymentMode: 'BANK'` |
| චෙක් පතකින් (Cheque) | `CHEQUE` | `paymentMode: 'CHEQUE'` |

> 💡 admin ටත් අනුකූලව, ඔබට `paymentMode` හා `paymentStatus` යන field දෙකම එකට සුරක්ෂිත කළ හැක — නමුත් paymentStatus `unpaid`/`paid` ලෙස තබා ගැනීම වැදගත් ය (GRN දැනට unpaid ලෙස ආරම්භ වන නිසා).

---

## 3. කේත උපදෙස් (Code Guidelines)

> ⚠️ **මේවා උපදෙස් පමණි — කිසිදු file එකක් edit කරන්න එපා.** ඔබට අදාළ ලෙස ඔබේ ගොනුවේ apply කරන්න.

### 3.1 HTML — Payment Mode Select එකක් එකතු කිරීම

GRN modal එකේ (විශේෂයෙන් `Bill Date` පේළියට පසුව) මෙය එක් කරන්න:

```html
<!-- Payment Mode Field -->
<div style="margin-bottom:15px;">
    <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px; text-align: left;">
        Payment Mode (මුදල් ගෙවන ආකාරය)
    </label>
    <select id="poPaymentMode" style="width:100%; padding:8px; border:1.5px solid #cbd5e1; border-radius:8px; font-size:14px;">
        <option value="">-- Select Payment Mode --</option>
        <option value="CASH">💵 අතින් (Cash)</option>
        <option value="BANK">🏦 බැංකුවෙන් (Bank / Card)</option>
        <option value="CHEQUE">📄 චෙක් පතකින් (Cheque)</option>
    </select>
</div>

<!-- Cheque details (විකල්පය — cheque තෝරාගත් විට පමණක් පෙන්වන කොටස) -->
<div id="chequeDetails" style="display:none; margin-bottom:15px; padding:12px; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:8px;">
    <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Cheque No</label>
    <input type="text" id="poChequeNo" placeholder="Cheque Number" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:8px;">
    <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Bank Name</label>
    <input type="text" id="poChequeBank" placeholder="Bank Name (e.g. BOC)" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px; margin-bottom:8px;">
    <label style="display:block; font-size:12px; font-weight:600; color:#64748b; margin-bottom:4px;">Cheque Date</label>
    <input type="date" id="poChequeDate" style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:8px;">
</div>
```

### 3.2 JavaScript — Payment mode / Cheque Toggle logic

`poPaymentMode` select හි change event එකෙන් cheque details ට toggle කිරීම:

```javascript
document.getElementById('poPaymentMode').addEventListener('change', function(){
    const chequeEl = document.getElementById('chequeDetails');
    if (this.value === 'CHEQUE') {
        chequeEl.style.display = 'block';
    } else {
        chequeEl.style.display = 'none';
        // අවශ්‍ය නම්: cheque fields clear
        document.getElementById('poChequeNo').value = '';
        document.getElementById('poChequeBank').value = '';
        document.getElementById('poChequeDate').value = '';
    }
});
```

### 3.3 JavaScript — `createPurchaseOrder()` හි data object එකට field එකතු කිරීම

`poData` object එක තුළ payment mode සුරක්ෂිත කිරීම:

```javascript
// payment mode එකෙන් value ගන්න
const paymentMode = document.getElementById('poPaymentMode').value || 'CASH'; // default CASH
const chequeNo   = document.getElementById('poChequeNo').value || null;
const chequeBank = document.getElementById('poChequeBank').value || null;
const chequeDate = document.getElementById('poChequeDate').value || null;

const poData = {
    // ... existing fields ...
    status: 'pending',
    paymentStatus: 'unpaid',        // GRN නිර්මාණයේදී unpaid
    paymentMode: paymentMode,       // ★ නව field — CASH / BANK / CHEQUE
    // චෙක් අදාළ නම් (විකල්ප):
    chequeNo: paymentMode === 'CHEQUE' ? chequeNo : null,
    chequeBank: paymentMode === 'CHEQUE' ? chequeBank : null,
    chequeDate: paymentMode === 'CHEQUE' ? chequeDate : null,
    // ... rest ...
};
```

### 3.4 JavaScript — `confirmReceiveStock` (PURCHASE_MADE event) එකට payment mode යැවීම

`confirmReceiveBtn.onclick` හි event object එකට paymentMode එකතු කිරීම:

```javascript
window.eventBus.publish('PURCHASE_MADE', {
    orderNo: po.poNo,
    amount: po.total,
    supplierName: po.supplierName,
    paymentStatus: po.paymentStatus || 'unpaid',
    paymentMode: po.paymentMode || 'CASH',   // ★ නව field
    businessId: currentBusinessId,
    items: po.items
});
```

### 3.5 Firestore හි GRN ගබඩා වන විට data structure

එය පහත පරිදි look වනු ඇත:

```
purchases/{businessId}/orders/{poNo}
├── poNo: "GRN-1001"
├── supplierId: "..."
├── supplierName: "..."
├── grnNo: "GRN-1001"
├── billDate: "2026-..."
├── items: [...]
├── total: 125000
├── status: "pending" / "received"
├── paymentStatus: "unpaid" | "paid"
├── paymentMode: "CASH" | "BANK" | "CHEQUE"   // ★ නව
├── chequeNo: "CHQ-12345"                      // ★ cheque නම් (විකල්ප)
├── chequeBank: "BOC"                          // ★ cheque නම් (විකල්ප)
├── chequeDate: "2026-..."                     // ★ cheque නම් (විකල්ප)
└── createdAt: Timestamp
```

---

## 4. Accounts / Accounting Core (Firebase) සම්බන්ධය

### 4.1 ඔබට එයම Firebase හි accounts-core එකටත් සම්බන්ධ කළ හැකිද?

**ඔව්, කළ හැක.** නමුත් පළමුව `/core/accounts-core.js` හි `PURCHASE_MADE` event listener එක බැලීම වැදගත් ය. එය හරියටම account entry එකක් ලියන්නේ Cash account එකට බව මට මේ මොහොතේ විශ්වාස නැත — නමුත් event object එකේ paymentMode නොයවා ඇති නිසා එය default එක (probably Cash) භාවිතා කරයි.

**එම accounts-core.js හි හැසිරීමට බලපෑම:** ඔබ event object එකට `paymentMode` එකතු කළතම, accounts-core.js තුළ ඒ අගය දැන ගැනීමට event listener එක බැලිය යුතුය. **එය edit කිරීමට පෙර `accounts-core.js` හි `PURCHASE_MADE` listener එක පරීක්ෂා කරන්න** — එය account entry ලියන්නේ `CASH` account code එකටදැයි තහවුරු කරන්න, ඉන්පසු paymentMode අනුව `BANK` account code එකට switch කිරීම අවශ්‍ය වේ.

---

## 5. අමතර (විකල්ප) අදහස්

### 5.1 GRN History Table එකේ payment mode බැංකුවට පෙන්වීම

`renderPurchaseOrders()` හි ඔබට payment mode දැක්විය හැක:

```javascript
// poTable හි "Status" column එක අසලට payment mode chip එකක්
const modeBadge = {
    'CASH':   '<span class="badge badge-cash">💵 Cash</span>',
    'BANK':   '<span class="badge badge-bank">🏦 Bank</span>',
    'CHEQUE': '<span class="badge badge-cheque">📄 Cheque</span>'
}[po.paymentMode] || '';
```

### 5.2 payables.html හි cheque option එක එකතු කිරීම

`payables.html` හි `payMethod` select එකට cheque add කළ හැක:

```html
<select id="payMethod" required>
    <option value="CASH">Cash</option>
    <option value="BANK">Bank</option>
    <option value="CHEQUE">Cheque</option>   <!-- add -->
</select>
```

---

## 6. අවසන් සාරාංශය

| Question | Answer |
|----------|--------|
| grn.html හි payment mode තෝරන තැනක් තියෙනවාද? | **නැහැ** — ඔබ හරි. |
| කළ හැකිද? | **ඔව්**, ඉහත උපදෙස් අනුව `grn.html` හි payment mode select එකක් එකතු කර, `paymentMode` field එක Firestore හි save කර, `PURCHASE_MADE` event එකට එය යැවිය හැක. |
| Accounts core එකටත් සම්බන්ධ කළ හැකිද? | **ඔව්** — නමුත් `/core/accounts-core.js` හි `PURCHASE_MADE` event listener එක පරීක්ෂා කර, paymentMode අනුව account code (CASH vs BANK) switch වීමට අවශ්‍යයෙන්ම edit කළ යුතුය. |

---

### උපදෙස් ගොනුව අවසන්
