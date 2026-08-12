// Event Bus System - Core Module
// මෙය හැම module එකක්ම අතර සන්නිවේදනය කරන මැදිරියයි

function ensureEventPayloadValidator() {
    if (typeof window.validateEventPayload === 'function') return;

    if (!window.EVENT_PAYLOAD_SCHEMAS) {
        window.EVENT_PAYLOAD_SCHEMAS = {
            SALE_COMPLETED: {
                required: { amount: 'positiveNumber' },
                optional: { invoiceNo: 'string', businessId: 'string' }
            },
            PURCHASE_MADE: {
                required: { amount: 'positiveNumber' },
                optional: { orderNo: 'string', paymentStatus: 'string', businessId: 'string' }
            },
            LOAN_GIVEN: {
                required: { amount: 'positiveNumber', customerName: 'nonEmptyString' },
                optional: { loanId: 'string' }
            },
            LOAN_RECEIVED: {
                required: { amount: 'positiveNumber', customerName: 'nonEmptyString' },
                optional: { paymentId: 'string' }
            },
            EXPENSE_MADE: {
                required: { amount: 'positiveNumber', description: 'nonEmptyString' },
                optional: { expenseType: 'string', receiptNo: 'string' }
            },
            DISTRIBUTOR_ORDER_APPROVED: {
                required: { amount: 'positiveNumber', orderId: 'nonEmptyString', businessId: 'nonEmptyString' },
                optional: { orderNo: 'string', approvedBy: 'string' }
            }
        };
    }

    const runValidator = (type, value) => {
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
    };

    window.validateEventPayload = function validateEventPayload(eventType, payload) {
        const schema = window.EVENT_PAYLOAD_SCHEMAS[eventType];
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
    };
}

class EventBus {
    constructor() {
        ensureEventPayloadValidator();
        this.listeners = new Map();  // Event types සහ listeners store කරනවා
        this.eventHistory = [];       // Debugging සඳහා event history
        this.maxHistorySize = 1000;
    }

    // Event එකක් publish කරන්න (module එකක් event එකක් නිකුත් කරනවා)
    publish(eventType, data) {
        const validator = window.validateEventPayload;
        let payload = data;
        if (typeof validator === 'function') {
            const validation = validator(eventType, data);
            if (!validation.valid) {
                console.error(`❌ Event validation failed for ${eventType}:`, validation.errors, data);
                return null;
            }
            payload = validation.sanitizedData;
        }

        const event = {
            id: Date.now() + '-' + Math.random().toString(36).substr(2, 6),
            type: eventType,
            data: payload,
            timestamp: new Date().toISOString(),
            processed: false
        };
        
        console.log(`📢 Event Published: ${eventType}`, payload);
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.maxHistorySize) {
            this.eventHistory.shift();
        }
        
        // Listeners ට දැනුම් දෙන්න
        if (this.listeners.has(eventType)) {
            this.listeners.get(eventType).forEach(listener => {
                try {
                    listener(event);
                } catch (error) {
                    console.error(`Error in listener for ${eventType}:`, error);
                }
            });
        }
        
        // Firestore එකේ save කරන්න (persistence සඳහා)
        this.saveToFirestore(event);
        
        return event.id;
    }

    // Event එකකට සවන් දෙන්න (module එකක් event එකක් අහනවා)
    subscribe(eventType, callback, moduleName = 'unknown') {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
        console.log(`👂 ${moduleName} subscribed to: ${eventType}`);
        
        // Unsubscribe function එක return කරන්න
        return () => {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index !== -1) callbacks.splice(index, 1);
            console.log(`🔇 ${moduleName} unsubscribed from: ${eventType}`);
        };
    }

    // Event එක Firestore එකේ save කරන්න
    async saveToFirestore(event) {
        if (!window.db) return;
        try {
            const user = firebase.auth().currentUser;
            if (user) {
                await window.db.collection('events').add(event);
            }
        } catch (error) {
            console.error('Failed to save event:', error);
        }
    }

    // Event history එක බලන්න (debugging)
    getEventHistory() {
        return [...this.eventHistory];
    }
}

// Global Event Bus instance එකක් හදන්න
window.eventBus = new EventBus();
console.log('✅ Event Bus System Initialized');