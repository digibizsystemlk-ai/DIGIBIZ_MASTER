/**
 * Coconut Wholesale Module — Sales & Wholesale Invoicing Logic
 */

let appCtx = null;
let allCustomers = [];
let allCoconutStock = {};
let allProducts = [];
let cart = [];
let allSalesHistory = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('sales');
    document.getElementById('sDate').value = window.CoconutModule.toLocalDateStr(new Date());

    setupEventHandlers();
    await loadCustomers();
    await loadInventoryForCart();
    await loadSalesHistory();
});

function setupEventHandlers() {
    const itemTypeSelect = document.getElementById('cartItemType');
    const itemSelect = document.getElementById('cartItemSelect');
    const qtyInput = document.getElementById('cartQty');
    const priceInput = document.getElementById('cartUnitPrice');
    const modeSelect = document.getElementById('sPaymentMode');

    itemTypeSelect.addEventListener('change', populateItemDropdown);
    itemSelect.addEventListener('change', updateItemPriceAndStock);

    document.getElementById('btnAddToCart').addEventListener('click', handleAddToCart);

    modeSelect.addEventListener('change', () => {
        document.getElementById('sDueDateGroup').style.display = modeSelect.value === 'CREDIT' ? 'block' : 'none';
    });

    document.getElementById('saleForm').addEventListener('submit', handleSaveSale);

    // Customer Modal
    const cModal = document.getElementById('customerModal');
    document.getElementById('btnQuickAddCustomer').onclick = () => cModal.classList.add('open');
    document.getElementById('btnCloseCustomerModal').onclick = () => cModal.classList.remove('open');
    document.getElementById('btnCancelCustomer').onclick = () => cModal.classList.remove('open');
    document.getElementById('quickCustomerForm').addEventListener('submit', handleSaveQuickCustomer);

    // Receipt Modal
    const rModal = document.getElementById('invoiceReceiptModal');
    document.getElementById('btnCloseReceiptModal').onclick = () => rModal.classList.remove('open');
    document.getElementById('btnDoneReceipt').onclick = () => rModal.classList.remove('open');

    // Filter
    document.getElementById('searchSalesInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        renderSalesHistoryTable(allSalesHistory.filter(s =>
            (s.customerName && s.customerName.toLowerCase().includes(q)) ||
            (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q))
        ));
    });
}

async function loadCustomers() {
    const db = window.CoconutModule.getDb();
    const select = document.getElementById('sCustomer');
    try {
        const snap = await db.collection('coconut_customers')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allCustomers = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.isActive !== false);
        select.innerHTML = '<option value="">Select Customer...</option>' +
            allCustomers.map(c => `<option value="${c.id}">${window.CoconutModule.esc(c.name)} ${c.area ? '(' + window.CoconutModule.esc(c.area) + ')' : ''}</option>`).join('');

    } catch (e) {
        console.warn('Customers load error:', e);
    }
}

async function loadInventoryForCart() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const [cSnap, pSnap] = await Promise.all([
            db.collection('coconut_raw_coconuts').doc(bid).collection('items').get(),
            db.collection('coconut_finished_products').doc(bid).collection('items').get()
        ]);

        allCoconutStock = {};
        cSnap.docs.forEach(doc => {
            const d = doc.data() || {};
            const cat = d.category || doc.id;
            allCoconutStock[cat] = {
                qty: Number(d.stockQty) || 0,
                cost: Number(d.avgCostPerUnit || d.lastUnitCost) || 0
            };
        });

        allProducts = pSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.isActive !== false);

        populateItemDropdown();

    } catch (e) {
        console.warn('Inventory load error:', e);
    }
}

function populateItemDropdown() {
    const type = document.getElementById('cartItemType').value;
    const select = document.getElementById('cartItemSelect');

    if (type === 'COCONUT') {
        const categories = ['GOOD', 'MEDIUM', 'LOW', 'UNGRADED'];
        select.innerHTML = categories.map(cat => {
            const data = allCoconutStock[cat] || { qty: 0, cost: 0 };
            return `<option value="${cat}">${cat} Grade (${data.qty} in stock)</option>`;
        }).join('');
    } else {
        if (!allProducts.length) {
            select.innerHTML = '<option value="">No Finished Products Found</option>';
        } else {
            select.innerHTML = allProducts.map(p => {
                const qty = Number(p.stockQty) || 0;
                return `<option value="${p.id}">${window.CoconutModule.esc(p.name)} (${qty} ${p.unitName} in stock)</option>`;
            }).join('');
        }
    }

    updateItemPriceAndStock();
}

