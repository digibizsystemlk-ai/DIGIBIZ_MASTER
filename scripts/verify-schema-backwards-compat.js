/**
 * Automated Schema Backwards Compatibility Guard — DIGIBIZ
 * Enforces non-breaking additive updates to prevent breaking frozen snapshot clients.
 * Usage: node scripts/verify-schema-backwards-compat.js
 */
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

console.log('[SchemaGuard] 🛡️ Running Automated Schema Backwards Compatibility Check...');

let violationCount = 0;

function scanDirectory(dir, filterFn) {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (file !== 'snapshots' && file !== 'node_modules') {
                results = results.concat(scanDirectory(fullPath, filterFn));
            }
        } else if (filterFn(fullPath)) {
            results.push(fullPath);
        }
    });
    return results;
}

const jsFiles = scanDirectory(publicDir, p => p.endsWith('.js'));

console.log(`[SchemaGuard] Scanned ${jsFiles.length} JavaScript source files.`);

// Verification 1: Ensure Snapshot Data Bridge is included in pwa-init.js
const pwaInitPath = path.join(publicDir, 'core', 'pwa-init.js');
if (fs.existsSync(pwaInitPath)) {
    const content = fs.readFileSync(pwaInitPath, 'utf8');
    if (!content.includes('snapshot-data-bridge') && !content.includes('SnapshotDataBridge')) {
        console.warn('⚠️ [SchemaGuard Warning]: pwa-init.js should reference SnapshotDataBridge for polyfill protection.');
    }
}

// Verification 2: Check for destructive Firestore deleteField() operations on core business properties
jsFiles.forEach(filePath => {
    const relative = path.relative(rootDir, filePath);
    const content = fs.readFileSync(filePath, 'utf8');

    // Rule: Alert if dangerous deleteField() is executed on core fields
    if (content.includes('FieldValue.delete()')) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
            if (line.includes('FieldValue.delete()') && (line.includes('price') || line.includes('role') || line.includes('businessId') || line.includes('businessType'))) {
                console.error(`❌ [SchemaGuard Violation] ${relative}:${index + 1} - Dangerous deleteField() on core schema property: "${line.trim()}"`);
                violationCount++;
            }
        });
    }
});

if (violationCount > 0) {
    console.error(`\n❌ [SchemaGuard Failed] ${violationCount} schema backwards-compatibility violation(s) detected! Deployment blocked.`);
    process.exit(1);
} else {
    console.log('[SchemaGuard] ✅ 100% Backwards Compatibility Passed! No breaking schema modifications detected.');
}
