/**
 * Coconut Wholesale Module — Operational Expenses Logic
 */

let appCtx = null;
let allExpenses = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('expenses');
    document.getElementById('expDate').value = window.CoconutModule.toLocalDateStr(new Date());

    setupEventHandlers();
    await loadExpenses();
});

function setupEventHandlers() {
    document.getElementById('expenseForm').addEventListener('submit', handleSaveExpense);

    document.getElementById('searchExpenseInput').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        renderExpenseTable(allExpenses.filter(x =>
            (x.description && x.description.toLowerCase().includes(q)) ||
            (x.category && x.category.toLowerCase().includes(q))
        ));
    });
}

async function loadExpenses() {
    const db = window.CoconutModule.getDb();
    const startMonth = window.CoconutModule.startOfMonth();

    try {
        const snap = await db.collection('coconut_expenses')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allExpenses = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(e => e.isActive !== false)
            .sort((a, b) => {
                const ta = a.date ? (a.date.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime()) : 0;
                const tb = b.date ? (b.date.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) : 0;
                return tb - ta;
            });

        // Compute Month Breakdown
        const categoryMap = {};
        let monthTotal = 0;

        allExpenses.forEach(exp => {
            const dt = window.CoconutModule.parseDateAny(exp.date || exp.createdAt);
            const amt = Number(exp.amount) || 0;

            if (dt && dt >= startMonth) {
                monthTotal += amt;
                const cat = exp.category || 'OTHER';
                categoryMap[cat] = (categoryMap[cat] || 0) + amt;
            }
        });

        document.getElementById('monthTotalExpenseVal').textContent = window.CoconutModule.fmtLKR(monthTotal);

        const catBody = document.getElementById('expenseCategorySummaryBody');
        const catEntries = Object.entries(categoryMap).sort((a, b) => b[1] - a[1]);

        if (!catEntries.length) {
            catBody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding:16px; color:var(--c-text-muted);">No expenses recorded this month.</td></tr>';
        } else {
            catBody.innerHTML = catEntries.map(([cat, amt]) => {
                const pct = monthTotal > 0 ? ((amt / monthTotal) * 100).toFixed(1) : 0;
                return `
                    <tr>
                        <td><strong>${window.CoconutModule.esc(cat)}</strong></td>
                        <td class="text-right" style="font-weight:700;">${window.CoconutModule.fmtLKR(amt)}</td>
                        <td class="text-right">${pct}%</td>
                    </tr>
                `;
            }).join('');
        }

        renderExpenseTable(allExpenses);

    } catch (e) {
        console.error('Load expenses error:', e);
    }
}

function renderExpenseTable(list) {
    const body = document.getElementById('expenseHistoryTableBody');
    if (!list || !list.length) {
        body.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:24px; color:var(--c-text-muted);">No expenses recorded yet.</td></tr>';
        return;
    }

    body.innerHTML = list.map(exp => {
        const dt = window.CoconutModule.formatDate(exp.date || exp.createdAt);
        const amt = Number(exp.amount) || 0;

        return `
            <tr>
                <td>${dt}</td>
                <td><span class="c-badge c-badge-neutral">${window.CoconutModule.esc(exp.category)}</span></td>
                <td><strong>${window.CoconutModule.esc(exp.description)}</strong></td>
                <td><span class="c-badge c-badge-info">${exp.paymentMode || 'CASH'}</span></td>
                <td class="text-right" style="font-weight:800; color:var(--c-danger);">${window.CoconutModule.fmtLKR(amt)}</td>
                <td class="text-center">
                    <button class="c-btn c-btn-danger c-btn-sm" onclick="handleDeleteExpense('${exp.id}')" title="Reverse expense">🗑️</button>
                </td>
            </tr>
        `;
    }).join('');
}

async function handleSaveExpense(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveExpense');
    btn.disabled = true;
    btn.textContent = 'Saving & Posting GL...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const dateVal = document.getElementById('expDate').value;
        const category = document.getElementById('expCategory').value;
        const amount = Number(document.getElementById('expAmount').value) || 0;
        const paymentMode = document.getElementById('expPaymentMode').value;
        const description = document.getElementById('expDescription').value.trim();

        if (amount <= 0 || !description) {
            alert('Please specify amount and description');
            btn.disabled = false;
            btn.textContent = '💾 Save Expense & Post to GL';
            return;
        }

        const expId = `EXP_${window.CoconutModule.uid('exp')}`;
        const expDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();

        const batch = db.batch();

        // 1. Insert Expense Record
        const expRef = db.collection('coconut_expenses').doc(expId);
        batch.set(expRef, {
            businessId: bid,
            expId,
            category,
            amount: Number(amount.toFixed(2)),
            paymentMode,
            description,
            date: window.CoconutModule.tsToFirestore(expDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            isActive: true
        });

        // 2. Post Balanced Journal Entry
        // Dr 5-5010-01 (Operational Expense)
        // Cr 1-1010-01 (Cash in Drawer) / 1-1020-01 (Bank Account)
        const journalLines = [
            { accountCode: '5-5010-01', accountName: `Operational Expense (${category})`, debit: amount, credit: 0 }
        ];

        if (paymentMode === 'BANK' || paymentMode === 'CHEQUE') {
            journalLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: 0, credit: amount });
        } else {
            journalLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: 0, credit: amount });
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Expense: ${description} [${category}]`,
            referenceType: 'EXPENSE',
            ref: `coconut_expenses/${expId}`,
            date: expDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Expense saved & posted to General Ledger!', 'success');
        document.getElementById('expenseForm').reset();
        document.getElementById('expDate').value = window.CoconutModule.toLocalDateStr(new Date());

        await loadExpenses();

    } catch (err) {
        console.error('Save expense error:', err);
        window.CoconutModule.showToast('Failed to save expense: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Expense & Post to GL';
    }
}

async function handleDeleteExpense(expId) {
    if (!confirm('⚠️ Are you sure you want to reverse this expense?')) return;

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const expDocRef = db.collection('coconut_expenses').doc(expId);
        const expDoc = await expDocRef.get();
        if (!expDoc.exists) return;
        const exp = expDoc.data();

        const amount = Number(exp.amount) || 0;

        // 1. Mark Inactive
        await expDocRef.set({
            isActive: false,
            deletedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 2. Reverse Journal Entry
        const revLines = [
            { accountCode: '5-5010-01', accountName: 'Operational Expense (Reversed)', debit: 0, credit: amount }
        ];
        if (exp.paymentMode === 'BANK' || exp.paymentMode === 'CHEQUE') {
            revLines.push({ accountCode: '1-1020-01', accountName: 'Bank Account', debit: amount, credit: 0 });
        } else {
            revLines.push({ accountCode: '1-1010-01', accountName: 'Cash in Drawer', debit: amount, credit: 0 });
        }

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `[REVERSAL] Deleted Expense #${expId}`,
            referenceType: 'EXPENSE_REVERSAL',
            ref: `coconut_expenses/${expId}`,
            date: new Date(),
            lines: revLines
        });

        window.CoconutModule.showToast('Expense reversed successfully!', 'success');
        await loadExpenses();

    } catch (e) {
        console.error(e);
        window.CoconutModule.showToast('Failed to delete expense: ' + e.message, 'error');
    }
}