function updateItemPriceAndStock() {
    const type = document.getElementById('cartItemType').value;
    const itemKey = document.getElementById('cartItemSelect').value;
    const availSpan = document.getElementById('cartStockAvail');
    const priceInput = document.getElementById('cartUnitPrice');

    if (type === 'COCONUT') {
        const data = allCoconutStock[itemKey] || { qty: 0, cost: 0 };
        availSpan.textContent = `${window.CoconutModule.fmt(data.qty, 0)} nuts`;
        // Default recommended selling rates
        const defaultRates = { GOOD: 120, MEDIUM: 100, LOW: 80, UNGRADED: 95 };
        if (!priceInput.value || priceInput.dataset.autoFilled === 'true') {
            priceInput.value = defaultRates[itemKey] || Math.round(data.cost * 1.25);
            priceInput.dataset.autoFilled = 'true';
        }
    } else {
        const prod = allProducts.find(x => x.id === itemKey);
        if (prod) {
            availSpan.textContent = `${window.CoconutModule.fmt(prod.stockQty, 0)} ${prod.unitName}`;
            if (!priceInput.value || priceInput.dataset.autoFilled === 'true') {
                priceInput.value = prod.unitPrice || 0;
                priceInput.dataset.autoFilled = 'true';
            }
        } else {
            availSpan.textContent = '0';
        }
    }
}

function handleAddToCart() {
    const type = document.getElementById('cartItemType').value;
    const itemKey = document.getElementById('cartItemSelect').value;
    const qty = Number(document.getElementById('cartQty').value) || 0;
    const price = Number(document.getElementById('cartUnitPrice').value) || 0;

    if (!itemKey || qty <= 0 || price < 0) {
        alert('Please enter valid quantity and price');
        return;
    }

    let itemName = '';
    let cogsUnit = 0;
    let availableQty = 0;
    let unitName = 'units';

    if (type === 'COCONUT') {
        itemName = `Fresh Coconut (${itemKey} Grade)`;
        const cData = allCoconutStock[itemKey] || { qty: 0, cost: 0 };
        cogsUnit = cData.cost || 0;
        availableQty = cData.qty;
        unitName = 'nuts';
    } else {
        const p = allProducts.find(x => x.id === itemKey);
        if (!p) return;
        itemName = p.name;
        cogsUnit = Number(p.unitCost) || 0;
        availableQty = Number(p.stockQty) || 0;
        unitName = p.unitName;
    }

    if (qty > availableQty) {
        if (!confirm(`⚠️ Selected quantity (${qty}) exceeds available stock (${availableQty}). Add anyway?`)) return;
    }

    const lineTotal = qty * price;
    const lineCogs = qty * cogsUnit;

    cart.push({
        itemType: type,
        refId: itemKey,
        name: itemName,
        unitName,
        qty,
        unitPrice: price,
        lineTotal,
        cogsUnit,
        cogsAmount: lineCogs
    });

    document.getElementById('cartQty').value = '';
    renderCart();
}

function renderCart() {
    const body = document.getElementById('cartTableBody');
    if (!cart.length) {
        body.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:16px; color:var(--c-text-muted);">Cart is empty. Add items above.</td></tr>';
        document.getElementById('cartSummaryQty').textContent = '0 items';
        document.getElementById('cartSummaryCogs').textContent = 'Rs. 0.00';
        document.getElementById('cartSummaryMargin').textContent = 'Rs. 0.00 (0%)';
        document.getElementById('cartSummaryGrandTotal').textContent = 'Rs. 0.00';
        return;
    }

    let totalQty = 0;
    let grandTotal = 0;
    let grandCogs = 0;

    body.innerHTML = cart.map((item, idx) => {
        totalQty += item.qty;
        grandTotal += item.lineTotal;
        grandCogs += item.cogsAmount;

        return `
            <tr>
                <td><strong>${window.CoconutModule.esc(item.name)}</strong></td>
                <td class="text-right">${window.CoconutModule.fmt(item.qty, 0)} ${item.unitName}</td>
                <td class="text-right">Rs. ${window.CoconutModule.fmt(item.unitPrice, 2)}</td>
                <td class="text-right" style="font-weight:700;">${window.CoconutModule.fmtLKR(item.lineTotal)}</td>
                <td class="text-center">
                    <button type="button" class="c-btn c-btn-danger c-btn-sm" onclick="removeCartItem(${idx})">×</button>
                </td>
            </tr>
        `;
    }).join('');

    const profit = grandTotal - grandCogs;
    const marginPct = grandTotal > 0 ? ((profit / grandTotal) * 100).toFixed(1) : 0;

    document.getElementById('cartSummaryQty').textContent = `${window.CoconutModule.fmt(totalQty, 0)} units (${cart.length} lines)`;
    document.getElementById('cartSummaryCogs').textContent = window.CoconutModule.fmtLKR(grandCogs);
    document.getElementById('cartSummaryMargin').textContent = `${window.CoconutModule.fmtLKR(profit)} (${marginPct}%)`;
    document.getElementById('cartSummaryGrandTotal').textContent = window.CoconutModule.fmtLKR(grandTotal);
}

