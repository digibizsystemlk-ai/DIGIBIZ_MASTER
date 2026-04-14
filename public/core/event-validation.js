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
            orderNo: 'string'
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
