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

// Master Registry of all system features/permissions
// Based on sidebar items and internal facilities.
// Defaults: ONLY 'OWNER' has access by default. Others must be granted manually.
const MASTER_PERMISSIONS = [
    { id: 'canViewDashboard', label: 'View Dashboard Stats', category: 'General', defaultRoles: ['OWNER'] },
    
    { id: 'canOrderCreate', label: 'Create New Sales Orders', category: 'Sales', defaultRoles: ['OWNER'] },
    { id: 'canShopsManage', label: 'Manage Shops/Customers', category: 'Sales', defaultRoles: ['OWNER'] },
    { id: 'canOrdersView', label: 'View All Orders', category: 'Sales', defaultRoles: ['OWNER'] },
    { id: 'canSalesView', label: 'View Sales History', category: 'Sales', defaultRoles: ['OWNER'] },
    { id: 'canInvoiceCreate', label: 'Create/Print Invoices', category: 'Sales', defaultRoles: ['OWNER'] },
    { id: 'canGrnManage', label: 'Manage GRN (Goods Received)', category: 'Inventory', defaultRoles: ['OWNER'] },
    { id: 'canProductManage', label: 'Manage Products/Price List', category: 'Inventory', defaultRoles: ['OWNER'] },
    { id: 'canRepsManage', label: 'Manage Sales Reps', category: 'Staff', defaultRoles: ['OWNER'] },
    { id: 'canWarehouseManage', label: 'Warehouse & Stock Control', category: 'Inventory', defaultRoles: ['OWNER'] },
    { id: 'canDeliveriesManage', label: 'Manage Deliveries & Dispatch', category: 'Logistics', defaultRoles: ['OWNER'] },
    { id: 'canFreeIssuesLog', label: 'View Free Issues Log', category: 'Sales', defaultRoles: ['OWNER'] },
    { id: 'canReturnsLog', label: 'View Returns Log', category: 'Sales', defaultRoles: ['OWNER'] },
    { id: 'canChequesManage', label: 'Manage Cheques & Payments', category: 'Finance', defaultRoles: ['OWNER'] },
    { id: 'canCreditAgingView', label: 'View Credit Aging Reports', category: 'Finance', defaultRoles: ['OWNER'] },
    { id: 'canCommissionConfig', label: 'Configure Commissions', category: 'Settings', defaultRoles: ['OWNER'] },
    { id: 'canRepCommissionView', label: 'View Rep Commissions', category: 'Finance', defaultRoles: ['OWNER'] },
    { id: 'canDistributorReports', label: 'View Distributor Reports', category: 'Reports', defaultRoles: ['OWNER'] },
    
    { id: 'canViewFinance', label: 'View Finance Dashboard', category: 'Finance', defaultRoles: ['OWNER'] },
    { id: 'canViewAccounting', label: 'View Full Accounting & Ledgers', category: 'Finance', defaultRoles: ['OWNER'] },
    
    { id: 'canStaffManage', label: 'Manage Staff Accounts', category: 'Settings', defaultRoles: ['OWNER'] },
    { id: 'canPermissionsConfig', label: 'Modify Staff Permissions', category: 'Settings', defaultRoles: ['OWNER'] },
    { id: 'canSidebarConfig', label: 'Configure Sidebar Menu', category: 'Settings', defaultRoles: ['OWNER'] },
    { id: 'canSettingsGlobal', label: 'Global Business Settings', category: 'Settings', defaultRoles: ['OWNER'] },
    { id: 'canSmsConfig', label: 'Manage SMS Settings & Logs', category: 'Settings', defaultRoles: ['OWNER'] },
    { id: 'canBillingCharges', label: 'View Billing & Charges', category: 'Settings', defaultRoles: ['OWNER'] }
];

