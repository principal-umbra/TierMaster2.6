import { CollabModalContent } from "./CollabModalContent";
import { CollabNewForm } from "./CollabNewForm";
import {
  CardSolicitada,
  CardEnCurso,
  CardCompletada,
  CardRechazada,
} from "./CollabCards";
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Agent, Collaboration } from "../../types";
import {
  Users,
  Search,
  Plus,
  ExternalLink,
  MessagesSquare,
  Clock,
  CheckCircle2,
  ShieldAlert,
  ArrowRightCircle,
  ArrowLeft,
  Target,
  MessageCircle,
  FileText,
  CheckCircle,
  Activity,
  Building,
  Briefcase,
  Trash2,
  Filter,
  Shield,
  MoreVertical,
  ListTodo,
  History,
  Edit3,
} from "lucide-react";
import { CollabStageSolicitada } from "./CollabStageSolicitada";
import { CollabStageEnCurso } from "./CollabStageEnCurso";
import { CollabStageFinalizada } from "./CollabStageFinalizada";
import {
  fetchCollaborations,
  saveCollaborations,
  deleteCollaboration,
  saveCollaboration,
  clearAllCollaborations,
  subscribeCollaborations,
} from "../../db/firebaseService";
import { motion, AnimatePresence } from "motion/react";

interface CollaborateTabProps {
  agents: Agent[];
  crmData: any[];
  currentUser?: {
    username: string;
    name: string;
    email: string;
    role?: string;
  } | null;
}

