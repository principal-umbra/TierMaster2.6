import fs from 'fs';
let code = fs.readFileSync('src/db/firebaseService.ts', 'utf8');

code = code.replace(
`          a.xpBreakdown = {
            performanceScore,
            attendanceScore,
            completedTickets,
            workingTickets,
            pendingTickets,`,
`          a.xpBreakdown = {
            performanceScore,
            attendanceScore,
            completedTickets,
            escalacionesCompletadas,
            escalacionesScore,
            visitasCompletadas,
            visitasScore,
            workingTickets,
            pendingTickets,`
);

fs.writeFileSync('src/db/firebaseService.ts', code);