const PERMISSIONS = {
    // Legacy support (to be kept for backward compatibility if needed)
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
        if (String(resolvedBusinessId || '').toUpperCase() === String(MW_BID).toUpperCase()
            && typeof window.ensureMwTradingOwnerBizMembership === 'function'
            && window.auth
            && window.auth.currentUser
            && window.auth.currentUser.uid === userId
            && String(window.auth.currentUser.email || '').trim().toLowerCase() === MW_OWNER_EMAIL) {
            await window.ensureMwTradingOwnerBizMembership(window.auth.currentUser);
            console.log('[getUserRole] ensureMwTradingOwnerBizMembership invoked for MW owner uid', userId);
        }

        // 1. Check if SUPER_ADMIN
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().role === 'SUPER_ADMIN') {
            return { role: 'SUPER_ADMIN', businessId: null };
        }

        const MW_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
        // MW_OWNER_EMAIL already declared above at line 191

        // 2. MW owner bootstrap (Preserved for legacy)
        if (window.auth && window.auth.currentUser && window.auth.currentUser.uid === userId) {
            const em = String(window.auth.currentUser.email || '').trim().toLowerCase();
            if (em === MW_OWNER_EMAIL) {
                return { role: 'distributor_owner', businessId: MW_BUSINESS_ID };
            }
        }
        
        // 3. Generic Owner/Staff Identification
        if (resolvedBusinessId) {
            const bizDoc = await db.collection('businesses').doc(resolvedBusinessId).get();
            if (bizDoc.exists) {
                const bizData = bizDoc.data();
                if (bizData.ownerId === userId) {
                    return { role: 'distributor_owner', businessId: resolvedBusinessId };
                }
            }

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
window.MASTER_PERMISSIONS = MASTER_PERMISSIONS;
window.ROLES = ROLES;
window.PERMISSIONS = PERMISSIONS;
window.MENU_BY_ROLE = MENU_BY_ROLE;
window.hasPermission = hasPermission;
window.getMenuForRole = getMenuForRole;
window.getUserRole = getUserRole;
window.shouldForcePasswordChange = shouldForcePasswordChange;

/**
 * Dynamic Role Discovery Utility
 * Scans the staff collection of a business to find all unique roles in use.
 */
window.getBusinessStaffRoles = async function(businessId) {
    if (!businessId) return [];
    try {
        const roles = new Set(['OWNER']); // Owner is always present
        
        // 1. Scan the business's users collection for roles actually in use
        const snap = await window.db.collection('businesses').doc(businessId).collection('users').get();
        snap.forEach(doc => {
            const rawRole = String(doc.data().role || '').trim().toUpperCase();
            if (rawRole) {
                const band = window.DigibizDistributorPermissions.roleBand(rawRole);
                roles.add(band);
            }
        });

        // 2. Scan custom roles config (so they appear even if no staff assigned yet)
        try {
            const configSnap = await window.db.collection('businesses').doc(businessId).collection('configs').doc('roles').get();
            if (configSnap.exists) {
                const customList = configSnap.data().list || [];
                customList.forEach(r => {
                    const band = window.DigibizDistributorPermissions.roleBand(r);
                    roles.add(band);
                });
            }
        } catch (e2) { console.warn('[RBAC] Custom roles config read failed:', e2); }

        return Array.from(roles);
    } catch (e) {
        console.warn('[RBAC] Role discovery failed:', e);
        return ['OWNER', 'SALES_COORDINATOR', 'AREA_MANAGER', 'REP', 'ACCOUNTANT'];
    }
};

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
        // Return the role itself for dynamic override mapping
        return r || 'OTHER';
    }

    async function fetchAndCachePermissions(businessId) {
        if (!businessId) return null;
        const cacheKey = `digibiz_perms_${businessId}`;
        try {
            const snap = await db.collection('businesses').doc(businessId).collection('configs').doc('permissions').get();
            if (snap.exists) {
                const data = snap.data();
                sessionStorage.setItem(cacheKey, JSON.stringify(data));
                return data;
            } else {
                sessionStorage.removeItem(cacheKey);
            }
        } catch (e) {
            console.warn('[RBAC] Failed to fetch permissions:', e);
        }
        return null;
    }

    function permissionsForRole(roleRaw, businessId) {
        const b = roleBand(roleRaw);
        const bid = String(businessId || localStorage.getItem('currentBusinessId') || '').trim();
        const isMwTrading = bid.toUpperCase() === String(MW_BUSINESS_ID).toUpperCase();
        const isSpranza = bid.toUpperCase() === String(SPRANZA_BUSINESS_ID).toUpperCase();
        const isOwner = b === 'OWNER';
        const isSC = b === 'SALES_COORDINATOR';
        const isAM = b === 'AREA_MANAGER';
        const isRep = b === 'REP';
        const matrix = isOwner || isSC || isAM || isRep;

        // Base defaults
        let perms = {
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

        // Special legacy overrides
        if (b === 'OTHER') {
            Object.keys(perms).forEach(k => { if (k !== 'roleBand' && k !== 'canStockView' && k !== 'canCustomerView' && k !== 'canProductView') perms[k] = false; });
            perms.canCustomerCreate = isMwTrading || isSpranza;
        } else if (isRep && isMwTrading) {
            Object.keys(perms).forEach(k => { if (k !== 'roleBand' && k !== 'canStockView' && k !== 'canCustomerView' && k !== 'canProductView') perms[k] = false; });
        }

        // Apply Dynamic Overrides from Sync Cache (sessionStorage)
        if (bid) {
            try {
                const cached = sessionStorage.getItem(`digibiz_perms_${bid}`);
                if (cached) {
                    const overrides = JSON.parse(cached);
                    if (overrides && overrides[b]) {
                        perms = { ...perms, ...overrides[b] };
                    }
                }
            } catch (e) {}
        }

        return perms;
    }

    window.DigibizDistributorPermissions = {
        normalizeRole,
        roleBand,
        permissionsForRole,
        fetchAndCachePermissions,
        clearPermissionCache: (bid) => sessionStorage.removeItem(`digibiz_perms_${bid}`)
    };
})();

console.log('✅ Auth Roles Core Initialized');