export default function CollaborateTab({
  agents,
  crmData,
  currentUser,
}: CollaborateTabProps) {
  const [collaborations, setCollaborations] = useState<Collaboration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isEditingCollab, setIsEditingCollab] = useState(false);
  const [newCollab, setNewCollab] = useState<Partial<Collaboration>>({});
  const [ticketSearch, setTicketSearch] = useState("");
  const [showTicketDropdown, setShowTicketDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [filterInvolved, setFilterInvolved] = useState(true);
  const [modalTab, setModalTab] = useState<'details' | 'checklist' | 'timeline'>('details');
  const [showPowerMenu, setShowPowerMenu] = useState(false);

  useEffect(() => {
    if (!showModal) {
      setModalTab('details');
      setShowPowerMenu(false);
    }
  }, [showModal]);

  const visibleStatuses = useMemo(() => {
    const isUser = currentUser?.role && (currentUser.role.toLowerCase().trim() === "ty user" || currentUser.role.toLowerCase().trim() === "user");
    return ["Solicitada", "En Curso", "Completada", isUser ? null : "Rechazada"].filter((status): status is string => status !== null);
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = subscribeCollaborations((data) => {
      // Sort collaborations by createdAt descending so that newest are easy to spot or track
      const sorted = [...data].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      setCollaborations(sorted);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowTicketDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTickets = useMemo(() => {
    if (!ticketSearch) return crmData.slice(0, 15);
    const lowerSearch = ticketSearch.toLowerCase();
    return crmData
      .filter((t) => {
        const id = (t.ID || t["ID Ticket"] || t.id || "").toString().toLowerCase();
        const subject = (t.Subject || t.Asunto || t.asunto || "").toString().toLowerCase();
        return id.includes(lowerSearch) || subject.includes(lowerSearch);
      })
      .slice(0, 15);
  }, [ticketSearch, crmData]);

  const handleUpdateCollabStatus = async (
    collab: Collaboration,
    status: string,
    extraData: any = {},
  ) => {
    if (!canInteract(collab)) {
      alert("No tiene permisos para interactuar con esta solicitud.");
      return;
    }
    let extra = { ...extraData };
    if (status === "En Curso" && collab.status === "Solicitada") {
      extra.acceptedAt = new Date().toISOString();
      const isAdmin = currentUser?.role && currentUser.role.toLowerCase() !== "user";
      if (isAdmin && currentAgent?.id !== collab.collaboratorId) {
        extra.acceptedByAdminName = currentAgent?.name || currentUser?.name || "Admin";
      }
    }
    if (status === "Completada" && collab.status !== "Completada" && !extra.completedAt) {
      extra.completedAt = new Date().toISOString();
    }
    const updatedCollab = { ...collab, status, ...extra };
    const updatedCollaborations = collaborations.map((c) =>
      c.id === updatedCollab.id ? updatedCollab : c,
    );
    setCollaborations(updatedCollaborations);
    setNewCollab(updatedCollab);
    try {
      await saveCollaboration(updatedCollab);
    } catch (error) {
      console.error("Error saving status change to Firestore:", error);
      alert("Hubo un error al actualizar el estado en Firestore.");
    }
  };

  const handleDeleteCollab = () => {
    if (!canDeleteCollab) {
      alert("No tiene permisos para eliminar esta solicitud.");
      return;
    }
    setShowConfirmDelete(true);
  };

  // ==========================================
  // FUNCIONES ESPECIALES / POWER TOOLS
  // ==========================================

  const handleTogglePowerTool = async (tool: 'checklist' | 'timeline') => {
    if (!activeCollab.id) return;
    const enabledPowerTools = {
      checklist: activeCollab.enabledPowerTools?.checklist ?? false,
      timeline: activeCollab.enabledPowerTools?.timeline ?? false,
    };
    enabledPowerTools[tool] = !enabledPowerTools[tool];
    
    const updated = {
      ...activeCollab,
      enabledPowerTools,
    };
    
    if (tool === 'timeline' && enabledPowerTools.timeline && (!updated.timeline || updated.timeline.length === 0)) {
      updated.timeline = [
        {
          id: 'timeline_init',
          text: 'Power Tool "Timeline / Historial" habilitado para la tarea',
          timestamp: new Date().toISOString()
        }
      ];
    }

    if (tool === 'checklist' && enabledPowerTools.checklist && (!updated.checklist || updated.checklist.length === 0)) {
      updated.checklist = [
        {
          id: 'check_init',
          text: 'Completar revisión inicial de requerimiento',
          completed: false
        }
      ];
    }
    
    const updatedCollaborations = collaborations.map((c) =>
      c.id === updated.id ? updated : c
    );
    setCollaborations(updatedCollaborations);
    setNewCollab(updated);
    try {
      await saveCollaboration(updated);
    } catch (error) {
      console.error("Error saving power tools to Firestore:", error);
    }
  };

  const handleAddChecklistItem = async (text: string) => {
    if (!activeCollab.id || !text.trim()) return;
    const list = activeCollab.checklist ? [...activeCollab.checklist] : [];
    const newItem = {
      id: 'check_' + Date.now(),
      text: text.trim(),
      completed: false
    };
    
    const timelineUpdate = [
      ...(activeCollab.timeline || []),
      {
        id: 'time_' + Date.now(),
        text: `Se agregó el ítem de checklist: "${text.trim()}"`,
        timestamp: new Date().toISOString()
      }
    ];

    const updated = {
      ...activeCollab,
      checklist: [...list, newItem],
      timeline: timelineUpdate
    };
    
    const updatedCollaborations = collaborations.map((c) =>
      c.id === updated.id ? updated : c
    );
    setCollaborations(updatedCollaborations);
    setNewCollab(updated);
    try {
      await saveCollaboration(updated);
    } catch (error) {
      console.error("Error adding checklist item:", error);
    }
  };

  const handleToggleChecklistItem = async (itemId: string) => {
    if (!activeCollab.id) return;
    const list = activeCollab.checklist ? activeCollab.checklist.map(item => {
      if (item.id === itemId) {
        return { ...item, completed: !item.completed };
      }
      return item;
    }) : [];
    
    const targetItem = activeCollab.checklist?.find(i => i.id === itemId);
    const timelineUpdate = targetItem ? [
      ...(activeCollab.timeline || []),
      {
        id: 'time_' + Date.now(),
        text: `Ítem "${targetItem.text}" marcado como ${!targetItem.completed ? 'COMPLETADO' : 'PENDIENTE'}`,
        timestamp: new Date().toISOString()
      }
    ] : (activeCollab.timeline || []);

    const updated = {
      ...activeCollab,
      checklist: list,
      timeline: timelineUpdate
    };
    
    const updatedCollaborations = collaborations.map((c) =>
      c.id === updated.id ? updated : c
    );
    setCollaborations(updatedCollaborations);
    setNewCollab(updated);
    try {
      await saveCollaboration(updated);
    } catch (error) {
      console.error("Error toggling checklist item:", error);
    }
  };

  const handleDeleteChecklistItem = async (itemId: string) => {
    if (!activeCollab.id) return;
    const targetItem = activeCollab.checklist?.find(i => i.id === itemId);
    const list = activeCollab.checklist ? activeCollab.checklist.filter(item => item.id !== itemId) : [];
    
    const timelineUpdate = targetItem ? [
      ...(activeCollab.timeline || []),
      {
        id: 'time_' + Date.now(),
        text: `Se eliminó el ítem de checklist: "${targetItem.text}"`,
        timestamp: new Date().toISOString()
      }
    ] : (activeCollab.timeline || []);

    const updated = {
      ...activeCollab,
      checklist: list,
      timeline: timelineUpdate
    };
    
    const updatedCollaborations = collaborations.map((c) =>
      c.id === updated.id ? updated : c
    );
    setCollaborations(updatedCollaborations);
    setNewCollab(updated);
    try {
      await saveCollaboration(updated);
    } catch (error) {
      console.error("Error deleting checklist item:", error);
    }
  };

  const getTimelineEvents = () => {
    const list = activeCollab.timeline ? [...activeCollab.timeline] : [];
    if (list.length === 0) {
      if (activeCollab.createdAt) {
        list.push({
          id: 'timeline_init',
          text: `Solicitud de colaboración registrada con estado "${activeCollab.status || 'Solicitada'}"`,
          timestamp: activeCollab.createdAt
        });
      }
      if (activeCollab.acceptedAt) {
        list.push({
          id: 'timeline_accept',
          text: `Colaboración aceptada por el especialista técnico`,
          timestamp: activeCollab.acceptedAt
        });
      }
      if (activeCollab.completedAt) {
        list.push({
          id: 'timeline_complete',
          text: `Colaboración finalizada y guardada en el histórico FHONS`,
          timestamp: activeCollab.completedAt
        });
      }
    }
    return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  };

  const handleSaveCollab = async () => {
    if (!newCollab.ticketId) {
      alert("Debe seleccionar un ticket / requerimiento.");
      return;
    }
    if (!newCollab.assignedToId) {
      alert(
        "Debe seleccionar el Agente Propietario (quien tiene asignado el caso en el CRM).",
      );
      return;
    }
    if (!newCollab.collaboratorId && newCollab.status !== "Solicitada") {
      alert("Debe asignar un colaborador para cambiar el estado.");
      return;
    }

    const collab: Collaboration = {
      id: newCollab.id || `collab_${Date.now()}`,
      ticketId: newCollab.ticketId,
      ticketTitle: newCollab.ticketTitle || "Sin título",
      assignedToId: newCollab.assignedToId,
      collaboratorId: newCollab.collaboratorId || "",
      status: newCollab.status || "Solicitada",
      notes: newCollab.notes || "",
      createdAt: newCollab.createdAt || new Date().toISOString(),
      completedAt:
        newCollab.status === "Completada" && !newCollab.completedAt
          ? new Date().toISOString()
          : newCollab.completedAt,
      priority: newCollab.priority || "Media",
      type: newCollab.type || "Asistencia",
      account: newCollab.account || "",
      contact: newCollab.contact || "",
      expectedOutcome: newCollab.expectedOutcome || "",
      resolutionNotes: newCollab.resolutionNotes || "",
      rejectionReason: newCollab.rejectionReason || "",
      updates: newCollab.updates || [],
    };

    const updated = newCollab.id
      ? collaborations.map((c) => (c.id === collab.id ? collab : c))
      : [...collaborations, collab];

    setCollaborations(updated);
    setShowModal(false);
    setIsEditingCollab(false);
    setNewCollab({});
    try {
      await saveCollaboration(collab);
    } catch (error) {
      console.error("Error saving collaboration to Firestore:", error);
      alert(
        "Hubo un error al guardar la colaboración en Firestore. Intente de nuevo.",
      );
    }
  };

  const getAgentInitials = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return "??";
    return (
      agent.initials ||
      agent.name?.substring(0, 2) ||
      "??"
    ).toUpperCase();
  };

  const getAgentName = (id: string) => {
    if (!id) return "Sin asignar";
    const agent = agents.find((a) => a.id === id);
    return agent ? agent.name : "Desconocido";
  };

  const currentAgent = React.useMemo(() => {
    if (!currentUser) return null;
    const lowerName = currentUser.name?.toLowerCase().trim();
    const lowerEmail = currentUser.email?.toLowerCase().trim();
    const lowerUsername = currentUser.username?.toLowerCase().trim();
    return agents.find((a) => {
      const agentName = a.name?.toLowerCase().trim();
      const agentEmail = a.email?.toLowerCase().trim();
      
      const nameMatch = lowerName && agentName === lowerName;
      const emailMatch = lowerEmail && agentEmail && (
        agentEmail === lowerEmail || 
        agentEmail.split("@")[0] === lowerEmail.split("@")[0]
      );
      const usernameMatch = lowerUsername && agentName === lowerUsername;

      return nameMatch || emailMatch || usernameMatch;
    });
  }, [currentUser, agents]);

  const displayCollaborations = React.useMemo(() => {
    if (!filterInvolved || !currentAgent) return collaborations;
    return collaborations.filter(
      (c) => c.assignedToId === currentAgent.id || c.collaboratorId === currentAgent.id
    );
  }, [collaborations, filterInvolved, currentAgent]);

  const activeCollab = React.useMemo(() => {
    if (isEditingCollab) return newCollab;
    if (!newCollab.id) return newCollab;
    return collaborations.find((c) => c.id === newCollab.id) || newCollab;
  }, [newCollab, collaborations, isEditingCollab]);

  const isAdmin = currentUser?.role && currentUser.role.toLowerCase() !== "user";

  const canInteract = (collab: Partial<Collaboration>) => {
    if (isAdmin) return true;
    if (!currentAgent) return false;
    return currentAgent.id === collab.assignedToId || currentAgent.id === collab.collaboratorId;
  };

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

  const canEditCollab = activeCollab.id && !isEditingCollab && canInteract(activeCollab) && activeCollab.status !== "Completada";

  const canDeleteCollab = activeCollab.id && (
    isAdmin ||
    (currentAgent && currentAgent.id === activeCollab.assignedToId)
  );

  const canAcceptReject = (collab: Partial<Collaboration>) => {
    if (isAdmin) return true;
    if (!currentAgent) return false;
    return collab.collaboratorId === currentAgent.id;
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "Crítica":
        return "bg-rose-100 text-rose-700 border-rose-200";
      case "Alta":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "Media":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "Baja":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusBorder = (status?: string) => {
    switch (status) {
      case "Solicitada":
        return "border-amber-200";
      case "En Curso":
        return "border-blue-200";
      case "Completada":
        return "border-emerald-200";
      case "Rechazada":
        return "border-rose-200";
      default:
        return "border-slate-200";
    }
  };

  const getStatusBg = (status?: string) => {
    switch (status) {
      case "Solicitada":
        return "bg-amber-50 border-amber-100";
      case "En Curso":
        return "bg-blue-50 border-blue-100";
      case "Completada":
        return "bg-emerald-50 border-emerald-100";
      case "Rechazada":
        return "bg-rose-50 border-rose-100";
      default:
        return "bg-slate-50 border-slate-200";
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "Solicitada":
        return "bg-amber-100 text-amber-700";
      case "En Curso":
        return "bg-blue-100 text-blue-700";
      case "Completada":
        return "bg-emerald-100 text-emerald-700";
      case "Rechazada":
        return "bg-rose-100 text-rose-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const getTypeIcon = (type?: string) => {
    switch (type) {
      case "Escalación":
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case "Transferencia":
        return <ArrowRightCircle className="w-3.5 h-3.5" />;
      case "Consulta":
        return <MessageCircle className="w-3.5 h-3.5" />;
      default:
        return <Users className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 min-h-[600px] relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-base font-display font-black text-slate-800">
            Tablero de Colaboraciones y Escalaciones
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Gestión de asistencia inter-agente y transferencia de conocimientos
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto shrink-0">
          {currentAgent && (
            <button
              onClick={() => setFilterInvolved(!filterInvolved)}
              className={`flex items-center justify-between sm:justify-start gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                filterInvolved
                  ? "bg-indigo-50 border-indigo-200 text-indigo-700 shadow-3xs"
                  : "bg-white border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className={`w-3.5 h-3.5 ${filterInvolved ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>Mis Involucrados</span>
              </div>
              {/* Custom switch indicator */}
              <div
                className={`w-7 h-4 rounded-full p-0.5 transition-colors ${
                  filterInvolved ? "bg-indigo-600" : "bg-slate-200"
                }`}
              >
                <div
                  className={`w-3 h-3 rounded-full bg-white transition-transform ${
                    filterInvolved ? "translate-x-3" : "translate-x-0"
                  }`}
                />
              </div>
            </button>
          )}

          <button
            onClick={() => {
              setNewCollab({
                status: "Solicitada",
                priority: "Media",
                type: "Asistencia",
                assignedToId: currentAgent ? currentAgent.id : "",
              });
              setTicketSearch("");
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm shadow-indigo-600/20 active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Registrar Solicitud
          </button>

          {currentAgent?.id === "AG-RQ-371" && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-3xs shrink-0"
              title="Borrar todas las solicitudes de colaboración"
            >
              <Trash2 className="w-4 h-4" />
              Limpiar Colaboraciones
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 ${visibleStatuses.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-4`}>
          {visibleStatuses.map((statusLabel) => (
              <div
                key={statusLabel}
                className="bg-slate-100/50 p-3 rounded-xl border border-slate-200 flex flex-col h-full min-h-[500px]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${statusLabel === "Solicitada" ? "bg-amber-400" : statusLabel === "En Curso" ? "bg-blue-500" : statusLabel === "Completada" ? "bg-emerald-500" : "bg-rose-500"}`}
                    ></div>
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                      {statusLabel}
                    </h3>
                  </div>
                  <span className="bg-white text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-slate-200 shadow-sm">
                    {
                      displayCollaborations.filter((c) => c.status === statusLabel)
                        .length
                    }
                  </span>
                </div>

                <div className="space-y-2 flex-1 overflow-y-auto pr-1 no-scrollbar">
                  {displayCollaborations
                    .filter((c) => c.status === statusLabel)
                    .map((collab) => {
                      const handleClick = () => {
                        setNewCollab(collab);
                        setTicketSearch(collab.ticketId);
                        setIsEditingCollab(false);
                        setShowModal(true);
                      };

                      if (statusLabel === "Solicitada") {
                        return (
                          <CardSolicitada
                            key={collab.id}
                            collab={collab}
                            agents={agents}
                            onClick={handleClick}
                          />
                        );
                      }
                      if (statusLabel === "En Curso") {
                        return (
                          <CardEnCurso
                            key={collab.id}
                            collab={collab}
                            agents={agents}
                            onClick={handleClick}
                          />
                        );
                      }
                      if (statusLabel === "Completada") {
                        return (
                          <CardCompletada
                            key={collab.id}
                            collab={collab}
                            agents={agents}
                            onClick={handleClick}
                          />
                        );
                      }
                      return (
                        <CardRechazada
                          key={collab.id}
                          collab={collab}
                          agents={agents}
                          onClick={handleClick}
                        />
                      );
                    })}
                  {displayCollaborations.filter((c) => c.status === statusLabel)
                    .length === 0 && (
                    <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-white/50 text-slate-400 flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="w-6 h-6 text-slate-300" />
                      <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
                        Vacio
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Robust Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/80">
                <div className="flex items-start md:items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 mt-1 md:mt-0 shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 text-lg leading-tight">
                      {activeCollab.id
                        ? (isEditingCollab ? "Editar Colaboración" : "Detalles de la Colaboración")
                        : "Registrar Nueva Colaboración"}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Complete los detalles para coordinar la asistencia
                      inter-agente
                    </p>
                    
                    
                  
                    {activeCollab.id && (
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        {activeCollab.status === "En Curso" && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">
                              ESTADO ACTUAL
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 shadow-3xs">
                              En Curso
                            </span>
                          </div>
                        )}
                        {activeCollab.acceptedByAdminName && (
                          <div className="flex items-center gap-1.5 ml-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 shadow-3xs flex items-center gap-1">
                              <Shield className="w-3 h-3 text-indigo-500" /> Aceptada por Admin: {activeCollab.acceptedByAdminName}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 md:ml-auto">
                  {activeCollab.id && !isEditingCollab && activeCollab.status === "En Curso" && (
                    <>
                      <button
                        onClick={() => handleUpdateCollabStatus(activeCollab as Collaboration, "Solicitada")}
                        className="px-3 py-1.5 text-[10.5px] font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer mr-1"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" /> Revertir a Solicitada
                      </button>
                      <button
                        onClick={() => handleUpdateCollabStatus(activeCollab as Collaboration, "Completada", { completedAt: new Date().toISOString() })}
                        className="px-3 py-1.5 text-[10.5px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer mr-2 shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Marcar Completada
                      </button>
                    </>
                  )}

                  {activeCollab.id && !isEditingCollab && (
                    <div className="relative inline-block text-left" id="collab-power-menu-container">
                      <button
                        onClick={() => setShowPowerMenu(!showPowerMenu)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center justify-center cursor-pointer mr-2"
                        title="Funciones y herramientas"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {showPowerMenu && (
                        <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-2 text-left">
                          <div className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 mb-1">
                            Acciones de Tarea
                          </div>

                          {canEditCollab && (
                            <button
                              onClick={() => {
                                setIsEditingCollab(true);
                                setShowPowerMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-650 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-indigo-500" />
                              Editar Requerimiento
                            </button>
                          )}

                          {canDeleteCollab && (
                            <button
                              onClick={() => {
                                handleDeleteCollab();
                                setShowPowerMenu(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-bold text-red-650 hover:bg-red-55 hover:text-red-700 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              Eliminar Requerimiento
                            </button>
                          )}

                          <div className="h-px bg-slate-100 my-1.5" />
                          
                          <div className="px-3 py-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                            Habilitar Power Tools
                          </div>

                          <button
                            onClick={() => {
                              handleTogglePowerTool('checklist');
                              setShowPowerMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 rounded-lg transition-all flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Check list / To Do's</span>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeCollab.enabledPowerTools?.checklist ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                              {activeCollab.enabledPowerTools?.checklist && (
                                <svg className="w-2.5 h-2.5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              handleTogglePowerTool('timeline');
                              setShowPowerMenu(false);
                            }}
                            className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-indigo-50/50 rounded-lg transition-all flex items-center justify-between cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <History className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Timeline / Historial</span>
                            </div>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${activeCollab.enabledPowerTools?.timeline ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'}`}>
                              {activeCollab.enabledPowerTools?.timeline && (
                                <svg className="w-2.5 h-2.5 stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                              )}
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setIsEditingCollab(false);
                    }}
                    className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-xl border border-slate-200 transition-colors ml-1 cursor-pointer"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Floating Tabs for Power Tools */}
              {activeCollab.id && !isEditingCollab && (
                <div className="flex gap-2 px-6 py-2 bg-slate-50 border-b border-slate-100 shrink-0">
                  <button
                    onClick={() => setModalTab('details')}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      modalTab === 'details'
                        ? 'bg-indigo-600 text-white shadow-3xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Detalles
                  </button>

                  {(activeCollab.enabledPowerTools?.checklist) && (
                    <button
                      onClick={() => setModalTab('checklist')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                        modalTab === 'checklist'
                          ? 'bg-indigo-600 text-white shadow-3xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <ListTodo className="w-3.5 h-3.5" />
                      Check list / To Do's
                    </button>
                  )}

                  {(activeCollab.enabledPowerTools?.timeline) && (
                    <button
                      onClick={() => setModalTab('timeline')}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                        modalTab === 'timeline'
                          ? 'bg-indigo-600 text-white shadow-3xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <History className="w-3.5 h-3.5" />
                      Timeline
                    </button>
                  )}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                {(!activeCollab.id || isEditingCollab) ? (
                  <CollabNewForm
                    newCollab={newCollab}
                    setNewCollab={setNewCollab}
                    ticketSearch={ticketSearch}
                    setTicketSearch={setTicketSearch}
                    filteredTickets={filteredTickets}
                    agents={agents}
                    currentAgent={currentAgent}
                    showTicketDropdown={showTicketDropdown}
                    setShowTicketDropdown={setShowTicketDropdown}
                  />
                ) : (
                  <>
                    {modalTab === 'details' && (
                      <CollabModalContent
                        newCollab={activeCollab}
                        handleUpdateCollabStatus={(c, status, extra) =>
                          handleUpdateCollabStatus(c, status, extra)
                        }
                        canAcceptReject={canAcceptReject(activeCollab)}
                        agents={agents}
                        currentAgent={currentAgent}
                        isReadOnly={!canInteract(activeCollab)}
                      />
                    )}

                    {modalTab === 'checklist' && (
                      <div className="p-6 bg-white rounded-2xl border border-slate-200/60 flex flex-col gap-5 min-h-[350px] shadow-3xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                          <div>
                            <h4 className="text-sm font-black text-slate-800">Check list de Verificación (To Do's)</h4>
                            <p className="text-[11px] text-slate-500 font-medium">Tareas de control de calidad y revisión operativa para este requerimiento.</p>
                          </div>
                          <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100 shrink-0 self-start sm:self-center">
                            {activeCollab.checklist?.filter(i => i.completed).length ?? 0} de {activeCollab.checklist?.filter(i => i.id !== 'check_init').length ?? 0} completados
                          </span>
                        </div>

                        {/* Input row */}
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.currentTarget;
                            const input = form.elements.namedItem('todoText') as HTMLInputElement;
                            if (input && input.value.trim()) {
                              handleAddChecklistItem(input.value);
                              input.value = '';
                            }
                          }}
                          className="flex gap-2"
                        >
                          <input
                            name="todoText"
                            type="text"
                            placeholder="Escriba una nueva tarea o verificación..."
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-850 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-3xs"
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 cursor-pointer flex items-center gap-1 shrink-0"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Agregar
                          </button>
                        </form>

                        {/* Checklist list */}
                        <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                          {activeCollab.checklist && activeCollab.checklist.filter(item => item.id !== 'check_init').length > 0 ? (
                            activeCollab.checklist.filter(item => item.id !== 'check_init').map((item) => (
                              <div
                                key={item.id}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                                  item.completed
                                    ? 'bg-slate-50 border-slate-200 text-slate-400 line-through'
                                    : 'bg-white border-slate-150 text-slate-700 shadow-3xs'
                                }`}
                              >
                                <label className="flex items-center gap-3 cursor-pointer flex-1 select-none">
                                  <input
                                    type="checkbox"
                                    checked={item.completed}
                                    onChange={() => handleToggleChecklistItem(item.id)}
                                    className="rounded text-indigo-600 focus:ring-indigo-500/50 focus:ring-offset-0 bg-slate-50 border-slate-300 outline-none w-4 h-4"
                                  />
                                  <span className="text-xs font-bold leading-relaxed">{item.text}</span>
                                </label>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteChecklistItem(item.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/40 text-slate-400 flex flex-col items-center justify-center gap-2">
                              <ListTodo className="w-7 h-7 text-slate-300" />
                              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Lista Vacía</span>
                              <p className="text-[10px] text-slate-500 font-medium max-w-[200px]">Agregue tareas usando el campo superior.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {modalTab === 'timeline' && (
                      <div className="p-6 bg-white rounded-2xl border border-slate-200/60 flex flex-col gap-5 min-h-[350px] shadow-3xs">
                        <div className="pb-3 border-b border-slate-100">
                          <h4 className="text-sm font-black text-slate-800">Historial y Timeline de Trabajo</h4>
                          <p className="text-[11px] text-slate-500 font-medium">Trazabilidad en tiempo real sobre las asignaciones, bitácora y cambios realizados.</p>
                        </div>

                        <div className="relative pl-6 border-l-2 border-indigo-100 flex flex-col gap-4 max-h-[350px] overflow-y-auto pr-1 py-1">
                          {getTimelineEvents().length > 0 ? (
                            getTimelineEvents().map((event, idx) => (
                              <div key={event.id || idx} className="relative">
                                {/* Timeline circle indicator */}
                                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-indigo-600 bg-white flex items-center justify-center shadow-sm">
                                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                </div>

                                <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl shadow-3xs">
                                  <span className="text-[9px] font-mono text-indigo-600 font-bold block mb-1">
                                    {formatDateStr(event.timestamp)}
                                  </span>
                                  <p className="text-xs font-bold text-slate-700 leading-normal">{event.text}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/40 text-slate-400 flex flex-col items-center justify-center gap-2">
                              <History className="w-7 h-7 text-slate-300" />
                              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Sin Eventos</span>
                              <p className="text-[10px] text-slate-500 font-medium max-w-[200px]">Los eventos se registrarán automáticamente.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
                <div>
                  {activeCollab.id && (
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] font-mono text-slate-400">
                        ID: {activeCollab.id?.replace("collab_", "")}
                      </span>
                      {canDeleteCollab && (
                        <button
                          onClick={handleDeleteCollab}
                          className="text-xs font-bold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Eliminar
                        </button>
                      )}
                      {!isEditingCollab && activeCollab.status !== "Completada" && (
                        <div className="flex items-center gap-3 ml-4 text-[9.5px] font-bold text-slate-400 uppercase tracking-wider">
                          <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100"><Clock className="w-3 h-3 text-slate-300" /> Creada: {formatDateStr(activeCollab.createdAt)}</span>
                          {(activeCollab.acceptedAt || activeCollab.status === "En Curso") && <span className="flex items-center gap-1 bg-blue-50/50 px-2 py-1 rounded-md border border-blue-100/50 text-blue-600/80"><CheckCircle className="w-3 h-3 text-blue-400" /> Aceptada: {formatDateStr(activeCollab.acceptedAt || activeCollab.createdAt || new Date().toISOString())}</span>}
                        </div>
                      )}
                    </div>
                  )}


                </div>
                <div className="flex items-center gap-3">
                  {(!activeCollab.id || isEditingCollab) ? (
                    <>
                      <button
                        onClick={() => {
                          if (isEditingCollab) {
                            setIsEditingCollab(false);
                          } else {
                            setShowModal(false);
                          }
                        }}
                        className="px-5 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-transparent cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSaveCollab}
                        disabled={!newCollab.ticketId || !newCollab.assignedToId}
                        className="px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-indigo-600/20 active:scale-95 flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Guardar Colaboración
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 cursor-pointer"
                    >
                      Cerrar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Deletion */}
      <AnimatePresence>
        {showConfirmDelete && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    ¿Confirmar Eliminación?
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ID: {newCollab.id?.replace("collab_", "")}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                ¿Está seguro de que desea eliminar permanentemente esta solicitud de colaboración? Esta acción no se puede deshacer.
              </p>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!newCollab.id) return;
                    try {
                      const updated = collaborations.filter((c) => c.id !== newCollab.id);
                      setCollaborations(updated);
                      await deleteCollaboration(newCollab.id);
                      setShowConfirmDelete(false);
                      setShowModal(false);
                      setNewCollab({});
                    } catch (error) {
                      console.error("Error al eliminar la colaboración:", error);
                      alert("Hubo un error al eliminar la colaboración. Por favor, inténtelo de nuevo.");
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer"
                >
                  Sí, Eliminar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal for Clearing All (Admin only) */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-red-600">
                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800">
                    ¿Confirmar Borrado Masivo?
                  </h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Acción de Administrador
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                ¿Está seguro de que desea eliminar permanentemente TODAS las solicitudes de colaboración registradas en esta pestaña? Esto vaciará el tablero por completo. Esta acción no se puede deshacer.
              </p>

              <div className="flex items-center justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors border border-transparent cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await clearAllCollaborations();
                      setCollaborations([]);
                      setShowClearConfirm(false);
                    } catch (error) {
                      console.error("Error al borrar todas las colaboraciones:", error);
                      alert("Hubo un error al borrar las colaboraciones. Por favor, inténtelo de nuevo.");
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md shadow-red-600/20 active:scale-95 cursor-pointer"
                >
                  Sí, Borrar Todo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
