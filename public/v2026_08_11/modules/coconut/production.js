/**
 * Coconut Wholesale Module — Production Management Logic
 */

let appCtx = null;
let allRecipes = [];
let allProducts = [];
let liveHuskStock = { stockKg: 0, avgCostPerKg: 0 };
let liveCoconutStock = { totalQty: 0, avgCost: 0 };

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('production');
    document.getElementById('prDate').value = window.CoconutModule.toLocalDateStr(new Date());

    setupEventHandlers();
    await loadProductsDropdown();
    await loadHuskAndCoconutStocks();
    await loadRecipes();
    await loadProductionHistory();
});

function setupEventHandlers() {
    const recipeSelect = document.getElementById('prRecipe');
    const prodSelect = document.getElementById('prProduct');
    const producedQtyInput = document.getElementById('prProducedQty');
    const huskKgInput = document.getElementById('prHuskKg');
    const coconutQtyInput = document.getElementById('prCoconutQty');
    const procCostInput = document.getElementById('prProcessingCost');

    recipeSelect.addEventListener('change', () => {
        const rId = recipeSelect.value;
        const recipe = allRecipes.find(x => x.id === rId);
        if (recipe) {
            if (recipe.productId) prodSelect.value = recipe.productId;
            if (recipe.inputQty && producedQtyInput.value) {
                const qty = Number(producedQtyInput.value) || 1;
                if (recipe.inputType === 'HUSK_KG') {
                    huskKgInput.value = (qty * recipe.inputQty).toFixed(1);
                } else if (recipe.inputType === 'COCONUT') {
                    coconutQtyInput.value = Math.round(qty * recipe.inputQty);
                }
            }
            if (recipe.processingCost) {
                const qty = Number(producedQtyInput.value) || 1;
                procCostInput.value = (qty * recipe.processingCost).toFixed(2);
            }
            calculateProductionCost();
        }
    });

    producedQtyInput.addEventListener('input', () => {
        const rId = recipeSelect.value;
        const recipe = allRecipes.find(x => x.id === rId);
        const qty = Number(producedQtyInput.value) || 0;
        if (recipe && qty > 0) {
            if (recipe.inputType === 'HUSK_KG' && recipe.inputQty) {
                huskKgInput.value = (qty * recipe.inputQty).toFixed(1);
            } else if (recipe.inputType === 'COCONUT' && recipe.inputQty) {
                coconutQtyInput.value = Math.round(qty * recipe.inputQty);
            }
            if (recipe.processingCost) {
                procCostInput.value = (qty * recipe.processingCost).toFixed(2);
            }
        }
        calculateProductionCost();
    });

    huskKgInput.addEventListener('input', calculateProductionCost);
    coconutQtyInput.addEventListener('input', calculateProductionCost);
    procCostInput.addEventListener('input', calculateProductionCost);

    // Form
    document.getElementById('productionRunForm').addEventListener('submit', handleExecuteProductionRun);

    // Recipe Modal
    const rModal = document.getElementById('recipeModal');
    document.getElementById('btnOpenRecipeModal').onclick = () => rModal.classList.add('open');
    document.getElementById('btnCloseRecipeModal').onclick = () => rModal.classList.remove('open');
    document.getElementById('btnCancelRecipe').onclick = () => rModal.classList.remove('open');
    document.getElementById('recipeForm').addEventListener('submit', handleSaveRecipe);
}

