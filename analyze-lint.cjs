const fs = require('fs');
const path = require('path');
const file = fs.readFileSync(path.join(__dirname, 'lint-results.json'), 'utf-8');
const results = JSON.parse(file);

const errorRules = {};
const fileErrors = [];

for (const result of results) {
  if (result.errorCount > 0) {
    for (const msg of result.messages) {
      if (msg.severity === 2) {
        // Error
        const ruleId = msg.ruleId || 'unknown';
        errorRules[ruleId] = (errorRules[ruleId] || 0) + 1;
        fileErrors.push(
          `${result.filePath}:${msg.line}:${msg.column} - ${msg.message} [${ruleId}]`
        );
      }
    }
  }
}

let out = '--- ERROR RULE COUNTS ---\n';
for (const [ruleId, count] of Object.entries(errorRules).sort((a, b) => b[1] - a[1])) {
  out += `${ruleId}: ${count}\n`;
}

out += '\n--- TOP 100 ERRORS ---\n';
out += fileErrors.slice(0, 100).join('\n');

fs.writeFileSync(path.join(__dirname, 'lint-analysis.txt'), out, 'utf-8');
