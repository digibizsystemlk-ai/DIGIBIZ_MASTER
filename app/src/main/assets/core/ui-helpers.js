/**
 * DigiBiz UI Helpers - Global Autosuggestion & Field Memory
 * Allows any input to "remember" its values per business.
 */
window.DigiBizUI = (function () {
    const API = {};

    /**
     * @returns {string|null} Current business ID from local/session storage
     */
    function getBusinessId() {
        return localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
    }

    function getSuggestionRef(bid) {
        if (!window.db || !bid) return null;
        return window.db.collection('businesses').doc(bid).collection('global_field_suggestions');
    }

    /**
     * Saves a value for a specific field key.
     * @param {string} fieldKey e.g., 'PRODUCT_NAME', 'MATERIAL_NAME'
     * @param {string} value 
     */
    API.saveFieldSuggestion = async function (fieldKey, value) {
        const bid = getBusinessId();
        const raw = String(value || '').trim();
        if (!raw || !bid) return;

        // LOCAL MEMORY (Always works even if Firestore fails)
        const localKey = `digibiz_suggestions_${bid}_${fieldKey}`;
        try {
            let localList = JSON.parse(localStorage.getItem(localKey) || '[]');
            if (!localList.includes(raw)) {
                localList.push(raw);
                localStorage.setItem(localKey, JSON.stringify(localList.slice(-50))); // Keep last 50
            }
        } catch (e) { /* ignore */ }

        // FIRESTORE (Try if available)
        if (!window.db) return;
        const id = `${fieldKey}_${raw.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        try {
            await getSuggestionRef(bid).doc(id).set({
                businessId: bid,
                fieldKey: fieldKey,
                value: raw,
                updatedAt: new Date()
            }, { merge: true });
        } catch (e) {
            console.warn('[DigiBizUI] Failed to save suggestion to Firestore (likely quota):', e.message);
        }
    };

    /**
     * Loads suggestions for a specific field key.
     * @param {string} fieldKey 
     * @returns {Promise<string[]>}
     */
    API.loadFieldSuggestions = async function (fieldKey) {
        const bid = getBusinessId();
        if (!bid) return [];

        // Combine Local Storage + Firestore
        const localKey = `digibiz_suggestions_${bid}_${fieldKey}`;
        let suggestions = [];
        try {
            suggestions = JSON.parse(localStorage.getItem(localKey) || '[]');
        } catch (e) { /* ignore */ }

        if (window.db) {
            try {
                const snap = await getSuggestionRef(bid)
                    .where('fieldKey', '==', fieldKey)
                    .orderBy('value')
                    .get();
                const fsList = snap.docs.map(d => (d.data() || {}).value).filter(Boolean);
                // Merge and unique
                suggestions = [...new Set([...suggestions, ...fsList])].sort();
            } catch (e) {
                console.warn('[DigiBizUI] Failed to load suggestions from Firestore (likely quota):', e.message);
            }
        }
        return suggestions;
    };

    /**
     * Binds an input to an autosuggestion list.
     * @param {string|HTMLElement} inputOrId 
     * @param {string} fieldKey 
     * @returns {Promise<Function>} A function to trigger saving the current input value.
     */
    API.bindAutocomplete = async function (inputOrId, fieldKey) {
        const input = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
        if (!input) return () => {};

        const listId = `datalist_${fieldKey}_${Math.random().toString(36).slice(2, 7)}`;
        let datalist = document.createElement('datalist');
        datalist.id = listId;
        document.body.appendChild(datalist);
        input.setAttribute('list', listId);

        const refreshList = async () => {
            const suggestions = await API.loadFieldSuggestions(fieldKey);
            datalist.innerHTML = suggestions.map(s => `<option value="${s}"></option>`).join('');
        };

        // Load initial suggestions
        await refreshList();

        // Return the saver function
        return async () => {
            const val = input.value.trim();
            if (val) {
                await API.saveFieldSuggestion(fieldKey, val);
                await refreshList();
            }
        };
    };

    /**
     * Caching helper to reduce Firestore Reads.
     */
    const cache = {
        data: {},
        expiry: {}
    };

    /**
     * Gets data from cache or fetches it using the provider.
     * @param {string} key Unique key for this data
     * @param {Function} provider Async function that returns the data if not in cache
     * @param {number} ttl Time to live in milliseconds (default 5 mins)
     */
    API.withCache = async function (key, provider, ttl = 300000) {
        const now = Date.now();
        if (cache.data[key] && cache.expiry[key] > now) {
            return cache.data[key];
        }

        const data = await provider();
        cache.data[key] = data;
        cache.expiry[key] = now + ttl;
        return data;
    };

    API.clearCache = function (key) {
        if (key) {
            delete cache.data[key];
            delete cache.expiry[key];
        } else {
            cache.data = {};
            cache.expiry = {};
        }
    };

    return API;
})();
