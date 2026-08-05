import React from 'react';
import { ScrumTask } from '../../../types';

interface ScrumLogsListProps {
  scrumLogs: ScrumTask[];
}

export default function ScrumLogsList({ scrumLogs }: ScrumLogsListProps) {
  return (
    <div className="border border-slate-200 rounded-xl p-3.5 space-y-3 bg-white">
      <h4 className="font-mono text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1 border-b border-slate-100 pb-1.5 pb-2">
        <span className="material-symbols-outlined text-[13px] text-blue-800">assignment_turned_in</span>
        Últimos Informes Scrum
      </h4>
      <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
        {scrumLogs && scrumLogs.length > 0 ? (
          scrumLogs.map((scr, idx) => (
            <div key={idx} className="text-[11px] border border-slate-100 p-2 rounded-lg bg-slate-50/50">
              <div className="flex justify-between font-bold items-center">
                <span className="font-mono text-[9px] text-blue-800 bg-blue-100 px-1 py-0.5 rounded uppercase">{scr.ticketId}</span>
                <span className={`text-[8.5px] uppercase font-bold px-1.5 rounded ${
                  scr.status === 'done' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                }`}>{scr.status}</span>
              </div>
              <p className="text-slate-650 font-semibold text-[10.5px] mt-1.5">Hoy: <span className="font-normal italic text-slate-600">{scr.today}</span></p>
              {scr.blockers && <p className="text-red-700 font-bold text-[9.5px] mt-1">Bloqueo: {scr.blockers}</p>}
            </div>
          ))
        ) : (
          <p className="text-[11px] text-slate-400 italic py-2">Ningún scrum reportado en el workspace.</p>
        )}
      </div>
    </div>
  );
}
