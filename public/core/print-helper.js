/**
 * DIGIBIZ Global Print Helper Utility
 * Reads saved print settings (58mm, 80mm, A5, A4) and formats invoices dynamically across all modules.
 */
(function() {
    window.digibizPrintHelper = {
        getSettings: function() {
            try {
                const local = localStorage.getItem('digibiz_print_settings');
                if (local) return JSON.parse(local);
            } catch (e) {}

            // Default Fallback Print Settings
            return {
                paperType: '80mm',
                printerPreset: 'GENERIC_THERMAL',
                fontSize: '12',
                showLogo: true,
                showQr: true,
                itemized: true,
                autoCut: true,
                footerNote: 'Thank you for your business!',
                copies: '1'
            };
        },

        printInvoice: function(data) {
            const s = this.getSettings();
            const printWin = window.open('', '_blank', 'width=450,height=700');
            if (!printWin) {
                alert('Pop-up blocked. Please allow pop-ups for this site to print invoices.');
                return;
            }

            const itemsRows = (data.items || []).map((it, idx) => {
                const name = it.productName || it.name || 'Item';
                const code = it.productCode ? ` [${it.productCode}]` : '';
                const qty = Number(it.orderedQty != null ? it.orderedQty : it.qty) || 0;
                const free = Number(it.freeQty) || 0;
                const price = Number(it.unitPrice || 0);
                const total = Number(it.total != null ? it.total : it.lineTotal) || (qty * price);

                return `
                    <tr>
                        <td style="padding:6px 0; border-bottom:1px solid #e2e8f0; vertical-align:top;">
                            <strong>${idx + 1}. ${escapeHtml(name + code)}</strong>
                            ${s.itemized ? `<div style="font-size:0.85em; color:#475569;">@ Rs. ${price.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>` : ''}
                            ${free > 0 ? `<div style="color:#15803d; font-weight:bold; font-size:0.8em;">+ ${free} FREE ISSUE</div>` : ''}
                        </td>
                        <td style="text-align:center; padding:6px 0; border-bottom:1px solid #e2e8f0; vertical-align:top; font-weight:bold;">
                            ${qty}
                        </td>
                        <td style="text-align:right; padding:6px 0; border-bottom:1px solid #e2e8f0; vertical-align:top; font-weight:bold;">
                            Rs. ${total.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                    </tr>
                `;
            }).join('');

            const bizTitle = data.bizName || 'DIGIBIZ POS';
            const dt = data.date || new Date().toLocaleString();
            const invNo = data.invoiceNo || 'INV-001';
            const grandTotal = Number(data.grandTotal || data.totalAmount || 0);

            let paperWidthCss = '360px';
            if (s.paperType === '58mm') paperWidthCss = '230px';
            else if (s.paperType === '80mm') paperWidthCss = '340px';
            else if (s.paperType === 'A5') paperWidthCss = '480px';
            else if (s.paperType === 'A4') paperWidthCss = '650px';

            printWin.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Invoice #${invNo}</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { font-family: ${s.paperType.startsWith('A') ? "'Inter', sans-serif" : "'Courier New', monospace"}; font-size: ${s.fontSize}px; padding: 12px; color: #000; width: 100%; max-width: ${paperWidthCss}; margin: 0 auto; background: #fff; }
                        .header { text-align: center; margin-bottom: 8px; }
                        .header h2 { margin: 0 0 2px 0; font-size: 1.4em; text-transform: uppercase; font-weight: 800; }
                        .line { border-bottom: 1px dashed #000; margin: 8px 0; }
                        table { width: 100%; border-collapse: collapse; margin: 8px 0; }
                        .total-row { display: flex; justify-content: space-between; font-weight: 800; font-size: 1.3em; margin: 8px 0; }
                        .no-print { margin-bottom: 12px; text-align: center; }
                        @media print { .no-print { display: none; } }
                    </style>
                </head>
                <body>
                    <div class="no-print">
                        <button onclick="window.print()" style="background:#0f766e; color:#fff; border:none; padding:10px 20px; font-weight:bold; border-radius:8px; cursor:pointer;">🖨️ PRINT INVOICE NOW</button>
                    </div>
                    
                    <div class="header">
                        <h2>${escapeHtml(bizTitle)}</h2>
                        <div style="font-weight:bold; font-size:0.9em;">SALES INVOICE</div>
                    </div>

                    <div class="line"></div>

                    <div style="line-height:1.4; font-size:0.95em;">
                        <div>Inv #: <strong>${invNo}</strong></div>
                        <div>Date: <strong>${dt}</strong></div>
                        ${data.customerName ? `<div>Customer: <strong>${escapeHtml(data.customerName)}</strong></div>` : ''}
                        ${data.repName ? `<div>Rep: <strong>${escapeHtml(data.repName)}</strong></div>` : ''}
                        ${data.paymentMethod ? `<div>Payment: <strong>${escapeHtml(data.paymentMethod)}</strong></div>` : ''}
                    </div>

                    <div class="line"></div>

                    <table>
                        <thead>
                            <tr style="border-bottom:1px solid #000; text-align:left; font-size:0.9em;">
                                <th>ITEM</th>
                                <th style="text-align:center;">QTY</th>
                                <th style="text-align:right;">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody>${itemsRows}</tbody>
                    </table>

                    <div class="line"></div>

                    <div class="total-row">
                        <span>TOTAL:</span>
                        <span>Rs. ${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                    </div>

                    <div class="line"></div>

                    <div style="text-align:center; font-size:0.85em; margin-top:8px;">
                        ${escapeHtml(s.footerNote || 'Thank you for your business!')}
                    </div>
                </body>
                </html>
            `);
            printWin.document.close();
        }
    };

    function escapeHtml(s) {
        if (s == null) return '';
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
})();
