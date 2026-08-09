// Business Types Configuration - Add new business types here
// අලුත් business type එකක් එකතු කරන්න මෙතනට entry එකක් දාන්න

const BUSINESS_TYPES = {
    retail: {
        id: "retail",
        name: "Retail / Supermarket",
        icon: "🛒",
        description: "POS, Inventory, Sales management",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "VIEWER", "STAFF", "BUSINESS_STAFF"] },
            { icon: "🛒", name: "Point of Sale", link: "/modules/retail/pos.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "CASHIER", "STAFF", "BUSINESS_STAFF"] },
            { icon: "📜", name: "Sales History", link: "/modules/retail/sales-history.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "BUSINESS_STAFF"] },
            { icon: "📦", name: "Stock", link: "/modules/retail/inventory.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF"] },
            { icon: "⚠️", name: "Spoil / Damage", link: "/modules/retail/spoilage.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF"] },
            { icon: "📥", name: "Purchases / GRN", link: "/modules/retail/grn.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF"] },
            { icon: "🚚", name: "Suppliers", link: "/modules/retail/suppliers.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF"] },
            { icon: "🏛️", name: "Banking & Cash", link: "/modules/retail/banking.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "BUSINESS_STAFF"] }
        ],
        dashboardComponents: ["sales", "inventory", "recentSales", "lowStock"],
        demoEmail: "test@retail.com",
        isReady: true
    },
    
    tire_centre: {
        id: "tire_centre",
        name: "Tire Center",
        icon: "🛞",
        description: "POS, Inventory, Sales, and Appointment Services",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "CASHIER", "VIEWER"] },
            { icon: "🛒", name: "Point of Sale", link: "/modules/tire_centre/pos.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "CASHIER"] },
            { icon: "📜", name: "Sales History", link: "/modules/tire_centre/sales-history.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "CASHIER"] },
            { icon: "📦", name: "Stock", link: "/modules/tire_centre/inventory.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STORE_KEEPER"] },
            { icon: "🛠️", name: "Services", link: "/modules/tire_centre/services.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STAFF"] },
            { icon: "📅", name: "Appointments", link: "/modules/tire_centre/appointments.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STAFF"] },
            { icon: "📥", name: "GRN", link: "/modules/tire_centre/grn.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STORE_KEEPER"] },
            { icon: "👥", name: "Customers", link: "/modules/tire_centre/customers.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "CASHIER"] },
            { icon: "🚚", name: "Suppliers", link: "/modules/tire_centre/suppliers.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STORE_KEEPER"] },
            { icon: "🏦", name: "Banking", link: "/modules/tire_centre/banking.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "💸", name: "EXPENSES", link: "/modules/tire_centre/expenses.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] },
            { icon: "📈", name: "REVENUE", link: "/modules/tire_centre/revenue.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] },
            { icon: "📋", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] }
        ],
        dashboardComponents: ["sales", "inventory", "recentSales", "lowStock"],
        demoEmail: "test@tyrecentre.com",
        isReady: true
    },
    
    auto_care: {
        id: "auto_care",
        name: "Auto Care & Vehicle Repair Center",
        icon: "🚗",
        description: "Job cards, vehicle inspection, estimations, spare parts inventory, invoicing & SMS notifications",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/auto_care/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "📋", name: "Job Cards", link: "/modules/auto_care/job-cards.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "🛠️", name: "Repair & Services", link: "/modules/auto_care/services-catalog.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "🔍", name: "Inspections", link: "/modules/auto_care/inspections.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "📄", name: "Estimations", link: "/modules/auto_care/estimations.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "🧾", name: "Invoicing", link: "/modules/auto_care/invoicing.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "⚙️", name: "Spare Parts Stock", link: "/modules/auto_care/inventory.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "📥", name: "Stock Purchases / GRN", link: "/modules/auto_care/purchases.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "📜", name: "Service Records", link: "/modules/auto_care/service-records.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "📅", name: "Appointments", link: "/modules/auto_care/appointments.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "💳", name: "Customer Credit", link: "/modules/auto_care/customer-credit.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "🚘", name: "Customers & History", link: "/modules/auto_care/customers.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "🚚", name: "Suppliers", link: "/modules/auto_care/suppliers.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "💰", name: "Finance", link: "/modules/auto_care/finance.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "🏛️", name: "Banking", link: "/modules/tire_centre/banking.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "📈", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "💬", name: "SMS Alerts", link: "/modules/auto_care/sms.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] },
            { icon: "🏢", name: "Business Profile", link: "/modules/company/profile.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STAFF", "STORE_KEEPER", "VIEWER", "USER"] }
        ],
        dashboardComponents: ["activeJobs", "revenueToday", "completedJobsToday", "lowStockParts", "recentJobCards", "vehicleStatusOverview"],
        features: {
            jobCards: true,
            vehicleInspection: true,
            sparePartsInventory: true,
            quotations: true,
            smsAlerts: true,
            serviceHistory: true
        },
        demoEmail: "test@autocare.com",
        isReady: true
    },
    
    pharmacy: {
        id: "pharmacy",
        name: "Pharmacy",
        icon: "💊",
        description: "Medicine management, expiry tracking",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF", "USER", "VIEWER"] },
            { icon: "🛒", name: "Point of Sale", link: "/modules/pharmacy/pos.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF", "USER", "VIEWER"] },
            { icon: "📦", name: "Inventory", link: "/modules/pharmacy/inventory.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF", "USER", "VIEWER"] },
            { icon: "⚠️", name: "Expiry Alerts", link: "/modules/pharmacy/expiry.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF", "USER", "VIEWER"] },
            { icon: "📥", name: "Purchases", link: "/modules/pharmacy/purchases.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "CASHIER", "STORE_KEEPER", "STAFF", "BUSINESS_STAFF", "USER", "VIEWER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "VIEWER"] },
            { icon: "📋", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ADMIN", "MANAGER", "ACCOUNTANT", "VIEWER"] }
        ],
        dashboardComponents: ["sales", "expiryAlerts", "drugCategories", "prescriptionQueue", "recentSales"],
        features: {
            expiryTracking: true,
            drugCategories: true,
            prescriptionUploads: true,
            batchTracking: true,
            dosageAwareInventory: true
        },
        demoEmail: "test@pharmacy.com",
        isReady: true
    },
    
    restaurant: {
        id: "restaurant",
        name: "Restaurant / Cafe",
        icon: "🍽️",
        description: "Table management, kitchen orders",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "MANAGER"] },
            { icon: "🍽️", name: "Tables", link: "/modules/restaurant/tables.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "CASHIER"] },
            { icon: "📝", name: "Orders", link: "/modules/restaurant/orders.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "CASHIER"] },
            { icon: "👨‍🍳", name: "Kitchen Display", link: "/modules/restaurant/kitchen.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "KITCHEN"] },
            { icon: "📦", name: "Inventory", link: "/modules/restaurant/inventory.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STORE_KEEPER"] },
            { icon: "🏢", name: "Business Profile", link: "/modules/company/profile.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] },
            { icon: "📋", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] }
        ],
        dashboardComponents: ["todayOrders", "tableStatus", "topItems", "sales"],
        demoEmail: "test@restaurant.com"
    },
    
    garment: {
        id: "garment",
        name: "Garment / Fashion",
        icon: "👕",
        description: "Size/color variants, stock management",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "🛒", name: "Point of Sale", link: "/modules/garment/pos.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "CASHIER"] },
            { icon: "📦", name: "Inventory", link: "/modules/garment/inventory.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STORE_KEEPER"] },
            { icon: "🎨", name: "Variants", link: "/modules/garment/variants.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📥", name: "Purchases", link: "/modules/garment/purchases.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STORE_KEEPER"] },
            { icon: "🏢", name: "Business Profile", link: "/modules/company/profile.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] },
            { icon: "📋", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] }
        ],
        dashboardComponents: ["sales", "inventory", "topVariants", "recentSales"],
        demoEmail: "test@garment.com"
    },
    
    hardware: {
        id: "hardware",
        name: "Hardware / Construction",
        icon: "🔧",
        description: "Bulk items, weight/measurement",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "🛒", name: "Point of Sale", link: "/modules/hardware/pos.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "CASHIER"] },
            { icon: "📦", name: "Inventory", link: "/modules/hardware/inventory.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STORE_KEEPER"] },
            { icon: "⚖️", name: "Bulk Items", link: "/modules/hardware/bulk.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📥", name: "Purchases", link: "/modules/hardware/purchases.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STORE_KEEPER"] },
            { icon: "🏢", name: "Business Profile", link: "/modules/company/profile.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] },
            { icon: "📋", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] }
        ],
        dashboardComponents: ["sales", "inventory", "bulkItems", "unitConversions", "weightPricing", "recentSales"],
        features: {
            unitConversions: true,
            feetInchSupport: true,
            bulkWeightPricing: true,
            mixedUnitInventory: true,
            quotationFlow: true
        },
        demoEmail: "test@hardware.com"
    },
    
    service: {
        id: "service",
        name: "Service / Salon",
        icon: "💇",
        description: "Appointments, service billing, client management",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📅", name: "Appointments", link: "/modules/service/appointments.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STAFF"] },
            { icon: "👥", name: "Clients", link: "/modules/service/clients.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STAFF"] },
            { icon: "🧾", name: "Service Billing", link: "/modules/service/billing.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "STAFF"] },
            { icon: "📋", name: "Services", link: "/modules/service/services.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "🏢", name: "Business Profile", link: "/modules/company/profile.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] },
            { icon: "📋", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT"] }
        ],
        dashboardComponents: ["todayAppointments", "upcoming", "serviceRevenue", "serviceBills", "utilization", "clients"],
        features: {
            appointmentScheduling: true,
            serviceBasedBilling: true,
            staffUtilizationTracking: true,
            reminders: true
        },
        demoEmail: "test@service.com"
    },

    distributor: {
        id: "distributor",
        name: "Distributor / Wholesaler",
        icon: "🚚",
        description: "Product distribution with rep management, warehouse, delivery tracking",
        menus: [
            // HQ Web Dashboard Menus
            { icon: "📊", name: "Dashboard", link: "/modules/distributor/web/index.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR", "WAREHOUSE_MANAGER", "DELIVERY_MANAGER"] },
            { icon: "📑", name: "Order Status", link: "/modules/distributor/web/index.html?tab=pending", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR"] },
            { icon: "🏭", name: "Warehouse", link: "/modules/distributor/web/warehouse.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "WAREHOUSE_MANAGER"] },
            { icon: "🚚", name: "Deliveries", link: "/modules/distributor/web/deliveries.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "DELIVERY_MANAGER"] },
            { icon: "👥", name: "Reps Management", link: "/modules/distributor/web/reps.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR"] },
            { icon: "🏪", name: "Shops", link: "/modules/distributor/web/shops.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR"] },
            { icon: "📦", name: "Products", link: "/modules/distributor/web/products.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "WAREHOUSE_MANAGER"] },
            { icon: "🎁", name: "Free Items", link: "/modules/distributor/web/free-items.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR"] },
            { icon: "🔄", name: "Returns", link: "/modules/distributor/web/returns.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR"] },
            { icon: "📋", name: "Reports", link: "/modules/distributor/web/reports.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR", "ACCOUNTANT"] },
            { icon: "💰", name: "Sales", link: "/modules/distributor/web/sales.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR", "ACCOUNTANT", "WAREHOUSE_MANAGER"] },
            { icon: "💳", name: "Finance", link: "/modules/core/finance-ledger.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR", "ACCOUNTANT"] },
            
            // Mobile App Menus (for Reps)
            { icon: "📱", name: "Rep Order Form", link: "/modules/distributor/mobile/order.html", role: ["REP"], mobileOnly: true },
            
            // Common Menus
            { icon: "🏢", name: "Business Profile", link: "/modules/company/profile.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "ACCOUNTANT"] },
            { icon: "⚙️", name: "Settings", link: "/modules/company/settings.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER"] },
            { icon: "🔔", name: "Notifications", link: "/modules/company/notifications.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR", "WAREHOUSE_MANAGER", "DELIVERY_MANAGER", "REP"] },
            { icon: "📜", name: "Activity Log", link: "/modules/company/activity-log.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER"] },
            { icon: "❓", name: "Help & Support", link: "/modules/company/help.html", role: ["SUPER_ADMIN", "DISTRIBUTOR_OWNER", "REP_SUPERVISOR", "WAREHOUSE_MANAGER", "DELIVERY_MANAGER", "REP"] }
        ],
        dashboardComponents: ["pendingOrders", "todayDeliveries", "activeReps", "recentOrders"],
        features: {
            mobileRepApp: true,
            offlineOrders: true,
            dynamicFreeItems: true,
            batchTracking: true,
            deliveryTracking: true,
            routePlanning: true,
            creditControl: true
        },
        isReady: true,
        demoEmail: "test@distributor.com",
        // Mobile specific settings
        mobile: {
            loginUrl: "/modules/distributor/mobile/order.html",
            dashboardUrl: "/modules/distributor/mobile/order.html",
            newOrderUrl: "/modules/distributor/mobile/order.html",
            shopsUrl: "/modules/distributor/mobile/order.html",
            ordersUrl: "/modules/distributor/mobile/order.html",
            offlineSupport: true,
            barcodeScanner: true,
            locationTracking: true
        }
    },

    manufacturer: {
        id: "manufacturer",
        name: "Manufacturer",
        icon: "🏭",
        description: "Raw materials, production planning, cost tracking and profitability",
        menus: [
            { icon: "🧱", name: "Raw Materials", link: "/modules/manufacturer/inbound.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] },
            { icon: "🏭", name: "Production / Manufacturing", link: "/modules/manufacturer/outbound.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] },
            { icon: "📦", name: "Finished Goods / Stock", link: "/modules/manufacturer/stock.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] },
            { icon: "🛍️", name: "Sales", link: "/modules/manufacturer/sales.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] },
            { icon: "🧾", name: "Expenses", link: "/modules/manufacturer/expenses.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] },
            { icon: "📚", name: "History", link: "/modules/manufacturer/history.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] },
            { icon: "📈", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] },
            { icon: "👥", name: "Customers", link: "/modules/core/customers.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "MANAGER", "VIEWER"] }
        ],
        dashboardComponents: [
            "rmStockValue", "fgStockValue", "productionRuns", "rmPurchaseMonth",
            "productionCostMonth", "operationalCostMonth", "sideIncomeMonth",
            "monthSales", "monthProfit", "cashFlow"
        ],
        features: {
            rawMaterialManagement: true,
            transformationMapping: true,
            productionIntelligence: true,
            manufacturingCostSheets: true,
            supplierPriceTracking: true
        },
        demoEmail: "test@manufacturer.com",
        isReady: true
    },

    scrap_collection_center: {
        id: "scrap_collection_center",
        name: "Scrap Collection Center",
        icon: "♻️",
        description: "Scrap buying, inventory, debts and messaging suite",
        hidden: true,
        restrictedToUid: "oDhSDYHQ2dV1DP33koysmZAqaY13",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/core/dashboard.html?no-redirect=1", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📍", name: "Public Leads", link: "/modules/admin/scrap-leads.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "🧾", name: "Bill", link: "/modules/admin/scrap-buying.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "💸", name: "Sell", link: "/modules/admin/scrap-sell.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📦", name: "Stock", link: "/modules/admin/scrap-workbench.html?view=STOCK", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📚", name: "Buying History", link: "/modules/admin/scrap-workbench.html?view=BUY", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📜", name: "Selling History", link: "/modules/admin/scrap-selling-history.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "🏦", name: "Advance", link: "/modules/admin/scrap-advance.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📘", name: "Daily Transactions", link: "/modules/admin/scrap-workbench.html?view=DAILYTR", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📁", name: "Accounting", link: "/modules/accounts/advanced-accounting-dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] },
            { icon: "📈", name: "Reports", link: "/modules/reports/index.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER"] }
        ],
        dashboardComponents: ["sales", "inventory", "recentSales", "lowStock"],
        demoEmail: "test@scrap.com",
        isReady: true
    },

    attendance_payroll: {
        id: "attendance_payroll",
        name: "Attendance & Payroll",
        icon: "⏱️",
        description: "Employee attendance, shifts, OT, allowances & payroll management",
        menus: [
            { icon: "📊", name: "Dashboard", link: "/modules/attendance_payroll/dashboard.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "⏱️", name: "Attendance Log", link: "/modules/attendance_payroll/attendancelog.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "📱", name: "QR Mobile Scanner", link: "/modules/attendance_payroll/mobile-scan.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "🚗", name: "Gate Pass & Outings", link: "/modules/attendance_payroll/gate-pass.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "🔄", name: "Shift Roster", link: "/modules/attendance_payroll/shifts.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "👥", name: "Employees", link: "/modules/attendance_payroll/employees.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "💵", name: "Payroll & Payslips", link: "/modules/attendance_payroll/payroll.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "💸", name: "Advances & Loans", link: "/modules/attendance_payroll/loans.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "📑", name: "Reports & Summaries", link: "/modules/attendance_payroll/reports.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "🏢", name: "Business Profile", link: "/modules/company/profile.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] },
            { icon: "⚙️", name: "Settings", link: "/modules/company/settings.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "HR_MANAGER", "ACCOUNTANT", "VIEWER", "CASHIER", "STAFF", "STORE_KEEPER"] }
        ],
        dashboardComponents: ["employeeCount", "todayAttendance", "pendingPayslips", "monthlyPayrollCost", "recentAttendance"],
        features: {
            fingerprintSync: true,
            mobileAttendance: true,
            rotationalShifts: true,
            shift24hOvertime: true,
            nightShiftAllowance: true,
            epfEtfCalculations: true,
            payslipGeneration: true,
            bankSummaryExport: true
        },
        demoEmail: "test@attendance.com",
        isReady: true
    }
};

// Common menus for all business types (always shown at bottom)
const COMMON_MENUS = [
    { icon: "⚙️", name: "Settings", link: "/modules/company/settings.html", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "DISTRIBUTOR_OWNER"] },
    { icon: "👑", name: "Admin", link: "/admin/super-dashboard.html", role: ["SUPER_ADMIN"] },
    { icon: "🚪", name: "Logout", link: "#", role: ["SUPER_ADMIN", "BUSINESS_OWNER", "ACCOUNTANT", "CASHIER", "STORE_KEEPER", "VIEWER", "DISTRIBUTOR_OWNER", "WAREHOUSE_MANAGER", "DELIVERY_MANAGER", "REP_SUPERVISOR", "REP"], action: "logout" }
];

// Get menus for a specific business type
function getMenusForBusinessType(businessType, userRole, isMobile = false) {
    const business = BUSINESS_TYPES[businessType];
    if (!business) return [];
    
    let menus = [];
    
    // Add business specific menus
    for (const menu of business.menus) {
        // Skip mobile-only menus for web
        if (menu.mobileOnly && !isMobile) continue;
        
        // Check role access
        if (menu.role && menu.role.includes(userRole)) {
            menus.push(menu);
        }
    }
    
    // Add common menus (for web only)
    if (!isMobile) {
        for (const menu of COMMON_MENUS) {
            if (menu.role && menu.role.includes(userRole)) {
                menus.push(menu);
            }
        }
    }
    
    return menus;
}

// Get business type details
function getBusinessTypeDetails(businessType) {
    return BUSINESS_TYPES[businessType] || BUSINESS_TYPES.retail;
}

// Get all business types (for registration)
function getAllBusinessTypes(options = {}) {
    const userId = options.userId || null;
    const userRole = String(options.userRole || "").toUpperCase();
    return Object.keys(BUSINESS_TYPES)
        .map((key) => BUSINESS_TYPES[key])
        .filter((entry) => {
            if (!entry.hidden) return true;
            const allowedUid = entry.restrictedToUid && entry.restrictedToUid === userId;
            const isSuperAdmin = userRole === "SUPER_ADMIN";
            return allowedUid && isSuperAdmin;
        })
        .map((entry) => ({
            id: entry.id,
            name: entry.name,
            icon: entry.icon,
            description: entry.description
        }));
}

// Check if business type has specific feature
function hasFeature(businessType, featureName) {
    const business = BUSINESS_TYPES[businessType];
    if (!business || !business.features) return false;
    return business.features[featureName] === true;
}

// Get mobile config for business type
function getMobileConfig(businessType) {
    const business = BUSINESS_TYPES[businessType];
    if (!business || !business.mobile) return null;
    return business.mobile;
}

// Export to window
window.BUSINESS_TYPES = BUSINESS_TYPES;
window.COMMON_MENUS = COMMON_MENUS;
window.getMenusForBusinessType = getMenusForBusinessType;
window.getBusinessTypeDetails = getBusinessTypeDetails;
window.getAllBusinessTypes = getAllBusinessTypes;
window.hasFeature = hasFeature;
window.getMobileConfig = getMobileConfig;

console.log('✅ Business Types Configuration Loaded');
console.log('📋 Available business types:', Object.keys(BUSINESS_TYPES).join(', '));