function calculateProductionCost() {
    const huskKg = Number(document.getElementById('prHuskKg').value) || 0;
    const coconutQty = Number(document.getElementById('prCoconutQty').value) || 0;
    const procCost = Number(document.getElementById('prProcessingCost').value) || 0;
    const producedQty = Number(document.getElementById('prProducedQty').value) || 0;

    const huskCost = huskKg * (liveHuskStock.avgCostPerKg || 0);
    const coconutCost = coconutQty * (liveCoconutStock.avgCost || 0);
    const rmCost = huskCost + coconutCost;

    const totalBatchCost = rmCost + procCost;
    const unitProductionCost = producedQty > 0 ? (totalBatchCost / producedQty) : 0;

    document.getElementById('calcRmCost').textContent = window.CoconutModule.fmtLKR(rmCost);
    document.getElementById('calcProcCost').textContent = window.CoconutModule.fmtLKR(procCost);
    document.getElementById('calcTotalBatchCost').textContent = window.CoconutModule.fmtLKR(totalBatchCost);
    document.getElementById('calcUnitProductionCost').textContent = `Rs. ${window.CoconutModule.fmt(unitProductionCost, 2)}`;
}

async function loadProductsDropdown() {
    const db = window.CoconutModule.getDb();
    try {
        const snap = await db.collection('coconut_finished_products')
            .doc(appCtx.businessId)
            .collection('items')
            .get();

        allProducts = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(p => p.isActive !== false);

        const options = '<option value="">Select Target Product...</option>' +
            allProducts.map(p => `<option value="${p.id}">${window.CoconutModule.esc(p.name)} (${p.unitName})</option>`).join('');

        document.getElementById('prProduct').innerHTML = options;
        document.getElementById('recTargetProduct').innerHTML = options;

    } catch (e) {
        console.warn('Products dropdown error:', e);
    }
}

async function loadHuskAndCoconutStocks() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const [hDoc, cSnap] = await Promise.all([
            db.collection('coconut_husk_raw').doc(bid).collection('items').doc('current').get(),
            db.collection('coconut_raw_coconuts').doc(bid).collection('items').get()
        ]);

        if (hDoc.exists) {
            const hd = hDoc.data() || {};
            liveHuskStock = {
                stockKg: Number(hd.stockKg) || 0,
                avgCostPerKg: Number(hd.avgCostPerKg || hd.lastCostPerKg) || 0
            };
        }

        let cQty = 0;
        let cVal = 0;
        cSnap.docs.forEach(doc => {
            const d = doc.data() || {};
            const q = Number(d.stockQty) || 0;
            const c = Number(d.avgCostPerUnit || d.lastUnitCost) || 0;
            cQty += q;
            cVal += (q * c);
        });

        liveCoconutStock = {
            totalQty: cQty,
            avgCost: cQty > 0 ? (cVal / cQty) : 0
        };

        document.getElementById('availHuskDisplay').textContent = `${window.CoconutModule.fmt(liveHuskStock.stockKg, 1)} kg (Avg Rs.${window.CoconutModule.fmt(liveHuskStock.avgCostPerKg, 2)})`;

    } catch (e) {
        console.warn('Husk/Coconut load error:', e);
    }
}

