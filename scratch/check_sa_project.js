const fs = require('fs');
const path = require('path');

try {
    const sa = JSON.parse(fs.readFileSync(path.join(__dirname, '../serviceAccountKey.json'), 'utf8'));
    console.log("Service Account Project ID:", sa.project_id);
} catch (e) {
    console.error("Error reading service account key:", e);
}
