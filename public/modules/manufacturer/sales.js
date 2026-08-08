// db is already declared globally by firebase-init.js
document.getElementById('mfgStyle').textContent = ManufacturerModule.baseStyles;

const finishedProductsMap = {};
const loadedMfgSalesMap = {};
let mfgCustomersList = [];
let mfgAreasList = [];
let saleCartItemsArray = [];

function v(id){ return document.getElementById(id) ? document.getElementById(id).value : ''; }
function n(id){ return Number(v(id)) || 0; }
function escPrint(v){
    return String(v == null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadAreaOptions() {
    const bid = ManufacturerModule.businessId;
    if (!bid) return;
    try {
        const areaSuggestions = await ManufacturerModule.loadFieldSuggestions('mfg_area').catch(() => []);
        const areasSet = new Set();
        (areaSuggestions || []).forEach(a => { if (a && String(a).trim()) areasSet.add(String(a).trim()); });
        (mfgCustomersList || []).forEach(c => { if (c.area && String(c.area).trim()) areasSet.add(String(c.area).trim()); });
        Object.values(loadedMfgSalesMap).forEach(s => { if (s.area && String(s.area).trim() && s.area !== 'N/A') areasSet.add(String(s.area).trim()); });

        mfgAreasList = Array.from(areasSet).sort();

        // Populate Area Datalist for form input
        const areaDl = document.getElementById('mfgAreaDatalist');
        if (areaDl) {
            areaDl.innerHTML = mfgAreasList.map(a => `<option value="${escPrint(a)}"></option>`).join('');
        }

        // Populate Area Filter dropdown in Sales History
        const histFilterSel = document.getElementById('mfgHistoryAreaFilter');
        if (histFilterSel) {
            const currentSelected = histFilterSel.value || '';
            let filterHtml = '<option value="">All Areas (සියලු කලාප)</option>';
            mfgAreasList.forEach(a => {
                const sel = (a === currentSelected) ? 'selected' : '';
                filterHtml += `<option value="${escPrint(a)}" ${sel}>📍 ${escPrint(a)}</option>`;
            });
            histFilterSel.innerHTML = filterHtml;
        }
    } catch (e) {
        console.warn('[Sales] Error loading area options:', e);
    }
}

async function loadFinishedProductsOptions() {
    const bid = ManufacturerModule.businessId;
    if (!bid) return;
    try {
        const snap = await db.collection('manufacturer_finished_products')
            .where('businessId', '==', bid)
            .get()
            .catch(() => ({ docs: [] }));

        const sel = document.getElementById('mfgFgProductId');
        sel.innerHTML = '<option value="">Select Finished Product...</option>';
        Object.keys(finishedProductsMap).forEach(k => delete finishedProductsMap[k]);

        snap.docs.forEach(doc => {
            const data = doc.data() || {};
            if (data.isActive === false) return;
            const name = String(data.name || '').trim();
            const qty = Number(data.stockQty || 0);
            const unitCost = Number(data.unitCost || 0);
            const unitPrice = Number(data.unitPrice || (unitCost > 0 ? unitCost * 1.5 : 0));
            if (name) {
                finishedProductsMap[doc.id] = { id: doc.id, name, qty, unitCost, unitPrice };
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = `${name} (Available: ${qty} units @ Price: Rs. ${unitPrice.toFixed(2)})`;
                sel.appendChild(opt);
            }
        });
    } catch (e) {
        console.warn('[Sales] Error loading finished products options:', e);
    }
}

function handleProductSelectChange() {
    const pid = v('mfgFgProductId');
    if (pid && finishedProductsMap[pid]) {
        const item = finishedProductsMap[pid];
        if (item.unitPrice && (!n('mfgSellingUnitPrice') || n('mfgSellingUnitPrice') === 0)) {
            document.getElementById('mfgSellingUnitPrice').value = item.unitPrice.toFixed(2);
        }
        if (!n('mfgSoldQty') || n('mfgSoldQty') === 0) {
            document.getElementById('mfgSoldQty').value = 1;
        }
    }
    recalcProfitPreview();
}

window.handleProductSelectChange = handleProductSelectChange;

async function loadCustomerDatalist(filterArea = '') {
    const bid = ManufacturerModule.businessId;
    if (!bid) return;
    try {
        const snap = await db.collection('customers')
            .where('businessId', '==', bid)
            .get()
            .catch(() => ({ docs: [] }));

        mfgCustomersList = snap.docs.map(doc => {
            const d = doc.data() || {};
            return {
                id: doc.id,
                name: String(d.fullName || d.name || '').trim(),
                mobile: String(d.mobile || d.phone || '').trim(),
                area: String(d.area || d.region || d.city || '').trim()
            };
        }).filter(c => c.name);

        const dl = document.getElementById('customerDatalist');
        let html = '';
        const normFilterArea = String(filterArea || '').trim().toLowerCase();

        mfgCustomersList.forEach(c => {
            if (normFilterArea && c.area.toLowerCase() !== normFilterArea) {
                return; // Filter out customers not matching selected Area
            }
            const areaBadge = c.area ? ` [📍 ${c.area}]` : '';
            const phoneBadge = c.mobile ? ` (${c.mobile})` : '';
            html += `<option value="${escPrint(c.name)}">${escPrint(phoneBadge + areaBadge)}</option>`;
        });
        dl.innerHTML = html;

        await loadAreaOptions();
    } catch (e) {
        console.warn('[Sales] Customer datalist error:', e);
    }
}

function handleCustomerNameInput() {
    const cName = v('mfgCustomerName').trim().toLowerCase();
    if (!cName) return;

    const matched = mfgCustomersList.find(c => c.name.toLowerCase() === cName);
    if (matched) {
        if (matched.mobile && !v('mfgCustomerPhone')) {
            document.getElementById('mfgCustomerPhone').value = matched.mobile;
        }
        if (matched.area && !v('mfgCustomerArea')) {
            document.getElementById('mfgCustomerArea').value = matched.area;
            loadCustomerDatalist(matched.area);
        }
    }
}

function handleCustomerAreaChange() {
    const selectedArea = v('mfgCustomerArea').trim();
    loadCustomerDatalist(selectedArea);
}

function handlePaymentModeChange() {
    const mode = v('mfgPaymentMode');
    const dueGroup = document.getElementById('mfgDueDateGroup');
    const chequeGroup = document.getElementById('mfgChequeDateGroup');
    
    if (dueGroup) dueGroup.style.display = (mode === 'CREDIT') ? 'block' : 'none';
    if (chequeGroup) chequeGroup.style.display = (mode === 'CHEQUE') ? 'block' : 'none';
}

function addSaleCartItem() {
    const pid = v('mfgFgProductId');
    const soldQty = n('mfgSoldQty');
    let unitPrice = n('mfgSellingUnitPrice');
    const msgEl = document.getElementById('mfgSaleMsg');

    if (msgEl) {
        msgEl.className = 'mfg-msg';
        msgEl.style.display = 'block';
    }

    if (!pid || !finishedProductsMap[pid]) {
        if (msgEl) {
            msgEl.classList.add('err');
            msgEl.textContent = '❌ Please select a finished product from the dropdown first.';
        }
        return;
    }
    if (soldQty <= 0) {
        if (msgEl) {
            msgEl.classList.add('err');
            msgEl.textContent = '❌ Please enter a valid quantity (> 0).';
        }
        return;
    }

    const item = finishedProductsMap[pid];
    if (!unitPrice || unitPrice <= 0) {
        unitPrice = item.unitPrice || (item.unitCost * 1.5) || 0;
    }

    const unitCost = Number(item.unitCost || 0);
    const itemSubtotal = Number((soldQty * unitPrice).toFixed(4));
    const itemCogs = Number((soldQty * unitCost).toFixed(4));

    const isLowStock = (item.qty < soldQty);

    saleCartItemsArray.push({
        id: pid,
        name: item.name,
        qty: soldQty,
        unitPrice: unitPrice,
        unitCost: unitCost,
        subtotal: itemSubtotal,
        cogs: itemCogs,
        isLowStock
    });

    document.getElementById('mfgFgProductId').value = '';
    document.getElementById('mfgSoldQty').value = '';
    document.getElementById('mfgSellingUnitPrice').value = '';

    renderSaleCartTable();
    recalcProfitPreview();

    if (msgEl) {
        msgEl.style.background = '#f0fdf4';
        msgEl.style.color = '#166534';
        msgEl.style.border = '1px solid #bbf7d0';
        msgEl.style.padding = '8px 12px';
        msgEl.style.borderRadius = '6px';
        msgEl.style.marginTop = '10px';
        msgEl.innerHTML = `✅ Added <strong>${escPrint(item.name)}</strong> (${soldQty} units @ Rs. ${unitPrice.toFixed(2)}) to invoice cart!` + (isLowStock ? ` <span style="color:#d97706; font-weight:700; font-size:11px;">(⚠️ Stock Notice: Available stock is ${item.qty} units)</span>` : '');
    }
}

function removeSaleCartItem(index) {
    if (index >= 0 && index < saleCartItemsArray.length) {
        saleCartItemsArray.splice(index, 1);
        renderSaleCartTable();
        recalcProfitPreview();
    }
}

function renderSaleCartTable() {
    const tbody = document.getElementById('mfgSaleCartRows');
    if (!tbody) return;

    if (!saleCartItemsArray.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:12px; color:#94a3b8;">No items added yet. Select product above and click "+ Add Item".</td></tr>';
        return;
    }

    tbody.innerHTML = saleCartItemsArray.map((x, idx) => `
        <tr style="border-bottom:1px solid #e2e8f0;">
            <td style="padding:6px; font-weight:700; color:#0f172a;">${escPrint(x.name)}</td>
            <td style="padding:6px; text-align:right; font-weight:700; color:#0369a1;">${x.qty}</td>
            <td style="padding:6px; text-align:right;">Rs. ${x.unitPrice.toFixed(2)}</td>
            <td style="padding:6px; text-align:right; font-weight:800; color:#0f172a;">Rs. ${x.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
            <td style="padding:6px; text-align:center;">
                <button type="button" onclick="removeSaleCartItem(${idx})" style="background:#ef4444; color:#fff; border:none; padding:2px 6px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:11px;">❌</button>
            </td>
        </tr>
    `).join('');
}

window.addSaleCartItem = addSaleCartItem;
window.removeSaleCartItem = removeSaleCartItem;
window.renderSaleCartTable = renderSaleCartTable;

function recalcProfitPreview() {
    let combinedSubtotal = 0;
    let combinedCogs = 0;
    let totalItemTypes = 0;

    if (saleCartItemsArray.length > 0) {
        saleCartItemsArray.forEach(i => {
            combinedSubtotal += i.subtotal;
            combinedCogs += i.cogs;
        });
        totalItemTypes = saleCartItemsArray.length;
    } else {
        const pid = v('mfgFgProductId');
        const soldQty = n('mfgSoldQty');
        const unitPrice = n('mfgSellingUnitPrice');
        const item = finishedProductsMap[pid] || { unitCost: 0 };
        const unitCost = item.unitCost || 0;

        combinedSubtotal = soldQty * unitPrice;
        combinedCogs = soldQty * unitCost;
        if (soldQty > 0) totalItemTypes = 1;
    }

    const discountType = v('mfgDiscountType');
    const discountVal = n('mfgDiscountValue');
    let discountAmount = 0;

    if (discountType === 'PERCENT') {
        discountAmount = (combinedSubtotal * discountVal) / 100;
    } else if (discountType === 'FLAT') {
        discountAmount = discountVal;
    }
    if (discountAmount > combinedSubtotal) discountAmount = combinedSubtotal;

    const netSaleTotal = Math.max(0, combinedSubtotal - discountAmount);
    const profit = netSaleTotal - combinedCogs;

    document.getElementById('mfgAbsorbedUnitCostDisp').textContent = `${totalItemTypes} Item Type(s) in Cart`;
    document.getElementById('mfgCogsDisp').textContent = `Rs. ${combinedCogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('mfgSubtotalDisp').textContent = `Rs. ${combinedSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('mfgDiscountDisp').textContent = `- Rs. ${discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    document.getElementById('mfgSaleTotalDisp').textContent = `Rs. ${netSaleTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    
    const profitEl = document.getElementById('mfgProfitDisp');
    profitEl.textContent = `Rs. ${profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    profitEl.style.color = profit >= 0 ? '#059669' : '#dc2626';
}

async function updateSalesSummaryCards() {
    const bid = ManufacturerModule.businessId;
    if (!bid) return;
    try {
        const snap = await db.collection('manufacturer_sales')
            .where('businessId', '==', bid)
            .get()
            .catch(() => ({ docs: [] }));

        let totalRev = 0;
        let totalCogs = 0;
        let totalProfit = 0;

        snap.docs.forEach(doc => {
            const d = doc.data() || {};
            if (d.isActive === false) return;
            const amt = Number(d.amount || 0);
            const cogs = Number(d.cogsAmount || (Number(d.qty || 0) * Number(d.fgUnitCost || 0)));
            totalRev += amt;
            totalCogs += cogs;
            totalProfit += (amt - cogs);
        });

        document.getElementById('mfgTotalRevenueVal').textContent = `Rs. ${totalRev.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('mfgTotalCogsVal').textContent = `Rs. ${totalCogs.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        const profEl = document.getElementById('mfgTotalProfitVal');
        profEl.textContent = `Rs. ${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        profEl.style.color = totalProfit >= 0 ? '#34d399' : '#f87171';
    } catch (e) {
        console.warn('[Sales] Summary cards error:', e);
    }
}

async function saveMfgSale() {
    const bid = ManufacturerModule.businessId;
    const customerArea = v('mfgCustomerArea').trim();
    const customerName = v('mfgCustomerName').trim();
    const customerPhone = v('mfgCustomerPhone').trim();
    const paymentMode = v('mfgPaymentMode');
    const dueDate = v('mfgDueDate');
    const chequeDate = v('mfgChequeDate');

    const msgEl = document.getElementById('mfgSaleMsg');
    msgEl.className = 'mfg-msg';

    if (!customerName) {
        msgEl.classList.add('err');
        msgEl.textContent = 'Please enter customer / shop name.';
        return;
    }

    // Auto-add single item input to cart if cart is empty
    if (!saleCartItemsArray.length) {
        const pid = v('mfgFgProductId');
        const soldQty = n('mfgSoldQty');
        const unitPrice = n('mfgSellingUnitPrice');

        if (pid && finishedProductsMap[pid] && soldQty > 0 && unitPrice >= 0) {
            const item = finishedProductsMap[pid];
            if (item.qty < soldQty) {
                msgEl.classList.add('err');
                msgEl.textContent = `Insufficient finished goods stock! Available: ${item.qty} units, Required: ${soldQty}.`;
                return;
            }
            const unitCost = Number(item.unitCost || 0);
            saleCartItemsArray.push({
                id: pid,
                name: item.name,
                qty: soldQty,
                unitPrice: unitPrice,
                unitCost: unitCost,
                subtotal: Number((soldQty * unitPrice).toFixed(4)),
                cogs: Number((soldQty * unitCost).toFixed(4))
            });
        }
    }

    if (!saleCartItemsArray.length) {
        msgEl.classList.add('err');
        msgEl.textContent = 'Please select a finished product and click "+ Add Item to Invoice Cart" before completing sale.';
        return;
    }

    let combinedSubtotal = 0;
    let combinedCogs = 0;
    let totalQtySum = 0;
    const itemsPayload = [];

    saleCartItemsArray.forEach(i => {
        combinedSubtotal += i.subtotal;
        combinedCogs += i.cogs;
        totalQtySum += i.qty;
        itemsPayload.push({
            productId: i.id,
            productName: i.name,
            qty: i.qty,
            unitPrice: i.unitPrice,
            fgUnitCost: i.unitCost,
            subtotal: i.subtotal,
            cogsAmount: i.cogs
        });
    });

    const discountType = v('mfgDiscountType') || 'NONE';
    const discountValue = n('mfgDiscountValue');
    let discountAmount = 0;

    if (discountType === 'PERCENT') {
        discountAmount = Number(((combinedSubtotal * discountValue) / 100).toFixed(4));
    } else if (discountType === 'FLAT') {
        discountAmount = Number(discountValue.toFixed(4));
    }
    if (discountAmount > combinedSubtotal) discountAmount = combinedSubtotal;

    const totalAmount = Number((combinedSubtotal - discountAmount).toFixed(4));
    const grossProfit = Number((totalAmount - combinedCogs).toFixed(4));

    const mainProductName = saleCartItemsArray.length === 1 
        ? saleCartItemsArray[0].name 
        : `${saleCartItemsArray.length} items (${saleCartItemsArray.map(x => x.name).join(', ')})`;

    const btn = document.getElementById('saveMfgSaleBtn');
    btn.disabled = true;
    btn.textContent = 'Processing Sale...';

    try {
        const saleId = 'MSALE-' + Date.now();
        const salePayload = {
            saleId,
            businessId: bid,
            saleType: 'FINISHED_GOODS_SALE',
            area: customerArea || 'N/A',
            companyName: customerName,
            customerMobile: customerPhone,
            productName: mainProductName,
            items: itemsPayload,
            qty: totalQtySum,
            unitPrice: saleCartItemsArray.length === 1 ? saleCartItemsArray[0].unitPrice : 0,
            subtotal: combinedSubtotal,
            discountType,
            discountValue,
            discountAmount,
            fgUnitCost: 0,
            cogsAmount: combinedCogs,
            grossProfit,
            amount: totalAmount,
            paymentMode,
            paymentStatus: paymentMode === 'CREDIT' ? 'PENDING' : 'PAID',
            dueDate: paymentMode === 'CREDIT' ? (dueDate || null) : null,
            chequeClearanceDate: paymentMode === 'CHEQUE' ? (chequeDate || null) : null,
            createdAt: new Date(),
            flatAccountingSyncedV1: false
        };

        // 1. Save Area suggestion
        if (customerArea) {
            await ManufacturerModule.saveFieldSuggestion('mfg_area', customerArea).catch(() => {});
        }

        // 2. Save/Update Customer record
        if (customerName) {
            const custDocId = (bid + '__' + customerName).toLowerCase().replace(/[^a-z0-9_]/g, '_');
            await db.collection('customers').doc(custDocId).set({
                businessId: bid,
                fullName: customerName,
                mobile: customerPhone || '',
                area: customerArea || '',
                updatedAt: new Date()
            }, { merge: true }).catch(eCust => console.warn('[Sales] Customer save warn:', eCust));
        }

        // 3. Record sale document
        await db.collection('manufacturer_sales').doc(saleId).set(salePayload);

        // 3.5. Schedule 7-day revisit
        if (customerName) {
            const nextVisit = new Date();
            nextVisit.setDate(nextVisit.getDate() + 7);
            const routeDocId = (bid + '__' + customerName).toLowerCase().replace(/[^a-z0-9_]/g, '_');
            await db.collection('manufacturer_route_plans').doc(routeDocId).set({
                businessId: bid,
                customerName: customerName,
                customerPhone: customerPhone || '',
                area: customerArea || '',
                lastSaleDate: new Date(),
                nextVisitDate: nextVisit,
                lastProductName: mainProductName,
                lastQty: totalQtySum,
                lastAmount: totalAmount,
                visitStatus: 'SCHEDULED',
                updatedAt: new Date()
            }, { merge: true }).catch(eRoute => console.warn('[Sales] Route plan save warn:', eRoute));
        }

        // 4. Deduct sold stock for all items
        for (const item of saleCartItemsArray) {
            await db.collection('manufacturer_finished_products').doc(item.id).set({
                stockQty: firebase.firestore.FieldValue.increment(-Math.abs(item.qty)),
                updatedAt: new Date()
            }, { merge: true });
        }

        // 5. Mirror accounting
        try {
            await ManufacturerModule.syncFlatAccountingFinishedGoodSale(salePayload);
            await db.collection('manufacturer_sales').doc(saleId).update({ flatAccountingSyncedV1: true });
        } catch (eFlat) {
            console.warn('[Sales] Accounting sync warn:', eFlat);
        }

        loadedMfgSalesMap[saleId] = salePayload;

        msgEl.className = 'mfg-msg';
        msgEl.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                <span>✅ Sale completed! Sold ${totalQtySum} units (${itemsPayload.length} items) for Rs. ${totalAmount.toLocaleString()} (Area: ${escPrint(customerArea || 'N/A')}).</span>
                <div style="display:flex; gap:8px;">
                    <button type="button" onclick="printMfgSaleA5('${saleId}')" style="background:#0284c7; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px;">🖨️ Print A5 Bill</button>
                    <button type="button" onclick="sendMfgSaleWhatsApp('${saleId}')" style="background:#25D366; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-weight:bold; cursor:pointer; font-size:12px;">📲 WhatsApp</button>
                </div>
            </div>
        `;

        saleCartItemsArray = [];
        renderSaleCartTable();
        document.getElementById('mfgCustomerArea').value = '';
        document.getElementById('mfgCustomerName').value = '';
        document.getElementById('mfgCustomerPhone').value = '';
        document.getElementById('mfgSoldQty').value = '';
        document.getElementById('mfgSellingUnitPrice').value = '';

        await loadFinishedProductsOptions();
        await loadCustomerDatalist();
        await loadMfgSalesHistory();
        await updateSalesSummaryCards();
        recalcProfitPreview();
    } catch (err) {
        console.error('[Sales] Save error:', err);
        msgEl.classList.add('err');
        msgEl.textContent = 'Error processing sale: ' + err.message;
    } finally {
        btn.disabled = false;
        btn.textContent = '🛍️ Complete Sale & Issue Invoice';
    }
}

async function loadMfgSalesHistory() {
    const bid = ManufacturerModule.businessId;
    if (!bid) return;
    try {
        const snap = await db.collection('manufacturer_sales')
            .where('businessId', '==', bid)
            .limit(200)
            .get()
            .catch(() => ({ docs: [] }));

        Object.keys(loadedMfgSalesMap).forEach(k => delete loadedMfgSalesMap[k]);

        const selectedFilterArea = v('mfgHistoryAreaFilter').trim().toLowerCase();
        const fromDateVal = v('mfgHistoryFromDate');
        const toDateVal = v('mfgHistoryToDate');

        const fromMs = fromDateVal ? new Date(fromDateVal + 'T00:00:00').getTime() : null;
        const toMs = toDateVal ? new Date(toDateVal + 'T23:59:59').getTime() : null;

        const rows = snap.docs
            .map(d => {
                const data = { id: d.id, ...(d.data() || {}) };
                loadedMfgSalesMap[d.id] = data;
                if (data.saleId) loadedMfgSalesMap[data.saleId] = data;
                return data;
            })
            .filter(x => x.isActive !== false)
            .filter(x => {
                if (selectedFilterArea && String(x.area || '').trim().toLowerCase() !== selectedFilterArea) {
                    return false;
                }
                const t = x.createdAt?.toDate ? x.createdAt.toDate().getTime() : new Date(x.createdAt || 0).getTime();
                if (isNaN(t)) return false;
                if (fromMs != null && t < fromMs) return false;
                if (toMs != null && t > toMs) return false;
                return true;
            })
            .sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return tb - ta;
            });

        await loadAreaOptions();

        const tbody = document.getElementById('mfgSalesHistoryRows');
        tbody.innerHTML = rows.map(x => {
            const subtotal = Number(x.subtotal || (Number(x.qty || 0) * Number(x.unitPrice || 0)));
            const discountAmt = Number(x.discountAmount || 0);
            const amt = Number(x.amount || (subtotal - discountAmt));
            const cogs = Number(x.cogsAmount || (Number(x.qty || 0) * Number(x.fgUnitCost || 0)));
            const profit = amt - cogs;
            const areaDisp = x.area && x.area !== 'N/A' ? `<div style="font-size:11px; color:#0f766e; font-weight:600; margin-top:2px;">📍 ${escPrint(x.area)}</div>` : '';
            const discountDisp = discountAmt > 0 
                ? `<span style="color:#d97706; font-weight:700;">- Rs. ${discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>` 
                : '<span style="color:#94a3b8;">-</span>';

            const prodDisp = (x.items && x.items.length > 1)
                ? `<strong>${x.items.length} items:</strong> ${x.items.map(i => escPrint(i.productName) + ' (' + i.qty + ')').join(', ')}`
                : `${escPrint(x.productName || '-')} (${x.qty || 0} units)`;

            return `
                <tr>
                    <td>${ManufacturerModule.formatDate(x.createdAt)}</td>
                    <td>
                        <div style="font-weight:700; color:#1e293b;">${escPrint(x.companyName || '-')}</div>
                        ${areaDisp}
                    </td>
                    <td style="font-size:12px; max-width:200px;">${prodDisp}</td>
                    <td>Rs. ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td>${discountDisp}</td>
                    <td style="font-weight:800; color:#0284c7;">Rs. ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style="color:#ef4444;">Rs. ${cogs.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td style="font-weight:800; color:${profit >= 0 ? '#059669' : '#dc2626'};">Rs. ${profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td><span style="background:${x.paymentMode === 'CREDIT' ? '#fef2f2' : '#f0fdf4'}; color:${x.paymentMode === 'CREDIT' ? '#991b1b' : '#166534'}; padding:2px 8px; border-radius:12px; font-weight:700; font-size:11px;">${x.paymentMode || 'CASH'}</span></td>
                    <td>
                        <div style="display:flex; gap:4px;">
                            <button type="button" onclick="printMfgSaleA5('${x.id}')" title="Print A5 Invoice" style="background:#0284c7; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">🖨️</button>
                            <button type="button" onclick="sendMfgSaleWhatsApp('${x.id}')" title="Send WhatsApp Invoice" style="background:#25D366; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">📲</button>
                            <button type="button" onclick="deleteMfgSale('${x.id}')" title="Delete Sale" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-weight:bold; font-size:12px;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) {
        console.warn('[Sales] History load error:', e);
    }
}

function printMfgSaleA5(saleId) {
    const sale = loadedMfgSalesMap[saleId];
    if (!sale) { alert('Sale details not found!'); return; }

    const bizName = (ManufacturerModule.context && ManufacturerModule.context.businessName) || 'DIGIBIZ MANUFACTURER';
    document.getElementById('a5BizName').textContent = bizName;
    document.getElementById('a5SaleId').textContent = sale.saleId || sale.id || '-';
    document.getElementById('a5Date').textContent = ManufacturerModule.formatDate(sale.createdAt);
    document.getElementById('a5CustomerName').textContent = sale.companyName || '-';
    document.getElementById('a5CustomerArea').textContent = sale.area || 'N/A';
    document.getElementById('a5CustomerPhone').textContent = sale.customerMobile || '-';
    document.getElementById('a5PaymentMode').textContent = `${sale.paymentMode || '-'} (${sale.paymentStatus || '-'})`;

    const tableBody = document.getElementById('a5BillTableBody');
    if (tableBody) {
        if (sale.items && sale.items.length > 0) {
            tableBody.innerHTML = sale.items.map(item => `
                <tr>
                    <td style="padding:8px 10px; font-weight:700; border-bottom:1px solid #e2e8f0;">${escPrint(item.productName || '-')}</td>
                    <td style="padding:8px 10px; text-align:right; border-bottom:1px solid #e2e8f0;">${item.qty || 0}</td>
                    <td style="padding:8px 10px; text-align:right; border-bottom:1px solid #e2e8f0;">Rs. ${Number(item.unitPrice || 0).toFixed(2)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:800; border-bottom:1px solid #e2e8f0; color:#0284c7;">Rs. ${Number(item.subtotal || (item.qty * item.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            `).join('');
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td style="padding:8px 10px; font-weight:700; border-bottom:1px solid #e2e8f0;">${escPrint(sale.productName || '-')}</td>
                    <td style="padding:8px 10px; text-align:right; border-bottom:1px solid #e2e8f0;">${sale.qty || 0}</td>
                    <td style="padding:8px 10px; text-align:right; border-bottom:1px solid #e2e8f0;">Rs. ${Number(sale.unitPrice || 0).toFixed(2)}</td>
                    <td style="padding:8px 10px; text-align:right; font-weight:800; border-bottom:1px solid #e2e8f0; color:#0284c7;">Rs. ${Number(sale.subtotal || (sale.qty * sale.unitPrice)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
            `;
        }
    }
    
    const subtotal = Number(sale.subtotal || (Number(sale.qty || 0) * Number(sale.unitPrice || 0)));
    const discountAmt = Number(sale.discountAmount || 0);
    const amt = Number(sale.amount || (subtotal - discountAmt));
    document.getElementById('a5NetTotal').textContent = `Rs. ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const subRow = document.getElementById('a5SubtotalRow');
    const discRow = document.getElementById('a5DiscountRow');
    if (discountAmt > 0) {
        if (subRow) { subRow.style.display = 'block'; document.getElementById('a5SubtotalVal').textContent = `Rs. ${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
        if (discRow) { discRow.style.display = 'block'; document.getElementById('a5DiscountVal').textContent = `- Rs. ${discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; }
    } else {
        if (subRow) subRow.style.display = 'none';
        if (discRow) discRow.style.display = 'none';
    }

    const statusEl = document.getElementById('a5PaymentStatusLine');
    statusEl.textContent = `Status: ${sale.paymentStatus || 'PAID'}`;
    statusEl.style.color = (sale.paymentStatus === 'PAID') ? '#166534' : '#dc2626';

    const dueEl = document.getElementById('a5DueDateLine');
    if (sale.paymentMode === 'CREDIT' && sale.dueDate) {
        dueEl.style.display = 'block';
        dueEl.textContent = `Credit Due Date: ${sale.dueDate}`;
    } else if (sale.paymentMode === 'CHEQUE' && sale.chequeClearanceDate) {
        dueEl.style.display = 'block';
        dueEl.textContent = `Cheque Clearance Date: ${sale.chequeClearanceDate}`;
    } else {
        dueEl.style.display = 'none';
    }

    document.getElementById('a5ModalWaBtn').onclick = () => sendMfgSaleWhatsApp(saleId);

    const modal = document.getElementById('mfgA5BillModal');
    modal.style.display = 'flex';
}

function closeMfgA5Modal() {
    document.getElementById('mfgA5BillModal').style.display = 'none';
}

function sendMfgSaleWhatsApp(saleId) {
    const sale = loadedMfgSalesMap[saleId];
    if (!sale) {
        alert('Sale details not found!');
        return;
    }

    let phone = String(sale.customerMobile || '').trim();
    if (!phone) {
        phone = prompt('Enter customer WhatsApp mobile number (e.g. 0771234567):', '') || '';
    }

    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) {
        phone = '94' + phone.slice(1);
    }

    const bizName = (ManufacturerModule.context && ManufacturerModule.context.businessName) || 'DIGIBIZ MANUFACTURER';
    const dateStr = ManufacturerModule.formatDate(sale.createdAt);

    let msg = `🧾 *DIGIBIZ - FINISHED GOODS INVOICE*\n`;
    msg += `------------------------------------\n`;
    msg += `🏢 *Business:* ${bizName}\n`;
    msg += `📄 *Invoice No:* ${sale.saleId || sale.id}\n`;
    msg += `📅 *Date:* ${dateStr}\n`;
    msg += `👤 *Customer:* ${sale.companyName || '-'}\n`;
    msg += `📍 *Area:* ${sale.area || 'N/A'}\n`;
    msg += `------------------------------------\n`;
    if (sale.items && sale.items.length > 0) {
        sale.items.forEach(i => {
            msg += `📦 *${i.productName}*: ${i.qty} units @ Rs. ${Number(i.unitPrice).toFixed(2)} = Rs. ${Number(i.subtotal || (i.qty * i.unitPrice)).toFixed(2)}\n`;
        });
    } else {
        msg += `📦 *Product:* ${sale.productName || '-'}\n`;
        msg += `🔢 *Quantity:* ${sale.qty || 0} units\n`;
        msg += `💵 *Unit Price:* Rs. ${Number(sale.unitPrice || 0).toFixed(2)}\n`;
    }
    msg += `------------------------------------\n`;
    if (sale.discountAmount > 0) {
        msg += `🏷️ *Subtotal:* Rs. ${Number(sale.subtotal || 0).toFixed(2)}\n`;
        msg += `🎁 *Discount:* - Rs. ${Number(sale.discountAmount || 0).toFixed(2)}\n`;
    }
    msg += `💰 *Total Amount:* Rs. ${Number(sale.amount || 0).toFixed(2)}\n`;
    msg += `💳 *Payment Method:* ${sale.paymentMode || '-'} (${sale.paymentStatus || '-'})\n`;
    if (sale.dueDate) {
        msg += `📅 *Due Date:* ${sale.dueDate}\n`;
    } else if (sale.chequeClearanceDate) {
        msg += `📅 *Cheque Date:* ${sale.chequeClearanceDate}\n`;
    }
    msg += `------------------------------------\n`;
    msg += `Thank you for your business! 🙏`;

    const waUrl = phone 
        ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    window.open(waUrl, '_blank');
}

async function deleteMfgSale(id) {
    if (!confirm('Are you sure you want to delete this sale record? Finished goods stock will be restored to inventory.')) return;
    try {
        const docRef = db.collection('manufacturer_sales').doc(id);
        const snap = await docRef.get();
        if (snap.exists) {
            const data = snap.data() || {};
            const bid = data.businessId || ManufacturerModule.businessId;

            // STOCK REVERSAL: Restore sold finished goods stock back to inventory!
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    if (item.productId && item.qty > 0) {
                        await db.collection('manufacturer_finished_products').doc(item.productId).set({
                            stockQty: firebase.firestore.FieldValue.increment(Math.abs(item.qty)),
                            updatedAt: new Date()
                        }, { merge: true }).catch(eStk => console.warn('[Sales] Stock reversal err:', eStk));
                    }
                }
            } else if (data.productName && data.qty > 0) {
                const fgKey = String(data.productName).trim().toUpperCase();
                await db.collection('manufacturer_finished_products').doc(`${bid}_${fgKey}`).set({
                    stockQty: firebase.firestore.FieldValue.increment(Math.abs(data.qty)),
                    updatedAt: new Date()
                }, { merge: true }).catch(eStk => console.warn('[Sales] Stock reversal err:', eStk));
            }

            await docRef.update({
                isActive: false,
                deletedAt: new Date()
            });
        }
        await loadFinishedProductsOptions();
        await loadMfgSalesHistory();
        await updateSalesSummaryCards();
    } catch (e) {
        alert('Error deleting sale: ' + e.message);
    }
}

(async function(){
    await ManufacturerModule.init('sales');
    
    document.getElementById('mfgFgProductId').addEventListener('change', recalcProfitPreview);
    document.getElementById('mfgSoldQty').addEventListener('input', recalcProfitPreview);
    document.getElementById('mfgSellingUnitPrice').addEventListener('input', recalcProfitPreview);
    const dTypeEl = document.getElementById('mfgDiscountType');
    if (dTypeEl) dTypeEl.addEventListener('change', recalcProfitPreview);
    const dValEl = document.getElementById('mfgDiscountValue');
    if (dValEl) dValEl.addEventListener('input', recalcProfitPreview);
    document.getElementById('mfgPaymentMode').addEventListener('change', handlePaymentModeChange);
    document.getElementById('mfgCustomerArea').addEventListener('input', handleCustomerAreaChange);
    document.getElementById('mfgCustomerName').addEventListener('input', handleCustomerNameInput);
    document.getElementById('mfgHistoryAreaFilter').addEventListener('change', loadMfgSalesHistory);
    document.getElementById('saveMfgSaleBtn').onclick = saveMfgSale;

    window.deleteMfgSale = deleteMfgSale;
    window.printMfgSaleA5 = printMfgSaleA5;
    window.closeMfgA5Modal = closeMfgA5Modal;
    window.sendMfgSaleWhatsApp = sendMfgSaleWhatsApp;

    handlePaymentModeChange();
    await loadFinishedProductsOptions();
    await loadCustomerDatalist();
    await loadMfgSalesHistory();
    await updateSalesSummaryCards();
})();
