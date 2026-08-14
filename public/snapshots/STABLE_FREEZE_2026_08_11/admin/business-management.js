document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const emailSearch = document.getElementById('email-search');
    const businessDetails = document.getElementById('business-details');
    const deepDivePanel = document.getElementById('deep-dive-panel');
    const businessName = document.getElementById('business-name');
    const ownerName = document.getElementById('owner-name');
    const ownerPhone = document.getElementById('owner-phone');
    const subscriptionStatus = document.getElementById('subscription-status');
    const currentBusinessTypeEl = document.getElementById('current-business-type');
    const changeBusinessTypeSelect = document.getElementById('change-business-type');
    const changeBusinessTypeBtn = document.getElementById('change-business-type-btn');

    const extendProBtn = document.getElementById('extend-pro-btn');
    const extendProDays = document.getElementById('extend-pro');
    const extendTrialBtn = document.getElementById('extend-trial-btn');
    const addSmsBtn = document.getElementById('add-sms-btn');
    const addSmsAmount = document.getElementById('add-sms');

    let businessId = null;
    let ownerUserId = null;

    // Populate business types dropdown
    function populateBusinessTypesDropdown() {
        if (!changeBusinessTypeSelect) return;
        changeBusinessTypeSelect.innerHTML = '';

        const typeList = [
            { id: 'retail', name: 'Retail / Supermarket', icon: '🛒' },
            { id: 'manufacturer', name: 'Manufacturer', icon: '🏭' },
            { id: 'distributor', name: 'Distributor / Wholesaler', icon: '🚚' },
            { id: 'tire_centre', name: 'Tire Center', icon: '🛞' },
            { id: 'pharmacy', name: 'Pharmacy', icon: '💊' },
            { id: 'restaurant', name: 'Restaurant / Cafe', icon: '🍽️' },
            { id: 'garment', name: 'Garment / Fashion', icon: '👕' },
            { id: 'hardware', name: 'Hardware / Construction', icon: '🔧' },
            { id: 'service', name: 'Service / Salon', icon: '💇' },
            { id: 'attendance_payroll', name: 'Attendance & Payroll', icon: '⏱️' },
            { id: 'scrap_collection_center', name: 'Scrap Collection Center', icon: '♻️' }
        ];

        if (window.BUSINESS_TYPES && typeof window.BUSINESS_TYPES === 'object') {
            Object.keys(window.BUSINESS_TYPES).forEach(key => {
                const item = window.BUSINESS_TYPES[key];
                if (!typeList.find(t => t.id === key)) {
                    typeList.push({
                        id: key,
                        name: item.name || key,
                        icon: item.icon || '🏢'
                    });
                }
            });
        }

        typeList.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.textContent = `${t.icon || ''} ${t.name} (${t.id})`;
            changeBusinessTypeSelect.appendChild(opt);
        });
    }

    populateBusinessTypesDropdown();

    function formatBusinessTypeName(typeKey) {
        if (window.getBusinessTypeDetails) {
            const details = window.getBusinessTypeDetails(typeKey);
            if (details) return `${details.icon || ''} ${details.name} (${typeKey})`;
        }
        return typeKey;
    }

    function toLocalYYYYMMDD(dInput) {
        if (!dInput) return '';
        let d = null;
        if (typeof dInput.toDate === 'function') {
            d = dInput.toDate();
        } else if (dInput instanceof Date) {
            d = dInput;
        } else if (typeof dInput === 'number' || typeof dInput === 'string') {
            d = new Date(dInput);
        }
        if (!d || isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    function formatTimestamp(ts) {
        if (!ts) return 'N/A (ලියාපදිංචි වී නැත)';
        let dateObj = null;
        if (typeof ts.toDate === 'function') {
            dateObj = ts.toDate();
        } else if (ts instanceof Date) {
            dateObj = ts;
        } else {
            dateObj = new Date(ts);
        }
        if (isNaN(dateObj.getTime())) return 'N/A';

        const dateStr = dateObj.toLocaleDateString('en-US', { timeZone: 'Asia/Colombo' });
        const timeStr = dateObj.toLocaleTimeString('en-US', { timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const targetKey = toLocalYYYYMMDD(dateObj);
        const todayKey = toLocalYYYYMMDD(new Date());

        const targetD = new Date(targetKey + 'T00:00:00');
        const todayD = new Date(todayKey + 'T00:00:00');
        const dayDiff = Math.round((todayD.getTime() - targetD.getTime()) / (1000 * 60 * 60 * 24));

        let relative = '';
        if (dayDiff === 0) {
            relative = 'අද (Today)';
        } else if (dayDiff === 1) {
            relative = 'ඊයේ (Yesterday)';
        } else if (dayDiff > 1) {
            relative = `මීට දින ${dayDiff} කට පෙර (${dayDiff} days ago)`;
        } else {
            relative = 'Just now';
        }

        return `${dateStr}, ${timeStr} — ${relative}`;
    }

    async function calculate7DayActivityScore(bid, ownerUid, lastLoginDate, userData = {}) {
        const now = new Date();
        const todayStr = toLocalYYYYMMDD(now);
        const tenDaysAgo = new Date();
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

        const activeDateStrings = new Set();

        // Include userData activeDates array if present
        if (Array.isArray(userData.activeDates)) {
            userData.activeDates.forEach(dStr => {
                if (typeof dStr === 'string' && dStr.length >= 10) {
                    activeDateStrings.add(dStr.slice(0, 10));
                }
            });
        }

        // Include explicit user timestamps formatted in LOCAL timezone YYYY-MM-DD
        [lastLoginDate, userData.lastActiveAt, userData.lastLoginAt, userData.updatedAt, userData.createdAt].forEach(ts => {
            if (ts) {
                const dateObj = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
                if (!isNaN(dateObj.getTime()) && dateObj >= tenDaysAgo) {
                    const localKey = toLocalYYYYMMDD(dateObj);
                    if (localKey) activeDateStrings.add(localKey);
                }
            }
        });

        try {
            // Comprehensive multi-collection activity scanner across ALL IDs and field keys
            const collectionsToScan = [
                'tire_centre_sales', 'sales', 'orders', 'appointments', 'invoices',
                'buying_history', 'selling_history', 'scrap_buying', 'scrap_selling', 'scrap_leads',
                'manufacturer_sales', 'manufacturer_production_batches', 'manufacturer_raw_materials', 'manufacturer_finished_products',
                'retail_sales', 'supplier_ledger', 'customer_ledger', 'purchases', 'grn',
                'banking', 'banking_transactions', 'daily_transactions', 'expenses', 'manufacturer_expenses',
                'activity_logs', 'user_activities', 'audit_logs', 'customers', 'products', 'items'
            ];

            const targetIds = Array.from(new Set([bid, ownerUid].filter(Boolean)));
            const scanPromises = [];

            targetIds.forEach(idVal => {
                collectionsToScan.forEach(colName => {
                    scanPromises.push(window.db.collection(colName).where('businessId', '==', idVal).limit(30).get().catch(() => ({ docs: [] })));
                    scanPromises.push(window.db.collection(colName).where('userId', '==', idVal).limit(30).get().catch(() => ({ docs: [] })));
                    scanPromises.push(window.db.collection(colName).where('uid', '==', idVal).limit(30).get().catch(() => ({ docs: [] })));
                });
                scanPromises.push(window.db.collection('businesses').doc(idVal).collection('users').limit(30).get().catch(() => ({ docs: [] })));
            });

            const snaps = await Promise.all(scanPromises);

            snaps.forEach(snap => {
                if (snap && snap.docs) {
                    snap.docs.forEach(d => {
                        const data = d.data() || {};
                        [data.createdAt, data.date, data.updatedAt, data.timestamp, data.lastActiveAt, data.lastLoginAt].forEach(ts => {
                            if (ts) {
                                const dateObj = typeof ts.toDate === 'function' ? ts.toDate() : new Date(ts);
                                if (!isNaN(dateObj.getTime()) && dateObj >= tenDaysAgo) {
                                    const localKey = toLocalYYYYMMDD(dateObj);
                                    if (localKey) activeDateStrings.add(localKey);
                                }
                            }
                        });
                        // Also check activeDates array inside docs if present
                        if (Array.isArray(data.activeDates)) {
                            data.activeDates.forEach(dStr => {
                                if (typeof dStr === 'string' && dStr.length >= 10) {
                                    activeDateStrings.add(dStr.slice(0, 10));
                                }
                            });
                        }
                    });
                }
            });
        } catch (e) {
            console.warn('[ActivityScore] Comprehensive calc error:', e);
        }

        const hasAccessedToday = activeDateStrings.has(todayStr);

        const sinhalaDays = ['ඉරි', 'සඳු', 'අඟහ', 'බදා', 'බ්‍රහ', 'සිකු', 'සෙන'];
        const englishDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Construct target 7-day window array (chronological order)
        const target7Days = [];
        const dayDetails = [];

        if (hasAccessedToday) {
            // Include Today + Past 6 Days (chronological order from 6 days ago -> today)
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                target7Days.push(toLocalYYYYMMDD(d));
            }
        } else {
            // Ignore Today! Evaluate Past 7 Full Days (excluding today)
            for (let i = 7; i >= 1; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                target7Days.push(toLocalYYYYMMDD(d));
            }
        }

        let activeCount = 0;
        const yesterdayObj = new Date();
        yesterdayObj.setDate(yesterdayObj.getDate() - 1);
        const yesterdayStr = toLocalYYYYMMDD(yesterdayObj);

        target7Days.forEach(dateStr => {
            const isActive = activeDateStrings.has(dateStr);
            if (isActive) activeCount++;

            const dObj = new Date(dateStr + 'T00:00:00');
            const dayIdx = dObj.getDay();
            let label = `${sinhalaDays[dayIdx]} (${englishDays[dayIdx]})`;
            if (dateStr === todayStr) label = 'අද (Today)';
            else if (dateStr === yesterdayStr) label = 'ඊයේ (Yesterday)';

            dayDetails.push({
                dateStr,
                label,
                isActive,
                isToday: dateStr === todayStr
            });
        });

        const scorePct = Math.round((activeCount / 7) * 100);

        return { scorePct, activeCount, hasAccessedToday, dayDetails };
    }

    async function populateDeepDiveInspection(userData, businessData, settingsData, ownerUid, bid) {
        // User Credentials
        document.getElementById('dd-biz-name').textContent = businessData.name || userData.name || 'Unnamed Business';
        document.getElementById('dd-owner-email').textContent = userData.email || 'N/A';

        document.getElementById('dd-user-uid').textContent = ownerUid || 'N/A';
        document.getElementById('dd-biz-id').textContent = bid || 'N/A';
        document.getElementById('dd-owner-name').textContent = userData.displayName || userData.name || userData.ownerName || 'N/A';
        document.getElementById('dd-email-val').textContent = userData.email || 'N/A';

        const verifiedEl = document.getElementById('dd-email-verified');
        if (userData.emailVerified) {
            verifiedEl.innerHTML = '<span class="badge green">VERIFIED ✅</span>';
        } else {
            verifiedEl.innerHTML = '<span class="badge orange">UNVERIFIED ⚠️</span>';
        }

        document.getElementById('dd-phone-val').textContent = userData.phoneNumber || userData.phone || 'N/A';
        document.getElementById('dd-role-val').textContent = userData.role || 'BUSINESS_OWNER';
        document.getElementById('dd-created-date').textContent = formatTimestamp(userData.createdAt || businessData.createdAt);

        const lastLoginTs = userData.lastLoginAt || userData.lastSeenAt || userData.updatedAt;
        const lastLoginDateObj = lastLoginTs ? (typeof lastLoginTs.toDate === 'function' ? lastLoginTs.toDate() : new Date(lastLoginTs)) : null;
        document.getElementById('dd-last-login').textContent = formatTimestamp(lastLoginTs);

        // Calculate 7-Day Activity & Render 7-Segment Blocks
        const { scorePct, activeCount, hasAccessedToday, dayDetails } = await calculate7DayActivityScore(bid, ownerUid, lastLoginDateObj, userData);
        
        const scoreTextEl = document.getElementById('dd-activity-score-text');
        const noteEl = document.getElementById('dd-activity-note');
        const badgeEl = document.getElementById('dd-status-badge');
        const badgeTextEl = document.getElementById('dd-status-text');

        scoreTextEl.textContent = `${scorePct}% (${activeCount} / 7 Days Active)`;

        // Render 7-Segment Green/Red Visual Day Grid
        const daySegmentsEl = document.getElementById('dd-day-segments');
        if (daySegmentsEl && Array.isArray(dayDetails)) {
            daySegmentsEl.innerHTML = '';
            dayDetails.forEach(day => {
                const block = document.createElement('div');
                if (day.isActive) {
                    block.className = 'day-segment-block active';
                    block.innerHTML = `
                        <div class="day-segment-title">${day.label}</div>
                        <div class="day-segment-status">✅ පැමිණ ඇත</div>
                        <div class="day-segment-date">${day.dateStr}</div>
                    `;
                } else if (day.isToday && !hasAccessedToday) {
                    block.className = 'day-segment-block pending';
                    block.innerHTML = `
                        <div class="day-segment-title">${day.label}</div>
                        <div class="day-segment-status">⏳ Pending</div>
                        <div class="day-segment-date">${day.dateStr}</div>
                    `;
                } else {
                    block.className = 'day-segment-block inactive';
                    block.innerHTML = `
                        <div class="day-segment-title">${day.label}</div>
                        <div class="day-segment-status">❌ පැමිණ නැත</div>
                        <div class="day-segment-date">${day.dateStr}</div>
                    `;
                }
                daySegmentsEl.appendChild(block);
            });
        }

        if (hasAccessedToday) {
            if (activeCount === 7) {
                badgeEl.className = 'dd-status-badge active';
                badgeTextEl.textContent = '100% DAILY ACTIVE USER';
                noteEl.innerHTML = `✅ <strong>අද දින පද්ධතියට පැමිණ ඇත</strong> (අද ඇතුළුව පසුගිය දින 7 ම පද්ධතියට පැමිණ ඇති දිනපතා සක්‍රීය පරිශීලකයෙකි).`;
            } else {
                badgeEl.className = 'dd-status-badge active';
                badgeTextEl.textContent = 'ACTIVE TODAY';
                noteEl.innerHTML = `✅ <strong>අද දින පද්ධතියට පැමිණ ඇත</strong> (අද + පසුගිය දින 6 න් දින ${activeCount} ක් පද්ධති පැමිණීම් සටහන් වී ඇත).`;
            }
        } else {
            if (activeCount === 7) {
                badgeEl.className = 'dd-status-badge active';
                badgeTextEl.textContent = 'DAILY USER (TODAY PENDING)';
                noteEl.innerHTML = `ℹ️ <strong>අද දින තවම පැමිණ නැත</strong> (නමුත් පසුගිය සම්පූර්ණ දින 7 ම පැමිණ ඇති දිනපතා සක්‍රීය පරිශීලකයෙකි. අද දිනය නොසලකා හැර ගණනය කරන ලදී).`;
            } else if (activeCount >= 4) {
                badgeEl.className = 'dd-status-badge warning';
                badgeTextEl.textContent = 'REGULAR USER (TODAY PENDING)';
                noteEl.innerHTML = `⚠️ <strong>අද දින තවම පැමිණ නැත</strong> (අද දිනය නොසලකා හැර පසුගිය සම්පූර්ණ දින 7 න් දින ${activeCount} ක් පැමිණ ඇත).`;
            } else {
                badgeEl.className = 'dd-status-badge inactive';
                badgeTextEl.textContent = 'LOW ACCESS / INACTIVE';
                noteEl.innerHTML = `🔴 <strong>අද දින තවම පැමිණ නැත</strong> (අද දිනය නොසලකා හැර පසුගිය සම්පූර්ණ දින 7 ටම පද්ධතියට පැමිණ ඇත්තේ දින ${activeCount} ක් පමණි).`;
            }
        }

        // Business Model & Subscription Details
        const currentType = businessData.businessType || userData.businessType || 'retail';
        document.getElementById('dd-biz-model').textContent = formatBusinessTypeName(currentType);

        const subscription = settingsData.subscription || {};
        document.getElementById('dd-sub-plan').textContent = `${subscription.plan || 'TRIAL'} (${subscription.status || 'ACTIVE'})`;

        const expireDate = subscription.expireDate || subscription.trialEnd;
        document.getElementById('dd-sub-expire').textContent = expireDate ? new Date(expireDate).toLocaleDateString() : 'N/A';

        if (expireDate) {
            const expD = new Date(expireDate);
            const remainingDays = Math.ceil((expD.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            document.getElementById('dd-sub-days').textContent = `${remainingDays} Days Remaining`;
        } else {
            document.getElementById('dd-sub-days').textContent = 'N/A';
        }

        const smsWallet = settingsData.smsWallet || {};
        const totalSms = settingsData.smsBalance || (smsWallet.smsBalance || 0);
        const paidSms = smsWallet.paidSmsBalance || 0;
        const freeSms = Math.max(0, totalSms - paidSms);

        document.getElementById('dd-sms-total').textContent = `${totalSms} SMS Credits`;
        document.getElementById('dd-sms-paid').textContent = `${paidSms} Paid Credits`;
        // Fetch dynamic version lock status for this client
        let clientVerLabel = 'DIGIBIZ PWA (LATEST_DEV)';
        try {
            const targetEmail = userData.ownerEmail || userData.email || '';
            const vcId = String(targetEmail).trim().toLowerCase().replace(/[^a-z0-9@]/g, '_');
            if (vcId) {
                const vcSnap = await window.db.collection('client_version_control').doc(vcId).get().catch(() => null);
                if (vcSnap && vcSnap.exists) {
                    const cfg = vcSnap.data() || {};
                    if (cfg.isLocked || cfg.lockStatus === 'LOCKED') {
                        clientVerLabel = `DIGIBIZ PWA ${cfg.versionTag || 'LOCKED'}` +
                            (cfg.freezeDate && cfg.freezeDate !== 'N/A' ? ` (Frozen ${cfg.freezeDate})` : '');
                    }
                } else if (userData.versionLock || userData.lockedVersionTag) {
                    clientVerLabel = `DIGIBIZ PWA ${userData.lockedVersionTag || 'LOCKED'}`;
                }
            }
        } catch (eVer) {}
        document.getElementById('dd-client-ver').textContent = clientVerLabel;

        // Real-Time System Usage & Database Counts
        try {
            const [buyingSnap, mfgSalesSnap, invoiceSnap, prodSnap, custSnap] = await Promise.all([
                window.db.collection('buying_history').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
                window.db.collection('manufacturer_sales').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
                window.db.collection('invoices').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
                window.db.collection('manufacturer_finished_products').where('businessId', '==', bid).get().catch(() => ({ docs: [] })),
                window.db.collection('customers').where('businessId', '==', bid).get().catch(() => ({ docs: [] }))
            ]);

            const totalTransCount = buyingSnap.docs.length + mfgSalesSnap.docs.length + invoiceSnap.docs.length;
            document.getElementById('dd-total-sales-count').textContent = `${totalTransCount} Recorded Transactions`;
            document.getElementById('dd-total-products-count').textContent = `${prodSnap.docs.length} Items / Products`;
            document.getElementById('dd-total-customers-count').textContent = `${custSnap.docs.length} Customers Registered`;

            const allDocs = [...buyingSnap.docs, ...mfgSalesSnap.docs, ...invoiceSnap.docs];
            if (allDocs.length > 0) {
                const sorted = allDocs.map(d => d.data() || {}).sort((a, b) => {
                    const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : new Date(a.createdAt || a.date || 0).getTime();
                    const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : new Date(b.createdAt || b.date || 0).getTime();
                    return tb - ta;
                });
                document.getElementById('dd-last-trans-date').textContent = formatTimestamp(sorted[0].createdAt || sorted[0].date);
            } else {
                document.getElementById('dd-last-trans-date').textContent = 'No transactions recorded yet';
            }
        } catch (e) {
            console.warn('[DeepDive] Database counts warn:', e);
        }

        // All Extra Small Details
        document.getElementById('dd-auth-provider').textContent = (userData.providerData && userData.providerData[0] ? userData.providerData[0].providerId : 'password');

        const smsMgr = settingsData.smsManager || {};
        document.getElementById('dd-sms-events-status').textContent = smsMgr.events ? `Sales: ${smsMgr.events.outbound ? 'ON' : 'OFF'}, Inbound: ${smsMgr.events.inbound ? 'ON' : 'OFF'}` : 'Default Enabled';

        document.getElementById('dd-biz-address').textContent = businessData.address || userData.address || businessData.city || 'N/A';
        document.getElementById('dd-doc-updated').textContent = formatTimestamp(userData.updatedAt || businessData.updatedAt);

        deepDivePanel.style.display = 'block';
    }

    async function refreshDetails() {
        const query = emailSearch.value.trim();
        if (!query) {
            alert('Please enter an email, UID, or business name to search.');
            return;
        }

        try {
            let userDoc = null;
            let userData = null;

            // 1. Search by email
            let snapshot = await window.db.collection('users').where('email', '==', query).get();
            if (snapshot.empty) {
                // 2. Search by UID
                const docByUid = await window.db.collection('users').doc(query).get().catch(() => null);
                if (docByUid && docByUid.exists) {
                    userDoc = docByUid;
                } else {
                    // 3. Search by business name match
                    const bizSnap = await window.db.collection('businesses').where('name', '==', query).get().catch(() => ({ docs: [] }));
                    if (!bizSnap.empty) {
                        const targetBizId = bizSnap.docs[0].id;
                        const usersByBiz = await window.db.collection('users').where('businessId', '==', targetBizId).get();
                        if (!usersByBiz.empty) {
                            userDoc = usersByBiz.docs[0];
                        }
                    }
                }
            } else {
                userDoc = snapshot.docs[0];
            }

            if (!userDoc || !userDoc.exists) {
                alert('No business account found matching search query: ' + query);
                businessDetails.style.display = 'none';
                deepDivePanel.style.display = 'none';
                return;
            }

            userData = userDoc.data() || {};
            ownerUserId = userDoc.id;
            businessId = userData.businessId || userDoc.id;

            if (!businessId) {
                alert('User is not associated with a business ID.');
                businessDetails.style.display = 'none';
                deepDivePanel.style.display = 'none';
                return;
            }

            const businessRef = window.db.collection('businesses').doc(businessId);
            const businessDoc = await businessRef.get();
            const businessData = businessDoc.exists ? businessDoc.data() : {};

            businessName.textContent = businessData.name || userData.name || 'Unnamed Business';
            ownerName.textContent = userData.displayName || userData.name || userData.ownerName || 'N/A';
            ownerPhone.textContent = userData.phoneNumber || userData.phone || 'N/A';

            const currentType = businessData.businessType || userData.businessType || 'retail';
            if (currentBusinessTypeEl) {
                currentBusinessTypeEl.textContent = formatBusinessTypeName(currentType);
            }
            if (changeBusinessTypeSelect) {
                changeBusinessTypeSelect.value = currentType;
            }

            // Assign active state for 1-Click Super Admin Impersonation
            currentSelectedUserData = userData;
            currentSelectedBusinessData = businessData;
            currentSelectedEmail = userData.email || businessData.ownerEmail || businessData.email || query;
            currentSelectedBizId = businessId;
            currentSelectedBizType = currentType;

            const settingsRef = window.db.collection('settings').doc(businessId);
            const settingsDoc = await settingsRef.get();
            const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
            const subscription = settingsData.subscription || {};

            if (!subscription || Object.keys(subscription).length === 0) {
                subscriptionStatus.textContent = 'No active subscription found.';
            } else {
                const expireDate = new Date(subscription.expireDate || subscription.trialEnd || Date.now());
                const remainingDays = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                subscriptionStatus.textContent = `${subscription.plan || 'TRIAL'} (${subscription.status || 'ACTIVE'}) - ${remainingDays} days left`;
            }

            businessDetails.style.display = 'block';

            // Populate Deep-Dive Comprehensive Inspection Card
            await populateDeepDiveInspection(userData, businessData, settingsData, ownerUserId, businessId);

        } catch (error) {
            console.error("Error refreshing details:", error);
            alert("Failed to fetch business details: " + error.message);
        }
    }

    searchBtn.addEventListener('click', refreshDetails);
    emailSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') refreshDetails();
    });

    // Business Model / Type Switcher Logic
    if (changeBusinessTypeBtn) {
        changeBusinessTypeBtn.addEventListener('click', async () => {
            if (!businessId) {
                alert('Please search for a valid business first.');
                return;
            }

            const selectedType = changeBusinessTypeSelect.value;
            const selectedTypeObj = changeBusinessTypeSelect.options[changeBusinessTypeSelect.selectedIndex];
            const selectedLabel = selectedTypeObj ? selectedTypeObj.textContent : selectedType;

            const confirmMsg = `Are you sure you want to change the business model for "${businessName.textContent}" to:\n\n👉 ${selectedLabel}\n\nThis will update permissions and navigation menus for this account.`;
            if (!confirm(confirmMsg)) {
                return;
            }

            try {
                changeBusinessTypeBtn.disabled = true;
                changeBusinessTypeBtn.textContent = 'Updating...';

                const batch = window.db.batch();
                const nowTimestamp = firebase.firestore.FieldValue.serverTimestamp();

                // 1. Update Business Document
                const bizRef = window.db.collection('businesses').doc(businessId);
                batch.set(bizRef, {
                    businessType: selectedType,
                    originalType: selectedType,
                    updatedAt: nowTimestamp
                }, { merge: true });

                // 2. Update Owner User Document
                if (ownerUserId) {
                    const userRef = window.db.collection('users').doc(ownerUserId);
                    batch.set(userRef, {
                        businessType: selectedType,
                        updatedAt: nowTimestamp
                    }, { merge: true });
                }

                // 3. Update all sub-users associated with this businessId
                const usersSnap = await window.db.collection('users').where('businessId', '==', businessId).get();
                usersSnap.forEach(uDoc => {
                    if (uDoc.id !== ownerUserId) {
                        batch.set(uDoc.ref, {
                            businessType: selectedType,
                            updatedAt: nowTimestamp
                        }, { merge: true });
                    }
                });

                await batch.commit();

                alert(`✅ Business model successfully updated to: ${selectedLabel}`);
                await refreshDetails();
            } catch (error) {
                console.error("Error changing business model:", error);
                alert("Failed to update business model: " + error.message);
            } finally {
                changeBusinessTypeBtn.disabled = false;
                changeBusinessTypeBtn.textContent = 'Update Model';
            }
        });
    }

    extendProBtn.addEventListener('click', async () => {
        if (!businessId) return;

        const days = parseInt(extendProDays.value);
        if (isNaN(days) || days <= 0) {
            alert('Invalid number of days');
            return;
        }

        try {
            const settingsRef = window.db.collection('settings').doc(businessId);
            const settingsDoc = await settingsRef.get();
            const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
            const subscription = settingsData.subscription || {};

            const currentExpireDate = new Date(subscription.expireDate || subscription.trialEnd || Date.now());
            const newExpireDate = new Date(currentExpireDate.getTime() + days * 24 * 60 * 60 * 1000);

            await settingsRef.set({
                subscription: {
                    ...subscription,
                    plan: 'PRO',
                    status: 'ACTIVE',
                    expireDate: newExpireDate.toISOString()
                }
            }, { merge: true });

            alert('Subscription extended successfully');
            localStorage.setItem('subscription_updated', JSON.stringify({ businessId: businessId, timestamp: Date.now() }));
            refreshDetails();
        } catch (error) {
            console.error("Error extending subscription:", error);
            alert("Failed to extend subscription. See console for error.");
        }
    });

    extendTrialBtn.addEventListener('click', async () => {
        if (!businessId) return;

        try {
            const settingsRef = window.db.collection('settings').doc(businessId);
            const settingsDoc = await settingsRef.get();
            const settingsData = settingsDoc.exists ? settingsDoc.data() : {};
            const subscription = settingsData.subscription || {};

            const currentTrialEnd = new Date(subscription.trialEnd || subscription.expireDate || Date.now());
            const newTrialEnd = new Date(currentTrialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

            await settingsRef.set({
                subscription: {
                    ...subscription,
                    plan: subscription.plan || 'TRIAL',
                    status: 'ACTIVE',
                    trialEnd: newTrialEnd.toISOString(),
                    expireDate: newTrialEnd.toISOString()
                }
            }, { merge: true });

            alert('Trial extended successfully');
            localStorage.setItem('subscription_updated', JSON.stringify({ businessId: businessId, timestamp: Date.now() }));
            refreshDetails();
        } catch (error) {
            console.error("Error extending trial:", error);
            alert("Failed to extend trial. See console for error.");
        }
    });

    addSmsBtn.addEventListener('click', async () => {
        if (!businessId) return;

        const amount = parseInt(addSmsAmount.value);
        if (isNaN(amount) || amount <= 0) {
            alert('Invalid SMS amount');
            return;
        }

        try {
            const settingsRef = window.db.collection('settings').doc(businessId);
            await window.db.runTransaction(async (transaction) => {
                const settingsDoc = await transaction.get(settingsRef);
                if (!settingsDoc.exists) {
                    throw new Error("Settings document does not exist!");
                }
                const settingsData = settingsDoc.data();
                const smsWallet = settingsData.smsWallet || {};

                const newPaidSmsBalance = (smsWallet.paidSmsBalance || 0) + amount;
                const newSmsBalance = (settingsData.smsBalance || 0) + amount;

                transaction.set(settingsRef, {
                    smsWallet: {
                        ...smsWallet,
                        paidSmsBalance: newPaidSmsBalance,
                        smsBalance: (smsWallet.smsBalance || 0) + amount,
                    },
                    smsBalance: newSmsBalance
                }, { merge: true });
            });

            alert('SMS credits added successfully');
            localStorage.setItem('subscription_updated', JSON.stringify({ businessId: businessId, timestamp: Date.now() }));
            refreshDetails();
        } catch (error) {
            console.error("Error adding SMS credits:", error);
            alert("Failed to add SMS credits. See console for error.");
        }
    });

    const deleteAccountBtn = document.getElementById('delete-account-btn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (!businessId && !ownerUserId) {
                alert('No business account loaded to delete.');
                return;
            }

            const currentEmail = document.getElementById('dd-email-val')?.textContent || emailSearch.value.trim();
            const confirmVal = prompt(`⚠️ WARNING: Permanently delete account for "${currentEmail}"?\n\nThis will purge all user profiles, business settings, transactions, ledgers, and logs so that this email can be re-registered freely.\n\nType "DELETE" below to confirm:`);

            if (confirmVal !== 'DELETE') {
                alert('Account deletion cancelled.');
                return;
            }

            try {
                deleteAccountBtn.disabled = true;
                deleteAccountBtn.textContent = '⏳ Purging account & data...';

                const targetIds = Array.from(new Set([businessId, ownerUserId].filter(Boolean)));
                const collectionsToPurge = [
                    'tire_centre_sales', 'sales', 'orders', 'appointments', 'invoices',
                    'buying_history', 'selling_history', 'scrap_buying', 'scrap_selling', 'scrap_leads',
                    'manufacturer_sales', 'manufacturer_production_batches', 'manufacturer_raw_materials', 'manufacturer_finished_products',
                    'retail_sales', 'supplier_ledger', 'customer_ledger', 'purchases', 'grn',
                    'banking', 'banking_transactions', 'daily_transactions', 'expenses', 'manufacturer_expenses',
                    'activity_logs', 'user_activities', 'audit_logs', 'customers', 'products', 'items',
                    'journal_entries', 'account_balances'
                ];

                const deletePromises = [];

                // 1. Purge master user doc
                if (ownerUserId) {
                    deletePromises.push(window.db.collection('users').doc(ownerUserId).delete().catch(() => {}));
                }

                // 2. Purge business doc, settings, subscriptions
                if (businessId) {
                    deletePromises.push(window.db.collection('businesses').doc(businessId).delete().catch(() => {}));
                    deletePromises.push(window.db.collection('settings').doc(businessId).delete().catch(() => {}));
                    deletePromises.push(window.db.collection('subscriptions').doc(businessId).delete().catch(() => {}));

                    // Purge sub-users under businesses/{bid}/users
                    const subUsersSnap = await window.db.collection('businesses').doc(businessId).collection('users').get().catch(() => ({ docs: [] }));
                    if (subUsersSnap && subUsersSnap.docs) {
                        subUsersSnap.docs.forEach(d => deletePromises.push(d.ref.delete().catch(() => {})));
                    }
                }

                // 3. Purge all matching collection records
                for (const idVal of targetIds) {
                    for (const colName of collectionsToPurge) {
                        const snap1 = await window.db.collection(colName).where('businessId', '==', idVal).get().catch(() => ({ docs: [] }));
                        if (snap1 && snap1.docs) snap1.docs.forEach(d => deletePromises.push(d.ref.delete().catch(() => {})));

                        const snap2 = await window.db.collection(colName).where('userId', '==', idVal).get().catch(() => ({ docs: [] }));
                        if (snap2 && snap2.docs) snap2.docs.forEach(d => deletePromises.push(d.ref.delete().catch(() => {})));

                        const snap3 = await window.db.collection(colName).where('uid', '==', idVal).get().catch(() => ({ docs: [] }));
                        if (snap3 && snap3.docs) snap3.docs.forEach(d => deletePromises.push(d.ref.delete().catch(() => {})));
                    }
                }

                await Promise.all(deletePromises);

                alert(`✅ Account "${currentEmail}" and all related data have been completely purged from the system!\n\nThis email address can now be re-registered freely.`);
                businessDetails.style.display = 'none';
                deepDivePanel.style.display = 'none';
                emailSearch.value = '';
                const analyticsWrapper = document.getElementById('active-analytics-wrapper');
                if (analyticsWrapper) analyticsWrapper.style.display = 'block';
            } catch (err) {
                console.error("Account deletion failed:", err);
                alert("Failed to delete account. Error: " + (err.message || err));
            } finally {
                deleteAccountBtn.disabled = false;
                deleteAccountBtn.textContent = '🗑️ Delete Entire Account & Data';
            }
        });
    }

    let currentSelectedUserData = null;
    let currentSelectedBusinessData = null;
    let currentSelectedEmail = '';
    let currentSelectedBizId = '';
    let currentSelectedBizType = '';

    // Super Admin Direct Impersonation Login Handler
    async function impersonateClientAccount(targetEmail, targetBizId, targetBizType) {
        if (!targetEmail) {
            alert('⚠️ Invalid email or business profile for impersonation.');
            return;
        }

        let resolvedBizId = targetBizId || '';
        let resolvedBizType = String(targetBizType || '').toLowerCase();
        let resolvedBizName = 'Client Business';
        let resolvedOwnerName = targetEmail;

        try {
            if (window.db && targetEmail) {
                const uSnap = await window.db.collection('users').where('email', '==', targetEmail).get().catch(() => null);
                if (uSnap && !uSnap.empty) {
                    const uData = uSnap.docs[0].data() || {};
                    resolvedBizId = uData.businessId || uData.assignedBusiness || uData.companyId || resolvedBizId || uSnap.docs[0].id;
                    if (uData.businessType) resolvedBizType = String(uData.businessType).toLowerCase();
                    if (uData.name || uData.ownerName) resolvedOwnerName = uData.ownerName || uData.name;
                    if (uData.businessName) resolvedBizName = uData.businessName;
                }

                // Query businesses by email OR ownerEmail
                let bSnap = await window.db.collection('businesses').where('email', '==', targetEmail).get().catch(() => null);
                if (!bSnap || bSnap.empty) {
                    bSnap = await window.db.collection('businesses').where('ownerEmail', '==', targetEmail).get().catch(() => null);
                }

                if (bSnap && !bSnap.empty) {
                    const bData = bSnap.docs[0].data() || {};
                    resolvedBizId = bSnap.docs[0].id || resolvedBizId;
                    if (bData.businessType || bData.type) resolvedBizType = String(bData.businessType || bData.type).toLowerCase();
                    resolvedBizName = bData.businessName || bData.name || bData.companyName || resolvedBizName;
                    if (bData.ownerName) resolvedOwnerName = bData.ownerName;
                }

                if (resolvedBizId && (!resolvedBizName || resolvedBizName === 'Client Business')) {
                    const bDoc = await window.db.collection('businesses').doc(resolvedBizId).get().catch(() => null);
                    if (bDoc && bDoc.exists) {
                        const bd = bDoc.data() || {};
                        resolvedBizName = bd.businessName || bd.name || bd.companyName || resolvedBizName;
                        if (bd.ownerName) resolvedOwnerName = bd.ownerName;
                        if (bd.businessType || bd.type) resolvedBizType = String(bd.businessType || bd.type).toLowerCase();
                    }
                }
            }
        } catch (eFetch) {
            console.warn('[Impersonation] Profile fetch warn:', eFetch);
        }

        if (!resolvedBizType) resolvedBizType = 'retail';

        if (!confirm(`🔑 Log in as client business "${resolvedBizName}" (${targetEmail})?\n\nYou will enter their live PWA app with their business profile, inventory, and transactions to inspect layout and troubleshoot reported issues directly.`)) return;

        localStorage.setItem('digibiz_impersonate_active', 'true');
        localStorage.setItem('digibiz_impersonate_email', targetEmail);
        localStorage.setItem('digibiz_impersonate_biz_id', resolvedBizId);
        localStorage.setItem('digibiz_impersonate_type', resolvedBizType);
        localStorage.setItem('digibiz_impersonate_biz_name', resolvedBizName);
        localStorage.setItem('digibiz_impersonate_owner_name', resolvedOwnerName);

        if (resolvedBizId) {
            localStorage.setItem('businessId', resolvedBizId);
            localStorage.setItem('currentBusinessId', resolvedBizId);
            sessionStorage.setItem('currentBusinessId', resolvedBizId);
            localStorage.setItem('activeBusinessId', resolvedBizId);
            localStorage.setItem('selectedBusinessId', resolvedBizId);
            sessionStorage.setItem('selectedBusinessId', resolvedBizId);
        }
        if (targetEmail) {
            localStorage.setItem('userEmail', targetEmail);
            localStorage.setItem('activeUserEmail', targetEmail);
        }
        if (resolvedBizType) {
            localStorage.setItem('currentBusinessType', resolvedBizType);
            sessionStorage.setItem('currentBusinessType', resolvedBizType);
        }
        localStorage.setItem('currentUserRole', 'BUSINESS_OWNER');
        sessionStorage.setItem('currentUserRole', 'BUSINESS_OWNER');
        localStorage.setItem('currentBusinessNavRole', 'BUSINESS_OWNER');
        sessionStorage.setItem('currentBusinessNavRole', 'BUSINESS_OWNER');

        try {
            if (window.db && window.db.collection) {
                await window.db.collection('audit_logs').add({
                    action: 'SUPER_ADMIN_IMPERSONATION_LOGIN',
                    performedByEmail: 'biz.sirimal@gmail.com',
                    targetEmail: targetEmail,
                    targetBizId: resolvedBizId,
                    targetBizType: resolvedBizType,
                    timestamp: new Date().toISOString()
                }).catch(() => {});
            }
        } catch (_eAudit) {}

        let customToken = '';
        try {
            if (window.firebase && window.firebase.functions) {
                const genTokenFn = window.firebase.functions().httpsCallable('generateClientImpersonationToken');
                const res = await genTokenFn({
                    targetEmail: targetEmail,
                    targetBizId: resolvedBizId,
                    targetOwnerName: resolvedOwnerName
                });
                if (res && res.data && res.data.customToken) {
                    customToken = res.data.customToken;
                    localStorage.setItem('digibiz_impersonate_token', customToken);
                }
            }
        } catch (eToken) {
            console.warn('[Impersonation Token Gen Fail]', eToken);
        }

        let destUrl = '/modules/core/dashboard.html';
        if (resolvedBizType === 'distributor') destUrl = '/modules/distributor/web/dashboard.html';
        else if (resolvedBizType === 'retail') destUrl = '/modules/retail/dashboard.html';
        else if (resolvedBizType === 'manufacturer') destUrl = '/modules/manufacturer/dashboard.html';
        else if (resolvedBizType === 'hardware') destUrl = '/modules/hardware/dashboard.html';
        else if (resolvedBizType === 'pharmacy') destUrl = '/modules/pharmacy/dashboard.html';
        else if (resolvedBizType === 'scrap_collection_center') destUrl = '/modules/scrap_collection_center/dashboard.html';
        else if (resolvedBizType === 'tire_centre') destUrl = '/modules/tire_centre/dashboard.html';

        const queryParams = new URLSearchParams({
            impersonate: 'true',
            email: targetEmail,
            bizId: resolvedBizId,
            bizType: resolvedBizType,
            ts: Date.now()
        });

        if (customToken) {
            queryParams.set('token', customToken);
        }

        const targetUrl = `${destUrl}?${queryParams.toString()}`;

        // Open Client App in a NEW TAB (_blank) with clean tenant context
        window.open(targetUrl, '_blank');
    }

    async function wipeUserAccount(targetEmail) {
        if (!targetEmail) return;
        if (!confirm(`⚠️ ARE YOU ABSOLUTELY SURE?\n\nThis will PERMANENTLY DELETE account "${targetEmail}" from Firebase Auth, Firestore users, and businesses collections.\n\nThis action cannot be undone and will allow a fresh registration under this email.`)) return;

        try {
            if (window.firebase && window.firebase.functions) {
                const wipeFn = window.firebase.functions().httpsCallable('deleteUserAccountByEmail');
                const res = await wipeFn({ targetEmail: targetEmail });
                if (res && res.data && res.data.success) {
                    alert(`✅ Account "${targetEmail}" has been completely wiped from the system.\n\nThe email is now free for a fresh registration!`);
                    location.reload();
                    return;
                }
            }
        } catch (eWipe) {
            console.error('Wipe error:', eWipe);
            alert('Wipe error: ' + (eWipe.message || String(eWipe)));
        }
    }
    window.wipeUserAccount = wipeUserAccount;

    const impersonateClientBtn = document.getElementById('impersonate-client-btn');
    if (impersonateClientBtn) {
        impersonateClientBtn.onclick = () => {
            const targetEmail = currentSelectedEmail || (currentSelectedUserData && currentSelectedUserData.email) || (currentSelectedBusinessData && (currentSelectedBusinessData.ownerEmail || currentSelectedBusinessData.email)) || (emailSearch && emailSearch.value.trim());
            const targetBizId = currentSelectedBizId || (currentSelectedBusinessData && currentSelectedBusinessData.id) || businessId;
            const targetBizType = currentSelectedBizType || (currentSelectedBusinessData && currentSelectedBusinessData.businessType) || (currentSelectedUserData && currentSelectedUserData.businessType);

            if (!targetEmail) {
                alert('⚠️ Please search and select a business account first.');
                return;
            }
            impersonateClientAccount(targetEmail, targetBizId, targetBizType);
        };
    }

    const copyChromeBtn = document.getElementById('copy-chrome-link-btn');
    if (copyChromeBtn) {
        copyChromeBtn.onclick = async () => {
            const targetEmail = currentSelectedEmail || (currentSelectedUserData && currentSelectedUserData.email) || (currentSelectedBusinessData && (currentSelectedBusinessData.ownerEmail || currentSelectedBusinessData.email)) || (emailSearch && emailSearch.value.trim());
            const targetBizId = currentSelectedBizId || (currentSelectedBusinessData && currentSelectedBusinessData.id) || businessId;
            const targetBizType = currentSelectedBizType || (currentSelectedBusinessData && currentSelectedBusinessData.businessType) || (currentSelectedUserData && currentSelectedUserData.businessType);

            if (!targetEmail) {
                alert('⚠️ Please search and select a business account first.');
                return;
            }

            let resolvedBizId = targetBizId || '';
            let resolvedBizType = String(targetBizType || '').toLowerCase();
            try {
                if (window.db && targetEmail) {
                    const uSnap = await window.db.collection('users').where('email', '==', targetEmail).get();
                    if (!uSnap.empty) {
                        resolvedBizId = uSnap.docs[0].data().businessId || uSnap.docs[0].id;
                        if (uSnap.docs[0].data().businessType) resolvedBizType = String(uSnap.docs[0].data().businessType).toLowerCase();
                    }
                    if (!resolvedBizId) {
                        const bSnap = await window.db.collection('businesses').where('email', '==', targetEmail).get();
                        if (!bSnap.empty) {
                            resolvedBizId = bSnap.docs[0].id;
                            if (bSnap.docs[0].data().businessType) resolvedBizType = String(bSnap.docs[0].data().businessType).toLowerCase();
                        }
                    }
                }
            } catch (e) {}

            let destUrl = '/modules/core/dashboard.html';
            if (resolvedBizType === 'distributor') destUrl = '/modules/distributor/web/dashboard.html';
            else if (resolvedBizType === 'retail') destUrl = '/modules/retail/dashboard.html';
            else if (resolvedBizType === 'manufacturer') destUrl = '/modules/manufacturer/dashboard.html';
            else if (resolvedBizType === 'hardware') destUrl = '/modules/hardware/dashboard.html';
            else if (resolvedBizType === 'pharmacy') destUrl = '/modules/pharmacy/dashboard.html';
            else if (resolvedBizType === 'scrap_collection_center') destUrl = '/modules/scrap_collection_center/dashboard.html';
            else if (resolvedBizType === 'tire_centre') destUrl = '/modules/tire_centre/dashboard.html';

            const queryParams = new URLSearchParams({
                impersonate: 'true',
                email: targetEmail,
                bizId: resolvedBizId,
                bizType: resolvedBizType,
                ts: Date.now()
            });

            const fullUrl = `${window.location.origin}${destUrl}?${queryParams.toString()}`;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(fullUrl).then(() => {
                    alert(`📋 Google Chrome / 2nd Browser Link Copied!\n\nTarget Client: ${targetEmail}\n\n👉 Open Google Chrome, Paste (Ctrl + V) & hit Enter!`);
                }).catch(() => {
                    prompt('📋 Copy this link to paste into Google Chrome:', fullUrl);
                });
            } else {
                prompt('📋 Copy this link to paste into Google Chrome:', fullUrl);
            }
        };
    }

    // Helper to identify Super Admin accounts (which must be EXCLUDED from active tenant analytics)
    function isSuperAdminAccount(u) {
        if (!u) return false;
        const role = String(u.role || '').toUpperCase();
        const email = String(u.email || u.ownerEmail || '').toLowerCase();
        const uid = String(u.id || u.uid || '').toLowerCase();

        if (role === 'SUPER_ADMIN' || u.isSuperAdmin === true || u.superAdmin === true) return true;
        if (email === 'digibizsystemlk@gmail.com' || email === 'biz.sirimal@gmail.com' || email.includes('admin@digibiz') || email.includes('sirimal')) return true;
        if (uid.includes('sirimal')) return true;
        return false;
    }

    // Helper to identify Test/Demo/Sample accounts (which must be EXCLUDED from real business metrics & leads)
    function isTestAccount(u) {
        if (!u) return false;
        const email = String(u.email || '').toLowerCase();
        const name = String(u.name || u.displayName || u.ownerName || '').toLowerCase();
        const bizName = String(u.businessName || u.name || '').toLowerCase();
        const uid = String(u.id || '').toLowerCase();

        if (email.includes('test') || email.includes('demo') || email.includes('sample') || email.includes('dummy') || email.includes('temp') || email.includes('fake')) return true;
        if (name.includes('test') || name.includes('demo') || name.includes('sample') || name.includes('dummy')) return true;
        if (bizName.includes('test') || bizName.includes('demo') || bizName.includes('sample') || bizName.includes('dummy')) return true;
        if (uid.includes('test') || uid.includes('demo')) return true;

        return false;
    }

    // Active Accounts Trend Chart Instance & Global Active User Data Cache
    let activeTrendChartInstance = null;
    const periodActiveUsersCache = {
        onlineNow: [],
        today: [],
        yesterday: [],
        week: [],
        month: [],
        paidPro: [],
        freeTrial: [],
        highIntent: [],
        testToday: []
    };
    let currentModalUserList = [];

    async function loadActiveAccountsMetrics() {
        const onlineRightNowEl = document.getElementById('actOnlineRightNow');
        const todayEl = document.getElementById('actToday');
        const yestEl = document.getElementById('actYesterday');
        const weekEl = document.getElementById('actWeek');
        const monthEl = document.getElementById('actMonth');
        if (!todayEl || !yestEl || !weekEl || !monthEl) return;

        const formatSldateKey = (d) => {
            const dateObj = (d && d.toDate) ? d.toDate() : (d ? new Date(d) : null);
            if (!dateObj || Number.isNaN(dateObj.getTime())) return null;
            return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(dateObj);
        };

        const nowSl = new Date();
        const todayStr = formatSldateKey(nowSl);
        const yestObj = new Date(nowSl.getTime() - 24 * 60 * 60 * 1000);
        const yestStr = formatSldateKey(yestObj);

        const weekStartObj = new Date(nowSl.getTime() - 6 * 24 * 60 * 60 * 1000);
        const weekStartStr = formatSldateKey(weekStartObj);

        const currentYear = nowSl.getFullYear();
        const currentMonth = nowSl.getMonth();
        const monthStartStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-01`;

        const last30Days = [];
        for (let i = 29; i >= 0; i--) {
            const dt = new Date(nowSl.getTime() - i * 24 * 60 * 60 * 1000);
            const key = formatSldateKey(dt);
            if (key) last30Days.push(key);
        }

        const dailyActiveUsersMap = new Map();
        last30Days.forEach((dt) => dailyActiveUsersMap.set(dt, new Set()));

        const onlineNowCutoff = Date.now() - 15 * 60 * 1000; // active in last 15 mins
        const onlineUsersSet = new Set();
        const userLatestActivityMap = new Map();

        const userVisitDaysMap = new Map();
        const userOpDaysMap = new Map();
        const userOpActionsMap = new Map();

        const tenantUsersMap = new Map();
        const tenantBusinessesMap = new Map();

        const tenantSubscriptionsMap = new Map();
        const tenantSettingsMap = new Map();

        // Safe Firestore Collection Fetcher to prevent query/index errors from crashing metrics
        const safeFetchDocs = async (collName) => {
            try {
                const snap = await window.db.collection(collName).limit(1000).get();
                return snap ? (snap.docs || []) : [];
            } catch (_err) {
                console.warn(`[Active Metrics] ${collName} fetch skipped:`, _err);
                return [];
            }
        };

        // 1. Fetch businesses, subscriptions, settings & users safely in parallel
        try {
            const [bizDocs, subDocs, settingsDocs, userDocs] = await Promise.all([
                safeFetchDocs('businesses'),
                safeFetchDocs('subscriptions'),
                safeFetchDocs('settings'),
                safeFetchDocs('users')
            ]);

            bizDocs.forEach((d) => {
                const b = { id: d.id, ...(d.data() || {}) };
                if (!isSuperAdminAccount(b)) {
                    tenantBusinessesMap.set(d.id, b);
                    tenantBusinessesMap.set(d.id.toLowerCase(), b);
                    if (b.ownerUid) tenantBusinessesMap.set(b.ownerUid, b);
                    if (b.ownerUid) tenantBusinessesMap.set(String(b.ownerUid).toLowerCase(), b);
                    if (b.ownerEmail) tenantBusinessesMap.set(String(b.ownerEmail).toLowerCase(), b);
                    if (b.email) tenantBusinessesMap.set(String(b.email).toLowerCase(), b);
                }
            });

            subDocs.forEach((d) => {
                tenantSubscriptionsMap.set(d.id, d.data() || {});
                tenantSubscriptionsMap.set(d.id.toLowerCase(), d.data() || {});
            });

            settingsDocs.forEach((d) => {
                tenantSettingsMap.set(d.id, d.data() || {});
                tenantSettingsMap.set(d.id.toLowerCase(), d.data() || {});
            });

            userDocs.forEach((d) => {
                const u = { id: d.id, ...(d.data() || {}) };
                if (!isSuperAdminAccount(u)) {
                    tenantUsersMap.set(d.id, u);
                    tenantUsersMap.set(d.id.toLowerCase(), u);
                    if (u.email) tenantUsersMap.set(String(u.email).toLowerCase(), u);
                    if (u.businessId) tenantUsersMap.set(u.businessId, u);
                    if (u.businessId) tenantUsersMap.set(String(u.businessId).toLowerCase(), u);
                }
            });
        } catch (eInit) {
            console.warn('[Active Metrics] Parallel init fetch warning:', eInit);
        }

        const addActivity = (userIdentifier, dateVal, activityType = 'op') => {
            if (!userIdentifier) return;
            const strId = String(userIdentifier).trim();
            const lowerId = strId.toLowerCase();

            // EXCLUDE SUPER ADMIN LOGINS FROM ALL METRICS
            const userObj = tenantUsersMap.get(strId) || tenantUsersMap.get(lowerId);
            const bizObj = tenantBusinessesMap.get(strId) || tenantBusinessesMap.get(lowerId);
            if ((userObj && isSuperAdminAccount(userObj)) || (bizObj && isSuperAdminAccount(bizObj))) return;
            if (lowerId === 'digibizsystemlk@gmail.com' || lowerId === 'biz.sirimal@gmail.com' || lowerId.includes('sirimal') || lowerId.includes('super_admin')) return;

            const dtKey = formatSldateKey(dateVal);
            if (!dtKey) return;

            // Alias mapping so UID, email, and businessId ALL link together for this date
            const aliases = new Set([strId, lowerId]);
            if (userObj) {
                if (userObj.id) { aliases.add(userObj.id); aliases.add(String(userObj.id).toLowerCase()); }
                if (userObj.email) { aliases.add(userObj.email); aliases.add(String(userObj.email).toLowerCase()); }
                if (userObj.businessId) { aliases.add(userObj.businessId); aliases.add(String(userObj.businessId).toLowerCase()); }
            }
            if (bizObj) {
                if (bizObj.id) { aliases.add(bizObj.id); aliases.add(String(bizObj.id).toLowerCase()); }
                if (bizObj.ownerUid) { aliases.add(bizObj.ownerUid); aliases.add(String(bizObj.ownerUid).toLowerCase()); }
                if (bizObj.ownerEmail) { aliases.add(bizObj.ownerEmail); aliases.add(String(bizObj.ownerEmail).toLowerCase()); }
            }

            if (dailyActiveUsersMap.has(dtKey)) {
                const daySet = dailyActiveUsersMap.get(dtKey);
                aliases.forEach((a) => daySet.add(a));
            }

            aliases.forEach((a) => {
                if (activityType === 'visit') {
                    if (!userVisitDaysMap.has(a)) userVisitDaysMap.set(a, new Set());
                    if (dtKey >= weekStartStr && dtKey <= todayStr) userVisitDaysMap.get(a).add(dtKey);
                } else {
                    if (!userOpDaysMap.has(a)) userOpDaysMap.set(a, new Set());
                    if (dtKey >= weekStartStr && dtKey <= todayStr) userOpDaysMap.get(a).add(dtKey);
                    userOpActionsMap.set(a, (userOpActionsMap.get(a) || 0) + 1);
                }
            });

            const dateObj = (dateVal && dateVal.toDate) ? dateVal.toDate() : (dateVal ? new Date(dateVal) : null);
            if (dateObj && !isNaN(dateObj.getTime())) {
                aliases.forEach((a) => {
                    const existingLast = userLatestActivityMap.get(a);
                    if (!existingLast || dateObj.getTime() > existingLast.getTime()) {
                        userLatestActivityMap.set(a, dateObj);
                    }
                });
                if (dateObj.getTime() >= onlineNowCutoff) {
                    aliases.forEach((a) => onlineUsersSet.add(a));
                }
            }
        };

        // Scan users activities (App visits & page logins)
        tenantUsersMap.forEach((u) => {
            const uid = u.id || u.email;
            if (u.lastActiveAt) addActivity(uid, u.lastActiveAt, 'visit');
            if (u.lastLoginAt) addActivity(uid, u.lastLoginAt, 'visit');
            if (u.updatedAt) addActivity(uid, u.updatedAt, 'visit');
            if (u.createdAt) addActivity(uid, u.createdAt, 'visit');

            if (Array.isArray(u.activeDates)) {
                u.activeDates.forEach((dStr) => addActivity(uid, dStr, 'visit'));
            }
            if (Array.isArray(u.loginHistory)) {
                u.loginHistory.forEach((ts) => addActivity(uid, ts, 'visit'));
            }
        });

        // Scan audit_logs and key business module collections in parallel for operational system actions
        try {
            const [auditDocs, invDocs, salesDocs, attDocs, expDocs, grnDocs] = await Promise.all([
                safeFetchDocs('audit_logs'),
                safeFetchDocs('invoices'),
                safeFetchDocs('sales'),
                safeFetchDocs('attendance_logs'),
                safeFetchDocs('expenses'),
                safeFetchDocs('grns')
            ]);

            const processCollectionDocs = (docs, idFields, timeFields) => {
                if (!docs || !Array.isArray(docs)) return;
                docs.forEach((doc) => {
                    const data = doc.data() || {};
                    let targetId = null;
                    for (const f of idFields) {
                        if (data[f]) { targetId = data[f]; break; }
                    }
                    let targetTs = null;
                    for (const tf of timeFields) {
                        if (data[tf]) { targetTs = data[tf]; break; }
                    }
                    if (targetId && targetTs) {
                        addActivity(targetId, targetTs, 'op');
                    }
                });
            };

            processCollectionDocs(auditDocs, ['performedByUid', 'performedByEmail', 'businessId', 'userId'], ['timestamp', 'createdAt', 'date']);
            processCollectionDocs(invDocs, ['businessId', 'createdBy', 'userId'], ['createdAt', 'date', 'timestamp']);
            processCollectionDocs(salesDocs, ['businessId', 'createdBy', 'userId'], ['createdAt', 'date', 'timestamp']);
            processCollectionDocs(attDocs, ['businessId', 'employeeId', 'userId'], ['timestamp', 'date', 'createdAt']);
            processCollectionDocs(expDocs, ['businessId', 'createdBy', 'userId'], ['createdAt', 'date', 'timestamp']);
            processCollectionDocs(grnDocs, ['businessId', 'createdBy', 'userId'], ['createdAt', 'date', 'timestamp']);
        } catch (e) {
            console.warn('[Active Metrics] Multi-collection scan warning:', e);
        }

        const todayUsersSet = dailyActiveUsersMap.get(todayStr) || new Set();
        const yestUsersSet = dailyActiveUsersMap.get(yestStr) || new Set();

        const weekUsersSet = new Set();
        const monthUsersSet = new Set();

        dailyActiveUsersMap.forEach((userSet, dateKey) => {
            if (dateKey >= weekStartStr && dateKey <= todayStr) {
                userSet.forEach((u) => weekUsersSet.add(u));
            }
            if (dateKey >= monthStartStr && dateKey <= todayStr) {
                userSet.forEach((u) => monthUsersSet.add(u));
            }
        });

        const resolveUserAndBusiness = (idKey) => {
            if (!idKey) return null;
            const strKey = String(idKey).trim();
            const lowerKey = strKey.toLowerCase();

            // Step 1: Find user object if available
            let userObj = tenantUsersMap.get(strKey) || tenantUsersMap.get(lowerKey);

            // Step 2: Find business object if available
            let bizObj = tenantBusinessesMap.get(strKey) || tenantBusinessesMap.get(lowerKey);
            if (userObj && userObj.businessId && !bizObj) {
                bizObj = tenantBusinessesMap.get(userObj.businessId) || tenantBusinessesMap.get(String(userObj.businessId).toLowerCase());
            }

            // Step 3: If userObj wasn't found but bizObj was found, find linked user
            if (!userObj && bizObj) {
                userObj = tenantUsersMap.get(bizObj.id) || tenantUsersMap.get(String(bizObj.id).toLowerCase()) ||
                          tenantUsersMap.get(bizObj.ownerUid) || tenantUsersMap.get(String(bizObj.ownerUid || '').toLowerCase()) ||
                          tenantUsersMap.get(String(bizObj.ownerEmail || '').toLowerCase());
            }

            // EXCLUDE Super Admin accounts
            if (isSuperAdminAccount(userObj) || isSuperAdminAccount(bizObj) || lowerKey.includes('digibizsystemlk') || lowerKey.includes('biz.sirimal@gmail.com') || lowerKey.includes('sirimal')) return null;

            // Check if Test/Demo account
            const isTest = isTestAccount(userObj) || isTestAccount(bizObj) || lowerKey.includes('test') || lowerKey.includes('demo') || lowerKey.includes('sample');

            // Extract resolved email with smart fallback
            let email = (userObj && userObj.email) || (bizObj && (bizObj.ownerEmail || bizObj.email || bizObj.contactEmail)) || '';

            if (!email || !email.includes('@')) {
                if (userObj && userObj.id) {
                    email = `user_${userObj.id.slice(0, 8)}@digibiz.lk`;
                } else if (bizObj && bizObj.id) {
                    email = `biz_${bizObj.id.slice(0, 8)}@digibiz.lk`;
                } else {
                    email = `account_${strKey.slice(0, 8)}@digibiz.lk`;
                }
            }

            const businessName = (bizObj && bizObj.name) || (userObj && (userObj.businessName || userObj.name)) || 'DIGIBIZ Client Business';
            const businessType = formatBusinessTypeName((bizObj && bizObj.businessType) || (userObj && userObj.businessType) || 'general');
            const ownerName = (userObj && (userObj.displayName || userObj.name || userObj.ownerName)) || (bizObj && (bizObj.ownerName || bizObj.contactName)) || 'Business Owner';
            const phone = (userObj && (userObj.phoneNumber || userObj.phone)) || (bizObj && (bizObj.phone || bizObj.contactPhone)) || 'N/A';
            const uid = (userObj && userObj.id) || (bizObj && (bizObj.ownerUid || bizObj.id)) || strKey;

            // Extract Plan & Subscription Status
            const bizId = (bizObj && bizObj.id) || (userObj && userObj.businessId) || uid;
            const subObj = tenantSubscriptionsMap.get(bizId) || tenantSubscriptionsMap.get(String(bizId).toLowerCase()) || {};
            const settObj = tenantSettingsMap.get(bizId) || tenantSettingsMap.get(String(bizId).toLowerCase()) || {};
            const subInfo = settObj.subscription || subObj || {};

            const isPro = Boolean(
                (subObj.plan && (subObj.plan === 'PRO' || subObj.plan === 'PAID' || subObj.plan === 'ENTERPRISE')) ||
                (subInfo.plan && (subInfo.plan === 'PRO' || subInfo.plan === 'PAID' || subInfo.plan === 'ENTERPRISE')) ||
                (userObj && (userObj.isPro === true || userObj.plan === 'PRO' || userObj.subscriptionPlan === 'PRO')) ||
                (bizObj && (bizObj.isPro === true || bizObj.plan === 'PRO' || bizObj.subscriptionPlan === 'PRO'))
            );

            // Calculate 7-day access frequency across all aliases
            let active7DayCount = 0;
            last30Days.slice(-7).forEach((dtKey) => {
                const userSet = dailyActiveUsersMap.get(dtKey);
                if (userSet && (
                    userSet.has(strKey) ||
                    userSet.has(lowerKey) ||
                    userSet.has(uid) ||
                    userSet.has(String(uid).toLowerCase()) ||
                    userSet.has(email.toLowerCase()) ||
                    (bizId && userSet.has(bizId)) ||
                    (bizId && userSet.has(String(bizId).toLowerCase()))
                )) {
                    active7DayCount++;
                }
            });

            // Extract App Visits vs System Operations breakdown
            const visitDaysSet = userVisitDaysMap.get(strKey) || userVisitDaysMap.get(lowerKey) || userVisitDaysMap.get(uid.toLowerCase()) || userVisitDaysMap.get(email.toLowerCase()) || new Set();
            const opDaysSet = userOpDaysMap.get(strKey) || userOpDaysMap.get(lowerKey) || userOpDaysMap.get(uid.toLowerCase()) || userOpDaysMap.get(email.toLowerCase()) || new Set();
            const opTotalActions = userOpActionsMap.get(strKey) || userOpActionsMap.get(lowerKey) || userOpActionsMap.get(uid.toLowerCase()) || userOpActionsMap.get(email.toLowerCase()) || 0;

            const visitDaysCount = visitDaysSet.size;
            const opDaysCount = opDaysSet.size;

            // High Conversion Intent: Free user visiting 2 or more days in the last week (and NOT a test account)
            const isHighIntent = !isPro && !isTest && (active7DayCount >= 2 || visitDaysCount >= 2 || opDaysCount >= 2);

            return {
                uid,
                email,
                ownerName,
                businessName,
                businessType,
                phone,
                bizId,
                isPro,
                isTest,
                planName: isPro ? 'PRO ACTIVE' : (isTest ? 'TEST / DEMO' : (subInfo.plan || 'FREE / TRIAL')),
                active7DayCount: Math.max(active7DayCount, visitDaysCount, opDaysCount),
                visitDaysCount,
                opDaysCount,
                opTotalActions,
                isHighIntent
            };
        };

        // Build active user detail lists for modal popups (with test filtering options)
        const buildUserList = (idSet, options = {}) => {
            const list = [];
            const processedSet = new Set();

            if (!idSet || idSet.size === 0) return list;

            idSet.forEach((idKey) => {
                const resolved = resolveUserAndBusiness(idKey);
                if (!resolved) return;

                // Option: Include ONLY test accounts vs EXCLUDE test accounts
                if (options.includeTestOnly) {
                    if (!resolved.isTest) return;
                } else if (options.excludeTest !== false) {
                    if (resolved.isTest) return;
                }

                const uniqueKey = resolved.email.toLowerCase();
                if (processedSet.has(uniqueKey)) return;
                processedSet.add(uniqueKey);

                const lastDt = userLatestActivityMap.get(String(idKey).toLowerCase()) || userLatestActivityMap.get(resolved.uid.toLowerCase()) || userLatestActivityMap.get(resolved.email.toLowerCase());

                list.push({
                    ...resolved,
                    lastActivityStr: formatTimestamp(lastDt),
                    lastActivityTime: lastDt ? lastDt.getTime() : 0
                });
            });

            return list.sort((a, b) => b.lastActivityTime - a.lastActivityTime);
        };

        // Build real business client user lists (excluding test accounts)
        periodActiveUsersCache.onlineNow = buildUserList(onlineUsersSet, { excludeTest: true });
        periodActiveUsersCache.today = buildUserList(todayUsersSet, { excludeTest: true });
        periodActiveUsersCache.yesterday = buildUserList(yestUsersSet, { excludeTest: true });
        periodActiveUsersCache.week = buildUserList(weekUsersSet, { excludeTest: true });
        periodActiveUsersCache.month = buildUserList(monthUsersSet, { excludeTest: true });

        // Subscription & Conversion Lead Intelligence caches (excluding test accounts)
        const monthList = periodActiveUsersCache.month;
        periodActiveUsersCache.paidPro = monthList.filter(u => u.isPro && !u.isTest);
        periodActiveUsersCache.freeTrial = monthList.filter(u => !u.isPro && !u.isTest);
        periodActiveUsersCache.highIntent = monthList.filter(u => u.isHighIntent && !u.isTest);

        // Test Accounts active today cache
        periodActiveUsersCache.testToday = buildUserList(todayUsersSet, { includeTestOnly: true });

        if (onlineRightNowEl) onlineRightNowEl.textContent = String(periodActiveUsersCache.onlineNow.length);
        todayEl.textContent = String(periodActiveUsersCache.today.length);
        yestEl.textContent = String(periodActiveUsersCache.yesterday.length);
        weekEl.textContent = String(periodActiveUsersCache.week.length);
        monthEl.textContent = String(periodActiveUsersCache.month.length);

        const actPaidProCountEl = document.getElementById('actPaidProCount');
        const actFreeTrialCountEl = document.getElementById('actFreeTrialCount');
        const actHighIntentCountEl = document.getElementById('actHighIntentCount');
        const actTestTodayCountEl = document.getElementById('actTestTodayCount');

        if (actPaidProCountEl) actPaidProCountEl.textContent = String(periodActiveUsersCache.paidPro.length);
        if (actFreeTrialCountEl) actFreeTrialCountEl.textContent = String(periodActiveUsersCache.freeTrial.length);
        if (actHighIntentCountEl) actHighIntentCountEl.textContent = String(periodActiveUsersCache.highIntent.length);
        if (actTestTodayCountEl) actTestTodayCountEl.textContent = String(periodActiveUsersCache.testToday.length);

        const chartLabels = last30Days.map((d) => {
            const parts = d.split('-');
            return `${parts[1]}/${parts[2]}`;
        });

        // 30-Day Active Accounts Trend line excluding test & demo accounts
        const chartData = last30Days.map((d) => {
            const userSet = dailyActiveUsersMap.get(d) || new Set();
            return buildUserList(userSet, { excludeTest: true }).length;
        });

        const canvas = document.getElementById('activeTrendChart');
        if (canvas && window.Chart) {
            if (activeTrendChartInstance) {
                activeTrendChartInstance.destroy();
            }
            const ctx = canvas.getContext('2d');
            activeTrendChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: chartLabels,
                    datasets: [{
                        label: 'Real Client Daily Active Accounts',
                        data: chartData,
                        borderColor: '#0ea5e9',
                        backgroundColor: 'rgba(14, 165, 233, 0.12)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.35,
                        pointBackgroundColor: '#0284c7',
                        pointRadius: 4,
                        pointHoverRadius: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.parsed.y} Real Active Client Account(s)`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10 } } }
                    }
                }
            });
        }
    }

    // Modal popup helper for displaying active user lists
    function openActiveUsersModal(title, subtitle, userList) {
        const modal = document.getElementById('activeUsersModal');
        const titleEl = document.getElementById('activeModalTitle');
        const subTitleEl = document.getElementById('activeModalSubtitle');
        const searchInput = document.getElementById('activeModalSearch');
        if (!modal) return;

        titleEl.textContent = title;
        subTitleEl.textContent = subtitle;
        currentModalUserList = userList || [];
        if (searchInput) searchInput.value = '';

        renderActiveModalUsersList(currentModalUserList);
        modal.style.display = 'flex';
    }

    function renderActiveModalUsersList(list) {
        const container = document.getElementById('activeModalUsersContainer');
        const countBadge = document.getElementById('activeModalCountBadge');
        if (!container) return;

        if (countBadge) countBadge.textContent = `${list.length} Account(s)`;

        if (!list || list.length === 0) {
            container.innerHTML = `
                <div style="background:#ffffff; padding:32px; text-align:center; border-radius:14px; border:1px solid #cbd5e1;">
                    <div style="font-size:38px; margin-bottom:8px;">📭</div>
                    <div style="font-size:15px; font-weight:700; color:#475569;">මෙම කාණ්ඩය තුළ ගිණුම් නැත (No Matching Accounts)</div>
                    <div style="font-size:12px; color:#94a3b8; margin-top:4px;">No client user records match this category.</div>
                </div>
            `;
            return;
        }

        const safeStr = (val) => {
            if (!val) return '';
            return String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        };

        container.innerHTML = list.map((item) => {
            let planBadgeHtml = '';
            if (item.isTest) {
                planBadgeHtml = `<span style="background:#f1f5f9; color:#475569; font-size:11px; font-weight:800; padding:3px 10px; border-radius:12px; border:1px solid #cbd5e1;">🧪 TEST / DEMO</span>`;
            } else if (item.isPro) {
                planBadgeHtml = `<span style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:800; padding:3px 10px; border-radius:12px; border:1px solid #86efac;">💎 PRO ACTIVE</span>`;
            } else if (item.isHighIntent) {
                planBadgeHtml = `<span style="background:#fee2e2; color:#dc2626; font-size:11px; font-weight:800; padding:3px 10px; border-radius:12px; border:1px solid #fca5a5;">🔥 HIGH-INTENT LEAD (${item.active7DayCount}/7 Days Active)</span>`;
            } else {
                planBadgeHtml = `<span style="background:#fef3c7; color:#b45309; font-size:11px; font-weight:800; padding:3px 10px; border-radius:12px; border:1px solid #fde68a;">🎁 FREE / TRIAL</span>`;
            }

            let hotLeadNoticeHtml = '';
            if (item.isHighIntent && !item.isTest) {
                hotLeadNoticeHtml = `
                    <div style="background:#fff7ed; border:1px solid #ffedd5; color:#c2410c; padding:8px 12px; border-radius:8px; font-size:12px; font-weight:600; margin-top:10px; display:flex; align-items:center; gap:6px;">
                        <span>💡</span>
                        <span><strong>Super Admin Lead Opportunity:</strong> මෙම පාරිභෝගිකයා නොමිලේ පද්ධතිය දිනපතා සක්‍රීයව භාවිත කරයි (${item.active7DayCount}/7 Days). ඍජුවම කතා කර Pro Plan එක ලබාදීමට වඩාත්ම සුදුසු අයෙකි.</span>
                    </div>
                `;
            }

            const activitySummaryHtml = `
                <div style="display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; font-size:12px;">
                    <span style="background:#f0f9ff; color:#0369a1; font-weight:700; padding:4px 10px; border-radius:8px; border:1px solid #bae6fd;" title="App/Page login visits recorded in past 7 days">
                        🌐 App Visits: <strong>${item.visitDaysCount}/7 Days</strong>
                    </span>
                    <span style="background:#f0fdf4; color:#15803d; font-weight:700; padding:4px 10px; border-radius:8px; border:1px solid #bbf7d0;" title="System transactions and operational actions recorded in past 7 days">
                        ⚡ System Operations: <strong>${item.opTotalActions} Actions (${item.opDaysCount}/7 Days)</strong>
                    </span>
                </div>
            `;

            return `
                <div class="active-user-item-card" style="background:#ffffff; border-radius:14px; padding:18px 20px; border:${item.isHighIntent ? '2px solid #f97316' : '1px solid #e2e8f0'}; box-shadow:0 2px 10px rgba(0,0,0,0.05); display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:12px;">
                        <div style="flex-grow:1; min-width:240px;">
                            <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                                <h4 style="margin:0; font-size:16px; font-weight:800; color:#0f172a;">🏢 ${safeStr(item.businessName)}</h4>
                                <span style="background:#e0f2fe; color:#0284c7; font-size:11px; font-weight:700; padding:2px 8px; border-radius:10px;">${safeStr(item.businessType)}</span>
                                ${planBadgeHtml}
                            </div>
                            <div style="font-size:13px; font-weight:600; color:#334155; margin-bottom:4px;">
                                👤 Owner: <strong>${safeStr(item.ownerName)}</strong> &nbsp;|&nbsp; 📧 Email: <a href="mailto:${safeStr(item.email)}" style="color:#0284c7; text-decoration:none; font-weight:700;">${safeStr(item.email)}</a>
                            </div>
                            <div style="font-size:12px; color:#64748b;">
                                📞 Phone: <a href="tel:${safeStr(item.phone)}" style="color:#0f172a; font-weight:700; text-decoration:none;">${safeStr(item.phone)}</a> &nbsp;|&nbsp; 🆔 UID: <code style="font-size:11px; background:#f1f5f9; padding:2px 6px; border-radius:4px;">${safeStr(item.uid)}</code>
                            </div>
                            ${activitySummaryHtml}
                        </div>
                        <div style="text-align:right; min-width:180px;">
                            <div style="font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;">⏱️ Last Activity</div>
                            <div style="font-size:12px; font-weight:700; color:#10b981; margin-top:2px;">${safeStr(item.lastActivityStr)}</div>
                            <div style="display:flex; gap:6px; justify-content:flex-end; margin-top:8px;">
                                <button class="quick-impersonate-btn" data-email="${safeStr(item.email)}" data-bizid="${safeStr(item.bizId)}" data-type="${safeStr(item.businessType)}" style="background:#d97706; color:#ffffff; border:none; padding:7px 12px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;" type="button">🔑 Log in</button>
                                <button class="inspect-user-btn" data-email="${safeStr(item.email)}" style="background:#0284c7; color:#ffffff; border:none; padding:7px 12px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;" type="button">🔍 Inspect</button>
                                <button class="quick-pro-btn" data-email="${safeStr(item.email)}" style="background:#10b981; color:#ffffff; border:none; padding:7px 12px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;" type="button">⭐ Give Pro</button>
                                <button class="quick-wipe-btn" data-email="${safeStr(item.email)}" style="background:#dc2626; color:#ffffff; border:none; padding:7px 12px; border-radius:8px; font-size:11.5px; font-weight:700; cursor:pointer;" type="button">🗑️ Wipe</button>
                            </div>
                        </div>
                    </div>
                    ${hotLeadNoticeHtml}
                </div>
            `;
        }).join('');

        container.querySelectorAll('.quick-wipe-btn').forEach((btn) => {
            btn.onclick = () => {
                wipeUserAccount(btn.dataset.email);
            };
        });

        container.querySelectorAll('.quick-impersonate-btn').forEach((btn) => {
            btn.onclick = () => {
                const targetEmail = btn.dataset.email;
                const targetBizId = btn.dataset.bizid;
                const targetBizType = btn.dataset.type;
                impersonateClientAccount(targetEmail, targetBizId, targetBizType);
            };
        });

        container.querySelectorAll('.inspect-user-btn').forEach((btn) => {
            btn.onclick = () => {
                const targetEmail = btn.dataset.email;
                const modal = document.getElementById('activeUsersModal');
                if (modal) modal.style.display = 'none';
                if (emailSearch) {
                    emailSearch.value = targetEmail;
                    const searchBtn = document.getElementById('search-btn');
                    if (searchBtn) searchBtn.click();
                }
            };
        });

        container.querySelectorAll('.quick-pro-btn').forEach((btn) => {
            btn.onclick = async () => {
                const targetEmail = btn.dataset.email;
                if (!confirm(`⭐ Grant 30 Days Pro Plan to "${targetEmail}"?`)) return;
                const modal = document.getElementById('activeUsersModal');
                if (modal) modal.style.display = 'none';
                if (emailSearch) {
                    emailSearch.value = targetEmail;
                    const searchBtn = document.getElementById('search-btn');
                    if (searchBtn) await searchBtn.click();
                    const extendProBtn = document.getElementById('extend-pro-btn');
                    if (extendProBtn) extendProBtn.click();
                }
            };
        });
    }