function removeCartItem(index) {
    cart.splice(index, 1);
    renderCart();
}

async function handleSaveSale(e) {
    e.preventDefault();
    if (!cart.length) {
        alert('Please add at least one line item to the bill');
        return;
    }

    const btn = document.getElementById('btnSaveSale');
    btn.disabled = true;
    btn.textContent = 'Invoicing Sale & Posting Journal...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('sDate').value;
        const customerId = document.getElementById('sCustomer').value;
        const customerObj = allCustomers.find(c => c.id === customerId) || {};
        const customerName = customerObj.name || 'Direct Walk-in Customer';
        const paymentMode = document.getElementById('sPaymentMode').value;
        const dueDate = document.getElementById('sDueDate').value || '';

        const grandTotal = cart.reduce((s, i) => s + i.lineTotal, 0);
        const grandCogs = cart.reduce((s, i) => s + i.cogsAmount, 0);
        const profit = grandTotal - grandCogs;

        const saleId = `SALE_${window.CoconutModule.uid('inv')}`;
        const invoiceNo = `INV-${Date.now().toString().slice(-6)}`;
        const sDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();

        const batch = db.batch();

        // 1. Deduct Respective Inventory Items
        for (const item of cart) {
            if (item.itemType === 'COCONUT') {
                const catRef = db.collection('coconut_raw_coconuts').doc(bid).collection('items').doc(item.refId);
                const cur = allCoconutStock[item.refId] || { qty: 0 };
                const newQty = Math.max(0, cur.qty - item.qty);
                batch.set(catRef, {
                    stockQty: newQty,
                    updatedAt: window.CoconutModule.tsToFirestore(new Date())
                }, { merge: true });
            } else if (item.itemType === 'PRODUCT') {
                const prodRef = db.collection('coconut_finished_products').doc(bid).collection('items').doc(item.refId);
                const p = allProducts.find(x => x.id === item.refId) || { stockQty: 0 };
                const newQty = Math.max(0, (Number(p.stockQty) || 0) - item.qty);
                batch.set(prodRef, {
                    stockQty: newQty,
                    updatedAt: window.CoconutModule.tsToFirestore(new Date())
                }, { merge: true });
            }
        }

        // 2. Insert Sale Document
        const saleRef = db.collection('coconut_sales').doc(saleId);
        batch.set(saleRef, {
            businessId: bid,
            saleId,
            invoiceNo,
            customerId,
            customerName,
            items: cart,
            amount: Number(grandTotal.toFixed(2)),
            cogsAmount: Number(grandCogs.toFixed(2)),
            profit: Number(profit.toFixed(2)),
            paymentMode,
            paymentStatus: paymentMode === 'CREDIT' ? 'UNPAID' : 'PAID',
            dueDate,
            date: window.CoconutModule.tsToFirestore(sDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            isActive: true
        });

        // 3. Update Customer Balance & Sub-collection Ledger if Credit
        if (paymentMode === 'CREDIT' && customerId) {
            const custRef = db.collection('coconut_customers').doc(customerId);
            const custLedgerRef = custRef.collection('ledger').doc(`LED_${saleId}`);

            const currentBal = Number(customerObj.balance) || 0;
            batch.set(custRef, {
                balance: currentBal + grandTotal,
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });

            batch.set(custLedgerRef, {
                businessId: bid,
                type: 'SALE',
                referenceId: saleId,
                invoiceNo,
                amount: grandTotal,
                balanceAfter: currentBal + grandTotal,
                description: `Invoice #${invoiceNo} (${cart.length} line items)`,
                date: window.CoconutModule.tsToFirestore(sDateObj),
                createdAt: window.CoconutModule.tsToFirestore(new Date())
            });
        }

        // 4. Post Balanced Double-Entry Journal
        // Revenue Posting:
        // Dr Cash (1-1010-01) / Bank (1-1020-01) / Accounts Receivable (1-1030-01) [grandTotal]
        // Cr Sales Revenue (4-4010-01) [grandTotal]
        const revLines = [];
        if (paymentMode === 'CASH') {
            revLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: grandTotal, credit: 0 });
        } else if (paymentMode === 'BANK') {
            revLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: grandTotal, credit: 0 });
        } else {
            revLines.push({ accountCode: '1-1030-01', accountName: 'Accounts Receivable (Customers)', debit: grandTotal, credit: 0 });
        }
        revLines.push({ accountCode: '4-4010-01', accountName: 'Sales Revenue', debit: 0, credit: grandTotal });

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Sales Invoice #${invoiceNo} — ${customerName}`,
            referenceType: 'COCONUT_SALE',
            ref: `coconut_sales/${saleId}`,
            date: sDateObj,
            lines: revLines,
            batch
        });

        // COGS Posting (if cogs > 0):
        // Dr COGS (5-5020-01) [grandCogs]
        // Cr Inventory (1-1040-01) [grandCogs]
        if (grandCogs > 0) {
            await window.CoconutModule.postJournalEntry({
                businessId: bid,
                description: `COGS Recognized for Invoice #${invoiceNo}`,
                referenceType: 'COCONUT_SALE_COGS',
                ref: `coconut_sales/${saleId}`,
                date: sDateObj,
                lines: [
                    { accountCode: '5-5020-01', accountName: 'Cost of Goods Sold (COGS)', debit: grandCogs, credit: 0 },
                    { accountCode: '1-1040-01', accountName: 'Inventory (Coconut & Finished Stock)', debit: 0, credit: grandCogs }
                ],
                batch
            });
        }

        await batch.commit();

        window.CoconutModule.showToast(`Invoice #${invoiceNo} generated successfully!`, 'success');

        // Show Invoice Receipt Modal
        showInvoiceReceipt({
            invoiceNo,
            customerName,
            date: sDateObj,
            items: cart,
            amount: grandTotal,
            paymentMode
        });

        cart = [];
        renderCart();
        document.getElementById('saleForm').reset();
        document.getElementById('sDate').value = window.CoconutModule.toLocalDateStr(new Date());

        await loadInventoryForCart();
        await loadSalesHistory();

    } catch (err) {
        console.error('Save sale error:', err);
        window.CoconutModule.showToast('Failed to invoice sale: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Confirm Sale & Generate Invoice';
    }
}

