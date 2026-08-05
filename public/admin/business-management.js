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
        document.getElementById('dd-sms-free').textContent = `${freeSms} Free Credits`;
        document.getElementById('dd-client-ver').textContent = 'DIGIBIZ PWA v2017';

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
            } catch (err) {
                console.error("Account deletion failed:", err);
                alert("Failed to delete account. Error: " + (err.message || err));
            } finally {
                deleteAccountBtn.disabled = false;
                deleteAccountBtn.textContent = '🗑️ Delete Entire Account & Data';
            }
        });
    }
});
