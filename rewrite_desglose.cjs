const fs = require('fs');
const file = 'src/components/leaderboard/LeaderboardAdminSettings.tsx';
let content = fs.readFileSync(file, 'utf8');

const completados = `                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Completados ({selectedAgent.xpBreakdown.completedTickets})</span>
                            <span className="text-emerald-600 font-bold">+{selectedAgent.xpBreakdown.performanceScore - ((selectedAgent.xpBreakdown as any).escalacionesScore || 0) - ((selectedAgent.xpBreakdown as any).visitasScore || 0)} XP</span>
                          </div>`;
const puntualidad = `                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Puntualidad</span>
                            <span className={\`font-bold \${selectedAgent.xpBreakdown.attendanceScore >= 0 ? 'text-emerald-600' : 'text-rose-600'}\`}>
                              {selectedAgent.xpBreakdown.attendanceScore > 0 ? '+' : ''}{selectedAgent.xpBreakdown.attendanceScore} XP
                            </span>
                          </div>`;
const sprintMeticas = `                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Total Sprint Métricas</span>
                            <span className={\`font-bold \${(selectedAgent.xpBreakdown.sprintMetricsScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}\`}>
                              {(selectedAgent.xpBreakdown.sprintMetricsScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.sprintMetricsScore || 0} XP
                            </span>
                          </div>`;
const escalaciones = `                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Escalaciones ({(selectedAgent.xpBreakdown as any).escalacionesCompletadas || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).escalacionesScore || 0} XP</span>
                          </div>`;
const visitas = `                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Visitas ({(selectedAgent.xpBreakdown as any).visitasCompletadas || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).visitasScore || 0} XP</span>
                          </div>`;
const eventosBonos = `                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Eventos & Bonos</span>
                            <span className={\`font-bold \${eventosTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}\`}>
                              {eventosTotal > 0 ? '+' : ''}{eventosTotal} XP
                            </span>
                          </div>`;
const totalXp = `                          <div className="flex justify-between text-[12px] py-2 mt-2 border-t border-slate-200">
                            <span className="text-slate-900 font-black">Total XP Generado en Sprint</span>
                            <span className="text-indigo-600 font-black">{selectedAgent.xpBreakdown.performanceScore + selectedAgent.xpBreakdown.attendanceScore + (selectedAgent.xpBreakdown.sprintMetricsScore || 0) + eventosTotal} XP</span>
                          </div>`;
const baseXP = `                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-900 font-bold">Base XP</span>
                            <span className="text-indigo-600 font-bold">{selectedAgent.xpBreakdown.baseXp} XP</span>
                          </div>`;


const startStr = '                        <div className="space-y-2">';
const endStr = '                      </div>\n                      {/* Column 2: Sprint Metrics Detailed */}'

const startIdx = content.indexOf(startStr);
const endIdx = content.indexOf(endStr);

if (startIdx !== -1 && endIdx !== -1) {
    const pre = content.slice(0, startIdx + startStr.length);
    const post = content.slice(endIdx);
    
    // We want to retain the closing div of the space-y-2 before Column 2. Let's see the structure:
    // <div className="space-y-2">
    // ... all the items ...
    // </div>
    // </div>
    
    // Actually, let's just find the startStr and the end of space-y-2.
    
    const newBlock = \`
\${completados}
\${puntualidad}
\${sprintMeticas}
\${escalaciones}
\${visitas}
\${eventosBonos}
\${totalXp}
\${baseXP}
                        </div>\`;

    const blockToReplace = content.substring(startIdx, endIdx);
    // Find the last </div> before Column 2
    
    // It's safer to just replace lines.
}
