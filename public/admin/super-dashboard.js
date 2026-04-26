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

    function setTab(tab) {
        document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
        document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === `panel-${tab}`));
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
                        <button class="btn alt" data-act="edit-user" data-id="${safe(u.id)}">Edit</button>
                        <button class="btn alt" data-act="toggle-user" data-id="${safe(u.id)}">${u.disabled ? 'Enable' : 'Disable'}</button>
                        <button class="btn danger" data-act="soft-del-user" data-id="${safe(u.id)}">Soft Delete</button>
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
                    <td>${safe(b.status || 'active')}</td>
                    <td>${formatDate(b.createdAt)}</td>
                    <td>
                        <button class="btn alt" data-act="edit-biz" data-id="${safe(b.id)}">Edit</button>
                        <button class="btn alt" data-act="suspend-biz" data-id="${safe(b.id)}">Suspend/Activate</button>
                        <button class="btn danger" data-act="soft-del-biz" data-id="${safe(b.id)}">Soft Delete</button>
                    </td>
                </tr>
            `).join('');
        $('bizBody').innerHTML = rows || '<tr><td colspan="7" class="small">No businesses</td></tr>';
        $('stBusinesses').textContent = String(state.businesses.length);
        renderAssignableBusinesses();
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
        $('btnTheme').onclick = () => document.documentElement.classList.toggle('light');
        $('btnCloseModal').onclick = () => $('editModal').classList.remove('show');
        $('btnSaveModal').onclick = saveEditModal;

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
            bindUi();
            bindTableActions();
            await bootstrapData();
            setTab('users');
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
