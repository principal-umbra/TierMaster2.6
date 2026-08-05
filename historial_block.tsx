                  {/* 2. Attendance / check-in breakdown */}
                  <div className="space-y-3 mt-4">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">schedule</span> Historial de Puntualidad
                    </h4>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 grid grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 bg-indigo-950/40 rounded-lg border border-indigo-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Temprano</span>
                        <span className="text-sm font-black font-mono text-indigo-300 block">{selectedAuditAgent.xpBreakdown?.earlyCheckIns || 0} d</span>
                      </div>
                      <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">A Tiempo</span>
                        <span className="text-sm font-black font-mono text-emerald-300 block">{selectedAuditAgent.xpBreakdown?.onTimeCheckIns || 0} d</span>
                      </div>
                      <div className="p-2 bg-amber-950/40 rounded-lg border border-amber-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Gracia</span>
                        <span className="text-sm font-black font-mono text-amber-300 block">{selectedAuditAgent.xpBreakdown?.graceCheckIns || 0} d</span>
                      </div>
                      <div className="p-2 bg-orange-950/40 rounded-lg border border-orange-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Tardanza</span>
                        <span className="text-sm font-black font-mono text-orange-300 block">{selectedAuditAgent.xpBreakdown?.lateCheckIns || 0} d</span>
                      </div>
                      <div className="p-2 bg-rose-950/40 rounded-lg border border-rose-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Falta</span>
                        <span className="text-sm font-black font-mono text-rose-300 block">{selectedAuditAgent.xpBreakdown?.missingCheckIns || 0} d</span>
                      </div>
                    </div>
                  </div>
