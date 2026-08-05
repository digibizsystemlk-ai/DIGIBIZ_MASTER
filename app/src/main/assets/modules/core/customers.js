/* global firebase */
let businessId = null;
let businessType = 'retail';
let allRows = [];
let distributorNavRole = '';
let retailStaffRole = '';
/** Resolved from dashboardCore.getContext().userRole (fallback: getUserRole / business staff doc). */
let dashboardUserRole = '';
let editingCustomerId = '';
let pendingEditMobile = '';
let pendingEditName = '';
let mwTradingActive = false;
let mwBizDocData = null;

function firstName(full) {
    const clean = String(full || '').trim().replace(/\s+/g, ' ');
    if (!clean) return '';
    return clean.split(' ')[0];
}

function setMsg(t, ok) {
    const m = document.getElementById('msg');
    m.textContent = t || '';
    m.style.color = ok ? '#15803d' : '#dc2626';
}

function setBulkMsg(t, ok) {
    const m = document.getElementById('bulkMsg');
    if (!m) return;
    m.textContent = t || '';
    m.style.color = ok ? '#15803d' : '#dc2626';
}

function showToast(message, ok) {
    let el = document.getElementById('customersToast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'customersToast';
        el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:10001;padding:12px 20px;border-radius:10px;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(15,23,42,.15);max-width:90vw;';
        document.body.appendChild(el);
    }
    el.textContent = message || '';
    el.style.background = ok ? '#dcfce7' : '#fee2e2';
    el.style.color = ok ? '#166534' : '#991b1b';
    el.style.border = ok ? '1px solid #86efac' : '1px solid #fecaca';
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
        el.textContent = '';
        el.style.display = 'none';
    }, 3200);
    el.style.display = 'block';
}

function normalizeStaffRole(r) {
    if (window.DigibizDistributorPermissions && typeof window.DigibizDistributorPermissions.normalizeRole === 'function') {
        return window.DigibizDistributorPermissions.normalizeRole(r);
    }
    return String(r || '').trim().toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
}

