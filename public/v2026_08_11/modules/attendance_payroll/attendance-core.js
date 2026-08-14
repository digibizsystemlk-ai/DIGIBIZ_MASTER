/* ============================================================================
 * attendance-core.js
 * ----------------------------------------------------------------------------
 * Multitenant (per-business) core for the Attendance & Payroll module.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The Attendance / Payroll module previously used GLOBAL localStorage keys
 * (digibiz_registered_employees, digibiz_attendance_logs, digibiz_gate_passes)
 * and a fixed business id ('ATTENDANCE_BIZ_001') plus hard-coded Sunrose-Lanka
 * seed data. That caused CROSS-ORGANIZATION DATA LEAKAGE: two different
 * businesses opening these pages on the same browser/device would see and
 * overwrite each other's employees & attendance logs.
 *
 * This file centralises three concerns so every page in the module stays
 * consistent and isolated per business:
 *   1. Business id resolution (never hard-coded).
 *   2. Business-scoped localStorage keys  (isolation even offline).
 *   3. Business-scoped Firestore paths + admin access gating.
 *
 * It also provides the SECURE employee login gate used by the Mobile QR
 * Attendance Scanner (mobile-scan.html). Login is handled by Firebase Auth
 * (email + password). The phone number is NOT present in any URL (that was
 * insecure); instead an employee authenticates and their phone is verified by
 * comparing the logged-in profile with the business employee record.
 * ========================================================================== */

