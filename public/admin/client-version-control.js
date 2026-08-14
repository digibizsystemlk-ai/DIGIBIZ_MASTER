// Client Version Control & Email-Based Isolation Controller - DIGIBIZ Super Admin
(function () {
    'use strict';

    let allVersionConfigs = [];
    let currentEditingEmail = null;

    document.addEventListener('DOMContentLoaded', () => {
        initAuthAndPermissions();
        bindEventListeners();
        setDefaultFreezeDate();
        loadAllVersionConfigs();
    });

    function setDefaultFreezeDate() {
        const freezeDateEl = document.getElementById('freezeDateInput');
        if (freezeDateEl && !freezeDateEl.value) {
            freezeDateEl.value = new Date().toISOString().split('T')[0];
        }
    }

    function initAuthAndPermissions() {
        firebase.auth().onAuthStateChanged((user) => {
            if (!user) {
                window.location.href = '/auth/login.html';
                return;
            }
            user.getIdTokenResult().then((token) => {
                const isSuperAdmin = token.claims.admin === true || token.claims.superAdmin === true || user.email === 'biz.sirimal@gmail.com' || user.email === '2biz.sirimal@gmail.com';
                if (!isSuperAdmin) {
                    alert('⚠️ Access Denied: Only Super Admins can access Client Version Control.');
                    window.location.href = '/modules/core/dashboard.html';
                }
            }).catch(() => {});
        });
    }

    function bindEventListeners() {
        const form = document.getElementById('versionControlForm');
        if (form) form.addEventListener('submit', handleSaveVersionConfig);

        const btnRefresh = document.getElementById('btnRefreshVersionData');
        if (btnRefresh) btnRefresh.addEventListener('click', loadAllVersionConfigs);

        const btnLookup = document.getElementById('btnLookupClient');
        if (btnLookup) btnLookup.addEventListener('click', handleLookupClient);

        const btnRelease = document.getElementById('btnReleaseVersionConfig');
        if (btnRelease) btnRelease.addEventListener('click', () => performUnlockForEmail());

        const filterInput = document.getElementById('filterLockedInput');
        if (filterInput) {
            filterInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase().trim();
                renderVersionConfigsTable(allVersionConfigs.filter(item => 
                    item.email.toLowerCase().includes(query) ||
                    (item.versionTag || '').toLowerCase().includes(query) ||
                    (item.notes || '').toLowerCase().includes(query)
                ));
            });
        }
    }

    async function handleLookupClient() {
        const emailInput = document.getElementById('targetEmailInput');
        const email = String(emailInput.value || '').trim().toLowerCase();
        if (!email) {
            alert('Please enter a target client email address.');
            return;
        }

        try {
            const docId = sanitizeEmailForDocId(email);
            const vcDoc = await window.db.collection('client_version_control').doc(docId).get();
            if (vcDoc.exists) {
                populateFormWithConfig(vcDoc.data());
                alert(`📌 Existing version lock config loaded for ${email}`);
                return;
            }

            const uSnap = await window.db.collection('users').where('email', '==', email).limit(1).get();
            if (!uSnap.empty) {
                const uData = uSnap.docs[0].data() || {};
                alert(`✅ User found: ${uData.ownerName || uData.name || email} (Business ID: ${uData.businessId || 'Default'})`);
            } else {
                alert(`ℹ️ No prior user doc found for ${email}. You can still create a preemptive version lock.`);
            }
            resetFormFieldsExceptEmail(email);
        } catch (e) {
            console.error('Lookup failed:', e);
            alert('Lookup failed: ' + e.message);
        }
    }

    async function handleSaveVersionConfig(e) {
        if (e) e.preventDefault();
        const emailInput = document.getElementById('targetEmailInput');
        const email = String(emailInput.value || '').trim().toLowerCase();
        if (!email) {
            alert('Please enter a target client email address.');
            return;
        }

        const versionTag = document.getElementById('versionTagSelect').value;
        const freezeDate = document.getElementById('freezeDateInput').value || new Date().toISOString().split('T')[0];
        const lockStatus = 'LOCKED';
        const notes = String(document.getElementById('isolationNotesInput').value || '').trim();

        const flags = {
            suppressAutoUpdates: document.getElementById('flagSuppressAutoUpdates').checked,
            suppressBetaFeatures: document.getElementById('flagSuppressBetaFeatures').checked,
            lockBusinessType: document.getElementById('flagLockBusinessType').checked,
            bypassPwaPrompt: document.getElementById('flagBypassPwaPrompt').checked
        };

        const snapshotPath = `/snapshots/${versionTag}/`;
        const configPayload = {
            email: email,
            versionTag: versionTag,
            freezeDate: freezeDate,
            lockStatus: lockStatus,
            isLocked: true,
            snapshotPath: snapshotPath,
            flags: flags,
            notes: notes,
            updatedBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'SUPER_ADMIN',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docId = sanitizeEmailForDocId(email);
        const btnSave = document.getElementById('btnSaveVersionConfig');

        try {
            if (btnSave) {
                btnSave.disabled = true;
                btnSave.textContent = '💾 Saving Config...';
            }

            await window.db.collection('client_version_control').doc(docId).set(configPayload, { merge: true });

            try {
                const isSchemaLocked = flags.lockBusinessType === true;
                const uSnap = await window.db.collection('users').where('email', '==', email).get();
                uSnap.forEach(d => d.ref.set({ versionLock: true, lockedVersionTag: versionTag, freezeDate: freezeDate, snapshotPath: snapshotPath }, { merge: true }));

                const bSnap = await window.db.collection('businesses').where('ownerEmail', '==', email).get();
                bSnap.forEach(d => d.ref.set({ versionLock: true, lockedVersionTag: versionTag, freezeDate: freezeDate, profileLocked: isSchemaLocked, snapshotPath: snapshotPath }, { merge: true }));
            } catch (eMirror) {
                console.warn('Mirror update warn:', eMirror);
            }

            alert(`🔒 Client Version Lock & Snapshot Path successfully saved for ${email}!`);
            loadAllVersionConfigs();
        } catch (e) {
            console.error('Save failed:', e);
            alert('Save failed: ' + e.message);
        } finally {
            if (btnSave) {
                btnSave.disabled = false;
                btnSave.textContent = '💾 Save Configuration / Isolate Client';
            }
        }
    }

    async function performLockForEmail(targetEmail, customTag) {
        const email = String(targetEmail || document.getElementById('targetEmailInput').value || '').trim().toLowerCase();
        if (!email) {
            alert('Please enter or select a target client email address.');
            return;
        }

        let versionTag = customTag || document.getElementById('versionTagSelect').value || 'STABLE_FREEZE_2026_08_11';
        if (versionTag === 'LATEST_DEV') versionTag = 'STABLE_FREEZE_2026_08_11';
        const freezeDate = new Date().toISOString().split('T')[0];
        const snapshotPath = `/snapshots/${versionTag}/`;

        const flags = {
            suppressAutoUpdates: true,
            suppressBetaFeatures: true,
            lockBusinessType: true,
            bypassPwaPrompt: false
        };

        const configPayload = {
            email: email,
            versionTag: versionTag,
            freezeDate: freezeDate,
            lockStatus: 'LOCKED',
            isLocked: true,
            snapshotPath: snapshotPath,
            flags: flags,
            notes: 'Version lock enabled via Super Admin 1-Click action',
            updatedBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'SUPER_ADMIN',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        const docId = sanitizeEmailForDocId(email);
        try {
            await window.db.collection('client_version_control').doc(docId).set(configPayload, { merge: true });

            try {
                const uSnap = await window.db.collection('users').where('email', '==', email).get();
                uSnap.forEach(d => d.ref.set({ versionLock: true, lockedVersionTag: versionTag, freezeDate: freezeDate, snapshotPath: snapshotPath }, { merge: true }));

                const bSnap = await window.db.collection('businesses').where('ownerEmail', '==', email).get();
                bSnap.forEach(d => d.ref.set({ versionLock: true, lockedVersionTag: versionTag, freezeDate: freezeDate, profileLocked: true, snapshotPath: snapshotPath }, { merge: true }));
            } catch (eMirror) {
                console.warn('Mirror lock warn:', eMirror);
            }

            alert(`🔒 Version Lock & Snapshot Path successfully applied for ${email}!`);
            loadAllVersionConfigs();
        } catch (e) {
            console.error('Lock failed:', e);
            alert('Lock failed: ' + e.message);
        }
    }

    async function performUnlockForEmail(targetEmail) {
        const email = String(targetEmail || document.getElementById('targetEmailInput').value || '').trim().toLowerCase();
        if (!email) {
            alert('Please enter or select a target client email address.');
            return;
        }

        if (!confirm(`Are you sure you want to UNLOCK / RELEASE the version lock for "${email}"?\nThis account will resume standard development updates.`)) return;

        const docId = sanitizeEmailForDocId(email);
        try {
            await window.db.collection('client_version_control').doc(docId).set({
                email: email,
                lockStatus: 'UNLOCKED',
                isLocked: false,
                versionTag: 'LATEST_DEV',
                snapshotPath: '',
                updatedBy: firebase.auth().currentUser ? firebase.auth().currentUser.email : 'SUPER_ADMIN',
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            try {
                const uSnap = await window.db.collection('users').where('email', '==', email).get();
                uSnap.forEach(d => d.ref.set({ versionLock: false, lockedVersionTag: 'LATEST_DEV', snapshotPath: '' }, { merge: true }));

                const bSnap = await window.db.collection('businesses').where('ownerEmail', '==', email).get();
                bSnap.forEach(d => d.ref.set({ versionLock: false, lockedVersionTag: 'LATEST_DEV', profileLocked: false, snapshotPath: '' }, { merge: true }));
            } catch (eMirror) {
                console.warn('Mirror unlock warn:', eMirror);
            }

            alert(`🔓 Version lock successfully released for ${email}. Account is now UNLOCKED.`);
            loadAllVersionConfigs();
            resetFormFieldsExceptEmail(email);
        } catch (e) {
            console.error('Unlock failed:', e);
            alert('Unlock failed: ' + e.message);
        }
    }

    async function loadAllVersionConfigs() {
        const tbody = document.getElementById('lockedClientsTbody');
        try {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">Loading version configurations...</td></tr>';
            const snap = await window.db.collection('client_version_control').get();
            allVersionConfigs = [];
            snap.forEach(doc => {
                const d = doc.data() || {};
                allVersionConfigs.push({
                    id: doc.id,
                    email: d.email || doc.id.replace(/_/g, '.'),
                    versionTag: d.versionTag || 'STABLE_FREEZE_2026_08_11',
                    freezeDate: d.freezeDate || 'N/A',
                    lockStatus: d.lockStatus || (d.isLocked ? 'LOCKED' : 'UNLOCKED'),
                    flags: d.flags || {},
                    notes: d.notes || '',
                    updatedAt: d.updatedAt ? (d.updatedAt.toDate ? d.updatedAt.toDate().toLocaleString() : String(d.updatedAt)) : 'N/A'
                });
            });

            updateMetricsSummary(allVersionConfigs);
            renderVersionConfigsTable(allVersionConfigs);
        } catch (e) {
            console.error('Load failed:', e);
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:#f87171;">Failed to load configs: ${e.message}</td></tr>`;
        }
    }

    function updateMetricsSummary(configs) {
        const lockedList = configs.filter(c => c.lockStatus === 'LOCKED' || c.isLocked);
        const stableList = lockedList.filter(c => c.versionTag.includes('STABLE') || c.versionTag.includes('FREEZE'));
        const devList = configs.filter(c => c.versionTag === 'LATEST_DEV' || c.lockStatus === 'UNLOCKED');

        let overridesCount = 0;
        configs.forEach(c => {
            const f = c.flags || {};
            if (f.suppressAutoUpdates || f.suppressBetaFeatures || f.lockBusinessType || f.bypassPwaPrompt) {
                overridesCount++;
            }
        });

        document.getElementById('statLockedCount').textContent = lockedList.length;
        document.getElementById('statStableCount').textContent = stableList.length;
        document.getElementById('statOverridesCount').textContent = overridesCount;
        document.getElementById('statDevCount').textContent = devList.length;
    }

    function renderVersionConfigsTable(configs) {
        const tbody = document.getElementById('lockedClientsTbody');
        if (!configs || configs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px; color:#64748b;">No isolated client version configurations found. Use the form above to add a client lock.</td></tr>';
            return;
        }

        tbody.innerHTML = configs.map(item => {
            const isLocked = item.lockStatus === 'LOCKED' || item.isLocked;
            const badgeClass = isLocked ? (item.versionTag.includes('STABLE') || item.versionTag.includes('FREEZE') ? 'badge-locked' : 'badge-custom') : 'badge-dev';
            const flagsArr = [];
            if (item.flags.suppressAutoUpdates) flagsArr.push('🔒 Freeze UI');
            if (item.flags.suppressBetaFeatures) flagsArr.push('🛡️ No Beta');
            if (item.flags.lockBusinessType) flagsArr.push('💾 Schema Lock');
            if (item.flags.bypassPwaPrompt) flagsArr.push('🚫 No PWA Prompt');
            const flagsText = flagsArr.length > 0 ? flagsArr.join(', ') : 'Default';
            const displayTag = `${item.versionTag} ${item.freezeDate && item.freezeDate !== 'N/A' ? `(📅 ${item.freezeDate})` : ''}`;

            return `
                <tr>
                    <td><strong>${escapeHtml(item.email)}</strong></td>
                    <td><span class="badge-version ${badgeClass}">${escapeHtml(displayTag)}</span></td>
                    <td><span style="font-weight:700; color:${isLocked ? '#dc2626' : '#059669'};">${isLocked ? '🔒 LOCKED' : '🔓 UNLOCKED'}</span></td>
                    <td><span style="font-size:12px; color:#475569;">${flagsText}</span></td>
                    <td><span style="font-size:12px; color:#64748b;">${escapeHtml(item.notes || '-')}</span></td>
                    <td><span style="font-size:11.5px; color:#94a3b8;">${escapeHtml(item.updatedAt)}</span></td>
                    <td style="text-align:right; white-space:nowrap;">
                        ${isLocked ? 
                            `<button class="btn-lock-vc" data-email="${escapeHtml(item.email)}" data-version="${escapeHtml(item.versionTag)}" style="background:#dc2626; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11.5px; cursor:pointer; margin-right:4px;" type="button">🔒 Re-Lock</button>
                             <button class="btn-unlock-vc" data-email="${escapeHtml(item.email)}" style="background:#059669; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11.5px; cursor:pointer; margin-right:4px;" type="button">🔓 Unlock</button>` :
                            `<button class="btn-lock-vc" data-email="${escapeHtml(item.email)}" data-version="${escapeHtml(item.versionTag)}" style="background:#dc2626; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11.5px; cursor:pointer; margin-right:4px;" type="button">🔒 Lock Account</button>`
                        }
                        <button class="btn-edit-vc" data-email="${escapeHtml(item.email)}" style="background:#0284c7; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11.5px; cursor:pointer; margin-right:4px;" type="button">✏️ Edit</button>
                        <button class="btn-impersonate-vc" data-email="${escapeHtml(item.email)}" style="background:#d97706; color:#fff; border:none; padding:6px 12px; border-radius:6px; font-weight:700; font-size:11.5px; cursor:pointer;" type="button">🔑 Inspect</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-unlock-vc').forEach(btn => {
            btn.onclick = async () => {
                const email = btn.dataset.email;
                if (email) {
                    await performUnlockForEmail(email);
                }
            };
        });

        tbody.querySelectorAll('.btn-lock-vc').forEach(btn => {
            btn.onclick = async () => {
                const email = btn.dataset.email;
                const vTag = btn.dataset.version || 'STABLE_FREEZE_2026_08_11';
                if (email) {
                    await performLockForEmail(email, vTag);
                }
            };
        });

        tbody.querySelectorAll('.btn-edit-vc').forEach(btn => {
            btn.onclick = () => {
                const email = btn.dataset.email;
                const match = configs.find(c => c.email === email);
                if (match) populateFormWithConfig(match);
            };
        });

        tbody.querySelectorAll('.btn-impersonate-vc').forEach(btn => {
            btn.onclick = () => {
                const email = btn.dataset.email;
                if (window.impersonateClientAccount) {
                    window.impersonateClientAccount(email, '', 'retail');
                } else {
                    window.location.href = `/admin/business-management.html?search=${encodeURIComponent(email)}`;
                }
            };
        });
    }

    function populateFormWithConfig(config) {
        document.getElementById('targetEmailInput').value = config.email || '';
        document.getElementById('versionTagSelect').value = config.versionTag || 'STABLE_FREEZE_2026_08_11';
        document.getElementById('freezeDateInput').value = config.freezeDate && config.freezeDate !== 'N/A' ? config.freezeDate : new Date().toISOString().split('T')[0];
        document.getElementById('isolationNotesInput').value = config.notes || '';

        const isLocked = config.lockStatus === 'LOCKED' || config.isLocked;
        const statusBadge = document.getElementById('currentAccountStatusBadge');
        if (statusBadge) {
            statusBadge.style.background = isLocked ? 'rgba(220, 38, 38, 0.15)' : 'rgba(16, 185, 129, 0.15)';
            statusBadge.style.color = isLocked ? '#dc2626' : '#059669';
            statusBadge.style.borderColor = isLocked ? 'rgba(220, 38, 38, 0.3)' : 'rgba(16, 185, 129, 0.3)';
            statusBadge.innerHTML = isLocked ? `🔒 Currently LOCKED (${config.versionTag})` : '🔓 Currently UNLOCKED (Normal Updates)';
        }

        const flags = config.flags || {};
        document.getElementById('flagSuppressAutoUpdates').checked = flags.suppressAutoUpdates !== false;
        document.getElementById('flagSuppressBetaFeatures').checked = flags.suppressBetaFeatures !== false;
        document.getElementById('flagLockBusinessType').checked = flags.lockBusinessType !== false;
        document.getElementById('flagBypassPwaPrompt').checked = !!flags.bypassPwaPrompt;

        currentEditingEmail = config.email;
        window.scrollTo({ top: 300, behavior: 'smooth' });
    }

    function resetFormFieldsExceptEmail(email) {
        document.getElementById('targetEmailInput').value = email || '';
        document.getElementById('versionTagSelect').value = 'STABLE_FREEZE_2026_08_11';
        document.getElementById('freezeDateInput').value = new Date().toISOString().split('T')[0];
        document.getElementById('isolationNotesInput').value = '';

        const statusBadge = document.getElementById('currentAccountStatusBadge');
        if (statusBadge) {
            statusBadge.style.background = 'rgba(16, 185, 129, 0.15)';
            statusBadge.style.color = '#059669';
            statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            statusBadge.innerHTML = '🔓 Currently UNLOCKED (Normal Auto Updates)';
        }

        document.getElementById('flagSuppressAutoUpdates').checked = true;
        document.getElementById('flagSuppressBetaFeatures').checked = true;
        document.getElementById('flagLockBusinessType').checked = true;
        document.getElementById('flagBypassPwaPrompt').checked = false;
        currentEditingEmail = null;
    }

    function sanitizeEmailForDocId(email) {
        return String(email || '').trim().toLowerCase().replace(/[^a-z0-9@]/g, '_');
    }

    function escapeHtml(str) {
        return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
