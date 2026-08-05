import React from 'react';
import { XpEvent } from '../../../types';

interface XpHistoryListProps {
  xpEvents: XpEvent[];
}

export default function XpHistoryList({ xpEvents }: XpHistoryListProps) {
  return (
    <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-white">
      <h4 className="font-mono text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-slate-100 pb-1.5 pb-2">
        <span className="material-symbols-outlined text-[13px] text-blue-800">history_edu</span>
        Historial de Eventos (XP)
      </h4>
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {xpEvents && xpEvents.length > 0 ? (
          xpEvents.map(ev => (
            <div key={ev.id} className="text-[11px] border border-slate-100 p-2 rounded-lg bg-slate-50/50">
              <div className="flex justify-between font-bold items-center text-slate-800">
                <span className="truncate max-w-[130px]">{ev.title}</span>
                <span className="text-blue-805 tracking-wider font-mono text-[9.5px]">+{ev.xpYield} XP</span>
              </div>
              <p className="text-slate-500 font-medium text-[10.5px] mt-1 line-clamp-2">{ev.description}</p>
              <span className="block text-[8.5px] text-slate-400 mt-1 font-mono text-right">{ev.date}</span>
            </div>
          ))
        ) : (
          <p className="text-[11px] text-slate-400 italic py-2">Sin eventos de XP reportados.</p>
        )}
      </div>
    </div>
  );
}
