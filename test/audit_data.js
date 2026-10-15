const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appJs = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const lines = appJs.split('\n');

console.log('=== SEARCHING FOR HARDCODED FALLBACKS IN APP.JS ===');
lines.forEach((l, i) => {
  if (/\|\|\s*['"0-9]/.test(l) && !/\|\|\s*''|\|\|\s*0\b|\|\|\s*null|\|\|\s*false|\|\|\s*'#|\|\|\s*\[\]/.test(l)) {
    console.log(`${i + 1}: ${l.trim()}`);
  }
});
