// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, CheckCircle, Database, Users } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { ActivityDrawer } from '../modals/ActivityDrawer';


export const OperationsTareasTab = () => {
  const {
    activeSubTab,
    agents,
    internalTasks,
    contractorTasks,
    absenceRequests,
    absences,
    absentColaborators,
    activeAbsenceAgentIds,
    activeColaborators,
    activeInternalTasksCount,
    activeTaskType,
    agentsExceptA1,
    approveRequest,
    autoApproveAbsence,
    availableColaborators,
    calendarDaysArray,
    calendarEvents,
    calendarMonth,
    calendarViewDate,
    calendarYear,
    completingInternalTaskId,
    confirmRejectRequest,
    contractorFollowUpText,
    contractorStatusSelect,
    currentAgentId,
    currentAgentState,
    currentAlertasAgent,
    currentChatAgent,
    currentGuardiaAgent,
    currentStatus,
    daysInMonth,
    firstDayIdx,
    followingUpContractorId,
    getAgentActiveTasksCount,
    getDayWorkloadIntensity,
    getDaysInMonth,
    getFirstDayOfMonth,
    getNextMonday,
    getNextSunday,
    getRandomAgentByTier,
    handleAddAbsenceSubmit,
    handleAddCalendarEvent,
    handleAssignSpecialDuty,
    handleAutoScheduleNextWeeks,
    handleCheckIn,
    handleCheckOut,
    handleCreateContractorTask,
    handleCreateInternalTask,
    handleDeleteAbsence,
    handleDeleteContractorTask,
    handleDeleteInternalTask,
    handleNextMonth,
    handleOpenCompleteInternalTask,
    handleOpenFollowUpContractor,
    handlePrevMonth,
    handleRemoveCalendarEvent,
    handleRemoveIsolatedEvent,
    handleSaveChangesToFirestore,
    handleSaveContractorFollowUp,
    handleSaveInternalTaskCompletion,
    handleSaveWeeklySchedule,
    handleUpdateInternalTaskStatus,
    handleUpdateMyStatus,
    handleUpdateSchedule,
    handleUpdateStatus,
    hideGestionOperativa,
    internalTaskReport,
    isChangingAssignee,
    isCheckedIn,
    isCheckedOut,
    isContractorTaskDrawerOpen,
    isDirtyAusenciasRef,
    isInternalTaskDrawerOpen,
    isPast,
    isReprogrammingDate,
    isSupervisor,
    isSyncingAusenciasRef,
    isSyncingDesignacionesRef,
    isSyncingJornadaRef,
    leadingBlanks,
    loggedInAgent,
    modalAuthCode,
    modalFollowUpInput,
    modalReportInput,
    monthNames,
    myActiveInternalTasksCount,
    newAbsence,
    newContractorTask,
    newInternalTask,
    nonPendingAbsenceRequests,
    nonUserAndSpecificAgents,
    outOfOfficeColaborators,
    pendingAbsenceRequests,
    programmedVisits,
    quickEventForm,
    recalculateAndScheduleRotations,
    regularNonA1NonS1Agents,
    rejectRequest,
    rejectingRequestId,
    rejectionNote,
    selectedCalendarDay,
    selectedTaskForModal,
    setAbsenceRequests,
    setAbsences,
    setActiveTaskType,
    setAutoApproveAbsence,
    setCalendarEvents,
    setCalendarViewDate,
    setCompletingInternalTaskId,
    setContractorFollowUpText,
    setContractorStatusSelect,
    setFollowingUpContractorId,
    setInternalTaskReport,
    setIsChangingAssignee,
    setIsContractorTaskDrawerOpen,
    setIsInternalTaskDrawerOpen,
    setIsReprogrammingDate,
    setModalAuthCode,
    setModalFollowUpInput,
    setModalReportInput,
    setNewAbsence,
    setNewContractorTask,
    setNewInternalTask,
    setProgrammedVisits,
    setQuickEventForm,
    setRejectingRequestId,
    setRejectionNote,
    setSelectedCalendarDay,
    setSelectedTaskForModal,
    setShowDeleteConfirm,
    setSpecialDuties,
    setTaskModalTab,
    setTaskSearchQuery,
    setTaskViewFilter,
    setTempDueDate,
    setTempFrequency,
    setTempHasEndDate,
    setTempHasNoDate,
    setTempRecurrenceDayOfMonth,
    setTempRecurrenceDayOfWeek,
    setTempRecurrenceEndDate,
    setTempRecurrenceMonthOfYear,
    setTempScheduledDate,
    setTempStartDate,
    setTempType,
    setToast,
    showDeleteConfirm,
    showToast,
    specialDuties,
    syncAsistenciaChange,
    taskModalTab,
    taskSearchQuery,
    taskViewFilter,
    tempDueDate,
    tempFrequency,
    tempHasEndDate,
    tempHasNoDate,
    tempRecurrenceDayOfMonth,
    tempRecurrenceDayOfWeek,
    tempRecurrenceEndDate,
    tempRecurrenceMonthOfYear,
    tempScheduledDate,
    tempStartDate,
    tempType,
    toast,
    todayStrForMetrics,
    totalSuccessTasksCount
  } = useOperations();

  return (
    <>
      {/* 5. GESTIÓN DE TAREAS Y CONTRATISTAS OR REPORTE HISTORICO */}
      {activeSubTab === 'externo' && (
        <>
          {false ? (
            <div className="space-y-6 animate-fadeIn">
          
          {/* Header section without unnecessary description paragraph, with action buttons */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="font-display font-bold text-lg text-slate-900 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-indigo-600 animate-pulse" />
                Gestión Operativa de Tareas
              </h2>
            </div>
            
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => setIsInternalTaskDrawerOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Programar Tarea Interna
              </button>
            </div>
          </div>

          {/* Metrics summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Tareas Internas</p>
                <p className="text-lg font-display font-black text-slate-900">
                  {internalTasks.length} Registradas
                </p>
                <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                  {internalTasks.filter(t => t.status !== 'Completado').length} activas en proceso
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600 border border-amber-100">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Mis Pendientes</p>
                <p className="text-lg font-display font-black text-slate-900">
                  {internalTasks.filter(t => t.assignedToId === currentAgentId && t.status !== 'Completado').length} Tareas
                </p>
                <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                  Personalmente asignadas a mí
                </p>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Cerrados Total</p>
                <p className="text-lg font-display font-black text-slate-900">
                  {internalTasks.filter(t => t.status === 'Completado').length + contractorTasks.filter(c => c.status === 'Completado').length} Éxitos
                </p>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  Trabajos validados y archivados
                </p>
              </div>
            </div>
          </div>

          {/* Subtabs and controls section - beautifully positioned */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            
            {/* Segmented controls on the left */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit self-start lg:self-auto">
              <button
                onClick={() => {
                  setActiveTaskType('internas');
                  setTaskSearchQuery('');
                }}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTaskType === 'internas'
                    ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>🛠️ Tareas Internas & Recurrentes</span>
                <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                  {internalTasks.length}
                </span>
              </button>
              

            </div>

            {/* Filter buttons and Search on the right */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
              <div className="flex bg-slate-100 p-1 rounded-lg w-fit self-start sm:self-auto">
                <button
                  onClick={() => setTaskViewFilter('general')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    taskViewFilter === 'general'
                      ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  👥 Vista General
                </button>
                <button
                  onClick={() => setTaskViewFilter('mine')}
                  className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                    taskViewFilter === 'mine'
                      ? 'bg-white text-slate-800 shadow-xs border border-slate-200/50'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  👤 Asignado a mí
                </button>
              </div>

              {/* Search bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por título, notas o ticket..."
                  value={taskSearchQuery}
                  onChange={(e) => setTaskSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Full Width Task Content */}
          <div className="w-full space-y-4">
            
            {activeTaskType === 'internas' ? (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Listado de Tareas Internas & Recurrentes
                    </h3>
                    <p className="text-slate-500 text-xs">
                      {taskViewFilter === 'mine' ? 'Filtradas únicamente para mostrar las asignadas a tu persona' : 'Mapeo total de actividades y programaciones periódicas en curso.'}
                    </p>
                  </div>
                  <span className="text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-400 font-mono font-medium self-start sm:self-auto">
                    Presiona cualquier fila para ver el panel de detalles y seguimiento
                  </span>
                </div>

                {/* Table for Large Screens, Compact Cards for Mobile */}
                <div className="overflow-hidden rounded-xl border border-slate-150">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-mono font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Ticket</th>
                          <th className="py-3 px-4">Actividad Interna / Recurrente</th>
                          <th className="py-3 px-4">Responsable</th>
                          <th className="py-3 px-4">Fecha Programada</th>
                          <th className="py-3 px-4">Frecuencia</th>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {(() => {
                          let list = internalTasks;
                          
                          if (taskViewFilter === 'mine') {
                            list = list.filter(t => t.assignedToId === currentAgentId);
                          }

                          if (taskSearchQuery.trim()) {
                            const q = taskSearchQuery.toLowerCase();
                            list = list.filter(t => 
                              t.title.toLowerCase().includes(q) || 
                              t.notes.toLowerCase().includes(q) || 
                              t.ticketId.toLowerCase().includes(q)
                            );
                          }

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="text-center py-16 text-slate-400">
                                  <div className="space-y-2">
                                    <Coffee className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p>No se encontraron tareas internas que coincidan con la vista o el buscador.</p>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return list.map(task => {
                            const assignedTo = agents.find(a => a.id === task.assignedToId);
                            const initials = assignedTo ? assignedTo.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
                            
                            let badgeColor = '';
                            if (task.status === 'Pendiente') badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                            else if (task.status === 'En proceso') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                            else if (task.status === 'Completado') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                            return (
                              <tr 
                                key={task.id} 
                                onClick={() => {
                                  setSelectedTaskForModal({ type: 'internal', id: task.id });
                                  setTaskModalTab('detalles');
                                }}
                                className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                              >
                                <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                                  {task.ticketId}
                                </td>
                                <td className="py-3 px-4 max-w-xs">
                                  <div className="font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors">
                                    {task.title}
                                  </div>
                                  <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-1">
                                    {task.notes || 'Sin especificaciones...'}
                                  </p>
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0 uppercase font-mono">
                                      {initials}
                                    </div>
                                    <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                                      {assignedTo?.name || 'No asignado'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-mono font-medium">
                                  {task.scheduledDate}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded border uppercase ${
                                    task.type === 'Recurrente' ? 'bg-indigo-50/75 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'
                                  }`}>
                                    {task.type === 'Recurrente' ? task.frequency || 'Periódica' : 'Única'}
                                  </span>
                                  {task.type === 'Recurrente' && (
                                    <div className="text-[10px] text-indigo-500 font-semibold mt-1 font-sans">
                                      {getRecurrenceDescription(task)}
                                    </div>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeColor}`}>
                                    {task.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button className="text-slate-400 hover:text-indigo-600 font-bold font-mono text-[10px] uppercase tracking-wider border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50/50 rounded px-2 py-1 transition-all">
                                    Ver Detalle
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Compact List View */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {(() => {
                      let list = internalTasks;
                      if (taskViewFilter === 'mine') {
                        list = list.filter(t => t.assignedToId === currentAgentId);
                      }
                      if (taskSearchQuery.trim()) {
                        const q = taskSearchQuery.toLowerCase();
                        list = list.filter(t => 
                          t.title.toLowerCase().includes(q) || 
                          t.notes.toLowerCase().includes(q) || 
                          t.ticketId.toLowerCase().includes(q)
                        );
                      }

                      if (list.length === 0) {
                        return (
                          <div className="text-center py-10 text-slate-400 text-xs">
                            No se encontraron tareas internas.
                          </div>
                        );
                      }

                      return list.map(task => {
                        const assignedTo = agents.find(a => a.id === task.assignedToId);
                        let badgeColor = '';
                        if (task.status === 'Pendiente') badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                        else if (task.status === 'En proceso') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        else if (task.status === 'Completado') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                        return (
                          <div 
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskForModal({ type: 'internal', id: task.id });
                              setTaskModalTab('detalles');
                            }}
                            className="p-4 active:bg-slate-50 cursor-pointer space-y-3"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-mono font-bold text-indigo-600 text-[11px]">
                                {task.ticketId}
                              </span>
                              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeColor}`}>
                                {task.status}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-bold text-slate-800 text-xs leading-snug">
                                {task.title}
                              </h4>
                              {task.type === 'Recurrente' && (
                                <div className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1 my-1">
                                  <span>🔁</span> {getRecurrenceDescription(task)}
                                </div>
                              )}
                              <p className="text-slate-400 text-[10px] line-clamp-2">
                                {task.notes || 'Sin especificaciones...'}
                              </p>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                              <span>Asignado: <strong className="text-slate-700">{assignedTo?.name || 'No asignado'}</strong></span>
                              <span className="font-mono font-medium">{task.scheduledDate}</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-100">
                  <div>
                    <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      Auditoría y Seguimiento de Contratistas externos
                    </h3>
                    <p className="text-slate-500 text-xs">
                      {taskViewFilter === 'mine' ? 'Visualizando contratistas bajo tu exclusiva responsabilidad de roster' : 'Coordinación completa de servicios subcontratados con responsable del equipo.'}
                    </p>
                  </div>
                  <span className="text-[10px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-400 font-mono font-medium self-start sm:self-auto">
                    Presiona cualquier asignación para registrar avance, ver histórico o auditar
                  </span>
                </div>

                {/* Table for Large Screens, Compact Cards for Mobile */}
                <div className="overflow-hidden rounded-xl border border-slate-150">
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 font-mono font-bold text-[10px] uppercase tracking-wider border-b border-slate-200">
                          <th className="py-3 px-4">Ticket</th>
                          <th className="py-3 px-4">Servicio Subcontratado</th>
                          <th className="py-3 px-4">Empresa Contratista</th>
                          <th className="py-3 px-4">Supervisor Roster</th>
                          <th className="py-3 px-4">Plazo Estimado</th>
                          <th className="py-3 px-4">Estado</th>
                          <th className="py-3 px-4 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {(() => {
                          let list = contractorTasks;
                          
                          if (taskViewFilter === 'mine') {
                            list = list.filter(c => c.supervisorAgentId === currentAgentId);
                          }

                          if (taskSearchQuery.trim()) {
                            const q = taskSearchQuery.toLowerCase();
                            list = list.filter(c => 
                              c.title.toLowerCase().includes(q) || 
                              c.contractorName.toLowerCase().includes(q) || 
                              c.notes.toLowerCase().includes(q) || 
                              c.ticketId.toLowerCase().includes(q)
                            );
                          }

                          if (list.length === 0) {
                            return (
                              <tr>
                                <td colSpan={7} className="text-center py-16 text-slate-400">
                                  <div className="space-y-2">
                                    <Coffee className="w-8 h-8 text-slate-300 mx-auto" />
                                    <p>No hay contratistas en la vista seleccionada.</p>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return list.map(task => {
                            const supervisor = agents.find(a => a.id === task.supervisorAgentId);
                            const initials = supervisor ? supervisor.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';

                            let badgeColor = '';
                            if (task.status === 'Asignado a Contratista') badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                            else if (task.status === 'En proceso por Contratista') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                            else if (task.status === 'Revisión por Supervisor') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                            else if (task.status === 'Completado') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                            return (
                              <tr 
                                key={task.id} 
                                onClick={() => {
                                  setSelectedTaskForModal({ type: 'contractor', id: task.id });
                                  setTaskModalTab('detalles');
                                }}
                                className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                              >
                                <td className="py-3 px-4 font-mono font-bold text-purple-600">
                                  {task.ticketId}
                                </td>
                                <td className="py-3 px-4 max-w-xs">
                                  <div className="font-bold text-slate-800 leading-tight group-hover:text-purple-600 transition-colors">
                                    {task.title}
                                  </div>
                                  <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-1">
                                    {task.notes || 'Sin especificaciones...'}
                                  </p>
                                </td>
                                <td className="py-3 px-4 font-semibold text-slate-700">
                                  {task.contractorName}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0 uppercase font-mono">
                                      {initials}
                                    </div>
                                    <span className="font-semibold text-slate-700 truncate max-w-[120px]">
                                      {supervisor?.name || 'No asignado'}
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-slate-500 font-mono font-medium">
                                  {task.startDate} ➜ {task.dueDate}
                                </td>
                                <td className="py-3 px-4">
                                  <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeColor}`}>
                                    {task.status}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button className="text-slate-400 hover:text-purple-600 font-bold font-mono text-[10px] uppercase tracking-wider border border-slate-200 group-hover:border-purple-200 group-hover:bg-purple-50/50 rounded px-2 py-1 transition-all">
                                    Auditar
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Compact Contractor List View */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {(() => {
                      let list = contractorTasks;
                      if (taskViewFilter === 'mine') {
                        list = list.filter(c => c.supervisorAgentId === currentAgentId);
                      }
                      if (taskSearchQuery.trim()) {
                        const q = taskSearchQuery.toLowerCase();
                        list = list.filter(c => 
                          c.title.toLowerCase().includes(q) || 
                          c.contractorName.toLowerCase().includes(q) || 
                          c.notes.toLowerCase().includes(q) || 
                          c.ticketId.toLowerCase().includes(q)
                        );
                      }

                      if (list.length === 0) {
                        return (
                          <div className="text-center py-10 text-slate-400 text-xs">
                            No se encontraron contratistas.
                          </div>
                        );
                      }

                      return list.map(task => {
                        const supervisor = agents.find(a => a.id === task.supervisorAgentId);
                        let badgeColor = '';
                        if (task.status === 'Asignado a Contratista') badgeColor = 'bg-slate-50 text-slate-600 border-slate-200';
                        else if (task.status === 'En proceso por Contratista') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200';
                        else if (task.status === 'Revisión por Supervisor') badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                        else if (task.status === 'Completado') badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                        return (
                          <div 
                            key={task.id}
                            onClick={() => {
                              setSelectedTaskForModal({ type: 'contractor', id: task.id });
                              setTaskModalTab('detalles');
                            }}
                            className="p-4 active:bg-slate-50 cursor-pointer space-y-3"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-mono font-bold text-purple-600 text-[11px]">
                                {task.ticketId}
                              </span>
                              <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeColor}`}>
                                {task.status}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="font-bold text-slate-800 text-xs leading-snug">
                                {task.title}
                              </h4>
                              <p className="text-slate-600 text-[11px] font-medium">
                                Empresa: {task.contractorName}
                              </p>
                              <p className="text-slate-400 text-[10px] line-clamp-2">
                                {task.notes || 'Sin especificaciones...'}
                              </p>
                            </div>

                            <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100">
                              <span>Supervisor: <strong className="text-slate-700">{supervisor?.name || 'No asignado'}</strong></span>
                              <span className="font-mono font-medium">{task.startDate}</span>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-slate-500 min-h-[450px] border border-slate-200 rounded-3xl bg-slate-50/50 backdrop-blur-sm shadow-sm animate-fadeIn">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full text-center space-y-4"
              >
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto mb-2 shadow-sm">
                  <Database className="w-8 h-8 animate-pulse" />
                </div>
                <h3 className="text-xl font-black font-display text-slate-900 tracking-tight">Próximamente: Reporte Histórico</h3>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Estamos trabajando en un motor de analítica avanzada para comparar períodos, ver tendencias mensuales de tickets y medir la efectividad acumulada del equipo técnico.
                </p>
                <div className="pt-2">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-black uppercase tracking-widest border border-emerald-100">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    Módulo en Desarrollo
                  </span>
                </div>
              </motion.div>
            </div>
          )}
        </>
      )}


    </>
  );
};
