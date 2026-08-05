import React, { useRef, useMemo } from "react";
import { Collaboration, Agent } from "../../types";
import {
  FileText,
  Search,
  Building,
  Users,
  Target,
  Briefcase,
  Activity,
  Check,
  Zap,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

interface CollabNewFormProps {
  newCollab: Partial<Collaboration>;
  setNewCollab: (c: Partial<Collaboration>) => void;
  ticketSearch: string;
  setTicketSearch: (s: string) => void;
  filteredTickets: any[];
  agents: Agent[];
  currentAgent: Agent | false;
  showTicketDropdown: boolean;
  setShowTicketDropdown: (b: boolean) => void;
}

export const CollabNewForm: React.FC<CollabNewFormProps> = ({
  newCollab,
  setNewCollab,
  ticketSearch,
  setTicketSearch,
  filteredTickets,
  agents,
  currentAgent,
  showTicketDropdown,
  setShowTicketDropdown,
}) => {
  const searchRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowTicketDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setShowTicketDropdown]);

  const getTicketId = (t: any) => t.ID || t["ID Ticket"] || t.id || "";
  const getTicketSubject = (t: any) =>
    t.Subject || t.Asunto || t.asunto || "Sin asunto";
  const getTicketAccount = (t: any) =>
    t.Cuenta || t.Account || t.Cliente || t.cuenta || "";
  const getTicketContact = (t: any) =>
    t.Contacto || t.Contact || t.contacto || "";

  const priorities = [
    {
      value: "Baja",
      color: "bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200",
    },
    {
      value: "Media",
      color:
        "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200",
    },
    {
      value: "Alta",
      color: "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200",
    },
    {
      value: "Crítica",
      color: "bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200",
    },
  ];

  const types = [
    { value: "Asistencia", icon: HelpCircle },
    { value: "Escalación", icon: Zap },
    { value: "Consulta", icon: MessageSquare },
  ];

  const handleSelectTicket = (t: any) => {
    const tId = getTicketId(t);
    setNewCollab({
      ...newCollab,
      ticketId: String(tId),
      ticketTitle: getTicketSubject(t),
      account: getTicketAccount(t),
      contact: getTicketContact(t),
      assignedToId: newCollab.assignedToId || (currentAgent ? currentAgent.id : ""),
    });
    setTicketSearch(String(tId));
    setShowTicketDropdown(false);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 relative">
      {/* Left Column */}
      <div className="xl:col-span-8 flex flex-col gap-4">
        {/* Ticket Reference */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 relative overflow-visible">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Search className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">
                Ticket o Requerimiento
              </h4>
            </div>
          </div>

          <div className="space-y-3">
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={ticketSearch}
                  onChange={(e) => {
                    setTicketSearch(e.target.value);
                    setShowTicketDropdown(true);
                  }}
                  onFocus={() => setShowTicketDropdown(true)}
                  placeholder="Ej. INC-1234 o nombre..."
                  className="w-full text-xs py-2 pl-8 pr-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all shadow-sm font-medium bg-slate-50 hover:bg-white focus:bg-white"
                />
              </div>

              {/* Dropdown */}
              <AnimatePresence>
                {showTicketDropdown && ticketSearch && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden"
                  >
                    {filteredTickets.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                        {filteredTickets.map((t) => {
                          const tId = getTicketId(t);
                          return (
                            <div
                              key={tId}
                              className="p-2 hover:bg-indigo-50 rounded-md cursor-pointer transition-colors border border-transparent hover:border-indigo-100 flex items-start gap-2"
                              onClick={() => handleSelectTicket(t)}
                            >
                              <div className="bg-slate-100 text-slate-500 rounded p-1">
                                <FileText className="w-3 h-3" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-[9px] font-bold font-mono text-indigo-500 leading-none mb-0.5">
                                  {tId}
                                </div>
                                <div className="text-xs font-semibold text-slate-700 truncate leading-tight">
                                  {getTicketSubject(t)}
                                </div>
                                <div className="flex gap-2 mt-1 text-[9px] text-slate-500">
                                  {getTicketAccount(t) && (
                                    <span className="flex items-center gap-0.5">
                                      <Building className="w-2.5 h-2.5" />{" "}
                                      {getTicketAccount(t)}
                                    </span>
                                  )}
                                  {getTicketContact(t) && (
                                    <span className="flex items-center gap-0.5">
                                      <Users className="w-2.5 h-2.5" />{" "}
                                      {getTicketContact(t)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-xs">
                        No se encontraron tickets con "{ticketSearch}"
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {newCollab.ticketId && !showTicketDropdown && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="bg-indigo-50/50 border border-indigo-100 rounded-lg p-3 flex flex-col gap-2"
              >
                <div>
                  <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">
                    Título del requerimiento vinculado
                  </label>
                  <input
                    type="text"
                    value={newCollab.ticketTitle || ""}
                    onChange={(e) =>
                      setNewCollab({
                        ...newCollab,
                        ticketTitle: e.target.value,
                      })
                    }
                    className="w-full text-xs py-1.5 px-2 rounded-md border border-indigo-200 focus:border-indigo-500 outline-none bg-white transition-shadow"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">
                      Empresa / Cuenta
                    </label>
                    <input
                      type="text"
                      value={newCollab.account || ""}
                      onChange={(e) =>
                        setNewCollab({ ...newCollab, account: e.target.value })
                      }
                      className="w-full text-xs py-1.5 px-2 rounded-md border border-indigo-200 focus:border-indigo-500 outline-none bg-white transition-shadow"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-0.5">
                      Contacto
                    </label>
                    <input
                      type="text"
                      value={newCollab.contact || ""}
                      onChange={(e) =>
                        setNewCollab({ ...newCollab, contact: e.target.value })
                      }
                      className="w-full text-xs py-1.5 px-2 rounded-md border border-indigo-200 focus:border-indigo-500 outline-none bg-white transition-shadow"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded bg-blue-50 flex items-center justify-center text-blue-600">
              <Target className="w-3.5 h-3.5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">
                Motivo de la Solicitud
              </h4>
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <textarea
              value={newCollab.notes || ""}
              onChange={(e) =>
                setNewCollab({ ...newCollab, notes: e.target.value })
              }
              placeholder="Describe detalladamente qué necesitas..."
              className="w-full flex-1 min-h-[80px] text-xs p-3 rounded-lg border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none bg-slate-50 transition-all font-medium text-slate-700"
            ></textarea>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                "No puedo replicar",
                "Necesito accesos",
                "Duda configuración",
                "Validar final",
              ].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    setNewCollab({
                      ...newCollab,
                      notes: ((newCollab.notes || "") + " " + tag).trim(),
                    })
                  }
                  className="px-2 py-0.5 text-[9px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 transition-colors"
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="xl:col-span-4 flex flex-col gap-4">
        {/* Classification */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-orange-50 flex items-center justify-center text-orange-600">
              <Activity className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">
              Clasificación
            </h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Prioridad
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() =>
                      setNewCollab({ ...newCollab, priority: p.value as any })
                    }
                    className={`flex items-center justify-center py-1.5 px-2 rounded-md border text-[10px] font-bold transition-all ${
                      newCollab.priority === p.value
                        ? `${p.color} ring-1 ring-current`
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {p.value}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                Tipo
              </label>
              <div className="grid grid-cols-1 gap-1.5">
                {types.map((t) => {
                  const Icon = t.icon;
                  const isSelected =
                    (newCollab.type || "Asistencia") === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() =>
                        setNewCollab({ ...newCollab, type: t.value as any })
                      }
                      className={`flex items-center gap-2 py-1.5 px-2.5 rounded-md border text-[11px] font-bold transition-all ${
                        isSelected
                          ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <Icon
                        className={`w-3 h-3 ${isSelected ? "text-indigo-300" : "text-slate-400"}`}
                      />
                      {t.value}
                      {isSelected && (
                        <Check className="w-3 h-3 ml-auto text-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Assignment */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 space-y-4 flex-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-teal-50 flex items-center justify-center text-teal-600">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-sm font-extrabold text-slate-800 tracking-tight leading-none">
              Participantes
            </h4>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">
                Propietario (Tú)
              </label>
              <div className="relative">
                <select
                  value={newCollab.assignedToId || ""}
                  onChange={(e) =>
                    setNewCollab({ ...newCollab, assignedToId: e.target.value })
                  }
                  className="w-full text-xs py-1.5 px-2 pl-8 rounded-md border border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-slate-700 bg-slate-50 appearance-none"
                >
                  <option value="">Seleccionar...</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center text-[8px] font-black text-slate-500">
                  {newCollab.assignedToId
                    ? agents
                        .find((a) => a.id === newCollab.assignedToId)
                        ?.name.substring(0, 2)
                        .toUpperCase()
                    : "?"}
                </div>
              </div>
            </div>

            <div className="relative pt-1 before:absolute before:top-0 before:left-4 before:-translate-x-1/2 before:w-[2px] before:h-3 before:bg-indigo-100">
              <label className="block text-[8px] font-black text-indigo-500 uppercase tracking-widest mb-1">
                Colaborador Asignado
              </label>
              <div className="relative">
                <select
                  value={newCollab.collaboratorId || ""}
                  onChange={(e) =>
                    setNewCollab({
                      ...newCollab,
                      collaboratorId: e.target.value,
                    })
                  }
                  className="w-full text-xs py-1.5 px-2 pl-8 rounded-md border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none font-bold text-indigo-900 bg-indigo-50/50 appearance-none"
                >
                  <option value="">Sin asignar / Enviar al Backlog</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <div className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-indigo-100 rounded-full flex items-center justify-center text-[8px] font-black text-indigo-600">
                  {newCollab.collaboratorId
                    ? agents
                        .find((a) => a.id === newCollab.collaboratorId)
                        ?.name.substring(0, 2)
                        .toUpperCase()
                    : "+"}
                </div>
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 leading-tight">
                Déjalo vacío para pasarlo al backlog general.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
