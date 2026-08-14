/**
 * Coconut Wholesale Module — Customers Management Logic
 */

let appCtx = null;
let allCustomers = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('customers');

    setupEventHandlers();
    await loadCustomers();
});

function setupEventHandlers() {
    const modal = document.getElementById('customerModal');
    document.getElementById('btnOpenNewCustomer').onclick = () => {
        document.getElementById('custForm').reset();
        document.getElementById('cEditId').value = '';
        document.getElementById('custModalTitle').textContent = '➕ Add Customer';
        modal.classList.add('open');
    };
    document.getElementById('btnCloseCustModal').onclick = () => modal.classList.remove('open');
    document.getElementById('btnCancelCust').onclick = () => modal.classList.remove('open');

    document.getElementById('custForm').addEventListener('submit', handleSaveCustomer);

    document.getElementById('searchCustInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        renderCustomerTable(allCustomers.filter(c =>
            (c.name && c.name.toLowerCase().includes(q)) ||
            (c.phone && c.phone.includes(q)) ||
            (c.area && c.area.toLowerCase().includes(q))
        ));
    });
}

async function loadCustomers() {
    const db = window.CoconutModule.getDb();
    try {
        const snap = await db.collection('coconut_customers')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allCustomers = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(c => c.isActive !== false)
            .sort((a, b) => (Number(b.balance) || 0) - (Number(a.balance) || 0));

        let totalOutstanding = 0;
        allCustomers.forEach(c => { totalOutstanding += (Number(c.balance) || 0); });

        document.getElementById('custTotalCount').textContent = `${allCustomers.length} Buyers`;
        document.getElementById('custTotalOutstanding').textContent = window.CoconutModule.fmtLKR(totalOutstanding);

        renderCustomerTable(allCustomers);

    } catch (e) {
        console.error(e);
    }
}

function renderCustomerTable(list) {
    const body = document.getElementById('customerTableBody');
    if (!list || !list.length) {
        body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--c-text-muted);">No customers registered yet.</td></tr>';
        return;
    }

    body.innerHTML = list.map(c => {
        const bal = Number(c.balance) || 0;
        return `
            <tr>
                <td><strong>${window.CoconutModule.esc(c.name)}</strong></td>
                <td>${window.CoconutModule.esc(c.phone || '-')}</td>
                <td>${window.CoconutModule.esc(c.area || '-')}</td>
                <td>${window.CoconutModule.esc(c.address || '-')}</td>
                <td class="text-right" style="font-weight:800; color:${bal > 0 ? 'var(--c-danger)' : 'var(--c-text-muted)'};">
                    ${window.CoconutModule.fmtLKR(bal)}
                </td>
                <td class="text-center">
                    <a href="ledgers.html?type=customer&id=${c.id}" class="c-btn c-btn-secondary c-btn-sm" title="View Ledger">📖 Ledger</a>
                    <button class="c-btn c-btn-secondary c-btn-sm" onclick="handleEditCustomer('${c.id}')">✏️</button>
                    <button class="c-btn c-btn-danger c-btn-sm" onclick="handleDeleteCustomer('${c.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function handleEditCustomer(id) {
    const c = allCustomers.find(x => x.id === id);
    if (!c) return;

    document.getElementById('cEditId').value = c.id;
    document.getElementById('cName').value = c.name || '';
    document.getElementById('cPhone').value = c.phone || '';
    document.getElementById('cArea').value = c.area || '';
    document.getElementById('cAddress').value = c.address || '';

    document.getElementById('custModalTitle').textContent = '✏️ Edit Customer';
    document.getElementById('customerModal').classList.add('open');
}

async function handleSaveCustomer(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const editId = document.getElementById('cEditId').value;
    const name = document.getElementById('cName').value.trim();
    const phone = document.getElementById('cPhone').value.trim();
    const area = document.getElementById('cArea').value.trim();
    const address = document.getElementById('cAddress').value.trim();

    try {
        if (editId) {
            await db.collection('coconut_customers').doc(editId).set({
                name,
                phone,
                area,
                address,
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });
            window.CoconutModule.showToast('Customer updated!', 'success');
        } else {
            await db.collection('coconut_customers').add({
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
            window.CoconutModule.showToast('Customer created!', 'success');
        }

        document.getElementById('customerModal').classList.remove('open');
        await loadCustomers();

    } catch (err) {
        window.CoconutModule.showToast('Failed to save customer: ' + err.message, 'error');
    }
}

async function handleDeleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    const db = window.CoconutModule.getDb();
    try {
        await db.collection('coconut_customers').doc(id).set({
            isActive: false,
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        window.CoconutModule.showToast('Customer removed', 'info');
        await loadCustomers();
    } catch (e) {
        window.CoconutModule.showToast('Failed to remove customer: ' + e.message, 'error');
    }
}
