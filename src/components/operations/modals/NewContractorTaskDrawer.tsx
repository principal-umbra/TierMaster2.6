// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, History, CheckCircle } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';


export const NewContractorTaskDrawer = () => {
  const {
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
          <AnimatePresence>
            {isContractorTaskDrawerOpen && (
              <>
                {/* Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50"
                  onClick={() => setIsContractorTaskDrawerOpen(false)}
                />
                
                {/* Drawer */}
                <motion.div
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
                  className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200"
                >
                  {/* Header */}
                  <div className="px-6 py-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-slate-800">Asignar Trabajo a Contratista</h3>
                        <p className="text-slate-400 text-[10px] uppercase font-mono mt-0.5">Roster de Supervisión</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsContractorTaskDrawerOpen(false)} 
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleCreateContractorTask} className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Título del Proyecto/Servicio *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Enlace microondas de respaldo"
                          value={newContractorTask.title}
                          onChange={(e) => setNewContractorTask(p => ({ ...p, title: e.target.value }))}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Empresa Contratista *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Canales y Fibras Dominicanas"
                          value={newContractorTask.contractorName}
                          onChange={(e) => setNewContractorTask(p => ({ ...p, contractorName: e.target.value }))}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Supervisor Encargado (Roster) *</label>
                        <select
                          value={newContractorTask.supervisorAgentId}
                          disabled={!isSupervisor}
                          onChange={(e) => setNewContractorTask(p => ({ ...p, supervisorAgentId: e.target.value }))}
                          className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {agentsExceptA1.map(a => (
                            <option key={a.id} value={a.id}>{a.name} {a.id === currentAgentId ? '(Tú)' : ''}</option>
                          ))}
                        </select>
                        {!isSupervisor && (
                          <p className="text-[9px] text-slate-400 font-medium">Como rol usuario, tú quedas asignado por defecto para dar seguimiento a este contratista.</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Ticket Externo CRM (Opcional)</label>
                        <input
                          type="text"
                          placeholder="Ej: CRM-1234 (Auto si vacío)"
                          value={newContractorTask.ticketId}
                          onChange={(e) => setNewContractorTask(p => ({ ...p, ticketId: e.target.value }))}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:bg-white uppercase"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Fecha Inicio</label>
                          <input
                            type="date"
                            value={newContractorTask.startDate}
                            onChange={(e) => setNewContractorTask(p => ({ ...p, startDate: e.target.value }))}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Fecha Vencimiento</label>
                          <input
                            type="date"
                            value={newContractorTask.dueDate}
                            onChange={(e) => setNewContractorTask(p => ({ ...p, dueDate: e.target.value }))}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Especificaciones del Contrato</label>
                        <textarea
                          rows={4}
                          placeholder="Alcance, entregables y condiciones del servicio subcontratado..."
                          value={newContractorTask.notes}
                          onChange={(e) => setNewContractorTask(p => ({ ...p, notes: e.target.value }))}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:bg-white resize-none"
                        />
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsContractorTaskDrawerOpen(false)}
                        className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                      >
                        👷 Asignar Contratista
                      </button>
                    </div>
                  </form>
                </motion.div>
              </>
            )}
          </AnimatePresence>


    </>
  );
};
