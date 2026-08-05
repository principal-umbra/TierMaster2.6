import React, { useState } from "react";
import { Collaboration } from "../../types";
import { CheckCircle2, ShieldAlert, Clock, Info, X } from "lucide-react";

interface CollabStageSolicitadaProps {
  collab: Collaboration;
  onAccept: () => void;
  onReject: (reason: string) => void;
  canAcceptReject: boolean;
}

export const CollabStageSolicitada: React.FC<CollabStageSolicitadaProps> = ({
  collab,
  onAccept,
  onReject,
  canAcceptReject,
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const handleRejectSubmit = () => {
    if (!rejectReason.trim()) return;
    onReject(rejectReason.trim());
    setShowRejectForm(false);
    setRejectReason("");
  };

  return (
    <div className="flex flex-col gap-2">
      {canAcceptReject ? (
        <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 flex flex-col gap-2">
          {!showRejectForm ? (
            <>
              <div className="flex items-start gap-2.5">
                <div className="text-amber-500 mt-0.5 shrink-0">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="text-xs font-bold text-slate-800 leading-tight">
                    Acción Requerida
                  </h5>
                  <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                    Revisa los detalles y confirma si puedes tomarlo.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={onAccept}
                  className="px-2 py-2 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Aceptar
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="px-2 py-2 text-[11px] font-bold text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-all flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" /> Rechazar
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-rose-700">
                <span className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                  <ShieldAlert className="w-3.5 h-3.5" /> Motivo del Rechazo
                </span>
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="text-rose-400 hover:text-rose-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Indica brevemente por qué no puedes tomarlo..."
                className="w-full text-xs p-2 rounded-lg border border-rose-200 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none resize-none bg-white"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="flex-1 px-2 py-1.5 text-[10px] font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRejectSubmit}
                  disabled={!rejectReason.trim()}
                  className="flex-1 px-2 py-1.5 text-[10px] font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-lg transition-all"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center gap-2">
          <Clock className="w-5 h-5 text-amber-400" />
          <div>
            <h5 className="text-xs font-bold text-slate-700">
              Esperando Respuesta
            </h5>
            <p className="text-[10px] text-slate-500 mt-0.5">
              El colaborador asignado debe aceptar la solicitud.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
