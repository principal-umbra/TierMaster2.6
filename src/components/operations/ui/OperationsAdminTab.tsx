// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, ArrowRightLeft, CalendarDays, Check, CheckCircle, Clock8, Plane, Shield, Users } from 'lucide-react';
import { AsistenciaRowComponent } from '../AsistenciaRowComponent';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { ActivityDrawer } from '../modals/ActivityDrawer';
import { DAYS_OF_WEEK } from '../utils/helpers';
import { fetchAsistencia, pushAsistencia } from '../../../db/asistenciaService';


export const OperationsAdminTab = () => {
  const {
    currentUser,
    activeSubTab,
    agents,
    asistencia,
    setAsistencia,
    selectedAsistenciaDate,
    setSelectedAsistenciaDate,
    isSyncingAsistencia,
    setIsSyncingAsistencia,
    editingAgentId,
    setEditingAgentId,
    tempWeeklySchedule,
    setTempWeeklySchedule,
    adminSubTab,
    setAdminSubTab,
    revealedReasons,
    toggleReason,
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
    tempStartDate,
    tempType,
    toast,
    todayStrForMetrics,
    totalSuccessTasksCount
  } = useOperations();

  return (
    <>
      {/* 2. ADMINISTRACIÓN OPERATIVA */}
      {activeSubTab === 'administracion' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Sub-tabs for Administracion Operativa - Solo dejar la navegacion de las pestañas */}
          <div className="flex p-1 bg-slate-100 border border-slate-200/60 rounded-xl shrink-0 gap-1 overflow-x-auto no-scrollbar w-fit">
            <button
              type="button"
              onClick={() => setAdminSubTab('cobertura')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                adminSubTab === 'cobertura'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Shield className="w-4 h-4 text-indigo-600" />
              Cobertura & Asignaciones
            </button>
            <button
              type="button"
              onClick={() => setAdminSubTab('jornada')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                adminSubTab === 'jornada'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock8 className="w-4 h-4 text-indigo-600" />
              Jornada
            </button>
            <button
              type="button"
              onClick={() => setAdminSubTab('asistencia')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                adminSubTab === 'asistencia'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4 text-indigo-600" />
              Asistencia
            </button>
            <button
              type="button"
              onClick={() => setAdminSubTab('solicitudes')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-sans text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                adminSubTab === 'solicitudes'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plane className="w-4 h-4 text-indigo-600" />
              Solicitudes de Ausencias
            </button>
          </div>

          {/* Conditional helper banners - removed Control de Presencia / Jornada description */}
          {adminSubTab === 'cobertura' && (
            <div className="bg-blue-50/65 border border-blue-200 p-4 rounded-xl flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-display font-bold text-slate-900 text-sm">Cobertura & Asignaciones de Responsabilidades</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  El sistema de Tier Master promueve la <strong>equidad laboral exenta de fatiga</strong>. Un agente designado para la 
                  <strong> Guardia de 24 horas</strong> tiene prohibido asumir de forma concurrente el rol de Responsable de Chat o Alertas. 
                  Utiliza este panel para delegar responsabilidades equilibrando la carga de supervisión.
                </p>
              </div>
              
            </div>
          )}

          {adminSubTab === 'solicitudes' && (
            <div className="bg-purple-50/65 border border-purple-200 p-4 rounded-xl flex items-start gap-3">
              <Plane className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="font-display font-bold text-slate-900 text-sm">Aprobación & Gestión de Solicitudes de Ausencia</h4>
                <p className="text-slate-600 text-xs leading-relaxed">
                  Revisa las solicitudes de vacaciones, días de asuntos propios, licencias médicas y solicitudes de trabajo remoto enviadas por el equipo. 
                  Autoriza o rechaza solicitudes en tiempo real garantizando la cobertura operativa del roster.
                </p>
              </div>
            </div>
          )}

          {adminSubTab === 'cobertura' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Designate Guardia Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                  <Shield className="w-4 h-4 font-black" />
                </div>
                <div>
                  <h4 className="font-display font-black text-sm text-slate-900 leading-none">Guardia Técnica</h4>
                  <p className="text-slate-400 text-[10px] font-mono mt-1">24 HORAS CONSECUTIVAS</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">Técnico Designado</p>
                <p className="font-bold text-slate-800 text-xs mt-1">{currentGuardiaAgent?.name || 'No Designado'}</p>
                <p className="text-[10px] text-slate-500 mt-1">Soporte remoto crítico y guardián de incidentes.</p>
              </div>

              {isSupervisor ? (
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Asignar Guardia</label>
                  <select
                    value={specialDuties.guardiaId}
                    onChange={(e) => handleAssignSpecialDuty('guardia', e.target.value)}
                    className="w-full text-xs font-medium p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  >
                    {regularNonA1NonS1Agents.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.tierId?.toUpperCase() || 'L1'})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center italic">Solo un administrador puede delegar este rol</p>
              )}
            </div>

            {/* Designate Chat Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-black text-sm text-slate-900 leading-none">Responsable del Chat</h4>
                  <p className="text-slate-400 text-[10px] font-mono mt-1">MONITOREO DE CANAL ENTRANTE</p>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">Técnico Designado</p>
                <p className="font-bold text-slate-800 text-xs mt-1">{currentChatAgent?.name || 'No Designado'}</p>
                <p className="text-[10px] text-slate-500 mt-1">Monitoreo continuo y derivación oportuna de chats.</p>
              </div>

              {isSupervisor ? (
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Asignar Chat</label>
                  <select
                    value={specialDuties.chatId}
                    onChange={(e) => handleAssignSpecialDuty('chat', e.target.value)}
                    className="w-full text-xs font-medium p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  >
                    {regularNonA1NonS1Agents.map(a => (
                      <option key={a.id} value={a.id} disabled={a.id === specialDuties.guardiaId}>
                        {a.name} {a.id === specialDuties.guardiaId ? '(Excluido por Guardia)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center italic">Solo un administrador puede delegar este rol</p>
              )}
            </div>

            {/* Designate Alertas Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-black text-sm text-slate-900 leading-none">Responsable de Alertas</h4>
                  <p className="text-slate-400 text-[10px] font-mono mt-1">SISTEMAS DE ALARMAS TI</p>
                </div>
              </div>

              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100">
                <p className="text-[10px] font-mono text-slate-400 font-bold uppercase">Técnico Designado</p>
                <p className="font-bold text-slate-800 text-xs mt-1">{currentAlertasAgent?.name || 'No Designado'}</p>
                <p className="text-[10px] text-slate-500 mt-1">Atención inmediata a monitoreos y alertas.</p>
              </div>

              {isSupervisor ? (
                <div className="space-y-1.5">
                  <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Asignar Alertas</label>
                  <select
                    value={specialDuties.alertasId}
                    onChange={(e) => handleAssignSpecialDuty('alerta', e.target.value)}
                    className="w-full text-xs font-medium p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  >
                    {regularNonA1NonS1Agents.map(a => (
                      <option key={a.id} value={a.id} disabled={a.id === specialDuties.guardiaId}>
                        {a.name} {a.id === specialDuties.guardiaId ? '(Excluido por Guardia)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <p className="text-[10px] text-slate-400 text-center italic">Solo un administrador puede delegar este rol</p>
              )}
            </div>

          </div>

          {/* Vista Previa de la Rotación Programada */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-indigo-600" />
                  Consola de Programación y Vista Previa (Próximas 2 Semanas)
                </h3>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Visualización detallada de la cobertura de responsabilidades diarias calculada automáticamente por el motor de rotación.
                </p>
              </div>
              {isSupervisor && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleAutoScheduleNextWeeks}
                    className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-sans font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 border border-indigo-200 active:scale-95 cursor-pointer shadow-sm"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    Auto-Programar 2 Semanas
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveChangesToFirestore}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Guardar Cambios en Firestore
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 font-mono text-[9px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3">Día</th>
                    <th className="px-4 py-3 text-center">Guardia (24h)</th>
                    <th className="px-4 py-3 text-center">Canal de Chat</th>
                    <th className="px-4 py-3 text-center">Consola Alertas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const rows: any[] = [];
                    const baseDate = new Date();
                    baseDate.setHours(12,0,0,0);
                    
                    const weekDays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

                    for (let i = 1; i <= 14; i++) {
                      const d = new Date(baseDate);
                      d.setDate(baseDate.getDate() + i);
                      const dStr = d.toISOString().split('T')[0];
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6;

                      const dayEvents = calendarEvents.filter(e => e.date === dStr);
                      const guardEv = dayEvents.find(e => e.type === 'guardia');
                      const chatEv = dayEvents.find(e => e.type === 'chat');
                      const alertaEv = dayEvents.find(e => e.type === 'alerta');

                      const guardAgent = agents.find(a => a.id === guardEv?.agentId);
                      const chatAgent = agents.find(a => a.id === chatEv?.agentId);
                      const alertaAgent = agents.find(a => a.id === alertaEv?.agentId);

                      rows.push({
                        dateStr: dStr,
                        dayNum: d.getDate(),
                        monthStr: d.toLocaleString('es-ES', { month: 'short' }),
                        dayName: weekDays[d.getDay()],
                        isWeekend,
                        guard: guardAgent?.name || 'No Asignado',
                        chat: isWeekend ? 'Libre' : (chatAgent?.name || 'No Asignado'),
                        alerta: isWeekend ? 'Libre' : (alertaAgent?.name || 'No Asignado'),
                      });
                    }

                    return rows.map((r, idx) => (
                      <tr key={idx} className={`hover:bg-slate-50/50 ${r.isWeekend ? 'bg-slate-50/30' : ''}`}>
                        <td className="px-4 py-3 font-mono font-bold text-slate-500 text-[10px] uppercase">
                          {r.dayNum} {r.monthStr}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold ${r.isWeekend ? 'text-slate-400' : 'text-slate-700'}`}>
                            {r.dayName}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm">
                            🛡️ {r.guard}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.chat === 'Libre' ? (
                            <span className="text-[10px] text-slate-400 font-mono italic">Libre (Fin de semana)</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm">
                              💬 {r.chat}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.alerta === 'Libre' ? (
                            <span className="text-[10px] text-slate-400 font-mono italic">Libre (Fin de semana)</span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full border text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-100 shadow-sm">
                              🚨 {r.alerta}
                            </span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : adminSubTab === 'jornada' ? (
        <>
          {/* Complete team grid view */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <h3 className="font-display font-bold text-sm text-slate-800 mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              Presencia y Disponibilidad del Roster Completo
            </h3>
            <p className="text-slate-500 text-xs mb-4">
              Consola general para visualización del personal disponible y control administrativo de horarios de entrada.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map(agent => {
                const state = dutyStates.find(s => s.agentId === agent.id);
                
                const todayDateStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                const hasActiveVisitToday = programmedVisits.some(v => {
                  const visitDate = (v.fecha_visita || '').split(' ')[0];
                  if (visitDate !== todayDateStr) return false;
                  if (v.estado_visita === 'Cerrada') return false;
                  const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
                  if (!techName) return false;
                  return (agent.name || '').toLowerCase().includes(techName) || (agent.id || '').toLowerCase() === techName;
                });

                const hasVisitToday = hasActiveVisitToday;

                const activeAbsence = !hasActiveVisitToday && absences.find(a => {
                  return a.agentId === agent.id && todayDateStr >= a.startDate && todayDateStr <= a.endDate;
                });

                let status = state?.status || 'Disponible';
                if (hasActiveVisitToday) {
                  status = 'En Visita';
                } else if (status === 'En Visita' && !hasActiveVisitToday) {
                  status = 'Disponible';
                } else if (status === 'Ausente' && !activeAbsence) {
                    status = 'Disponible';
                } else if (activeAbsence) {
                    status = 'Ausente';
                }
                
                let badgeColor = 'bg-slate-100 text-slate-800 border border-slate-200';
                if (status === 'Disponible') badgeColor = 'bg-[#dcfce7] text-[#166534] border border-[#bbf7d0]'; // light green bg, green text
                else if (status === 'En Visita') badgeColor = 'bg-blue-50 text-blue-800 border border-blue-200';
                else if (status === 'En llamada') badgeColor = 'bg-indigo-50 text-indigo-700 border border-indigo-200';
                else if (status === 'Ocupado') badgeColor = 'bg-rose-100 text-rose-800 border border-rose-200';
                else if (status === 'En almuerzo') badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
                else if (status === 'En reunión') badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                else if (status === 'En capacitación') badgeColor = 'bg-purple-50 text-purple-700 border border-purple-200';
                else if (status === 'Fuera de oficina') badgeColor = 'bg-orange-50 text-orange-700 border border-orange-200';
                else if (status === 'Ausente') badgeColor = 'bg-rose-50 text-rose-800 border border-rose-200';
                else if (status === 'Finalizó su jornada') badgeColor = 'bg-slate-100 text-slate-600 border border-slate-200';

                const scheduleObj = state?.weeklySchedule || createDefaultWeeklySchedule(state?.workSchedule || '08:00 - 17:00');

                return (
                  <div 
                    key={agent.id} 
                    onClick={() => {
                      setEditingAgentId(agent.id);
                      setTempWeeklySchedule(scheduleObj);
                    }}
                    className="border border-slate-300 rounded-xl p-4 space-y-4 bg-white hover:border-indigo-400 transition-all cursor-pointer shadow-sm group relative flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      {/* HEADER */}
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-[11px] font-bold text-slate-700">
                            {agent.name.substring(0,2).toUpperCase()}
                          </div>
                          <h4 className="font-sans text-sm font-bold text-[#0F2942] leading-none">{agent.name}</h4>
                        </div>
                        <span className={`text-[9px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wide ${badgeColor}`}>
                          {status}
                        </span>
                      </div>

                      {/* HOY / CHECK-IN / CHECK-OUT */}
                      <div className="border-t border-slate-200 pt-3 relative text-center">
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-white px-2 text-[11px] font-bold text-slate-800 font-sans">Hoy</span>
                        <div className="flex justify-between items-center text-left pt-2">
                          <div>
                            <p className="text-[#3b5978] font-bold uppercase font-mono text-[9px] tracking-wider">Check-In</p>
                            <p className="text-black font-mono font-bold text-base mt-0.5">{activeAbsence ? 'N/A' : (state?.checkInTime || '--:--')}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[#3b5978] font-bold uppercase font-mono text-[9px] tracking-wider">Check-Out</p>
                            <p className="text-black font-mono font-bold text-base mt-0.5">{activeAbsence ? 'N/A' : (state?.checkOutTime || '--:--')}</p>
                          </div>
                        </div>
                      </div>

                      {/* HORARIO ASIGNADO Y BOTONES */}
                      <div className="border-t border-slate-200 pt-3 space-y-3">
                        {activeAbsence && (
                          <div className="bg-rose-50 text-rose-700 border border-rose-100 p-2 rounded-lg text-[11px] font-bold text-center">
                            🏖️ {activeAbsence.type === 'Vacaciones' ? 'Vacaciones' : 'Permiso'} Activo
                          </div>
                        )}
                        <p className="text-[#3b5978] font-bold uppercase font-mono text-[10px] tracking-wider">
                          Horario Asignado (Lun-Sáb)
                        </p>

                        <div className="flex gap-2">
                          {DAYS_OF_WEEK.map(dayName => {
                            const dayData = scheduleObj[dayName];
                            const isDayActive = dayData?.isActive;
                            const isDayRemote = dayData?.isRemote;
                            
                            return (
                              <div 
                                key={dayName} 
                                title={`${dayName}: ${dayData ? `${dayData.start} - ${dayData.end} (${isDayRemote ? 'Remoto' : 'Presencial'})` : 'No laborable'}`}
                                className={`flex-1 h-7 rounded-md flex flex-col items-center justify-center text-[10px] font-bold border transition-all ${
                                  isDayActive 
                                    ? isDayRemote 
                                      ? 'bg-[#faf5ff] text-[#6b21a8] border-[#e9d5ff]' 
                                      : 'bg-white text-[#5b21b6] border-[#ddd6fe]'
                                    : 'bg-[#fafafa] text-slate-300 border-slate-100'
                                }`}
                              >
                                <span>{dayName.substring(0, 1)}</span>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="text-[10px] text-slate-500 font-bold group-hover:text-[#523d8c] transition-colors mt-2">
                          <span>✏️ Clic para configurar horario</span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : adminSubTab === 'asistencia' ? (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" />
                Control de Asistencia Diario
                </h3>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500">Fecha de Registro:</span>
                        <input 
                          type="date" 
                          className="border border-slate-300 rounded-lg px-3 py-1 text-xs font-mono outline-none"
                          value={selectedAsistenciaDate}
                          id="asistencia-date-picker"
                          onChange={(e) => {
                            setSelectedAsistenciaDate(e.target.value);
                            // Fetch data for new date
                            fetchAsistencia().then(data => {
                              if (data) setAsistencia(data);
                            });
                          }}
                        />
                    </div>
                    <button
                      onClick={() => {
                          const recordsToSave = agents.filter(a => a.id !== 'AG-CF-409' && a.id !== 'AG-AF-145').map(agent => {
                              const existing = asistencia.find(a => a.idAgente === agent.id && a.fecha === selectedAsistenciaDate);
                              
                              const activeVisitOnDate = programmedVisits.find(v => {
                                  const visitDate = (v.fecha_visita || '').split(' ')[0];
                                  if (visitDate !== selectedAsistenciaDate) return false;
                                  if (v.estado_visita === 'Cerrada') return false;
                                  const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
                                  if (!techName) return false;
                                  return (agent.name || '').toLowerCase().includes(techName) || (agent.id || '').toLowerCase() === techName;
                              });

                              if (existing) {
                                  let nextEstado = existing.estado || '';
                                  if (nextEstado === 'Visita' && !activeVisitOnDate) {
                                      nextEstado = '';
                                  } else if (activeVisitOnDate && (!nextEstado || nextEstado === 'Home Office')) {
                                      nextEstado = 'Visita';
                                  }
                                  return { ...existing, estado: nextEstado };
                              }
                              
                              const duty = dutyStates.find(s => s.agentId === agent.id);
                              let defaultEstado = '';
                              if (activeVisitOnDate) {
                                  defaultEstado = 'Visita';
                              } else if (duty && duty.checkInTime && !duty.checkOutTime) {
                                  defaultEstado = 'Presente';
                              }
                              
                              return {
                                  id: `${selectedAsistenciaDate}_${agent.id}`,
                                  fecha: selectedAsistenciaDate,
                                  idAgente: agent.id,
                                  nombreAgente: agent.name,
                                  checkIn: '',
                                  checkOut: '',
                                  estado: defaultEstado,
                                  ultimaActualizacion: new Date().toISOString()
                              };
                          });
                          
                          setAsistencia(prev => {
                              const next = [...prev];
                              recordsToSave.forEach(r => {
                                  const idx = next.findIndex(a => a.id === r.id);
                                  if (idx >= 0) next[idx] = { ...r, ultimaActualizacion: '' };
                                  else next.push({ ...r, ultimaActualizacion: '' });
                              });
                              return next;
                          });

                          setIsSyncingAsistencia(true);
                          pushAsistencia(recordsToSave).then(() => {
                              setIsSyncingAsistencia(false);
                              // Actualizar dutyStates si es hoy
                              const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
                              if (selectedAsistenciaDate === todayStr) {
                                  setDutyStates(prev => prev.map(s => {
                                      const row = recordsToSave.find(r => r.idAgente === s.agentId);
                                      if (row) {
                                          return {
                                              ...s,
                                              checkInTime: row.checkIn !== "" ? row.checkIn : null,
                                              checkOutTime: row.checkOut !== "" ? row.checkOut : null,
                                              
                                          };
                                      }
                                      return s;
                                  }));
                              }
                              showToast(`Asistencia del equipo guardada (${selectedAsistenciaDate})`, 'success');
                          }).catch(err => {
                              setIsSyncingAsistencia(false);
                              console.error("Error saving Asistencia", err);
                          });
                      }}
                      disabled={isSyncingAsistencia}
                      className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                        {isSyncingAsistencia ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <CheckSquare className="w-4 h-4" />
                        )}
                        Guardar Equipo
                    </button>
                </div>
            </div>
            
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold text-[10px] uppercase tracking-wider font-mono">
                    <th className="px-4 py-3">Agente</th>
                    <th className="px-4 py-3 w-32">Jornada</th>
                    <th className="px-4 py-3 w-32">Check In</th>
                    <th className="px-4 py-3 w-32">Check Out</th>
                    <th className="px-4 py-3 w-40">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {nonUserAndSpecificAgents.map(agent => {
                      const state = dutyStates.find(s => s.agentId === agent.id);
                      const scheduleObj = state?.weeklySchedule || createDefaultWeeklySchedule(state?.workSchedule || '08:00 - 17:00');
                      const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                      const parts = selectedAsistenciaDate.split('-');
                      const localDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                      const dayName = SPANISH_DAYS[localDate.getDay()];
                      const daySchedule = scheduleObj[dayName];
                      
                      let expectedCheckIn = null;
                      let expectedCheckOut = null;
                      if (daySchedule && daySchedule.isActive) {
                          expectedCheckIn = daySchedule.start;
                          expectedCheckOut = daySchedule.end;
                      }

                      const activeVisitOnDate = programmedVisits.find(v => {
                        const visitDate = (v.fecha_visita || '').split(' ')[0];
                        if (visitDate !== selectedAsistenciaDate) return false;
                        if (v.estado_visita === 'Cerrada') return false;
                        const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
                        if (!techName) return false;
                        return (agent.name || '').toLowerCase().includes(techName) || (agent.id || '').toLowerCase() === techName;
                      });

                      const hadVisitOnDate = programmedVisits.some(v => {
                        const visitDate = (v.fecha_visita || '').split(' ')[0];
                        if (visitDate !== selectedAsistenciaDate) return false;
                        const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
                        if (!techName) return false;
                        return (agent.name || '').toLowerCase().includes(techName) || (agent.id || '').toLowerCase() === techName;
                      });

                      const hasVisitOnSelectedDate = !!activeVisitOnDate;

                      const activeAbsence = !hasVisitOnSelectedDate && absences.find(a => {
                        return a.agentId === agent.id && selectedAsistenciaDate >= a.startDate && selectedAsistenciaDate <= a.endDate;
                      });

                      return (
                    <AsistenciaRowComponent 
                        key={agent.id}
                        agent={agent}
                        expectedCheckIn={expectedCheckIn}
                        expectedCheckOut={expectedCheckOut}
                        asistencia={asistencia}
                        selectedDate={selectedAsistenciaDate}
                        activeAbsence={activeAbsence}
                        activeVisit={activeVisitOnDate}
                        hadVisit={hadVisitOnDate}
                        onChange={(updatedRow) => {
                            setAsistencia(prev => {
                                const index = prev.findIndex(a => a.id === updatedRow.id);
                                if (index >= 0) {
                                    const next = [...prev];
                                    next[index] = updatedRow;
                                    return next;
                                }
                                return [...prev, updatedRow];
                            });
                        }}
                    />
                  );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Solicitudes de Ausencias Subtab View */}
          <div className="space-y-6 animate-fadeIn">
            
            {/* Main Section: Solicitudes Pendientes */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                    <Clock8 className="w-4 h-4 text-purple-600" />
                    Solicitudes de Ausencias Pendientes de Aprobación
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Revisa, aprueba o rechaza en tiempo real las solicitudes de descanso o trabajo remoto enviadas por el equipo de ingenieros de soporte.
                  </p>
                </div>
                <div className="bg-purple-50 text-purple-700 px-3 py-1 border border-purple-100 rounded-lg text-xs font-mono font-bold">
                  Pendientes: {pendingAbsenceRequests.length}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingAbsenceRequests.map(req => {
                  const agentName = agents.find(a => a.id === req.agentId)?.name || 'Técnico';
                  
                  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  if (req.type === 'Vacaciones') badgeColor = 'bg-teal-50 text-teal-700 border-teal-100';
                  else if (req.type === 'Trabajo Remoto') badgeColor = 'bg-violet-50 text-violet-700 border-violet-100';
                  else if (req.type === 'Licencia') badgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
                  else if (req.type === 'Permiso') badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';

                  return (
                    <div key={req.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-3 hover:border-slate-300 transition-all">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase">
                            {agentName}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                            {req.type}
                          </span>
                        </div>
                        
                        <p className="text-xs font-bold text-slate-800 leading-snug">{req.reason}</p>
                        
                        <div className="text-[10px] font-mono text-slate-500 space-y-1 bg-white border border-slate-100 p-2.5 rounded-lg">
                          <div className="flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>Del <strong className="text-slate-700">{req.startDate}</strong> al <strong className="text-slate-700">{req.endDate}</strong></span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-1">
                            Solicitado el: {req.requestedAt}
                          </p>
                        </div>
                      </div>

                      {isSupervisor ? (
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => approveRequest(req.id)}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-emerald-650 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Aprobar
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectRequest(req.id)}
                            className="flex items-center justify-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-1.5 bg-slate-100 rounded-lg text-[10px] text-slate-500 font-semibold">
                          Requiere rol de supervisor para decidir
                        </div>
                      )}
                    </div>
                  );
                })}

                {pendingAbsenceRequests.length === 0 && (
                  <div className="col-span-full text-center py-10 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl space-y-2">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">¡Excelente! No hay solicitudes pendientes de aprobación.</p>
                    <p className="text-[11px] text-slate-400">Todo el roster de técnicos tiene su estado de presencia y descanso sincronizado.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Historical Decisions and Audit trail */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  Historial Reciente de Solicitudes y Resoluciones
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 font-mono text-[9px] text-slate-400 font-black uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Técnico Colaborador</th>
                      <th className="px-4 py-3">Tipo de Ausencia</th>
                      <th className="px-4 py-3">Rango de Fechas</th>
                      <th className="px-4 py-3">Motivo / Descripción</th>
                      <th className="px-4 py-3 text-center">Estado</th>
                      <th className="px-4 py-3">Revisado Por</th>
                      <th className="px-4 py-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {nonPendingAbsenceRequests.map(req => {
                      const agentName = agents.find(a => a.id === req.agentId)?.name || 'Técnico';
                      const isRequester = currentUser?.name === agentName;
                      const isApproved = req.status === 'Aprobado';
                      
                      let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                      if (req.type === 'Vacaciones') badgeColor = 'bg-teal-50 text-teal-700 border-teal-100';
                      else if (req.type === 'Trabajo Remoto') badgeColor = 'bg-violet-50 text-violet-700 border-violet-100';
                      else if (req.type === 'Licencia') badgeColor = 'bg-rose-50 text-rose-700 border-rose-100';
                      else if (req.type === 'Permiso') badgeColor = 'bg-amber-50 text-amber-700 border-amber-100';

                      let statusBadge = '';
                      if (req.status === 'Aprobado') {
                        statusBadge = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      } else {
                        statusBadge = 'bg-rose-100 text-rose-850 border-rose-200';
                      }

                      return (
                        <tr key={req.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-bold text-slate-800">{agentName}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                              {req.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-600 text-[11px]">
                            {req.startDate} a {req.endDate}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-medium max-w-[240px] truncate" title={!isApproved || (isRequester && revealedReasons[req.id]) ? req.reason : "Privado - Solo el solicitante puede ver"}>
                            {isApproved && !isRequester && !revealedReasons[req.id] ? (
                              <span className="text-slate-400 italic text-[10px]">Privado</span>
                            ) : (
                              <span 
                                className={isApproved && isRequester ? "cursor-pointer text-indigo-600 font-semibold" : ""}
                                onClick={() => {
                                  if (isApproved && isRequester) {
                                    toggleReason(req.id);
                                  }
                                }}
                              >
                                {!isApproved || (isRequester && revealedReasons[req.id]) ? req.reason : "Privado - Pulsa para ver"}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${statusBadge}`}>
                              {req.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">
                            {req.reviewedBy ? (
                              <div>
                                <p className="font-bold text-slate-700">{req.reviewedBy}</p>
                                <p className="text-[9px] text-slate-400">{req.reviewedAt}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400">Autoprocesado</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-600 font-sans text-xs italic max-w-[200px] truncate" title={req.notas || '-'}>
                            {req.notas || <span className="text-slate-300">-</span>}
                          </td>
                        </tr>
                      );
                    })}

                    {nonPendingAbsenceRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                          No hay registros en el historial de resoluciones de ausencias.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  )}


    </>
  );
};
