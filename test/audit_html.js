const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');

// Parse page divs
const pages = indexHtml.match(/<div class="page"[^>]*id="page-([^"]+)"[\s\S]*?(?=<div class="page"|<\/main>)/g);
if (pages) {
  pages.forEach(p => {
    const idMatch = p.match(/id="page-([^"]+)"/);
    const pageId = idMatch ? idMatch[1] : 'unknown';
    console.log('=== PAGE: ' + pageId + ' ===');
    // Check if this page has hardcoded list items or rows
    const hardcodedItems = p.match(/<(tr|li|div)[^>]*class="[^"]*(item|card|row|entry)[^"]*"[^>]*>[\s\S]*?<\/\1>/gi);
    if (hardcodedItems) {
      console.log(`Found ${hardcodedItems.length} items in ${pageId}:`);
      hardcodedItems.slice(0, 3).forEach(item => {
        // filter out pure structural wrappers
        if (!item.includes('id=') && item.length > 50 && !item.includes('empty-state')) {
          console.log('  -> ' + item.replace(/\s+/g, ' ').slice(0, 120));
        }
      });
    }
  });
}
