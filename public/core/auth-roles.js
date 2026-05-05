// Role-Based Access Control Core
// මෙය පරිශීලකයන්ගේ roles සහ permissions කළමනාකරණය කරයි

const ROLES = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    BUSINESS_OWNER: 'BUSINESS_OWNER', 
    ACCOUNTANT: 'ACCOUNTANT',
    CASHIER: 'CASHIER',
    STORE_KEEPER: 'STORE_KEEPER',
    VIEWER: 'VIEWER',
    DISTRIBUTOR_OWNER: 'DISTRIBUTOR_OWNER',
    REP_SUPERVISOR: 'REP_SUPERVISOR',
    WAREHOUSE_MANAGER: 'WAREHOUSE_MANAGER',
    DELIVERY_MANAGER: 'DELIVERY_MANAGER',
    REP: 'REP',

    // MW Trading (Destrugatters) roles
    SALES_COORDINATOR: 'SALES_COORDINATOR',
    AREA_MANAGER: 'AREA_MANAGER'
};

const PERMISSIONS = {
    // Accounting permissions
    VIEW_ACCOUNTS: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'ACCOUNTANT'],
    EDIT_ACCOUNTS: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'ACCOUNTANT'],
    DELETE_ACCOUNTS: ['SUPER_ADMIN', 'BUSINESS_OWNER'],
    
    // Sales permissions
    VIEW_SALES: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'ACCOUNTANT', 'CASHIER'],
    CREATE_SALE: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'CASHIER'],
    REFUND_SALE: ['SUPER_ADMIN', 'BUSINESS_OWNER'],
    
    // Inventory permissions
    VIEW_INVENTORY: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_KEEPER', 'ACCOUNTANT'],
    EDIT_INVENTORY: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'STORE_KEEPER'],
    
    // User management
    MANAGE_USERS: ['SUPER_ADMIN', 'BUSINESS_OWNER'],
    MANAGE_BUSINESSES: ['SUPER_ADMIN'],
    
    // Reports
    VIEW_REPORTS: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'ACCOUNTANT'],
    EXPORT_REPORTS: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'ACCOUNTANT'],
    
    // Settings
    EDIT_SETTINGS: ['SUPER_ADMIN', 'BUSINESS_OWNER'],
    CREATE_REP_ORDER: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'DISTRIBUTOR_OWNER', 'REP'],
    APPROVE_REP_ORDER: ['SUPER_ADMIN', 'BUSINESS_OWNER', 'DISTRIBUTOR_OWNER']
};

