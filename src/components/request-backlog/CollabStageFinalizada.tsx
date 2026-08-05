import React from "react";
import { Collaboration } from "../../types";
import { CheckCircle2, Clock, Calendar, CheckSquare, CheckCircle } from "lucide-react";

interface CollabStageFinalizadaProps {
  collab: Collaboration;
}

export const CollabStageFinalizada: React.FC<CollabStageFinalizadaProps> = ({
  collab,
}) => {
  const startDate = collab.createdAt || new Date().toISOString();
  const acceptedDate = collab.acceptedAt || collab.createdAt || new Date().toISOString();
  const endDate = collab.completedAt || new Date().toISOString();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false // 24-hour format as requested
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 flex flex-col items-center text-center gap-2 shadow-xs">
        <div className="text-emerald-500">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div>
          <h5 className="text-sm font-bold text-slate-800">
            Colaboración Exitosa
          </h5>
          <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs mx-auto leading-snug">
            El requerimiento ha sido resuelto.
          </p>
        </div>
      </div>

      {/* Fechas apiladas una debajo de la otra */}
      <div className="flex flex-col gap-2 mt-1">
        <div className="bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 flex items-center justify-between shadow-3xs">
          <div className="flex items-center gap-2 text-slate-400">
            <Calendar className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              Solicitado
            </span>
          </div>
          <span className="text-xs font-bold text-slate-700">
            {formatDate(startDate)}
          </span>
        </div>

        <div className="bg-blue-50/30 px-4 py-2.5 rounded-xl border border-blue-100/50 flex items-center justify-between shadow-3xs">
          <div className="flex items-center gap-2 text-blue-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600/80">
              Aceptado
            </span>
          </div>
          <span className="text-xs font-bold text-slate-700">
            {formatDate(acceptedDate)}
          </span>
        </div>

        <div className="bg-emerald-50/50 px-4 py-2.5 rounded-xl border border-emerald-100/80 flex items-center justify-between shadow-3xs">
          <div className="flex items-center gap-2 text-emerald-500">
            <CheckSquare className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
              Resuelto
            </span>
          </div>
          <span className="text-xs font-bold text-slate-700">
            {formatDate(endDate)}
          </span>
        </div>
      </div>
    </div>
  );
};
