/**
 * MW Trading — parse "New Balance Stock Report" style PDF text lines.
 * Format: {row#} {BRAND} {CODE} {DESCRIPTION...} {UNIT PRICE}
 * Some rows merge brand+code: FLEXOFFICE12170101
 * Selling = unit price from PDF; buying = unitPrice * 0.93; stock import = 0.
 */
(function (global) {
    function normalizeMwPdfLine(raw) {
        if (!raw) return '';
        let s = String(raw).replace(/\t/g, ' ').replace(/\r/g, '').trim();
        s = s.replace(/\s+Page\s+\d+\s+of\s+\d+/i, '').trim();
        s = s.replace(/--\s*\d+\s+of\s*\d+\s*--/gi, '').trim();
        return s.replace(/\s+/g, ' ').trim();
    }

    function parsePriceToken(tok) {
        if (tok == null) return NaN;
        const t = String(tok).replace(/,/g, '').replace(/\s/g, '');
        const n = parseFloat(t);
        return Number.isFinite(n) ? n : NaN;
    }

    /**
     * @returns {{ rowIndex:number, brand:string, productCode:string, name:string, unitPrice:number, buyingPrice:number } | null}
     */
    function parseMwPriceListLine(lineRaw) {
        const line = normalizeMwPdfLine(lineRaw);
        if (!line || line.length < 12) return null;
        if (/^(NO\s+BRAND|NO\s+ITEM|NO\s+NEW|ITEM\s+UNIT|UNIT\s+PRICE|QUANTITY|AMOUNT)/i.test(line)) return null;
        if (/^(SUN\s+TOTAL|DISCOUNT|NET\s+VALUE|SUB\s*TOTAL)/i.test(line)) return null;
        if (/^DOMS\s*$/i.test(line) || /^AMIGO\s*$/i.test(line) || /^SPEED\s*$/i.test(line) || /^LINC\s*$/i.test(line)) return null;
        const parts = line.split(' ');
        if (parts.length < 4) return null;
        const idx = parseInt(parts[0], 10);
        if (!(idx >= 1 && idx <= 999999)) return null;

        let brand;
        let code;
        let restStart;
        const p1 = parts[1];
        const merged = p1.match(/^([A-Za-z]+)(\d{4,})$/);
        if (merged) {
            brand = merged[1].toUpperCase();
            code = merged[2];
            restStart = 2;
        } else {
            brand = String(p1).toUpperCase();
            code = parts[2];
            if (!/^\d{4,}$/.test(code)) return null;
            restStart = 3;
        }

        const tail = parts.slice(restStart);
        if (tail.length < 2) return null;
        const unitPrice = parsePriceToken(tail[tail.length - 1]);
        if (!(unitPrice > 0) || unitPrice > 10000000) return null;
        const name = tail.slice(0, -1).join(' ').trim();
        if (name.length < 2) return null;
        if (/^(ITEM|UNIT|PRICE|QUANTITY|AMOUNT)$/i.test(name)) return null;

        const buyingPrice = Math.round(unitPrice * 0.93 * 100) / 100;
        return { rowIndex: idx, brand, productCode: code, name, unitPrice, buyingPrice };
    }

    function parseMwPriceListFromLines(lines) {
        const seen = new Map();
        const out = [];
        (lines || []).forEach((line) => {
            const row = parseMwPriceListLine(line);
            if (!row) return;
            const key = row.brand + '|' + row.productCode;
            seen.set(key, row);
        });
        seen.forEach((v) => out.push(v));
        out.sort((a, b) => a.rowIndex - b.rowIndex || a.name.localeCompare(b.name));
        return out;
    }

    function parseMwPriceListText(fullText) {
        const lines = String(fullText || '').split(/\n/);
        return parseMwPriceListFromLines(lines);
    }

    /**
     * Requires global pdfjsLib (pdf.js v3 UMD build) and workerSrc set.
     * @param {ArrayBuffer} arrayBuffer
     * @returns {Promise<string[]>}
     */
    async function extractPdfLinesWithPdfJs(arrayBuffer) {
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('pdf.js (pdfjsLib) is not loaded');
        }
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const allLines = [];
        for (let pnum = 1; pnum <= pdf.numPages; pnum++) {
            const page = await pdf.getPage(pnum);
            const tc = await page.getTextContent();
            const byY = {};
            for (let i = 0; i < tc.items.length; i++) {
                const it = tc.items[i];
                const str = it.str != null ? String(it.str) : '';
                if (!str.trim()) continue;
                const y = Math.round(it.transform[5]);
                if (!byY[y]) byY[y] = [];
                byY[y].push({ x: it.transform[4], str });
            }
            const ys = Object.keys(byY).map(Number).sort((a, b) => b - a);
            for (let yi = 0; yi < ys.length; yi++) {
                const y = ys[yi];
                byY[y].sort((a, b) => a.x - b.x);
                const line = byY[y].map((o) => o.str).join(' ').replace(/\s+/g, ' ').trim();
                if (line) allLines.push(line);
            }
        }
        return allLines;
    }

    global.MwPdfProductParser = {
        normalizeMwPdfLine,
        parseMwPriceListLine,
        parseMwPriceListFromLines,
        parseMwPriceListText,
        extractPdfLinesWithPdfJs
    };
})(typeof window !== 'undefined' ? window : globalThis);
