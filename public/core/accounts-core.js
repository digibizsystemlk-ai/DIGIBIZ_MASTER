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
        this.eventBus.subscribe('MANUFACTURING_RAW_MATERIAL_PURCHASED', (event) => {
            this.handleManufacturingRawMaterialPurchase(event.data);
        }, 'AccountsCore');
        this.eventBus.subscribe('MANUFACTURING_OPERATIONAL_EXPENSE', (event) => {
            this.handleManufacturingOperationalExpense(event.data);
        }, 'AccountsCore');
        this.eventBus.subscribe('MANUFACTURING_FINISHED_GOOD_SALE', (event) => {
            this.handleManufacturingFinishedSale(event.data);
        }, 'AccountsCore');
        this.eventBus.subscribe('MANUFACTURING_SIDE_INCOME', (event) => {
            this.handleManufacturingSideIncome(event.data);
        }, 'AccountsCore');
        this.eventBus.subscribe('MANUFACTURING_PRODUCTION_RECORDED', (event) => {
            this.handleManufacturingProductionRecorded(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('HAND_LOAN_RECORDED', (event) => {
            this.handleHandLoan(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('DISTRIBUTOR_GRN_POSTED', (event) => {
            this.handleDistributorGrn(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('FREE_ISSUES_RECORDED', (event) => {
            this.handleFreeIssues(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('MARKET_RETURNS_RECORDED', (event) => {
            this.handleMarketReturns(event.data);
        }, 'AccountsCore');

        this.eventBus.subscribe('FINANCE_TRANSACTION_RECORDED', (event) => {
            this.handleFinanceTransaction(event.data);
        }, 'AccountsCore');
    }

    getManufacturingAccountMap() {
        return {
            CASH: { accountCode: '1-1010-01', accountName: 'Cash' },
            BANK: { accountCode: '1-1020-01', accountName: 'Bank - Current Account' },
            AP: { accountCode: '2-2010-01', accountName: 'Accounts Payable' },
            AR: { accountCode: '1-1060-01', accountName: 'Accounts Receivable' },
            RAW_INVENTORY: { accountCode: '1-1070-01', accountName: 'Raw Material Inventory' },
            FG_INVENTORY: { accountCode: '1-1080-01', accountName: 'Finished Goods Inventory' },
            WIP: { accountCode: '1-1090-01', accountName: 'Work In Progress Inventory' },
            COGS: { accountCode: '5-5010-01', accountName: 'Cost of Goods Sold' },
            MANUFACTURING_EXPENSE: { accountCode: '5-5020-01', accountName: 'Manufacturing Expense' }
        };
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

    async handleManufacturingRawMaterialPurchase(data) {
        const validData = this.validateEventData('MANUFACTURING_RAW_MATERIAL_PURCHASED', data);
        if (!validData) return;
        const amount = validData.amount;
        const mode = String(validData.paymentMode || 'CASH').toUpperCase();
        const status = String(validData.paymentStatus || 'PAID').toUpperCase();
        const acc = this.getManufacturingAccountMap();
        let settlementLine;
        if (status === 'PENDING' || status === 'PENDING_CLEARANCE' || mode === 'CREDIT' || mode === 'CHEQUE') {
            settlementLine = { ...acc.AP, debit: 0, credit: amount };
        } else if (mode === 'BANK' || mode === 'BANK_TRANSFER') {
            settlementLine = { ...acc.BANK, debit: 0, credit: amount };
        } else {
            settlementLine = { ...acc.CASH, debit: 0, credit: amount };
        }
        const journalEntry = {
            date: new Date(),
            description: `Raw material purchase - ${validData.materialName || 'Material'} (${validData.supplierName || 'Supplier'}) [${validData.paymentMode || 'CASH'}:${validData.paymentStatus || 'PAID'}]`,
            businessId: validData.businessId,
            entries: [
                { ...acc.RAW_INVENTORY, debit: amount, credit: 0 },
                settlementLine
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.purchaseId,
            referenceType: 'MANUFACTURING_RAW_MATERIAL_PURCHASED',
            paymentMode: validData.paymentMode || 'CASH',
            paymentStatus: validData.paymentStatus || 'PAID',
            dueDate: validData.dueDate || null,
            chequeClearanceDate: validData.chequeClearanceDate || null
        };
        await this.saveJournalEntry(journalEntry);
    }

    async handleManufacturingOperationalExpense(data) {
        const validData = this.validateEventData('MANUFACTURING_OPERATIONAL_EXPENSE', data);
        if (!validData) return;
        const amount = validData.amount;
        const category = String(validData.category || 'Operational Cost');
        const mode = String(validData.paymentMode || 'CASH').toUpperCase();
        const status = String(validData.paymentStatus || 'PAID').toUpperCase();
        const acc = this.getManufacturingAccountMap();
        let settlementLine;
        if (status === 'PENDING' || status === 'PENDING_CLEARANCE' || mode === 'CREDIT' || mode === 'CHEQUE') {
            settlementLine = { ...acc.AP, debit: 0, credit: amount };
        } else if (mode === 'BANK' || mode === 'BANK_TRANSFER') {
            settlementLine = { ...acc.BANK, debit: 0, credit: amount };
        } else {
            settlementLine = { ...acc.CASH, debit: 0, credit: amount };
        }
        const journalEntry = {
            date: new Date(),
            description: `Manufacturing expense - ${category} [${validData.paymentMode || 'CASH'}:${validData.paymentStatus || 'PAID'}]`,
            businessId: validData.businessId,
            entries: [
                { ...acc.MANUFACTURING_EXPENSE, accountName: `Manufacturing Expense: ${category}`, debit: amount, credit: 0 },
                settlementLine
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.expenseId,
            referenceType: 'MANUFACTURING_OPERATIONAL_EXPENSE',
            expenseCategory: category,
            paymentMode: validData.paymentMode || 'CASH',
            paymentStatus: validData.paymentStatus || 'PAID',
            dueDate: validData.dueDate || null,
            chequeClearanceDate: validData.chequeClearanceDate || null
        };
        await this.saveJournalEntry(journalEntry);
    }

    async handleManufacturingFinishedSale(data) {
        const validData = this.validateEventData('MANUFACTURING_FINISHED_GOOD_SALE', data);
        if (!validData) return;
        const amount = validData.amount;
        const saleType = String(validData.saleType || 'STANDARD').toUpperCase();
        const mode = String(validData.paymentMode || 'CASH').toUpperCase();
        const status = String(validData.paymentStatus || 'PAID').toUpperCase();
        const acc = this.getManufacturingAccountMap();
        let receiptLine;
        if (status === 'PENDING' || status === 'PENDING_CLEARANCE' || mode === 'CREDIT' || mode === 'CHEQUE') {
            receiptLine = { ...acc.AR, debit: amount, credit: 0 };
        } else if (mode === 'BANK' || mode === 'BANK_TRANSFER') {
            receiptLine = { ...acc.BANK, debit: amount, credit: 0 };
        } else {
            receiptLine = { ...acc.CASH, debit: amount, credit: 0 };
        }
        const cogsAmount = Number(validData.cogsAmount) || 0;
        const journalEntry = {
            date: new Date(),
            description: `Finished goods sale [${saleType}] - ${validData.productName || 'Product'} (${validData.companyName || 'Company'}) [${validData.paymentMode || 'CASH'}:${validData.paymentStatus || 'PAID'}]`,
            businessId: validData.businessId,
            entries: [
                receiptLine,
                { accountCode: '4-4010-01', accountName: 'Sales Revenue', debit: 0, credit: amount },
                { ...acc.COGS, debit: cogsAmount, credit: 0 },
                { ...acc.FG_INVENTORY, debit: 0, credit: cogsAmount }
            ],
            totalDebit: amount + cogsAmount,
            totalCredit: amount + cogsAmount,
            reference: validData.saleId,
            referenceType: 'MANUFACTURING_FINISHED_GOOD_SALE',
            saleType,
            paymentMode: validData.paymentMode || 'CASH',
            paymentStatus: validData.paymentStatus || 'PAID',
            dueDate: validData.dueDate || null,
            chequeClearanceDate: validData.chequeClearanceDate || null
        };
        await this.saveJournalEntry(journalEntry);
    }

    async handleManufacturingProductionRecorded(data) {
        const validData = this.validateEventData('MANUFACTURING_PRODUCTION_RECORDED', data);
        if (!validData) return;
        const acc = this.getManufacturingAccountMap();
        const rawCost = Number(validData.rawCost) || 0;
        const laborCost = Number(validData.laborCost) || 0;
        const overheadCost = Number(validData.overheadCost) || 0;
        const totalCost = Number(validData.totalCost) || 0;
        if (totalCost <= 0) return;

        const wipLoadEntry = {
            date: new Date(),
            description: `Production run started - ${validData.rawMaterial || 'Raw'} to ${validData.finishedProduct || 'FG'}`,
            businessId: validData.businessId,
            entries: [
                { ...acc.WIP, debit: totalCost, credit: 0 },
                { ...acc.RAW_INVENTORY, debit: 0, credit: rawCost },
                { ...acc.AP, accountName: 'Accrued Production Cost', debit: 0, credit: laborCost + overheadCost }
            ],
            totalDebit: totalCost,
            totalCredit: totalCost,
            reference: validData.runId,
            referenceType: 'MANUFACTURING_PRODUCTION_WIP'
        };
        await this.saveJournalEntry(wipLoadEntry);

        const fgCompletionEntry = {
            date: new Date(),
            description: `Production run completed - ${validData.finishedProduct || 'FG'}`,
            businessId: validData.businessId,
            entries: [
                { ...acc.FG_INVENTORY, debit: totalCost, credit: 0 },
                { ...acc.WIP, debit: 0, credit: totalCost }
            ],
            totalDebit: totalCost,
            totalCredit: totalCost,
            reference: validData.runId,
            referenceType: 'MANUFACTURING_PRODUCTION_FG'
        };
        await this.saveJournalEntry(fgCompletionEntry);
    }

    async handleManufacturingSideIncome(data) {
        const validData = this.validateEventData('MANUFACTURING_SIDE_INCOME', data);
        if (!validData) return;
        const amount = validData.amount;
        const incomeType = String(validData.incomeType || 'Side Income');
        const journalEntry = {
            date: new Date(),
            description: `${incomeType} income`,
            businessId: validData.businessId,
            entries: [
                { accountCode: '1-1010-01', accountName: 'Cash', debit: amount, credit: 0 },
                { accountCode: '4-4090-01', accountName: `Other Revenue: ${incomeType}`, debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.incomeId,
            referenceType: 'MANUFACTURING_SIDE_INCOME'
        };
        await this.saveJournalEntry(journalEntry);
    }

    async handleHandLoan(data) {
        const validData = this.validateEventData('HAND_LOAN_RECORDED', data);
        if (!validData) return;
        const amount = validData.amount;
        const isGiven = validData.type === 'GIVEN';

        const journalEntry = {
            date: new Date(validData.date || Date.now()),
            description: `Hand Loan ${isGiven ? 'given to' : 'received from'} ${validData.personName} - ${validData.description || ''}`,
            businessId: validData.businessId,
            entries: isGiven ? [
                { accountCode: '1-1050-01', accountName: 'Hand Loans Given', debit: amount, credit: 0 },
                { accountCode: '1-1010-01', accountName: 'Cash', debit: 0, credit: amount }
            ] : [
                { accountCode: '1-1010-01', accountName: 'Cash', debit: amount, credit: 0 },
                { accountCode: '2-2050-01', accountName: 'Hand Loans Received', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.loanId,
            referenceType: 'HAND_LOAN'
        };

        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for hand loan: Rs. ${amount}`);
    }

    async handleDistributorGrn(data) {
        const validData = this.validateEventData('DISTRIBUTOR_GRN_POSTED', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(validData.date || Date.now()),
            description: `Distributor GRN - ${validData.grnId} from ${validData.supplier || 'Unknown Supplier'}`,
            businessId: validData.businessId,
            entries: [
                { accountCode: '1-1040-01', accountName: 'Inventory', debit: amount, credit: 0 },
                { accountCode: '2-2010-01', accountName: 'Accounts Payable', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.grnId,
            referenceType: 'DISTRIBUTOR_GRN'
        };

        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for Distributor GRN: ${validData.grnId} - Rs. ${amount}`);
    }

    async handleFreeIssues(data) {
        const validData = this.validateEventData('FREE_ISSUES_RECORDED', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(validData.date?.toDate ? validData.date.toDate() : (validData.date || Date.now())),
            description: `Free Issues - Order ${validData.orderId}`,
            businessId: validData.businessId,
            entries: [
                { accountCode: '5-5030-01', accountName: 'Marketing & Promotion', debit: amount, credit: 0 },
                { accountCode: '1-1040-01', accountName: 'Inventory', debit: 0, credit: amount }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.orderId,
            referenceType: 'FREE_ISSUES'
        };

        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for Free Issues: Rs. ${amount}`);
    }

    async handleMarketReturns(data) {
        const validData = this.validateEventData('MARKET_RETURNS_RECORDED', data);
        if (!validData) return;
        const amount = validData.amount;

        const journalEntry = {
            date: new Date(validData.date?.toDate ? validData.date.toDate() : (validData.date || Date.now())),
            description: `Market Returns - Order ${validData.orderId}`,
            businessId: validData.businessId,
            entries: [
                { accountCode: '4-4010-02', accountName: 'Sales Returns', debit: amount, credit: 0 },
                { accountCode: '1-1060-01', accountName: 'Accounts Receivable', debit: 0, credit: amount, customerId: validData.customerId }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.orderId,
            referenceType: 'MARKET_RETURNS'
        };

        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for Market Returns: Rs. ${amount}`);
    }

    async handleFinanceTransaction(data) {
        const validData = this.validateEventData('FINANCE_TRANSACTION_RECORDED', data);
        if (!validData) return;
        const amount = validData.amount;
        const isPaymentGiven = validData.type === 'PAYMENT_GIVEN';
        const method = String(validData.method || 'CASH').toUpperCase();
        const cashOrBankLine = (method === 'BANK' || method === 'BANK_TRANSFER' || method === 'CHEQUE')
            ? { accountCode: '1-1020-01', accountName: 'Bank - Current Account' }
            : { accountCode: '1-1010-01', accountName: 'Cash' };

        const journalEntry = {
            date: new Date(validData.date || Date.now()),
            description: `Finance Payment ${isPaymentGiven ? 'to' : 'from'} ${validData.customerName || 'Customer'} - ${validData.note || ''}`,
            businessId: validData.businessId,
            entries: isPaymentGiven ? [
                { accountCode: '2-2010-01', accountName: 'Accounts Payable', debit: amount, credit: 0, supplierId: validData.customerId },
                { ...cashOrBankLine, debit: 0, credit: amount }
            ] : [
                { ...cashOrBankLine, debit: amount, credit: 0 },
                { accountCode: '1-1060-01', accountName: 'Accounts Receivable', debit: 0, credit: amount, customerId: validData.customerId }
            ],
            totalDebit: amount,
            totalCredit: amount,
            reference: validData.transactionId,
            referenceType: 'FINANCE_PAYMENT'
        };

        await this.saveJournalEntry(journalEntry);
        console.log(`📝 Journal entry created for Finance Payment: Rs. ${amount}`);
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
            const lines = Array.isArray(entry.entries) ? entry.entries : [];
            if (!lines.length) {
                console.error('Skipped journal entry: no lines', entry);
                return;
            }
            const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
            const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                console.error('Skipped unbalanced journal entry', { entry, totalDebit, totalCredit });
                return;
            }
            entry.totalDebit = totalDebit;
            entry.totalCredit = totalCredit;
            if (!entry.date) entry.date = new Date();
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