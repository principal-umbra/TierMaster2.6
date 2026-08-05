const fs = require('fs');
let code = fs.readFileSync('src/db/firebaseService.ts', 'utf8');

const t = `          // Convert current date in local timezone to YYYY-MM-DD
          const todayStr = new Date().toLocaleDateString('en-CA');
          if (att.fecha && att.fecha > todayStr) {
             isFuture = true;
          }`;

const r = `          // Convert current date in local timezone to YYYY-MM-DD
          const todayStr = new Date().toLocaleDateString('en-CA');
          if ((att.fecha && att.fecha > todayStr) || !att.fecha || att.fecha.trim() === '') {
             isFuture = true;
          }`;

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/db/firebaseService.ts', code);
  console.log('Fixed missing fecha penalty!');
} else {
  console.log('Not found!');
}
