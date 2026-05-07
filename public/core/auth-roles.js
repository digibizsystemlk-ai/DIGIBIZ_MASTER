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
    { id: 'canViewDashboard', label: 'View Dashboard & Stats', category: 'General', status: 'Menus: Dashboard. Can: View real-time sales overview & metrics. (Dashboard මෙනුව විවෘත වේ. විකුණුම් සංඛ්‍යාලේඛන බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'REP', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    
    { id: 'canInvoiceCreateEdit', label: 'Create & Edit Invoices/Orders', category: 'Sales', status: 'Menus: New Order, Invoices. Can: Create & edit sales. Cannot: Delete or reject. (නව ඇණවුම් සහ ඉන්වොයිස් මෙනු විවෘත වේ. ඇණවුම් සැකසීමට හැකිය. මකා දැමීමට නොහැක.)', defaultRoles: ['OWNER', 'REP', 'SALES_COORDINATOR'] },
    { id: 'canSalesView', label: 'View Sales History', category: 'Sales', status: 'Menus: Sales. Can: View past invoices & history. (Sales මෙනුව විවෘත වේ. පැරණි විකුණුම් ලේඛන බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'REP', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    { id: 'canOrderWorkflowApprove', label: 'Approve & Process Orders', category: 'Sales', status: 'Menus: Orders. Can: Approve pending orders for dispatch. (Orders මෙනුව විවෘත වේ. ලැබෙන ඇණවුම් අනුමත කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    { id: 'canOrderReject', label: 'Reject/Cancel Orders', category: 'Sales', status: 'Can: Reject or cancel pending orders. (ඇණවුම් ප්‍රතික්ෂේප කිරීමට හෝ අවලංගු කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    
    { id: 'canCustomerView', label: 'View Customer List', category: 'Sales', status: 'Menus: Customers. Can: View client details. (Customers මෙනුව විවෘත වේ. පාරිභෝගික ලැයිස්තුව බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'REP', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    { id: 'canCustomerCreate', label: 'Create New Customers', category: 'Sales', status: 'Can: Add new shops/customers. (නව පාරිභෝගිකයන් ඇතුළත් කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'REP', 'SALES_COORDINATOR'] },
    { id: 'canCustomerEditDelete', label: 'Edit/Delete Customers', category: 'Sales', status: 'Can: Edit or delete customers. (පාරිභෝගික තොරතුරු වෙනස් කිරීමට හෝ ඉවත් කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    
    { id: 'canProductView', label: 'View Products & Prices', category: 'Inventory', status: 'Menus: Products. Can: View items & prices. (Products මෙනුව විවෘත වේ. භාණ්ඩ ලැයිස්තුව සහ මිල ගණන් බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'REP', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    { id: 'canProductCreate', label: 'Add New Products', category: 'Inventory', status: 'Can: Add new items. (නව භාණ්ඩ පද්ධතියට ඇතුළත් කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    { id: 'canProductEditDelete', label: 'Edit/Delete Products', category: 'Inventory', status: 'Can: Modify prices & delete items. (මිල ගණන් වෙනස් කිරීමට සහ භාණ්ඩ ඉවත් කිරීමට හැකිය.)', defaultRoles: ['OWNER'] },
    
    { id: 'canStockView', label: 'View Inventory & Stock', category: 'Inventory', status: 'Menus: Warehouse, Free Issues, Returns logs. Can: Monitor stock levels. (ගබඩා තොරතුරු, රිටන් සහ ෆ්‍රී ඉෂු වාර්තා බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'REP', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    { id: 'canStockEdit', label: 'Adjust Stock Levels', category: 'Inventory', status: 'Menus: GRN (Good Receive Note). Can: Add or adjust stock. (තොග ප්‍රමාණයන් ඇතුළත් කිරීමට සහ වෙනස් කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    
    { id: 'canViewAccounting', label: 'Access Accounting & Ledgers', category: 'Finance', status: 'Menus: Accounting. Can: View ledgers & journals. (Accounting මෙනුව විවෘත වේ. මූල්‍ය ලෙජර සහ දිනපොත් බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    { id: 'canViewFinancialsProfit', label: 'View Financial Summaries & Profit', category: 'Finance', status: 'Menus: Finance. Can: View profit/loss summaries. (Finance මෙනුව විවෘත වේ. ලාභාලාභ විස්තර බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    { id: 'canChequesManage', label: 'Manage Cheques & Payments', category: 'Finance', status: 'Menus: Cheques. Can: View & update cheque status. (චෙක්පත් මෙනුව විවෘත වේ. තත්ත්වය යාවත්කාලීන කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    { id: 'canCreditAgingView', label: 'View Credit Aging Reports', category: 'Finance', status: 'Menus: Credit Aging. Can: Monitor shop debts. (ණය වාර්තා බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    { id: 'canRepCommissionView', label: 'View Rep Commissions', category: 'Finance', status: 'Menus: Rep Commission. Can: View sales rep earnings. (සේවක කොමිස් වාර්තා බැලීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    { id: 'canViewReportsFull', label: 'Access All Reports', category: 'Reports', status: 'Menus: Reports. Can: Download all analytical reports. (Distributor Reports මෙනුව විවෘත වේ. සියලුම වාර්තා බැලීමට සහ ලබා ගැනීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    
    { id: 'canManageRepsWeb', label: 'Manage Sales Reps', category: 'Staff', status: 'Menus: Reps. Can: Create/Manage sales staff profiles. (සේවක තොරතුරු සහ නියෝජිතයන් කළමනාකරණයට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    { id: 'canDeliveriesManage', label: 'Manage Deliveries & Dispatch', category: 'Logistics', status: 'Menus: Deliveries. Can: Dispatch & track deliveries. (Deliveries මෙනුව විවෘත වේ. බෙදාහැරීම් පාලනය කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR', 'AREA_MANAGER'] },
    { id: 'canExpensesCreate', label: 'Create Expenses', category: 'Finance', status: 'Can: Add business expenses. (වියදම් ඇතුළත් කිරීමට හැකිය.)', defaultRoles: ['OWNER', 'SALES_COORDINATOR'] },
    { id: 'canExpensesEdit', label: 'Edit/Manage Expenses', category: 'Finance', status: 'Can: Edit or delete expenses. (වියදම් විස්තර වෙනස් කිරීමට හෝ ඉවත් කිරීමට හැකිය.)', defaultRoles: ['OWNER'] },
    { id: 'canStaffMutate', label: 'Manage Staff Accounts', category: 'Settings', status: 'Can: Manage employee system accounts and roles. (සේවක ගිණුම් සහ අවසරයන් කළමනාකරණයට හැකිය.)', defaultRoles: ['OWNER'] },
    { id: 'canSettingsChange', label: 'Change Business Settings', category: 'Settings', status: 'Menus: Commission Config. Can: Manage commissions & rules. (Settings මෙනුව විවෘත වේ. සැකසුම් සහ කොමිස් ක්‍රම වෙනස් කිරීමට හැකිය.)', defaultRoles: ['OWNER'] },
    { id: 'canBusinessInfoEdit', label: 'Edit Business Profile', category: 'Settings', status: 'Can: Update business logo & profile details. (ව්‍යාපාරයේ මූලික තොරතුරු වෙනස් කිරීමට හැකිය.)', defaultRoles: ['OWNER'] }
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
        const matrix = isOwner || isSC || isAM;

        // Base defaults
        let perms = {
            roleBand: b,
            canViewDashboard: matrix,
            canInvoiceCreateEdit: matrix,
            canInvoiceReject: isOwner,
            canInvoiceDelete: isOwner,
            canViewAccounting: isOwner || isSC,
            canViewReportsFull: isOwner || isSC || isAM,
            canViewFinancialsProfit: isOwner || isSC,
            canSalesView: matrix,
            canChequesManage: isOwner || isSC,
            canCreditAgingView: isOwner || isSC || isAM,
            canRepCommissionView: isOwner || isSC,
            canStockEdit: isOwner,
            canStockView: matrix,
            canCustomerCreate: matrix,
            canCustomerEditDelete: isOwner || isSC,
            canCustomerView: matrix,
            canProductCreate: isOwner || isSC,
            canProductEditDelete: isOwner,
            canProductView: matrix,
            canStaffMutate: isOwner,
            canSettingsChange: isOwner,
            canBusinessInfoEdit: isOwner,
            canOrderWorkflowApprove: isOwner || isSC || isAM,
            canOrderReject: isOwner,
            canManageRepsWeb: isOwner || isSC || isAM,
            canDeliveriesManage: isOwner || isSC || isAM,
            canExpensesCreate: isOwner || isSC,
            canExpensesEdit: isOwner
        };

        // Special legacy overrides
        if (b === 'OTHER') {
            Object.keys(perms).forEach(k => { if (k !== 'roleBand' && k !== 'canStockView' && k !== 'canCustomerView' && k !== 'canProductView') perms[k] = false; });
        }

        // Apply Dynamic Overrides from Sync Cache (sessionStorage)
        if (bid) {
            try {
                const cacheKey = `digibiz_perms_v2_${bid}`;
                const cached = sessionStorage.getItem(cacheKey);
                
                if (cached && cached !== 'undefined') {
                    const overrides = JSON.parse(cached);
                    if (overrides && typeof overrides === 'object' && overrides[b]) {
                        let roleOverrides = { ...overrides[b] };
                        
                        // BACKWARD COMPATIBILITY MAPPING: Map old IDs to new IDs
                        const mapping = {
                            'canOrderCreate': 'canInvoiceCreateEdit',
                            'canShopsManage': 'canCustomerView',
                            'canOrdersView': 'canOrderWorkflowApprove',
                            'canSalesHistoryView': 'canSalesView'
                        };
                        
                        Object.keys(mapping).forEach(oldKey => {
                            if (roleOverrides.hasOwnProperty(oldKey)) {
                                roleOverrides[mapping[oldKey]] = roleOverrides[oldKey];
                            }
                        });

                        // MERGE: Dynamic overrides take absolute priority over defaults
                        perms = { ...perms, ...roleOverrides };
                    }
                }
            } catch (e) {
                console.warn('[RBAC] Permission sync lookup failed.');
            }
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
