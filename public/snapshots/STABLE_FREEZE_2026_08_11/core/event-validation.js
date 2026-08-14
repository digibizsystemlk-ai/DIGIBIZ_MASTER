// Event Payload Validation Utility - Core Module
// Shared validation rules for event payload consistency

const EVENT_PAYLOAD_SCHEMAS = {
    SALE_COMPLETED: {
        required: {
            amount: 'positiveNumber'
        },
        optional: {
            invoiceNo: 'string',
            businessId: 'string'
        }
    },
    PURCHASE_MADE: {
        required: {
            amount: 'positiveNumber'
        },
        optional: {
            orderNo: 'string',
            paymentStatus: 'string',
            paymentMode: 'string',
            businessId: 'string'
        }
    },
    LOAN_GIVEN: {
        required: {
            amount: 'positiveNumber',
            customerName: 'nonEmptyString'
        },
        optional: {
            loanId: 'string'
        }
    },
    LOAN_RECEIVED: {
        required: {
            amount: 'positiveNumber',
            customerName: 'nonEmptyString'
        },
        optional: {
            paymentId: 'string'
        }
    },
    EXPENSE_MADE: {
        required: {
            amount: 'positiveNumber',
            description: 'nonEmptyString'
        },
        optional: {
            expenseType: 'string',
            receiptNo: 'string'
        }
    },
    DISTRIBUTOR_ORDER_APPROVED: {
        required: {
            amount: 'positiveNumber',
            orderId: 'nonEmptyString',
            businessId: 'nonEmptyString'
        },
        optional: {
            orderNo: 'string',
            approvedBy: 'string'
        }
    },
    MANUFACTURING_RAW_MATERIAL_PURCHASED: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            purchaseId: 'nonEmptyString'
        },
        optional: {
            supplierName: 'string',
            materialName: 'string',
            paymentMode: 'string',
            paymentStatus: 'string',
            dueDate: 'string',
            chequeClearanceDate: 'string'
        }
    },
    MANUFACTURING_OPERATIONAL_EXPENSE: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            expenseId: 'nonEmptyString',
            category: 'nonEmptyString'
        },
        optional: {
            notes: 'string',
            paymentMode: 'string',
            paymentStatus: 'string',
            dueDate: 'string',
            chequeClearanceDate: 'string'
        }
    },
    MANUFACTURING_FINISHED_GOOD_SALE: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            saleId: 'nonEmptyString'
        },
        optional: {
            productName: 'string',
            qty: 'positiveNumber',
            paymentMode: 'string',
            paymentStatus: 'string',
            dueDate: 'string',
            chequeClearanceDate: 'string',
            companyName: 'string',
            cogsAmount: 'number',
            fgUnitCost: 'number'
        }
    },
    MANUFACTURING_PRODUCTION_RECORDED: {
        required: {
            businessId: 'nonEmptyString',
            runId: 'nonEmptyString',
            rawMaterial: 'nonEmptyString',
            finishedProduct: 'nonEmptyString',
            rawQty: 'positiveNumber',
            finishedQty: 'positiveNumber',
            totalCost: 'positiveNumber'
        },
        optional: {
            rawCost: 'number',
            laborCost: 'number',
            overheadCost: 'number'
        }
    },
    MANUFACTURING_SIDE_INCOME: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            incomeId: 'nonEmptyString'
        },
        optional: {
            incomeType: 'string'
        }
    },
    HAND_LOAN_RECORDED: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            type: 'nonEmptyString',
            personName: 'nonEmptyString'
        },
        optional: {
            loanId: 'string',
            interestType: 'string',
            interestValue: 'number',
            description: 'string',
            date: 'string'
        }
    },
    DISTRIBUTOR_GRN_POSTED: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            grnId: 'nonEmptyString'
        },
        optional: {
            supplier: 'string',
            date: 'string'
        }
    },
    FREE_ISSUES_RECORDED: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            orderId: 'nonEmptyString'
        },
        optional: {
            date: 'any'
        }
    },
    MARKET_RETURNS_RECORDED: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            orderId: 'nonEmptyString'
        },
        optional: {
            date: 'any'
        }
    },
    FINANCE_TRANSACTION_RECORDED: {
        required: {
            amount: 'positiveNumber',
            businessId: 'nonEmptyString',
            type: 'nonEmptyString',
            customerId: 'nonEmptyString'
        },
        optional: {
            method: 'string',
            date: 'string',
            note: 'string',
            transactionId: 'string'
        }
    }
};

function runValidator(type, value) {
    if (type === 'positiveNumber') {
        const num = Number(value);
        if (!Number.isFinite(num) || num <= 0) return { valid: false };
        return { valid: true, normalized: num };
    }

    if (type === 'string') {
        if (value === undefined || value === null) return { valid: false };
        return { valid: typeof value === 'string', normalized: value };
    }

    if (type === 'number') {
        const num = Number(value);
        if (!Number.isFinite(num)) return { valid: false };
        return { valid: true, normalized: num };
    }

    if (type === 'nonEmptyString') {
        if (typeof value !== 'string') return { valid: false };
        const normalized = value.trim();
        return { valid: normalized.length > 0, normalized };
    }

    return { valid: false };
}

function validateEventPayload(eventType, payload) {
    const schema = EVENT_PAYLOAD_SCHEMAS[eventType];
    if (!schema) {
        return { valid: true, errors: [], sanitizedData: payload };
    }

    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
        return {
            valid: false,
            errors: ['Payload must be a non-null object'],
            sanitizedData: null
        };
    }

    const errors = [];
    const sanitizedData = { ...payload };

    Object.entries(schema.required || {}).forEach(([field, type]) => {
        const result = runValidator(type, payload[field]);
        if (!result.valid) {
            errors.push(`Field "${field}" must be ${type}`);
            return;
        }
        sanitizedData[field] = result.normalized;
    });

    Object.entries(schema.optional || {}).forEach(([field, type]) => {
        if (payload[field] === undefined || payload[field] === null) return;
        const result = runValidator(type, payload[field]);
        if (!result.valid) {
            errors.push(`Optional field "${field}" must be ${type}`);
            return;
        }
        sanitizedData[field] = result.normalized;
    });

    return {
        valid: errors.length === 0,
        errors,
        sanitizedData: errors.length ? null : sanitizedData
    };
}

window.EVENT_PAYLOAD_SCHEMAS = EVENT_PAYLOAD_SCHEMAS;
window.validateEventPayload = validateEventPayload;

console.log('✅ Event Payload Validation Utility Initialized');