// Menu structure by role
const MENU_BY_ROLE = {
    SUPER_ADMIN: [
        { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html" },
        { icon: "🏢", name: "All Businesses", link: "/modules/admin/businesses.html" },
        { icon: "👥", name: "All Users", link: "/modules/admin/users.html" },
        { icon: "📁", name: "Accounting", children: [
            { name: "Advanced Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html" },
            { name: "Chart of Accounts", link: "/modules/accounts/chart-of-accounts.html" }
        ]},
        { icon: "🏪", name: "Retail", children: [
            { name: "POS / Billing", link: "/modules/retail/pos.html" },
            { name: "Inventory", link: "/modules/retail/inventory.html" }
        ]},
        { icon: "📋", name: "Reports", children: [
            { name: "Sales Report", link: "/modules/reports/sales.html" },
            { name: "Financial Reports", link: "/modules/reports/financial.html" }
        ]},
        { icon: "⚙️", name: "System Settings", link: "/modules/admin/settings.html" }
    ],
    
    BUSINESS_OWNER: [
        { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html" },
        { icon: "📁", name: "Accounting", children: [
            { name: "Advanced Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html" },
            { name: "Chart of Accounts", link: "/modules/accounts/chart-of-accounts.html" }
        ]},
        { icon: "🏪", name: "Retail", children: [
            { name: "POS / Billing", link: "/modules/retail/pos.html" },
            { name: "Inventory", link: "/modules/retail/inventory.html" }
        ]},
        { icon: "📋", name: "Reports", children: [
            { name: "Sales Report", link: "/modules/reports/sales.html" },
            { name: "Financial Reports", link: "/modules/reports/financial.html" }
        ]},
        { icon: "👥", name: "Staff", link: "/modules/company/staff.html" },
        { icon: "⚙️", name: "Settings", link: "/modules/company/settings.html" }
    ],
    
    ACCOUNTANT: [
        { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html" },
        { icon: "📁", name: "Accounting", children: [
            { name: "Advanced Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html" },
            { name: "Chart of Accounts", link: "/modules/accounts/chart-of-accounts.html" },
            { name: "Journal Entries", link: "/modules/accounts/journal.html" }
        ]},
        { icon: "📋", name: "Reports", children: [
            { name: "Financial Reports", link: "/modules/reports/financial.html" },
            { name: "Tax Reports", link: "/modules/reports/tax.html" }
        ]}
    ],
    
    CASHIER: [
        { icon: "🛒", name: "Point of Sale", link: "/modules/retail/pos.html" },
        { icon: "📋", name: "Today's Sales", link: "/modules/retail/todays-sales.html" },
        { icon: "🔄", name: "Returns", link: "/modules/retail/returns.html" },
        { icon: "🔍", name: "Search Product", link: "/modules/retail/search.html" }
    ],
    
    STORE_KEEPER: [
        { icon: "📦", name: "Inventory", link: "/modules/inventory/index.html" },
        { icon: "➕", name: "Add Product", link: "/modules/inventory/add-product.html" },
        { icon: "📥", name: "Purchases", link: "/modules/inventory/purchases.html" },
        { icon: "⚠️", name: "Low Stock", link: "/modules/inventory/low-stock.html" },
        { icon: "📊", name: "Stock Report", link: "/modules/inventory/stock-report.html" }
    ],
    
    VIEWER: [
        { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html" },
        { icon: "📋", name: "Reports", link: "/modules/reports/index.html" },
        { icon: "📈", name: "Sales View", link: "/modules/reports/sales-view.html" }
    ],

    REP: [
        { icon: "📝", name: "Rep Order Form", link: "/modules/distributor/mobile/order.html" }
    ],

    DISTRIBUTOR_OWNER: [
        { icon: "📊", name: "Distributor Dashboard", link: "/modules/distributor/web/index.html" },
        { icon: "👥", name: "Staff", link: "/modules/company/staff.html" },
        { icon: "📦", name: "Products", link: "/modules/distributor/web/products.html" },
        { icon: "🏭", name: "Warehouse", link: "/modules/distributor/web/warehouse.html" },
        { icon: "🚚", name: "Deliveries", link: "/modules/distributor/web/deliveries.html" },
        { icon: "📈", name: "Reports", link: "/modules/distributor/web/reports.html" },
        { icon: "💰", name: "Sales", link: "/modules/distributor/web/sales.html" },
        { icon: "📒", name: "Financials", link: "/modules/distributor/web/financials.html" }
    ]
};

// Check if user has permission
function hasPermission(userRole, permission) {
    const allowedRoles = PERMISSIONS[permission];
    return allowedRoles ? allowedRoles.includes(userRole) : false;
}

// Get menu for role
function getMenuForRole(role) {
    return MENU_BY_ROLE[role] || MENU_BY_ROLE.VIEWER;
}

// Get current user role from Firestore
async function getUserRole(userId, businessId = null) {
    if (!userId) return null;
    
    try {
        const MW_BID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
        const resolvedBusinessId = businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');
        const MW_OWNER_EMAIL = 'mwtradingsolutions@gmail.com'; // THE ONLY DECLARATION

        // MW owner bootstrap only (function no-ops for other emails; avoid misleading logs).
        if (resolvedBusinessId === MW_BID
            && typeof window.ensureMwTradingOwnerBizMembership === 'function'
            && window.auth
            && window.auth.currentUser
            && window.auth.currentUser.uid === userId
            && String(window.auth.currentUser.email || '').trim().toLowerCase() === MW_OWNER_EMAIL) {
            await window.ensureMwTradingOwnerBizMembership(window.auth.currentUser);
            console.log('[getUserRole] ensureMwTradingOwnerBizMembership invoked for MW owner uid', userId);
        }

        // Check if SUPER_ADMIN first
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().role === 'SUPER_ADMIN') {
            return { role: 'SUPER_ADMIN', businessId: null };
        }

        const MW_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
        if (window.auth && window.auth.currentUser && window.auth.currentUser.uid === userId) {
            const em = String(window.auth.currentUser.email || '').trim().toLowerCase();
            if (em === MW_OWNER_EMAIL) { // This now correctly refers to the single declaration above
                window.__DIGIBIZ_LOCAL_ROLE__ = 'distributor_owner';
                window.__DIGIBIZ_MW_PROFILE_SYNC__ = {
                    role: 'distributor_owner',
                    businessId: MW_BUSINESS_ID,
                    email: window.auth.currentUser.email
                };
                try {
                    localStorage.setItem('digibizMwDisplayRole', 'distributor_owner');
                    localStorage.setItem('digibizMwBusinessId', MW_BUSINESS_ID);
                    localStorage.setItem('digibizMwSyncEmail', MW_OWNER_EMAIL);
                    localStorage.setItem('currentBusinessId', MW_BUSINESS_ID);
                    localStorage.setItem('currentBusinessType', 'distributor');
                    sessionStorage.setItem('currentBusinessId', MW_BUSINESS_ID);
                    sessionStorage.setItem('currentBusinessType', 'distributor');
                } catch (e) { /* ignore */ }
                console.log('[getUserRole] MW email master: distributor_owner @', MW_BUSINESS_ID);
                return { role: 'distributor_owner', businessId: MW_BUSINESS_ID };
            }
        }
        
        // Check business-specific role
        if (resolvedBusinessId) {
            const businessUserDoc = await db.collection('businesses').doc(resolvedBusinessId)
                .collection('users').doc(userId).get();
            if (businessUserDoc.exists) {
                return { role: businessUserDoc.data().role, businessId: resolvedBusinessId };
            }
        }
        
        return { role: 'VIEWER', businessId: resolvedBusinessId || null };
    } catch (error) {
        console.error('Error getting user role:', error);
        return { role: 'VIEWER', businessId: null };
    }
}

async function shouldForcePasswordChange(userId) {
    if (!userId) return false;
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return false;
        const data = userDoc.data() || {};
        return data.mustChangePassword === true;
    } catch (error) {
        console.warn('Password-change check failed:', error);
        return false;
    }
}

// Export to window
window.ROLES = ROLES;
window.PERMISSIONS = PERMISSIONS;
window.MENU_BY_ROLE = MENU_BY_ROLE;
window.hasPermission = hasPermission;
window.getMenuForRole = getMenuForRole;
window.getUserRole = getUserRole;
window.shouldForcePasswordChange = shouldForcePasswordChange;

/**
 * Distributor (MW-style) web RBAC: Owner, Sales Coordinator, Area Manager, Rep.
 * Rep is enforced mainly via mobile; web pages still use these flags when role is known.
 */
(function attachDistributorPermissions() {
    const OWNER_NORMS = new Set(['DISTRIBUTOR_OWNER', 'BUSINESS_OWNER', 'SUPER_ADMIN', 'ADMIN']);
    const MW_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
    const SPRANZA_BUSINESS_ID = 'SPRANZA_PVT_LTD';

    function normalizeRole(r) {
        let s = String(r || '')
            .trim()
            .toUpperCase()
            .replace(/\s+/g, '_')
            .replace(/[^A-Z0-9_]/g, '');
        if (s === 'DISTRIBUTOROWNER') s = 'DISTRIBUTOR_OWNER';
        return s;
    }

    function roleBand(roleRaw) {
        const r = normalizeRole(roleRaw);
        if (OWNER_NORMS.has(r)) return 'OWNER';
        if (r === 'SALES_COORDINATOR') return 'SALES_COORDINATOR';
        if (r === 'AREA_MANAGER') return 'AREA_MANAGER';
        if (r === 'REP') return 'REP';
        return 'OTHER';
    }

    function permissionsForRole(roleRaw, businessId) {
        const b = roleBand(roleRaw);
        const bid = String(businessId || '').trim();
        const isMwTrading = bid === MW_BUSINESS_ID;
        const isSpranza = bid === SPRANZA_BUSINESS_ID;
        const isOwner = b === 'OWNER';
        const isSC = b === 'SALES_COORDINATOR';
        const isAM = b === 'AREA_MANAGER';
        const isRep = b === 'REP';
        const matrix = isOwner || isSC || isAM || isRep;

        if (b === 'OTHER') {
            return {
                roleBand: b,
                canInvoiceCreateEdit: false,
                canInvoiceReject: false,
                canInvoiceDelete: false,
                canViewAccounting: false,
                canViewReportsFull: false,
                canViewFinancialsProfit: false,
                canStockEdit: false,
                canStockView: true,
                canCustomerCreate: isMwTrading || isSpranza,
                canCustomerEditDelete: false,
                canCustomerView: true,
                canProductCreate: false,
                canProductEditDelete: false,
                canProductView: true,
                canStaffMutate: false,
                canExpensesCreate: false,
                canExpensesEdit: false,
                canSettingsChange: false,
                canBusinessInfoEdit: false,
                canOrderWorkflowApprove: false,
                canOrderReject: false,
                canManageRepsWeb: false
            };
        }

        return {
            roleBand: b,
            canInvoiceCreateEdit: matrix,
            canInvoiceReject: isOwner,
            canInvoiceDelete: isOwner,
            canViewAccounting: isOwner || isSC,
            canViewReportsFull: isOwner || isSC || isAM,
            canViewFinancialsProfit: isOwner || isSC,
            canStockEdit: isOwner,
            canStockView: matrix,
            canCustomerCreate: matrix || isMwTrading || isSpranza,
            canCustomerEditDelete: isOwner || isSC,
            canCustomerView: matrix,
            canProductCreate: isOwner || isSC,
            canProductEditDelete: isOwner,
            canProductView: matrix,
            canStaffMutate: isOwner,
            canExpensesCreate: isOwner || isSC,
            canExpensesEdit: isOwner,
            canSettingsChange: isOwner,
            canBusinessInfoEdit: isOwner,
            canOrderWorkflowApprove: isOwner || isSC || isAM,
            canOrderReject: isOwner,
            canManageRepsWeb: isOwner || isSC || isAM
        };
    }

    window.DigibizDistributorPermissions = {
        normalizeRole,
        roleBand,
        permissionsForRole
    };
})();

console.log('✅ Auth Roles Core Initialized');
