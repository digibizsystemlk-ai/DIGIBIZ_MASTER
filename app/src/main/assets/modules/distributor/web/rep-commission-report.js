(function () {
    const state = { user: null, businessId: '', rows: [] };
    const $ = (id) => document.getElementById(id);
    function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
    function money(n){ return (Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2}); }
    function ms(v){ if(!v) return 0; if(v.toDate) return v.toDate().getTime(); if(v.seconds) return v.seconds*1000; const d=new Date(v); return isNaN(d.getTime())?0:d.getTime(); }
    function filtered(){
        const from = $('fFrom').value ? new Date($('fFrom').value + 'T00:00:00').getTime() : 0;
        const to = $('fTo').value ? new Date($('fTo').value + 'T23:59:59').getTime() : Number.MAX_SAFE_INTEGER;
        return state.rows.filter((r)=> {
            const t = ms(r.calculatedAt);
            return t >= from && t <= to;
        });
    }
    function render(){
        const rows = filtered();
        const byRep = {};
        rows.forEach((r)=>{
            const k = r.repId || 'UNASSIGNED';
            if (!byRep[k]) byRep[k] = { repName: r.repName || k, sales: 0, comm: 0, paid: 0, pending: 0 };
            byRep[k].sales += Number(r.orderTotal||0);
            byRep[k].comm += Number(r.commissionAmount||0);
            if (r.status === 'paid') byRep[k].paid += Number(r.commissionAmount||0);
            else byRep[k].pending += Number(r.commissionAmount||0);
        });
        $('sumRows').innerHTML = Object.values(byRep).length ? Object.values(byRep).map((r)=>`
            <tr><td>${esc(r.repName)}</td><td class="num">Rs ${money(r.sales)}</td><td class="num">Rs ${money(r.comm)}</td><td class="num">Rs ${money(r.paid)}</td><td class="num">Rs ${money(r.pending)}</td></tr>
        `).join('') : '<tr><td colspan="5">No rows</td></tr>';
        $('detailRows').innerHTML = rows.length ? rows.map((r)=>`
            <tr>
                <td>${esc(r.orderId || '-')}</td>
                <td>${esc(r.repName || r.repId || '-')}</td>
                <td>${r.calculatedAt?.toDate ? r.calculatedAt.toDate().toLocaleDateString() : '-'}</td>
                <td class="num">Rs ${money(r.orderTotal)}</td>
                <td class="num">${Number(r.commissionRate||0).toFixed(2)}%</td>
                <td class="num">Rs ${money(r.commissionAmount)}</td>
                <td>${esc(r.status || 'pending')}</td>
                <td>${r.status !== 'paid' ? `<button class="btn alt" onclick="window.__markCommissionPaid('${r.id}')">Mark Paid</button>` : '-'}</td>
            </tr>
        `).join('') : '<tr><td colspan="8">No rows</td></tr>';
    }
    window.__markCommissionPaid = async (id) => {
        await db.collection('commissionTransactions').doc(id).set({
            status: 'paid',
            paidAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        await loadRows();
    };
    async function loadRows(){
        const snap = await db.collection('commissionTransactions').where('businessId','==',state.businessId).get();
        state.rows = snap.docs.map((d)=>({id:d.id,...(d.data()||{})})).sort((a,b)=>ms(b.calculatedAt)-ms(a.calculatedAt));
        render();
    }
    function exportCsv(){
        const rows = filtered();
        const lines = [['Order','Rep','Date','Order Total','Rate','Commission','Status'].join(',')];
        rows.forEach((r)=>{
            lines.push([
                `"${String(r.orderId||'').replace(/"/g,'""')}"`,
                `"${String(r.repName||r.repId||'').replace(/"/g,'""')}"`,
                `"${r.calculatedAt?.toDate ? r.calculatedAt.toDate().toISOString().slice(0,10) : ''}"`,
                Number(r.orderTotal||0).toFixed(2),
                Number(r.commissionRate||0).toFixed(2),
                Number(r.commissionAmount||0).toFixed(2),
                `"${String(r.status||'')}"`,
            ].join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'rep-commission-report.csv'; a.click();
        URL.revokeObjectURL(url);
    }
    function bind(){
        ['fFrom','fTo'].forEach((id)=>$(id).addEventListener('change', render));
        $('btnCsv').addEventListener('click', exportCsv);
        $('btnPrint').addEventListener('click', ()=>window.print());
    }
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) return void (window.location.href='/auth/login.html');
        state.user = user;
        state.businessId = localStorage.getItem('currentBusinessId') || sessionStorage.getItem('currentBusinessId') || '';
        if (!state.businessId && window.dashboardCore) {
            const ctx = await window.dashboardCore.getContext(user).catch(()=>null);
            state.businessId = ctx && ctx.businessId ? ctx.businessId : '';
        }
        if (!state.businessId) return alert('Select business first');
        const pilot = !!(window.DigiBizDistributorLorryStock && window.DigiBizDistributorLorryStock.activeForSession(user.email, state.businessId));
        if (!pilot) {
            $('gateMsg').textContent = 'Rep commission report is enabled only for pilot tenant.';
            $('sumRows').innerHTML = '<tr><td colspan="5">Access restricted.</td></tr>';
            $('detailRows').innerHTML = '<tr><td colspan="8">Access restricted.</td></tr>';
            return;
        }
        bind();
        await loadRows();
    });
})();
