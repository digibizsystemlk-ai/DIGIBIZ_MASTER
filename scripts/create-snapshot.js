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

console.log(`[SnapshotGenerator] 📸 Creating frozen snapshot for version: "${versionTag}"...`);
console.log(`[SnapshotGenerator] Target directory: ${targetSnapshotDir}`);

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
            if (childItemName === 'snapshots') return; // Exclude snapshots directory from recursive copy
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
    if (!fs.existsSync(targetSnapshotDir)) {
        fs.mkdirSync(targetSnapshotDir, { recursive: true });
    }

    dirsToCopy.forEach(dirName => {
        const srcPath = path.join(publicDir, dirName);
        const destPath = path.join(targetSnapshotDir, dirName);
        if (fs.existsSync(srcPath)) {
            console.log(` -> Copying directory: ${dirName}`);
            copyRecursiveSync(srcPath, destPath);
        }
    });

    filesToCopy.forEach(fileName => {
        const srcPath = path.join(publicDir, fileName);
        const destPath = path.join(targetSnapshotDir, fileName);
        if (fs.existsSync(srcPath)) {
            console.log(` -> Copying file: ${fileName}`);
            fs.copyFileSync(srcPath, destPath);
        }
    });

    // Write snapshot metadata manifest
    const metaPayload = {
        versionTag: versionTag,
        createdDate: new Date().toISOString(),
        snapshotPath: `/snapshots/${versionTag}/`
    };
    fs.writeFileSync(path.join(targetSnapshotDir, 'snapshot-meta.json'), JSON.stringify(metaPayload, null, 2));

    console.log(`[SnapshotGenerator] ✅ Snapshot "${versionTag}" generated successfully!`);
} catch (err) {
    console.error(`[SnapshotGenerator] ❌ Failed to generate snapshot:`, err);
    process.exit(1);
}
