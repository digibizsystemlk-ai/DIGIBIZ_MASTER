// Subscription Manager - Trial, activation, lockdown

class SubscriptionManager {
    constructor() {
        this.VERSION = 'v1.0.4-Gold';
        this._smsWalletLibPromise = null;
        this.TRIAL_DAYS = 7;
        this.MONTHLY_FEE = 1000;
        this.SMS_UNIT_PRICE = 1;
        this.TRIAL_SMS_CREDITS = 300;
        this.SCRIPT_URL = window.DIGIBIZ_SUBSCRIPTION_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxmh3MKHlVfYLlzTQEnb8B7WLUoo_Rv5A6nRST7b201vXGGIHuWV0uq6vsmFF70rXea/exec';
        this.current = null;
    }

    async ensureSmsWalletLib() {
        if (window.SmsWalletCore) return;
        if (this._smsWalletLibPromise) return this._smsWalletLibPromise;
        this._smsWalletLibPromise = new Promise((resolve) => {
            if (document.querySelector('script[data-digibiz-sms-wallet-core]')) {
                resolve();
                return;
            }
            const s = document.createElement('script');
            s.src = '/core/sms-wallet-core.js?v=4';
            s.async = false;
            s.setAttribute('data-digibiz-sms-wallet-core', '1');
            s.onload = () => resolve();
            s.onerror = () => resolve();
            document.head.appendChild(s);
        });
        await this._smsWalletLibPromise;
        for (let i = 0; i < 40 && !window.SmsWalletCore; i++) {
            await new Promise((r) => setTimeout(r, 25));
        }
    }

