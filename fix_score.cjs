const fs = require('fs');
let code = fs.readFileSync('src/db/firebaseService.ts', 'utf8');

const t = `          if (isStatusResolvedLocal(status)) {
            completedTickets++;
            performanceScore += lbSettings.completedTickets;
          } else if (isStatusInProgressLocal(status)) {
            workingTickets++;
            performanceScore += lbSettings.workingTickets;
          } else {
            pendingTickets++;
            performanceScore += lbSettings.pendingTickets;
          }`;
          
const r = `          if (isStatusResolvedLocal(status)) {
            completedTickets++;
            performanceScore += lbSettings.completedTickets;
          } else if (isStatusInProgressLocal(status)) {
            workingTickets++;
            // performanceScore += lbSettings.workingTickets; // No longer rewarded
          } else {
            pendingTickets++;
            // performanceScore += lbSettings.pendingTickets; // No longer rewarded
          }`;

if (!code.includes(t)) {
   console.log("Not found score logic!");
} else {
   code = code.replace(t, r);
   fs.writeFileSync('src/db/firebaseService.ts', code);
   console.log("Score logic updated!");
}
