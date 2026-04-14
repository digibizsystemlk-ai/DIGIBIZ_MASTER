// Accounts Core Module - Double Entry Accounting
// මෙය සියලුම ගිණුම්කරණ කාර්යයන් කරනවා

class AccountsCore {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.cachedBusinessId = null;
        this.cachedUserId = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // මෙම events වලට සවන් දෙන්න
        this.eventBus.subscribe('SALE_COMPLETED', (event) => {
            this.handleSale(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('PURCHASE_MADE', (event) => {
            this.handlePurchase(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('LOAN_GIVEN', (event) => {
            this.handleLoanGiven(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('LOAN_RECEIVED', (event) => {
            this.handleLoanReceived(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('EXPENSE_MADE', (event) => {
            this.handleExpense(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('DISTRIBUTOR_ORDER_APPROVED', (event) => {
            this.handleDistributorOrderApproved(event.data);
        }, 'AccountsCore');
    }

    validateEventData(eventType, data) {
        const validator = window.validateEventPayload;
        if (typeof validator !== 'function') {
            console.error(`Missing validateEventPayload while handling ${eventType}`, data);
            return null;
        }

        const validation = validator(eventType, data);
        if (!validation.valid) {
            console.error(`Invalid ${eventType} payload in AccountsCore:`, validation.errors, data);
            return null;
        }

        return validation.sanitizedData;
    }

    // විකුණුමක් handle කරන්න
    async handleSale(data) {
        const validData = this.validateEventData('SALE_COMPLETED', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(),
            description: `Sale - Invoice ${validData.invoiceNo || 'N/A'}`,
            businessId: validData.businessId,
            entries: [
                { accountCode: '1-1010-01', accountName: 'Cash', debit: amount, credit: 0 },
                { accountCode: '4-4010-01', accountName: 'Sales Revenue', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.invoiceNo,
            referenceType: 'SALE'
        };
        
        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for sale: Rs. ${amount}`);
    }

    // මිලදී ගැනීමක් handle කරන්න
    async handlePurchase(data) {
        const validData = this.validateEventData('PURCHASE_MADE', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(),
            description: `Purchase - Order ${validData.orderNo || 'N/A'}`,
            entries: [
                { accountCode: '5-5010-01', accountName: 'Cost of Goods Sold', debit: amount, credit: 0 },
                { accountCode: '1-1010-01', accountName: 'Cash', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.orderNo,
            referenceType: 'PURCHASE'
        };
        
        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for purchase: Rs. ${amount}`);
    }

    // ණයක් දීම handle කරන්න
    async handleLoanGiven(data) {
        const validData = this.validateEventData('LOAN_GIVEN', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(),
            description: `Loan given to ${validData.customerName}`,
            entries: [
                { accountCode: '1-1050-01', accountName: 'Loans Given', debit: amount, credit: 0 },
                { accountCode: '1-1010-01', accountName: 'Cash', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.loanId,
            referenceType: 'LOAN'
        };
        
        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for loan: Rs. ${amount}`);
    }

    // ණයක් ගෙවීම handle කරන්න
    async handleLoanReceived(data) {
        const validData = this.validateEventData('LOAN_RECEIVED', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(),
            description: `Loan payment from ${validData.customerName}`,
            entries: [
                { accountCode: '1-1010-01', accountName: 'Cash', debit: amount, credit: 0 },
                { accountCode: '1-1050-01', accountName: 'Loans Given', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.paymentId,
            referenceType: 'LOAN_PAYMENT'
        };
        
        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for loan payment: Rs. ${amount}`);
    }

    // වියදමක් handle කරන්න
    async handleExpense(data) {
        const validData = this.validateEventData('EXPENSE_MADE', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(),
            description: validData.description,
            entries: [
                { accountCode: '5-5020-01', accountName: validData.expenseType || 'General Expense', debit: amount, credit: 0 },
                { accountCode: '1-1010-01', accountName: 'Cash', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.receiptNo,
            referenceType: 'EXPENSE'
        };
        
        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for expense: Rs. ${amount}`);
    }

    async handleDistributorOrderApproved(data) {
        const validData = this.validateEventData('DISTRIBUTOR_ORDER_APPROVED', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(),
            description: `Distributor Order Approved - ${validData.orderNo || validData.orderId}`,
            businessId: validData.businessId,
            entries: [
                { accountCode: '1-1010-01', accountName: 'Cash', debit: amount, credit: 0 },
                { accountCode: '4-4010-01', accountName: 'Sales Revenue', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.orderNo || validData.orderId,
            referenceType: 'DISTRIBUTOR_ORDER_APPROVED'
        };

        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for distributor order: Rs. ${amount}`);
    }

    async resolveBusinessId(entry = {}) {
        if (entry.businessId) {
            return entry.businessId;
        }

        const user = firebase.auth().currentUser;
        if (!user) return null;

        if (this.cachedBusinessId && this.cachedUserId === user.uid) {
            return this.cachedBusinessId;
        }

        try {
            const userDoc = await window.db.collection('users').doc(user.uid).get();
            const businessId = userDoc.exists ? (userDoc.data().businessId || user.uid) : user.uid;
            this.cachedBusinessId = businessId;
            this.cachedUserId = user.uid;
            return businessId;
        } catch (error) {
            console.error('Failed to resolve business ID:', error);
            return user.uid;
        }
    }

    // Journal entry එක Firestore එකේ save කරන්න
    async saveJournalEntry(entry) {
        if (!window.db) return;
        try {
            const businessId = await this.resolveBusinessId(entry);
            if (businessId) {
                if (!entry.businessId) {
                    entry.businessId = businessId;
                }
                await window.db.collection('journal')
                    .doc(businessId)
                    .collection('entries')
                    .add(entry);
            }
        } catch (error) {
            console.error('Failed to save journal entry:', error);
        }
    }

    // Account balance එක ගන්න
    async getAccountBalance(accountCode) {
        // Implementation for getting balance
        return 0;
    }
}

// Initialize Accounts Core
document.addEventListener('DOMContentLoaded', () => {
    if (window.eventBus) {
        window.accountsCore = new AccountsCore(window.eventBus);
        console.log('✅ Accounts Core Module Initialized');
    }
});