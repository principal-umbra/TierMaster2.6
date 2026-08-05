import React, { useState } from "react";
import { Collaboration, Agent } from "../../types";
import { PenLine, Send } from "lucide-react";

interface CollabBitacoraProps {
  collab: Collaboration;
  agents: Agent[];
  onUpdate?: (c: Collaboration) => void;
  currentAgent?: Agent;
  readOnly?: boolean;
}

export const CollabBitacora: React.FC<CollabBitacoraProps> = ({
  collab,
  agents,
  onUpdate,
  currentAgent,
  readOnly = false,
}) => {
  const [updateText, setUpdateText] = useState("");

  const handleAddUpdate = () => {
    if (!updateText.trim()) return;
    const newUpdate = {
      id: Math.random().toString(36).substring(7),
      date: new Date().toISOString(),
      text: updateText.trim(),
      authorId: currentAgent?.id || collab.collaboratorId || "unknown",
    };
    const updatedCollab = {
      ...collab,
      updates: [...(collab.updates || []), newUpdate],
    };
    if (onUpdate) onUpdate(updatedCollab);
    setUpdateText("");
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "short", hour12: false
    });
  };

  return (
    <div className={`bg-white p-4 rounded-xl border border-slate-200/60 shadow-xs flex-1 flex flex-col gap-3 min-h-[250px] ${readOnly ? "max-h-[280px]" : ""}`}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b border-slate-100 shrink-0">
        <PenLine className="w-3.5 h-3.5 text-slate-400" /> Bitácora
      </label>
      
      {/* Updates List with internal scroll */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[250px] min-h-[150px] scrollbar-thin">
        {collab.updates && collab.updates.length > 0 ? (
          collab.updates.map((upd) => {
            const updaterAgent = agents.find((a) => a.id === upd.authorId);
            const authorInitials = updaterAgent
              ? (updaterAgent.initials || updaterAgent.name.substring(0, 2)).toUpperCase()
              : "AG";
            const isCurrentUser = upd.authorId === currentAgent?.id;

            return (
              <div
                key={upd.id}
                className="bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/50 text-xs flex flex-col gap-1.5"
              >
                <div className="flex justify-between items-center text-[9px] text-slate-400">
                  <span className="font-bold text-slate-600 flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[7px] font-black text-slate-500 uppercase shadow-3xs">
                      {authorInitials}
                    </div>
                    {isCurrentUser ? "Tú" : updaterAgent?.name || "Agente"}
                  </span>
                  <span>{formatDate(upd.date)}</span>
                </div>
                <p className="text-slate-700 leading-snug pl-5.5 whitespace-pre-wrap">{upd.text}</p>
              </div>
            );
          })
        ) : (
          <div className="text-center py-6 text-[10px] text-slate-400 font-medium italic">
            Sin actualizaciones en la bitácora
          </div>
        )}
      </div>

      {/* Add Update Input with nested button */}
      {!readOnly && (
        <div className="relative border border-slate-200 rounded-xl focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 bg-white p-1 flex items-center shrink-0">
          <textarea
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddUpdate();
              }
            }}
            placeholder="Escribe un comentario..."
            className="w-full text-xs p-2.5 pr-10 outline-none resize-none bg-transparent min-h-[50px] leading-tight"
            rows={2}
          ></textarea>
          <button
            className="absolute right-2 bottom-2 p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors disabled:opacity-50 cursor-pointer shadow-3xs"
            onClick={handleAddUpdate}
            disabled={!updateText.trim()}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