function showInvoiceReceipt(data) {
    const rc = document.getElementById('receiptContent');
    rc.innerHTML = `
        <div style="border:1px solid #e2e8f0; border-radius:12px; padding:24px; background:#fff; font-family:inherit;">
            <div style="display:flex; justify-content:space-between; border-bottom:2px solid #0f3b2c; padding-bottom:12px; margin-bottom:16px;">
                <div>
                    <h2 style="color:#0f3b2c; margin:0;">🥥 ${window.CoconutModule.esc(appCtx.businessName)}</h2>
                    <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Wholesale & Husk Value Addition</p>
                </div>
                <div style="text-align:right;">
                    <h3 style="margin:0; color:#0f172a;">${window.CoconutModule.esc(data.invoiceNo)}</h3>
                    <p style="font-size:12px; color:#64748b; margin:2px 0 0 0;">Date: ${window.CoconutModule.formatDate(data.date)}</p>
                </div>
            </div>

            <div style="margin-bottom:16px; font-size:13px;">
                Customer: <strong>${window.CoconutModule.esc(data.customerName)}</strong><br>
                Payment Terms: <span class="c-badge c-badge-info">${data.paymentMode}</span>
            </div>

            <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                        <th style="padding:8px; text-align:left;">Item</th>
                        <th style="padding:8px; text-align:right;">Qty</th>
                        <th style="padding:8px; text-align:right;">Unit Price</th>
                        <th style="padding:8px; text-align:right;">Amount (LKR)</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.items.map(i => `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:8px;">${window.CoconutModule.esc(i.name)}</td>
                            <td style="padding:8px; text-align:right;">${i.qty} ${i.unitName}</td>
                            <td style="padding:8px; text-align:right;">Rs. ${window.CoconutModule.fmt(i.unitPrice, 2)}</td>
                            <td style="padding:8px; text-align:right; font-weight:700;">${window.CoconutModule.fmtLKR(i.lineTotal)}</td>
                        </tr>
                    `).join('')}
                    <tr style="font-size:16px; font-weight:800; border-top:2px solid #0f3b2c;">
                        <td colspan="3" style="padding:12px 8px; text-align:right;">GRAND TOTAL:</td>
                        <td style="padding:12px 8px; text-align:right; color:#0f3b2c;">${window.CoconutModule.fmtLKR(data.amount)}</td>
                    </tr>
                </tbody>
            </table>

            <div style="text-align:center; font-size:11.5px; color:#64748b; margin-top:20px; border-top:1px dashed #cbd5e1; padding-top:10px;">
                Thank you for your business! System generated with DigiBiz.
            </div>
        </div>
    `;

    document.getElementById('invoiceReceiptModal').classList.add('open');
}

