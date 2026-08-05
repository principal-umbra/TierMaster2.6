import fs from 'fs';
let code = fs.readFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', 'utf8');

code = code.replace(
`                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Tickets ({selectedAgent.xpBreakdown.completedTickets})</span>
                            <span className="text-emerald-600 font-bold">+{selectedAgent.xpBreakdown.performanceScore} XP</span>
                          </div>`,
`                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Completados ({selectedAgent.xpBreakdown.completedTickets})</span>
                            <span className="text-emerald-600 font-bold">+{selectedAgent.xpBreakdown.completedTickets * settings.completedTickets} XP</span>
                          </div>`
);

code = code.replace(
`                          <div className="flex justify-between text-[12px] py-2 mt-2 border-t border-slate-200">
                            <span className="text-slate-900 font-black">Total XP Generado en Sprint</span>
                            <span className="text-indigo-600 font-black">{selectedAgent.xpBreakdown.performanceScore + selectedAgent.xpBreakdown.attendanceScore + ((selectedAgent.xpBreakdown as any).escalacionesScore || 0) + ((selectedAgent.xpBreakdown as any).visitasScore || 0) + (selectedAgent.xpBreakdown.sprintMetricsScore || 0) + eventosTotal} XP</span>
                          </div>`,
`                          <div className="flex justify-between text-[12px] py-2 mt-2 border-t border-slate-200">
                            <span className="text-slate-900 font-black">Total XP Generado en Sprint</span>
                            <span className="text-indigo-600 font-black">{(selectedAgent.xpBreakdown.completedTickets * settings.completedTickets) + selectedAgent.xpBreakdown.attendanceScore + ((selectedAgent.xpBreakdown as any).escalacionesScore || 0) + ((selectedAgent.xpBreakdown as any).visitasScore || 0) + (selectedAgent.xpBreakdown.sprintMetricsScore || 0) + eventosTotal} XP</span>
                          </div>`
);

fs.writeFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', code);
