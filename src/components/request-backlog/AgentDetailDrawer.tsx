import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { Agent } from '../../types';
import { Inbox, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

interface AgentDetailDrawerProps {
  selectedAgentId: string;
  onClose: () => void;
  agents: Agent[];
  rosterMetrics: {
    name: string;
    assigned: number;
    working: number;
    completed: number;
    pending: number;
  }[];
  crmData: {
    headers: string[];
    rows: any[];
  };
  currentWeekFilteredRows: any[];
  isAgentNameMatch: (nameA: string, nameB: string) => boolean;
  normalizeStatus: (status: string) => string;
  isStatusResolved: (status: string) => boolean;
  isStatusInProgress: (status: string) => boolean;
  getColJValue?: (row: any, headers?: string[]) => string;
}

export default function AgentDetailDrawer({
  selectedAgentId,
  onClose,
  agents,
  rosterMetrics,
  crmData,
  currentWeekFilteredRows,
  isAgentNameMatch,
  normalizeStatus,
  isStatusResolved,
  isStatusInProgress,
  getColJValue
}: AgentDetailDrawerProps) {
  const [rosterTicketStatusFilter, setRosterTicketStatusFilter] = useState<string>('all');
  const [rosterPage, setRosterPage] = useState<number>(1);

  // Reset page when filter changes
  useEffect(() => {
    setRosterPage(1);
  }, [rosterTicketStatusFilter]);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  if (!selectedAgent) return null;

  // Get metrics for this agent specifically
  const agentMetric = rosterMetrics.find(m => isAgentNameMatch(m.name, selectedAgent.name)) || {
    name: selectedAgent.name,
    assigned: 0,
    working: 0,
    completed: 0,
    pending: 0
  };

  // Match their tickets in CRM
  const agentKey = crmData.headers.find(h => 
    h.toLowerCase() === 'técnico asignado' || 
    h.toLowerCase() === 'tecnico asignado' || 
    h.toLowerCase() === 'asignado' || 
    h.toLowerCase() === 'agent' || 
    h.toLowerCase() === 'assigned to'
  ) || 'Assigned To';

  const idKey = crmData.headers.find(h => h.toLowerCase() === 'id') || 'ID';
  const clientKey = crmData.headers.find(h => h.toLowerCase() === 'cliente' || h.toLowerCase() === 'account') || 'Account';
  const subjectKey = crmData.headers.find(h => h.toLowerCase() === 'requerimiento' || h.toLowerCase() === 'subject' || h.toLowerCase() === 'asunto') || 'Subject';
  const statusKey = crmData.headers.find(h => h.toLowerCase() === 'estado' || h.toLowerCase() === 'status') || 'Status';
  const priorityKey = crmData.headers.find(h => h.toLowerCase() === 'prioridad' || h.toLowerCase() === 'priority') || 'Priority';

  const rawAssignedTickets = currentWeekFilteredRows.filter(row => {
    const assignedVal = String(
      row[agentKey] || 
      row["Assigned To"] || 
      row["Técnico asignado"] || 
      row["Tecnico asignado"] || 
      row["Asignado"] || 
      row["Agent"] || 
      ''
    );
    return isAgentNameMatch(assignedVal, selectedAgent.name);
  });

  const getIsCompleted = (t: any) => {
    if (t._sourceSheet === 'historico_completados' || t._sourceSheet === 'admin_backlog_done' || t._sourceSheet === 'backlog_semanal') {
      return true;
    }

    const statStr = String(t[statusKey] || t["Status"] || t["Estado"] || t["status"] || t["estado"] || '');
    if (isStatusResolved(statStr)) return true;

    const directColJ = String(t["Estado Registro"] || t["Estado registro"] || t["columna j"] || t["Columna J"] || t["Columna_J"] || '').trim();
    if (directColJ) {
      if (isStatusResolved(directColJ)) return true;
      if (normalizeStatus(directColJ) === 'completado') return true;
    }

    return false;
  };

  const assignedTickets = rawAssignedTickets.filter(ticket => {
    if (rosterTicketStatusFilter === 'all') return true;
    
    const isCompleted = getIsCompleted(ticket);
    
    const statVal = String(ticket[statusKey] || ticket["Status"] || ticket["Estado"] || ticket["status"] || ticket["estado"] || '');
    const isWorking = !isCompleted && isStatusInProgress(statVal);

    const isPending = !isCompleted && !isWorking;

    if (rosterTicketStatusFilter === 'working') {
      return isWorking;
    }
    if (rosterTicketStatusFilter === 'pending') {
      return isPending;
    }
    if (rosterTicketStatusFilter === 'completed') {
      return isCompleted;
    }
    return String(ticket[statusKey] || ticket["Status"] || ticket["Estado"] || '').trim() === rosterTicketStatusFilter;
  });

  const totalAll = agentMetric.assigned + agentMetric.completed;
  const completedPercent = totalAll > 0 ? Math.round((agentMetric.completed / totalAll) * 100) : 0;
  const workingPercent = totalAll > 0 ? Math.round((agentMetric.working / totalAll) * 100) : 0;
  
  const totalRosterAll = rosterMetrics.reduce((acc, m) => acc + m.assigned + m.completed, 0);
  const rosterEfficiency = totalRosterAll > 0 ? Math.round((agentMetric.completed / totalRosterAll) * 100) : 0;
  
  // Prod metrics
  const activeLoad = agentMetric.working + agentMetric.pending;
  const resolutionRate = agentMetric.completed > 0 || activeLoad > 0 
    ? Math.round((agentMetric.completed / (agentMetric.completed + activeLoad)) * 100)
    : 0;
  const pendingPercent = totalAll > 0 ? Math.round((agentMetric.pending / totalAll) * 100) : 0;
  
  const focusIndex = activeLoad > 0 ? Math.round((agentMetric.working / activeLoad) * 100) : 0;
  const latencyIndex = activeLoad > 0 ? Math.round((agentMetric.pending / activeLoad) * 100) : 0;
  const workloadShare = totalRosterAll > 0 ? Math.round((totalAll / totalRosterAll) * 100) : 0;

  const currentDay = new Date().getDay();
  const workingDayNum = currentDay === 0 ? 6 : currentDay; 
  const idealActiveCases = Math.max(1, Math.round(totalAll * ((6 - workingDayNum + 1) / 6) * 0.3));

  let loadText = "Sin carga";
  let loadColor = "text-slate-500 bg-slate-50 border-slate-200/40";
  if (agentMetric.assigned > 0) {
    const activeLoad = agentMetric.working + agentMetric.pending;
    if (activeLoad > 5) {
      loadText = "Sobrecargado";
      loadColor = "text-rose-700 bg-rose-50 border-rose-200/50";
    } else if (activeLoad > 2) {
      loadText = "Carga Alta";
      loadColor = "text-amber-700 bg-amber-50 border-amber-200/50";
    } else {
      loadText = "Carga Óptima";
      loadColor = "text-emerald-700 bg-emerald-50 border-emerald-200/50";
    }
  }

  // Pagination calculation for assignedTickets list
  const itemsPerRosterPage = 5;
  const totalRosterPages = Math.ceil(assignedTickets.length / itemsPerRosterPage) || 1;
  const currentRosterPage = Math.min(rosterPage, totalRosterPages);
  const startIndex = (currentRosterPage - 1) * itemsPerRosterPage;
  const paginatedRosterTickets = assignedTickets.slice(startIndex, startIndex + itemsPerRosterPage);

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm z-[9999] flex justify-end font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose}
      />

      {/* Drawer Container */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.35 }}
        className="relative w-full max-w-2xl md:max-w-3xl lg:max-w-4xl h-full bg-slate-50 shadow-2xl flex flex-col z-10 border-l border-slate-200 overflow-hidden"
      >
        {/* Top Accent line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-blue-700" />

        {/* Header */}
        <div className="flex justify-between items-center pb-4 pt-5 px-6 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3.5">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-white text-xs border border-white/20 shadow-inner shrink-0"
              style={{ backgroundColor: selectedAgent.avatarBg || '#2563EB' }}
            >
              {selectedAgent.initials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display font-black text-slate-900 text-sm.5 tracking-tight uppercase">
                  Resumen de Desempeño | {selectedAgent.name}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase shrink-0 leading-none ${loadColor}`}>
                  {loadText}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-semibold leading-none mt-1">
                {selectedAgent.role} {selectedAgent.team && `• ${selectedAgent.team}`}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 cursor-pointer w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all bg-transparent border-none"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        {/* Scrollable Workspace Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Unified Metrics and Distribution Panel */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider font-mono border-b border-slate-100 pb-2">
              Panel de Indicadores Unificados
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Column 1: KPIs del Técnico */}
              <div className="space-y-3">
                <h5 className="font-bold text-slate-600 text-[11px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                  KPIs del Técnico
                </h5>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="bg-slate-50/60 border border-slate-100 p-2.5 rounded-2xl text-center">
                    <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Asignados</p>
                    <p className="text-lg font-black text-slate-800 font-mono mt-0.5">{agentMetric.assigned}</p>
                  </div>
                  <div className="bg-blue-50/30 border border-blue-100/50 p-2.5 rounded-2xl text-center">
                    <p className="text-[9px] font-mono font-bold text-blue-500 uppercase tracking-wider">En Progreso</p>
                    <p className="text-lg font-black text-blue-800 font-mono mt-0.5">{agentMetric.working}</p>
                  </div>
                  <div className="bg-emerald-50/30 border border-emerald-100/50 p-2.5 rounded-2xl text-center">
                    <p className="text-[9px] font-mono font-bold text-emerald-500 uppercase tracking-wider">Completados</p>
                    <p className="text-lg font-black text-emerald-800 font-mono mt-0.5">{agentMetric.completed}</p>
                  </div>
                  <div className="bg-amber-50/20 border border-amber-100/40 p-2.5 rounded-2xl text-center">
                    <p className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-wider">Pendientes</p>
                    <p className="text-lg font-black text-amber-800 font-mono mt-0.5">{agentMetric.pending}</p>
                  </div>
                </div>
              </div>

            {/* Column 2: Distribución de Prioridades */}
            <div className="space-y-3 md:border-l md:border-slate-150 md:pl-6">
              <h5 className="font-bold text-slate-600 text-[11px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
                Desglose de Prioridades
              </h5>
              {(() => {
                const priorityColors: Record<string, string> = {
                  Urgente: 'text-red-700 bg-red-50 border-red-100',
                  Alta: 'text-rose-700 bg-rose-50 border-rose-100',
                  Media: 'text-amber-700 bg-amber-50 border-amber-100',
                  Normal: 'text-blue-700 bg-blue-50 border-blue-100',
                  Baja: 'text-slate-700 bg-slate-50 border-slate-100'
                };
                const dotColors: Record<string, string> = {
                  Urgente: 'bg-red-600',
                  Alta: 'bg-rose-500',
                  Media: 'bg-amber-500',
                  Normal: 'bg-blue-500',
                  Baja: 'bg-slate-400'
                };

                const priorityCounts = rawAssignedTickets.reduce((acc, ticket) => {
                  const p = String(ticket[priorityKey] || 'Normal').trim();
                  acc[p] = (acc[p] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const activePriorities = Object.entries(priorityCounts);

                if (activePriorities.length === 0) {
                  return (
                    <div className="flex items-center justify-center h-28 text-[11px] text-slate-400 italic">
                      Sin requerimientos asignados
                    </div>
                  );
                }

                const order = ['Urgente', 'Alta', 'Media', 'Normal', 'Baja'];
                const sortedPriorities = activePriorities.sort((a, b) => {
                  return order.indexOf(a[0]) - order.indexOf(b[0]);
                });

                const totalPriorities = sortedPriorities.reduce((acc, [_, count]) => acc + Number(count), 0);

                return (
                  <div className="mt-2 flex flex-col justify-center h-[90px]">
                    {/* Stacked Bar Distribution */}
                    <div className="w-full h-2.5 flex rounded-full overflow-hidden bg-slate-100 mb-3 shadow-inner">
                      {sortedPriorities.map(([pName, count]) => (
                        <div
                          key={pName}
                          className={`${dotColors[pName]} transition-all`}
                          style={{ width: `${(Number(count) / totalPriorities) * 100}%` }}
                          title={`${pName}: ${count}`}
                        />
                      ))}
                    </div>
                    {/* Compact legend */}
                    <div className="flex flex-wrap gap-2">
                      {sortedPriorities.map(([pName, count]) => (
                        <div key={pName} className="flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded-md border border-slate-200 shadow-sm">
                          <span className={`w-1.5 h-1.5 rounded-full ${dotColors[pName] || 'bg-slate-400'}`} />
                          <span className="text-[10px] font-bold text-slate-700">{pName}</span>
                          <span className="text-[10px] font-black text-slate-900 ml-1">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Column 3: Distribución de Carga & Productividad */}
            <div className="space-y-3 md:border-l md:border-slate-150 md:pl-6 flex flex-col">
              <h5 className="font-bold text-slate-600 text-[11px] uppercase tracking-wider font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                Productividad & Carga
              </h5>
              
              <div className="flex items-center gap-4 mt-2 flex-1">
                {/* Circular Progress for Resolution Rate */}
                <div className="relative w-14 h-14 flex items-center justify-center shrink-0 group cursor-help">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="4"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500 transition-all duration-1000 ease-out"
                      strokeWidth="4"
                      strokeDasharray={`${completedPercent}, 100`}
                      stroke="currentColor"
                      fill="none"
                      strokeLinecap="round"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-blue-500 transition-all duration-1000 ease-out"
                      strokeWidth="4"
                      strokeDasharray={`${workingPercent}, 100`}
                      strokeDashoffset={`-${completedPercent}`}
                      stroke="currentColor"
                      fill="none"
                      strokeLinecap="round"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-amber-400 transition-all duration-1000 ease-out"
                      strokeWidth="4"
                      strokeDasharray={`${pendingPercent}, 100`}
                      strokeDashoffset={`-${completedPercent + workingPercent}`}
                      stroke="currentColor"
                      fill="none"
                      strokeLinecap="round"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-black text-slate-800">{resolutionRate}%</span>
                  </div>
                  {/* Tooltip */}
                  <div className="absolute left-1/2 -top-10 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                    Resueltos: {completedPercent}% | En Proceso: {workingPercent}% | Pendientes: {pendingPercent}%
                  </div>
                </div>
                
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 mb-0.5" title="Mide la capacidad de cerrar tickets vs la carga total de asignaciones">
                      <span>Resolución Global</span>
                      <span className="text-emerald-700">{completedPercent}%</span>
                    </div>
                  </div>
                  
                  {/* Active Load Status Bar (Foco vs Latencia) */}
                  <div className="group relative cursor-help">
                    <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                      <span>Índice de Foco</span>
                      <span className="text-blue-700 font-black">{focusIndex}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                      <div
                        className="h-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${focusIndex}%` }}
                      />
                      <div
                        className="h-full bg-amber-400 transition-all duration-500 opacity-60"
                        style={{ width: `${latencyIndex}%` }}
                      />
                    </div>
                    {/* Tooltip */}
                    <div className="absolute right-0 -top-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 transition-opacity">
                      Foco (Trabajando): {focusIndex}% | Latencia (Pendiente): {latencyIndex}%
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2 pt-3 mt-auto border-t border-slate-100">
                <div className="flex items-center justify-between text-[11px]" title="Porcentaje del total del backlog del equipo que pertenece a este agente">
                  <span className="text-slate-500 font-bold font-mono text-[10px]">Carga Global Roster:</span>
                  <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded-md font-black font-mono text-[10px]">
                    {workloadShare}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px]" title="Contribución de este agente al éxito total del equipo">
                  <span className="text-slate-500 font-bold font-mono text-[10px]">Eficiencia de Equipo:</span>
                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-black font-mono text-[10px]">
                    {rosterEfficiency}% 
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Overload Warning inside the unified component */}
          {activeLoad > 5 && (
            <div className="relative overflow-hidden bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 p-3.5 rounded-2xl flex items-center gap-4 mt-4">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-200/50 text-amber-600 shrink-0 shadow-sm border border-amber-200">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-1">
                <h5 className="font-bold text-amber-900 text-[11px] uppercase tracking-wider font-mono">Sobrecarga Detectada</h5>
                <div className="flex items-center gap-3 mt-1 font-medium text-[10px] text-amber-800">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span> Actual: {activeLoad} activos
                  </span>
                  <span className="text-amber-300">|</span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Ideal sugerido: ~{idealActiveCases}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right pr-2">
                <span className="block text-xl font-black text-amber-600 font-mono leading-none">+{activeLoad - idealActiveCases}</span>
                <span className="text-[9px] font-bold text-amber-700/70 uppercase">Desviación</span>
              </div>
            </div>
          )}
          </div>

          {/* Assigned Requirements List with interactive status tab triggers inside drawer */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-850 text-xs uppercase tracking-wider font-mono">Requerimientos Asignados ({assignedTickets.length})</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Filtre y visualice los tickets activos de este técnico en el período actual.</p>
              </div>

              {/* Mini filter menu */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setRosterTicketStatusFilter('all')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    rosterTicketStatusFilter === 'all'
                      ? 'bg-white text-blue-700 shadow-3xs border border-slate-205/30'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent border-none'
                  }`}
                >
                  Todos ({rawAssignedTickets.length})
                </button>
                <button
                  onClick={() => setRosterTicketStatusFilter('working')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    rosterTicketStatusFilter === 'working'
                      ? 'bg-white text-blue-700 shadow-3xs border border-slate-205/30'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent border-none'
                  }`}
                >
                  Trabajando ({rawAssignedTickets.filter(t => {
                    const isCompleted = getIsCompleted(t);
                    const statVal = String(t[statusKey] || t["Status"] || t["Estado"] || t["status"] || t["estado"] || '');
                    return !isCompleted && isStatusInProgress(statVal);
                  }).length})
                </button>
                <button
                  onClick={() => setRosterTicketStatusFilter('pending')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    rosterTicketStatusFilter === 'pending'
                      ? 'bg-white text-blue-700 shadow-3xs border border-slate-205/30'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent border-none'
                  }`}
                >
                  Pendientes ({rawAssignedTickets.filter(t => {
                    const isCompleted = getIsCompleted(t);
                    const statVal = String(t[statusKey] || t["Status"] || t["Estado"] || t["status"] || t["estado"] || '');
                    const isWorking = !isCompleted && isStatusInProgress(statVal);
                    return !isCompleted && !isWorking;
                  }).length})
                </button>
                <button
                  onClick={() => setRosterTicketStatusFilter('completed')}
                  className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                    rosterTicketStatusFilter === 'completed'
                      ? 'bg-white text-blue-700 shadow-3xs border border-slate-205/30'
                      : 'text-slate-500 hover:text-slate-800 bg-transparent border-none'
                  }`}
                >
                  Completados ({rawAssignedTickets.filter(t => {
                    return getIsCompleted(t);
                  }).length})
                </button>
              </div>
            </div>

            {/* List of requirements with custom styling */}
            {paginatedRosterTickets.length > 0 ? (
              <div className="space-y-3">
                {paginatedRosterTickets.map((ticket, idx) => {
                  const statVal = String(ticket[statusKey] || ticket["Status"] || ticket["Estado"] || '');
                  const pVal = String(ticket[priorityKey] || 'Normal');
                  const isCompleted = getIsCompleted(ticket);

                  // Priority colors map
                  const priorityStyles: Record<string, string> = {
                    Alta: 'text-rose-700 bg-rose-50 border-rose-100',
                    Urgente: 'text-red-700 bg-red-50 border-red-100',
                    Media: 'text-amber-700 bg-amber-50 border-amber-100',
                    Normal: 'text-blue-700 bg-blue-50 border-blue-100',
                    Baja: 'text-slate-700 bg-slate-50 border-slate-100'
                  };

                  // Status badge colors
                  let statusBadgeColor = 'bg-blue-50 text-blue-800 border-blue-100';
                  if (isCompleted) {
                    statusBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-100';
                  } else if (normalizeStatus(statVal).includes('progreso') || normalizeStatus(statVal).includes('desarrollo') || normalizeStatus(statVal).includes('doing') || normalizeStatus(statVal).includes('proceso')) {
                    statusBadgeColor = 'bg-sky-50 text-sky-800 border-sky-100';
                  } else if (normalizeStatus(statVal).includes('pendiente') || normalizeStatus(statVal).includes('hold') || normalizeStatus(statVal).includes('espera')) {
                    statusBadgeColor = 'bg-amber-50 text-amber-800 border-amber-100';
                  }

                  return (
                    <div 
                      key={String(ticket[idKey]) || idx} 
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isCompleted ? 'bg-slate-50/40 border-slate-150 opacity-70' : 'bg-white border-slate-200 hover:border-slate-300 shadow-3xs'
                      }`}
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[10px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                            ID: {String(ticket[idKey])}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${priorityStyles[pVal] || 'text-slate-600 bg-slate-50 border-slate-100'}`}>
                            {pVal}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${statusBadgeColor}`}>
                            {statVal}
                          </span>
                        </div>
                        <h5 className="font-bold text-slate-800 text-xs sm:text-sm leading-snug line-clamp-1">{String(ticket[subjectKey])}</h5>
                        <p className="text-[10px] text-slate-500 font-semibold truncate">Cliente: <span className="text-slate-700 font-bold">{String(ticket[clientKey])}</span></p>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Semana Actual</span>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-150">
                  <span className="text-[10px] text-slate-500 font-bold font-mono">
                    Mostrando <span className="text-slate-800 font-black">{startIndex + 1}</span> a <span className="text-slate-800 font-black">{Math.min(startIndex + itemsPerRosterPage, assignedTickets.length)}</span> de <span className="text-slate-800 font-black">{assignedTickets.length}</span> casos
                  </span>

                  <div className="flex items-center gap-1.5 self-center sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setRosterPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentRosterPage === 1}
                      className="p-1.5 px-3 rounded-xl border border-slate-205 bg-slate-50 hover:bg-slate-100 text-slate-750 disabled:opacity-40 disabled:hover:bg-slate-50 cursor-pointer transition-all font-bold"
                    >
                      &larr; Anterior
                    </button>
                    
                    <div className="flex items-center gap-1 text-[11px] font-bold font-mono text-slate-500">
                      <span className="bg-white border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 font-black">{currentRosterPage}</span>
                      <span>/</span>
                      <span>{totalRosterPages}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRosterPage(prev => Math.min(prev + 1, totalRosterPages))}
                      disabled={currentRosterPage === totalRosterPages}
                      className="p-1.5 px-3 rounded-xl border border-slate-205 bg-slate-50 hover:bg-slate-100 text-slate-750 disabled:opacity-40 disabled:hover:bg-slate-50 cursor-pointer transition-all font-bold"
                    >
                      Siguiente &rarr;
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
                <Inbox className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs italic font-semibold">Este técnico no tiene ningún requerimiento con este estado en este período.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-4 px-6 flex justify-between items-center bg-slate-50/50 shrink-0">
          <p className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Centro de Monitoreo de Roster</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer border-none"
          >
            Cerrar Workspace
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