async function loadRecipes() {
    const db = window.CoconutModule.getDb();
    const select = document.getElementById('prRecipe');
    const tableBody = document.getElementById('recipeListBody');

    try {
        const snap = await db.collection('coconut_transformations')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allRecipes = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(r => r.isActive !== false);

        select.innerHTML = '<option value="">Select Recipe...</option>' +
            allRecipes.map(r => `<option value="${r.id}">${window.CoconutModule.esc(r.name)} (${r.inputQty} ${r.inputType} → 1 unit)</option>`).join('');

        if (!allRecipes.length) {
            tableBody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:20px; color:var(--c-text-muted);">No transformation recipes found. Click "+ Manage Recipes" to add templates.</td></tr>';
            return;
        }

        tableBody.innerHTML = allRecipes.map(r => {
            const p = allProducts.find(x => x.id === r.productId);
            const pName = p ? p.name : 'Finished Product';
            return `
                <tr>
                    <td><strong>${window.CoconutModule.esc(r.name)}</strong></td>
                    <td>${window.CoconutModule.fmt(r.inputQty, 1)} ${r.inputType === 'HUSK_KG' ? 'kg Husk' : 'Nuts'} / unit</td>
                    <td>${window.CoconutModule.esc(pName)}</td>
                    <td class="text-right" style="font-weight:700;">Rs. ${window.CoconutModule.fmt(r.processingCost, 2)}</td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.warn('Recipes load error:', e);
    }
}

async function loadProductionHistory() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('productionHistoryBody');

    try {
        const snap = await db.collection('coconut_production_runs')
            .where('businessId', '==', appCtx.businessId)
            .get();

        const runs = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(r => r.isActive !== false)
            .sort((a, b) => {
                const ta = a.runDate ? (a.runDate.toDate ? a.runDate.toDate().getTime() : new Date(a.runDate).getTime()) : 0;
                const tb = b.runDate ? (b.runDate.toDate ? b.runDate.toDate().getTime() : new Date(b.runDate).getTime()) : 0;
                return tb - ta;
            });

        if (!runs.length) {
            body.innerHTML = '<tr><td colspan="8" class="text-center" style="padding:20px; color:var(--c-text-muted);">No production runs recorded yet.</td></tr>';
            return;
        }

        body.innerHTML = runs.map(r => {
            const dt = window.CoconutModule.formatDate(r.runDate || r.createdAt);
            const p = allProducts.find(x => x.id === r.productId);
            const pName = p ? p.name : (r.productName || 'Finished Goods');
            const unitName = p ? p.unitName : 'units';

            return `
                <tr>
                    <td>${dt}</td>
                    <td><strong>${window.CoconutModule.esc(r.transformationName || 'Production Batch')}</strong></td>
                    <td>${window.CoconutModule.esc(pName)}</td>
                    <td class="text-right" style="font-weight:800; color:#059669;">+${window.CoconutModule.fmt(r.producedQty, 0)} ${unitName}</td>
                    <td class="text-right" style="color:#dc2626;">-${window.CoconutModule.fmt(r.huskConsumedKg, 1)} kg</td>
                    <td class="text-right">Rs. ${window.CoconutModule.fmt(r.unitCost, 2)}</td>
                    <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(r.totalRunCost)}</td>
                    <td class="text-center">
                        <button class="c-btn c-btn-danger c-btn-sm" onclick="handleReverseProductionRun('${r.id}')" title="Reverse batch run & stock">🗑️</button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.warn('Production history error:', e);
    }
}

async function handleExecuteProductionRun(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProduction');
    btn.disabled = true;
    btn.textContent = 'Executing Run & Capitalizing Goods...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('prDate').value;
        const recipeId = document.getElementById('prRecipe').value;
        const productId = document.getElementById('prProduct').value;
        const producedQty = Number(document.getElementById('prProducedQty').value) || 0;
        const huskKg = Number(document.getElementById('prHuskKg').value) || 0;
        const coconutQty = Number(document.getElementById('prCoconutQty').value) || 0;
        const processingCost = Number(document.getElementById('prProcessingCost').value) || 0;
        const paymentMode = document.getElementById('prPaymentMode').value;
        const notes = document.getElementById('prNotes').value || '';

        if (producedQty <= 0) {
            alert('Produced Quantity must be greater than 0');
            btn.disabled = false;
            btn.textContent = '🏭 Execute Batch Run & Transfer Inventory';
            return;
        }

        const recipe = allRecipes.find(x => x.id === recipeId);
        const product = allProducts.find(x => x.id === productId);
        const recipeName = recipe ? recipe.name : 'Custom Batch Run';
        const productName = product ? product.name : 'Finished Product';

        // Calculate material cost
        const inputMaterialCost = (huskKg * liveHuskStock.avgCostPerKg) + (coconutQty * liveCoconutStock.avgCost);
        const totalRunCost = inputMaterialCost + processingCost;
        const unitCost = producedQty > 0 ? (totalRunCost / producedQty) : 0;

        const runId = `RUN_${window.CoconutModule.uid('prod')}`;
        const runDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();

        const batch = db.batch();

        // 1. Deduct Raw Husk Stock
        if (huskKg > 0) {
            const huskRef = db.collection('coconut_husk_raw').doc(bid).collection('items').doc('current');
            const newHuskStock = Math.max(0, liveHuskStock.stockKg - huskKg);
            batch.set(huskRef, {
                stockKg: Number(newHuskStock.toFixed(2)),
                updatedAt: window.CoconutModule.tsToFirestore(new Date())
            }, { merge: true });
        }

        // 2. Increase Finished Product Stock & Recompute Weighted Average Unit Cost
        const prodRef = db.collection('coconut_finished_products').doc(bid).collection('items').doc(productId);
        const curProdDoc = await prodRef.get();
        let curQty = 0;
        let curUnitCost = 0;
        if (curProdDoc.exists) {
            const pd = curProdDoc.data() || {};
            curQty = Number(pd.stockQty) || 0;
            curUnitCost = Number(pd.unitCost) || 0;
        }

        const newProdQty = curQty + producedQty;
        const newTotalProdVal = (curQty * curUnitCost) + totalRunCost;
        const newUnitCost = newProdQty > 0 ? (newTotalProdVal / newProdQty) : unitCost;

        batch.set(prodRef, {
            stockQty: newProdQty,
            unitCost: Number(newUnitCost.toFixed(4)),
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 3. Save Production Run Doc
        const runRef = db.collection('coconut_production_runs').doc(runId);
        batch.set(runRef, {
            businessId: bid,
            runId,
            transformationId: recipeId || null,
            transformationName: recipeName,
            productId,
            productName,
            huskConsumedKg: huskKg,
            coconutConsumedQty: coconutQty,
            inputMaterialCost: Number(inputMaterialCost.toFixed(2)),
            processingCost: Number(processingCost.toFixed(2)),
            totalRunCost: Number(totalRunCost.toFixed(2)),
            producedQty,
            unitCost: Number(unitCost.toFixed(4)),
            paymentMode,
            notes,
            runDate: window.CoconutModule.tsToFirestore(runDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            isActive: true
        });

        // 4. Post Balanced Double-Entry Inventory Conversion Journal
        // Dr Inventory Finished Goods (totalRunCost)
        // Cr Inventory Raw Materials (inputMaterialCost)
        // Cr Cash in Drawer / Bank (processingCost)
        const journalLines = [
            { accountCode: '1-1040-01', accountName: 'Inventory (Finished Goods)', debit: totalRunCost, credit: 0 }
        ];

        if (inputMaterialCost > 0) {
            journalLines.push({ accountCode: '1-1040-01', accountName: 'Inventory (Raw Husk & Materials)', debit: 0, credit: inputMaterialCost });
        }

        if (processingCost > 0) {
            if (paymentMode === 'BANK') {
                journalLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account (Processing Cost)', debit: 0, credit: processingCost });
            } else if (paymentMode === 'CASH') {
                journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer (Processing Cost)', debit: 0, credit: processingCost });
            } else {
                journalLines.push({ accountCode: '2-2010-01', accountName: 'Accounts Payable (Direct Labor / Processing)', debit: 0, credit: processingCost });
            }
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Production Run #${runId} — ${recipeName} (+${producedQty} ${product ? product.unitName : 'units'})`,
            referenceType: 'PRODUCTION_RUN',
            ref: `coconut_production_runs/${runId}`,
            date: runDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Production run executed & inventory capitalized!', 'success');
        document.getElementById('productionRunForm').reset();
        document.getElementById('prDate').value = window.CoconutModule.toLocalDateStr(new Date());

        await loadHuskAndCoconutStocks();
        await loadProductionHistory();

    } catch (err) {
        console.error('Production execute error:', err);
        window.CoconutModule.showToast('Failed to execute production run: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '🏭 Execute Batch Run & Transfer Inventory';
    }
}

async function handleReverseProductionRun(runId) {
    if (!confirm('⚠️ Are you sure you want to reverse this production run?\n\nThis will return raw materials back to inventory, decrease finished goods stock, and reverse journal postings.')) return;

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const runDocRef = db.collection('coconut_production_runs').doc(runId);
        const runDoc = await runDocRef.get();
        if (!runDoc.exists) return;
        const r = runDoc.data();

        const huskKg = Number(r.huskConsumedKg) || 0;
        const producedQty = Number(r.producedQty) || 0;
        const productId = r.productId;
        const totalCost = Number(r.totalRunCost) || 0;
        const inputCost = Number(r.inputMaterialCost) || 0;
        const procCost = Number(r.processingCost) || 0;

        // 1. Re-add Husk Stock
        if (huskKg > 0) {
            const huskRef = db.collection('coconut_husk_raw').doc(bid).collection('items').doc('current');
            const hDoc = await huskRef.get();
            if (hDoc.exists) {
                const curKg = Number(hDoc.data().stockKg) || 0;
                await huskRef.set({
                    stockKg: curKg + huskKg,
                    updatedAt: window.CoconutModule.tsToFirestore(new Date())
                }, { merge: true });
            }
        }

        // 2. Deduct Finished Product Stock
        if (productId && producedQty > 0) {
            const prodRef = db.collection('coconut_finished_products').doc(bid).collection('items').doc(productId);
            const pDoc = await prodRef.get();
            if (pDoc.exists) {
                const curProdQty = Number(pDoc.data().stockQty) || 0;
                await prodRef.set({
                    stockQty: Math.max(0, curProdQty - producedQty),
                    updatedAt: window.CoconutModule.tsToFirestore(new Date())
                }, { merge: true });
            }
        }

        // 3. Mark Run Inactive
        await runDocRef.set({
            isActive: false,
            deletedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 4. Reverse Journal
        const revLines = [
            { accountCode: '1-1040-01', accountName: 'Inventory (Finished Goods)', debit: 0, credit: totalCost }
        ];
        if (inputCost > 0) {
            revLines.push({ accountCode: '1-1040-01', accountName: 'Inventory (Raw Materials)', debit: inputCost, credit: 0 });
        }
        if (procCost > 0) {
            if (r.paymentMode === 'BANK') revLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: procCost, credit: 0 });
            else if (r.paymentMode === 'CASH') revLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: procCost, credit: 0 });
            else revLines.push({ accountCode: '2-2010-01', accountName: 'Accounts Payable', debit: procCost, credit: 0 });
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `[REVERSAL] Deleted Production Run #${runId}`,
            referenceType: 'PRODUCTION_RUN_REVERSAL',
            ref: `coconut_production_runs/${runId}`,
            date: new Date(),
            lines: revLines
        });

        window.CoconutModule.showToast('Production run reversed successfully!', 'success');
        await loadHuskAndCoconutStocks();
        await loadProductionHistory();

    } catch (e) {
        console.error('Reverse run error:', e);
        window.CoconutModule.showToast('Failed to reverse production run: ' + e.message, 'error');
    }
}

async function handleSaveRecipe(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const name = document.getElementById('recName').value.trim();
    const inputType = document.getElementById('recInputType').value;
    const inputQty = Number(document.getElementById('recInputQty').value) || 1;
    const productId = document.getElementById('recTargetProduct').value;
    const processingCost = Number(document.getElementById('recProcCost').value) || 0;

    try {
        await db.collection('coconut_transformations').add({
            businessId: bid,
            name,
            inputType,
            inputQty,
            productId,
            processingCost,
            isActive: true,
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        });

        window.CoconutModule.showToast('Transformation recipe saved!', 'success');
        document.getElementById('recipeForm').reset();
        document.getElementById('recipeModal').classList.remove('open');

        await loadRecipes();

    } catch (e) {
        window.CoconutModule.showToast('Failed to save recipe: ' + e.message, 'error');
    }
}
