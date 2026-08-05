const fs = require('fs');
const content = fs.readFileSync('temp_form2.txt', 'utf8');
const tags = [];
const regex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;
let match;
let lineNum = 1;
const lines = content.split('\n');
lines.forEach((line, index) => {
  let m;
  while ((m = regex.exec(line)) !== null) {
    if (m[0].startsWith('</')) {
      if (tags.length === 0) {
        console.log(`Unmatched close tag at line ${index+1550}: ${m[0]}`);
      } else {
        const last = tags.pop();
        if (last.tag !== m[1]) {
          console.log(`Mismatched close tag at line ${index+1550}: expected ${last.tag}, got ${m[1]}`);
        }
      }
    } else if (!m[0].endsWith('/>')) {
      tags.push({ tag: m[1], line: index+1550 });
    }
  }
});
if (tags.length > 0) {
  console.log('Unmatched open tags:');
  tags.forEach(t => console.log(`${t.tag} at line ${t.line}`));
} else {
  console.log('All tags balanced!');
}
