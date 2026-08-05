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

    async function refreshDetails() {
        const email = emailSearch.value.trim();
        if (!email) return;

        try {
            const usersRef = window.db.collection('users');
            const snapshot = await usersRef.where('email', '==', email).get();

            if (snapshot.empty) {
                alert('User not found');
                businessDetails.style.display = 'none';
                return;
            }

            const userDoc = snapshot.docs[0];
            const userData = userDoc.data();
            businessId = userData.businessId;

            if (!businessId) {
                alert('User is not associated with a business.');
                businessDetails.style.display = 'none';
                return;
            }

            const businessRef = window.db.collection('businesses').doc(businessId);
            const businessDoc = await businessRef.get();
            const businessData = businessDoc.data();

            businessName.textContent = businessData.name;
            ownerName.textContent = userData.displayName || userData.name || 'N/A';
            ownerPhone.textContent = userData.phoneNumber || 'N/A';

            const settingsRef = window.db.collection('settings').doc(businessId);
            const settingsDoc = await settingsRef.get();
            if (!settingsDoc.exists) {
                subscriptionStatus.textContent = 'No settings/subscription found.';
                businessDetails.style.display = 'block';
                return;
            }
            const settingsData = settingsDoc.data();
            const subscription = settingsData.subscription;

            if (!subscription) {
                subscriptionStatus.textContent = 'No subscription data found.';
                businessDetails.style.display = 'block';
                return;
            }

            const expireDate = new Date(subscription.expireDate || subscription.trialEnd);
            const remainingDays = Math.ceil((expireDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            subscriptionStatus.textContent = `${subscription.plan || 'TRIAL'} (${subscription.status || 'ACTIVE'}) - ${remainingDays} days left`;

            businessDetails.style.display = 'block';
        } catch (error) {
            console.error("Error refreshing details:", error);
            alert("Failed to fetch business details. See console for more info.");
        }
    }

    searchBtn.addEventListener('click', refreshDetails);

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
            const settingsData = settingsDoc.data();
            const subscription = settingsData.subscription;

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
            const settingsData = settingsDoc.data();
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
});