    getDeviceId() {
        let deviceId = localStorage.getItem('digibizDeviceId');
        if (!deviceId) {
            deviceId = `dbz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            localStorage.setItem('digibizDeviceId', deviceId);
        }
        return deviceId;
    }

    getAllowedWhenExpired(pathname) {
        return pathname.includes('/modules/company/settings.html')
            || pathname.includes('/modules/core/subscription.html')
            || pathname.includes('/modules/core/billing.html');
    }

    daysBetween(fromDate, toDate) {
        const ms = toDate.getTime() - fromDate.getTime();
        return Math.ceil(ms / (1000 * 60 * 60 * 24));
    }

    renderVersionBadge() {
        // Version badge intentionally disabled by product decision.
        return;
    }

    async loadOrCreateSubscription(user, businessId) {
        await this.ensureSmsWalletLib();
        const settingsRef = window.db.collection('settings').doc(businessId);
        const snapshot = await settingsRef.get();
        const now = new Date();

        let subscription = snapshot.exists ? (snapshot.data().subscription || null) : null;
        const settingsData = snapshot.exists ? (snapshot.data() || {}) : {};
        if (!subscription) {
            const trialStart = user.metadata && user.metadata.creationTime ? new Date(user.metadata.creationTime) : now;
            const trialEnd = new Date(trialStart);
            trialEnd.setDate(trialEnd.getDate() + this.TRIAL_DAYS);
            subscription = {
                plan: 'TRIAL',
                trialStart: trialStart.toISOString(),
                trialEnd: trialEnd.toISOString(),
                expireDate: trialEnd.toISOString(),
                status: 'TRIAL'
            };
            const walletTrialEndIso = new Date(now.getTime() + this.TRIAL_DAYS * 86400000).toISOString();
            await settingsRef.set({
                subscription,
                smsWallet: {
                    paidSmsBalance: 0,
                    trialSmsBalance: this.TRIAL_SMS_CREDITS,
                    trialSmsExpiresAt: walletTrialEndIso,
                    smsBalance: this.TRIAL_SMS_CREDITS,
                    lowBalanceThreshold: 50,
                    unitPrice: this.SMS_UNIT_PRICE,
                    monthlyFee: this.MONTHLY_FEE,
                    trialCreditsGranted: true,
                    updatedAt: new Date().toISOString()
                },
                smsBalance: this.TRIAL_SMS_CREDITS
            }, { merge: true });
        }

        const userEmail = String((user && user.email) || '').toLowerCase().trim();
        const isDemoUser = userEmail.startsWith('test@') || userEmail.includes('demo');

        const expireDate = new Date(subscription.expireDate || subscription.trialEnd || now.toISOString());
        let remainingDays = this.daysBetween(now, expireDate);
        let expired = remainingDays <= 0;
        let plan = subscription.plan || 'TRIAL';

        if (isDemoUser) {
            expired = false;
            remainingDays = 9999;
            plan = 'LIVE_DEMO';
        }

        // Auto-Lock PRO Accounts upon subscription check
        if (plan === 'PRO' || plan === 'ENTERPRISE' || plan === 'PAID') {
            try {
                const versionTag = 'STABLE_FREEZE_2026_08_11';
                const snapshotPath = '/v2026_08_11/';
                const freezeDate = '2026-08-11';

                window.db.collection('businesses').doc(businessId).set({
                    versionLock: true,
                    lockedVersionTag: versionTag,
                    snapshotPath: snapshotPath,
                    freezeDate: freezeDate,
                    profileLocked: true
                }, { merge: true });

                if (userEmail) {
                    const docId = userEmail.replace(/[^a-z0-9@]/g, '_');
                    window.db.collection('client_version_control').doc(docId).set({
                        email: userEmail,
                        lockStatus: 'LOCKED',
                        isLocked: true,
                        versionTag: versionTag,
                        snapshotPath: snapshotPath,
                        freezeDate: freezeDate,
                        flags: { suppressAutoUpdates: true, suppressBetaFeatures: true, lockBusinessType: true, bypassPwaPrompt: false },
                        notes: 'Auto-locked upon PRO Plan activation',
                        updatedBy: 'SYSTEM_AUTO_PRO_LOCK',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    window.db.collection('users').doc(user.uid).set({
                        versionLock: true,
                        lockedVersionTag: versionTag,
                        snapshotPath: snapshotPath,
                        freezeDate: freezeDate
                    }, { merge: true });
                }
            } catch (eAutoLock) {
                console.warn('[SubscriptionManager] PRO auto-lock warn:', eAutoLock);
            }
        }

        const wallet = settingsData.smsWallet || {};
        const walletMissing = !snapshot.exists || !settingsData.smsWallet;
        if (window.SmsWalletCore && typeof window.SmsWalletCore.ensureSeeded === 'function') {
            await window.SmsWalletCore.ensureSeeded(businessId);
        }
        if (walletMissing && plan === 'TRIAL') {
            const walletTrialEndIso2 = new Date(now.getTime() + this.TRIAL_DAYS * 86400000).toISOString();
            await settingsRef.set({
                smsWallet: {
                    paidSmsBalance: 0,
                    trialSmsBalance: this.TRIAL_SMS_CREDITS,
                    trialSmsExpiresAt: walletTrialEndIso2,
                    smsBalance: this.TRIAL_SMS_CREDITS,
                    lowBalanceThreshold: 50,
                    unitPrice: this.SMS_UNIT_PRICE,
                    monthlyFee: this.MONTHLY_FEE,
                    trialCreditsGranted: true,
                    updatedAt: new Date().toISOString()
                },
                smsBalance: this.TRIAL_SMS_CREDITS
            }, { merge: true });
        }
        const snap2 = await settingsRef.get().catch(() => snapshot);
        const data2 = snap2 && snap2.exists ? snap2.data() || {} : settingsData;
        const w2 = data2.smsWallet || {};
        const rootBalanceMismatch = Number(data2.smsBalance ?? 0) !== Number(w2.smsBalance ?? 0);
        if (rootBalanceMismatch) {
            await settingsRef.set({ smsBalance: Number(w2.smsBalance || 0) }, { merge: true });
        }

        return {
            ...subscription,
            expireDate: expireDate.toISOString(),
            remainingDays,
            expired,
            plan,
            statusText: plan === 'LIVE_DEMO'
                ? '🎮 Live Demo Active'
                : (plan === 'TRIAL'
                    ? (expired ? 'Trial Expired' : `Trial: ${remainingDays} day(s) left`)
                    : `${plan} Active`)
        };
    }

    async initializeForUser(user, role, businessId) {
        if (!user || !businessId || !window.db) return null;
        this.renderVersionBadge();

        const userEmail = String(user.email || '').toLowerCase().trim();
        const isDemoUser = userEmail.startsWith('test@') || userEmail.includes('demo');
        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role) || String(role || '').includes('ADMIN');
        
        const subscription = await this.loadOrCreateSubscription(user, businessId);

        if (isDemoUser || isAdmin) {
            subscription.expired = false;
            subscription.remainingDays = 9999;
            if (isDemoUser) {
                subscription.plan = 'LIVE_DEMO';
                subscription.statusText = '🎮 Live Demo Active';
            }
        }

        this.current = { ...subscription, isAdmin, isDemoUser, businessId };

        const pathname = window.location.pathname;
        if (subscription.expired && !this.getAllowedWhenExpired(pathname)) {
            window.location.href = '/modules/core/billing.html';
            return this.current;
        }

        return this.current;
    }

    async activateCode(code, businessId) {
        const trimmed = String(code || '').trim();
        if (!trimmed) return { success: false, message: 'Activation code is required' };
        const deviceId = this.getDeviceId();

        const url = `${this.SCRIPT_URL}?code=${encodeURIComponent(trimmed)}&deviceId=${encodeURIComponent(deviceId)}`;
        const response = await fetch(url, { method: 'GET' });
        if (!response.ok) return { success: false, message: 'Failed to contact activation server' };

        const result = await response.json();
        if (!result.success) return result;

        const now = new Date();
        let expireDate = result.expireDate ? new Date(result.expireDate) : new Date(now);
        if (now.getMonth() === 1 && now.getDate() === 29) {
            expireDate = new Date(now.getFullYear(), 2, 31, 23, 59, 59, 999);
        }

        const subscription = {
            plan: 'PRO',
            status: 'ACTIVE',
            activatedAt: now.toISOString(),
            expireDate: expireDate.toISOString(),
            activatedCode: trimmed,
            customerName: result.customerName || ''
        };

        await window.db.collection('settings').doc(businessId).set({ subscription }, { merge: true });
        this.current = { ...subscription, remainingDays: this.daysBetween(now, expireDate), expired: false, statusText: 'PRO Active' };
        return { success: true, message: 'Activated successfully', data: this.current };
    }
}

window.subscriptionManager = new SubscriptionManager();
console.log('✅ Subscription Manager Initialized');
