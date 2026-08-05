import React from "react";
import { Collaboration, Agent } from "../../types";
import {
  Building,
  ExternalLink,
  ArrowRightCircle,
  MessagesSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Info,
  Users,
  Activity,
} from "lucide-react";

interface CollabCardProps {
  collab: Collaboration;
  agents: Agent[];
  onClick: () => void;
}

const getAgentInitials = (id: string, agents: Agent[]) => {
  const agent = agents.find((a) => a.id === id);
  if (!agent) return "??";
  return agent.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

const getPriorityColor = (priority?: string) => {
  switch (priority) {
    case "Crítica":
      return "text-rose-600 bg-rose-50 border-rose-200";
    case "Alta":
      return "text-orange-600 bg-orange-50 border-orange-200";
    case "Media":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "Baja":
      return "text-emerald-600 bg-emerald-50 border-emerald-200";
    default:
      return "text-slate-600 bg-slate-50 border-slate-200";
  }
};

const getTypeIcon = (type?: string) => {
  switch (type) {
    case "Escalación":
      return <Activity className="w-3 h-3" />;
    case "Transferencia":
      return <ArrowRightCircle className="w-3 h-3" />;
    case "Consulta":
      return <Info className="w-3 h-3" />;
    case "Asistencia":
    default:
      return <Users className="w-3 h-3" />;
  }
};

const CompactCardHeader = ({
  collab,
  agents,
  onClickExternal,
}: {
  collab: Collaboration;
  agents: Agent[];
  onClickExternal: () => void;
}) => (
  <div className="flex items-center justify-between gap-1 w-full flex-wrap mb-1.5 border-b border-slate-100 pb-1.5">
    {/* Left badges */}
    <div className="flex flex-wrap items-center gap-1">
      <span className="text-[8px] font-black text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-100 uppercase tracking-wide">
        {collab.ticketId}
      </span>
      <span
        className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase tracking-wide flex items-center gap-0.5 ${getPriorityColor(
          collab.priority,
        )}`}
      >
        {collab.priority}
      </span>
      <span className="text-[8px] font-black text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded-full border border-slate-200 uppercase tracking-wide flex items-center gap-0.5">
        {getTypeIcon(collab.type)}
        <span className="leading-none">{collab.type}</span>
      </span>
    </div>

    {/* Right elements: Inline Transfer avatars + Link button */}
    <div className="flex items-center gap-1 ml-auto">
      <div className="flex items-center gap-1 bg-slate-50 px-1 py-0.5 rounded border border-slate-100">
        <div className="flex flex-col items-center">
          <span className="text-[6px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">
            PROP.
          </span>
          <div className="w-5 h-5 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[6px] font-black text-slate-600 shadow-xs">
            {getAgentInitials(collab.assignedToId, agents)}
          </div>
        </div>

        <ArrowRightCircle className="w-2.5 h-2.5 text-slate-300" />

        <div className="flex flex-col items-center">
          <span className="text-[6px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-0.5">
            COLAB.
          </span>
          <div className="w-5 h-5 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[6px] font-black text-indigo-700 shadow-xs">
            {collab.collaboratorId
              ? getAgentInitials(collab.collaboratorId, agents)
              : "?"}
          </div>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClickExternal();
        }}
        className="text-slate-400 hover:text-indigo-500 transition-colors bg-slate-50 hover:bg-indigo-50 p-1 rounded-md border border-transparent hover:border-indigo-100 cursor-pointer"
      >
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  </div>
);

const CardTitle = ({ collab }: { collab: Collaboration }) => (
  <div>
    <p className="text-[11px] font-bold text-slate-800 leading-tight line-clamp-2">
      {collab.ticketTitle}
    </p>
    {collab.account && (
      <p className="text-[9px] font-medium text-slate-500 mt-1 flex items-center gap-1">
        <Building className="w-2.5 h-2.5" />
        {collab.account}
      </p>
    )}
  </div>
);

export const CardSolicitada: React.FC<CollabCardProps> = ({
  collab,
  agents,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-white p-2 rounded-xl shadow-xs border-2 border-amber-100 cursor-pointer hover:border-amber-300 hover:shadow-sm transition-all group relative flex flex-col gap-1 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>

      <CompactCardHeader
        collab={collab}
        agents={agents}
        onClickExternal={onClick}
      />
      <CardTitle collab={collab} />

      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[8px] font-black text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-100/50">
          <Clock className="w-2.5 h-2.5" />
          Pendiente
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-1 text-[8.5px] bg-slate-800 text-white font-bold py-1 px-1.5 rounded-md hover:bg-slate-700 transition-colors uppercase tracking-wider cursor-pointer text-center"
        >
          Revisar Solicitud
        </button>
      </div>
    </div>
  );
};

export const CardEnCurso: React.FC<CollabCardProps> = ({
  collab,
  agents,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-white p-2 rounded-xl shadow-xs border-2 border-blue-200 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all group relative flex flex-col gap-1 overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-blue-500"></div>

      <CompactCardHeader
        collab={collab}
        agents={agents}
        onClickExternal={onClick}
      />
      <CardTitle collab={collab} />

      {collab.notes && (
        <div className="mt-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100 flex gap-1">
          <MessagesSquare className="w-2.5 h-2.5 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-[8.5px] text-slate-600 line-clamp-1 leading-relaxed">
            {collab.notes}
          </p>
        </div>
      )}

      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[8px] font-black text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-blue-100/50">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500"></span>
          </span>
          Activa
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex-1 text-[8.5px] border border-blue-200 text-blue-600 bg-blue-50 font-bold py-1 px-1.5 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-wider cursor-pointer text-center"
        >
          Gestionar Avances
        </button>
      </div>
    </div>
  );
};

export const CardCompletada: React.FC<CollabCardProps> = ({
  collab,
  agents,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-slate-50/50 p-2 rounded-xl shadow-xs border border-emerald-100 cursor-pointer hover:border-emerald-300 transition-all group relative flex flex-col gap-1 opacity-85 hover:opacity-100"
    >
      <CompactCardHeader
        collab={collab}
        agents={agents}
        onClickExternal={onClick}
      />
      <CardTitle collab={collab} />

      <div className="mt-2 pt-1.5 border-t border-emerald-50 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-100">
          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
          Resuelto
        </span>
      </div>
    </div>
  );
};

export const CardRechazada: React.FC<CollabCardProps> = ({
  collab,
  agents,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="bg-white p-2 rounded-xl shadow-xs border-2 border-rose-100 cursor-pointer hover:border-rose-300 hover:shadow-sm transition-all group relative flex flex-col gap-1 overflow-hidden"
    >
      <CompactCardHeader
        collab={collab}
        agents={agents}
        onClickExternal={onClick}
      />
      <CardTitle collab={collab} />

      {collab.rejectionReason && (
        <div className="mt-1 bg-rose-50 p-1.5 rounded-lg border border-rose-100 flex gap-1">
          <AlertCircle className="w-2.5 h-2.5 text-rose-500 shrink-0 mt-0.5" />
          <p className="text-[8.5px] text-rose-600 line-clamp-1 leading-relaxed">
            {collab.rejectionReason}
          </p>
        </div>
      )}

      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
        <span className="flex items-center gap-1 text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded uppercase tracking-wider border border-rose-100">
          <XCircle className="w-2.5 h-2.5 text-rose-400" />
          Rechazada
        </span>
      </div>
    </div>
  );
};