async function loadSalesHistory() {
    const db = window.CoconutModule.getDb();
    const todayBody = document.getElementById('todayInvoicesBody');
    const startToday = window.CoconutModule.startOfToday();

    try {
        const snap = await db.collection('coconut_sales')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allSalesHistory = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(s => s.isActive !== false)
            .sort((a, b) => {
                const ta = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
                const tb = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
                return tb - ta;
            });

        // Today's list
        const todaySales = allSalesHistory.filter(s => {
            const dt = window.CoconutModule.parseDateAny(s.date || s.createdAt);
            return dt && dt >= startToday;
        });

        if (!todaySales.length) {
            todayBody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px; color:var(--c-text-muted);">No sales recorded yet today.</td></tr>';
        } else {
            todayBody.innerHTML = todaySales.map(s => `
                <tr>
                    <td><strong>${window.CoconutModule.esc(s.invoiceNo || s.saleId)}</strong></td>
                    <td>${window.CoconutModule.esc(s.customerName || 'Customer')}</td>
                    <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(s.amount)}</td>
                    <td class="text-right" style="color:#059669; font-weight:700;">+${window.CoconutModule.fmtLKR(s.profit)}</td>
                    <td><span class="c-badge c-badge-neutral">${s.paymentMode}</span></td>
                    <td class="text-center">
                        <button class="c-btn c-btn-secondary c-btn-sm" onclick="viewHistoricalReceipt('${s.id}')">🧾</button>
                    </td>
                </tr>
            `).join('');
        }

        renderSalesHistoryTable(allSalesHistory);

    } catch (e) {
        console.warn(e);
    }
}

