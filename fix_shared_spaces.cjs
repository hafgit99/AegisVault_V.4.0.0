
const fs = require('fs');
let content = fs.readFileSync('src/components/dashboard/SharedSpacesModal.tsx', 'utf8');
const searchFunction = content.substring(content.indexOf('  const beginEdit ='), content.indexOf('  const addMember ='));
content = content.replace(searchFunction, '');
const insertPoint = content.indexOf('  useEffect(() => {');
content = content.substring(0, insertPoint) + searchFunction + content.substring(insertPoint);
fs.writeFileSync('src/components/dashboard/SharedSpacesModal.tsx', content);
console.log('Done!');

