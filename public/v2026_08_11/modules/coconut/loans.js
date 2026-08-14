/**
 * Coconut Wholesale Module — Loans & Borrowings Logic
 */

let appCtx = null;
let allLoans = [];

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('loans');
    document.getElementById('lDate').value = window.CoconutModule.toLocalDateStr(new Date());

    setupEventHandlers();
    await loadLoans();
});

function setupEventHandlers() {
    const loanModal = document.getElementById('loanModal');
    const repayModal = document.getElementById('repayModal');

    document.getElementById('btnOpenNewLoan').onclick = () => {
        document.getElementById('loanForm').reset();
        document.getElementById('lDate').value = window.CoconutModule.toLocalDateStr(new Date());
        loanModal.classList.add('open');
    };
    document.getElementById('btnCloseLoanModal').onclick = () => loanModal.classList.remove('open');
    document.getElementById('btnCancelLoan').onclick = () => loanModal.classList.remove('open');

    document.getElementById('btnCloseRepayModal').onclick = () => repayModal.classList.remove('open');
    document.getElementById('btnCancelRepay').onclick = () => repayModal.classList.remove('open');

    document.getElementById('loanForm').addEventListener('submit', handleSaveLoan);
    document.getElementById('repayForm').addEventListener('submit', handleSaveRepayment);
}