function formatTotalPurchases(row) {
    const raw = row.totalPurchases ?? row.totalPurchase ?? row.totalSpent ?? row.lifetimePurchases;
    const n = Number(raw);
    if (raw === undefined || raw === null || raw === '') return 'LKR 0.00';
    if (!Number.isFinite(n)) return '—';
    return `LKR ${n.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCreditLimit(row) {
    const raw = row.creditLimit;
    const n = Number(raw);
    if (raw === undefined || raw === null || raw === '') return '';
    if (!Number.isFinite(n)) return '';
    return n.toFixed(2);
}

function normalizeCustomerType(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw === 'supplier') return 'supplier';
    if (raw === 'buyer') return 'buyer';
    return 'customer';
}

function customerTypeBadge(typeValue) {
    const t = normalizeCustomerType(typeValue);
    if (t === 'buyer') return '<span class="tag tag-buyer">🟢 Buyer</span>';
    if (t === 'supplier') return '<span class="tag tag-supplier">🔵 Supplier</span>';
    return '<span class="tag tag-customer">⚪ Customer</span>';
}

function canCustomerEditDeleteUI() {
    const bt = String(businessType || '').toLowerCase();
    const roleRaw = String(dashboardUserRole || (bt === 'distributor' ? distributorNavRole : retailStaffRole) || '').trim();
    if (bt === 'distributor' && window.DigibizDistributorPermissions) {
        const p = window.DigibizDistributorPermissions.permissionsForRole(roleRaw);
        return !!p.canCustomerEditDelete;
    }
    // For non-distributor businesses (including KUBUKA manufacturer), keep customer edit/delete
    // actions visible as requested.
    return true;
}

function syncMwCustomerDatalist() {
    const dl = document.getElementById('mwCustomerNameDatalist');
    const fn = document.getElementById('fullName');
    if (!dl || !fn) return;
    if (!mwTradingActive) {
        fn.removeAttribute('list');
        dl.innerHTML = '';
        return;
    }
    fn.setAttribute('list', 'mwCustomerNameDatalist');
    const seen = new Set();
    const opts = [];
    for (const x of allRows) {
        const n = String(x.fullName || '').trim();
        if (!n) continue;
        const k = n.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        opts.push(n);
        if (opts.length >= 200) break;
    }
    opts.sort((a, b) => a.localeCompare(b));
    dl.textContent = '';
    for (const n of opts) {
        const o = document.createElement('option');
        o.value = n;
        dl.appendChild(o);
    }
}

function render() {
    const q = String(document.getElementById('search').value || '').trim().toLowerCase();
    const list = q ? allRows.filter((x) => (
        `${x.fullName} ${x.mobile} ${x.address || ''} ${x.type || x.context || ''}`.toLowerCase().includes(q)
    )) : allRows;
    const canAct = canCustomerEditDeleteUI();
    document.getElementById('rows').innerHTML = list.map((x) => `
        <tr data-id="${x.id || ''}" style="cursor:pointer;${editingCustomerId && x.id === editingCustomerId ? 'background:#eff6ff;' : ''}">
            <td>${x.fullName || '-'} ${x.archived ? '<span class="tag" style="background:#f1f5f9; color:#64748b; font-size:10px; padding:2px 6px; border-radius:4px; margin-left:6px;">Archived</span>' : ''}</td>
            <td>${x.mobile || '-'}</td>
            <td>
                ${x.whatsapp ? `
                    <a href="https://wa.me/${normalizeMobile(x.whatsapp)}" target="_blank" style="text-decoration:none; color:#16a34a; font-weight:700;">
                        📱 ${x.whatsapp}
                    </a>
                ` : '-'}
            </td>
            <td>${customerTypeBadge(x.type || x.context || 'customer')}</td>
            <td>${x.address || '-'}</td>
            <td>${formatTotalPurchases(x)}</td>
            <td class="actions" style="white-space:nowrap;">
                ${canAct ? `
                    <button type="button" class="edit-customer-btn btn-icon" data-id="${x.id || ''}" title="Edit">✏️</button>
                    <button type="button" class="delete-customer-btn btn-icon btn-del" data-id="${x.id || ''}" title="Delete">🗑️</button>
                ` : '<span class="muted">—</span>'}
            </td>
        </tr>
    `).join('');
    syncMwCustomerDatalist();

    document.querySelectorAll('#rows tr[data-id]').forEach((tr) => {
        tr.addEventListener('click', (ev) => {
            if (ev.target.closest && ev.target.closest('.actions')) return;
            const id = tr.getAttribute('data-id') || '';
            const row = allRows.find((r) => String(r.id || '') === String(id));
            if (!row) return;
            editingCustomerId = String(row.id || '');
            document.getElementById('fullName').value = row.fullName || '';
            document.getElementById('mobile').value = row.mobile || '';
            document.getElementById('whatsapp').value = row.whatsapp || '';
            document.getElementById('address').value = row.address || '';
            const ctx = String(row.type || row.context || 'Customer');
            const sel = document.getElementById('context');
            if (sel) sel.value = ctx;
            setMsg(`Editing: ${row.fullName || ''}`, true);
            render();
        });
    });

    document.querySelectorAll('#rows .edit-customer-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id') || '';
            editCustomer(id);
        });
    });
    document.querySelectorAll('#rows .delete-customer-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id') || '';
            deleteCustomer(id);
        });
    });
}

async function editCustomer(customerId) {
    if (!canCustomerEditDeleteUI()) {
        showToast('You do not have permission to edit customers.', false);
        return;
    }
    const id = String(customerId || '').trim();
    if (!id) return;
    try {
        const snap = await db.collection('customers').doc(id).get();
        if (!snap.exists) {
            showToast('Customer not found.', false);
            return;
        }
        const data = snap.data() || {};
        if (String(data.businessId || '') !== String(businessId || '')) {
            showToast('Access denied.', false);
            return;
        }
        showEditModal({ id, ...data });
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Could not load customer.', false);
    }
}

function tryAutoEditFromUrl() {
    if (!pendingEditMobile && !pendingEditName) return;
    const normMobile = (v) => String(v || '').replace(/[^0-9]/g, '');
    const mobileKey = normMobile(pendingEditMobile);
    const nameKey = String(pendingEditName || '').trim().toLowerCase();
    const row = allRows.find((r) => {
        if (mobileKey && normMobile(r.mobile) === mobileKey) return true;
        if (nameKey && String(r.fullName || '').trim().toLowerCase() === nameKey) return true;
        return false;
    });
    if (!row) return;
    editingCustomerId = String(row.id || '');
    document.getElementById('fullName').value = row.fullName || '';
    document.getElementById('mobile').value = row.mobile || '';
    document.getElementById('whatsapp').value = row.whatsapp || '';
    document.getElementById('address').value = row.address || '';
    const ctx = String(row.type || row.context || 'Customer');
    const sel = document.getElementById('context');
    if (sel) sel.value = ctx;
    const fullNameEl = document.getElementById('fullName');
    if (fullNameEl) fullNameEl.focus();
    setMsg(`Editing: ${row.fullName || ''}`, true);
    pendingEditMobile = '';
    pendingEditName = '';
    render();
}

async function refresh() {
    const snap = await db.collection('customers').where('businessId', '==', businessId).limit(5000).get().catch(() => ({ docs: [] }));
    allRows = snap.docs
        .map((d) => {
            const data = d.data() || {};
            return {
                id: d.id,
                ...data,
                fullName: data.fullName || data.name || '',
                mobile: data.mobile || data.phone || ''
            };
        })
        .filter((x) => x.isActive !== false)
        .sort((a, b) => {
            const ta = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : new Date(a.updatedAt || a.createdAt || 0).getTime();
            const tb = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : new Date(b.updatedAt || b.createdAt || 0).getTime();
            return tb - ta;
        });
    render();
    tryAutoEditFromUrl();
}

function computeCustomerDocId(fullName, mobile) {
    const mobileKey = mobile ? mobile.replace(/[^0-9]/g, '') : '';
    const nameKey = fullName.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
    return mobileKey ? `${businessId}_${mobileKey}` : `${businessId}_NAME_${nameKey}`;
}

async function createOpeningBalanceRecords(targetId, fullName, type, amount) {
    if (amount <= 0) return;
    
    try {
        const batch = db.batch();
        const now = new Date();
        const ACCOUNT_CODES = {
            ACCOUNTS_RECEIVABLE: 'AC-12000',
            ACCOUNTS_PAYABLE: 'AC-21000',
            EQUITY: 'AC-30000'
        };
        
        if (type === 'supplier') {
            // 1. Create mock Purchase Order
            const poRef = db.collection('purchases').doc(businessId).collection('orders').doc();
            const poNo = 'PO-OPEN-' + Date.now().toString().slice(-4);
            batch.set(poRef, {
                poNo: poNo,
                supplierId: targetId,
                supplierName: fullName,
                total: amount,
                status: 'pending',
                createdAt: now,
                items: [{ productName: 'Opening Payable Balance', quantity: 1, unitPrice: amount }]
            });
            
            // 2. Create Journal Entry
            const journalRef = db.collection('journal').doc(businessId).collection('entries').doc();
            batch.set(journalRef, {
                date: now,
                memo: `Opening Balance Payable - Supplier: ${fullName}`,
                ref: `purchases/${poRef.id}`,
                refType: 'PURCHASE',
                total: amount,
                entries: [
                    { accountId: ACCOUNT_CODES.EQUITY, amount: amount, type: 'debit' },
                    { accountId: ACCOUNT_CODES.ACCOUNTS_PAYABLE, amount: amount, type: 'credit' }
                ],
                createdAt: now
            });
            
        } else {
            // Customer / Buyer
            // 1. Create mock Customer Order
            const orderRef = db.collection('orders').doc(businessId).collection('list').doc();
            const invoiceNo = 'INV-OPEN-' + Date.now().toString().slice(-4);
            batch.set(orderRef, {
                invoiceNo: invoiceNo,
                customerId: targetId,
                customer: { name: fullName },
                total: amount,
                balanceDue: amount,
                status: 'unpaid',
                createdAt: now,
                items: [{ name: 'Opening Debt Balance', quantity: 1, price: amount }]
            });
            
            // 2. Create Journal Entry
            const journalRef = db.collection('journal').doc(businessId).collection('entries').doc();
            batch.set(journalRef, {
                date: now,
                memo: `Opening Balance Receivable - Customer: ${fullName}`,
                ref: `orders/${orderRef.id}`,
                refType: 'SALE',
                total: amount,
                entries: [
                    { accountId: ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, amount: amount, type: 'debit' },
                    { accountId: ACCOUNT_CODES.EQUITY, amount: amount, type: 'credit' }
                ],
                createdAt: now
            });
        }
        
        await batch.commit();
        console.log(`Opening balance records created for ${fullName} (${type}): Rs. ${amount}`);
    } catch (e) {
        console.error('Failed to create opening balance records:', e);
    }
}

async function saveCustomer() {
    const fullName = String(document.getElementById('fullName').value || '').trim();
    const mobile = String(document.getElementById('mobile').value || '').trim();
    const whatsapp = String(document.getElementById('whatsapp').value || '').trim();
    const address = String(document.getElementById('address').value || '').trim();
    const context = String(document.getElementById('context').value || 'Customer').trim();
    const openingBalanceVal = parseFloat(document.getElementById('openingBalance')?.value) || 0;
    const type = normalizeCustomerType(context);
    if (!fullName) { setMsg('Name is required.', false); return; }
    const targetId = computeCustomerDocId(fullName, mobile);
    const existingId = String(editingCustomerId || '').trim();
    const customerRef = db.collection('customers').doc(existingId || targetId);
    const existing = await customerRef.get().catch(() => null);
    const isNew = !(existing && existing.exists);
    const bt = String(businessType || '').toLowerCase();
    if (bt === 'distributor' && window.DigibizDistributorPermissions) {
        const p = window.DigibizDistributorPermissions.permissionsForRole(distributorNavRole);
        const mwCfg = window.DigibizMwDslConfig;
        const canCreateNew = mwCfg && typeof mwCfg.mwTradingDistributorCanCreateNewCustomer === 'function'
            ? mwCfg.mwTradingDistributorCanCreateNewCustomer(p, mwTradingActive)
            : !!p.canCustomerCreate;
        if (isNew && !canCreateNew) {
            setMsg('Your role cannot create customers.', false);
            return;
        }
        if (!isNew && !p.canCustomerEditDelete) {
            setMsg('Your role cannot edit existing customers.', false);
            return;
        }
    }
    const u = firebase.auth().currentUser;
    const payload = {
        businessId,
        businessType,
        fullName,
        firstName: firstName(fullName),
        mobile,
        whatsapp,
        address,
        type: type,
        context,
        openingBalance: openingBalanceVal,
        archived: firebase.firestore.FieldValue.delete(),
        archivedAt: firebase.firestore.FieldValue.delete(),
        isActive: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: u && u.email ? u.email : ''
    };
    if (isNew) {
        payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }
    if (existingId && existingId !== targetId) {
        const batch = db.batch();
        batch.set(db.collection('customers').doc(targetId), {
            ...payload,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        batch.set(db.collection('customers').doc(existingId), {
            archived: true,
            archivedAt: new Date().toISOString(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        await batch.commit();
        editingCustomerId = targetId;
        setMsg('Customer updated (mobile changed). Previous record archived.', true);
    } else {
        await customerRef.set(payload, { merge: true });
        editingCustomerId = existingId || targetId;
        setMsg(isNew ? 'Customer saved.' : 'Customer updated.', true);
    }
    
    if (isNew && openingBalanceVal > 0) {
        await createOpeningBalanceRecords(editingCustomerId, fullName, type, openingBalanceVal);
    }
    
    await refresh();
}

function normalizeMobile(mobile) {
    let ph = String(mobile || '').trim().replace(/[\s-]/g, '');
    ph = ph.replace(/^\+/, '');
    if (ph.length === 10 && ph.startsWith('0')) ph = `94${ph.slice(1)}`;
    if (ph.length === 9) ph = `94${ph}`;
    return ph;
}

function parseBulkLines(text) {
    const rawLines = String(text || '').split(/\r?\n/).map((l) => String(l || '').trim()).filter(Boolean);
    const out = [];
    for (const line of rawLines) {
        const m = line.match(/(\+?94\d{9}|94\d{9}|0\d{9}|\d{9,12})/);
        if (!m || m.index == null) continue;
        const phoneRaw = m[0];
        const mobile = normalizeMobile(phoneRaw);
        if (!mobile || mobile.length < 11) continue;
        let name = String(line.slice(0, m.index) || '').trim();
        name = name.replace(/(රු\.?|rs\.?|lkr)\s*[:.]?\s*[0-9,]+/ig, '').trim();
        if (!name) continue;
        out.push({ fullName: name, mobile });
    }
    return out;
}

async function bulkImport() {
    if (!businessId) return;
    const isScrap = String(businessType || '').toLowerCase() === 'scrap_collection_center';
    if (!isScrap) return;
    const context = String(document.getElementById('bulkType')?.value || 'Other').trim();
    const listText = String(document.getElementById('bulkList')?.value || '').trim();
    const items = parseBulkLines(listText);
    if (!items.length) { setBulkMsg('No valid rows found. Check formatting.', false); return; }
    setBulkMsg(`Importing ${items.length}...`, true);
    const batch = db.batch();
    const nowTs = firebase.firestore.FieldValue.serverTimestamp();
    for (const x of items) {
        const id = `${businessId}_${x.mobile.replace(/[^0-9]/g, '')}`;
        const ref = db.collection('customers').doc(id);
        batch.set(ref, {
            businessId,
            businessType,
            fullName: x.fullName,
            firstName: firstName(x.fullName),
            mobile: x.mobile,
            address: '',
            type: context,
            context,
            updatedAt: nowTs,
            createdAt: nowTs
        }, { merge: true });
    }
    await batch.commit();
    setBulkMsg(`Imported/updated ${items.length} customers.`, true);
    await refresh();
}

function showEditModal(row) {
    if (!canCustomerEditDeleteUI()) {
        showToast('You do not have permission to edit customers.', false);
        return;
    }
    document.getElementById('editCustomerId').value = String(row.id || '');
    document.getElementById('editCustomerName').value = row.fullName || row.name || '';
    document.getElementById('editCustomerPhone').value = row.mobile || row.phone || '';
    document.getElementById('editCustomerWhatsapp').value = row.whatsapp || '';
    document.getElementById('editCustomerAddress').value = row.address || '';
    document.getElementById('editCustomerEmail').value = row.email || '';
    document.getElementById('editCustomerCreditLimit').value = formatCreditLimit(row);
    document.getElementById('editCustomerType').value = String(row.type || row.context || 'Customer');
    const modal = document.getElementById('editCustomerModal');
    if (modal) {
        modal.classList.add('is-open');
    }
}

function closeEditModal() {
    const modal = document.getElementById('editCustomerModal');
    if (modal) {
        modal.classList.remove('is-open');
    }
}

async function saveCustomerEdit() {
    if (!canCustomerEditDeleteUI()) {
        showToast('You do not have permission to edit customers.', false);
        return;
    }
    const existingId = String(document.getElementById('editCustomerId').value || '').trim();
    const fullName = String(document.getElementById('editCustomerName').value || '').trim();
    const mobile = String(document.getElementById('editCustomerPhone').value || '').trim();
    const whatsapp = String(document.getElementById('editCustomerWhatsapp').value || '').trim();
    const address = String(document.getElementById('editCustomerAddress').value || '').trim();
    const email = String(document.getElementById('editCustomerEmail').value || '').trim();
    const creditLimitRaw = String(document.getElementById('editCustomerCreditLimit').value || '').trim();
    const context = String(document.getElementById('editCustomerType').value || 'Customer').trim();
    const type = normalizeCustomerType(context);
    if (!existingId) {
        showToast('Missing customer id.', false);
        return;
    }
    if (!fullName) {
        showToast('Name is required.', false);
        return;
    }
    let existingSnap = null;
    try {
        existingSnap = await db.collection('customers').doc(existingId).get();
    } catch (e) {
        showToast('Could not verify customer.', false);
        return;
    }
    if (!existingSnap.exists || String((existingSnap.data() || {}).businessId || '') !== String(businessId || '')) {
        showToast('Customer not found or access denied.', false);
        return;
    }
    const targetId = computeCustomerDocId(fullName, mobile);
    const u = firebase.auth().currentUser;
    const payload = {
        businessId,
        businessType,
        fullName,
        firstName: firstName(fullName),
        mobile,
        whatsapp,
        address,
        type: type,
        context,
        archived: firebase.firestore.FieldValue.delete(),
        archivedAt: firebase.firestore.FieldValue.delete(),
        isActive: true,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedBy: u && u.email ? u.email : ''
    };
    if (email) payload.email = email;
    else payload.email = firebase.firestore.FieldValue.delete();
    if (creditLimitRaw === '') payload.creditLimit = firebase.firestore.FieldValue.delete();
    else {
        const creditLimitNum = Number(creditLimitRaw);
        if (!Number.isFinite(creditLimitNum) || creditLimitNum < 0) {
            showToast('Credit limit must be a valid non-negative number.', false);
            return;
        }
        payload.creditLimit = creditLimitNum;
    }
    try {
        if (existingId !== targetId) {
            const batch = db.batch();
            const newPayload = { ...payload };
            if (!email) delete newPayload.email;
            newPayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            batch.set(db.collection('customers').doc(targetId), newPayload, { merge: true });
            batch.set(db.collection('customers').doc(existingId), {
                archived: true,
                archivedAt: new Date().toISOString(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            await batch.commit();
            showToast('Customer updated successfully (record moved).', true);
        } else {
            await db.collection('customers').doc(existingId).set(payload, { merge: true });
            showToast('Customer updated successfully.', true);
        }
        closeEditModal();
        editingCustomerId = targetId;
        await refresh();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Update failed.', false);
    }
}

async function deleteCustomer(customerId) {
    if (!canCustomerEditDeleteUI()) {
        showToast('You do not have permission to delete customers.', false);
        return;
    }
    const id = String(customerId || '').trim();
    if (!id) return;
    const row = allRows.find((r) => String(r.id || '') === id);
    if (!row || String(row.businessId || '') !== String(businessId || '')) {
        showToast('Customer not found or access denied.', false);
        return;
    }
    const label = row.fullName || row.name || 'this customer';
    if (!window.confirm(`Delete ${label}?`)) return;
    try {
        await db.collection('customers').doc(id).set({
            isActive: false,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        showToast('Customer deleted successfully.', true);
        if (editingCustomerId === id) editingCustomerId = '';
        await refresh();
    } catch (err) {
        console.error(err);
        showToast(err.message || 'Delete failed.', false);
    }
}

window.saveCustomerEdit = saveCustomerEdit;
window.closeEditModal = closeEditModal;
window.editCustomer = editCustomer;

function wireEditModalClose() {
    const modal = document.getElementById('editCustomerModal');
    if (!modal) return;
    const closeBtn = modal.querySelector('.edit-modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeEditModal);
        closeBtn.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter' || ev.key === ' ') {
                ev.preventDefault();
                closeEditModal();
            }
        });
    }
    document.getElementById('saveCustomerEditBtn')?.addEventListener('click', () => saveCustomerEdit());
    document.getElementById('cancelCustomerEditBtn')?.addEventListener('click', closeEditModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeEditModal();
    });
}

function applyLabelByBusinessType() {
    const isManufacturer = String(businessType || '').toLowerCase() === 'manufacturer';
    const isScrap = String(businessType || '').toLowerCase() === 'scrap_collection_center';
    const title = document.querySelector('.head p');
    if (title) {
        let base = isManufacturer
            ? 'Centralized supplier/buyer directory shared across manufacturer workflows.'
            : (isScrap
                ? 'Centralized directory for scrap suppliers, buyers, and borrowers under current business only.'
                : 'Centralized customer list shared across modules under current business only.');
        if (mwTradingActive && String(businessType || '').toLowerCase() === 'distributor') {
            base += ' MW Trading: you can add new contacts freely; saved names appear as suggestions when typing.';
        }
        title.textContent = base;
    }
    const labelContext = document.querySelector('label[for="context"]') || document.querySelectorAll('label')[2];
    if (labelContext) labelContext.textContent = isManufacturer ? 'Supplier / Buyer Type' : 'Type';
    const select = document.getElementById('context');
    if (select) {
        select.innerHTML = isScrap
            ? (
                '<option value="Supplier">Supplier</option>' +
                '<option value="Buyer">Buyer</option>' +
                '<option value="Borrower - Interest">Borrower - Interest</option>' +
                '<option value="Borrower - No Interest">Borrower - No Interest</option>' +
                '<option value="Registered Supplier">Registered Supplier</option>' +
                '<option value="Unregistered Supplier">Unregistered Supplier</option>' +
                '<option value="Other">Other</option>'
            )
            : (isManufacturer
                ? '<option value="Supplier">Supplier</option><option value="Buyer">Buyer</option><option value="Customer">Customer</option>'
                : '<option value="Supplier">Supplier</option><option value="Buyer">Buyer</option><option value="Customer">Customer</option>');
    }
    const bulk = document.getElementById('bulkBox');
    if (bulk) bulk.style.display = isScrap ? '' : 'none';
}

document.getElementById('saveBtn').addEventListener('click', saveCustomer);
document.getElementById('clearBtn')?.addEventListener('click', () => {
    editingCustomerId = '';
    document.getElementById('fullName').value = '';
    document.getElementById('mobile').value = '';
    document.getElementById('whatsapp').value = '';
    document.getElementById('address').value = '';
    const opBal = document.getElementById('openingBalance');
    if (opBal) opBal.value = '';
    const sel = document.getElementById('context');
    if (sel) sel.selectedIndex = 0;
    setMsg('Form cleared. Ready to add a new customer.', true);
    render();
});
document.getElementById('bulkImportBtn')?.addEventListener('click', bulkImport);
document.getElementById('search').addEventListener('input', render);
wireEditModalClose();

firebase.auth().onAuthStateChanged(async (u) => {
    if (!u) { window.location.href = '/auth/login.html'; return; }
    const ctx = await window.dashboardCore.getContext(u);
    businessId = (ctx && ctx.businessId) || u.uid;
    businessType = (ctx && ctx.businessType) || 'retail';
    dashboardUserRole = String((ctx && ctx.userRole) || '').trim();
    try {
        const p = new URLSearchParams(window.location.search || '');
        pendingEditMobile = String(p.get('mobile') || '').trim();
        pendingEditName = String(p.get('name') || '').trim();
        const searchEl = document.getElementById('search');
        if (searchEl && !searchEl.value && (pendingEditMobile || pendingEditName)) {
            searchEl.value = pendingEditMobile || pendingEditName;
        }
    } catch (e) {
        pendingEditMobile = '';
        pendingEditName = '';
    }
    try {
        const ri = await window.getUserRole(u.uid, businessId);
        retailStaffRole = String((ri && ri.role) || '');
    } catch (e) {
        retailStaffRole = '';
        console.warn('customers getUserRole', e);
    }
    distributorNavRole = '';
    if (String(businessType || '').toLowerCase() === 'distributor' && window.getUserRole) {
        try {
            const ri = await window.getUserRole(u.uid, businessId);
            distributorNavRole = String((ri && ri.role) || '');
            const bud = await db.collection('businesses').doc(businessId).collection('users').doc(u.uid).get();
            if (bud.exists && bud.data().role) distributorNavRole = String(bud.data().role);
        } catch (e) {
            console.warn('customers role', e);
        }
    }
    if (!dashboardUserRole) {
        dashboardUserRole = String(businessType || '').toLowerCase() === 'distributor'
            ? distributorNavRole
            : retailStaffRole;
    }
    mwTradingActive = false;
    mwBizDocData = null;
    try {
        if (window.DigibizMwDslConfig && businessId) {
            const bs = await db.collection('businesses').doc(businessId).get();
            mwBizDocData = bs.exists ? (bs.data() || {}) : null;
            mwTradingActive = window.DigibizMwDslConfig.isMwTradingTenantActive(businessId, mwBizDocData);
        }
    } catch (e) {
        console.warn('customers mw flag', e);
    }
    applyLabelByBusinessType();
    await refresh();
});
