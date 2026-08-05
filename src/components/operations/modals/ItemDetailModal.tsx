// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, Shield, CheckCircle } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { safeDispatchEvent } from '../../../lib/events';


export const ItemDetailModal = () => {
  const {
    agents,
    selectedAgendaItem,
    setSelectedAgendaItem,
    setActiveSubTab,
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
      {/* ITEM DETAIL MODAL */}
      <AnimatePresence>
        {selectedAgendaItem && (() => {
          // Destructure or define variables for pristine display
          const isVisit = selectedAgendaItem.source === 'programmed_visit';
          const isTask = selectedAgendaItem.source === 'internal_task' || selectedAgendaItem.source === 'contractor_task';

          const handleGoToTask = () => {
            if (!selectedAgendaItem) return;
            const isContractor = selectedAgendaItem.source === 'contractor_task';
            const taskId = selectedAgendaItem.id;

            // Close current item detail modal
            setSelectedAgendaItem(null);

            // Dispatch navigation event to open task in Request Backlog (Tareas)
            safeDispatchEvent('navigate_to_task', {
              taskId: taskId,
              type: isContractor ? 'contractor' : 'internal'
            });
          };
          
          // Theme Mapping for ultra-premium aesthetic
          const themeMap = {
            programmed_visit: {
              bgLight: 'bg-blue-50/50',
              border: 'border-blue-100',
              text: 'text-blue-700',
              iconBg: 'bg-blue-500',
              iconText: 'text-white',
              accentLine: 'bg-blue-500',
              badge: 'Visita Programada',
              shadow: 'shadow-blue-100'
            },
            designation: {
              bgLight: 'bg-indigo-50/50',
              border: 'border-indigo-100',
              text: 'text-indigo-700',
              iconBg: 'bg-indigo-500',
              iconText: 'text-white',
              accentLine: 'bg-indigo-500',
              badge: 'Rol / Guardia',
              shadow: 'shadow-indigo-100'
            },
            internal_task: {
              bgLight: 'bg-emerald-50/50',
              border: 'border-emerald-100',
              text: 'text-emerald-700',
              iconBg: 'bg-emerald-500',
              iconText: 'text-white',
              accentLine: 'bg-emerald-500',
              badge: 'Tarea Interna',
              shadow: 'shadow-emerald-100'
            },
            contractor_task: {
              bgLight: 'bg-purple-50/50',
              border: 'border-purple-100',
              text: 'text-purple-700',
              iconBg: 'bg-purple-500',
              iconText: 'text-white',
              accentLine: 'bg-purple-500',
              badge: 'Tarea Externa / Contratista',
              shadow: 'shadow-purple-100'
            },
            absence: {
              bgLight: 'bg-rose-50/50',
              border: 'border-rose-100',
              text: 'text-rose-700',
              iconBg: 'bg-rose-500',
              iconText: 'text-white',
              accentLine: 'bg-rose-500',
              badge: 'Ausencia / Licencia',
              shadow: 'shadow-rose-100'
            },
            isolated: {
              bgLight: 'bg-amber-50/50',
              border: 'border-amber-100',
              text: 'text-amber-700',
              iconBg: 'bg-amber-500',
              iconText: 'text-white',
              accentLine: 'bg-amber-500',
              badge: 'Agenda Particular',
              shadow: 'shadow-amber-100'
            }
          };

          const currentTheme = themeMap[selectedAgendaItem.source as keyof typeof themeMap] || {
            bgLight: 'bg-slate-50/50',
            border: 'border-slate-100',
            text: 'text-slate-700',
            iconBg: 'bg-slate-500',
            iconText: 'text-white',
            accentLine: 'bg-slate-500',
            badge: 'Suceso',
            shadow: 'shadow-slate-100'
          };

          // Programmatic title optimization to remove unseemly, messy duplications
          let displayTitle = selectedAgendaItem.title || selectedAgendaItem.note || selectedAgendaItem.type || 'Detalle del Evento';
          let displaySubtitle = "";

          if (isVisit) {
            let cleanAsunto = selectedAgendaItem.asunto || '';
            // If the asunto contains the client name at the beginning, strip it out to avoid duplication
            if (selectedAgendaItem.cliente && cleanAsunto.toLowerCase().startsWith(selectedAgendaItem.cliente.toLowerCase())) {
              const regex = new RegExp(`^${selectedAgendaItem.cliente}\\s*[-:]\\s*`, 'i');
              cleanAsunto = cleanAsunto.replace(regex, '');
            }
            displayTitle = cleanAsunto || 'Visita Programada';
            displaySubtitle = selectedAgendaItem.cliente ? `${selectedAgendaItem.cliente}` : 'Visita Técnica';
          } else if (selectedAgendaItem.source === 'absence') {
            displayTitle = selectedAgendaItem.reason || 'Ausencia de Personal';
            displaySubtitle = 'Ausencia / Licencia';
          } else if (selectedAgendaItem.source === 'designation') {
            displayTitle = selectedAgendaItem.note || `Rol: ${selectedAgendaItem.type || 'Guardia'}`;
            displaySubtitle = 'Rol de Operaciones';
          } else if (isTask) {
            displayTitle = selectedAgendaItem.title || 'Tarea Técnica';
            displaySubtitle = selectedAgendaItem.category ? `Categoría: ${selectedAgendaItem.category}` : 'Orden de Trabajo';
          } else if (selectedAgendaItem.source === 'isolated') {
            displayTitle = selectedAgendaItem.note || selectedAgendaItem.title || 'Agenda Particular';
            displaySubtitle = 'Nota de Agenda';
          }

          // Clean responsible party resolution
          const responsibleName = selectedAgendaItem.agent?.name || selectedAgendaItem.tecnico || 'Sistema Central';
          const initials = responsibleName
            .split(' ')
            .filter((n: string) => n.length > 0)
            .map((n: string) => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase() || 'SC';

          // Clean temporal resolution
          const temporalDate = selectedAgendaItem.source === 'absence'
            ? `${selectedAgendaItem.startDate} al ${selectedAgendaItem.endDate}`
            : selectedAgendaItem.source === 'programmed_visit'
              ? (selectedAgendaItem.fecha_visita || selectedAgendaItem.date)
              : selectedAgendaItem.date || selectedAgendaItem.scheduledDate || selectedAgendaItem.dueDate || 'Sin fecha registrada';

          const temporalTime = selectedAgendaItem.hora_visita || null;

          // Status and Priority resolved beautifully
          const resolvedStatus = selectedAgendaItem.status || selectedAgendaItem.estado_visita || selectedAgendaItem.estado || 'Programado';
          const isHighPriority = selectedAgendaItem.priority === 'Alta';

          return (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[110] flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-white rounded-[24px] w-full max-w-3xl shadow-[0_25px_60px_-15px_rgba(15,23,42,0.18)] border border-slate-100 overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:h-auto"
              >
                {/* Panel Principal - Izquierda (Detalle) */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col justify-between max-h-[50vh] md:max-h-none">
                  <div className="space-y-6">
                    {/* Header: Categoría & Cerrar para móviles */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${currentTheme.bgLight} ${currentTheme.border} ${currentTheme.text}`}>
                          {currentTheme.badge}
                        </span>
                        {selectedAgendaItem.priority && (
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                            isHighPriority 
                              ? 'bg-rose-50 border-rose-100 text-rose-700' 
                              : 'bg-slate-50 border-slate-200 text-slate-600'
                          }`}>
                            Prioridad {selectedAgendaItem.priority}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={() => setSelectedAgendaItem(null)} 
                        className="p-1.5 md:hidden hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Título y Subtítulo */}
                    <div>
                      {displaySubtitle && (
                        <span className="text-[11px] font-black tracking-wider text-indigo-600 uppercase block mb-1">
                          {displaySubtitle}
                        </span>
                      )}
                      <h3 className="text-xl md:text-2xl font-extrabold text-slate-900 tracking-tight leading-snug">
                        {displayTitle}
                      </h3>
                    </div>

                    {/* Contenido Específico según el tipo de suceso */}
                    <div className="pt-2 border-t border-slate-100/80 space-y-5">
                      {/* Tareas (Internas y Contratistas) */}
                      {isTask && (
                        <div className="space-y-4">
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                Descripción Técnica
                              </label>
                              <button
                                type="button"
                                onClick={handleGoToTask}
                                className="text-[11px] font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer transition-colors bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-100/80"
                              >
                                <span>Ir a la tarea</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            </div>
                            <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                              <p className="text-xs md:text-sm font-medium text-slate-600 leading-relaxed whitespace-pre-wrap">
                                {selectedAgendaItem.description || selectedAgendaItem.notes || selectedAgendaItem.note || selectedAgendaItem.comentario_visita || 'No se proporcionó una descripción detallada para esta tarea.'}
                              </p>
                            </div>
                          </div>
                          
                          {selectedAgendaItem.category && (
                            <div className="flex gap-2">
                              <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg border border-slate-200">
                                #{selectedAgendaItem.category}
                              </span>
                              {selectedAgendaItem.contractorName && (
                                <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-lg border border-purple-100">
                                  Contratista: {selectedAgendaItem.contractorName}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Ausencias / Vacaciones */}
                      {selectedAgendaItem.source === 'absence' && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                            Motivo o Justificación
                          </label>
                          <div className="p-4 bg-rose-50/30 border border-rose-100/60 rounded-2xl">
                            <p className="text-xs md:text-sm font-medium text-slate-700 leading-relaxed">
                              {selectedAgendaItem.reason || 'Ausencia programada aprobada por supervisión de operaciones.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Visitas Programadas */}
                      {isVisit && (
                        <div className="space-y-4">
                          {selectedAgendaItem.comentario_visita && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                Comentarios del Técnico
                              </label>
                              <div className="p-4 bg-blue-50/30 border border-blue-100/60 rounded-2xl relative">
                                <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500 rounded-l-2xl" />
                                <p className="text-xs md:text-sm font-medium text-slate-600 italic leading-relaxed pl-1">
                                  "{selectedAgendaItem.comentario_visita}"
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Cards de información específica de Visitas */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedAgendaItem.contacto && (
                              <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center gap-2.5">
                                <div className="p-1.5 bg-white text-slate-500 rounded-lg border border-slate-100 shadow-xs">
                                  <User className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <label className="text-[8px] font-extrabold text-slate-400 uppercase block">Contacto</label>
                                  <span className="text-[11px] font-bold text-slate-700 block truncate">{selectedAgendaItem.contacto}</span>
                                </div>
                              </div>
                            )}

                            {selectedAgendaItem.duracion_estimada_visita && (
                              <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-center gap-2.5">
                                <div className="p-1.5 bg-white text-slate-500 rounded-lg border border-slate-100 shadow-xs">
                                  <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <label className="text-[8px] font-extrabold text-slate-400 uppercase block">Duración</label>
                                  <span className="text-[11px] font-bold text-slate-700 block truncate">{selectedAgendaItem.duracion_estimada_visita}</span>
                                </div>
                              </div>
                            )}

                            {selectedAgendaItem.direccion_visita && (
                              <div className="p-3 bg-slate-50/60 border border-slate-100 rounded-xl flex items-start gap-2.5 sm:col-span-2">
                                <div className="p-1.5 bg-white text-slate-500 rounded-lg border border-slate-100 shadow-xs mt-0.5">
                                  <MapPin className="w-4 h-4 text-rose-500" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <label className="text-[8px] font-extrabold text-slate-400 uppercase block">Dirección de la Visita</label>
                                  <span className="text-[11px] font-medium text-slate-700 block leading-tight">{selectedAgendaItem.direccion_visita}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Roles Operativos */}
                      {selectedAgendaItem.source === 'designation' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Shield className="w-5 h-5 text-indigo-500" />
                              <div>
                                <label className="text-[8px] font-extrabold text-indigo-400 uppercase block">Rol Operativo Asignado</label>
                                <span className="text-xs font-extrabold text-indigo-900 uppercase tracking-wider">{selectedAgendaItem.type}</span>
                              </div>
                            </div>
                          </div>
                          
                          {selectedAgendaItem.note && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                Observaciones de Guardia
                              </label>
                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <p className="text-xs md:text-sm font-medium text-slate-600 leading-relaxed">
                                  {selectedAgendaItem.note}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Agenda Particular */}
                      {selectedAgendaItem.source === 'isolated' && (
                        <div className="space-y-4">
                          <div className="p-4 bg-amber-50/40 border border-amber-100 rounded-2xl space-y-2">
                            <div className="flex justify-between items-center">
                              <label className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest">
                                Intensidad Programada
                              </label>
                              <span className="text-[10px] font-black font-mono text-amber-700 bg-white px-2 py-0.5 rounded-full border border-amber-100">
                                {selectedAgendaItem.intensity || 1} / 5
                              </span>
                            </div>
                            <div className="flex gap-1.5">
                              {[...Array(5)].map((_, i) => (
                                <div 
                                  key={i} 
                                  className={`flex-1 h-1.5 rounded-full transition-all ${
                                    i < (selectedAgendaItem.intensity || 1) 
                                      ? 'bg-amber-500 shadow-xs' 
                                      : 'bg-amber-100'
                                  }`} 
                                />
                              ))}
                            </div>
                          </div>

                          {selectedAgendaItem.note && (
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">
                                Comentarios de Agenda
                              </label>
                              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                                <p className="text-xs md:text-sm font-medium text-slate-600 leading-relaxed">
                                  {selectedAgendaItem.note}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Panel Lateral - Derecha (Metadata General) */}
                <div className="w-full md:w-[280px] bg-slate-50/90 md:border-l border-t md:border-t-0 border-slate-100 p-6 md:p-8 flex flex-col justify-between">
                  <div className="space-y-6">
                    <div className="hidden md:flex justify-between items-center">
                      <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                        Detalles
                      </span>
                      <button 
                        onClick={() => setSelectedAgendaItem(null)} 
                        className="p-1.5 hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      {/* Row: Temporalidad */}
                      <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-start gap-3 shadow-xs">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-lg">
                          <CalendarIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wide block mb-0.5">Fecha</label>
                          <span className="text-xs font-extrabold text-slate-700 block truncate leading-tight">
                            {temporalDate}
                          </span>
                          {temporalTime && (
                            <span className="text-[10px] font-semibold text-slate-500 block mt-0.5">
                              Hora: {temporalTime}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row: Responsable */}
                      <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3 shadow-xs">
                        <div className={`w-8 h-8 rounded-full ${currentTheme.bgLight} ${currentTheme.text} border ${currentTheme.border} flex items-center justify-center font-black text-xs`}>
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wide block mb-0.5">Responsable</label>
                          <span className="text-xs font-extrabold text-slate-700 block truncate leading-tight" title={responsibleName}>
                            {responsibleName}
                          </span>
                        </div>
                      </div>

                      {/* Row: Estado */}
                      <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center gap-3 shadow-xs">
                        <div className="p-2 bg-slate-50 text-slate-500 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wide block mb-0.5">Estado</label>
                          <div className="flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              resolvedStatus === 'Completado' || resolvedStatus === 'Finalizado' || resolvedStatus === 'Completada'
                                ? 'bg-emerald-500' 
                                : resolvedStatus === 'En Proceso' || resolvedStatus === 'En Curso'
                                  ? 'bg-amber-500' 
                                  : 'bg-indigo-500'
                            }`} />
                            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                              {resolvedStatus}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Acciones del Footer */}
                  <div className="pt-6 border-t border-slate-100/80 mt-6 space-y-2">
                    {/* Botón de ir a la tarea en Tareas */}
                    {isTask && (
                      <button 
                        onClick={handleGoToTask}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Ir a la Tarea
                      </button>
                    )}

                    {/* Botón de eliminar (si aplica) */}
                    {(selectedAgendaItem.source === 'designation' || selectedAgendaItem.source === 'isolated') && (
                      <button 
                        onClick={() => {
                          if (selectedAgendaItem.source === 'designation') handleRemoveCalendarEvent(selectedAgendaItem.id);
                          else handleRemoveIsolatedEvent(selectedAgendaItem.id);
                          setSelectedAgendaItem(null);
                          showToast('Actividad eliminada correctamente', 'info');
                        }}
                        className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-100 hover:border-rose-200 text-rose-600 hover:text-rose-700 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Eliminar Suceso
                      </button>
                    )}

                    {/* Botón de Cerrar unificado para escritorio */}
                    <button 
                      onClick={() => setSelectedAgendaItem(null)}
                      className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow-sm text-center"
                    >
                      Cerrar Detalle
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </>
  );
};
