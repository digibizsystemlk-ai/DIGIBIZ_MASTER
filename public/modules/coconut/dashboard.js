/**
 * Coconut Wholesale Module — Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', async () => {
    const ctx = await window.CoconutModule.guardCoconutPage();
    if (!ctx) return;

    window.CoconutModule.renderNav('dashboard');
    await loadDashboardData(ctx);
});

async function loadDashboardData(ctx) {
    try {
        const metrics = await window.CoconutModule.getMetrics(ctx);

        // Update Hero
        document.getElementById('kpiMonthProfit').textContent = window.CoconutModule.fmtLKR(metrics.monthProfit || 0);
        const totalInv = (metrics.rmStockValue || 0) + (metrics.fgStockValue || 0);
        document.getElementById('kpiTotalInventoryVal').textContent = window.CoconutModule.fmtLKR(totalInv);
        document.getElementById('kpiCashFlow').textContent = window.CoconutModule.fmtLKR(metrics.cashFlow || 0);

        // Update KPI Grid
        document.getElementById('kpiTodayCoconutQty').textContent = `${window.CoconutModule.fmt(metrics.todayCoconutPurchaseCount, 0)} nuts`;
        document.getElementById('kpiMonthCoconutQty').textContent = `Month: ${window.CoconutModule.fmt(metrics.monthCoconutPurchaseCount, 0)} nuts (Rs. ${window.CoconutModule.fmt(metrics.monthPurchaseCost)})`;

        document.getElementById('kpiCoconutStockQty').textContent = `${window.CoconutModule.fmt(metrics.coconutStockQty, 0)} nuts`;
        document.getElementById('kpiRmVal').textContent = `Val: ${window.CoconutModule.fmtLKR(metrics.rmStockValue || 0)}`;

        document.getElementById('kpiHuskStockKg').textContent = `${window.CoconutModule.fmt(metrics.huskStockQty, 1)} kg`;

        document.getElementById('kpiTodaySales').textContent = window.CoconutModule.fmtLKR(metrics.todaySales || 0);
        document.getElementById('kpiMonthSales').textContent = `Month: ${window.CoconutModule.fmtLKR(metrics.monthSales || 0)}`;

        document.getElementById('kpiMonthProduction').textContent = `${window.CoconutModule.fmt(metrics.monthProductionCount, 0)} units`;
        document.getElementById('kpiTodayProduction').textContent = `Today: ${window.CoconutModule.fmt(metrics.todayProductionCount, 0)} units`;

        document.getElementById('kpiFgVal').textContent = window.CoconutModule.fmtLKR(metrics.fgStockValue || 0);

        document.getElementById('kpiReceivables').textContent = window.CoconutModule.fmtLKR(metrics.customerReceivables || 0);
        document.getElementById('kpiPayables').textContent = window.CoconutModule.fmtLKR(metrics.supplierPayables || 0);

        // Render Charts
        if (metrics.trendLabels30) {
            window.CoconutModule.drawLineChart('trendChart', metrics.trendLabels30, [
                { name: 'Sales', data: metrics.trendSales30, color: '#059669' },
                { name: 'Purchases', data: metrics.trendCoconutPurchases30, color: '#dc2626' },
                { name: 'Profit', data: metrics.trendProfit30, color: '#0284c7' }
            ]);
        }

        if (metrics.paymentSplitPurchases) {
            const pModes = ['CASH', 'CREDIT', 'CHEQUE', 'BANK'];
            const pData = pModes.map(m => metrics.paymentSplitPurchases[m] || 0);
            window.CoconutModule.drawBarChart('purchasesSplitChart', pModes, pData, '#dc2626');
        }

        if (metrics.paymentSplitSales) {
            const sModes = ['CASH', 'CREDIT', 'CHEQUE', 'BANK'];
            const sData = sModes.map(m => metrics.paymentSplitSales[m] || 0);
            window.CoconutModule.drawBarChart('salesSplitChart', sModes, sData, '#059669');
        }

        // Render Recent Activity
        const body = document.getElementById('recentActivityBody');
        if (metrics.recentActivity && metrics.recentActivity.length) {
            body.innerHTML = metrics.recentActivity.map(act => {
                let badgeClass = 'c-badge-neutral';
                if (act.badge === 'purchase') badgeClass = 'c-badge-warning';
                if (act.badge === 'production') badgeClass = 'c-badge-info';
                if (act.badge === 'sale') badgeClass = 'c-badge-success';

                return `
                    <tr>
                        <td style="font-size:12px; color:var(--c-text-muted);">${window.CoconutModule.formatDateTime(act.date)}</td>
                        <td><span class="c-badge ${badgeClass}">${window.CoconutModule.esc(act.type)}</span></td>
                        <td style="font-weight:700;">${window.CoconutModule.esc(act.title)}</td>
                        <td>${window.CoconutModule.esc(act.party)}</td>
                        <td class="text-right" style="font-weight:800; color:var(--c-primary);">${window.CoconutModule.fmtLKR(act.amount)}</td>
                    </tr>
                `;
            }).join('');
        } else {
            body.innerHTML = `<tr><td colspan="5" class="text-center" style="padding:24px; color:var(--c-text-muted);">No operations recorded yet. Start by recording a coconut or husk purchase!</td></tr>`;
        }

    } catch (err) {
        console.error('[Dashboard Error]', err);
        window.CoconutModule.showToast('Failed to load dashboard metrics', 'error');
    }
}