// Initialize Super Admin Floating Impersonation Banner across all PWA pages
(function initSuperAdminImpersonationBanner() {
    if (localStorage.getItem('digibiz_impersonate_active') === 'true') {
        const targetEmail = localStorage.getItem('digibiz_impersonate_email') || 'Client Business';
        const targetType = localStorage.getItem('digibiz_impersonate_type') || 'PWA App';

        const existingBanner = document.getElementById('super-admin-impersonation-banner');
        if (existingBanner) return;

        const banner = document.createElement('div');
        banner.id = 'super-admin-impersonation-banner';
        banner.style.cssText = 'position:fixed; top:0; left:0; width:100%; z-index:999999; background:linear-gradient(90deg, #d97706 0%, #b45309 100%); color:#ffffff; font-family:-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding:8px 16px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 15px rgba(0,0,0,0.35); font-size:13px; font-weight:700; box-sizing:border-box;';

        banner.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <span style="background:#fef3c7; color:#b45309; padding:2px 8px; border-radius:6px; font-size:11px; font-weight:800;">👑 SUPER ADMIN IMPERSONATION</span>
                <span>Viewing Live Client: <strong>${targetEmail}</strong> (${targetType})</span>
            </div>
            <button id="exit-impersonation-btn" style="background:#ffffff; color:#b45309; border:none; padding:5px 14px; border-radius:6px; font-size:12px; font-weight:800; cursor:pointer; box-shadow:0 2px 6px rgba(0,0,0,0.2);" type="button">
                🔙 Exit to Admin Console
            </button>
        `;

        document.body.prepend(banner);
        document.body.style.marginTop = '42px';

        const exitBtn = document.getElementById('exit-impersonation-btn');
        if (exitBtn) {
            exitBtn.onclick = () => {
                localStorage.removeItem('digibiz_impersonate_active');
                localStorage.removeItem('digibiz_impersonate_email');
                localStorage.removeItem('digibiz_impersonate_biz_id');
                localStorage.removeItem('digibiz_impersonate_type');
                window.location.href = '/admin/business-management.html';
            };
        }
    }
})();

    // Modal search listener
    const activeModalSearch = document.getElementById('activeModalSearch');
    if (activeModalSearch) {
        activeModalSearch.addEventListener('input', () => {
            const q = activeModalSearch.value.trim().toLowerCase();
            if (!q) {
                renderActiveModalUsersList(currentModalUserList);
                return;
            }
            const filtered = currentModalUserList.filter((item) =>
                item.email.toLowerCase().includes(q) ||
                item.ownerName.toLowerCase().includes(q) ||
                item.businessName.toLowerCase().includes(q) ||
                item.phone.toLowerCase().includes(q) ||
                item.uid.toLowerCase().includes(q)
            );
            renderActiveModalUsersList(filtered);
        });
    }

    // Modal close listeners
    const btnCloseActiveModal = document.getElementById('btnCloseActiveModal');
    if (btnCloseActiveModal) {
        btnCloseActiveModal.onclick = () => {
            const modal = document.getElementById('activeUsersModal');
            if (modal) modal.style.display = 'none';
        };
    }
    const activeUsersModal = document.getElementById('activeUsersModal');
    if (activeUsersModal) {
        activeUsersModal.onclick = (e) => {
            if (e.target === activeUsersModal) activeUsersModal.style.display = 'none';
        };
    }

    // Bind card click listeners for basic periods
    const cardOnlineRightNow = document.getElementById('cardOnlineRightNow');
    if (cardOnlineRightNow) {
        cardOnlineRightNow.onclick = () => openActiveUsersModal('🟢 Online Now (මෙම මොහොතේ සක්‍රීය පරිශීලකයින්)', 'Client accounts active in system within the last 15 minutes', periodActiveUsersCache.onlineNow);
    }
    const cardToday = document.getElementById('cardToday');
    if (cardToday) {
        cardToday.onclick = () => openActiveUsersModal('🌞 Today Active Client Accounts (අද සක්‍රීය වූ ගිණුම්)', 'Unique client accounts active today', periodActiveUsersCache.today);
    }
    const cardYesterday = document.getElementById('cardYesterday');
    if (cardYesterday) {
        cardYesterday.onclick = () => openActiveUsersModal('🌙 Yesterday Active Client Accounts (ඊයේ සක්‍රීය වූ ගිණුම්)', 'Unique client accounts active yesterday', periodActiveUsersCache.yesterday);
    }
    const cardWeek = document.getElementById('cardWeek');
    if (cardWeek) {
        cardWeek.onclick = () => openActiveUsersModal('📅 This Week Active Client Accounts (මේ සතියේ සක්‍රීය වූ ගිණුම්)', 'Unique client accounts active this week', periodActiveUsersCache.week);
    }
    const cardMonth = document.getElementById('cardMonth');
    if (cardMonth) {
        cardMonth.onclick = () => openActiveUsersModal('🗓️ This Month Active Client Accounts (මේ මාසයේ සක්‍රීය වූ ගිණුම්)', 'Unique client accounts active this month', periodActiveUsersCache.month);
    }

    // Bind card click listeners for Subscription & Conversion Intelligence
    const cardPaidPro = document.getElementById('cardPaidPro');
    if (cardPaidPro) {
        cardPaidPro.onclick = () => openActiveUsersModal('💎 Active Paid / Pro Clients (ගෙවන ලද සක්‍රීය ගිණුම්)', 'List of active client businesses currently on Pro subscription plans', periodActiveUsersCache.paidPro);
    }
    const cardFreeTrial = document.getElementById('cardFreeTrial');
    if (cardFreeTrial) {
        cardFreeTrial.onclick = () => openActiveUsersModal('🎁 Active Free / Trial Clients (නොමිලේ සක්‍රීය ගිණුම්)', 'List of active client businesses currently on Free or Trial plans', periodActiveUsersCache.freeTrial);
    }
    const cardHighIntentLeads = document.getElementById('cardHighIntentLeads');
    if (cardHighIntentLeads) {
        cardHighIntentLeads.onclick = () => openActiveUsersModal('🔥 High Conversion Potential Leads (Pro සඳහා සූදානම් නොමිලේ ගිණුම්)', 'Daily active free users getting high value - contact them to offer Pro upgrade!', periodActiveUsersCache.highIntent);
    }
    const cardTestAccounts = document.getElementById('cardTestAccounts');
    if (cardTestAccounts) {
        cardTestAccounts.onclick = () => openActiveUsersModal('🧪 Test & Demo Accounts Active Today (අද පැමිණි ටෙස්ට් ගිණුම්)', 'List of test / demo accounts active today (Excluded from real business metrics & leads)', periodActiveUsersCache.testToday);
    }

    // Bind Search Bar visibility behavior: hide chart when search query is entered
    if (emailSearch) {
        emailSearch.addEventListener('input', () => {
            const query = emailSearch.value.trim();
            const analyticsWrapper = document.getElementById('active-analytics-wrapper');
            if (query.length > 0) {
                if (analyticsWrapper) analyticsWrapper.style.display = 'none';
            } else {
                if (analyticsWrapper) analyticsWrapper.style.display = 'block';
                if (businessDetails) businessDetails.style.display = 'none';
                if (deepDivePanel) deepDivePanel.style.display = 'none';
            }
        });
    }

    const refreshMetricsBtn = document.getElementById('btnRefreshActiveMetrics');
    if (refreshMetricsBtn) {
        refreshMetricsBtn.onclick = () => loadActiveAccountsMetrics();
    }

    // Auto load metrics on initialization
    loadActiveAccountsMetrics();
});
