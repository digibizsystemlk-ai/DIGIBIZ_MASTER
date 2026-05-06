(function (global) {
    const MW_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
    const state = { db: null, user: null, businessId: '' };

    function isMwCreditAging() {
        const bid = String(state.businessId || '');
        return bid === MW_BUSINESS_ID || bid === 'SPRANZA_PVT_LTD';
    }

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
    }

    function escAttrValue(s) {
        return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    }

    function dateMs(v) {
        if (!v) return 0;
        if (typeof v.toDate === 'function') return v.toDate().getTime();
        if (v.seconds) return Number(v.seconds) * 1000;
        const d = new Date(v);
        return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    }

    function money(n) {
        return (Number(n) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function extractOutstanding(order) {
        const o = order || {};
        const total = Number(o.totalAmount || o.subtotal || 0) || 0;
        const paid = Number(o.collectionAmount || o.collectedAmount || 0) || 0;
        const released = Number(o.releasedAmount || 0) || 0;
        const explicit = Number(o.outstandingBalance);
        const computed = Math.max(0, total - paid - released);
        if (Number.isFinite(explicit) && explicit >= 0) return Math.max(0, explicit);
        return computed;
    }

    function baseOutstandingBeforeRelease(order) {
        const o = order || {};
        const total = Number(o.totalAmount || o.subtotal || 0) || 0;
        const paid = Number(o.collectionAmount || o.collectedAmount || 0) || 0;
        return Math.max(0, total - paid);
    }

    function computeReleaseStatus(order) {
        const o = order || {};
        const released = Number(o.releasedAmount || 0) || 0;
        const out = extractOutstanding(o);
        const base = baseOutstandingBeforeRelease(o);
        if (base <= 0.0001) return 'fully_released';
        if (released <= 0.0001 && out >= base - 0.0001) return 'pending';
        if (out <= 0.0001) return 'fully_released';
        return 'partially_released';
    }

    function isCreditLikeOrder(o) {
        const pm = String(o.paymentMethod || '').toUpperCase();
        return pm === 'CREDIT' || pm === 'CHEQUE';
    }

    function formatReleaseHistory(o) {
        const h = Array.isArray(o.creditReleaseHistory) ? o.creditReleaseHistory : [];
        if (!h.length) return '—';
        return h.slice(-5).map((row) => {
            const amt = Number(row.amount) || 0;
            const note = esc(String(row.notes || '').trim());
            const at = row.at && row.at.toDate ? row.at.toDate().toLocaleString() : (row.at ? esc(String(row.at)) : '—');
            return `${at}: Rs ${money(amt)}${note ? ' — ' + note : ''}`;
        }).join('<br>');
    }

    function bindModalCloseEvents() {
        const modal = document.getElementById('agingModal');
        const closeBtn = document.getElementById('agingModalCloseBtn');
        if (!modal) return;
        if (closeBtn && !closeBtn.dataset.bound) {
            closeBtn.dataset.bound = '1';
            closeBtn.addEventListener('click', () => modal.classList.remove('open'));
        }
        if (!modal.dataset.boundOutside) {
            modal.dataset.boundOutside = '1';
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('open');
            });
        }
        if (!document.body.dataset.boundAgingEsc) {
            document.body.dataset.boundAgingEsc = '1';
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') modal.classList.remove('open');
            });
        }
    }

    async function fetchOutstandingOrdersForShop(shopId) {
        if (!state.db || !state.businessId || !shopId) return [];
        const q1 = state.db.collection('orders')
            .where('businessId', '==', state.businessId)
            .where('shopId', '==', shopId)
            .get()
            .catch(() => ({ docs: [] }));
        const q2 = state.db.collection('orders')
            .where('businessId', '==', state.businessId)
            .where('customerId', '==', shopId)
            .get()
            .catch(() => ({ docs: [] }));
        const [s1, s2] = await Promise.all([q1, q2]);
        const merged = {};
        (s1.docs || []).concat(s2.docs || []).forEach((d) => {
            merged[d.id] = { id: d.id, ...(d.data() || {}) };
        });
        return Object.values(merged)
            .map((o) => ({ ...o, __outstanding: extractOutstanding(o) }))
            .filter((o) => o.isActive !== false)
            .filter((o) => o.__outstanding > 0)
            .sort((a, b) => dateMs(b.orderDate || b.createdAt) - dateMs(a.orderDate || a.createdAt));
    }

    async function reopenModalFromDataset() {
        const modal = document.getElementById('agingModal');
        if (!modal) return;
        const shopId = modal.dataset.creditShopId || '';
        const shopName = modal.dataset.creditShopName || '';
        const contact = modal.dataset.creditContact || '';
        await openForShop(shopId, shopName, contact);
    }

    async function releaseCreditForOrder(btn) {
        if (!state.db || !btn) return;
        const orderId = String(btn.getAttribute('data-rel-order') || '').trim();
        if (!orderId) return;
        const tr = btn.closest('tr');
        const amtInp = tr ? tr.querySelector('input[data-rel-amt]') : null;
        const noteInp = tr ? tr.querySelector('input[data-rel-note]') : null;
        const amt = Number(amtInp && amtInp.value);
        const notes = noteInp ? String(noteInp.value || '').trim() : '';
        if (!Number.isFinite(amt) || amt <= 0) return alert('Enter a valid amount to release.');
        const ref = state.db.collection('orders').doc(orderId);
        const snap = await ref.get().catch(() => null);
        if (!snap || !snap.exists) return alert('Order not found');
        const d = snap.data() || {};
        if (!isCreditLikeOrder(d)) return alert('Release applies to CREDIT or CHEQUE orders only.');
        const total = Number(d.totalAmount || d.subtotal || 0) || 0;
        const paid = Number(d.collectionAmount || d.collectedAmount || 0) || 0;
        const base = Math.max(0, total - paid);
        const prevReleased = Number(d.releasedAmount || 0) || 0;
        const currentOut = Math.max(0, base - prevReleased);
        if (amt > currentOut + 0.0001) return alert('Amount exceeds remaining outstanding (Rs ' + money(currentOut) + ').');
        const newReleased = prevReleased + amt;
        const newOutstanding = Math.max(0, base - newReleased);
        let releaseStatus = 'pending';
        if (newReleased > 0.0001 && newOutstanding > 0.0001) releaseStatus = 'partially_released';
        if (newOutstanding <= 0.0001 && base > 0.0001) releaseStatus = 'fully_released';
        if (base <= 0.0001) releaseStatus = 'fully_released';
        const history = Array.isArray(d.creditReleaseHistory) ? d.creditReleaseHistory.slice() : [];
        history.push({
            at: firebase.firestore.Timestamp.now(),
            amount: amt,
            notes: notes || '',
            byUid: (state.user && state.user.uid) || ''
        });
        await ref.set({
            releasedAmount: newReleased,
            outstandingBalance: newOutstanding,
            releaseStatus,
            creditReleaseHistory: history,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        if (amtInp) amtInp.value = '';
        if (noteInp) noteInp.value = '';
        await reopenModalFromDataset();
    }

    async function editUnderlyingOrder(orderId) {
        if (!state.db || !orderId) return;
        const ref = state.db.collection('orders').doc(orderId);
        const doc = await ref.get().catch(() => null);
        if (!doc || !doc.exists) return alert('Order not found');
        const d = doc.data() || {};
        const totalNow = Number(d.totalAmount || d.subtotal || 0) || 0;
        const paidNow = Number(d.collectionAmount || d.collectedAmount || 0) || 0;
        const releasedNow = Number(d.releasedAmount || 0) || 0;
        const outNow = extractOutstanding(d);
        const totalIn = prompt('Edit total amount:', String(totalNow));
        if (totalIn === null) return;
        const paidIn = prompt('Edit paid/collection amount:', String(paidNow));
        if (paidIn === null) return;
        const statusIn = prompt('Edit status:', String(d.status || ''));
        if (statusIn === null) return;
        const total = Number(totalIn);
        const paid = Number(paidIn);
        if (!Number.isFinite(total) || total < 0 || !Number.isFinite(paid) || paid < 0) return alert('Invalid number values.');
        const base = Math.max(0, total - paid);
        const newOutstanding = Math.max(0, base - releasedNow);
        const releaseStatus = computeReleaseStatus({
            ...d,
            totalAmount: total,
            collectionAmount: paid,
            releasedAmount: releasedNow,
            outstandingBalance: newOutstanding
        });
        const patch = {
            totalAmount: total,
            subtotal: total,
            collectionAmount: paid,
            collectedAmount: paid,
            outstandingBalance: newOutstanding,
            releaseStatus,
            status: String(statusIn || '').trim() || d.status || '',
            updatedAt: new Date(),
            lastEditedAt: new Date()
        };
        await ref.set(patch, { merge: true });
        alert(`Order updated. Outstanding: Rs ${money(outNow)} -> Rs ${money(newOutstanding)}`);
    }

    async function softDeleteUnderlyingOrder(orderId) {
        if (!state.db || !orderId) return;
        if (!confirm('Soft delete this underlying order?')) return;
        await state.db.collection('orders').doc(orderId).set({
            isActive: false,
            deletedAt: new Date(),
            updatedAt: new Date()
        }, { merge: true });
    }

    function bindModalRowActions() {
        const rowsEl = document.getElementById('agingModalRows');
        if (!rowsEl || rowsEl.dataset.delegationBound === '1') return;
        rowsEl.dataset.delegationBound = '1';
        rowsEl.addEventListener('click', async (ev) => {
            const rel = ev.target && ev.target.closest && ev.target.closest('[data-rel-order]');
            if (rel) {
                await releaseCreditForOrder(rel);
                return;
            }
            const ed = ev.target && ev.target.closest && ev.target.closest('[data-edit-order]');
            if (ed) {
                const oid = ed.getAttribute('data-edit-order');
                if (oid) {
                    await editUnderlyingOrder(oid);
                    await reopenModalFromDataset();
                }
                return;
            }
            const del = ev.target && ev.target.closest && ev.target.closest('[data-delete-order]');
            if (del) {
                const oid = del.getAttribute('data-delete-order');
                if (oid) {
                    await softDeleteUnderlyingOrder(oid);
                    await reopenModalFromDataset();
                }
            }
        });
    }

    async function openForShop(shopId, shopName, contact) {
        const modal = document.getElementById('agingModal');
        const title = document.getElementById('agingModalTitle');
        const sub = document.getElementById('agingModalSub');
        const rowsEl = document.getElementById('agingModalRows');
        const totalEl = document.getElementById('agingModalTotal');
        if (!modal || !rowsEl || !totalEl) return;

        if (!state.user || !state.businessId || !isMwCreditAging()) {
            return;
        }

        modal.dataset.creditShopId = String(shopId || '');
        modal.dataset.creditShopName = String(shopName || '');
        modal.dataset.creditContact = String(contact || '');

        bindModalRowActions();

        title.textContent = 'Outstanding Orders - ' + String(shopName || shopId || 'Shop');
        sub.textContent = 'Contact: ' + String(contact || '-') + ' | Shop ID: ' + String(shopId || '-');
        rowsEl.innerHTML = '<tr><td colspan="10">Loading...</td></tr>';
        totalEl.textContent = 'Rs 0.00';
        modal.classList.add('open');

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const rows = await fetchOutstandingOrdersForShop(shopId);
        if (!rows.length) {
            rowsEl.innerHTML = '<tr><td colspan="10">No outstanding invoices/orders for this shop.</td></tr>';
            return;
        }
        const totalOutstanding = rows.reduce((sum, r) => sum + (Number(r.__outstanding) || 0), 0);
        rowsEl.innerHTML = rows.map((r) => {
            const dueMs = dateMs(r.creditDueDate || r.dueDate || r.paymentDueDate);
            const orderMs = dateMs(r.orderDate || r.createdAt);
            const refMs = dueMs || orderMs;
            const overdue = refMs ? Math.max(0, Math.floor((now.getTime() - refMs) / 86400000)) : 0;
            const total = Number(r.totalAmount || r.subtotal || 0) || 0;
            const paid = Number(r.collectionAmount || r.collectedAmount || 0) || 0;
            const out = Number(r.__outstanding || 0);
            const released = Number(r.releasedAmount || 0) || 0;
            const st = String(r.releaseStatus || computeReleaseStatus(r) || 'pending');
            const status = String(r.status || '').toLowerCase() || '-';
            const pm = String(r.paymentMethod || '—');
            const canRelease = isCreditLikeOrder(r);
            const oid = String(r.id || '');
            return `<tr>
                <td>${esc(r.orderNumber || r.invoiceNumber || r.id || '-')}</td>
                <td>${refMs ? new Date(refMs).toLocaleDateString() : '-'}</td>
                <td class="num">Rs ${money(total)}</td>
                <td class="num">Rs ${money(paid)}</td>
                <td class="num">Rs ${money(out)}</td>
                <td class="num">${overdue}</td>
                <td>${esc(pm)}</td>
                <td>${esc(status)}</td>
                <td><strong>${esc(st)}</strong><div style="font-size:11px;color:#64748b;margin-top:4px;">Released: Rs ${money(released)}</div>
                    <div style="font-size:11px;margin-top:6px;line-height:1.35;">${formatReleaseHistory(r)}</div>
                    ${canRelease ? `<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
                        <input type="number" min="0" step="0.01" data-rel-amt placeholder="Amount to release" style="width:100%;max-width:160px;padding:4px;border:1px solid #d1d5db;border-radius:6px;"/>
                        <input type="text" data-rel-note placeholder="Notes" style="width:100%;max-width:200px;padding:4px;border:1px solid #d1d5db;border-radius:6px;"/>
                        <button type="button" data-rel-order="${escAttrValue(oid)}" style="align-self:flex-start;background:#10b981;color:#fff;border:none;border-radius:6px;padding:6px 10px;cursor:pointer;font-size:12px;">Release</button>
                    </div>` : '<div style="font-size:11px;color:#94a3b8;margin-top:6px;">Not a credit/cheque order</div>'}</td>
                <td><button type="button" data-edit-order="${escAttrValue(oid)}" title="Edit totals">✏️</button>
                    <button type="button" data-delete-order="${escAttrValue(oid)}" title="Soft delete">🗑️</button></td>
            </tr>`;
        }).join('');
        totalEl.textContent = 'Rs ' + money(totalOutstanding);
    }

    function init(ctx) {
        state.db = ctx && ctx.db ? ctx.db : null;
        state.user = ctx && ctx.user ? ctx.user : null;
        state.businessId = ctx && ctx.businessId ? String(ctx.businessId) : '';
        bindModalCloseEvents();
    }

    global.CreditAgingDrilldown = {
        init: init,
        openForShop: openForShop,
        editOrder: async function (orderId, shopId, shopName, contact) {
            await editUnderlyingOrder(orderId);
            await openForShop(shopId, shopName, contact);
        },
        deleteOrder: async function (orderId, shopId, shopName, contact) {
            await softDeleteUnderlyingOrder(orderId);
            await openForShop(shopId, shopName, contact);
        }
    };
})(window);
