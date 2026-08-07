/**
 * DIGIBIZ Auto Care - Global Utility Helper Functions
 * Includes: Company Name Resolver, DD/MM/YYYY Date Formatter,
 * Tenant Auto-Increment Number Generators (EST-00001, INS-00001, JOB-00001),
 * Auto-Remembering Technician Directory, and Vehicle Brand/Model Auto-Memory.
 */

window.AutoCareUtils = {
    // 1. Resolve Current Company Name
    getCompanyName: function() {
        const cached = localStorage.getItem('currentBusinessName') || sessionStorage.getItem('currentBusinessName');
        if (cached && cached.trim()) return cached.trim();
        
        if (window.Sidebar && typeof window.Sidebar.getBusinessName === 'function') {
            const sidebarName = window.Sidebar.getBusinessName();
            if (sidebarName) return sidebarName;
        }

        return "DIGIBIZ Auto Care & Repair Center";
    },

    // 2. Format Date as DD/MM/YYYY
    formatDateDDMMYYYY: function(dateStrOrObj) {
        if (!dateStrOrObj) return '-';
        let d;
        if (typeof dateStrOrObj === 'string') {
            const parts = dateStrOrObj.split('-');
            if (parts.length === 3) {
                const year = parts[0];
                const month = parts[1].padStart(2, '0');
                const day = parts[2].padStart(2, '0');
                return `${day}/${month}/${year}`;
            }
            d = new Date(dateStrOrObj);
        } else {
            d = new Date(dateStrOrObj);
        }

        if (isNaN(d.getTime())) return String(dateStrOrObj);

        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}/${month}/${year}`;
    },

    // 3. Get Current Tenant Business ID
    getBizId: function() {
        return localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || 'DEFAULT_BIZ';
    },

    // 4. Auto-Remembering Technician Directory
    getTechnicians: function() {
        const bizId = this.getBizId();
        const key = `autocare_techs_${bizId}`;
        const cached = localStorage.getItem(key);
        const defaults = [
            "Nimal Kumara (Senior Mechanic)",
            "Kamal Perera (Auto Electrician)",
            "Suneth Jayasinghe (Tuning Specialist)",
            "Priyantha Silva (General Tech)"
        ];

        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch(e) {}
        }
        return defaults;
    },

    saveTechnician: function(techName) {
        if (!techName || !techName.trim()) return;
        const name = techName.trim();
        const list = this.getTechnicians();
        const exists = list.some(t => t.toLowerCase() === name.toLowerCase());
        if (!exists) {
            list.push(name);
            const bizId = this.getBizId();
            localStorage.setItem(`autocare_techs_${bizId}`, JSON.stringify(list));
        }
    },

    // 5. Auto-Remembering Vehicle Brands & Models
    getVehicleBrands: function() {
        const bizId = this.getBizId();
        const key = `autocare_brands_${bizId}`;
        const cached = localStorage.getItem(key);
        const defaults = [
            "Toyota", "Honda", "Nissan", "Mitsubishi", "Suzuki",
            "Hyundai", "Kia", "Mercedes-Benz", "BMW", "Audi",
            "Isuzu", "Land Rover", "Peugeot", "Mazda", "Subaru"
        ];

        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch(e) {}
        }
        return defaults;
    },

    saveVehicleBrand: function(brandName) {
        if (!brandName || !brandName.trim()) return;
        const name = brandName.trim();
        const list = this.getVehicleBrands();
        const exists = list.some(b => b.toLowerCase() === name.toLowerCase());
        if (!exists) {
            list.push(name);
            const bizId = this.getBizId();
            localStorage.setItem(`autocare_brands_${bizId}`, JSON.stringify(list));
        }
    },

    getVehicleModels: function() {
        const bizId = this.getBizId();
        const key = `autocare_models_${bizId}`;
        const cached = localStorage.getItem(key);
        const defaults = [
            "Prius", "Axio", "Allion", "Premio", "Vezel", "Fit GP5",
            "WagonR", "X-Trail", "Montero", "Alto", "Civic", "Corolla",
            "Grace", "Raize", "CHR", "Rocky", "Outlander", "Aqua"
        ];

        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            } catch(e) {}
        }
        return defaults;
    },

    saveVehicleModel: function(modelName) {
        if (!modelName || !modelName.trim()) return;
        const name = modelName.trim();
        const list = this.getVehicleModels();
        const exists = list.some(m => m.toLowerCase() === name.toLowerCase());
        if (!exists) {
            list.push(name);
            const bizId = this.getBizId();
            localStorage.setItem(`autocare_models_${bizId}`, JSON.stringify(list));
        }
    },

    // 6. Auto-Increment Estimations Number (EST-00001, EST-00002...)
    getNextEstNumber: function() {
        const bizId = this.getBizId();
        const counterKey = `autocare_est_counter_${bizId}`;
        let current = parseInt(localStorage.getItem(counterKey) || '0', 10) + 1;
        const formatted = 'EST-' + String(current).padStart(5, '0');
        return formatted;
    },

    saveEstCounter: function() {
        const bizId = this.getBizId();
        const counterKey = `autocare_est_counter_${bizId}`;
        let current = parseInt(localStorage.getItem(counterKey) || '0', 10) + 1;
        localStorage.setItem(counterKey, String(current));
    },

    // 7. Auto-Increment Inspection Number (INS-00001, INS-00002...)
    getNextInspNumber: function() {
        const bizId = this.getBizId();
        const counterKey = `autocare_insp_counter_${bizId}`;
        let current = parseInt(localStorage.getItem(counterKey) || '0', 10) + 1;
        const formatted = 'INS-' + String(current).padStart(5, '0');
        return formatted;
    },

    saveInspCounter: function() {
        const bizId = this.getBizId();
        const counterKey = `autocare_insp_counter_${bizId}`;
        let current = parseInt(localStorage.getItem(counterKey) || '0', 10) + 1;
        localStorage.setItem(counterKey, String(current));
    },

    // 8. Auto-Increment Job Card Number (JOB-00001, JOB-00002...)
    getNextJobNumber: function() {
        const bizId = this.getBizId();
        const counterKey = `autocare_job_counter_${bizId}`;
        let current = parseInt(localStorage.getItem(counterKey) || '0', 10) + 1;
        const formatted = 'JOB-' + String(current).padStart(5, '0');
        return formatted;
    },

    saveJobCounter: function() {
        const bizId = this.getBizId();
        const counterKey = `autocare_job_counter_${bizId}`;
        let current = parseInt(localStorage.getItem(counterKey) || '0', 10) + 1;
        localStorage.setItem(counterKey, String(current));
    }
};