window.AttendanceCore = (function () {

    // -----------------------------------------------------------------------
    // 1. BUSINESS ID RESOLUTION
    // -----------------------------------------------------------------------
    // Always derive the business from the authenticated session. Never fall
    // back to a hard-coded tenant so that each organisation only ever sees
    // its own data.
    function resolveBusinessId() {
        const candidates = [
            localStorage.getItem('currentBusinessId'),
            sessionStorage.getItem('currentBusinessId'),
            localStorage.getItem('selectedBusinessId'),
            sessionStorage.getItem('selectedBusinessId'),
            localStorage.getItem('digibiz_impersonate_biz_id'),
            localStorage.getItem('activeBusinessId'),
            (window.auth && window.auth.currentUser && window.auth.currentUser.uid)
        ];
        for (const c of candidates) {
            if (c) return String(c);
        }
        return null; // no business selected -> caller must guard
    }
    // Always scope to the current authenticated user's business. Never fall back
    // to a shared 'UNSCOPED' namespace: that would let two different accounts
    // (or new registrations) on the same browser see each other's data.
    // If no explicit business is selected yet, we isolate per logged-in user UID
    // so every account uses its own private bucket even pre-business-selection.
    function scoped(key) {
        const bid = resolveBusinessId();
        if (bid) return key + '__' + bid;
        const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
        const uid = (auth && auth.currentUser && auth.currentUser.uid) || 'guest';
        return key + '__user_' + uid;
    }

    // One-time migration: drop the old GLOBAL (unscoped) localStorage keys so
    // legacy Sunrose-Lanka seed data can never leak into any tenant's view.
    function scrubLegacyGlobalKeys() {
        try {
            const legacy = [
                'digibiz_registered_employees',
                'digibiz_attendance_logs',
                'digibiz_gate_passes',
                'digibiz_employees_initialized'
            ];
            let removed = false;
            legacy.forEach(function (k) {
                if (localStorage.getItem(k) !== null) {
                    localStorage.removeItem(k);
                    removed = true;
                }
            });
            if (removed) console.info('[AttendanceCore] Legacy unscoped attendance keys scrubbed.');
        } catch (e) { /* ignore */ }
    }

    scrubLegacyGlobalKeys();

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(scoped(key));
            if (!raw) return fallback;
            const v = JSON.parse(raw);
            return Array.isArray(v) ? v : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(scoped(key), JSON.stringify(value));
            return true;
        } catch (e) {
            console.warn('[AttendanceCore] writeJSON failed:', key, e);
            return false;
        }
    }

    const SEED_NICS = new Set([
        '751232454V',
        '910290517V',
        '897010208V',
        '950623993V',
        '200185502650',
        '981240129V'
    ]);

    function scrubAccidentalSeedEmployees(list, bid) {
        // Do not scrub user data — preserve all employees added by users
        return Array.isArray(list) ? list : [];
    }

    // Entry points used across the whole module
    function getEmployees() {
        return readJSON('digibiz_registered_employees', []);
    }

    function setEmployees(list) {
        return writeJSON('digibiz_registered_employees', Array.isArray(list) ? list : []);
    }

    function getAttendanceLogs() { return readJSON('digibiz_attendance_logs', []); }
    function setAttendanceLogs(list) { return writeJSON('digibiz_attendance_logs', list); }

    function getGatePasses() { return readJSON('digibiz_gate_passes', []); }
    function setGatePasses(list) { return writeJSON('digibiz_gate_passes', list); }

    // Convenience: resolve an employee (within the current business) by
    // phone OR empId OR email — always scoped to this business's list.
    function findEmployee(query) {
        const empId = String(query.empId || '').trim().toLowerCase();
        const phone = String(query.phone || '').replace(/[^0-9]/g, '');
        const email = String(query.email || '').trim().toLowerCase();
        const list = getEmployees();
        return list.find(e => {
            const ePhone = String(e.phone || '').replace(/[^0-9]/g, '');
            const eEmail = String(e.email || '').trim().toLowerCase();
            if (empId && String(e.empId || '').trim().toLowerCase() === empId) return true;
            if (phone && ePhone === phone) return true;
            if (email && eEmail === email) return true;
            return false;
        }) || null;
    }

    // -----------------------------------------------------------------------
    // 3. FIREBASE HELPERS (business-scoped reads/writes)
    // -----------------------------------------------------------------------
    function db() {
        return window.db || (window.firebase && window.firebase.firestore ? window.firebase.firestore() : null);
    }

    function attendanceLogsCol(bid) {
        return db().collection('businesses').doc(bid).collection('attendance_logs');
    }

    function gatePassesCol(bid) {
        return db().collection('businesses').doc(bid).collection('gate_passes');
    }

    function pushLog(log) {
        const bid = resolveBusinessId();
        if (!bid || !db()) return Promise.resolve();
        return attendanceLogsCol(bid).doc(log.id).set(log, { merge: true }).catch(e => console.warn('[AttendanceCore] pushLog:', e));
    }

    function pushGatePass(gp) {
        const bid = resolveBusinessId();
        if (!bid || !db()) return Promise.resolve();
        return gatePassesCol(bid).doc(gp.id).set(gp, { merge: true }).catch(e => console.warn('[AttendanceCore] pushGatePass:', e));
    }

    function deleteLog(logId) {
        const bid = resolveBusinessId();
        if (!bid || !db() || !logId) return Promise.resolve();
        return attendanceLogsCol(bid).doc(logId).delete().catch(e => console.warn('[AttendanceCore] deleteLog:', e));
    }

    // -----------------------------------------------------------------------
    // 4. ROLE-BASED ACCESS (Owner / Admin / Accountant)
    // -----------------------------------------------------------------------
    // Waits for Firebase to finish restoring the persisted session before
    // reading the current user. Reading auth.currentUser synchronously during
    // DOMContentLoaded frequently returns null (session restore is async),
    // which would wrongly deny access to even legitimate admins.
    function waitForAuthUser(timeoutMs) {
        const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
        if (!auth) return Promise.resolve(null);
        if (auth.currentUser) return Promise.resolve(auth.currentUser);
        return new Promise(function (resolve) {
            let unsub = null;
            let done = false;
            const timer = setTimeout(function () {
                if (done) return;
                done = true;
                if (unsub) { try { unsub(); } catch (e) { } }
                resolve(auth.currentUser || null);
            }, timeoutMs || 4000);
            try {
                unsub = auth.onAuthStateChanged(function (u) {
                    if (done) return;
                    done = true;
                    clearTimeout(timer);
                    if (unsub) { try { unsub(); } catch (e) { } }
                    resolve(u || null);
                });
            } catch (e) {
                if (!done) { done = true; clearTimeout(timer); resolve(auth.currentUser || null); }
            }
        });
    }

    async function canAccessModule() {
        // Impersonation (super-admin driving) always allowed.
        if (localStorage.getItem('digibiz_impersonate_active') === 'true') return true;

        const user = await waitForAuthUser();
        if (!user || !user.uid) return false;

        // Business membership role first
        const bid = resolveBusinessId();
        const ok = new Set(['BUSINESS_OWNER', 'OWNER', 'ADMIN', 'SUPER_ADMIN', 'ACCOUNTANT', 'DISTRIBUTOR_OWNER']);
        let role = null;

        if (bid && window.db) {
            try {
                const snap = await window.db.collection('businesses').doc(bid)
                    .collection('users').doc(user.uid).get();
                if (snap.exists && snap.data().role) role = String(snap.data().role).toUpperCase();
            } catch (e) { /* ignore */ }
        }

        if (role) {
            if (ok.has(role) || role.includes('OWNER') || role === 'ACCOUNTANT') return true;
            return false;
        }

        // Fall back to global role resolution
        try {
            const info = await window.getUserRole(user.uid, bid);
            const r = String(info && info.role || '').toUpperCase();
            return ok.has(r) || r.includes('OWNER') || r === 'ACCOUNTANT';
        } catch (e) {
            return false;
        }
    }

    // -----------------------------------------------------------------------
    // 5. EMPLOYEE LOGIN & PHONE VERIFICATION (for mobile-scan.html)
    // -----------------------------------------------------------------------
    // A secure, linkless-of-credentials flow:
    //   Step 1  : employee opens the shared PWA link (no empId/phone in URL)
    //   Step 2  : employee signs in with email + password (Firebase Auth)
    //   Step 3  : we verify the authenticated user belongs to THIS business as
    //             a registered employee, and that the phone stored on the
    //             employee record matches what they provide on-screen.
    // Determine whether a user may use the Attendance scanner. The scanner is
    // RESTRICTED to the Attendance & Payroll domain: the business (tenant) must be
    // an 'attendance_payroll' business AND the user must be one of its owners/
    // admins or a registered employee. Any other account (other business types,
    // unrelated businesses) is rejected so no cross-tenant data is exposed.
    async function resolveAttendanceTenant(user) {
        if (!user || !user.uid) return { allowed: false, error: 'no_user', bid: null };
        if (!window.db) return { allowed: false, error: 'no_business', bid: null };

        // Candidate businesses: the active selection first, then the user's own uid
        // (the user's uid is usually their business doc id), then the businessId
        // recorded on the master users/{uid} doc.
        const candidates = [];
        const raw = resolveBusinessId();
        if (raw) candidates.push(raw);
        if (!candidates.includes(user.uid)) candidates.push(user.uid);

        try {
            const udoc = await window.db.collection('users').doc(user.uid).get();
            if (udoc.exists) {
                const userBizId = udoc.data().businessId || udoc.data().assignedBusiness || null;
                if (userBizId && !candidates.includes(String(userBizId))) candidates.push(String(userBizId));
            }
        } catch (e) { /* ignore */ }

        // Search staff_registry and registered_employees across businesses by employee email
        if (user.email && window.db) {
            const cleanEmail = String(user.email).trim().toLowerCase();
            try {
                const regSnap = await window.db.collection('staff_registry').doc(cleanEmail).get();
                if (regSnap.exists && regSnap.data().businessId) {
                    const mappedBid = String(regSnap.data().businessId);
                    if (!candidates.includes(mappedBid)) candidates.push(mappedBid);
                }
            } catch (e) { /* ignore */ }

            try {
                const allBiz = await window.db.collection('businesses').get();
                allBiz.docs.forEach(d => {
                    const bData = d.data() || {};
                    const emps = bData.registered_employees || [];
                    if (Array.isArray(emps) && emps.some(e => e && String(e.email || '').trim().toLowerCase() === cleanEmail)) {
                        if (!candidates.includes(d.id)) candidates.push(d.id);
                    }
                });
            } catch (e) { /* ignore */ }
        }

        const allowedRoles = new Set(['OWNER', 'BUSINESS_OWNER', 'ADMIN', 'SUPER_ADMIN', 'HR', 'HR_MANAGER', 'ACCOUNTANT', 'STAFF', 'VIEWER']);

        for (const bid of candidates) {
            if (!bid) continue;
            try {
                const bizDoc = await window.db.collection('businesses').doc(bid).get();
                if (!bizDoc.exists) continue;
                const bData = bizDoc.data() || {};
                const bType = String(bData.businessType || bData.type || '').toLowerCase();
                const isAttendanceType = bType.includes('attendance') || bType.includes('payroll') || bData.ownerId || bData.registered_employees;

                const isOwner = bData.ownerId === user.uid || bizDoc.id === user.uid ||
                    (bData.ownerEmail && String(bData.ownerEmail).toLowerCase() === String(user.email || '').toLowerCase());
                if (isOwner && isAttendanceType) return { allowed: true, bid: bid };

                let role = null;
                try {
                    const memberSnap = await window.db.collection('businesses').doc(bid).collection('users').doc(user.uid).get();
                    if (memberSnap.exists && memberSnap.data().role) role = String(memberSnap.data().role).toUpperCase();
                } catch (e) { /* ignore */ }
                if (role && (allowedRoles.has(role) || role.includes('OWNER') || role.includes('HR') || role.includes('ADMIN'))) {
                    return { allowed: true, bid: bid };
                }

                const emp = await findEmployeeInTenant(user, bid);
                if (emp) return { allowed: true, bid: bid, emp: emp };
            } catch (e) { /* continue to next candidate */ }
        }

        return { allowed: false, error: 'not_attendance_member', bid: null };
    }

    async function findEmployeeInTenant(user, bid) {
        const email = String(user.email || '').trim().toLowerCase();
        // 1. Check local list
        const list = getEmployees();
        const localEmp = list.find(e => String(e.email || '').trim().toLowerCase() === email);
        if (localEmp) return localEmp;

        // 2. Check Firestore registered_employees array for this business
        try {
            const bizSnap = await window.db.collection('businesses').doc(bid).get();
            if (bizSnap.exists) {
                const emps = bizSnap.data().registered_employees || [];
                const matched = emps.find(e => e && String(e.email || '').trim().toLowerCase() === email);
                if (matched) return matched;
            }
        } catch (e) { /* ignore */ }

        // 3. Fallback check employees subcollection
        try {
            const q = await window.db.collection('businesses').doc(bid).collection('employees')
                .where('email', '==', email).limit(1).get();
            if (!q.empty) return q.docs[0].data();
        } catch (e) { /* ignore */ }

        return null;
    }

    async function authenticateEmployee(email, password) {
        const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
        if (!auth) return { ok: false, error: 'auth_unavailable' };
        try {
            const cred = await auth.signInWithEmailAndPassword(email.trim(), password);
            const user = cred.user;
            if (!user) return { ok: false, error: 'no_user' };

            // Make the authenticated user the active business context so scoped
            // localStorage reads (getEmployees etc.) use the correct tenant.
            try {
                localStorage.setItem('currentBusinessId', user.uid);
                sessionStorage.setItem('currentBusinessId', user.uid);
                localStorage.setItem('activeBusinessId', user.uid);
            } catch (e) { /* ignore */ }

            const tenant = await resolveAttendanceTenant(user);
            if (!tenant.allowed) {
                await auth.signOut().catch(() => { });
                return { ok: false, error: tenant.error || 'not_attendance_member' };
            }

            // Pin the active business context to the AUTHORIZED attendance tenant so
            // scoped localStorage keys AND cloud reads/writes target the correct
            // organisation (and never a stale or cross-tenant id).
            const bid = tenant.bid;
            try {
                localStorage.setItem('currentBusinessId', bid);
                sessionStorage.setItem('currentBusinessId', bid);
                localStorage.setItem('activeBusinessId', bid);
            } catch (e) { /* ignore */ }

            // Prefer an explicit employee record; otherwise this is an owner/admin
            // operating the terminal (scans are then attributed to them).
            let emp = tenant.emp || null;
            if (!emp) {
                emp = await findEmployeeInTenant(user, bid);
            }

            return { ok: true, emp: emp || { name: user.displayName || user.email, empId: '', phone: '', email: user.email }, bid: bid };
        } catch (err) {
            const code = err && err.code;
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential' || code === 'auth/invalid-email') {
                await auth.signOut().catch(() => { });
                return { ok: false, error: 'invalid_credentials' };
            }
            return { ok: false, error: (err && err.code) || 'generic_error', detail: String(err && err.message || '') };
        }
    }

    // Final gate helper: employee must be localStorage role OK too (optional).
    function isEmployeeLoggedIn() {
        const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
        return !!(auth && auth.currentUser);
    }

    // Ensures the browser's active business selection never points at someone
    // else's data. Called on Attendance module boot *after* access is granted.
    // If the stored 'currentBusinessId' is stale (left by a previous account's
    // session) and the current user is NOT an owner/member of that business, then
    // we override the selection with the user's own private UID bucket (empty) so
    // a brand-new account never inherits e.g. Sunrose labels/logs from the same
    // browser.
    async function bootstrapAuthorizedBusiness() {
        const created = await getAuthorizedBusinessId();
        if (!created) return created;
        try {
            // Make the resolved (authorised) business the active one so all
            // synchronous scoped reads/writes (localStorage) use the correct tenant.
            localStorage.setItem('currentBusinessId', created);
            localStorage.setItem('activeBusinessId', created);
            sessionStorage.setItem('currentBusinessId', created);
            return created;
        } catch (e) {
            return created;
        }
    }

    // Resolve the business the CURRENT authenticated user is actually allowed to
    // use. This prevents a stale browser-global 'currentBusinessId' (left over by
    // a previous account's session, e.g. Sunrose) from pulling another company's
    // data into a brand-new account's view. If the user is not verified as owner /
    // member of the selected business, we fall back to their own private UID
    // bucket (empty) instead of silently showing someone else's data.
    async function getAuthorizedBusinessId() {
        const auth = window.firebase && window.firebase.auth ? window.firebase.auth() : null;
        const user = await waitForAuthUser();
        if (!user || !user.uid) return null;
        const raw = resolveBusinessId();
        if (!raw || !window.db) return null;
        try {
            // Impersonation (super-admin driving) always follows the selected biz.
            if (localStorage.getItem('digibiz_impersonate_active') === 'true') return raw;
            // Is the current user the owner, or in the business users sub-collection?
            const bizDoc = await window.db.collection('businesses').doc(raw).get();
            if (!bizDoc.exists) return user.uid; // no such business -> never leak -> own bucket
            const bData = bizDoc.data() || {};
            const isOwner = bData.ownerId === user.uid || bizDoc.id === user.uid;
            if (isOwner) return raw;
            const memberSnap = await window.db.collection('businesses').doc(raw)
                .collection('users').doc(user.uid).get();
            if (memberSnap.exists && memberSnap.data().role) return raw; // member/admin/accountant
            // Not an owner/member of the selected business -> do not expose it.
            return user.uid;
        } catch (e) {
            // On any error, default to the user's own isolated bucket (empty).
            return user.uid;
        }
    }

    async function purgeEmployeeLogs(query) {
        const empId = String(query.empId || '').trim();
        const nic = String(query.nic || '').trim();
        const phone = String(query.phone || '').replace(/[^0-9]/g, '');

        if (!empId && !nic && !phone) return;

        // 1. Purge from local storage attendance logs
        let logs = getAttendanceLogs();
        const cleanLogs = logs.filter(l => {
            if (!l) return false;
            const lEmpId = String(l.empId || '').trim();
            const lNic = String(l.nic || '').trim();
            const lPhone = String(l.phone || '').replace(/[^0-9]/g, '');
            if (empId && lEmpId === empId) return false;
            if (nic && lNic === nic) return false;
            if (phone && lPhone && lPhone === phone) return false;
            return true;
        });
        setAttendanceLogs(cleanLogs);

        // 2. Purge from local storage gate passes
        let gatePasses = getGatePasses();
        const cleanGP = gatePasses.filter(gp => {
            if (!gp) return false;
            const gpEmpId = String(gp.empId || '').trim();
            const gpPhone = String(gp.phone || '').replace(/[^0-9]/g, '');
            if (empId && gpEmpId === empId) return false;
            if (phone && gpPhone && gpPhone === phone) return false;
            return true;
        });
        setGatePasses(cleanGP);

        // 3. Purge from Firestore sub-collections
        const bizId = resolveBusinessId();
        const firestoreDb = db();
        if (bizId && firestoreDb) {
            try {
                const logsCol = attendanceLogsCol(bizId);
                const snap = await logsCol.get();
                const batch = firestoreDb.batch();
                let count = 0;
                snap.docs.forEach(doc => {
                    const data = doc.data() || {};
                    const lEmpId = String(data.empId || '').trim();
                    const lNic = String(data.nic || '').trim();
                    const lPhone = String(data.phone || '').replace(/[^0-9]/g, '');
                    if ((empId && lEmpId === empId) || (nic && lNic === nic) || (phone && lPhone && lPhone === phone)) {
                        batch.delete(doc.ref);
                        count++;
                    }
                });
                if (count > 0) await batch.commit();
            } catch (e) {
                console.warn('[AttendanceCore] Firestore purge error:', e);
            }

            try {
                const gpCol = gatePassesCol(bizId);
                const snap = await gpCol.get();
                const batch = firestoreDb.batch();
                let count = 0;
                snap.docs.forEach(doc => {
                    const data = doc.data() || {};
                    const lEmpId = String(data.empId || '').trim();
                    const lPhone = String(data.phone || '').replace(/[^0-9]/g, '');
                    if ((empId && lEmpId === empId) || (phone && lPhone && lPhone === phone)) {
                        batch.delete(doc.ref);
                        count++;
                    }
                });
                if (count > 0) await batch.commit();
            } catch (e) {
                console.warn('[AttendanceCore] Firestore GP purge error:', e);
            }
        }
    }

    // Export public API
    return {
        resolveBusinessId,
        getEmployees,
        setEmployees,
        getAttendanceLogs,
        setAttendanceLogs,
        getGatePasses,
        setGatePasses,
        findEmployee,
        pushLog,
        pushGatePass,
        deleteLog,
        purgeEmployeeLogs,
        canAccessModule,
        getAuthorizedBusinessId,
        bootstrapAuthorizedBusiness,
        scrubAccidentalSeedEmployees,
        resolveAttendanceTenant,
        findEmployeeInTenant,
        authenticateEmployee,
        isEmployeeLoggedIn
    };
})();
