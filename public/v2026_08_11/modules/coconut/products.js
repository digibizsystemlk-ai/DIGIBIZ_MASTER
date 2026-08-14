/**
 * Coconut Wholesale Module — Finished Products Management Logic
 */

let appCtx = null;
let allProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('products');

    setupEventHandlers();
    await loadProducts();
});

function setupEventHandlers() {
    const modal = document.getElementById('productModal');
    document.getElementById('btnOpenNewProduct').onclick = () => {
        document.getElementById('productForm').reset();
        document.getElementById('pEditId').value = '';
        document.getElementById('productModalTitle').textContent = '➕ Add Finished Product';
        document.getElementById('initialStockRow').style.display = 'grid';
        modal.classList.add('open');
    };
    document.getElementById('btnCloseProductModal').onclick = () => modal.classList.remove('open');
    document.getElementById('btnCancelProduct').onclick = () => modal.classList.remove('open');

    document.getElementById('productForm').addEventListener('submit', handleSaveProduct);

    document.getElementById('searchProductInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        renderProductsTable(allProducts.filter(p =>
            (p.name && p.name.toLowerCase().includes(q)) ||
            (p.sku && p.sku.toLowerCase().includes(q))
        ));
    });
}

async function loadProducts() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('productsTableBody');
    try {
        const snap = await db.collection('coconut_finished_products')
            .doc(appCtx.businessId)
            .collection('items')
            .get();

        allProducts = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(p => p.isActive !== false)
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

        let totalAsset = 0;
        let lowStockAlerts = 0;

        allProducts.forEach(p => {
            const q = Number(p.stockQty) || 0;
            const c = Number(p.unitCost) || 0;
            totalAsset += (q * c);
            if (q <= (Number(p.lowStockLevel) || 10)) lowStockAlerts++;
        });

        document.getElementById('totalSkuCount').textContent = `${allProducts.length} Items`;
        document.getElementById('totalFgAssetVal').textContent = window.CoconutModule.fmtLKR(totalAsset);
        document.getElementById('lowStockAlertCount').textContent = `${lowStockAlerts} Alerts`;

        renderProductsTable(allProducts);

    } catch (e) {
        console.error(e);
        body.innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error loading products</td></tr>';
    }
}

function renderProductsTable(list) {
    const body = document.getElementById('productsTableBody');
    if (!list || !list.length) {
        body.innerHTML = '<tr><td colspan="9" class="text-center" style="padding:24px; color:var(--c-text-muted);">No finished products created yet. Click "+ Add New Product" to create one.</td></tr>';
        return;
    }

    body.innerHTML = list.map(p => {
        const qty = Number(p.stockQty) || 0;
        const cost = Number(p.unitCost) || 0;
        const price = Number(p.unitPrice) || 0;
        const total = qty * cost;
        const lowLvl = Number(p.lowStockLevel) || 10;
        const isLow = qty <= lowLvl;

        return `
            <tr>
                <td><strong>${window.CoconutModule.esc(p.name)}</strong></td>
                <td><span style="font-family:monospace; font-weight:600; color:#475569;">${window.CoconutModule.esc(p.sku || '-')}</span></td>
                <td>${window.CoconutModule.esc(p.unitName || 'Unit')}</td>
                <td class="text-right" style="font-weight:800; color:${isLow ? 'var(--c-danger)' : 'var(--c-text)'};">${window.CoconutModule.fmt(qty, 0)} ${p.unitName}</td>
                <td class="text-right">Rs. ${window.CoconutModule.fmt(cost, 2)}</td>
                <td class="text-right" style="font-weight:700; color:var(--c-primary);">Rs. ${window.CoconutModule.fmt(price, 2)}</td>
                <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(total)}</td>
                <td class="text-center">
                    ${isLow ? '<span class="c-badge c-badge-danger">Low Stock</span>' : '<span class="c-badge c-badge-success">In Stock</span>'}
                </td>
                <td class="text-center">
                    <button class="c-btn c-btn-secondary c-btn-sm" onclick="handleEditProduct('${p.id}')">✏️</button>
                    <button class="c-btn c-btn-danger c-btn-sm" onclick="handleDeleteProduct('${p.id}')">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

function handleEditProduct(id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    document.getElementById('pEditId').value = p.id;
    document.getElementById('prodName').value = p.name || '';
    document.getElementById('prodSku').value = p.sku || '';
    document.getElementById('prodUnitName').value = p.unitName || 'Bag';
    document.getElementById('prodPrice').value = p.unitPrice || '';
    document.getElementById('prodLowStock').value = p.lowStockLevel != null ? p.lowStockLevel : 10;
    document.getElementById('initialStockRow').style.display = 'none';

    document.getElementById('productModalTitle').textContent = '✏️ Edit Product';
    document.getElementById('productModal').classList.add('open');
}

async function handleSaveProduct(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProduct');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const editId = document.getElementById('pEditId').value;
        const name = document.getElementById('prodName').value.trim();
        const sku = document.getElementById('prodSku').value.trim();
        const unitName = document.getElementById('prodUnitName').value;
        const unitPrice = Number(document.getElementById('prodPrice').value) || 0;
        const lowStockLevel = Number(document.getElementById('prodLowStock').value) || 10;

        const pId = editId || `FP_${window.CoconutModule.uid('p')}`;
        const prodRef = db.collection('coconut_finished_products').doc(bid).collection('items').doc(pId);

        if (editId) {
            await prodRef.set({
                name,
                sku,
                unitName,
                unitPrice,
                lowStockLevel,
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });
        } else {
            const initQty = Number(document.getElementById('prodInitQty').value) || 0;
            const initCost = Number(document.getElementById('prodInitCost').value) || 0;

            await prodRef.set({
                businessId: bid,
                productId: pId,
                name,
                sku,
                unitName,
                unitPrice,
                unitCost: initCost,
                stockQty: initQty,
                lowStockLevel,
                isActive: true,
                createdAt: window.CoconutModule.tsToFirestore(new Date()),
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            });

            // If opening stock has value, post opening stock journal
            if (initQty > 0 && initCost > 0) {
                const totalVal = initQty * initCost;
                await window.CoconutModule.postJournalEntry({
                    businessId: bid,
                    description: `Opening Stock: ${name} (${initQty} ${unitName} @ Rs.${initCost})`,
                    referenceType: 'OPENING_STOCK',
                    ref: `coconut_finished_products/${pId}`,
                    date: new Date(),
                    lines: [
                        { accountCode: '1-1040-01', accountName: 'Inventory (Finished Goods)', debit: totalVal, credit: 0 },
                        { accountCode: '3-3010-01', accountName: "Owner's Capital", debit: 0, credit: totalVal }
                    ]
                });
            }
        }

        window.CoconutModule.showToast('Product saved successfully!', 'success');
        document.getElementById('productModal').classList.remove('open');
        await loadProducts();

    } catch (err) {
        console.error(err);
        window.CoconutModule.showToast('Failed to save product: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Save Product';
    }
}

async function handleDeleteProduct(id) {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    const db = window.CoconutModule.getDb();
    try {
        await db.collection('coconut_finished_products')
            .doc(appCtx.businessId)
            .collection('items')
            .doc(id)
            .set({
                isActive: false,
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });

        window.CoconutModule.showToast('Product deactivated', 'info');
        await loadProducts();
    } catch (e) {
        window.CoconutModule.showToast('Failed to deactivate product: ' + e.message, 'error');
    }
}
