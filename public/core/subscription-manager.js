// Subscription Manager - Trial, activation, lockdown

class SubscriptionManager {
    constructor() {
        this.VERSION = 'v1.0.4-Gold';
        this.TRIAL_DAYS = 7;
        this.SCRIPT_URL = window.DIGIBIZ_SUBSCRIPTION_SCRIPT_URL || 'https://script.google.com/macros/s/AKfycbxmh3MKHlVfYLlzTQEnb8B7WLUoo_Rv5A6nRST7b201vXGGIHuWV0uq6vsmFF70rXea/exec';
        this.current = null;
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
        return pathname.includes('/modules/company/settings.html') || pathname.includes('/modules/core/subscription.html');
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
        const settingsRef = window.db.collection('settings').doc(businessId);
        const snapshot = await settingsRef.get();
        const now = new Date();

        let subscription = snapshot.exists ? (snapshot.data().subscription || null) : null;
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
            await settingsRef.set({ subscription }, { merge: true });
        }

        const expireDate = new Date(subscription.expireDate || subscription.trialEnd || now.toISOString());
        const remainingDays = this.daysBetween(now, expireDate);
        const expired = remainingDays <= 0;
        const plan = subscription.plan || 'TRIAL';

        return {
            ...subscription,
            expireDate: expireDate.toISOString(),
            remainingDays,
            expired,
            plan,
            statusText: plan === 'TRIAL'
                ? (expired ? 'Trial Expired' : `Trial: ${remainingDays} day(s) left`)
                : `${plan} Active`
        };
    }

    async initializeForUser(user, role, businessId) {
        if (!user || !businessId || !window.db) return null;
        this.renderVersionBadge();

        const isAdmin = ['SUPER_ADMIN', 'ADMIN'].includes(role) || String(role || '').includes('ADMIN');
        const subscription = await this.loadOrCreateSubscription(user, businessId);
        this.current = { ...subscription, isAdmin, businessId };

        const pathname = window.location.pathname;
        if (!isAdmin && subscription.expired && !this.getAllowedWhenExpired(pathname)) {
            window.location.href = '/modules/core/subscription.html';
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
