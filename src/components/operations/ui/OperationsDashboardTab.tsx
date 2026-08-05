// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, CheckCircle, ChevronsLeft, ChevronsRight, Plane, Shield, Users } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { ActivityDrawer } from '../modals/ActivityDrawer';


export const OperationsDashboardTab = () => {
  const {
    activeSubTab,
    agents,
    asistencia,
    internalTasks,
    contractorTasks,
    bitacoraPage,
    setBitacoraPage,
    BITACORA_PAGE_SIZE,
    drawerAgentId,
    setDrawerAgentId,
    dutyStates,
    setDutyStates,
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
    selectedAgendaItem,
    setSelectedAgendaItem,
    tempStartDate,
    tempType,
    toast,
    todayStrForMetrics,
    totalSuccessTasksCount
  } = useOperations();

  return (
    <>
      {/* 1. DASHBOARD OPERATIVO */}
      {activeSubTab === 'dashboard' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Real-time Status Counter Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Colaboradores Activos</p>
                <p className="text-2xl font-black text-slate-900">{activeColaborators} <span className="text-slate-400 text-sm">/ {agents.length}</span></p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Disponibles Ahora</p>
                <p className="text-2xl font-black text-emerald-600">{availableColaborators}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                <UserCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Fuera de Oficina</p>
                <p className="text-2xl font-black text-amber-600">{outOfOfficeColaborators}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <UserX className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-mono text-[9px] text-slate-400 font-bold uppercase tracking-wider">Vacaciones & Permisos</p>
                <p className="text-2xl font-black text-blue-600">{absentColaborators}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <Plane className="w-5 h-5" />
              </div>
            </div>

          </div>

          {/* Core Roles in Duty Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            <div className="bg-gradient-to-b from-blue-900/5 to-transparent bg-white border border-blue-200 p-5 rounded-xl shadow-sm relative">
              <div className="absolute top-4 right-4 text-blue-600 bg-blue-50 p-1.5 rounded-lg border border-blue-100">
                <Shield className="w-5 h-5" />
              </div>
              <p className="font-mono text-[9px] text-blue-700 font-bold uppercase tracking-widest mb-1.5">Guardia Especializada (24H)</p>
              <h3 className="font-display font-black text-lg text-slate-900 leading-snug">
                {currentGuardiaAgent?.name || 'No Asignado'}
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-1">
                Excluido automáticamente de chats o alertas por alta carga de resolución autónoma y llamadas directas.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">Rango: {currentGuardiaAgent?.tierId.toUpperCase() || 'L1'}</span>
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                <span className="text-[10px] text-slate-400">Activa Hoy</span>
              </div>
            </div>

            <div className="bg-gradient-to-b from-emerald-900/5 to-transparent bg-white border border-emerald-200 p-5 rounded-xl shadow-sm relative">
              <div className="absolute top-4 right-4 text-emerald-600 bg-emerald-50 p-1.5 rounded-lg border border-emerald-100">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="font-mono text-[9px] text-emerald-700 font-bold uppercase tracking-widest mb-1.5">Monitoreo de Chat Principal</p>
              <h3 className="font-display font-black text-lg text-slate-900 leading-snug">
                {currentChatAgent?.name || 'No Asignado'}
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-1">
                Encargado de coordinar colas entrantes, asegurar tiempos de primera respuesta y canalizar casos.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">Tiques Activos: {getAgentActiveTasksCount(specialDuties.chatId)}</span>
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-slate-400">Canal Atendido</span>
              </div>
            </div>

            <div className="bg-gradient-to-b from-rose-900/5 to-transparent bg-white border border-rose-200 p-5 rounded-xl shadow-sm relative">
              <div className="absolute top-4 right-4 text-rose-600 bg-rose-50 p-1.5 rounded-lg border border-rose-100">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <p className="font-mono text-[9px] text-rose-700 font-bold uppercase tracking-widest mb-1.5">Monitoreo de Alertas Críticas</p>
              <h3 className="font-display font-black text-lg text-slate-900 leading-snug">
                {currentAlertasAgent?.name || 'No Asignado'}
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-1">
                Vigila la consola de alarmas de infraestructura. Coordina escalamientos críticos en caliente.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <span className="text-[10px] font-mono bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-bold">Consola: Activa</span>
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-slate-400">Sistemas bajo control</span>
              </div>
            </div>

          </div>

          {/* Operational Load Matrix & Realtime Roster Status Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Live Operational Matrix Map */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm xl:col-span-2 h-full">
              <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-indigo-600" />
                Matriz de Estado y Gestión Operativa del Equipo
              </h3>
              <p className="text-slate-500 text-xs mb-4">
                Consola de monitoreo en tiempo real: disponibilidad, horarios, coberturas críticas y ausencias activas.
              </p>

              {/* Table wrapper for perfect horizontal scroll on mobile */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[850px]">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2.5 pb-3">Técnico</th>
                      <th className="py-2.5 pb-3">Estado</th>
                      <th className="py-2.5 pb-3">Horario Hoy</th>
                      <th className="py-2.5 pb-3">Check-in</th>
                      <th className="py-2.5 pb-3">Check-out</th>
                      <th className="py-2.5 pb-3">Roles</th>
                      <th className="py-2.5 pb-3">Asistencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    
                    {(() => {
                      const renderAgentRow = (agent: Agent) => {
                      const state = dutyStates.find(s => s.agentId === agent.id);
                      const isGuardia = agent.id === specialDuties.guardiaId;
                      const isChat = agent.id === specialDuties.chatId;
                      const isAlert = agent.id === specialDuties.alertasId;
                      
                      const todayDateStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                      
                      const hasActiveVisitToday = programmedVisits.some(v => {
                        if (v.estado_visita === 'Cerrada') return false;
                        const visitDate = (v.fecha_visita || '').split(' ')[0];
                        if (visitDate !== todayDateStr) return false;
                        const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
                        if (!techName) return false;
                        return (agent.name || '').toLowerCase().includes(techName) || (agent.id || '').toLowerCase() === techName;
                      });

                      const hadVisitToday = programmedVisits.some(v => {
                        const visitDate = (v.fecha_visita || '').split(' ')[0];
                        if (visitDate !== todayDateStr) return false;
                        const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
                        if (!techName) return false;
                        return (agent.name || '').toLowerCase().includes(techName) || (agent.id || '').toLowerCase() === techName;
                      });

                      const hasVisitToday = hasActiveVisitToday;

                      const activeAbsence = !hasActiveVisitToday && absences.find(a => {
                        return a.agentId === agent.id && todayDateStr >= a.startDate && todayDateStr <= a.endDate;
                      });
                      
                      const scheduleObj = state?.weeklySchedule || createDefaultWeeklySchedule(state?.workSchedule || '08:00 - 17:00');
                      const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                      const todayName = SPANISH_DAYS[new Date().getDay()];
                      const todaySchedule = scheduleObj[todayName];
                      let todayScheduleStr = 'Libre';
                      if (todaySchedule && todaySchedule.isActive) {
                        todayScheduleStr = `${todaySchedule.start} - ${todaySchedule.end}`;
                        if (todaySchedule.isRemote) { 
                          todayScheduleStr += ' (Remoto)';
                        }
                      }
                      const isA1 = agent.tierId?.toLowerCase() === 'a1';
                      if (isA1) todayScheduleStr = 'N/A';
                      if (activeAbsence) todayScheduleStr = 'N/A';
                      
                      // STATUS LOGIC FIX: Respect manual busy/active states selected by the user
                      let status = state?.status || 'Disponible';
                      const isManualBusyState = ['En llamada', 'Ocupado', 'En almuerzo', 'En reunión', 'En capacitación'].includes(status);
                      
                      if (!isManualBusyState) {
                        if (activeAbsence) {
                          status = 'Ausente';
                        } else if (hasActiveVisitToday) {
                          status = 'En Visita';
                        } else if (status === 'En Visita' && !hasActiveVisitToday) {
                          status = 'Disponible'; // Visit closed or completed -> Back in office
                        } else if (isA1) {
                          status = 'Disponible';
                        } else if (status === 'Ausente' && !activeAbsence) {
                          status = 'Disponible'; // Fix for old data fallback
                        }
                      }

                      let statusBg = 'bg-slate-50 text-slate-700 border-slate-200';
                      let statusIndicator = 'bg-slate-400';
                      
                      if (status === 'Disponible') {
                        statusBg = 'bg-emerald-50 text-emerald-750 border-emerald-100';
                        statusIndicator = 'bg-emerald-500 animate-pulse';
                      } else if (status === 'En Visita') {
                        statusBg = 'bg-blue-50 text-blue-800 border-blue-100';
                        statusIndicator = 'bg-blue-500 animate-pulse';
                      } else if (status === 'En llamada') {
                        statusBg = 'bg-indigo-50 text-indigo-700 border-indigo-100';
                        statusIndicator = 'bg-indigo-500';
                      } else if (status === 'Ocupado') {
                        statusBg = 'bg-rose-50 text-rose-700 border-rose-100';
                        statusIndicator = 'bg-rose-500 animate-pulse';
                      } else if (status === 'En almuerzo') {
                        statusBg = 'bg-amber-50 text-amber-700 border-amber-100';
                        statusIndicator = 'bg-amber-500';
                      } else if (status === 'En reunión') {
                        statusBg = 'bg-blue-50 text-blue-700 border-blue-100';
                        statusIndicator = 'bg-blue-500';
                      } else if (status === 'En capacitación') {
                        statusBg = 'bg-purple-50 text-purple-700 border-purple-100';
                        statusIndicator = 'bg-purple-500';
                      } else if (status === 'Fuera de oficina') {
                        statusBg = 'bg-orange-50 text-orange-700 border-orange-100';
                        statusIndicator = 'bg-orange-500';
                      } else if (status === 'Ausente') {
                        statusBg = 'bg-rose-50 text-rose-700 border-rose-150';
                        statusIndicator = 'bg-rose-500';
                      } else if (status === 'Finalizó su jornada') {
                        statusBg = 'bg-slate-100 text-slate-500 border-slate-200';
                        statusIndicator = 'bg-slate-400';
                      }
                      
                      // ASISTENCIA (ADHERENCIA) LOGIC
                      // Use todayDateStr for the matrix to always show real-time adherence for today
                      const currentAsistencia = asistencia.find(a => a.idAgente === agent.id && a.fecha === todayDateStr);
                      let adherenciaEstado = currentAsistencia?.estado;
                      
                      let expectedCheckIn = null;
                      if (todaySchedule && todaySchedule.isActive) {
                          expectedCheckIn = todaySchedule.start;
                      }

                      const isRemoto = todaySchedule?.isActive && todaySchedule?.isRemote;

                      if (isRemoto) {
                        adherenciaEstado = 'Remoto';
                      } else if (hasActiveVisitToday) {
                        adherenciaEstado = 'Presente';
                      } else if (activeAbsence) {
                        adherenciaEstado = activeAbsence.type === 'Vacaciones' ? 'Vacaciones' : 'Permiso';
                      } else if (hadVisitToday || currentAsistencia?.estado === 'Visita' || currentAsistencia?.esJustificacion) {
                        // Technician had a visit today (active or closed). Late check-in is justified by visit -> Presente
                        adherenciaEstado = 'Presente';
                      } else if (adherenciaEstado && adherenciaEstado !== 'Presente' && adherenciaEstado !== 'Pendiente') {
                          // keep explicit state
                      } else if (currentAsistencia?.checkIn) {
                          adherenciaEstado = 'Presente';
                          if (expectedCheckIn && !currentAsistencia.esJustificacion) {
                              const [cHour, cMin] = currentAsistencia.checkIn.split(':').map(Number);
                              const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
                              const diff = (cHour * 60 + cMin) - (eHour * 60 + eMin);
                              
                              if (diff > 15) {
                                  adherenciaEstado = 'Requiere justificación';
                              } else if (diff > 0 && diff <= 15) {
                                  adherenciaEstado = 'Gracia';
                              }
                          }
                      } else {
                          adherenciaEstado = 'Sin registro';
                      }

                      let adherenciaColor = 'text-slate-500 bg-slate-50 border-slate-200';
                      if (adherenciaEstado === 'Remoto') adherenciaColor = 'text-blue-700 bg-blue-50 border-blue-200';
                      else if (adherenciaEstado === 'Presente') adherenciaColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                      else if (adherenciaEstado === 'Ausente') adherenciaColor = 'text-rose-700 bg-rose-50 border-rose-200';
                      else if (adherenciaEstado === 'Tardanza' || adherenciaEstado === 'En Falta') adherenciaColor = 'text-amber-700 bg-amber-50 border-amber-200';
                      else if (adherenciaEstado === 'Requiere justificación') adherenciaColor = 'text-red-700 bg-red-50 border-red-200';
                      else if (adherenciaEstado === 'Permiso') adherenciaColor = 'text-blue-700 bg-blue-50 border-blue-200';
                      else if (adherenciaEstado === 'Vacaciones') adherenciaColor = 'text-indigo-700 bg-indigo-50 border-indigo-200';
                      else if (adherenciaEstado === 'Licencia Médica') adherenciaColor = 'text-purple-700 bg-purple-50 border-purple-200';
                      else if (adherenciaEstado === 'Suspensión') adherenciaColor = 'text-red-700 bg-red-50 border-red-200';
                      else if (adherenciaEstado === 'Feriado') adherenciaColor = 'text-fuchsia-700 bg-fuchsia-50 border-fuchsia-200';
                      else if (adherenciaEstado === 'Libre') adherenciaColor = 'text-teal-700 bg-teal-50 border-teal-200';
                      else if (adherenciaEstado === 'Home Office') adherenciaColor = 'text-cyan-700 bg-cyan-50 border-cyan-200';

                      return (
                        <tr key={agent.id} onClick={() => setDrawerAgentId(agent.id)} className="hover:bg-indigo-50/30 transition-colors cursor-pointer group">
                          {/* Col 1: Técnico */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-800 flex items-center justify-center text-[10px] font-bold shrink-0 border border-slate-200/50">
                                {agent.name.substring(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-sans text-xs font-bold text-slate-800 leading-tight">{agent.name}</p>
                              </div>
                            </div>
                          </td>
                          {/* Col 2: Estado */}
                          <td className="py-3 pr-4">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-bold w-fit ${statusBg}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusIndicator}`} />
                                {status}
                              </span>
                          </td>
                          {/* Col 3: Horario Laboral Hoy */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-500 transition-colors shrink-0" />
                              <span className="font-mono text-[11px] text-slate-600 font-bold group-hover:text-indigo-700 transition-colors whitespace-nowrap">
                                {todayScheduleStr}
                              </span>
                            </div>
                          </td>
                          {/* Col 4: Check-in */}
                          <td className="py-3 pr-4">
                            <span className="font-mono text-[11px] font-bold text-slate-600">
                                {isA1 || activeAbsence ? 'N/A' : (state?.checkInTime || '--:--')}
                            </span>
                          </td>
                          {/* Col 5: Check-out */}
                          <td className="py-3 pr-4">
                            <span className="font-mono text-[11px] font-bold text-slate-600">
                                {isA1 || activeAbsence ? 'N/A' : (state?.checkOutTime || '--:--')}
                            </span>
                          </td>
                          {/* Col 6: Roles de Cobertura */}
                          <td className="py-3">
                            <div className="flex flex-wrap gap-1">
                              {isGuardia && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono bg-blue-50 text-blue-800 border border-blue-100 px-1.5 py-0.5 rounded font-extrabold" title="Guardia 24H">
                                  🛡️ Guardia
                                </span>
                              )}
                              {isChat && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.5 rounded font-extrabold" title="Chat Principal">
                                  💬 Chat
                                </span>
                              )}
                              {isAlert && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-mono bg-rose-50 text-rose-800 border border-rose-100 px-1.5 py-0.5 rounded font-extrabold" title="Monitoreo de Alertas">
                                  🚨 Alertas
                                </span>
                              )}
                              {!isGuardia && !isChat && !isAlert && (
                                <span className="text-[10px] text-slate-400 font-mono">—</span>
                              )}
                            </div>
                          </td>
                          {/* Col 7: Asistencia */}
                          <td className="py-3 pl-2">
                             <span className={`text-[10px] font-bold px-2 py-1 rounded border whitespace-nowrap ${adherenciaColor}`}>
                               {adherenciaEstado}
                             </span>
                          </td>
                        </tr>
                      );
                      };

                      const regularAgents = agents.filter(a => a.tierId?.toLowerCase() !== 'a1');
                      const a1Agents = agents.filter(a => a.tierId?.toLowerCase() === 'a1');

                      return (
                        <>
                          {regularAgents.map(renderAgentRow)}
                          {a1Agents.length > 0 && (
                            <tr>
                               <td colSpan={7} className="bg-slate-50 border-y border-slate-200 py-2 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">
                                  Equipo A1
                               </td>
                            </tr>
                          )}
                          {a1Agents.map(renderAgentRow)}
                        </>
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bitácora de Sucesos */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col h-full min-h-[520px]">
              <div className="mb-4">
                <h3 className="font-display font-black text-base text-slate-800 flex items-center gap-2.5">
                  <div className="p-1.5 bg-blue-50 rounded-lg">
                    <Coffee className="w-4 h-4 text-blue-600" />
                  </div>
                  Bitácora de Sucesos
                </h3>
              </div>

              <div className="flex-1 flex flex-col min-h-0">
                {(() => {
                  const todayTime = new Date(new Date().setHours(0,0,0,0)).getTime();
                  const logEntries = [
                    ...internalTasks.filter(t => t.status !== 'Completado' && t.showInBitacora).map(t => ({ ...t, source: 'internal_task', agent: agents.find(a => a.id === t.assignedToId) })),
                    ...contractorTasks.filter(c => c.status !== 'Completado').map(t => ({ ...t, source: 'contractor_task', agent: agents.find(a => a.id === t.supervisorAgentId) })),
                    ...absences.filter(a => new Date(a.endDate).getTime() >= todayTime).map(a => ({ ...a, source: 'absence', agent: agents.find(ag => ag.id === a.agentId), title: agents.find(ag => ag.id === a.agentId)?.name })),
                    ...programmedVisits.filter(v => v.estado_visita === 'Programada' || v.estado_visita === 'En Ejecución').map(v => {
                      const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
                      const matchedAgent = techName ? agents.find(a => (a.name || '').toLowerCase().includes(techName) || (a.id || '').toLowerCase() === techName) : undefined;
                      const isExternal = v.tecnico_visita_tipo === 'external_contractor';
                      return {
                        ...v,
                        id: v.id || v.ID,
                        source: isExternal ? 'contractor_task' : 'programmed_visit',
                        agent: matchedAgent || { name: v.tecnico_visita || v.tecnico || 'Sin asignar' },
                        title: `${v.cliente || 'Visita'}: ${v.asunto || 'Visita Programada'} (${v.tecnico || 'Contratista'})`,
                        type: isExternal ? 'Visita Contratista' : 'Visita'
                      };
                    })
                  ].sort((a, b) => {
                    const getDate = (item: any) => {
                      if (item.source === 'internal_task') return new Date(item.scheduledDate || 0).getTime();
                      if (item.source === 'contractor_task') return new Date(item.dueDate || item.startDate || 0).getTime();
                      if (item.source === 'absence') return new Date(item.startDate || 0).getTime();
                      if (item.source === 'programmed_visit') return new Date((item.fecha_visita || '').split(' ')[0] || 0).getTime();
                      return 0;
                    };
                    return getDate(a) - getDate(b);
                  });

                  const totalPages = Math.ceil(logEntries.length / BITACORA_PAGE_SIZE);
                  const startIndex = (bitacoraPage - 1) * BITACORA_PAGE_SIZE;
                  const visibleEntries = logEntries.slice(startIndex, startIndex + BITACORA_PAGE_SIZE);

                  return (
                    <>
                      <div className="flex-1 space-y-2 overflow-y-auto no-scrollbar pb-2">
                        {visibleEntries.length > 0 ? (
                          visibleEntries.map((item: any) => {
                            const isInternal = item.source === 'internal_task';
                            const isContractor = item.source === 'contractor_task';
                            const isAbsence = item.source === 'absence';
                            const isVisit = item.source === 'programmed_visit';

                            let colorClass = "bg-slate-50 border-slate-200 hover:border-slate-300";
                            let badgeClass = "bg-slate-100 text-slate-600";
                            let accentColor = "text-slate-500";
                            let iconColor = "bg-slate-400";
                            let label = item.type;
                            
                            if (isInternal) {
                              colorClass = "bg-amber-50/20 border-amber-100/50 hover:border-amber-300";
                              badgeClass = "bg-amber-100/80 text-amber-700";
                              accentColor = "text-amber-600";
                              iconColor = "bg-amber-500";
                            } else if (isContractor) {
                              colorClass = "bg-violet-50/20 border-violet-100/50 hover:border-violet-300";
                              badgeClass = "bg-violet-100/80 text-violet-700";
                              accentColor = "text-violet-600";
                              iconColor = "bg-violet-500";
                              label = "CONTRATISTA";
                            } else if (isAbsence) {
                              colorClass = "bg-blue-50/20 border-blue-100/50 hover:border-blue-300";
                              badgeClass = "bg-blue-100/80 text-blue-700";
                              accentColor = "text-blue-600";
                              iconColor = "bg-blue-500";
                            } else if (isVisit) {
                              colorClass = "bg-sky-50/20 border-sky-100/50 hover:border-sky-300";
                              badgeClass = "bg-sky-100/80 text-sky-700";
                              accentColor = "text-sky-600";
                              iconColor = "bg-sky-500";
                              label = "VISITA";
                            }

                            return (
                              <button 
                                key={`${item.source}-${item.id}`} 
                                onClick={() => setSelectedAgendaItem(item)}
                                className={`w-full text-left border p-2.5 rounded-xl transition-all group cursor-pointer flex items-center justify-between gap-3 ${colorClass} hover:shadow-sm active:scale-[0.99]`}
                              >
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${badgeClass}`}>
                                      {label}
                                    </span>
                                    <span className={`text-[8px] font-bold truncate opacity-70`}>
                                      {item.agent?.name}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-[10px] text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                                    {item.title}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 bg-white/50 px-2 py-1 rounded-lg border border-slate-100">
                                  <span className={`w-1.5 h-1.5 rounded-full ${iconColor}`} />
                                  <span className={`text-[8px] font-black uppercase tracking-tighter ${accentColor}`}>
                                    {isAbsence ? 'AGENDA' : isContractor ? 'EXTERNO' : isVisit ? 'VISITA' : 'INTERNO'}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-2 opacity-30">
                            <CheckCircle className="w-6 h-6 text-slate-300" />
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Sin eventos</p>
                          </div>
                        )}
                      </div>

                      {/* Compact Pagination */}
                      <div className="flex items-center justify-center mt-auto pt-4 border-t border-slate-100">
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                          <button 
                            onClick={() => setBitacoraPage(1)}
                            disabled={bitacoraPage === 1}
                            className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-800 disabled:opacity-20 rounded-lg transition-all cursor-pointer"
                          >
                            <ChevronsLeft className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setBitacoraPage(p => Math.max(1, p - 1))}
                            disabled={bitacoraPage === 1}
                            className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-800 disabled:opacity-20 rounded-lg transition-all cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>

                          <div className="flex items-center gap-1.5 px-3 border-x border-slate-200 mx-0.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase">Pág.</span>
                            <div className="bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-black text-slate-800 min-w-[24px] text-center shadow-sm">
                              {bitacoraPage}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 uppercase">/ {totalPages || 1}</span>
                          </div>

                          <button 
                            onClick={() => setBitacoraPage(p => Math.min(totalPages, p + 1))}
                            disabled={bitacoraPage === totalPages || totalPages === 0}
                            className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-800 disabled:opacity-20 rounded-lg transition-all cursor-pointer"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => setBitacoraPage(totalPages)}
                            disabled={bitacoraPage === totalPages || totalPages === 0}
                            className="p-1.5 hover:bg-white text-slate-400 hover:text-slate-800 disabled:opacity-20 rounded-lg transition-all cursor-pointer"
                          >
                            <ChevronsRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

          </div>

        </div>
      )}


    </>
  );
};
