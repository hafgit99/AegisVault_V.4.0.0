const fs = require('fs');
const content = fs.readFileSync('reports/mutation/mutation.json', 'utf-8');
const data = JSON.parse(content);
Object.keys(data.files)
  .filter((f) => f.includes('WebAuthnService'))
  .forEach((file) => {
    const mutants = data.files[file].mutants;
    const survived = mutants.filter((m) => m.status === 'Survived' || m.status === 'NoCoverage');
    if (survived.length > 0) {
      console.log('\n--- ' + file + ' ---');
      survived.forEach((m) => {
        let snippet = m.replacement || m.mutatorName;
        if (snippet.length > 50) snippet = snippet.slice(0, 50) + '...';
        console.log(`Line ${m.location.start.line}: ${m.mutatorName} - ${snippet}`);
      });
      console.log('Total survived: ' + survived.length);
    }
  });
