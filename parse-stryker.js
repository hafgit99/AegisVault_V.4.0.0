const fs = require('fs');
const content = fs.readFileSync('reports/mutation/mutation.html', 'utf-8');
const match = content.match(/window\.mutationTestReportData = (.*?);<\/script>/);
if (match) {
  const data = JSON.parse(match[1]);
  Object.keys(data.files).forEach((file) => {
    const mutants = data.files[file].mutants;
    const survived = mutants.filter((m) => m.status === 'Survived' || m.status === 'NoCoverage');
    if (survived.length > 0) {
      console.log('\n--- ' + file + ' ---');
      survived.slice(0, 10).forEach((m) => {
        let snippet = m.replacement.replace(/\n/g, ' ');
        if (snippet.length > 50) snippet = snippet.slice(0, 50) + '...';
        console.log(`Line ${m.location.start.line}: ${m.mutatorName} - ${snippet}`);
      });
      if (survived.length > 10) console.log('...and ' + (survived.length - 10) + ' more');
    }
  });
} else {
  console.log('No data found');
}
