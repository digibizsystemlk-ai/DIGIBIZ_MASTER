/**
 * Coconut Wholesale Module — Supplier Management Logic
 */

let appCtx = null;
let allSuppliers = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('suppliers');

    setupEventHandlers();
    await loadSuppliers();
});

function setupEventHandlers() {
    const modal = document.getElementById('supplierModal');
    document.getElementById('btnOpenNewSupplier').onclick = () => {
        document.getElementById('supForm').reset();
        document.getElementById('sEditId').value = '';
        document.getElementById('supModalTitle').textContent = '➕ Add Supplier';
        modal.classList.add('open');
    };
    document.getElementById('btnCloseSupModal').onclick = () => modal.classList.remove('open');
    document.getElementById('btnCancelSup').onclick = () => modal.classList.remove('open');

    document.getElementById('supForm').addEventListener('submit', handleSaveSupplier);

    document.getElementById('searchSupInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        renderSupplierTable(allSuppliers.filter(s =>
            (s.name && s.name.toLowerCase().includes(q)) ||
            (s.phone && s.phone.includes(q)) ||
            (s.area && s.area.toLowerCase().includes(q))
        ));
    });
}

async function loadSuppliers() {
    const db = window.CoconutModule.getDb();
    try {
        const snap = await db.collection('coconut_suppliers')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allSuppliers = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(s => s.isActive !== false)
            .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));

        let totalPayable = 0;
        allSuppliers.forEach(s => { totalPayable += (Number(s.balance) || 0); });

        document.getElementById('supTotalCount').textContent = `${allSuppliers.length} Suppliers`;
        document.getElementById('supTotalOutstanding').textContent = window.CoconutModule.fmtLKR(totalPayable);

        renderSupplierTable(allSuppliers);

    } catch (e) {
        console.error(e);
    }
}

function renderSupplierTable(list) {
    const body = document.getElementById('supplierTableBody');
    if (!list || !list.length) {
        body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--c-text-muted);">No suppliers registered yet.</td></tr>';
        return;
    }

    body.innerHTML = list.map(s => {
        const bal = Number(s.balance) || 0;
        return `
            <tr>
                <td><strong>${window.CoconutModule.esc(s.name)}</strong></td>
                <td>${window.CoconutModule.esc(s.phone || '-')}</td>
                <td>${window.CoconutModule.esc(s.area || '-')}</td>
                <td>${window.CoconutModule.esc(s.address || '-')}</td>
                <td class="text-right" style="font-weight:800; color:${bal > 0 ? 'var(--c-danger)' : 'var(--c-text-muted)'};">
                    ${window.CoconutModule.fmtLKR(bal)}
                </td>
                <td class="text-center">
                    <a href="ledgers.html?type=supplier&id=${s.id}" class="c-btn c-btn-secondary c-btn-sm" title="View Ledger">📖 Ledger</a>
                    <button class="c-btn c-btn-secondary c-btn-sm" onclick="handleEditSupplier('${s.id}')">✏️</button>
                    <button class="c-btn c-btn-danger c-btn-sm" onclick="handleDeleteSupplier('${s.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function handleEditSupplier(id) {
    const s = allSuppliers.find(x => x.id === id);
    if (!s) return;

    document.getElementById('sEditId').value = s.id;
    document.getElementById('sName').value = s.name || '';
    document.getElementById('sPhone').value = s.phone || '';
    document.getElementById('sArea').value = s.area || '';
    document.getElementById('sAddress').value = s.address || '';

    document.getElementById('supModalTitle').textContent = '✏️ Edit Supplier';
    document.getElementById('supplierModal').classList.add('open');
}

async function handleSaveSupplier(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const editId = document.getElementById('sEditId').value;
    const name = document.getElementById('sName').value.trim();
    const phone = document.getElementById('sPhone').value.trim();
    const area = document.getElementById('sArea').value.trim();
    const address = document.getElementById('sAddress').value.trim();

    try {
        if (editId) {
            await db.collection('coconut_suppliers').doc(editId).set({
                name,
                phone,
                area,
                address,
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });
            window.CoconutModule.showToast('Supplier updated!', 'success');
        } else {
            await db.collection('coconut_suppliers').add({
                businessId: bid,
                name,
                phone,
                area,
                address,
                balance: 0,
                isActive: true,
                createdAt: window.CoconutModule.tsToFirestore(new Date()),
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            });
            window.CoconutModule.showToast('Supplier created!', 'success');
        }

        document.getElementById('supplierModal').classList.remove('open');
        await loadSuppliers();

    } catch (err) {
        window.CoconutModule.showToast('Failed to save supplier: ' + err.message, 'error');
    }
}

async function handleDeleteSupplier(id) {
    if (!confirm('Are you sure you want to delete this supplier?')) return;
    const db = window.CoconutModule.getDb();
    try {
        await db.collection('coconut_suppliers').doc(id).set({
            isActive: false,
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        window.CoconutModule.showToast('Supplier removed', 'info');
        await loadSuppliers();
    } catch (e) {
        window.CoconutModule.showToast('Failed to remove supplier: ' + e.message, 'error');
    }
}
