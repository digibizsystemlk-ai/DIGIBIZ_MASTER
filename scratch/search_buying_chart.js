const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../public/modules/admin/scrap-buying.html');
const content = fs.readFileSync(filePath, 'utf8');

console.log("=== Searching scrap-buying.html ===");
const lines = content.split('\n');
lines.forEach((line, index) => {
    if (line.toLowerCase().includes('chart') || line.toLowerCase().includes('canvas')) {
        console.log(`Line ${index + 1}: ${line.trim()}`);
    }
});
