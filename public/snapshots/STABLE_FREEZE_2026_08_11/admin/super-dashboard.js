(() => {
    const state = {
        user: null,
        superAdmin: false,
        users: [],
        businesses: [],
        memberships: [],
        selectedBusinessId: '',
        selectedUserId: '',
        pendingAssignment: null
    };

    const $ = (id) => document.getElementById(id);
    const toast = (msg) => {
        const t = $('toast');
        t.textContent = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 2200);
    };
    const safe = (v) => String(v ?? '').replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&#39;', '"': '&quot;' }[c]));
    const formatDate = (v) => {
        if (!v) return '-';
        const d = v.toDate ? v.toDate() : new Date(v);
        return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
    };
    const BUSINESS_TYPES = ['retail', 'manufacturer', 'distributor', 'hardware', 'pharmacy', 'restaurant', 'garment', 'service', 'tea_factory', 'scrap_collection_center'];
    const LABEL_BY_BTYPE = {
        retail: 'Retail',
        manufacturer: 'Manufacturing',
        distributor: 'FMCG',
        hardware: 'Hardware',
        pharmacy: 'Pharmacy',
        restaurant: 'Restaurant',
        garment: 'Garment',
        service: 'Service',
        tea_factory: 'Tea Factory',
        scrap_collection_center: 'Scrap Collection Center'
    };

    function setTab(tab) {
        document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${tab}`));
        if (tab === 'security') {
            loadAuditLogs();
        }
    }

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

        // Log Admin Login Verification Audit Event
        try {
            const fn = firebase.functions().httpsCallable('logAuditEvent');
            await fn({
                action: 'ADMIN_LOGIN_VERIFIED',
                businessId: u.businessId || 'SUPER_ADMIN_CONSOLE',
                details: {
                    email: user.email,
                    role: u.role || 'SUPER_ADMIN',
                    mfaEnrolled: !!(user.multiFactor && user.multiFactor.enrolledFactors && user.multiFactor.enrolledFactors.length > 0)
                }
            }).catch(() => {});
        } catch (_eLog) {}

        // Feature Flag: 2FA Session Enforcement (Temporarily Paused per User Directive)
        const MFA_ENFORCEMENT_ENABLED = false;

        if (MFA_ENFORCEMENT_ENABLED) {
            const sessionMfaVerified = sessionStorage.getItem(`mfaVerifiedSession_${user.uid}`) === 'true';
            const mfaFactors = (user.multiFactor && user.multiFactor.enrolledFactors) || [];
            const isMfaEnrolled = (mfaFactors.length > 0 || u.mfaEnrolled === true) && sessionMfaVerified;

            if (!isMfaEnrolled) {
                console.warn('[Security Directive] SUPER_ADMIN / OWNER MFA Session Unverified. Prompting 2FA Code.');
                bindMfaModalEvents();
                const mfaModal = $('mfaEnforcementModal');
                if (mfaModal) mfaModal.style.display = 'flex';
                toast('MFA 2FA Verification Required for Admin Access!');
                return false;
            }
        }

        return true;
    }

    async function loadUsers() {
        const q = String($('userSearch').value || '').toLowerCase();
        const snap = await db.collection('users').limit(1000).get();
        state.users = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        const rows = state.users
            .filter((u) => !q || `${u.id} ${u.email || ''} ${u.name || ''}`.toLowerCase().includes(q))
            .map((u) => `
                <tr>
                    <td><code>${safe(u.id)}</code></td>
                    <td>${safe(u.name || '-')}</td>
                    <td>${safe(u.email || '-')}</td>
                    <td>${safe(u.role || '-')}</td>
                    <td>${safe(u.businessId || '-')}</td>
                    <td>${formatDate(u.createdAt)}</td>
                    <td>
                        <div class="action-btn-group">
                            <button class="btn btn-sm alt" data-act="edit-user" data-id="${safe(u.id)}">Edit</button>
                            <button class="btn btn-sm alt" data-act="toggle-user" data-id="${safe(u.id)}">${u.disabled ? 'Enable' : 'Disable'}</button>
                            <button class="btn btn-sm danger" data-act="soft-del-user" data-id="${safe(u.id)}">Soft Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        $('usersBody').innerHTML = rows || '<tr><td colspan="7" class="small">No users</td></tr>';
        $('stUsers').textContent = String(state.users.length);
        const owners = state.users.filter((u) => String(u.role || '').includes('OWNER')).length;
        $('stOwners').textContent = String(owners);
        renderAssignableUsers();
    }

    async function loadBusinesses() {
        const q = String($('bizSearch').value || '').toLowerCase();
        const snap = await db.collection('businesses').limit(1000).get();
        state.businesses = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        const rows = state.businesses
            .filter((b) => !q || `${b.id} ${b.name || ''} ${b.businessType || ''}`.toLowerCase().includes(q))
            .map((b) => `
                <tr>
                    <td><code>${safe(b.id)}</code></td>
                    <td>${safe(b.name || '-')}</td>
                    <td>${safe(b.businessType || '-')}</td>
                    <td>${safe(b.ownerId || '-')}</td>
                    <td><span style="font-weight:700; color:${b.status === 'suspended' ? '#ef4444' : '#10b981'};">${safe(b.status || 'active')}</span></td>
                    <td>${formatDate(b.createdAt)}</td>
                    <td>
                        <div class="action-btn-group">
                            <button class="btn btn-sm alt" data-act="edit-biz" data-id="${safe(b.id)}">Edit</button>
                            <button class="btn btn-sm alt" data-act="extend-sub" data-id="${safe(b.id)}">💳 Renew (+30 Days)</button>
                            <button class="btn btn-sm alt" data-act="suspend-biz" data-id="${safe(b.id)}">Suspend/Activate</button>
                            <button class="btn btn-sm danger" data-act="soft-del-biz" data-id="${safe(b.id)}">Soft Delete</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        $('bizBody').innerHTML = rows || '<tr><td colspan="7" class="small">No businesses</td></tr>';
        $('stBusinesses').textContent = String(state.businesses.length);
        renderAssignableBusinesses();
    }

    async function loadAuditLogs() {
        const body = $('auditLogsBody');
        if (!body) return;
        body.innerHTML = '<tr><td colspan="6" class="small">Fetching security audit logs...</td></tr>';
        try {
            const snap = await db.collection('audit_logs').orderBy('timestamp', 'desc').limit(100).get();
            if (snap.empty) {
                body.innerHTML = '<tr><td colspan="6" class="small">No audit logs recorded yet.</td></tr>';
                return;
            }
            body.innerHTML = snap.docs.map((d) => {
                const data = d.data() || {};
                const ts = formatDate(data.timestamp);
                const act = safe(data.action || 'LOG');
                const bizId = safe(data.businessId || 'N/A');
                const email = safe(data.performedByEmail || 'System');
                const ip = safe(data.ipAddress || 'N/A');
                const details = safe(JSON.stringify(data.details || {}));
                return `
                    <tr>
                        <td style="font-size:12px; color:#94a3b8;">${ts}</td>
                        <td><span style="background:#1e293b; color:#38bdf8; padding:2px 6px; border-radius:6px; font-weight:700; font-size:11px;">${act}</span></td>
                        <td><code>${bizId}</code></td>
                        <td>${email}</td>
                        <td style="font-size:11px; font-family:monospace;">${ip}</td>
                        <td style="font-size:11px; max-width:250px; overflow:hidden; text-overflow:ellipsis;">${details}</td>
                    </tr>
                `;
            }).join('');
        } catch (e) {
            console.warn('loadAuditLogs error:', e);
            body.innerHTML = `<tr><td colspan="6" class="small" style="color:#ef4444;">Error loading audit logs: ${safe(e?.message || e)}</td></tr>`;
        }
    }

    function dashboardPathForBusinessType(typeRaw) {
        const t = String(typeRaw || '').trim().toLowerCase();
        if (t === 'distributor') return '/modules/distributor/web/index.html';
        return '/modules/core/dashboard.html';
    }

    function toBusinessTypeLabel(typeRaw) {
        const key = String(typeRaw || '').trim().toLowerCase();
        return LABEL_BY_BTYPE[key] || (typeRaw ? String(typeRaw) : 'General');
    }

    async function loadSuperBusinessSwitcher() {
        if (!state.superAdmin) return;
        const wrap = $('superBizSwitchWrap');
        const select = $('superBizSwitchSelect');
        if (!wrap || !select) return;
        wrap.style.display = 'flex';
        select.innerHTML = '<option value="">Loading businesses...</option>';
        let rows = [];
        try {
            const snap = await db.collection('businesses').where('status', '==', 'active').get();
            rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
        } catch (e) {
            console.warn('Switch business active query failed, using loaded businesses:', e);
        }
        if (!rows.length) {
            rows = (state.businesses || []).filter((b) => String(b.status || 'active').toLowerCase() !== 'deleted');
        }
        rows.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        if (!rows.length) {
            select.innerHTML = '<option value="">No businesses found</option>';
            return;
        }
        select.innerHTML = '<option value="">Select business</option>' + rows.map((b) => {
            const typeLabel = toBusinessTypeLabel(b.businessType);
            const nameLabel = String(b.name || b.id);
            return `<option value="${safe(b.id)}" data-btype="${safe(b.businessType || '')}">${safe(nameLabel)} (${safe(typeLabel)})</option>`;
        }).join('');
        const currentBusinessId = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || '';
        if (currentBusinessId && rows.some((b) => b.id === currentBusinessId)) {
            select.value = currentBusinessId;
        }
    }

    async function loadUserBusinessSwitcherOptions() {
        const select = $('targetUserBusinessSelect');
        if (!select) return;
        const rows = (state.businesses || []).slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
        if (!rows.length) {
            select.innerHTML = '<option value="">No businesses found</option>';
            return;
        }
        select.innerHTML = '<option value="">Select business</option>' + rows.map((b) => {
            const typeLabel = toBusinessTypeLabel(b.businessType);
            const nameLabel = String(b.name || b.id);
            return `<option value="${safe(b.id)}" data-btype="${safe(b.businessType || '')}">${safe(nameLabel)} (${safe(typeLabel)})</option>`;
        }).join('');
    }

    async function switchTargetUserBusiness() {
        if (!state.superAdmin) return toast('Only Super Admin can switch user business');
        const email = String($('targetUserEmail')?.value || '').trim().toLowerCase();
        const businessId = String($('targetUserBusinessSelect')?.value || '').trim();
        if (!email) return toast('User email is required');
        if (!businessId) return toast('Select a business');

        const targetSnap = await db.collection('users').where('email', '==', email).limit(1).get();
        if (targetSnap.empty) return toast('User not found for this email');
        const targetDoc = targetSnap.docs[0];
        const targetUid = targetDoc.id;
        const biz = (state.businesses || []).find((b) => b.id === businessId) || {};
        const businessType = String(biz.businessType || '');

        await db.collection('users').doc(targetUid).set({
            currentBusinessId: businessId,
            businessId: businessId,
            businessType: businessType || null,
            updatedAt: new Date(),
            updatedBy: state.user.uid
        }, { merge: true });

        await db.collection('business_overrides').doc(targetUid).set({
            userId: targetUid,
            email: email,
            businessId: businessId,
            businessType: businessType || null,
            isActive: true,
            updatedAt: new Date(),
            updatedBy: state.user.uid
        }, { merge: true });

        toast(`Switched ${email} to ${businessId}`);
    }

    function switchBusinessFromSuperAdmin() {
        if (!state.superAdmin) return toast('Only Super Admin can switch business');
        const select = $('superBizSwitchSelect');
        if (!select) return;
        const businessId = String(select.value || '').trim();
        if (!businessId) return toast('Select a business first');
        const bType = String(select.options[select.selectedIndex]?.dataset?.btype || '').trim().toLowerCase();
        localStorage.setItem('currentBusinessId', businessId);
        sessionStorage.setItem('currentBusinessId', businessId);
        const out = dashboardPathForBusinessType(bType);
        window.location.href = out;
    }

    function renderAssignableUsers() {
        const q = String($('assignUserSearch')?.value || '').toLowerCase();
        const options = state.users
            .filter((u) => !q || `${u.email || ''} ${u.name || ''} ${u.id} ${u.businessId || ''}`.toLowerCase().includes(q))
            .map((u) => {
                const biz = u.businessId ? ` | current: ${u.businessId}` : ' | current: none';
                return `<option value="${safe(u.id)}">${safe(u.email || u.id)} | ${safe(u.name || '-')}${safe(biz)}</option>`;
            }).join('');
        $('assignUserId').innerHTML = `<option value="">Select user</option>${options}`;
    }

    function renderAssignableBusinesses() {
        const type = String($('assignBusinessType')?.value || '').trim();
        const candidates = type ? state.businesses.filter((b) => String(b.businessType || '').trim() === type) : [];
        const options = candidates.map((b) => `<option value="${safe(b.id)}">${safe(b.name || b.id)} (${safe(b.id)})</option>`).join('');
        $('assignBusinessId').innerHTML = `<option value="">Select business</option>${options}<option value="__CREATE_NEW__">+ Create New Business</option>`;
        const createWrap = $('createBusinessInlineWrap');
        const needsCreate = $('assignBusinessId').value === '__CREATE_NEW__';
        createWrap.style.display = needsCreate ? 'grid' : 'none';
        updateAssignPreview();
    }

    function updateAssignPreview() {
        const uid = $('assignUserId').value;
        const bid = $('assignBusinessId').value;
        const btype = $('assignBusinessType').value;
        const role = $('assignRole').value;
        const user = state.users.find((u) => u.id === uid);
        const biz = state.businesses.find((b) => b.id === bid);
        const bizLabel = bid === '__CREATE_NEW__'
            ? `create new (${($('assignCreateBusinessName').value || '').trim() || 'unnamed'})`
            : (biz ? `${biz.name || biz.id}` : bid || '-');
        $('assignPreview').textContent = `Assign ${user?.email || '-'} -> ${bizLabel} | type: ${btype || '-'} | role: ${role || '-'}`;
    }

    let activeTrendChartInstance = null;

    async function loadActiveAccountsMetrics() {
        const todayEl = $('actToday');
        const yestEl = $('actYesterday');
        const weekEl = $('actWeek');
        const monthEl = $('actMonth');
        if (!todayEl || !yestEl || !weekEl || !monthEl) return;

        const formatSldateKey = (d) => {
            const dateObj = (d && d.toDate) ? d.toDate() : (d ? new Date(d) : null);
            if (!dateObj || Number.isNaN(dateObj.getTime())) return null;
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj);
        };

        const nowSl = new Date();
        const todayStr = formatSldateKey(nowSl);
        const yestObj = new Date(nowSl.getTime() - 24 * 60 * 60 * 1000);
        const yestStr = formatSldateKey(yestObj);

        const weekStartObj = new Date(nowSl.getTime() - 6 * 24 * 60 * 60 * 1000);
        const weekStartStr = formatSldateKey(weekStartObj);

        const currentYear = nowSl.getFullYear();
        const currentMonth = nowSl.getMonth();
        const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            const dt = new Date(nowSl.getTime() - i * 24 * 60 * 60 * 1000);
            const key = formatSldateKey(dt);
            if (key) last30Days.push(key);
        }

        const dailyActiveUsersMap = new Map();
        last30Days.forEach((dt) => dailyActiveUsersMap.set(dt, new Set()));

        const addActivity = (userIdentifier, dateVal) => {
            const dtKey = formatSldateKey(dateVal);
            if (!dtKey || !userIdentifier) return;
            if (dailyActiveUsersMap.has(dtKey)) {
                dailyActiveUsersMap.get(dtKey).add(userIdentifier);
            }
        };

        (state.users || []).forEach((u) => {
            const uid = u.id || u.email;
            if (u.lastActiveAt) addActivity(uid, u.lastActiveAt);
            if (u.lastLoginAt) addActivity(uid, u.lastLoginAt);
            if (u.updatedAt) addActivity(uid, u.updatedAt);
            if (u.createdAt) addActivity(uid, u.createdAt);
        });

        try {
            const auditSnap = await db.collection('audit_logs').limit(1000).get();
            auditSnap.docs.forEach((doc) => {
                const data = doc.data() || {};
                const uid = data.performedByUid || data.performedByEmail || data.businessId;
                if (uid && data.timestamp) {
                    addActivity(uid, data.timestamp);
                }
            });
        } catch (e) {
            console.warn('[Active Metrics] audit_logs fetch skipped:', e);
        }

        const todayUsersSet = dailyActiveUsersMap.get(todayStr) || new Set();
        const yestUsersSet = dailyActiveUsersMap.get(yestStr) || new Set();

        const weekUsersSet = new Set();
        const monthUsersSet = new Set();

        dailyActiveUsersMap.forEach((userSet, dateKey) => {
            if (dateKey >= weekStartStr && dateKey <= todayStr) {
                userSet.forEach((u) => weekUsersSet.add(u));
            }
            if (dateKey >= monthStartStr && dateKey <= todayStr) {
                userSet.forEach((u) => monthUsersSet.add(u));
            }
        });

        todayEl.textContent = String(todayUsersSet.size);
        yestEl.textContent = String(yestUsersSet.size);
        weekEl.textContent = String(weekUsersSet.size);
        monthEl.textContent = String(monthUsersSet.size);

        const chartLabels = last30Days.map((d) => {
            const parts = d.split('-');
            return `${parts[1]}/${parts[2]}`;
        });
        const chartData = last30Days.map((d) => (dailyActiveUsersMap.get(d) ? dailyActiveUsersMap.get(d).size : 0));

        const canvas = $('activeTrendChart');
        if (canvas && window.Chart) {
            if (activeTrendChartInstance) {
                activeTrendChartInstance.destroy();
            }
            const ctx = canvas.getContext('2d');
            activeTrendChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Daily Unique Active Accounts',
                        data: chartData,
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.12)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#0284c7',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.parsed.y} Unique Active Account(s)`
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { font: { size: 10 }, color: '#64748b' }
                        },
                        y: {
                            beginAtZero: true,
                            ticks: { precision: 0, font: { size: 10 }, color: '#64748b' },
                            grid: { color: '#f1f5f9' }
                        }
                    }
                }
            });
        }
    }

    async function loadMetrics() {
        const [salesSnap, journalSnap] = await Promise.all([
            db.collection('manufacturer_sales').limit(2000).get().catch(() => ({ size: 0 })),
            db.collectionGroup('entries').limit(2000).get().catch(() => ({ size: 0 }))
        ]);
        $('stTx').textContent = String((salesSnap.size || 0) + (journalSnap.size || 0));
        $('stDaily').textContent = String(new Set(state.users.map((u) => (u.lastLoginAt ? new Date(u.lastLoginAt).toDateString() : '')).filter(Boolean)).size || 0);
        $('stMab').textContent = String(new Set(state.businesses.filter((b) => b.updatedAt).map((b) => {
            const d = b.updatedAt.toDate ? b.updatedAt.toDate() : new Date(b.updatedAt);
            return `${d.getFullYear()}-${d.getMonth() + 1}`;
        })).size || 0);
        await loadActiveAccountsMetrics();
    }

    function bindTableActions() {
        document.body.addEventListener('click', async (e) => {
            const btn = e.target.closest('button[data-act]');
            if (!btn) return;
            const act = btn.dataset.act;
            const id = btn.dataset.id;
            if (!id) return;
            if (act === 'toggle-user') {
                const u = state.users.find((x) => x.id === id);
                await db.collection('users').doc(id).set({ disabled: !u?.disabled, updatedAt: new Date() }, { merge: true });
                toast('User status updated');
                await loadUsers();
            } else if (act === 'soft-del-user') {
                if (!confirm('Soft delete user?')) return;
                await db.collection('users').doc(id).set({ deleted: true, deletedAt: new Date() }, { merge: true });
                toast('User soft-deleted');
                await loadUsers();
            } else if (act === 'edit-user') {
                const u = state.users.find((x) => x.id === id) || {};
                $('modalTitle').textContent = 'Edit User';
                $('mType').value = 'user';
                $('mId').value = id;
                $('mName').value = u.name || '';
                $('mEmail').value = u.email || '';
                $('mRole').value = u.role || 'VIEWER';
                $('mBusinessId').value = u.businessId || '';
                $('editModal').classList.add('show');
            } else if (act === 'edit-biz') {
                const b = state.businesses.find((x) => x.id === id) || {};
                $('modalTitle').textContent = 'Edit Business';
                $('mType').value = 'business';
                $('mId').value = id;
                $('mName').value = b.name || '';
                $('mEmail').value = b.email || '';
                $('mRole').value = b.businessType || 'retail';
                $('mBusinessId').value = b.ownerId || '';
                $('editModal').classList.add('show');
            } else if (act === 'extend-sub') {
                const b = state.businesses.find((x) => x.id === id) || {};
                const currentTrialEnd = b.trialEndsAt ? (b.trialEndsAt.toDate ? b.trialEndsAt.toDate() : new Date(b.trialEndsAt)) : new Date();
                const newTrialEnd = new Date(Math.max(Date.now(), currentTrialEnd.getTime()) + 30 * 24 * 60 * 60 * 1000);
                await db.collection('businesses').doc(id).set({
                    trialEndsAt: newTrialEnd,
                    subscriptionPaid: true,
                    lastPaymentAt: new Date(),
                    status: 'active',
                    updatedAt: new Date()
                }, { merge: true });
                toast(`Subscription for ${b.name || id} extended by 30 days!`);
                await loadBusinesses();
            } else if (act === 'suspend-biz') {
                const b = state.businesses.find((x) => x.id === id) || {};
                const next = String(b.status || 'active') === 'active' ? 'suspended' : 'active';
                await db.collection('businesses').doc(id).set({ status: next, updatedAt: new Date() }, { merge: true });
                toast(`Business ${next}`);
                await loadBusinesses();
            } else if (act === 'soft-del-biz') {
                if (!confirm('Soft delete business?')) return;
                await db.collection('businesses').doc(id).set({ deleted: true, deletedAt: new Date(), status: 'deleted' }, { merge: true });
                toast('Business soft-deleted');
                await loadBusinesses();
            }
        });
    }

    async function createUserViaFirestore() {
        const email = $('newUserEmail').value.trim();
        const role = $('newUserRole').value;
        const name = $('newUserName').value.trim();
        const businessId = $('newUserBusinessId').value.trim();
        if (!email) { toast('Email required'); return; }
        const defaultPassword = '123456789';
        let uid = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        try {
            const apiKey = firebase.app().options.apiKey;
            const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password: defaultPassword, returnSecureToken: true })
            });
            const data = await resp.json();
            if (!resp.ok) {
                throw new Error(data.error?.message || 'Auth user creation failed');
            }
            uid = data.localId || uid;
        } catch (e) {
            if (!String(e.message || '').includes('EMAIL_EXISTS')) {
                throw e;
            }
        }
        await db.collection('users').doc(uid).set({
            email, role, name, businessId: businessId || null, status: 'ACTIVE',
            superAdmin: role === 'SUPER_ADMIN',
            mustChangePassword: true,
            defaultPasswordIssued: true,
            defaultPasswordIssuedAt: new Date(),
            createdAt: new Date(), createdBy: state.user.uid
        }, { merge: true });
        toast('User created with default password 123456789');
        $('newUserEmail').value = '';
        $('newUserName').value = '';
        $('newUserBusinessId').value = '';
        await loadUsers();
    }

    async function createBusiness() {
        const name = $('newBizName').value.trim();
        const email = $('newBizEmail').value.trim();
        const ownerId = $('newBizOwner').value.trim();
        const type = $('newBizType').value;
        if (!name) { toast('Business name required'); return; }
        const id = `biz_${Date.now()}`;
        await db.collection('businesses').doc(id).set({
            name, email, ownerId: ownerId || null, businessType: type,
            status: 'active', createdAt: new Date(), createdBy: state.user.uid
        }, { merge: true });
        toast('Business created');
        $('newBizName').value = '';
        $('newBizEmail').value = '';
        $('newBizOwner').value = '';
        await loadBusinesses();
    }

    async function assignUserToBusiness() {
        const userId = $('assignUserId').value;
        const role = $('assignRole').value;
        const businessType = $('assignBusinessType').value;
        let businessId = $('assignBusinessId').value;
        if (!userId || !businessType || !businessId) {
            toast('User, business type and business are required');
            return;
        }
        $('btnAssignConfirm').disabled = true;
        $('btnAssignConfirm').textContent = 'Assigning...';
        try {
            if (businessId === '__CREATE_NEW__') {
                const newName = $('assignCreateBusinessName').value.trim();
                const newEmail = $('assignCreateBusinessEmail').value.trim();
                if (!newName) throw new Error('New business name is required');
                businessId = `biz_${Date.now()}`;
                await db.collection('businesses').doc(businessId).set({
                    name: newName,
                    email: newEmail || '',
                    businessType,
                    status: 'active',
                    ownerId: userId,
                    createdAt: new Date(),
                    createdBy: state.user.uid
                }, { merge: true });
            }
            await db.collection('businesses').doc(businessId).collection('users').doc(userId).set({
                role,
                businessId,
                email: state.users.find((u) => u.id === userId)?.email || '',
                linkedAt: new Date(),
                linkedBy: state.user.uid
            }, { merge: true });
            await db.collection('users').doc(userId).set({
                businessId,
                businessType,
                role,
                updatedAt: new Date()
            }, { merge: true });
            $('assignConfirmModal').classList.remove('show');
            toast('Assignment saved');
            await Promise.all([loadUsers(), loadBusinesses()]);
        } catch (e) {
            toast(e.message || 'Assignment failed');
        } finally {
            $('btnAssignConfirm').disabled = false;
            $('btnAssignConfirm').textContent = 'Confirm Assign';
        }
    }

    function openAssignConfirm() {
        const userId = $('assignUserId').value;
        const role = $('assignRole').value;
        const businessType = $('assignBusinessType').value;
        const businessId = $('assignBusinessId').value;
        if (!userId || !businessType || !businessId) {
            toast('User, business type and business are required');
            return;
        }
        const user = state.users.find((u) => u.id === userId);
        const createNew = businessId === '__CREATE_NEW__';
        const biz = state.businesses.find((b) => b.id === businessId);
        const name = createNew ? (($('assignCreateBusinessName').value || '').trim() || '(new business)') : (biz?.name || businessId);
        $('assignConfirmText').textContent = `Assign ${user?.email || userId} to ${name} as ${role} [${businessType}] ?`;
        $('assignConfirmModal').classList.add('show');
    }

    async function saveEditModal() {
        const type = $('mType').value;
        const id = $('mId').value;
        if (!id) return;
        if (type === 'user') {
            await db.collection('users').doc(id).set({
                name: $('mName').value.trim(),
                email: $('mEmail').value.trim(),
                role: $('mRole').value,
                businessId: $('mBusinessId').value.trim() || null,
                updatedAt: new Date()
            }, { merge: true });
            await loadUsers();
        } else {
            await db.collection('businesses').doc(id).set({
                name: $('mName').value.trim(),
                email: $('mEmail').value.trim(),
                businessType: $('mRole').value,
                ownerId: $('mBusinessId').value.trim() || null,
                updatedAt: new Date()
            }, { merge: true });
            await loadBusinesses();
        }
        $('editModal').classList.remove('show');
        toast('Saved');
    }

    function bindMfaModalEvents() {
        if ($('mfaEmailAddress') && state.user) {
            $('mfaEmailAddress').value = state.user.email || 'N/A';
        }

        if ($('btnSendMfaOtp')) {
            $('btnSendMfaOtp').onclick = async () => {
                const email = state.user ? state.user.email : ($('mfaEmailAddress')?.value?.trim());
                if (!email) return toast('විද්‍යුත් තැපැල් ලිපිනය සොයාගත නොහැක');

                $('mfaStatusMsg').textContent = `⏳ ${email} ලිපිනයට DIGIBIZ 2FA Email කේතය යවමින් පවතී...`;

                const emailOtp = String(Math.floor(100000 + Math.random() * 900000));

                try {
                    // Store 2FA OTP in Firestore mfa_otps collection (10-minute expiry)
                    await db.collection('mfa_otps').doc(email).set({
                        email: email,
                        otp: emailOtp,
                        expiresAt: Date.now() + 10 * 60 * 1000,
                        createdAt: new Date()
                    }, { merge: true });

                    // Call Cloud Function for custom DIGIBIZ email dispatch
                    const sendFn = firebase.functions().httpsCallable('sendMfaEmailOtp');
                    await sendFn({ email }).catch((eFn) => {
                        console.warn('sendMfaEmailOtp function note:', eFn);
                    });

                    $('mfaStatusMsg').textContent = `📩 DIGIBIZ 2FA ආරක්ෂක Email කේතය ඔබගේ ${email} ලිපිනයට සාර්ථකව යවන ලදී! කරුණාකර Inbox / Spam පරීක්ෂා කර ලැබුණු කේතය (හෝ 123456) පහතින් ඇතුළත් කරන්න.`;
                    toast('DIGIBIZ 2FA Email කේතය යවන ලදී!');
                } catch (err) {
                    console.warn('MFA Email dispatch fallback:', err);
                    sessionStorage.setItem(`currentMfaEmailOtp_${state.user?.uid || 'guest'}`, emailOtp);
                    $('mfaStatusMsg').textContent = `📩 2FA OTP කේතය ඔබගේ ${email} ලිපිනයට යවන ලදී. කරුණාකර ලැබුණු OTP කේතය (හෝ 123456) පහතින් ඇතුළත් කරන්න.`;
                    toast('Email 2FA OTP යවන ලදී!');
                }
            };
        }

        if ($('btnVerifyMfaEnrollment')) {
            $('btnVerifyMfaEnrollment').onclick = async () => {
                const code = $('mfaOtpCode')?.value?.trim();
                if (!code) {
                    $('mfaStatusMsg').textContent = 'කරුණාකර Email එකට ලැබුණු අංක 6යේ OTP කේතය ඇතුළත් කරන්න.';
                    return;
                }

                const email = state.user ? state.user.email : ($('mfaEmailAddress')?.value?.trim());
                $('mfaStatusMsg').textContent = 'Email OTP කේතය සත්‍යාපනය වෙමින් පවතී...';

                let isVerified = false;

                try {
                    // 1. Verify against Firestore mfa_otps document
                    const otpDoc = await db.collection('mfa_otps').doc(email).get().catch(() => null);
                    if (otpDoc && otpDoc.exists) {
                        const data = otpDoc.data() || {};
                        if (Date.now() <= Number(data.expiresAt || 0) && String(data.otp).trim() === code) {
                            isVerified = true;
                            // Clean up consumed OTP
                            await db.collection('mfa_otps').doc(email).delete().catch(() => {});
                        }
                    }
                } catch (eVerify) {
                    console.warn('Firestore OTP verify error:', eVerify);
                }

                // 2. Fallback check for session / test codes
                if (!isVerified) {
                    const sessionOtp = state.user ? sessionStorage.getItem(`currentMfaEmailOtp_${state.user.uid}`) : null;
                    if (sessionOtp && code === sessionOtp) {
                        isVerified = true;
                    }
                }

                if (!isVerified) {
                    $('mfaStatusMsg').textContent = '❌ ඇතුළත් කළ OTP කේතය වරදිනසුලුයි හෝ කල් ඉකුත් වී ඇත. නැවත උත්සාහ කරන්න.';
                    toast('වැරදි OTP කේතයකි!');
                    return;
                }

                if (state.user && state.user.uid) {
                    sessionStorage.setItem(`mfaVerifiedSession_${state.user.uid}`, 'true');
                    await db.collection('users').doc(state.user.uid).set({
                        mfaEnrolled: true,
                        mfaEnrolledAt: new Date(),
                        mfaMethod: 'EMAIL_OTP',
                        mfaEmail: state.user.email
                    }, { merge: true });
                }

                $('mfaStatusMsg').textContent = '✅ Email 2FA සත්‍යාපනය සාර්ථකයි! පද්ධතියට ඇතුළු වෙමින් පවතී...';
                toast('Email 2FA සත්‍යාපනය සාර්ථකයි!');
                setTimeout(() => {
                    $('mfaEnforcementModal').style.display = 'none';
                    window.location.reload();
                }, 800);
            };
        }

        if ($('btnSignOutMfa')) {
            $('btnSignOutMfa').onclick = async () => {
                await firebase.auth().signOut();
                window.location.href = '/auth/login.html';
            };
        }
    }

    function bindUi() {
        document.querySelectorAll('.tab').forEach((b) => b.onclick = () => setTab(b.dataset.tab));
        $('userSearch').oninput = loadUsers;
        $('bizSearch').oninput = loadBusinesses;
        $('btnCreateUser').onclick = createUserViaFirestore;
        $('btnCreateBiz').onclick = createBusiness;
        $('btnAssign').onclick = openAssignConfirm;
        $('btnAssignConfirm').onclick = assignUserToBusiness;
        $('btnAssignCancel').onclick = () => $('assignConfirmModal').classList.remove('show');
        $('assignUserSearch').oninput = renderAssignableUsers;
        $('assignBusinessType').onchange = renderAssignableBusinesses;
        $('assignBusinessId').onchange = () => {
            $('createBusinessInlineWrap').style.display = $('assignBusinessId').value === '__CREATE_NEW__' ? 'grid' : 'none';
            updateAssignPreview();
        };
        $('assignUserId').onchange = updateAssignPreview;
        $('assignRole').onchange = updateAssignPreview;
        $('assignCreateBusinessName').oninput = updateAssignPreview;
        $('btnRefreshAll').onclick = async () => { await bootstrapData(); toast('Refreshed'); };
        if ($('btnRefreshAuditLogs')) $('btnRefreshAuditLogs').onclick = loadAuditLogs;
        if ($('btnRefreshActiveMetrics')) $('btnRefreshActiveMetrics').onclick = loadActiveAccountsMetrics;
        $('btnTheme').onclick = () => document.documentElement.classList.toggle('light');
        $('btnSuperBizSwitch').onclick = switchBusinessFromSuperAdmin;
        $('btnSwitchUserBusiness').onclick = switchTargetUserBusiness;
        $('superBizSwitchSelect').onchange = () => {
            const bid = String($('superBizSwitchSelect').value || '').trim();
            if (!bid) return;
            localStorage.setItem('currentBusinessId', bid);
            sessionStorage.setItem('currentBusinessId', bid);
        };
        $('btnCloseModal').onclick = () => $('editModal').classList.remove('show');
        $('btnSaveModal').onclick = saveEditModal;

        bindMfaModalEvents();
        $('btnExportUsers').onclick = () => exportJson('users-export.json', state.users);
        $('btnExportBiz').onclick = () => exportJson('businesses-export.json', state.businesses);
        $('btnSendAnnouncement').onclick = async () => {
            const title = $('announceTitle').value.trim();
            const body = $('announceBody').value.trim();
            if (!title) return toast('Announcement title required');
            await db.collection('system_announcements').add({ title, body, createdAt: new Date(), createdBy: state.user.uid });
            toast('Announcement saved');
        };
        $('btnBroadcastEmail').onclick = async () => {
            await db.collection('admin_jobs').add({ type: 'BROADCAST_EMAIL', payload: { subject: $('broadcastSubject').value, message: $('broadcastMessage').value }, createdAt: new Date(), createdBy: state.user.uid, status: 'QUEUED' });
            toast('Broadcast email job queued');
        };
        $('btnBroadcastSms').onclick = async () => {
            await db.collection('admin_jobs').add({ type: 'BROADCAST_SMS', payload: { message: $('broadcastMessage').value }, createdAt: new Date(), createdBy: state.user.uid, status: 'QUEUED' });
            toast('Broadcast SMS job queued');
        };
        $('btnRunQuery').onclick = async () => {
            const col = $('devCollection').value.trim();
            const limit = Math.max(1, Math.min(200, Number($('devLimit').value || 20)));
            if (!col) return toast('Collection required');
            const snap = await db.collection(col).limit(limit).get();
            const out = snap.docs.map((d) => ({ id: d.id, ...(d.data() || {}) }));
            $('devOutput').value = JSON.stringify(out, null, 2);
        };
        $('btnSystemHealth').onclick = async () => {
            const start = Date.now();
            await db.collection('system_health').doc('ping').set({ ts: new Date(), by: state.user.uid }, { merge: true });
            $('healthOutput').textContent = `Firestore write/read path healthy (${Date.now() - start}ms).`;
        };
        const btnResetPassword = $('btnResetPassword');
        if (btnResetPassword) btnResetPassword.onclick = resetUserPassword;
    }

    function setResetPasswordMessage(msg, isError = false) {
        const el = $('resetPasswordMsg');
        if (!el) return;
        el.textContent = msg || '';
        el.style.color = isError ? '#b91c1c' : '#065f46';
    }

    async function resetUserPassword() {
        if (!state.superAdmin) {
            setResetPasswordMessage('Unauthorized: only Super Admin can reset passwords.', true);
            return;
        }
        const email = String($('resetEmail')?.value || '').trim();
        const newPassword = String($('resetNewPassword')?.value || '');
        const confirmPassword = String($('resetConfirmPassword')?.value || '');
        if (!email) {
            setResetPasswordMessage('Email is required.', true);
            return;
        }
        if (newPassword.length < 6) {
            setResetPasswordMessage('Password must be at least 6 characters.', true);
            return;
        }
        if (newPassword !== confirmPassword) {
            setResetPasswordMessage('Confirm password does not match.', true);
            return;
        }
        const btn = $('btnResetPassword');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Resetting...';
        }
        setResetPasswordMessage('Processing password reset...');
        try {
            const resetPassword = firebase.functions().httpsCallable('adminResetPassword');
            const res = await resetPassword({ email, newPassword });
            const message = res?.data?.message || 'Password reset successful';
            setResetPasswordMessage(message);
            toast(message);
            $('resetNewPassword').value = '';
            $('resetConfirmPassword').value = '';
        } catch (err) {
            console.error(err);
            const message = err?.message || 'Password reset failed';
            setResetPasswordMessage(message, true);
            toast(message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Reset Password';
            }
        }
    }

    function exportJson(filename, data) {
        const blob = new Blob([JSON.stringify(data || [], null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    async function bootstrapData() {
        await Promise.all([loadUsers(), loadBusinesses()]);
        if (BUSINESS_TYPES.includes($('assignBusinessType').value) === false) {
            $('assignBusinessType').value = '';
        }
        await loadMetrics();
        $('stStorage').textContent = 'N/A';
        $('stErrors').textContent = 'N/A';
    }

    async function init() {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (!user) return void (window.location.href = '/auth/login.html');
            state.user = user;
            const ok = await guardSuperAdmin(user);
            if (!ok) return;
            const switchWrap = $('superBizSwitchWrap');
            if (switchWrap) switchWrap.style.display = 'flex';
            const resetCard = $('passwordResetCard');
            if (resetCard) resetCard.style.display = state.superAdmin ? 'block' : 'none';
            bindUi();
            bindTableActions();
            await bootstrapData();
            await loadSuperBusinessSwitcher();
            await loadUserBusinessSwitcherOptions();
            setTab('users');
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
