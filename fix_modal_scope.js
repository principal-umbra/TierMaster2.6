import fs from 'fs';
const content = fs.readFileSync('src/components/request-backlog/RequestBacklogTab.tsx', 'utf-8');

const endModalStr = `      {showBulkConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-slideUp">
            <div className="p-5 border-b border-slate-100 bg-slate-50/80 flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <div>
                  <h4 className="font-display font-black text-sm text-slate-900 tracking-tight">
                    Confirmar Requerimientos
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-bold font-mono uppercase tracking-wider">
                    {pendingConfirmRows.length} requerimientos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkConfirmModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold font-sans text-lg p-1.5 hover:bg-slate-100 rounded-lg transition-all"
              >
                &times;
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="font-mono text-[9px] text-slate-500 font-bold uppercase block tracking-wider">
                  Sprint / Semana de Cierre
                </label>
                <select
                  value={bulkConfirmWeek}
                  onChange={(e) => setBulkConfirmWeek(e.target.value)}
                  className="w-full text-xs font-sans p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold text-slate-700 cursor-pointer"
                >
                  <option value="">Mantener Original</option>
                  {optionsWeek.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
                <p className="text-[10px] text-slate-400 mt-2 italic leading-relaxed">
                  Al confirmar, todos los requerimientos seleccionados se marcarán como <strong className="text-slate-700">COMPLETADO</strong> y se moverán definitivamente a la colección de almacenamiento final <strong className="font-mono text-slate-500 text-[11px] bg-slate-100 px-1 py-0.5 rounded">/historico_completados</strong>.
                </p>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowBulkConfirmModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBulkConfirmModal(false);
                  handleConfirmAllFilteredRows(pendingConfirmRows, bulkConfirmWeek);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-indigo-150 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirmar Todos
              </button>
            </div>
          </div>
        </div>
      )}`;

// 1. Remove the modal from the end of the file
const startOfModal = content.indexOf('{showBulkConfirmModal && (');
if (startOfModal !== -1) {
  const newContentEnd = content.substring(0, startOfModal) + "    </div>\n  );\n}\n";
  
  // 2. Insert it before the end of the activeSubTab === 'confirm_completed' IIFE block
  const targetLocationStr = `              )}
            </div>
          </div>
        );
      })()}`;
      
  const replaceWithStr = `              )}
            </div>
          </div>
${endModalStr}
        );
      })()}`;

  const fixedContent = newContentEnd.replace(targetLocationStr, replaceWithStr);
  fs.writeFileSync('src/components/request-backlog/RequestBacklogTab.tsx', fixedContent);
  console.log("Moved modal scope successfully.");
} else {
  console.log("Could not find startOfModal");
}
