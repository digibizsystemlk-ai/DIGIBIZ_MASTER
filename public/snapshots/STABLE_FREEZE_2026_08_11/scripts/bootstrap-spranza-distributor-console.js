/* Console bootstrap for SPRANZA distributor tenant.
 * Run while signed in as privileged admin user:
 *   await window.bootstrapSpranzaDistributor()
 */
(function attachSpranzaBootstrap() {
    const SPRANZA_BID = 'SPRANZA_PVT_LTD';
    const SPRANZA_EMAIL = 'spranzaceylon@gmail.com';
    const SPRANZA_PASSWORD = '123456';

    async function createAuthUserByApi(email, password) {
        const apiKey = (firebase.app && firebase.app().options && firebase.app().options.apiKey) || '';
        if (!apiKey) throw new Error('Missing Firebase apiKey.');
        const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, returnSecureToken: true })
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok && !(out && out.error && out.error.message === 'EMAIL_EXISTS')) {
            throw new Error((out && out.error && out.error.message) || 'Auth user create failed');
        }
        if (out && out.localId) return out.localId;
        return null;
    }

    window.bootstrapSpranzaDistributor = async function bootstrapSpranzaDistributor() {
        if (!window.db) throw new Error('window.db unavailable');
        const uid = await createAuthUserByApi(SPRANZA_EMAIL, SPRANZA_PASSWORD);
        await db.collection('businesses').doc(SPRANZA_BID).set({
            name: 'SPRANZA (PVT) LTD',
            businessType: 'distributor',
            distributorModel: 'MW',
            mwTradingSolutionsTenant: true,
            branchWarehousesEnabled: true,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ownerEmail: SPRANZA_EMAIL
        }, { merge: true });

        const branchSeed = [
            { id: 'HEAD_OFFICE', name: 'Head Office', location: 'Colombo', managerName: 'HQ Manager' },
            { id: 'REGION_1', name: 'Regional Branch 1', location: 'Kandy', managerName: 'Regional Manager 1' },
            { id: 'REGION_2', name: 'Regional Branch 2', location: 'Galle', managerName: 'Regional Manager 2' },
            { id: 'REGION_3', name: 'Regional Branch 3', location: 'Kurunegala', managerName: 'Regional Manager 3' }
        ];
        for (const b of branchSeed) {
            await db.collection('branches').doc(`${SPRANZA_BID}_${b.id}`).set({
                businessId: SPRANZA_BID,
                name: b.name,
                location: b.location,
                managerName: b.managerName,
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }, { merge: true });
        }

        if (uid) {
            await db.collection('users').doc(uid).set({
                email: SPRANZA_EMAIL,
                businessId: SPRANZA_BID,
                role: 'DISTRIBUTOR_OWNER',
                ownerName: 'SPRANZA (PVT) LTD',
                createdAt: new Date(),
                updatedAt: new Date()
            }, { merge: true });
            await db.collection('businesses').doc(SPRANZA_BID).collection('users').doc(uid).set({
                email: SPRANZA_EMAIL,
                role: 'DISTRIBUTOR_OWNER',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            }, { merge: true });
        }

        return {
            businessId: SPRANZA_BID,
            authUserCreated: !!uid,
            ownerUid: uid || '(existing email, uid unknown)',
            branchesCreated: branchSeed.length
        };
    };
})();
