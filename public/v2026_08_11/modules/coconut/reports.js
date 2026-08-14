/**
 * Coconut Wholesale Module — Reports & Analytics Logic
 */

let appCtx = null;

document.addEventListener('DOMContentLoaded', async () => {
    appCtx = await window.CoconutModule.guardCoconutPage();
    if (!appCtx) return;

    window.CoconutModule.renderNav('reports');

    await loadReportsData();
});

async function loadReportsData() {
    const db = window.CoconutModule.getDb();
    const bid = appCtx.businessId;

    try {
        const [cPurchases, hPurchases, prodRuns, sales, expenses, journal] = await Promise.all([
            db.collection('coconut_raw_material_history').where('businessId', '==', bid).get(),
            db.collection('coconut_husk_purchases').where('businessId', '==', bid).get(),
            db.collection('coconut_production_runs').where('businessId', '==', bid).get(),
            db.collection('coconut_sales').where('businessId', '==', bid).get(),
            db.collection('coconut_expenses').where('businessId', '==', bid).get(),
            db.collection('journal').doc(bid).collection('entries').get()
        ]);

        const journalEntries = journal.docs.map(d => ({ id: d.id, ...d.data() }));

        // 1. Sales & Revenue Analysis
        let totalSales = 0;
        let productMap = {};

        sales.docs.forEach(doc => {
            const s = doc.data() || {};
            if (s.isActive === false) return;
            const amt = Number(s.amount) || 0;
            totalSales += amt;

            const items = Array.isArray(s.items) ? s.items : [];
            items.forEach(i => {
                const key = i.name || 'Product';
                if (!productMap[key]) productMap[key] = { units: 0, revenue: 0 };
                productMap[key].units += (Number(i.qty) || 0);
                productMap[key].revenue += (Number(i.lineTotal) || 0);
            });
        });

        // 2. Production & Yield Analysis
        let totalProduced = 0;
        let yieldMap = {};

        prodRuns.docs.forEach(doc => {
            const r = doc.data() || {};
            if (r.isActive === false) return;
            const pQty = Number(r.producedQty) || 0;
            const hKg = Number(r.huskConsumedKg) || 0;
            const pName = r.productName || r.transformationName || 'Husk Product';

            totalProduced += pQty;

            if (!yieldMap[pName]) yieldMap[pName] = { producedQty: 0, huskKg: 0 };
            yieldMap[pName].producedQty += pQty;
            yieldMap[pName].huskKg += hKg;
        });

        // 3. Procurement Spend
        let totalProcured = 0;
        cPurchases.docs.forEach(d => {
            const p = d.data() || {};
            if (p.isActive !== false) totalProcured += (Number(p.totalCost) || 0);
        });
        hPurchases.docs.forEach(d => {
            const h = d.data() || {};
            if (h.isActive !== false) totalProcured += (Number(h.totalCost) || 0);
        });

        // 4. Financial Statements KPIs
        const rev = window.CoconutModule.calcAccountBalance(journalEntries, '4-4010-01');
        const cogs = window.CoconutModule.calcAccountBalance(journalEntries, '5-5020-01');
        const opex = window.CoconutModule.calcAccountBalance(journalEntries, '5-5010-01');
        const interest = window.CoconutModule.calcAccountBalance(journalEntries, '5-5050-01');

        const grossProfit = rev - cogs;
        const netProfit = grossProfit - opex - interest;
        const marginPct = rev > 0 ? ((netProfit / rev) * 100).toFixed(1) : 0;

        // Populate Hero KPIs
        document.getElementById('repTotalSales').textContent = window.CoconutModule.fmtLKR(totalSales);
        document.getElementById('repTotalProduced').textContent = `${window.CoconutModule.fmt(totalProduced, 0)} units`;
        document.getElementById('repTotalProcured').textContent = window.CoconutModule.fmtLKR(totalProcured);
        document.getElementById('repNetMargin').textContent = `${marginPct}%`;
        document.getElementById('repNetProfitVal').textContent = `${window.CoconutModule.fmtLKR(netProfit)} net profit`;

        // Render Yield Table
        const yBody = document.getElementById('repYieldTableBody');
        const yEntries = Object.entries(yieldMap);
        if (!yEntries.length) {
            yBody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:20px; color:var(--c-text-muted);">No production runs found.</td></tr>';
        } else {
            yBody.innerHTML = yEntries.map(([name, data]) => {
                const ratio = data.producedQty > 0 ? (data.huskKg / data.producedQty).toFixed(1) : 0;
                return `
                    <tr>
                        <td><strong>${window.CoconutModule.esc(name)}</strong></td>
                        <td class="text-right" style="font-weight:700; color:#059669;">${window.CoconutModule.fmt(data.producedQty, 0)} units</td>
                        <td class="text-right">${window.CoconutModule.fmt(data.huskKg, 1)} kg</td>
                        <td class="text-right" style="font-weight:700;">${ratio} kg husk / unit</td>
                    </tr>
                `;
            }).join('');
        }

        // Render Product Contributions Table
        const pBody = document.getElementById('repProductContribBody');
        const pEntries = Object.entries(productMap).sort((a, b) => b[1].revenue - a[1].revenue);
        if (!pEntries.length) {
            pBody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding:20px; color:var(--c-text-muted);">No sales data available.</td></tr>';
        } else {
            pBody.innerHTML = pEntries.map(([name, data]) => {
                const share = totalSales > 0 ? ((data.revenue / totalSales) * 100).toFixed(1) : 0;
                return `
                    <tr>
                        <td><strong>${window.CoconutModule.esc(name)}</strong></td>
                        <td class="text-right">${window.CoconutModule.fmt(data.units, 0)}</td>
                        <td class="text-right" style="font-weight:700;">${window.CoconutModule.fmtLKR(data.revenue)}</td>
                        <td class="text-right" style="font-weight:800; color:var(--c-primary);">${share}%</td>
                    </tr>
                `;
            }).join('');
        }

        // Render Financial Performance Summary Table
        const fBody = document.getElementById('repFinancialSummaryBody');
        const cogsPct = rev > 0 ? ((cogs / rev) * 100).toFixed(1) : 0;
        const grossPct = rev > 0 ? ((grossProfit / rev) * 100).toFixed(1) : 0;
        const opexPct = rev > 0 ? ((opex / rev) * 100).toFixed(1) : 0;

        fBody.innerHTML = `
            <tr>
                <td><strong>Commercial Sales Revenue</strong></td>
                <td class="text-right" style="font-weight:700;">${window.CoconutModule.fmtLKR(rev)}</td>
                <td class="text-right">100.0%</td>
            </tr>
            <tr>
                <td>Cost of Goods Sold (COGS)</td>
                <td class="text-right" style="color:var(--c-text-muted);">${window.CoconutModule.fmtLKR(cogs)}</td>
                <td class="text-right">${cogsPct}%</td>
            </tr>
            <tr style="background:#f0fdf4; font-weight:800;">
                <td>GROSS PROFIT</td>
                <td class="text-right" style="color:#166534;">${window.CoconutModule.fmtLKR(grossProfit)}</td>
                <td class="text-right">${grossPct}%</td>
            </tr>
            <tr>
                <td>Operating Expenses & Overheads</td>
                <td class="text-right" style="color:var(--c-danger);">${window.CoconutModule.fmtLKR(opex)}</td>
                <td class="text-right">${opexPct}%</td>
            </tr>
            <tr>
                <td>Finance & Loan Interest Expense</td>
                <td class="text-right" style="color:var(--c-danger);">${window.CoconutModule.fmtLKR(interest)}</td>
                <td class="text-right">${rev > 0 ? ((interest / rev) * 100).toFixed(1) : 0}%</td>
            </tr>
            <tr style="background:#ecfdf5; font-weight:900; font-size:15px; border-top:2px solid #0f3b2c;">
                <td>NET OPERATING PROFIT</td>
                <td class="text-right" style="color:#0f3b2c;">${window.CoconutModule.fmtLKR(netProfit)}</td>
                <td class="text-right">${marginPct}%</td>
            </tr>
        `;

    } catch (e) {
        console.error('Reports data load error:', e);
    }
}
