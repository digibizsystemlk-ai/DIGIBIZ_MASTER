(function () {
    const btn = document.getElementById('saveBtn');
    const msg = document.getElementById('msg');
    const forceMsg = document.getElementById('forceMsg');

    function show(text, cls) {
        msg.className = `msg ${cls || ''}`;
        msg.textContent = text || '';
    }

    async function init() {
        const forced = localStorage.getItem('forcePasswordChangeNotice') || sessionStorage.getItem('forcePasswordChangeNotice');
        if (forced) {
            forceMsg.className = 'sub warn';
            forceMsg.textContent = forced;
            localStorage.removeItem('forcePasswordChangeNotice');
            sessionStorage.removeItem('forcePasswordChangeNotice');
        }
        auth.onAuthStateChanged(async (user) => {
            if (!user) {
                window.location.href = '/auth/login.html';
                return;
            }
            const udoc = await db.collection('users').doc(user.uid).get().catch(() => null);
            const u = udoc && udoc.exists ? (udoc.data() || {}) : {};
            if (u.mustChangePassword) {
                forceMsg.className = 'sub warn';
                forceMsg.textContent = 'Please change your password before continuing.';
            } else {
                forceMsg.className = 'sub';
                forceMsg.textContent = 'For security, use a strong password that is unique.';
            }
        });
    }

    btn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) return;
        const currentPassword = String(document.getElementById('currentPassword').value || '');
        const newPassword = String(document.getElementById('newPassword').value || '');
        const confirmPassword = String(document.getElementById('confirmPassword').value || '');
        if (!currentPassword || !newPassword || !confirmPassword) {
            show('Please fill all fields.', 'err');
            return;
        }
        if (newPassword.length < 6) {
            show('New password must be at least 6 characters.', 'err');
            return;
        }
        if (newPassword !== confirmPassword) {
            show('New password and confirm password do not match.', 'err');
            return;
        }
        try {
            btn.disabled = true;
            btn.textContent = 'Updating...';
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            await db.collection('users').doc(user.uid).set({
                mustChangePassword: false,
                passwordChangedAt: new Date(),
                passwordPolicyVersion: 1
            }, { merge: true });
            show('Password updated successfully.', 'ok');
            setTimeout(() => {
                window.location.href = '/modules/core/dashboard.html';
            }, 800);
        } catch (e) {
            show(e.message || 'Failed to update password.', 'err');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Update Password';
        }
    });

    init();
})();
