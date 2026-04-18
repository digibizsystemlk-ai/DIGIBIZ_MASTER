const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');
const admin = require('firebase-admin');

const MW_BUSINESS_ID = 'YRMbB6aq4CMevSrLWkQvoVMtc8b2';
const PDF_PATH = 'C:\\Users\\bizsi\\AppData\\Roaming\\Cursor\\User\\workspaceStorage\\cc4ad7e82105f31a6fce4fd51a316f11\\pdfs\\975c019a-d897-468c-a77f-c7dabbd7b57c\\New Balance Stock Report.pdf';
const SERVICE_ACCOUNT_PATH = path.join(__dirname, '..', 'serviceAccountKey.json');

function normalizeLine(line) {
  return String(line || '')
    .replace(/\t+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parsePrice(raw) {
  return Number(String(raw).replace(/,/g, ''));
}

function decodePdfText(value) {
  const raw = String(value || '');
  try {
    return decodeURIComponent(raw);
  } catch (e) {
    return raw;
  }
}

function parseRows(pdfText) {
  const lines = String(pdfText || '')
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean);

  const results = [];
  const seen = new Set();

  for (const line of lines) {
    if (/^NO BRAND NEW CODE/i.test(line)) continue;
    if (/^NO ITEM UNIT PRICE/i.test(line)) continue;
    if (/^BALANCE STOCK SHEET/i.test(line)) continue;
    if (/^Page \d+ of \d+/i.test(line)) continue;
    if (/^-- \d+ of \d+ --/.test(line)) continue;
    if (/^(Sun Total|Discount %|Amount|Net Value)$/i.test(line)) continue;

    const m = line.match(/^(\d+)\s+([A-Za-z]+)\s+([0-9A-Za-z]+)\s+(.+)\s+([0-9][0-9,]*\.?[0-9]*)$/);
    if (!m) continue;

    const rowNo = Number(m[1]);
    const brand = m[2].toUpperCase();
    const productCode = m[3].toUpperCase();
    const name = m[4].trim();
    const unitPrice = parsePrice(m[5]);
    if (!name || !Number.isFinite(unitPrice) || unitPrice <= 0) continue;

    const key = `${brand}::${productCode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    results.push({
      rowNo,
      brand,
      productCode,
      name,
      unitPrice,
      buyingPrice: Number((unitPrice * 0.93).toFixed(2))
    });
  }

  return results;
}

function productDocId(brand, code) {
  const safeBrand = String(brand).replace(/[^A-Za-z0-9_-]/g, '');
  const safeCode = String(code).replace(/[^A-Za-z0-9_-]/g, '');
  return `MW_${safeBrand}_${safeCode}`;
}

async function main() {
  if (!fs.existsSync(PDF_PATH)) {
    throw new Error(`PDF not found: ${PDF_PATH}`);
  }
  if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    throw new Error(`serviceAccountKey not found: ${SERVICE_ACCOUNT_PATH}`);
  }

  const serviceAccount = require(SERVICE_ACCOUNT_PATH);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  const rows = await new Promise((resolve, reject) => {
    const parser = new PDFParser();
    parser.on('pdfParser_dataError', (err) => reject(new Error(err?.parserError || 'PDF parse error')));
    parser.on('pdfParser_dataReady', (data) => {
      const pages = Array.isArray(data?.Pages) ? data.Pages : [];
      const normalizedRows = [];

      for (let pIndex = 0; pIndex < pages.length; pIndex++) {
        const page = pages[pIndex];
        const texts = Array.isArray(page.Texts) ? page.Texts : [];
        const rowsByY = {};

        for (const text of texts) {
          const y = Number(text.y || 0);
          const bucket = (Math.round(y * 5) / 5).toFixed(1);
          const x = Number(text.x || 0);
          const value = (text.R || [])
            .map((r) => decodePdfText(r.T || ''))
            .join('');
          if (!rowsByY[bucket]) rowsByY[bucket] = [];
          rowsByY[bucket].push({ x, value });
        }

        const rowKeys = Object.keys(rowsByY).sort((a, b) => Number(a) - Number(b));
        for (const key of rowKeys) {
          const parts = rowsByY[key]
            .sort((a, b) => a.x - b.x)
            .map((entry) => entry.value);
          const line = normalizeLine(parts.join(' '));
          if (line) normalizedRows.push(line);
        }
      }

      resolve(parseRows(normalizedRows.join('\n')));
    });
    parser.loadPDF(PDF_PATH);
  });

  if (!rows.length) {
    throw new Error('No products parsed from PDF.');
  }

  await db.collection('businesses').doc(MW_BUSINESS_ID).set(
    { businessType: 'distributor' },
    { merge: true }
  );

  let imported = 0;
  let skipped = 0;
  const batchSize = 300;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const batch = db.batch();
    for (const row of chunk) {
      const docId = productDocId(row.brand, row.productCode);
      const ref = db.collection('products').doc(docId);
      const nestedRef = db.collection('products').doc(MW_BUSINESS_ID).collection('list').doc(docId);
      const bizScopedRef = db.collection('businesses').doc(MW_BUSINESS_ID).collection('products').doc(docId);
      const payload = {
        businessId: MW_BUSINESS_ID,
        name: row.name,
        brand: row.brand,
        productCode: row.productCode,
        category: 'MW Price List',
        unitPrice: row.unitPrice,
        buyingPrice: row.buyingPrice,
        currentStock: 0,
        stock: 0,
        minStockLevel: 10,
        isActive: true,
        importedFromMwPdf: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      batch.set(ref, payload, { merge: true });
      batch.set(nestedRef, payload, { merge: true });
      batch.set(bizScopedRef, payload, { merge: true });
      imported++;
    }
    await batch.commit();
  }

  const verifySnap = await db.collection('products')
    .where('businessId', '==', MW_BUSINESS_ID)
    .where('importedFromMwPdf', '==', true)
    .get();
  const verifyNestedSnap = await db.collection('products').doc(MW_BUSINESS_ID).collection('list').get();
  const verifyBizScopedSnap = await db.collection('businesses').doc(MW_BUSINESS_ID).collection('products').get();

  console.log(`Parsed rows: ${rows.length}`);
  console.log(`Upserted rows: ${imported}`);
  console.log(`Skipped rows: ${skipped}`);
  console.log(`Verified MW imported products in Firestore: ${verifySnap.size}`);
  console.log(`Verified nested products list docs: ${verifyNestedSnap.size}`);
  console.log(`Verified businesses/{MW}/products docs: ${verifyBizScopedSnap.size}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Import failed:', err.message);
    process.exit(1);
  });
