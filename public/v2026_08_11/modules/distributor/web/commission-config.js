(function () {
    const state = { user: null, businessId: '', reps: [], rows: [], editId: '' };
    const $ = (id) => document.getElementById(id);
    function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
    function resetForm(){ state.editId=''; $('repId').value=''; $('type').value='percentage'; $('percentageValue').value=''; $('tiers').value=''; }
    function parseTiers(raw){
        if (!raw.trim()) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) throw new Error('Tiers must be array');
        return arr.map((t)=>({ threshold: Number(t.threshold||0), rate: Number(t.rate||0) }))
            .filter((t)=> t.threshold >= 0 && t.rate >= 0)
            .sort((a,b)=>a.threshold-b.threshold);
    }
    function bind(){
        $('btnReset').addEventListener('click', resetForm);
        $('btnSave').addEventListener('click', saveConfig);
        $('type').addEventListener('change', () => {
            const isTier = $('type').value === 'tiered';
            $('percentageValue').disabled = isTier;
            $('tiers').disabled = !isTier;
        });
    }
    async function loadReps(){
        const snap = await db.collection('reps').where('businessId','==',state.businessId).get();
        state.reps = snap.docs.map((d)=>({id:d.id,...(d.data()||{})})).sort((a,b)=>String(a.name||'').localeCompare(String(b.name||'')));
        $('repId').innerHTML = '<option value="">Select rep</option>' + state.reps.map((r)=>`<option value="${r.id}">${esc(r.name||r.id)}</option>`).join('');
    }
    async function loadRows(){
        const snap = await db.collection('commissionConfig').where('businessId','==',state.businessId).get();
        state.rows = snap.docs.map((d)=>({id:d.id,...(d.data()||{})}));
        $('rows').innerHTML = state.rows.length ? state.rows.map((r)=>`
            <tr>
                <td>${esc(r.repName || r.repId || '-')}</td>
                <td>${esc(r.commissionType || '-')}</td>
                <td>${Number(r.percentageValue||0).toFixed(2)}%</td>
                <td><span class="muted">${esc(JSON.stringify(r.tiers || []))}</span></td>
                <td>${r.updatedAt?.toDate ? r.updatedAt.toDate().toLocaleString() : '-'}</td>
                <td><button class="btn alt" onclick="window.__commissionEdit('${r.id}')">Edit</button></td>
            </tr>`).join('') : '<tr><td colspan="6">No config yet</td></tr>';
    }
    window.__commissionEdit = (id) => {
        const r = state.rows.find((x)=>x.id===id); if(!r) return;
        state.editId = id;
        $('repId').value = r.repId || '';
        $('type').value = r.commissionType || 'percentage';
        $('percentageValue').value = Number(r.percentageValue || 0);
        $('tiers').value = JSON.stringify(r.tiers || []);
        $('type').dispatchEvent(new Event('change'));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    async function saveConfig(){
        const repId = $('repId').value;
        if (!repId) return alert('Select rep');
        const rep = state.reps.find((r)=>r.id===repId);
        const commissionType = $('type').value;
        let percentageValue = Number($('percentageValue').value || 0);
        let tiers = [];
        if (commissionType === 'tiered') {
            try { tiers = parseTiers(String($('tiers').value || '[]')); }
            catch (e) { return alert('Invalid tiers JSON'); }
            if (!tiers.length) return alert('Provide at least one tier.');
            percentageValue = 0;
        } else {
            if (percentageValue < 0) return alert('Invalid percentage value');
            tiers = [];
        }
        const id = state.editId || repId;
        await db.collection('commissionConfig').doc(id).set({
            businessId: state.businessId,
            repId: repId,
            repName: rep ? (rep.name || '') : '',
            commissionType,
            percentageValue,
            tiers,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: state.user?.uid || ''
        }, { merge: true });
        resetForm();
        await loadRows();
    }
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return void (window.location.href = '/auth/login.html');
        state.user = user;
        state.businessId = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || '';
        if (!state.businessId && window.dashboardCore) {
            const ctx = await window.dashboardCore.getContext(user).catch(()=>null);
            state.businessId = ctx && ctx.businessId ? ctx.businessId : '';
        }
        if (!state.businessId) return alert('Select a business first');
        const pilot = !!(window.DigiBizDistributorLorryStock && window.DigiBizDistributorLorryStock.activeForSession(user.email, state.businessId));
        if (!pilot) {
            $('gateMsg').textContent = 'Commission configuration is enabled only for pilot tenant.';
            $('cfgCard').style.display = 'none';
            $('rows').innerHTML = '<tr><td colspan="6">Access restricted.</td></tr>';
            return;
        }
        bind();
        await loadReps();
        await loadRows();
        $('type').dispatchEvent(new Event('change'));
    });
})();
