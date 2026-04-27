(function (global) {
    const state = { db: null, user: null, businessId: '' };

    function esc(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/"/g, '&quot;');
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
        const total = Number(order.totalAmount || order.subtotal || 0) || 0;
        const paid = Number(order.collectionAmount || order.collectedAmount || 0) || 0;
        const explicit = Number(order.outstandingBalance);
        const out = Number.isFinite(explicit) ? explicit : (total - paid);
        return Math.max(0, out);
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
            .filter((o) => o.__outstanding > 0)
            .sort((a, b) => dateMs(b.orderDate || b.createdAt) - dateMs(a.orderDate || a.createdAt));
    }

    async function openForShop(shopId, shopName, contact) {
        const modal = document.getElementById('agingModal');
        const title = document.getElementById('agingModalTitle');
        const sub = document.getElementById('agingModalSub');
        const rowsEl = document.getElementById('agingModalRows');
        const totalEl = document.getElementById('agingModalTotal');
        if (!modal || !rowsEl || !totalEl) return;

        if (!state.user || !state.businessId || !global.DigiBizDistributorLorryStock
            || !global.DigiBizDistributorLorryStock.activeForSession(state.user.email, state.businessId)) {
            return;
        }

        title.textContent = 'Outstanding Orders - ' + String(shopName || shopId || 'Shop');
        sub.textContent = 'Contact: ' + String(contact || '-') + ' | Shop ID: ' + String(shopId || '-');
        rowsEl.innerHTML = '<tr><td colspan="7">Loading...</td></tr>';
        totalEl.textContent = 'Rs 0.00';
        modal.classList.add('open');

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const rows = await fetchOutstandingOrdersForShop(shopId);
        if (!rows.length) {
            rowsEl.innerHTML = '<tr><td colspan="7">No outstanding invoices/orders for this shop.</td></tr>';
            return;
        }
        const totalOutstanding = rows.reduce((sum, r) => sum + (Number(r.__outstanding) || 0), 0);
        rowsEl.innerHTML = rows.map((r) => {
            const dtMs = dateMs(r.orderDate || r.createdAt);
            const dt = dtMs ? new Date(dtMs).toLocaleDateString() : '-';
            const total = Number(r.totalAmount || r.subtotal || 0) || 0;
            const paid = Number(r.collectionAmount || r.collectedAmount || 0) || 0;
            const out = Number(r.__outstanding || 0);
            const overdue = dtMs ? Math.max(0, Math.floor((now.getTime() - dtMs) / 86400000)) : 0;
            const status = String(r.status || '').toLowerCase() || '-';
            return `<tr>
                <td>${esc(r.orderNumber || r.invoiceNumber || r.id || '-')}</td>
                <td>${dt}</td>
                <td class="num">Rs ${money(total)}</td>
                <td class="num">Rs ${money(paid)}</td>
                <td class="num">Rs ${money(out)}</td>
                <td class="num">${overdue}</td>
                <td>${esc(status)}</td>
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
        openForShop: openForShop
    };
})(window);