function renderSalesHistoryTable(list) {
    const body = document.getElementById('salesHistoryTableBody');
    if (!list || !list.length) {
        body.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:24px; color:var(--c-text-muted);">No invoices recorded.</td></tr>';
        return;
    }

    body.innerHTML = list.map(s => {
        const dt = window.CoconutModule.formatDate(s.date || s.createdAt);
        const itemsSum = Array.isArray(s.items) ? s.items.map(i => `${i.qty} ${i.name}`).join(', ') : 'Sale items';

        return `
            <tr>
                <td>${dt}</td>
                <td><strong>${window.CoconutModule.esc(s.invoiceNo || s.saleId)}</strong></td>
                <td>${window.CoconutModule.esc(s.customerName || 'Customer')}</td>
                <td style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${window.CoconutModule.esc(itemsSum)}">${window.CoconutModule.esc(itemsSum)}</td>
                <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(s.amount)}</td>
                <td class="text-right" style="color:var(--c-text-muted);">${window.CoconutModule.fmtLKR(s.cogsAmount)}</td>
                <td class="text-right" style="font-weight:700; color:#059669;">+${window.CoconutModule.fmtLKR(s.profit)}</td>
                <td><span class="c-badge c-badge-neutral">${s.paymentMode}</span></td>
                <td class="text-center">
                    <button class="c-btn c-btn-secondary c-btn-sm" onclick="viewHistoricalReceipt('${s.id}')">🧾</button>
                    <button class="c-btn c-btn-danger c-btn-sm" onclick="handleDeleteSale('${s.id}')" title="Reverse invoice & stock">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function viewHistoricalReceipt(id) {
    const s = allSalesHistory.find(x => x.id === id);
    if (!s) return;
    showInvoiceReceipt({
        invoiceNo: s.invoiceNo || s.saleId,
        customerName: s.customerName || 'Customer',
        date: s.date || s.createdAt,
        items: Array.isArray(s.items) ? s.items : [],
        amount: s.amount || 0,
        paymentMode: s.paymentMode || 'CASH'
    });
}

async function handleDeleteSale(saleId) {
    if (!confirm('⚠️ Are you sure you want to reverse this invoice?\n\nThis will return sold items to stock, adjust customer balances, and post reversal journal entries.')) return;

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const sDocRef = db.collection('coconut_sales').doc(saleId);
        const sDoc = await sDocRef.get();
        if (!sDoc.exists) return;
        const s = sDoc.data();

        const amount = Number(s.amount) || 0;
        const cogs = Number(s.cogsAmount) || 0;
        const customerId = s.customerId;
        const items = Array.isArray(s.items) ? s.items : [];

        // 1. Re-add Inventory
        for (const item of items) {
            if (item.itemType === 'COCONUT') {
                const catRef = db.collection('coconut_raw_coconuts').doc(bid).collection('items').doc(item.refId);
                const curDoc = await catRef.get();
                if (curDoc.exists) {
                    const curQty = Number(curDoc.data().stockQty) || 0;
                    await catRef.set({
                        stockQty: curQty + (Number(item.qty) || 0),
                        updatedAt: window.CoconutModule.tsToFirestore(new Date())
                    }, { merge: true });
                }
            } else if (item.itemType === 'PRODUCT') {
                const prodRef = db.collection('coconut_finished_products').doc(bid).collection('items').doc(item.refId);
                const pDoc = await prodRef.get();
                if (pDoc.exists) {
                    const curQty = Number(pDoc.data().stockQty) || 0;
                    await prodRef.set({
                        stockQty: curQty + (Number(item.qty) || 0),
                        updatedAt: window.CoconutModule.tsToFirestore(new Date())
                    }, { merge: true });
                }
            }
        }

        // 2. Adjust Customer Balance if Credit
        if (s.paymentMode === 'CREDIT' && customerId) {
            const custRef = db.collection('coconut_customers').doc(customerId);
            const cDoc = await custRef.get();
            if (cDoc.exists) {
                const curBal = Number(cDoc.data().balance) || 0;
                await custRef.set({
                    balance: Math.max(0, curBal - amount),
                    updatedAt: window.CoconutModule.tsToFirestore(new Date())
                }, { merge: true });
            }
        }

        // 3. Mark Sale Inactive
        await sDocRef.set({
            isActive: false,
            deletedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 4. Reverse Journal Entries
        const revLines = [
            { accountCode: '4-4010-01', accountName: 'Sales Revenue', debit: amount, credit: 0 }
        ];
        if (s.paymentMode === 'CASH') revLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: 0, credit: amount });
        else if (s.paymentMode === 'BANK') revLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: 0, credit: amount });
        else revLines.push({ accountCode: '1-1030-01', accountName: 'Accounts Receivable', debit: 0, credit: amount });

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `[REVERSAL] Deleted Sale #${s.invoiceNo || saleId}`,
            referenceType: 'COCONUT_SALE_REVERSAL',
            ref: `coconut_sales/${saleId}`,
            date: new Date(),
            lines: revLines
        });

        if (cogs > 0) {
            await window.CoconutModule.postJournalEntry({
                businessId: bid,
                description: `[REVERSAL] COGS Reversed for #${s.invoiceNo || saleId}`,
                referenceType: 'COCONUT_SALE_COGS_REVERSAL',
                ref: `coconut_sales/${saleId}`,
                date: new Date(),
                lines: [
                    { accountCode: '1-1040-01', accountName: 'Inventory (Reversed)', debit: cogs, credit: 0 },
                    { accountCode: '5-5020-01', accountName: 'COGS Reversed', debit: 0, credit: cogs }
                ]
            });
        }

        window.CoconutModule.showToast('Sale invoice reversed successfully!', 'success');
        await loadInventoryForCart();
        await loadSalesHistory();

    } catch (e) {
        console.error('Delete sale error:', e);
        window.CoconutModule.showToast('Failed to reverse sale: ' + e.message, 'error');
    }
}

async function handleSaveQuickCustomer(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const name = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const area = document.getElementById('cArea').value.trim();
    const address = document.getElementById('cAddress').value.trim();

    try {
        const docRef = await db.collection('coconut_customers').add({
            businessId: bid,
            name,
            phone,
            area,
            address,
            balance: 0,
            isActive: true,
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        });

        window.CoconutModule.showToast('Customer added!', 'success');
        document.getElementById('quickCustomerForm').reset();
        document.getElementById('customerModal').classList.remove('open');

        await loadCustomers();
        document.getElementById('sCustomer').value = docRef.id;

    } catch (e) {
        window.CoconutModule.showToast('Failed to add customer: ' + e.message, 'error');
    }
}
