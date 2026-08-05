import fs from 'fs';
let code = fs.readFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', 'utf8');

code = code.replace(
`                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Tickets</span>
                      <span className="text-lg font-display font-black text-indigo-700">{selectedAgent.xpBreakdown?.completedTickets || 0}</span>
                    </div>`,
`                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Completados</span>
                      <span className="text-lg font-display font-black text-indigo-700">{selectedAgent.xpBreakdown?.completedTickets || 0}</span>
                    </div>`
);

fs.writeFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', code);
