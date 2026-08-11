/**
 * DIGIBIZ Auto Care - Global Utility Helper Functions
 * Includes: Company Name Resolver, DD/MM/YYYY Date Formatter,
 * Tenant Auto-Increment Number Generators (EST-00001, INS-00001, JOB-00001),
 * Auto-Remembering Technician Directory, Vehicle Brand/Model Auto-Memory,
 * and Persistent Customer Name & Phone Directory Auto-Memory.
 */

window.AutoCareUtils = {
    // 1. Resolve Current Company Name dynamically from Business Profile (Firestore / LocalStorage)
    getCompanyName: function() {
        const cached = localStorage.getItem('currentBusinessName') || sessionStorage.getItem('currentBusinessName');
        if (cached && cached.trim() && cached.trim() !== 'My Business' && cached.trim() !== 'No Business Connected') {
            return cached.trim();
        }
        
        if (window.Sidebar && typeof window.Sidebar.getBusinessName === 'function') {
            const sidebarName = window.Sidebar.getBusinessName();
            if (sidebarName && sidebarName !== 'My Business' && sidebarName !== 'No Business Connected') {
                return sidebarName;
            }
        }

        // Check if demo/test account
        let isDemo = false;
        try {
            const email = (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser && firebase.auth().currentUser.email) ? firebase.auth().currentUser.email.toLowerCase() : '';
            const bizId = this.getBizId();
            if (email.includes('test') || email.includes('demo') || bizId === 'DEFAULT_BIZ' || bizId === 'DEMO_BIZ' || bizId.toLowerCase().includes('test') || bizId.toLowerCase().includes('demo')) {
                isDemo = true;
            }
        } catch(e) {}

        return isDemo ? "DEMO Motors & Auto Care" : "Auto Care Center";
    },

    // Company Logo Helpers
    getCompanyLogo: function() {
        const bizId = this.getBizId();
        return localStorage.getItem(`autocare_logo_${bizId}`) ||
               localStorage.getItem('currentBusinessLogo') ||
               sessionStorage.getItem('currentBusinessLogo') ||
               localStorage.getItem('digibizBusinessLogoUrl') ||
               sessionStorage.getItem('digibizBusinessLogoUrl') ||
               localStorage.getItem('business_logo') || '';
    },

    saveCompanyLogo: function(base64Data) {
        if (!base64Data) return;
        const bizId = this.getBizId();
        try {
            localStorage.setItem(`autocare_logo_${bizId}`, base64Data);
            localStorage.setItem('currentBusinessLogo', base64Data);
            sessionStorage.setItem('currentBusinessLogo', base64Data);
            localStorage.setItem('digibizBusinessLogoUrl', base64Data);
            sessionStorage.setItem('digibizBusinessLogoUrl', base64Data);
            localStorage.setItem('business_logo', base64Data);
        } catch(e) {
            console.warn('[AutoCareUtils] Logo local storage save error:', e);
        }
    },

    renderCompanyLogo: function(containerId, defaultIconClass = 'fa-solid fa-car-tunnel') {
        const el = document.getElementById(containerId);
        if (!el) return;
        const logoUrl = this.getCompanyLogo();
        if (logoUrl) {
            el.innerHTML = `<img src="${logoUrl}" alt="Logo" style="max-width:100%; max-height:100%; object-fit:contain; border-radius:8px;">`;
            el.style.background = 'transparent';
            el.style.boxShadow = 'none';
        } else {
            el.innerHTML = `<i class="${defaultIconClass}"></i>`;
        }
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
        const defaults = [];

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
        const defaults = [];

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
        const defaults = [];

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

    // 6. Persistent Customer Directory & Auto-Memory
    getCustomers: function() {
        const bizId = this.getBizId();
        const key = `autocare_customers_${bizId}`;
        const cached = localStorage.getItem(key);
        if (cached) {
            try { return JSON.parse(cached); } catch(e) {}
        }
        return [];
    },

    saveCustomerMemory: function(name, phone, regNo = '', brand = '', model = '') {
        if (!name || !name.trim()) return;
        const cName = name.trim();
        const cPhone = (phone || '').trim();
        const cReg = (regNo || '').trim().toUpperCase();
        const cBrand = (brand || '').trim();
        const cModel = (model || '').trim();

        let customers = this.getCustomers();
        const existingIdx = customers.findIndex(c => c.name.toLowerCase() === cName.toLowerCase() || (cPhone && c.phone === cPhone));

        if (existingIdx >= 0) {
            if (cPhone) customers[existingIdx].phone = cPhone;
            if (cReg) customers[existingIdx].reg = cReg;
            if (cBrand) customers[existingIdx].brand = cBrand;
            if (cModel) customers[existingIdx].model = cModel;
        } else {
            customers.unshift({
                id: 'CUST-' + Date.now(),
                name: cName,
                phone: cPhone,
                reg: cReg,
                brand: cBrand,
                model: cModel,
                totalSpent: 0,
                history: []
            });
        }

        const bizId = this.getBizId();
        localStorage.setItem(`autocare_customers_${bizId}`, JSON.stringify(customers));

        // Save brand & model memory as well!
        if (cBrand) this.saveVehicleBrand(cBrand);
        if (cModel) this.saveVehicleModel(cModel);
    },

    // 7. Auto-Increment Estimations Number (EST-00001, EST-00002...)
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

    // 8. Auto-Increment Inspection Number (INS-00001, INS-00002...)
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

    // 9. Auto-Increment Job Card Number (JOB-00001, JOB-00002...)
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
