const fs = require('fs');
let code = fs.readFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', 'utf8');

const t1 = `<div className="text-xs text-slate-500 mt-2 flex flex-col gap-1 w-full border-t border-slate-200 pt-2 text-left">
                  <div className="flex justify-between"><span>Completados:</span> <span className="font-bold text-slate-700">{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.completedTickets || 0), 0)}</span></div>
                  <div className="flex justify-between"><span>En Progreso:</span> <span className="font-bold text-slate-700">{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.workingTickets || 0), 0)}</span></div>
                  <div className="flex justify-between"><span>Pendientes:</span> <span className="font-bold text-slate-700">{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.pendingTickets || 0), 0)}</span></div>
                </div>`;
const r1 = `<div className="text-xs text-slate-500 mt-2 flex flex-col gap-1 w-full border-t border-slate-200 pt-2 text-left">
                  <div className="flex justify-between"><span>Completados:</span> <span className="font-bold text-slate-700">{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.completedTickets || 0), 0)}</span></div>
                </div>`;
code = code.replace(t1, r1);


const t2 = `<div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Completados ({selectedAgent.xpBreakdown.completedTickets}) x {settings.completedTickets}</span>
                            <span className="text-slate-900 font-mono">{selectedAgent.xpBreakdown.completedTickets! * settings.completedTickets}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">En Progreso ({selectedAgent.xpBreakdown.workingTickets}) x {settings.workingTickets}</span>
                            <span className="text-slate-900 font-mono">{selectedAgent.xpBreakdown.workingTickets! * settings.workingTickets}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Pendientes ({selectedAgent.xpBreakdown.pendingTickets}) x {settings.pendingTickets}</span>
                            <span className="text-slate-900 font-mono">{selectedAgent.xpBreakdown.pendingTickets! * settings.pendingTickets}</span>
                          </div>
                        </div>`;
const r2 = `<div className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Completados ({selectedAgent.xpBreakdown.completedTickets}) x {settings.completedTickets}</span>
                            <span className="text-slate-900 font-mono">{selectedAgent.xpBreakdown.completedTickets! * settings.completedTickets}</span>
                          </div>
                        </div>`;
code = code.replace(t2, r2);


const t3 = `<div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Ticket en Progreso</span>
                            <span className="text-[11px] text-slate-500">CRM trabajando</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.workingTickets} 
                            onChange={(e) => handleSettingChange('workingTickets', e.target.value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Ticket Pendiente</span>
                            <span className="text-[11px] text-slate-500">CRM sin iniciar</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.pendingTickets} 
                            onChange={(e) => handleSettingChange('pendingTickets', e.target.value)}
                          />
                        </div>`;
const r3 = ``;
code = code.replace(t3, r3);

fs.writeFileSync('src/components/leaderboard/LeaderboardAdminSettings.tsx', code);
console.log("Updated LeaderboardAdminSettings.tsx!");
