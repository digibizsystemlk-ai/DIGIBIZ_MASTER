(() => {
    const state = {
        user: null,
        superAdmin: false,
        businesses: [],
        filter: 'all',
        selectedId: '',
        pendingLockId: ''
    };

    const $ = (id) => document.getElementById(id);

    const toast = (msg, kind) => {
        const t = $('toast');
        if (!t) return;
        t.textContent = msg;
        t.className = 'toast show' + (kind === 'warn' ? ' warn-toast' : kind === 'ok' ? ' ok-toast' : '');
        setTimeout(() => {
            t.classList.remove('show', 'warn-toast', 'ok-toast');
        }, 2600);
    };

    const safe = (v) => String(v ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c]));

    const formatDate = (v) => {
        if (!v) return '-';
        const d = v.toDate ? v.toDate() : new Date(v);
        return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
    };

    const normalizeLock = (b) => {
        const status = String((b && b.lockStatus) || 'UNLOCKED').toUpperCase();
        const lockStatus = status === 'LOCKED' ? 'LOCKED' : 'UNLOCKED';
        let level = String((b && b.lockLevel) || 'HARD').toUpperCase();
        if (level !== 'SOFT' && level !== 'MEDIUM' && level !== 'HARD') level = 'HARD';
        return { lockStatus, lockLevel: level };
    };

    const ownerEmail = (b) => String((b && (b.email || b.ownerEmail || b.contactEmail)) || '').trim();

    const PRODUCTION_DEFAULTS = [
        { id: 'YRMbB6aq4CMevSrLWkQvoVMtc8b2', email: 'mwtradingsolutions@gmail.com' },
        { id: '0Uled5estVeQVN8cChmMTNRDNIE3', email: 'kdkumbukaagro@gmail.com' },
        { id: 'SPRANZA_PVT_LTD', email: 'spranzaceylon@gmail.com' }
    ];

    async function guardSuperAdmin(user) {
        const token = await user.getIdTokenResult(true).catch(() => null);
        const claimAdmin = !!(token && token.claims && (token.claims.admin === true || token.claims.superAdmin === true));
        const udoc = await db.collection('users').doc(user.uid).get().catch(() => null);
        const u = udoc && udoc.exists ? (udoc.data() || {}) : {};
        const docAdmin = u.superAdmin === true || String(u.role || '').toUpperCase() === 'SUPER_ADMIN';
        state.superAdmin = claimAdmin || docAdmin;
        if (!state.superAdmin) {
            window.location.href = '/modules/core/dashboard.html';
            return false;
        }
        return true;
    }

    async function appendAudit(businessId, payload) {
        const ref = db.collection('businesses').doc(businessId).collection('lockAuditLog').doc();
        await ref.set(Object.assign({
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        }, payload)).catch((e) => console.warn('lock audit log', e));
    }

    async function applyBusinessLock(businessId, patch, auditAction, auditExtra) {
        const actor = String((state.user && state.user.email) || '').trim();
        await db.collection('businesses').doc(businessId).set(patch, { merge: true });
        await appendAudit(businessId, Object.assign({
            action: auditAction,
            actorEmail: actor,
            businessId
        }, auditExtra || {}));
    }

    function openLockModal(businessId) {
        const b = state.businesses.find((x) => x.id === businessId);
        if (!b) return;
        state.pendingLockId = businessId;
        const name = (b && b.name) || businessId;
        $('lockModalBizName').textContent = name;
        $('lockModalLevel').value = normalizeLock(b).lockLevel;
        $('lockModalNote').value = '';
        $('lockModal').classList.add('show');
    }

    function closeLockModal() {
        state.pendingLockId = '';
        $('lockModal').classList.remove('show');
    }

    function filteredRows() {
        const q = String($('bizSearch').value || '').toLowerCase();
        return state.businesses.filter((b) => {
            const { lockStatus } = normalizeLock(b);
            if (state.filter === 'locked' && lockStatus !== 'LOCKED') return false;
            if (state.filter === 'unlocked' && lockStatus === 'LOCKED') return false;
            const email = ownerEmail(b).toLowerCase();
            if (!q) return true;
            return `${b.id} ${b.name || ''} ${email}`.toLowerCase().includes(q);
        });
    }

    function statusBadge(b) {
        const { lockStatus, lockLevel } = normalizeLock(b);
        if (lockStatus === 'LOCKED') {
            return `<span class="badge badge-locked">🟢 LOCKED</span><span class="small" style="margin-left:6px;">${safe(lockLevel)}</span>`;
        }
        return `<span class="badge badge-open">🔴 UNLOCKED</span>`;
    }

    function renderTable() {
        const rows = filteredRows();
        $('lockTableBody').innerHTML = rows.map((b) => {
            const { lockStatus, lockLevel } = normalizeLock(b);
            const em = ownerEmail(b) || '-';
            return `<tr data-bid="${safe(b.id)}" class="biz-row ${state.selectedId === b.id ? 'selected' : ''}">
                <td><strong>${safe(b.name || b.id)}</strong><div class="small"><code>${safe(b.id)}</code></div></td>
                <td>${safe(em)}</td>
                <td>${statusBadge(b)}</td>
                <td>${safe(lockLevel)}</td>
                <td>
                    <button class="btn alt btn-sm" data-act="lock" data-id="${safe(b.id)}" ${lockStatus === 'LOCKED' ? 'disabled' : ''}>Lock</button>
                    <button class="btn alt btn-sm" data-act="unlock" data-id="${safe(b.id)}" ${lockStatus !== 'LOCKED' ? 'disabled' : ''}>Unlock</button>
                    <button class="btn alt btn-sm" data-act="level" data-id="${safe(b.id)}" ${lockStatus !== 'LOCKED' ? 'disabled' : ''}>Change Level</button>
                </td>
            </tr>`;
        }).join('') || '<tr><td colspan="5" class="small">No businesses match the filter.</td></tr>';

        const locked = state.businesses.filter((x) => normalizeLock(x).lockStatus === 'LOCKED').length;
        const unlocked = state.businesses.length - locked;
        $('stTotal').textContent = String(state.businesses.length);
        $('stLocked').textContent = String(locked);
        $('stUnlocked').textContent = String(unlocked);

        document.querySelectorAll('#lockTableBody tr.biz-row').forEach((tr) => {
            tr.addEventListener('click', (ev) => {
                if (ev.target.closest('button')) return;
                const id = tr.getAttribute('data-bid');
                selectBusiness(id);
            });
        });
    }

    function selectBusiness(id) {
        state.selectedId = id || '';
        const b = state.businesses.find((x) => x.id === id);
        const panel = $('detailPanel');
        if (!b || !panel) {
            if (panel) panel.innerHTML = '<p class="small">Select a business row to view lock details.</p>';
            renderTable();
            return;
        }
        const { lockStatus, lockLevel } = normalizeLock(b);
        panel.innerHTML = `
            <h3>${safe(b.name || b.id)}</h3>
            <p class="small"><code>${safe(b.id)}</code></p>
            <p><strong>Status:</strong> ${statusBadge(b)}</p>
            <p><strong>Owner / contact email:</strong> ${safe(ownerEmail(b) || '-')}</p>
            <p><strong>Locked at:</strong> ${formatDate(b.lockedAt)}</p>
            <p><strong>Locked by:</strong> ${safe(b.lockedBy || '-')}</p>
            <p><strong>Note:</strong> ${safe(b.lockNote || '-')}</p>
            <p class="small">SOFT: blocks new modules &amp; admin dev pages only. MEDIUM/HARD: also blocks company settings &amp; billing.</p>
        `;
        renderTable();
    }

    async function loadBusinesses() {
        const snap = await db.collection('businesses').limit(1000).get();
        state.businesses = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        renderTable();
        if (state.selectedId) selectBusiness(state.selectedId);
    }

    async function confirmLockFromModal() {
        const businessId = state.pendingLockId;
        if (!businessId) return;
        const b = state.businesses.find((x) => x.id === businessId);
        const name = (b && b.name) || businessId;
        const level = String($('lockModalLevel').value || 'HARD').toUpperCase();
        const note = String($('lockModalNote').value || '').trim();
        const msg = `Lock ${name}? This will prevent code changes from affecting this business.`;
        if (!window.confirm(msg)) return;
        const actor = String((state.user && state.user.email) || '').trim();
        await applyBusinessLock(businessId, {
            lockStatus: 'LOCKED',
            lockLevel: level,
            lockedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lockedBy: actor,
            lockNote: note || (b && b.lockNote) || ''
        }, 'LOCK', { lockLevel: level, lockNote: note });
        closeLockModal();
        toast('Business locked.', 'ok');
        await loadBusinesses();
    }

    async function onUnlockClick(businessId) {
        const b = state.businesses.find((x) => x.id === businessId);
        const name = (b && b.name) || businessId;
        const phrase = window.prompt('Type UNLOCK to confirm unlocking this business:');
        if (phrase !== 'UNLOCK') {
            toast('Unlock cancelled.', 'warn');
            return;
        }
        if (!window.confirm(`⚠️ Unlock ${name}? Changes to other businesses COULD affect this one.`)) return;
        await applyBusinessLock(businessId, {
            lockStatus: 'UNLOCKED',
            lockLevel: 'HARD',
            lockedAt: null,
            lockedBy: '',
            lockNote: ''
        }, 'UNLOCK', {});
        toast('Business unlocked.', 'warn');
        await loadBusinesses();
    }

    async function onLevelClick(businessId) {
        const level = window.prompt('New lock level (SOFT / MEDIUM / HARD):', 'HARD');
        if (!level) return;
        const up = String(level).toUpperCase().trim();
        if (up !== 'SOFT' && up !== 'MEDIUM' && up !== 'HARD') {
            toast('Invalid level.', 'warn');
            return;
        }
        await applyBusinessLock(businessId, { lockLevel: up }, 'LEVEL_CHANGE', { lockLevel: up });
        toast('Lock level updated.', 'ok');
        await loadBusinesses();
    }

    async function bulkLockUnlocked() {
        const rows = filteredRows().filter((b) => normalizeLock(b).lockStatus !== 'LOCKED');
        if (!rows.length) {
            toast('No unlocked businesses in the current filter.', 'warn');
            return;
        }
        const level = String($('bulkLockLevel').value || 'HARD').toUpperCase();
        const note = String($('bulkLockNote').value || '').trim();
        if (!window.confirm(`Lock ${rows.length} unlocked business(es) at level ${level}?`)) return;
        const actor = String((state.user && state.user.email) || '').trim();
        for (let i = 0; i < rows.length; i += 1) {
            const id = rows[i].id;
            await applyBusinessLock(id, {
                lockStatus: 'LOCKED',
                lockLevel: level,
                lockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lockedBy: actor,
                lockNote: note || 'Bulk lock — completed businesses'
            }, 'BULK_LOCK', { lockLevel: level, lockNote: note, bulkIndex: i, bulkTotal: rows.length });
        }
        toast(`Locked ${rows.length} businesses.`, 'ok');
        await loadBusinesses();
    }

    async function seedProductionDefaults() {
        if (!window.confirm('Apply HARD lock to MW Trading, KUBUKA Tea, and SPRANZA (recommended production defaults)?')) return;
        const actor = String((state.user && state.user.email) || '').trim();
        for (let i = 0; i < PRODUCTION_DEFAULTS.length; i += 1) {
            const row = PRODUCTION_DEFAULTS[i];
            await applyBusinessLock(row.id, {
                lockStatus: 'LOCKED',
                lockLevel: 'HARD',
                lockedAt: firebase.firestore.FieldValue.serverTimestamp(),
                lockedBy: actor,
                lockNote: `Production default — ${row.email}`
            }, 'SEED_DEFAULT', { preset: 'production_triad', targetEmail: row.email });
        }
        toast('Production businesses set to LOCKED / HARD.', 'ok');
        await loadBusinesses();
    }

    function wireUi() {
        $('btnRefresh').addEventListener('click', () => loadBusinesses());
        $('bizSearch').addEventListener('input', () => renderTable());
        document.querySelectorAll('[data-filter]').forEach((btn) => {
            btn.addEventListener('click', () => {
                state.filter = btn.getAttribute('data-filter') || 'all';
                document.querySelectorAll('[data-filter]').forEach((b) => b.classList.toggle('active', b === btn));
                renderTable();
            });
        });
        $('btnBulkLock').addEventListener('click', () => bulkLockUnlocked());
        $('btnSeedDefaults').addEventListener('click', () => seedProductionDefaults());
        $('lockTableBody').addEventListener('click', (ev) => {
            const btn = ev.target.closest('button[data-act]');
            if (!btn) return;
            const id = btn.getAttribute('data-id');
            const act = btn.getAttribute('data-act');
            if (!id) return;
            if (act === 'lock') openLockModal(id);
            if (act === 'unlock') onUnlockClick(id);
            if (act === 'level') onLevelClick(id);
        });
        $('lockModalCancel').addEventListener('click', () => closeLockModal());
        $('lockModalConfirm').addEventListener('click', () => confirmLockFromModal());
        $('lockModal').addEventListener('click', (ev) => {
            if (ev.target.id === 'lockModal') closeLockModal();
        });
        $('btnTheme').addEventListener('click', () => {
            document.body.classList.toggle('light');
        });
    }

    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            window.location.href = '/auth/login.html';
            return;
        }
        state.user = user;
        const ok = await guardSuperAdmin(user);
        if (!ok) return;
        wireUi();
        await loadBusinesses();
    });
})();
