document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('search-btn');
    const emailSearch = document.getElementById('email-search');
    const businessDetails = document.getElementById('business-details');
    const businessName = document.getElementById('business-name');
    const ownerName = document.getElementById('owner-name');
    const ownerPhone = document.getElementById('owner-phone');
    const subscriptionStatus = document.getElementById('subscription-status');
    const extendProBtn = document.getElementById('extend-pro-btn');
    const extendProDays = document.getElementById('extend-pro');
    const extendTrialBtn = document.getElementById('extend-trial-btn');
    const addSmsBtn = document.getElementById('add-sms-btn');
    const addSmsAmount = document.getElementById('add-sms');

    let businessId = null;

    searchBtn.addEventListener('click', async () => {
        const email = emailSearch.value.trim();
        if (!email) return;

        const usersRef = window.db.collection('users');
        const snapshot = await usersRef.where('email', '==', email).get();

        if (snapshot.empty) {
            alert('User not found');
            return;
        }

        const userDoc = snapshot.docs[0];
        const userData = userDoc.data();
        businessId = userData.businessId;

        const businessRef = window.db.collection('businesses').doc(businessId);
        const businessDoc = await businessRef.get();
        const businessData = businessDoc.data();

        businessName.textContent = businessData.name;
        ownerName.textContent = userData.displayName;
        ownerPhone.textContent = userData.phoneNumber || 'N/A';

        const settingsRef = window.db.collection('settings').doc(businessId);
        const settingsDoc = await settingsRef.get();
        const settingsData = settingsDoc.data();
        const subscription = settingsData.subscription;

        const expireDate = new Date(subscription.expireDate || subscription.trialEnd);
        const remainingDays = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

        subscriptionStatus.textContent = `${subscription.plan} (${subscription.status}) - ${remainingDays} days left`;

        businessDetails.style.display = 'block';
    });

    extendProBtn.addEventListener('click', async () => {
        if (!businessId) return;

        const days = parseInt(extendProDays.value);
        if (isNaN(days) || days <= 0) {
            alert('Invalid number of days');
            return;
        }

        const settingsRef = window.db.collection('settings').doc(businessId);
        const settingsDoc = await settingsRef.get();
        const settingsData = settingsDoc.data();
        const subscription = settingsData.subscription;

        const currentExpireDate = new Date(subscription.expireDate || subscription.trialEnd);
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
        searchBtn.click();
    });

    extendTrialBtn.addEventListener('click', async () => {
        if (!businessId) return;

        const settingsRef = window.db.collection('settings').doc(businessId);
        const settingsDoc = await settingsRef.get();
        const settingsData = settingsDoc.data();
        const subscription = settingsData.subscription;

        const currentTrialEnd = new Date(subscription.trialEnd);
        const newTrialEnd = new Date(currentTrialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

        await settingsRef.set({ 
            subscription: { 
                ...subscription, 
                trialEnd: newTrialEnd.toISOString(),
                expireDate: newTrialEnd.toISOString()
            } 
        }, { merge: true });

        alert('Trial extended successfully');
        searchBtn.click();
    });

    addSmsBtn.addEventListener('click', async () => {
        if (!businessId) return;

        const amount = parseInt(addSmsAmount.value);
        if (isNaN(amount) || amount <= 0) {
            alert('Invalid SMS amount');
            return;
        }

        const settingsRef = window.db.collection('settings').doc(businessId);
        await window.db.runTransaction(async (transaction) => {
            const settingsDoc = await transaction.get(settingsRef);
            const settingsData = settingsDoc.data();
            const smsWallet = settingsData.smsWallet || {};

            const newPaidSmsBalance = (smsWallet.paidSmsBalance || 0) + amount;
            const newSmsBalance = (smsWallet.smsBalance || 0) + amount;

            transaction.set(settingsRef, { 
                smsWallet: { 
                    ...smsWallet, 
                    paidSmsBalance: newPaidSmsBalance,
                    smsBalance: newSmsBalance
                },
                smsBalance: newSmsBalance
            }, { merge: true });
        });

        alert('SMS credits added successfully');
        searchBtn.click();
    });
});