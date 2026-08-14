/**
 * Coconut Wholesale Module — Staff Management Logic
 */

let appCtx = null;
let allStaff = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('staff');

    setupEventHandlers();
    await loadStaff();
});

function setupEventHandlers() {
    const modal = document.getElementById('staffModal');
    document.getElementById('btnOpenNewStaff').onclick = () => {
        document.getElementById('staffForm').reset();
        document.getElementById('stEditId').value = '';
        document.getElementById('staffModalTitle').textContent = '➕ Add Team Member';
        modal.classList.add('open');
    };
    document.getElementById('btnCloseStaffModal').onclick = () => modal.classList.remove('open');
    document.getElementById('btnCancelStaff').onclick = () => modal.classList.remove('open');

    document.getElementById('staffForm').addEventListener('submit', handleSaveStaff);
}

async function loadStaff() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('staffTableBody');

    try {
        const snap = await db.collection('coconut_staff')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allStaff = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(s => s.isActive !== false)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        if (!allStaff.length) {
            body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--c-text-muted);">No staff registered yet. Click "+ Add Team Member" to record staff.</td></tr>';
            return;
        }

        body.innerHTML = allStaff.map(s => `
            <tr>
                <td><strong>${window.CoconutModule.esc(s.name)}</strong></td>
                <td><span class="c-badge c-badge-neutral">${window.CoconutModule.esc(s.role)}</span></td>
                <td>${window.CoconutModule.esc(s.phone || '-')}</td>
                <td>${window.CoconutModule.esc(s.nic || '-')}</td>
                <td class="text-right">${s.wageRate ? window.CoconutModule.fmtLKR(s.wageRate) : '-'}</td>
                <td class="text-center">
                    <button class="c-btn c-btn-secondary c-btn-sm" onclick="handleEditStaff('${s.id}')">✏️</button>
                    <button class="c-btn c-btn-danger c-btn-sm" onclick="handleDeleteStaff('${s.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');

    } catch (e) {
        console.error(e);
    }
}

function handleEditStaff(id) {
    const s = allStaff.find(x => x.id === id);
    if (!s) return;

    document.getElementById('stEditId').value = s.id;
    document.getElementById('stName').value = s.name || '';
    document.getElementById('stRole').value = s.role || 'General Labor';
    document.getElementById('stPhone').value = s.phone || '';
    document.getElementById('stNic').value = s.nic || '';
    document.getElementById('stRate').value = s.wageRate || '';

    document.getElementById('staffModalTitle').textContent = '✏️ Edit Team Member';
    document.getElementById('staffModal').classList.add('open');
}

async function handleSaveStaff(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const editId = document.getElementById('stEditId').value;
    const name = document.getElementById('stName').value.trim();
    const role = document.getElementById('stRole').value;
    const phone = document.getElementById('stPhone').value.trim();
    const nic = document.getElementById('stNic').value.trim();
    const wageRate = Number(document.getElementById('stRate').value) || 0;

    try {
        if (editId) {
            await db.collection('coconut_staff').doc(editId).set({
                name,
                role,
                phone,
                nic,
                wageRate,
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });
            window.CoconutModule.showToast('Staff member updated!', 'success');
        } else {
            await db.collection('coconut_staff').add({
                businessId: bid,
                name,
                role,
                phone,
                nic,
                wageRate,
                isActive: true,
                createdAt: window.CoconutModule.tsToFirestore(new Date()),
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            });
            window.CoconutModule.showToast('Staff member registered!', 'success');
        }

        document.getElementById('staffModal').classList.remove('open');
        await loadStaff();

    } catch (err) {
        window.CoconutModule.showToast('Failed to save staff: ' + err.message, 'error');
    }
}

async function handleDeleteStaff(id) {
    if (!confirm('Are you sure you want to deactivate this staff member?')) return;
    const db = window.CoconutModule.getDb();
    try {
        await db.collection('coconut_staff').doc(id).set({
            isActive: false,
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        window.CoconutModule.showToast('Staff deactivated', 'info');
        await loadStaff();
    } catch (e) {
        window.CoconutModule.showToast('Failed to remove staff: ' + e.message, 'error');
    }
}
