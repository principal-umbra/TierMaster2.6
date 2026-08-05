import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, HelpCircle } from 'lucide-react';

interface ActivityDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCalendarDay: string;
  quickEventForm: any;
  setQuickEventForm: React.Dispatch<React.SetStateAction<any>>;
  isSupervisor: boolean;
  agents: any[];
  currentAgentId: string;
  handleAddCalendarEvent: (e: React.FormEvent) => void;
}

export const ActivityDrawer: React.FC<ActivityDrawerProps> = ({
  isOpen,
  onClose,
  selectedCalendarDay,
  quickEventForm,
  setQuickEventForm,
  isSupervisor,
  agents,
  currentAgentId,
  handleAddCalendarEvent
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60]"
          />
          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-[70] flex flex-col"
          >
            <div className="p-8 bg-amber-600 text-white flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-lg uppercase tracking-tight">Agenda Personal</h3>
                <p className="text-[10px] font-bold text-amber-200 uppercase tracking-[0.2em] mt-1">Recordatorio para el {selectedCalendarDay}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all cursor-pointer"><X className="w-6 h-6" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="space-y-4">
                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-amber-800 leading-relaxed uppercase tracking-wider">
                      {quickEventForm.isAssignedToOther ? 'Asignando recordatorio a otro técnico.' : 'Este evento es personal. Solo tú podrás verlo en tu agenda.'}
                    </p>
                  </div>
                </div>

                <div className="space-y-6 pt-2">
                  {isSupervisor && (
                    <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <input 
                          type="checkbox"
                          id="assign-other-check"
                          checked={quickEventForm.isAssignedToOther}
                          onChange={(e) => setQuickEventForm(p => ({ ...p, isAssignedToOther: e.target.checked }))}
                          className="w-5 h-5 accent-indigo-600 rounded"
                        />
                        <label htmlFor="assign-other-check" className="text-[10px] font-black text-indigo-900 uppercase tracking-wider cursor-pointer">
                          Asignar a otro técnico del Roster
                        </label>
                    </div>
                  )}

                  {isSupervisor && quickEventForm.isAssignedToOther && (
                    <div className="space-y-2 animate-fadeIn">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Destinatario</label>
                      <select 
                        value={quickEventForm.agentId} 
                        onChange={(e) => setQuickEventForm(p => ({ ...p, agentId: e.target.value }))}
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      >
                        {agents.filter(a => a.id !== currentAgentId).map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!quickEventForm.isAssignedToOther && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Destinatario</label>
                        <p className="text-sm font-bold text-slate-700">Tú mismo ({agents.find(a => a.id === currentAgentId)?.name})</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nivel de Importancia (1-5)</label>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(v => (
                        <button key={v} type="button" onClick={() => setQuickEventForm(p => ({ ...p, intensity: v }))} className={`flex-1 py-4 rounded-xl font-mono text-xs font-black transition-all border ${quickEventForm.intensity === v ? 'bg-amber-600 border-amber-600 text-white shadow-lg shadow-amber-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-amber-300'}`}>
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Detalle del Recordatorio</label>
                    <textarea 
                      value={quickEventForm.note} 
                      onChange={(e) => setQuickEventForm(p => ({ ...p, note: e.target.value }))}
                      placeholder="Escribe aquí tu nota personal..."
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20 h-40 resize-none"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={(e) => { handleAddCalendarEvent(e); onClose(); }}
                className="w-full py-5 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-100 transition-all active:scale-95"
              >
                Guardar Recordatorio
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
