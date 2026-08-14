/**
 * Zero Impact Snapshot Generator Utility — DIGIBIZ
 * Usage: node scripts/create-snapshot.js <versionTag>
 */
const fs = require('fs');
const path = require('path');

const versionTag = process.argv[2] || 'STABLE_FREEZE_2026_08_11';
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const targetSnapshotDir = path.join(publicDir, 'snapshots', versionTag);
const targetShortAliasDir = path.join(publicDir, 'v2026_08_11');

console.log(`[SnapshotGenerator] 📸 Creating frozen snapshot for version: "${versionTag}"...`);
console.log(`[SnapshotGenerator] Target directories:\n -> ${targetSnapshotDir}\n -> ${targetShortAliasDir}`);

const dirsToCopy = ['admin', 'core', 'modules', 'css', 'scripts', 'icons', 'assets'];
const filesToCopy = ['sw.js', 'manifest.json', 'favicon.ico', 'index.html'];

function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
            if (childItemName === 'snapshots' || childItemName === 'v2026_08_11') return;
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        const destDir = path.dirname(dest);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
    }
}

try {
    // 1. Copy into /snapshots/STABLE_FREEZE_2026_08_11/
    if (!fs.existsSync(targetSnapshotDir)) {
        fs.mkdirSync(targetSnapshotDir, { recursive: true });
    }
    dirsToCopy.forEach(dirName => {
        const srcPath = path.join(publicDir, dirName);
        const destPath = path.join(targetSnapshotDir, dirName);
        if (fs.existsSync(srcPath)) copyRecursiveSync(srcPath, destPath);
    });
    filesToCopy.forEach(fileName => {
        const srcPath = path.join(publicDir, fileName);
        const destPath = path.join(targetSnapshotDir, fileName);
        if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, destPath);
    });

    // 2. Copy into short alias /v2026_08_11/ for clean URLs
    if (!fs.existsSync(targetShortAliasDir)) {
        fs.mkdirSync(targetShortAliasDir, { recursive: true });
    }
    dirsToCopy.forEach(dirName => {
        const srcPath = path.join(publicDir, dirName);
        const destPath = path.join(targetShortAliasDir, dirName);
        if (fs.existsSync(srcPath)) copyRecursiveSync(srcPath, destPath);
    });
    filesToCopy.forEach(fileName => {
        const srcPath = path.join(publicDir, fileName);
        const destPath = path.join(targetShortAliasDir, fileName);
        if (fs.existsSync(srcPath)) fs.copyFileSync(srcPath, destPath);
    });

    // Write snapshot metadata manifest
    const metaPayload = {
        versionTag: versionTag,
        createdDate: new Date().toISOString(),
        snapshotPath: `/v2026_08_11/`
    };
    fs.writeFileSync(path.join(targetSnapshotDir, 'snapshot-meta.json'), JSON.stringify(metaPayload, null, 2));
    fs.writeFileSync(path.join(targetShortAliasDir, 'snapshot-meta.json'), JSON.stringify(metaPayload, null, 2));

    console.log(`[SnapshotGenerator] ✅ Snapshot "${versionTag}" & short alias "/v2026_08_11/" generated successfully!`);
} catch (err) {
    console.error(`[SnapshotGenerator] ❌ Failed to generate snapshot:`, err);
    process.exit(1);
}
