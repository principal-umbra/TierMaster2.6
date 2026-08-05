// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { DAYS_OF_WEEK } from '../utils/helpers';


export const WeeklyScheduleModal = () => {
  const {
    agents,
    editingAgentId,
    setEditingAgentId,
    tempWeeklySchedule,
    setTempWeeklySchedule,
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
      {/* Weekly Schedule Modal */}
      <AnimatePresence>
        {editingAgentId && tempWeeklySchedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col text-slate-700"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 via-[#10223b] to-slate-900 p-5 text-white flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono font-bold bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    Configuración de Turnos
                  </span>
                  <h3 className="font-display font-black text-base text-white mt-2">
                    Horario Semanal de {agents.find(a => a.id === editingAgentId)?.name || 'Técnico'}
                  </h3>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setEditingAgentId(null); setTempWeeklySchedule(null); }}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4 overflow-y-auto max-h-[60vh] no-scrollbar">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Define el rango de horas para cada día de la semana laboral (Lunes a Sábado). 
                  Los días marcados como <strong>Remoto</strong> se registrarán como teletrabajo, mientras que el horario por defecto es <strong>Presencial</strong>.
                </p>

                <div className="space-y-3">
                  {DAYS_OF_WEEK.map(day => {
                    const dayConfig = tempWeeklySchedule[day] || { start: '08:00', end: '17:00', isRemote: false, isActive: true };
                    
                    return (
                      <div 
                        key={day}
                        className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                          dayConfig.isActive 
                            ? dayConfig.isRemote 
                              ? 'bg-violet-50/40 border-violet-200' 
                              : 'bg-slate-50/50 border-slate-200'
                            : 'bg-slate-100/50 border-slate-100 opacity-60'
                        }`}
                      >
                        {/* Day Info & Active Toggle */}
                        <div className="flex items-center gap-3">
                          <input 
                            type="checkbox"
                            id={`active-${day}`}
                            checked={dayConfig.isActive}
                            onChange={(e) => {
                              setTempWeeklySchedule(prev => prev ? {
                                ...prev,
                                [day]: {
                                  ...dayConfig,
                                  isActive: e.target.checked
                                }
                              } : null);
                            }}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <label htmlFor={`active-${day}`} className="font-sans font-bold text-xs text-slate-700 cursor-pointer select-none">
                            {day}
                          </label>
                        </div>

                        {/* Hours Inputs & Remote Checkbox */}
                        {dayConfig.isActive ? (
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Hours */}
                            <div className="flex items-center gap-1.5 text-xs text-slate-600">
                              <input 
                                type="time"
                                value={dayConfig.start}
                                onChange={(e) => {
                                  setTempWeeklySchedule(prev => prev ? {
                                    ...prev,
                                    [day]: {
                                      ...dayConfig,
                                      start: e.target.value
                                    }
                                  } : null);
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-xs font-mono outline-none focus:border-indigo-400"
                              />
                              <span>a</span>
                              <input 
                                type="time"
                                value={dayConfig.end}
                                onChange={(e) => {
                                  setTempWeeklySchedule(prev => prev ? {
                                    ...prev,
                                    [day]: {
                                      ...dayConfig,
                                      end: e.target.value
                                    }
                                  } : null);
                                }}
                                className="px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 text-xs font-mono outline-none focus:border-indigo-400"
                              />
                            </div>

                            {/* Remote Toggle Checkbox */}
                            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                              <input 
                                type="checkbox"
                                id={`remote-${day}`}
                                checked={dayConfig.isRemote}
                                onChange={(e) => {
                                  setTempWeeklySchedule(prev => prev ? {
                                    ...prev,
                                    [day]: {
                                      ...dayConfig,
                                      isRemote: e.target.checked
                                    }
                                  } : null);
                                }}
                                className="w-3.5 h-3.5 text-violet-600 border-slate-300 rounded focus:ring-violet-500 cursor-pointer"
                              />
                              <label htmlFor={`remote-${day}`} className="text-[10px] font-bold text-slate-500 cursor-pointer select-none uppercase tracking-wider">
                                Remoto
                              </label>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                            Día No Laborable
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 p-5 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => { setEditingAgentId(null); setTempWeeklySchedule(null); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingAgentId && tempWeeklySchedule) {
                      handleSaveWeeklySchedule(editingAgentId, tempWeeklySchedule);
                      setEditingAgentId(null);
                      setTempWeeklySchedule(null);
                    }
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-indigo-600/10 active:scale-95 cursor-pointer"
                >
                  Guardar Horarios
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </>
  );
};