async function loadLoans() {
    const db = window.CoconutModule.getDb();
    const body = document.getElementById('loansTableBody');

    try {
        const snap = await db.collection('coconut_loans')
            .where('businessId', '==', appCtx.businessId)
            .get();

        allLoans = snap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter(l => l.isActive !== false)
            .sort((a, b) => {
                const ta = a.borrowedDate ? (a.borrowedDate.toDate ? a.borrowedDate.toDate().getTime() : new Date(a.borrowedDate).getTime()) : 0;
                const tb = b.borrowedDate ? (b.borrowedDate.toDate ? b.borrowedDate.toDate().getTime() : new Date(b.borrowedDate).getTime()) : 0;
                return tb - ta;
            });

        let totalBal = 0;
        let totalRepaid = 0;
        let activeCount = 0;

        allLoans.forEach(l => {
            const bal = Number(l.balance) || 0;
            totalBal += bal;
            totalRepaid += (Number(l.totalRepaid) || 0);
            if (bal > 0) activeCount++;
        });

        document.getElementById('activeLoansCount').textContent = `${activeCount} Loans`;
        document.getElementById('totalLoanBalance').textContent = window.CoconutModule.fmtLKR(totalBal);
        document.getElementById('totalLoanRepaid').textContent = window.CoconutModule.fmtLKR(totalRepaid);

        if (!allLoans.length) {
            body.innerHTML = '<tr><td colspan="7" class="text-center" style="padding:24px; color:var(--c-text-muted);">No loans or borrowings recorded.</td></tr>';
            return;
        }

        body.innerHTML = allLoans.map(l => {
            const dt = window.CoconutModule.formatDate(l.borrowedDate || l.createdAt);
            const amt = Number(l.amount) || 0;
            const bal = Number(l.balance) || 0;
            const repaid = Number(l.totalRepaid) || 0;

            return `
                <tr>
                    <td>${dt}</td>
                    <td><strong>${window.CoconutModule.esc(l.lenderName)}</strong></td>
                    <td class="text-right">${window.CoconutModule.fmtLKR(amt)}</td>
                    <td class="text-right">${l.interestRatePercent || 0}%</td>
                    <td class="text-right" style="color:#166534; font-weight:700;">${window.CoconutModule.fmtLKR(repaid)}</td>
                    <td class="text-right" style="font-weight:800; color:${bal > 0 ? 'var(--c-danger)' : 'var(--c-text-muted)'};">${window.CoconutModule.fmtLKR(bal)}</td>
                    <td class="text-center">
                        ${bal > 0 ? `<button class="c-btn c-btn-primary c-btn-sm" onclick="openRepaymentModal('${l.id}')">Repay</button>` : '<span class="c-badge c-badge-success">Settled</span>'}
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error(e);
    }
}

async function handleSaveLoan(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const dateVal = document.getElementById('lDate').value;
    const lenderName = document.getElementById('lLender').value.trim();
    const amount = Number(document.getElementById('lAmount').value) || 0;
    const interestRatePercent = Number(document.getElementById('lInterestRate').value) || 0;
    const depositMode = document.getElementById('lDepositMode').value;
    const notes = document.getElementById('lNotes').value.trim();

    if (amount <= 0 || !lenderName) {
        alert('Please fill required fields');
        return;
    }

    try {
        const loanId = `LN_${window.CoconutModule.uid('loan')}`;
        const loanDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();

        const batch = db.batch();

        // 1. Insert Loan Doc
        const loanRef = db.collection('coconut_loans').doc(loanId);
        batch.set(loanRef, {
            businessId: bid,
            loanId,
            lenderName,
            amount,
            interestRatePercent,
            balance: amount,
            totalRepaid: 0,
            depositMode,
            notes,
            borrowedDate: window.CoconutModule.tsToFirestore(loanDateObj),
            createdAt: window.CoconutModule.tsToFirestore(new Date()),
            isActive: true
        });

        // 2. Post Journal:
        // Dr Bank Account (1-1020-01) / Cash in Drawer (1-1010-01)
        // Cr Loans Payable (2-2030-01)
        const journalLines = [
            { accountCode: depositMode === 'BANK' ? '1-1020-01' : '1-1010-01', accountName: depositMode === 'BANK' ? 'Bank Account' : 'Cash in Drawer', debit: amount, credit: 0 },
            { accountCode: '2-2030-01', accountName: 'Loans Payable (Borrowings)', debit: 0, credit: amount }
        ];

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Loan Inflow: ${lenderName} (${window.CoconutModule.fmtLKR(amount)})`,
            referenceType: 'LOAN_RECEIPT',
            ref: `coconut_loans/${loanId}`,
            date: loanDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Loan recorded & funds disbursed!', 'success');
        document.getElementById('loanModal').classList.remove('open');
        await loadLoans();

    } catch (err) {
        console.error(err);
        window.CoconutModule.showToast('Failed to record loan: ' + err.message, 'error');
    }
}

function openRepaymentModal(loanId) {
    const loan = allLoans.find(x => x.id === loanId);
    if (!loan) return;

    document.getElementById('rLoanId').value = loan.id;
    document.getElementById('rLenderDisplay').textContent = loan.lenderName;
    document.getElementById('rBalanceDisplay').textContent = window.CoconutModule.fmtLKR(loan.balance || 0);
    document.getElementById('rDate').value = window.CoconutModule.toLocalDateStr(new Date());
    document.getElementById('rPrincipal').value = '';
    document.getElementById('rInterest').value = '0';

    document.getElementById('repayModal').classList.add('open');
}

async function handleSaveRepayment(e) {
    e.preventDefault();
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const loanId = document.getElementById('rLoanId').value;
    const loan = allLoans.find(x => x.id === loanId);
    if (!loan) return;

    const dateVal = document.getElementById('rDate').value;
    const paymentMode = document.getElementById('rPaymentMode').value;
    const principal = Number(document.getElementById('rPrincipal').value) || 0;
    const interest = Number(document.getElementById('rInterest').value) || 0;
    const notes = document.getElementById('rNotes').value.trim();
    const totalRepay = principal + interest;

    if (totalRepay <= 0) {
        alert('Total payment must be greater than 0');
        return;
    }

    try {
        const curBal = Number(loan.balance) || 0;
        const curRepaid = Number(loan.totalRepaid) || 0;
        const newBal = Math.max(0, curBal - principal);
        const newRepaid = curRepaid + principal;

        const repayId = `REP_${window.CoconutModule.uid('rep')}`;
        const rDateObj = window.CoconutModule.parseDateAny(dateVal) || new Date();

        const batch = db.batch();

        // 1. Update Loan Document
        const lRef = db.collection('coconut_loans').doc(loanId);
        batch.set(lRef, {
            balance: newBal,
            totalRepaid: newRepaid,
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        // 2. Post Repayment Journal:
        // Dr Loans Payable 2-2030-01 (Principal)
        // Dr Loan Interest Expense 5-5050-01 (Interest)
        // Cr Bank 1-1020-01 / Cash 1-1010-01 (Total Repayment)
        const journalLines = [];
        if (principal > 0) {
            journalLines.push({ accountCode: '2-2030-01', accountName: 'Loans Payable (Principal Repayment)', debit: principal, credit: 0 });
        }
        if (interest > 0) {
            journalLines.push({ accountCode: '5-5050-01', accountName: 'Loan Interest Expense', debit: interest, credit: 0 });
        }

        const crAccount = paymentMode === 'BANK' ? '1-1020-01' : '1-1010-01';
        const crName = paymentMode === 'BANK' ? 'Bank Account' : 'Cash in Drawer';
        journalLines.push({ accountCode: crAccount, accountName: crName, debit: 0, credit: totalRepay });

        await window.CoconutModule.postJournalEntry({
            businessId: bid,
            description: `Loan Repayment: ${loan.lenderName} (Principal: ${window.CoconutModule.fmtLKR(principal)}, Interest: ${window.CoconutModule.fmtLKR(interest)})`,
            referenceType: 'LOAN_REPAYMENT',
            ref: `coconut_loans/${loanId}`,
            date: rDateObj,
            lines: journalLines,
            batch
        });

        await batch.commit();

        window.CoconutModule.showToast('Loan repayment posted!', 'success');
        document.getElementById('repayModal').classList.remove('open');
        await loadLoans();

    } catch (err) {
        console.error(err);
        window.CoconutModule.showToast('Failed to post repayment: ' + err.message, 'error');
    }
}
