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
    REP: 'REP'
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
        { icon: "📈", name: "Reports", link: "/modules/distributor/web/reports.html" }
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
        if (typeof window.ensureMwTradingOwnerBizMembership === 'function' && window.auth && window.auth.currentUser && window.auth.currentUser.uid === userId) {
            await window.ensureMwTradingOwnerBizMembership(window.auth.currentUser);
            console.log('[getUserRole] ensureMwTradingOwnerBizMembership invoked for uid', userId);
        }

        const resolvedBusinessId = businessId || localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId');

        // Check if SUPER_ADMIN first
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().role === 'SUPER_ADMIN') {
            return { role: 'SUPER_ADMIN', businessId: null };
        }

        const MW_OWNER_EMAIL = 'mwtradingsolutions@gmail.com';
        const MW_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
        if (window.auth && window.auth.currentUser && window.auth.currentUser.uid === userId) {
            const em = String(window.auth.currentUser.email || '').trim().toLowerCase();
            if (em === MW_OWNER_EMAIL) {
                window.__DIGIBIZ_LOCAL_ROLE__ = 'BUSINESS_OWNER';
                window.__DIGIBIZ_MW_PROFILE_SYNC__ = {
                    role: 'BUSINESS_OWNER',
                    businessId: MW_BUSINESS_ID,
                    email: window.auth.currentUser.email
                };
                try {
                    localStorage.setItem('digibizMwDisplayRole', 'BUSINESS_OWNER');
                    localStorage.setItem('digibizMwBusinessId', MW_BUSINESS_ID);
                    localStorage.setItem('digibizMwSyncEmail', MW_OWNER_EMAIL);
                    localStorage.setItem('currentBusinessId', MW_BUSINESS_ID);
                    sessionStorage.setItem('currentBusinessId', MW_BUSINESS_ID);
                } catch (e) { /* ignore */ }
                console.log('[getUserRole] MW email master: BUSINESS_OWNER @', MW_BUSINESS_ID);
                return { role: 'BUSINESS_OWNER', businessId: MW_BUSINESS_ID };
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

// Export to window
window.ROLES = ROLES;
window.PERMISSIONS = PERMISSIONS;
window.MENU_BY_ROLE = MENU_BY_ROLE;
window.hasPermission = hasPermission;
window.getMenuForRole = getMenuForRole;
window.getUserRole = getUserRole;

console.log('✅ Auth Roles Core Initialized');