import fs from 'fs';
let code = fs.readFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', 'utf8');

code = code.replace(
`                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Escalaciones ({(selectedAgent.xpBreakdown as any).escalacionesCompletadas || 0} x {settings.completedEscalations || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).escalacionesScore || 0} XP</span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Visitas ({(selectedAgent.xpBreakdown as any).visitasCompletadas || 0} x {settings.completedVisits || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).visitasScore || 0} XP</span>
                          </div>`,
`                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Escalaciones ({(selectedAgent.xpBreakdown as any).escalacionesCompletadas || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).escalacionesScore || 0} XP</span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Visitas ({(selectedAgent.xpBreakdown as any).visitasCompletadas || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).visitasScore || 0} XP</span>
                          </div>`
);

fs.writeFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', code);
