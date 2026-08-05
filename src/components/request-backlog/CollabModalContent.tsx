import React from "react";
import { Collaboration, Agent } from "../../types";
import { 
  Building,
  Users,
  Target,
  AlertCircle,
  Clock,
} from "lucide-react";
import { CollabStageSolicitada } from "./CollabStageSolicitada";
import { CollabBitacora } from "./CollabBitacora";
import { CollabStageFinalizada } from "./CollabStageFinalizada";

interface CollabModalContentProps {
  newCollab: Partial<Collaboration>;
  handleUpdateCollabStatus: (
    c: Collaboration,
    status: string,
    extra?: any,
  ) => void;
  canAcceptReject: boolean;
  agents: Agent[];
  currentAgent: Agent | false;
  isReadOnly?: boolean;
}

export const CollabModalContent: React.FC<CollabModalContentProps> = ({
  newCollab,
  handleUpdateCollabStatus,
  canAcceptReject,
  agents,
  currentAgent,
  isReadOnly = false,
}) => {
  const c = newCollab as Collaboration;
  const isEnCurso = c.status === "En Curso";

  const leftSpan = isEnCurso ? "xl:col-span-7" : "xl:col-span-8";
  const rightSpan = isEnCurso ? "xl:col-span-5" : "xl:col-span-4";


  const formatDateStr = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const ownerAgent = agents.find((a) => a.id === c.assignedToId);
  const collabAgent = agents.find((a) => a.id === c.collaboratorId);

  const ownerName = ownerAgent ? ownerAgent.name : "Propietario";
  const ownerInitials = ownerAgent
    ? (ownerAgent.initials || ownerAgent.name.substring(0, 2)).toUpperCase()
    : "PR";

  const collabName = collabAgent ? collabAgent.name : "Colaborador";
  const collabInitials = collabAgent
    ? (collabAgent.initials || collabAgent.name.substring(0, 2)).toUpperCase()
    : "CL";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 relative">
      {/* Left Column - Readonly Summary */}
      <div className={`${leftSpan} flex flex-col gap-4`}>
        {/* Ticket Ref Card */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs relative">
          {/* Badge row on top, exactly like the reference image */}
          <div className="flex flex-wrap items-center gap-1.5 mb-3">
            <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wide">
              {c.ticketId}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                c.priority === "Crítica"
                  ? "bg-rose-50 text-rose-700 border-rose-100"
                  : c.priority === "Alta"
                    ? "bg-amber-50 text-amber-700 border-amber-100"
                    : c.priority === "Media"
                      ? "bg-blue-50 text-blue-700 border-blue-100"
                      : "bg-slate-50 text-slate-700 border-slate-100"
              }`}
            >
              {c.priority || "Media"}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100">
              {c.type || "Asistencia"}
            </span>
          </div>

          <h4 className="text-sm font-bold text-slate-800 leading-tight mb-3">
            {c.ticketTitle}
          </h4>

          <div className="flex flex-wrap gap-2.5 text-[10.5px] text-slate-600 font-medium">
            {c.account && (
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                <Building className="w-3.5 h-3.5 text-slate-400" /> {c.account}
              </span>
            )}
            {c.contact && (
              <span className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-lg">
                <Users className="w-3.5 h-3.5 text-slate-400" /> {c.contact}
              </span>
            )}
          </div>
        </div>

        {/* Participantes Card */}
        {c.status !== "Completada" && (
          <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="bg-teal-50 p-1.5 rounded-lg text-teal-600 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Participantes</span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              {/* Propietario */}
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/50 px-2.5 py-1 rounded-xl text-xs">
                <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-black text-slate-600 uppercase shrink-0 shadow-3xs">
                  {ownerInitials}
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
                    PROPIETARIO {c.assignedToId === (currentAgent ? currentAgent.id : "") ? "(TÚ)" : ""}
                  </span>
                  <span className="font-bold text-slate-700 leading-none">{ownerName}</span>
                </div>
              </div>

              {/* Colaborador */}
              <div className="flex items-center gap-2 bg-indigo-50/40 border border-indigo-200/50 px-2.5 py-1 rounded-xl text-xs">
                <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[8px] font-black text-indigo-700 uppercase shrink-0 shadow-3xs">
                  {collabInitials}
                </div>
                <div className="flex flex-col">
                  <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">
                    COLABORADOR {c.collaboratorId === (currentAgent ? currentAgent.id : "") ? "(TÚ)" : ""}
                  </span>
                  <span className="font-bold text-indigo-800 leading-none">{collabName}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Motivo Card */}
        <div className={`bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex-1 flex flex-col ${c.status === "Completada" ? "h-[150px] shrink-0" : ""}`}>
          <div className="flex items-center gap-1.5 mb-2.5 text-slate-500 pb-2 border-b border-slate-100 shrink-0">
            <Target className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Motivo de la Solicitud
            </span>
          </div>
          <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap mt-1 flex-1 overflow-y-auto scrollbar-thin pr-1">
            {c.notes || (
              <span className="italic text-slate-400">Sin descripción...</span>
            )}
          </div>
        </div>

        {/* Reject Reason if applicable */}
        {c.status === "Rechazada" && c.rejectionReason && (
          <div className="bg-rose-50 p-3 rounded-xl border border-rose-100 flex flex-col gap-1 shadow-xs">
            <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Razón del Rechazo
            </span>
            <p className="text-xs font-semibold text-rose-800">
              {c.rejectionReason}
            </p>
          </div>
        )}

        {/* Bitacora in left column ONLY for Completada */}
        {c.status === "Completada" && (
          <CollabBitacora
            collab={c}
            agents={agents}
            onUpdate={(updatedC) => handleUpdateCollabStatus(updatedC, c.status)}
            currentAgent={currentAgent}
            readOnly={true}
          />
        )}
      </div>

      {/* Right Column */}
      <div className={`${rightSpan} flex flex-col gap-4`}>
        {c.status === "Completada" && (
          <div className="bg-white p-3 rounded-xl border border-slate-200/60 shadow-xs flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1 pb-2 border-b border-slate-100">
              <div className="bg-teal-50 p-1.5 rounded-lg text-teal-600 shrink-0">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Participantes</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Propietario</span>
               <span className="text-xs font-bold text-slate-700">{ownerName}</span>
            </div>
            <div className="flex items-center justify-between">
               <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Colaborador</span>
               <span className="text-xs font-bold text-indigo-700">{collabName}</span>
            </div>
          </div>
        )}

        {c.status !== "En Curso" && (
          <>
            {/* Action / Stage Manager */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200/60 shrink-0 flex flex-col">
              <div className="p-3 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Estado Actual
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-sm text-slate-700">
                  {c.status}
                </span>
              </div>
              <div className="p-4 flex-1">
                {c.status === "Solicitada" && (
                  <CollabStageSolicitada
                    collab={c}
                    canAcceptReject={canAcceptReject}
                    onAccept={() => handleUpdateCollabStatus(c, "En Curso")}
                    onReject={(reason) => {
                      handleUpdateCollabStatus(c, "Rechazada", {
                        rejectionReason: reason || "Sin motivo",
                      });
                    }}
                  />
                )}
                {c.status === "Completada" && <CollabStageFinalizada collab={c} />}
                {c.status === "Rechazada" && (
                  <div className="flex flex-col items-center justify-center text-center gap-2 h-full text-rose-500 py-10">
                    <AlertCircle className="w-8 h-8" />
                    <p className="text-xs font-bold">Colaboración declinada.</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Bitacora in right column for NON-Completada states */}
        {c.status !== "Completada" && (
          <CollabBitacora
            collab={c}
            agents={agents}
            onUpdate={(updatedC) => handleUpdateCollabStatus(updatedC, c.status)}
            currentAgent={currentAgent}
            readOnly={isReadOnly || c.status === "Rechazada"}
          />
        )}
      </div>
    </div>
  );
};
