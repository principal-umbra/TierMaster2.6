// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, History } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';


export const AgentDetailsDrawer = () => {
  const {
    agents,
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
    tempStartDate,
    tempType,
    toast,
    todayStrForMetrics,
    totalSuccessTasksCount
  } = useOperations();

  return (
    <>
      {/* DRAWER FOR AGENT DETAILS */}
      <AnimatePresence>
        {drawerAgentId && (() => {
          const selectedAgent = agents.find(a => a.id === drawerAgentId);
          const state = dutyStates.find(s => s.agentId === drawerAgentId);
          const scheduleObj = state?.weeklySchedule || createDefaultWeeklySchedule(state?.workSchedule || '08:00 - 17:00');
          const SPANISH_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          
          if (!selectedAgent) return null;

          return (
            <>
              {/* Overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                onClick={() => setDrawerAgentId(null)}
              />
              
              {/* Drawer */}
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-sm font-bold shrink-0 border border-indigo-200/50">
                      {selectedAgent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-sans text-base font-bold text-slate-800 leading-tight">{selectedAgent.name}</h3>
                      <p className="font-mono text-[10px] text-slate-500 uppercase mt-0.5">{selectedAgent.role}</p>
                    </div>
                  </div>
                  <button onClick={() => setDrawerAgentId(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  {/* HORARIO COMPLETO */}
                  <section>
                    <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
                      <CalendarIcon className="w-4 h-4 text-indigo-500" />
                      Horario Semanal
                    </h4>
                    <div className="space-y-2">
                      {SPANISH_DAYS.map(dayName => {
                        const dayData = scheduleObj[dayName];
                        const isDayActive = dayData?.isActive;
                        const isDayRemote = dayData?.isRemote;
                        
                        return (
                          <div key={dayName} className={`flex items-center justify-between p-3 rounded-lg border ${isDayActive ? (isDayRemote ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100') : 'bg-slate-50/30 border-slate-100/50 opacity-50'}`}>
                            <span className={`font-mono text-xs font-bold ${isDayActive ? 'text-slate-700' : 'text-slate-400'}`}>{dayName}</span>
                            <div className="flex items-center gap-3">
                              {isDayActive ? (
                                <>
                                  <span className="font-mono text-xs font-bold text-slate-600">
                                    {dayData.start} - {dayData.end}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${isDayRemote ? 'bg-purple-100 text-purple-700' : 'bg-slate-200 text-slate-600'}`}>
                                    {isDayRemote ? 'Remoto' : 'Oficina'}
                                  </span>
                                </>
                              ) : (
                                <span className="font-mono text-xs font-bold text-slate-400">Libre</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* BITACORA / SUCESOS */}
                  <section>
                    <h4 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2 mb-4">
                      <History className="w-4 h-4 text-indigo-500" />
                      Bitácora y Sucesos
                    </h4>
                    
                    <div className="space-y-4">
                      {selectedAgent.scrumLogs && selectedAgent.scrumLogs.length > 0 ? (
                        selectedAgent.scrumLogs.slice(0,3).map((log, i) => (
                          <div key={i} className="p-4 rounded-xl border border-slate-150 bg-white shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold text-slate-400">📝 ACTUALIZACIÓN SCRUM</span>
                              <span className="text-[10px] font-mono font-bold text-indigo-500">{new Date(log.lastUpdated).toLocaleDateString()}</span>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Hoy</span>
                                <p className="text-xs text-slate-700 leading-relaxed">{log.today}</p>
                              </div>
                              {log.blockers && (
                                <div className="p-2.5 bg-rose-50 rounded-lg border border-rose-100">
                                  <span className="text-[10px] font-bold text-rose-600 uppercase flex items-center gap-1 mb-1">
                                    <AlertTriangle className="w-3 h-3" /> Blocker
                                  </span>
                                  <p className="text-xs text-rose-800 leading-relaxed">{log.blockers}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-slate-500 italic">No hay registros recientes en la bitácora Scrum.</p>
                      )}
                      
                      {selectedAgent.xpEvents && selectedAgent.xpEvents.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-slate-100">
                          <span className="text-[10px] font-mono font-bold text-slate-400 mb-3 block">SUCESOS RECIENTES</span>
                          <div className="space-y-3">
                            {selectedAgent.xpEvents.slice(0, 3).map((ev, i) => (
                              <div key={i} className="flex gap-3">
                                <div className={`w-1.5 rounded-full shrink-0 ${ev.type === 'penalty' ? 'bg-rose-400' : 'bg-emerald-400'}`} />
                                <div>
                                  <h5 className="font-bold text-xs text-slate-800 leading-tight">{ev.title}</h5>
                                  <p className="text-[10px] text-slate-500 mt-0.5">{ev.description}</p>
                                  <span className="text-[9px] font-mono font-bold text-slate-400 mt-1 block">{ev.date}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>


    </>
  );
};
