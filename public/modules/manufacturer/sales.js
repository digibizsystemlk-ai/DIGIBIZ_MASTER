const KDU_TEA_BUSINESS_ID = 'tea_4eab5f4098a473b9';

(function () {
    let bid = null;
    let customers = [];
    let products = [];
    let showroomCart = [];
    let shopCreditOutstanding = 0;

    function byId(id) { return document.getElementById(id); }
    function money(v) { return `Rs ${Number(v || 0).toFixed(2)}`; }
    function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
    function key(name) { return String(name || '').trim().toUpperCase(); }
    function toast(msg, cls = 'ok') {
        const el = byId('salesToast');
        el.className = `sales-toast show ${cls}`;
        el.textContent = msg;
        setTimeout(() => { el.className = 'sales-toast'; }, 2500);
    }
    function todayStr() {
        const d = new Date();
        return d.toISOString().slice(0, 10);
    }

    function switchTab(tab) {
        byId('shopPanel').style.display = tab === 'SHOP' ? 'block' : 'none';
        byId('showroomPanel').style.display = tab === 'SHOWROOM' ? 'block' : 'none';
        byId('tabShop').classList.toggle('active', tab === 'SHOP');
        byId('tabShowroom').classList.toggle('active', tab === 'SHOWROOM');
    }

    function renderCustomerOptions() {
        const q = String(byId('shopCustomerSearch').value || '').toLowerCase();
        const opts = customers
            .filter((c) => !q || String(c.fullName || '').toLowerCase().includes(q) || String(c.mobile || '').includes(q))
            .map((c) => `<option value="${c.id}">${c.fullName || c.id} ${c.mobile ? `- ${c.mobile}` : ''}</option>`)
            .join('');
        byId('shopCustomerId').innerHTML = `<option value="">Select shop...</option>${opts}`;
    }

    async function renderCustomerDetails() {
        const cid = byId('shopCustomerId').value;
        const c = customers.find((x) => x.id === cid) || {};
        byId('shopName').value = c.fullName || '';
        byId('shopContact').value = c.mobile || '';
        byId('shopAddress').value = c.address || '';
        byId('shopCreditLimit').value = Number(c.creditLimit || 0).toFixed(2);
        const snap = await db.collection('manufacturer_sales')
            .where('businessId', '==', bid)
            .where('customerId', '==', cid)
            .where('paymentStatus', 'in', ['PENDING', 'PENDING_CLEARANCE'])
            .get()
            .catch(() => ({ docs: [] }));
        shopCreditOutstanding = snap.docs.reduce((s, d) => s + num((d.data() || {}).creditAmount || (d.data() || {}).amount), 0);
        byId('shopOutstanding').value = shopCreditOutstanding.toFixed(2);
    }

    function renderProductOptions() {
        const opts = products
            .map((p) => `<option value="${p.id}">${p.name} | Stock ${num(p.stockQty)} | Unit ${money(p.unitPrice || 0)}</option>`)
            .join('');
        byId('shopProductId').innerHTML = `<option value="">Select product...</option>${opts}`;
    }

    function onShopProductSelect() {
        const pid = byId('shopProductId').value;
        const p = products.find((x) => x.id === pid) || {};
        byId('shopUnitPrice').value = num(p.unitPrice).toFixed(2);
        byId('shopStockView').value = num(p.stockQty).toFixed(2);
        recalcShopTotals();
    }

    function recalcShopTotals() {
        const qty = num(byId('shopQty').value);
        const unit = num(byId('shopUnitPrice').value);
        const subtotal = qty * unit;
        const discount = num(byId('shopDiscount').value);
        const taxPct = num(byId('shopTaxPct').value);
        const taxable = Math.max(0, subtotal - discount);
        const tax = taxable * (taxPct / 100);
        const total = taxable + tax;
        byId('shopSubtotal').value = subtotal.toFixed(2);
        byId('shopTax').value = tax.toFixed(2);
        byId('shopTotal').value = total.toFixed(2);
        const payType = byId('shopPaymentTerms').value;
        const paid = payType === 'CREDIT' ? 0 : (payType === 'PARTIAL' ? Math.min(num(byId('shopPaidNow').value), total) : total);
        const credit = total - paid;
        byId('shopCreditAmount').value = credit.toFixed(2);
        const limit = num(byId('shopCreditLimit').value);
        const warn = byId('creditLimitWarn');
        if (credit > 0 && (shopCreditOutstanding + credit) > limit && limit > 0) {
            warn.style.display = 'block';
            warn.textContent = `Credit limit exceeded by ${money((shopCreditOutstanding + credit) - limit)}`;
        } else {
            warn.style.display = 'none';
            warn.textContent = '';
        }
    }

    function addShowroomItem() {
        const pid = byId('showroomProductId').value;
        const p = products.find((x) => x.id === pid);
        if (!p) return;
        const existing = showroomCart.find((x) => x.id === pid);
        if (existing) existing.qty += 1;
        else showroomCart.push({ id: pid, name: p.name, stockQty: num(p.stockQty), qty: 1, unitPrice: num(p.unitPrice || 0), imageUrl: p.imageUrl || '', unitCost: num(p.unitCost || 0) });
        renderShowroomCart();
    }

    function renderShowroomProducts() {
        const q = String(byId('showroomSearch').value || '').toLowerCase();
        const rows = products
            .filter((p) => !q || String(p.name || '').toLowerCase().includes(q))
            .map((p) => `
                <div class="prod-card">
                    <div class="img">${p.imageUrl ? `<img src="${p.imageUrl}" alt="">` : 'No Image'}</div>
                    <div class="nm">${p.name}</div>
                    <div class="st">Stock: ${num(p.stockQty)}</div>
                    <div class="pr">${money(p.unitPrice)}</div>
                    <button data-id="${p.id}" class="btn-add-prod">Add</button>
                </div>
            `).join('');
        byId('showroomGrid').innerHTML = rows || '<div class="empty">No products</div>';
        document.querySelectorAll('.btn-add-prod').forEach((b) => b.onclick = () => {
            byId('showroomProductId').value = b.getAttribute('data-id');
            addShowroomItem();
        });
    }

    function renderShowroomCart() {
        const rows = showroomCart.map((l, idx) => `
            <tr>
                <td>${l.name}</td>
                <td><input type="number" min="0.01" step="0.01" value="${l.qty}" data-i="${idx}" class="c-qty"></td>
                <td><input type="number" min="0" step="0.01" value="${l.unitPrice}" data-i="${idx}" class="c-up"></td>
                <td class="tr">${money(l.qty * l.unitPrice)}</td>
                <td><button data-i="${idx}" class="c-del">Remove</button></td>
            </tr>
        `).join('');
        byId('showroomCartRows').innerHTML = rows || '<tr><td colspan="5" class="empty">Cart is empty</td></tr>';
        document.querySelectorAll('.c-qty').forEach((el) => el.oninput = (e) => { showroomCart[Number(e.target.dataset.i)].qty = num(e.target.value); recalcShowroom(); renderShowroomCart(); });
        document.querySelectorAll('.c-up').forEach((el) => el.oninput = (e) => { showroomCart[Number(e.target.dataset.i)].unitPrice = num(e.target.value); recalcShowroom(); renderShowroomCart(); });
        document.querySelectorAll('.c-del').forEach((el) => el.onclick = (e) => { showroomCart.splice(Number(e.target.dataset.i), 1); recalcShowroom(); renderShowroomCart(); });
        recalcShowroom();
    }

    function recalcShowroom() {
        const subtotal = showroomCart.reduce((s, l) => s + (num(l.qty) * num(l.unitPrice)), 0);
        const discount = num(byId('showroomDiscount').value);
        const taxPct = num(byId('showroomTaxPct').value);
        const taxable = Math.max(0, subtotal - discount);
        const tax = taxable * (taxPct / 100);
        const total = taxable + tax;
        const paid = num(byId('showroomPaid').value || total);
        byId('showroomSubtotal').value = subtotal.toFixed(2);
        byId('showroomTax').value = tax.toFixed(2);
        byId('showroomTotal').value = total.toFixed(2);
        byId('showroomChange').value = (paid - total).toFixed(2);
    }

    async function reduceStock(productName, qty, unitPrice) {
        const fgKey = key(productName);
        await db.collection('manufacturer_finished_products').doc(`${bid}_${fgKey}`).set({
            businessId: bid,
            name: productName,
            stockQty: firebase.firestore.FieldValue.increment(-Math.abs(qty)),
            unitPrice: num(unitPrice),
            updatedAt: new Date()
        }, { merge: true });
    }

    function printDoc(title, payload, lines) {
        const w = window.open('', '_blank', 'width=900,height=700');
        if (!w) return;
        const bodyRows = lines.map((l) => `<tr><td>${l.name}</td><td style="text-align:right">${l.qty}</td><td style="text-align:right">${money(l.unitPrice)}</td><td style="text-align:right">${money(l.qty * l.unitPrice)}</td></tr>`).join('');
        w.document.write(`
            <html><head><title>${title}</title><style>body{font-family:Arial;padding:20px;} table{width:100%;border-collapse:collapse;margin-top:12px;} th,td{border:1px solid #ddd;padding:8px;} .tr{text-align:right;}</style></head>
            <body>
                <h2>KDU Tea Factory - ${title}</h2>
                <p>No: ${payload.saleId}<br>Date: ${new Date().toLocaleString()}<br>Customer: ${payload.companyName || 'Walk-in Customer'}</p>
                <table><thead><tr><th>Item</th><th class="tr">Qty</th><th class="tr">Unit Price</th><th class="tr">Amount</th></tr></thead><tbody>${bodyRows}</tbody></table>
                <h3 style="text-align:right">Total ${money(payload.amount)}</h3>
            </body></html>
        `);
        w.document.close();
        w.focus();
        w.print();
    }

    async function saveShopSale() {
        const cid = byId('shopCustomerId').value;
        const pid = byId('shopProductId').value;
        if (!cid || !pid) { toast('Select customer and product', 'err'); return; }
        const product = products.find((x) => x.id === pid);
        if (!product) { toast('Invalid product', 'err'); return; }
        const qty = num(byId('shopQty').value);
        if (qty <= 0) { toast('Qty required', 'err'); return; }
        if (qty > num(product.stockQty)) { toast('Insufficient stock', 'err'); return; }
        const total = num(byId('shopTotal').value);
        const paid = Math.max(0, Math.min(total, byId('shopPaymentTerms').value === 'PARTIAL' ? num(byId('shopPaidNow').value) : (byId('shopPaymentTerms').value === 'CREDIT' ? 0 : total)));
        const credit = total - paid;
        const saleId = `KDU-SHOP-${Date.now()}`;
        const c = customers.find((x) => x.id === cid) || {};
        const unitCost = num(product.unitCost);
        const payload = {
            businessId: bid,
            saleId,
            saleType: 'SHOP',
            companyName: c.fullName || '',
            customerId: cid,
            customerMobile: c.mobile || '',
            customerAddress: c.address || '',
            productName: product.name,
            qty,
            unitPrice: num(byId('shopUnitPrice').value),
            subtotal: num(byId('shopSubtotal').value),
            discount: num(byId('shopDiscount').value),
            taxPct: num(byId('shopTaxPct').value),
            taxAmount: num(byId('shopTax').value),
            amount: total,
            paymentTerms: byId('shopPaymentTerms').value,
            paymentMode: credit > 0 && paid > 0 ? 'PARTIAL' : (credit > 0 ? 'CREDIT' : 'CASH'),
            paymentStatus: credit > 0 ? 'PENDING' : 'PAID',
            paidAmount: paid,
            creditAmount: credit,
            deliveryDate: byId('shopDeliveryDate').value || null,
            deliveryAddress: byId('shopDeliveryAddress').value || c.address || '',
            fgUnitCost: unitCost,
            cogsAmount: Number((qty * unitCost).toFixed(4)),
            createdAt: new Date()
        };
        await db.collection('manufacturer_sales').doc(saleId).set(payload);
        await reduceStock(payload.productName, qty, payload.unitPrice);
        ManufacturerModule.publishEvent('MANUFACTURING_FINISHED_GOOD_SALE', payload);
        printDoc('Invoice', payload, [{ name: payload.productName, qty: payload.qty, unitPrice: payload.unitPrice }]);
        toast('Shop sale saved');
    }

    async function saveShowroomSale() {
        if (!showroomCart.length) { toast('Cart is empty', 'err'); return; }
        for (const line of showroomCart) {
            if (line.qty <= 0 || line.qty > num(line.stockQty)) {
                toast(`Stock issue: ${line.name}`, 'err');
                return;
            }
        }
        const subtotal = num(byId('showroomSubtotal').value);
        const total = num(byId('showroomTotal').value);
        const paid = num(byId('showroomPaid').value || total);
        if (paid < total) { toast('Paid amount is less than total', 'err'); return; }
        const saleId = `KDU-SHOW-${Date.now()}`;
        const cogsAmount = showroomCart.reduce((s, l) => s + (num(l.qty) * num(l.unitCost || 0)), 0);
        const payload = {
            businessId: bid,
            saleId,
            saleType: 'SHOWROOM',
            companyName: byId('walkInName').value.trim() || 'Walk-in Customer',
            customerMobile: byId('walkInPhone').value.trim(),
            productName: showroomCart.map((l) => l.name).join(', '),
            qty: showroomCart.reduce((s, l) => s + num(l.qty), 0),
            unitPrice: subtotal > 0 ? Number((subtotal / Math.max(1, showroomCart.reduce((s, l) => s + num(l.qty), 0))).toFixed(2)) : 0,
            subtotal,
            discount: num(byId('showroomDiscount').value),
            taxPct: num(byId('showroomTaxPct').value),
            taxAmount: num(byId('showroomTax').value),
            amount: total,
            paymentTerms: 'CASH',
            paymentMode: byId('showroomPayMode').value === 'CARD' ? 'BANK' : 'CASH',
            paymentStatus: 'PAID',
            paidAmount: paid,
            creditAmount: 0,
            fgUnitCost: 0,
            cogsAmount: Number(cogsAmount.toFixed(4)),
            lines: showroomCart.map((l) => ({ name: l.name, qty: num(l.qty), unitPrice: num(l.unitPrice), unitCost: num(l.unitCost || 0) })),
            createdAt: new Date()
        };
        await db.collection('manufacturer_sales').doc(saleId).set(payload);
        for (const l of showroomCart) {
            await reduceStock(l.name, l.qty, l.unitPrice);
        }
        ManufacturerModule.publishEvent('MANUFACTURING_FINISHED_GOOD_SALE', payload);
        printDoc('Receipt', payload, showroomCart);
        showroomCart = [];
        renderShowroomCart();
        toast('Showroom sale saved');
    }

    async function loadMasterData() {
        const [cs, ps] = await Promise.all([
            db.collection('customers').where('businessId', '==', bid).limit(500).get().catch(() => ({ docs: [] })),
            db.collection('manufacturer_finished_products').where('businessId', '==', bid).limit(500).get().catch(() => ({ docs: [] }))
        ]);
        customers = cs.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        products = ps.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        renderCustomerOptions();
        renderProductOptions();
        renderShowroomProducts();
    }

    async function init() {
        await ManufacturerModule.init('sales');
        bid = ManufacturerModule.businessId;
        if (bid !== KDU_TEA_BUSINESS_ID) {
            window.location.href = '/modules/manufacturer/outbound.html';
            return;
        }
        byId('shopDeliveryDate').value = todayStr();
        byId('tabShop').onclick = () => switchTab('SHOP');
        byId('tabShowroom').onclick = () => switchTab('SHOWROOM');
        byId('shopCustomerSearch').oninput = renderCustomerOptions;
        byId('shopCustomerId').onchange = renderCustomerDetails;
        byId('shopProductId').onchange = onShopProductSelect;
        ['shopQty', 'shopUnitPrice', 'shopDiscount', 'shopTaxPct', 'shopPaymentTerms', 'shopPaidNow'].forEach((id) => byId(id).oninput = recalcShopTotals);
        byId('btnConfirmShopSale').onclick = async () => {
            if (!confirm('Confirm shop sale and generate invoice?')) return;
            await saveShopSale();
            await loadMasterData();
        };
        byId('showroomSearch').oninput = renderShowroomProducts;
        byId('showroomProductId').onchange = addShowroomItem;
        ['showroomDiscount', 'showroomTaxPct', 'showroomPaid'].forEach((id) => byId(id).oninput = recalcShowroom);
        byId('btnConfirmShowroomSale').onclick = async () => {
            if (!confirm('Confirm showroom sale and print receipt?')) return;
            await saveShowroomSale();
            await loadMasterData();
        };
        await loadMasterData();
        switchTab('SHOP');
        recalcShopTotals();
        recalcShowroom();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
