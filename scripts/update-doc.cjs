const fs = require('fs');
const path = require('path');

const docFile = path.join(__dirname, '..', 'docs', '2026-04-04_AEGIS_V5_YOL_HARITASI_VE_ANALIZ_TR.md');
let content = fs.readFileSync(docFile, 'utf8');

// Update test count
content = content.replace(
  '| **Test Dosyalar\u0131** | 15+ |',
  '| **Test Dosyalar\u0131** | 64 |'
);

// Update test coverage info  
content = content.replace(
  '| Test Kapsam\u0131 | ~40% | %80+ |',
  '| Test Kapsam\u0131 | %60+ (447 test, 64 dosya) | %80+ |'
);

fs.writeFileSync(docFile, content, 'utf8');
console.log('Doc updated');