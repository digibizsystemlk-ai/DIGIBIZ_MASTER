/**
 * DigiBiz Offline Auth Bridge
 * Handles PIN-based local session access when internet is unavailable.
 */
window.digibizOfflineAuth = (function() {
    const STORAGE_KEY = 'digibiz_offline_session';
    const PIN_KEY = 'digibiz_offline_pin_hash';

    // Simple hash function for local PIN storage
    function hashPin(pin) {
        let hash = 0;
        const p = String(pin);
        for (let i = 0; i < p.length; i++) {
            const char = p.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; 
        }
        return String(hash);
    }

    return {
        /**
         * Saves essential user data for offline use. 
         * Called after successful online login.
         */
        saveSession: function(user, role, businessId) {
            if (!user) return;
            const session = {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName || 'Owner',
                role: role || localStorage.getItem('currentUserRole'),
                businessId: businessId || localStorage.getItem('currentBusinessId'),
                timestamp: Date.now()
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
            console.info('[OfflineAuth] Session cached.');
        },

        /**
         * Sets or updates the 4-6 digit PIN.
         */
        setPin: function(pin) {
            if (!pin || pin.length < 4) return false;
            localStorage.setItem(PIN_KEY, hashPin(pin));
            return true;
        },

        /**
         * Checks if a PIN is already set.
         */
        hasPin: function() {
            return !!localStorage.getItem(PIN_KEY);
        },

        /**
         * Verifies PIN and returns mock user if successful.
         */
        verifyAndLogin: function(pin) {
            const storedHash = localStorage.getItem(PIN_KEY);
            if (!storedHash) throw new Error('No PIN set. Please login online first and set a PIN.');
            
            if (hashPin(pin) === storedHash) {
                const sessionStr = localStorage.getItem(STORAGE_KEY);
                if (!sessionStr) throw new Error('No cached session found. Please login online once.');
                
                const session = JSON.parse(sessionStr);
                // Flag this session as offline-mocked
                session.isOfflineMode = true;
                
                // Persist back to standard storage for dashboard-core.js etc.
                localStorage.setItem('currentBusinessId', session.businessId);
                localStorage.setItem('currentBusinessType', 'scrap_collection_center');
                localStorage.setItem('currentUserRole', session.role);
                
                return session;
            } else {
                throw new Error('Invalid PIN.');
            }
        },

        /**
         * Returns true if we are currently "logged in" via offline mock.
         */
        isOfflineSessionActive: function() {
            return sessionStorage.getItem('digibiz_offline_active') === 'true';
        }
    };
})();
