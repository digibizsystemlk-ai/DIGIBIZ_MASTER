/**
 * Coconut Wholesale Module — Profile Logic
 */

let appCtx = null;

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('profile');

    await loadBusinessProfile();
    document.getElementById('profileForm').addEventListener('submit', handleSaveProfile);
});

async function loadBusinessProfile() {
    const db = window.CoconutModule.getDb();
    try {
        const doc = await db.collection('businesses').doc(appCtx.businessId).get();
        if (!doc.exists) return;
        const b = doc.data();

        document.getElementById('profName').value = b.name || b.businessName || '';
        document.getElementById('profOwner').value = b.ownerName || '';
        document.getElementById('profPhone').value = b.phone || '';
        document.getElementById('profBr').value = b.brNumber || '';
        document.getElementById('profAddress').value = b.address || '';

    } catch (e) {
        console.error('Load profile error:', e);
    }
}

async function handleSaveProfile(e) {
    e.preventDefault();
    const btn = document.getElementById('btnSaveProfile');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    const name = document.getElementById('profName').value.trim();
    const ownerName = document.getElementById('profOwner').value.trim();
    const phone = document.getElementById('profPhone').value.trim();
    const brNumber = document.getElementById('profBr').value.trim();
    const address = document.getElementById('profAddress').value.trim();

    try {
        await db.collection('businesses').doc(bid).set({
            name,
            businessName: name,
            ownerName,
            phone,
            brNumber,
            address,
            updatedAt: window.CoconutModule.tsToFirestore(new Date())
        }, { merge: true });

        window.CoconutModule.showToast('Profile updated successfully!', 'success');

    } catch (err) {
        window.CoconutModule.showToast('Failed to save profile: ' + err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = '💾 Save Profile Changes';
    }
}
