/**
 * Registration UI Utilities - Shared logic for the registration flow.
 * Provides robust, smart-check enabled business type discovery.
 */

window.RegistrationUI = {
    /**
     * Populates a select element with business types using smart auto-detection.
     * @param {HTMLSelectElement} selectElement 
     */
    async populateBusinessTypes(selectElement) {
        if (!window.BUSINESS_TYPES) {
            console.error('[RegistrationUI] BUSINESS_TYPES not found');
            return;
        }

        // Wait for DB to be available
        let retry = 0;
        while (!window.db && retry < 50) {
            await new Promise(r => setTimeout(r, 100));
            retry++;
        }

        if (!window.db) {
            console.error('[RegistrationUI] Firestore (window.db) not initialized after timeout');
            return;
        }

        const types = ['retail', 'auto_care', 'tire_centre', 'attendance_payroll'];
        selectElement.innerHTML = '<option value="" disabled selected>Select your business type...</option>';

        const promises = types.map(async (key) => {
            const type = window.BUSINESS_TYPES[key];
            if (!type || type.hidden === true) return;

            try {
                // Smart Check Logic:
                // 1. Ready in config (Explicitly set to isReady: true)
                // 2. Live in DB (At least one business already exists for this type)
                const isReadyInConfig = type.isReady === true;
                let isLiveInDb = false;

                if (!isReadyInConfig) {
                    const snap = await window.db.collection('businesses')
                        .where('businessType', '==', type.id)
                        .limit(1)
                        .get();
                    isLiveInDb = !snap.empty;
                }

                if (isReadyInConfig || isLiveInDb) {
                    const option = document.createElement('option');
                    option.value = type.id;
                    option.textContent = `${type.icon} ${type.name}`;
                    selectElement.appendChild(option);
                }
            } catch (e) {
                console.warn(`[RegistrationUI] Smart check failed for ${type.id}:`, e);
            }
        });

        await Promise.all(promises);

        // Select retail by default if it is available
        if (selectElement.querySelector('option[value="retail"]')) {
            selectElement.value = 'retail';
        }
    }
};
