/**
 * Vendor Assets Bundler Utility — DIGIBIZ
 * Downloads external CDN scripts to local public/assets/vendor/ directory for 100% offline usage.
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const vendorDir = path.resolve(__dirname, '../public/assets/vendor');
if (!fs.existsSync(vendorDir)) {
    fs.mkdirSync(vendorDir, { recursive: true });
}

const assets = [
    {
        url: 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
        dest: path.join(vendorDir, 'html2canvas.min.js')
    },
    {
        url: 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.all.min.js',
        dest: path.join(vendorDir, 'sweetalert2.all.min.js')
    },
    {
        url: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
        dest: path.join(vendorDir, 'firebase-app-compat.js')
    },
    {
        url: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js',
        dest: path.join(vendorDir, 'firebase-auth-compat.js')
    },
    {
        url: 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
        dest: path.join(vendorDir, 'firebase-firestore-compat.js')
    }
];

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const req = https.get(url, (response) => {
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                // Follow redirect
                return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                return reject(new Error(`Failed to download ${url}: Status Code ${response.statusCode}`));
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(() => {
                    console.log(`✅ Downloaded: ${path.basename(dest)} (${fs.statSync(dest).size} bytes)`);
                    resolve();
                });
            });
        });
        req.on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err);
        });
    });
}

async function run() {
    console.log('[VendorBundler] 📦 Downloading vendor assets for offline reliability...');
    for (const asset of assets) {
        await downloadFile(asset.url, asset.dest);
    }
    console.log('[VendorBundler] 🎉 All vendor scripts downloaded locally to public/assets/vendor/!');
}

run().catch(err => {
    console.error('[VendorBundler] Error:', err);
    process.exit(1);
});
