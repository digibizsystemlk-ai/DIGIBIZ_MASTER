const KDU_TEA_BUSINESS_ID = '0Uled5estVeQVN8cChmMTNRDNIE3';
const KUBUKA_NAME = 'KUBUKA TEA FACTORY';

(function () {
    setInterval(function() {
        document.querySelectorAll('input#shopName').forEach((el,i)=>i>0&&el.remove());
        document.querySelectorAll('datalist#shopNameSuggestions').forEach((el,i)=>i>0&&el.remove());
    }, 200);

    document.getElementById('shopName')?.setAttribute('required','required');

    let bid = null;
    let customers = [];
    let products = [];
    let showroomCart = [];
    let shopCreditOutstanding = 0;
    let savedShopProfiles = {};
    let editingSaleId = '';
    const SHOP_PROFILE_KEY = `kdu_shop_profiles_${KDU_TEA_BUSINESS_ID}`;

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

    function normalizeShopName(v) {
        return String(v || '').trim().toLowerCase();
    }

    function loadSavedShopProfiles() {
        try {
            const raw = localStorage.getItem(SHOP_PROFILE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            savedShopProfiles = parsed && typeof parsed === 'object' ? parsed : {};
        } catch (e) {
            savedShopProfiles = {};
        }
    }

    function persistShopProfiles() {
        try {
            localStorage.setItem(SHOP_PROFILE_KEY, JSON.stringify(savedShopProfiles));
        } catch (e) {
            // ignore localStorage quota errors
        }
    }

    function getShopProfileByName(name) {
        return savedShopProfiles[normalizeShopName(name)] || null;
    }

    function saveShopProfile(profile) {
        const name = String(profile?.name || '').trim();
        if (!name) return;
        savedShopProfiles[normalizeShopName(name)] = {
            name,
            contact: String(profile?.contact || '').trim(),
            address: String(profile?.address || '').trim(),
            creditLimit: num(profile?.creditLimit || 0)
        };
        persistShopProfiles();
    }

    function renderShopNameSuggestions() {
        const names = new Map();
        customers.forEach((c) => {
            const n = String(c.fullName || '').trim();
            if (!n) return;
            names.set(normalizeShopName(n), n);
        });
        Object.values(savedShopProfiles).forEach((p) => {
            const n = String(p?.name || '').trim();
            if (!n) return;
            names.set(normalizeShopName(n), n);
        });
        byId('shopNameSuggestions').innerHTML = Array.from(names.values())
            .sort((a, b) => a.localeCompare(b))
            .map((n) => `<option value="${n}"></option>`)
            .join('');
    }

    async function applyShopProfileByName(name) {
        const typed = String(name || '').trim();
        if (!typed) return;
        const customer = customers.find((c) => normalizeShopName(c.fullName) === normalizeShopName(typed));
        if (customer) {
            const shopCustomerSel = byId('shopCustomerId');
            if (shopCustomerSel) {
                shopCustomerSel.value = customer.id;
                await renderCustomerDetails();
            } else {
                byId('shopName').value = customer.fullName || typed;
                byId('shopContact').value = customer.mobile || '';
                byId('shopAddress').value = customer.address || '';
                byId('shopCreditLimit').value = Number(customer.creditLimit || 0).toFixed(2);
                byId('shopOutstanding').value = '0.00';
                shopCreditOutstanding = 0;
                recalcShopTotals();
            }
            return;
        }
        const saved = getShopProfileByName(typed);
        byId('shopName').value = typed;
        byId('shopContact').value = saved?.contact || '';
        byId('shopAddress').value = saved?.address || '';
        byId('shopCreditLimit').value = num(saved?.creditLimit || 0).toFixed(2);
        byId('shopOutstanding').value = '0.00';
        shopCreditOutstanding = 0;
        const shopCustomerSel = byId('shopCustomerId');
        if (shopCustomerSel) shopCustomerSel.value = '';
        recalcShopTotals();
    }

    function captureShopProfileFromInputs() {
        saveShopProfile({
            name: byId('shopName').value,
            contact: byId('shopContact').value,
            address: byId('shopAddress').value,
            creditLimit: byId('shopCreditLimit').value
        });
        renderShopNameSuggestions();
    }

    function switchTab(tab) {
        byId('shopPanel').style.display = tab === 'SHOP' ? 'block' : 'none';
        byId('showroomPanel').style.display = tab === 'SHOWROOM' ? 'block' : 'none';
        byId('tabShop').classList.toggle('active', tab === 'SHOP');
        byId('tabShowroom').classList.toggle('active', tab === 'SHOWROOM');
    }

    function renderCustomerOptions() {
        const shopCustomerSel = byId('shopCustomerId');
        const shopCustomerSearch = byId('shopCustomerSearch');
        if (!shopCustomerSel || !shopCustomerSearch) return;
        const q = String(shopCustomerSearch.value || '').toLowerCase();
        const opts = customers
            .filter((c) => !q || String(c.fullName || '').toLowerCase().includes(q) || String(c.mobile || '').includes(q))
            .map((c) => `<option value="${c.id}">${c.fullName || c.id} ${c.mobile ? `- ${c.mobile}` : ''}</option>`)
            .join('');
        shopCustomerSel.innerHTML = `<option value="">Select shop...</option>${opts}`;
    }

    async function renderCustomerDetails() {
        const shopCustomerSel = byId('shopCustomerId');
        if (!shopCustomerSel) return;
        const cid = shopCustomerSel.value;
        const c = customers.find((x) => x.id === cid) || {};
        byId('shopName').value = c.fullName || '';
        byId('shopContact').value = c.mobile || '';
        byId('shopAddress').value = c.address || '';
        byId('shopCreditLimit').value = Number(c.creditLimit || 0).toFixed(2);
        if (c.fullName) {
            saveShopProfile({
                name: c.fullName,
                contact: c.mobile || '',
                address: c.address || '',
                creditLimit: c.creditLimit || 0
            });
            renderShopNameSuggestions();
        }
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
        const w = window.open('', '_blank', 'width=420,height=720');
        if (!w) return;
        const bodyRows = lines.map((l) => `<tr><td>${l.name}</td><td style="text-align:right">${l.qty}</td><td style="text-align:right">${money(l.unitPrice)}</td><td style="text-align:right">${money(l.qty * l.unitPrice)}</td></tr>`).join('');
        w.document.write(`
            <html><head><title>${title}</title><style>
            @page{size:80mm auto;margin:2mm;}
            body{font-family:Arial,sans-serif;width:76mm;margin:0 auto;padding:2mm;color:#111;}
            h2{font-size:14px;margin:0 0 4px;text-align:center;}
            p{font-size:11px;line-height:1.4;margin:0 0 6px;}
            table{width:100%;border-collapse:collapse;margin-top:6px;font-size:11px;}
            th,td{border:1px solid #ddd;padding:4px;}
            .tr{text-align:right;}
            h3{font-size:13px;text-align:right;margin:8px 0 0;}
            </style></head>
            <body>
                <h2>${KUBUKA_NAME} - ${title}</h2>
                <p>No: ${payload.saleId}<br>Date: ${new Date().toLocaleString()}<br>Customer: ${payload.companyName || 'Walk-in Customer'}</p>
                <table><thead><tr><th>Item</th><th class="tr">Qty</th><th class="tr">Unit Price</th><th class="tr">Amount</th></tr></thead><tbody>${bodyRows}</tbody></table>
                <h3 style="text-align:right">Total ${money(payload.amount)}</h3>
            </body></html>
        `);
        w.document.close();
        w.focus();
        w.print();
    }
    async function saveInvoiceDoc(invoice){
        const id = invoice.invoiceNo || (`INV-${Date.now()}`);
        await db.collection('invoices').doc(id).set({
            ...invoice,
            businessId: bid,
            printHistory: [{ printedAt: new Date(), channel: 'browser-print' }],
            createdAt: new Date(),
            isActive: true
        }, { merge: true });
        return id;
    }
    async function createAndPrintSalesInvoice(payload, lines){
        const invoice = {
            invoiceNo: `SINV-${Date.now()}`,
            invoiceType: 'SALES_INVOICE',
            referenceId: payload.saleId,
            saleType: payload.saleType || 'SALE',
            customerName: payload.companyName || 'Walk-in Customer',
            paymentMethod: payload.paymentMode || '',
            totalAmount: Number(payload.amount || 0),
            date: new Date().toISOString().slice(0, 10),
            items: (lines || []).map((l) => ({
                name: l.name || '',
                qty: Number(l.qty || 0),
                unitPrice: Number(l.unitPrice || 0),
                lineTotal: Number((Number(l.qty || 0) * Number(l.unitPrice || 0)).toFixed(2))
            }))
        };
        await saveInvoiceDoc(invoice);
        printDoc('Invoice', payload, lines || []);
    }

    async function loadSalesHistory() {
        const body = byId('salesHistoryRows');
        if (!body || !bid) return;
        const snap = await db.collection('manufacturer_sales')
            .where('businessId', '==', bid)
            .limit(300)
            .get()
            .catch(() => ({ docs: [] }));
        const rows = snap.docs
            .map((d) => ({ id: d.id, ...(d.data() || {}) }))
            .filter((x) => x.isActive !== false)
            .sort((a, b) => {
                const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || 0).getTime();
                const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || 0).getTime();
                return tb - ta;
            })
            .slice(0, 80);
        body.innerHTML = rows.length ? rows.map((x) => {
            const dt = x.createdAt?.toDate ? x.createdAt.toDate().toLocaleDateString() : '-';
            return `<tr>
                <td>${dt}</td>
                <td>${x.saleType || '-'}</td>
                <td>${x.companyName || '-'}</td>
                <td>${x.productName || '-'}</td>
                <td>${money(x.amount || 0)}</td>
                <td>${x.paymentMode || '-'} / ${x.paymentStatus || '-'}</td>
                <td><button type="button" onclick="window.__openEditSale('${x.id}')">✏️</button> <button type="button" onclick="window.__deleteSale('${x.id}')">🗑️</button></td>
            </tr>`;
        }).join('') : '<tr><td colspan="7" class="empty">No sales history</td></tr>';
    }

    async function openEditSale(id) {
        const doc = await db.collection('manufacturer_sales').doc(id).get().catch(() => null);
        const x = doc && doc.exists ? (doc.data() || {}) : null;
        if (!x) return;
        editingSaleId = id;
        byId('editSaleCustomer').value = x.companyName || '';
        byId('editSaleProduct').value = x.productName || '';
        byId('editSaleAmount').value = num(x.amount);
        byId('editSaleQty').value = num(x.qty);
        byId('editSaleUnitPrice').value = num(x.unitPrice);
        byId('editSalePaymentMode').value = x.paymentMode || '';
        byId('editSalePaymentStatus').value = x.paymentStatus || '';
        byId('editSaleDueDate').value = x.dueDate || '';
        byId('editSaleChequeDate').value = x.chequeClearanceDate || '';
        byId('salesEditModal').style.display = 'flex';
    }

    function closeEditSale() {
        editingSaleId = '';
        byId('salesEditModal').style.display = 'none';
    }

    async function saveEditSale() {
        if (!editingSaleId) return;
        await db.collection('manufacturer_sales').doc(editingSaleId).update({
            companyName: String(byId('editSaleCustomer').value || '').trim(),
            productName: String(byId('editSaleProduct').value || '').trim(),
            amount: num(byId('editSaleAmount').value),
            qty: num(byId('editSaleQty').value),
            unitPrice: num(byId('editSaleUnitPrice').value),
            paymentMode: String(byId('editSalePaymentMode').value || '').toUpperCase(),
            paymentStatus: String(byId('editSalePaymentStatus').value || '').toUpperCase(),
            dueDate: byId('editSaleDueDate').value || null,
            chequeClearanceDate: byId('editSaleChequeDate').value || null,
            updatedAt: new Date()
        });
        closeEditSale();
        await loadSalesHistory();
    }

    async function deleteSale(id) {
        if (!confirm('Are you sure you want to delete this sale?')) return;
        await db.collection('manufacturer_sales').doc(id).update({
            isActive: false,
            deletedAt: new Date()
        });
        await loadSalesHistory();
    }

    async function saveShopSale() {
        const shopCustomerSel = byId('shopCustomerId');
        const cid = shopCustomerSel ? shopCustomerSel.value : '';
        const pid = byId('shopProductId').value;
        const shopName = String(byId('shopName').value || '').trim();
        if (!shopName || !pid) { toast('Shop name and product are required', 'err'); return; }
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
        const contact = String(byId('shopContact').value || c.mobile || '').trim();
        const address = String(byId('shopAddress').value || c.address || '').trim();
        const unitCost = num(product.unitCost);
        const payload = {
            businessId: bid,
            saleId,
            saleType: 'SHOP',
            companyName: shopName,
            customerId: cid || null,
            customerMobile: contact,
            customerAddress: address,
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
            deliveryAddress: byId('shopDeliveryAddress').value || address || '',
            fgUnitCost: unitCost,
            cogsAmount: Number((qty * unitCost).toFixed(4)),
            createdAt: new Date(),
            flatAccountingSyncedV1: false
        };
        saveShopProfile({
            name: shopName,
            contact,
            address,
            creditLimit: byId('shopCreditLimit').value
        });
        renderShopNameSuggestions();
        await db.collection('manufacturer_sales').doc(saleId).set(payload);
        await reduceStock(payload.productName, qty, payload.unitPrice);
        ManufacturerModule.publishEvent('MANUFACTURING_FINISHED_GOOD_SALE', payload);
        try {
            await ManufacturerModule.syncFlatAccountingFinishedGoodSale(payload);
            await db.collection('manufacturer_sales').doc(saleId).update({ flatAccountingSyncedV1: true });
        } catch (eFlat) {
            console.warn('[Sales shop] Flat accounting mirror failed', eFlat);
        }
        await createAndPrintSalesInvoice(payload, [{ name: payload.productName, qty: payload.qty, unitPrice: payload.unitPrice }]);
        toast('Shop sale saved');
        await loadSalesHistory();
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
            createdAt: new Date(),
            flatAccountingSyncedV1: false
        };
        await db.collection('manufacturer_sales').doc(saleId).set(payload);
        for (const l of showroomCart) {
            await reduceStock(l.name, l.qty, l.unitPrice);
        }
        ManufacturerModule.publishEvent('MANUFACTURING_FINISHED_GOOD_SALE', payload);
        try {
            await ManufacturerModule.syncFlatAccountingFinishedGoodSale(payload);
            await db.collection('manufacturer_sales').doc(saleId).update({ flatAccountingSyncedV1: true });
        } catch (eFlat) {
            console.warn('[Sales showroom] Flat accounting mirror failed', eFlat);
        }
        await createAndPrintSalesInvoice(payload, showroomCart);
        showroomCart = [];
        renderShowroomCart();
        toast('Showroom sale saved');
        await loadSalesHistory();
    }

    async function loadMasterData() {
        const [cs, ps] = await Promise.all([
            db.collection('customers').where('businessId', '==', bid).limit(500).get().catch(() => ({ docs: [] })),
            db.collection('manufacturer_finished_products').where('businessId', '==', bid).limit(500).get().catch(() => ({ docs: [] }))
        ]);
        customers = cs.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        products = ps.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        customers.forEach((c) => {
            if (!c.fullName) return;
            saveShopProfile({
                name: c.fullName,
                contact: c.mobile || '',
                address: c.address || '',
                creditLimit: c.creditLimit || 0
            });
        });
        renderCustomerOptions();
        renderShopNameSuggestions();
        renderProductOptions();
        renderShowroomProducts();
    }

    async function init() {
        await ManufacturerModule.init('sales');
        bid = ManufacturerModule.businessId;
        // KDU sales page remains standalone; do not redirect away.
        loadSavedShopProfiles();
        byId('shopDeliveryDate').value = todayStr();
        byId('tabShop').onclick = () => switchTab('SHOP');
        byId('tabShowroom').onclick = () => switchTab('SHOWROOM');
        const shopCustomerSearch = byId('shopCustomerSearch');
        const shopCustomerSel = byId('shopCustomerId');
        if (shopCustomerSearch) shopCustomerSearch.oninput = renderCustomerOptions;
        if (shopCustomerSel) shopCustomerSel.onchange = renderCustomerDetails;
        byId('shopName').onchange = () => { void applyShopProfileByName(byId('shopName').value); };
        byId('shopName').onblur = () => { captureShopProfileFromInputs(); };
        byId('shopContact').onblur = captureShopProfileFromInputs;
        byId('shopAddress').onblur = captureShopProfileFromInputs;
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
        await loadSalesHistory();
        switchTab('SHOP');
        recalcShopTotals();
        recalcShowroom();
        byId('saveEditSaleBtn').onclick = saveEditSale;
        byId('cancelEditSaleBtn').onclick = closeEditSale;
        window.__openEditSale = openEditSale;
        window.__deleteSale = deleteSale;
    }

    document.addEventListener('DOMContentLoaded', init);
})();
