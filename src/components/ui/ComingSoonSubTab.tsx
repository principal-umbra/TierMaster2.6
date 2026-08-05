import React from 'react';
import { Hourglass } from 'lucide-react';

interface ComingSoonSubTabProps {
  title: string;
}

export function ComingSoonSubTab({ title }: ComingSoonSubTabProps) {
  return (
    <div className="bg-slate-900/30 backdrop-blur-md border border-slate-200/40 rounded-3xl p-8 md:p-16 text-center shadow-md max-w-2xl mx-auto space-y-6 my-6 animate-fadeIn" id="subtab-coming-soon-panel">
      <div className="inline-flex p-5 bg-indigo-500/10 text-indigo-500 rounded-2xl border border-indigo-500/20 shadow-sm animate-pulse">
        <Hourglass className="w-8 h-8 text-indigo-600 animate-spin" style={{ animationDuration: '4s' }} />
      </div>
      
      <div className="space-y-3">
        <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 rounded-full border border-indigo-200">
          Próximamente / Coming Soon
        </span>
        <h3 className="font-display font-black text-xl md:text-2xl text-slate-800 tracking-tight pt-1">
          {title}
        </h3>
        <p className="text-xs text-slate-500 max-w-lg mx-auto leading-relaxed font-medium">
          Esta pestaña se encuentra temporalmente en fase de desarrollo y optimización. Pronto estará disponible con todas las funcionalidades de control técnico y gestión avanzada FHONS Corp.
        </p>
      </div>

      <div className="h-px bg-slate-200 max-w-md mx-auto" />

      <div className="pt-2">
        <div className="w-full bg-slate-100 rounded-full h-1.5 max-w-xs mx-auto overflow-hidden border border-slate-200/50">
          <div className="bg-indigo-600 h-1.5 rounded-full w-2/3 animate-pulse" />
        </div>
        <p className="text-[10px] text-slate-400 font-mono font-bold mt-2.5 uppercase tracking-wider">
          Sincronización Kaizen: En Desarrollo (80%)
        </p>
      </div>
    </div>
  );
}
