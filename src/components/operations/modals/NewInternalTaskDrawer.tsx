// @ts-nocheck
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, History, CheckCircle } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';


export const NewInternalTaskDrawer = () => {
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
            {isInternalTaskDrawerOpen && (
              <>
                {/* Overlay */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50"
                  onClick={() => setIsInternalTaskDrawerOpen(false)}
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
                      <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
                        <Plus className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-slate-800">Programar Tarea Interna / Recurrente</h3>
                        <p className="text-slate-400 text-[10px] uppercase font-mono mt-0.5">Ticket CRM Obligatorio</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsInternalTaskDrawerOpen(false)} 
                      className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleCreateInternalTask} className="flex-1 flex flex-col justify-between overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Título de la Actividad *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Auditoría de backups semanales"
                          value={newInternalTask.title}
                          onChange={(e) => setNewInternalTask(p => ({ ...p, title: e.target.value }))}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Tipo de Tarea</label>
                          <select
                            value={newInternalTask.type}
                            onChange={(e) => setNewInternalTask(p => ({ ...p, type: e.target.value as 'Interna' | 'Programada' | 'Recurrente' }))}
                            className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none cursor-pointer"
                          >
                            <option value="Interna">Única / Interna</option>
                            <option value="Programada">Programada (Fecha Específica)</option>
                            <option value="Recurrente">Recurrente / Periódica</option>
                          </select>
                        </div>

                        {newInternalTask.type === 'Recurrente' ? (
                          <div className="space-y-1">
                            <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Frecuencia</label>
                            <select
                              value={newInternalTask.frequency}
                              onChange={(e) => setNewInternalTask(p => ({ ...p, frequency: e.target.value as any }))}
                              className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none cursor-pointer"
                            >
                              <option value="Diario">Diario</option>
                              <option value="Semanal">Semanal</option>
                              <option value="Mensual">Mensual</option>
                              <option value="Anual">Anual</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Frecuencia</label>
                            <input
                              type="text"
                              disabled
                              value="Única"
                              className="w-full text-xs p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-400 outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {newInternalTask.type === 'Interna' && (
                        <div className="bg-slate-50 border border-slate-150 rounded-xl p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="new_hasNoDate"
                              checked={newInternalTask.hasNoDate}
                              onChange={(e) => setNewInternalTask(p => ({ ...p, hasNoDate: e.target.checked }))}
                              className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                            />
                            <label htmlFor="new_hasNoDate" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                              ⚠️ No tiene fecha para hacerse (Sin fecha programada)
                            </label>
                          </div>
                        </div>
                      )}

                      {newInternalTask.type === 'Recurrente' && (
                        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 space-y-3">
                          <p className="text-[10px] font-bold text-indigo-700 font-mono uppercase tracking-wider flex items-center gap-1">
                            <span>⚙️</span> Detallar Recurrencia Exacta
                          </p>
                          
                          {newInternalTask.frequency === 'Semanal' && (
                            <div className="space-y-1">
                              <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Día específico de la semana</label>
                              <select
                                value={newInternalTask.recurrenceDayOfWeek}
                                onChange={(e) => setNewInternalTask(p => ({ ...p, recurrenceDayOfWeek: e.target.value }))}
                                className="w-full text-xs font-semibold p-2 bg-white border border-indigo-200 rounded-lg text-slate-800 outline-none cursor-pointer focus:border-indigo-400"
                              >
                                <option value="Lunes">Todos los Lunes</option>
                                <option value="Martes">Todos los Martes</option>
                                <option value="Miércoles">Todos los Miércoles</option>
                                <option value="Jueves">Todos los Jueves</option>
                                <option value="Viernes">Todos los Viernes</option>
                                <option value="Sábado">Todos los Sábados</option>
                                <option value="Domingo">Todos los Domingos</option>
                              </select>
                            </div>
                          )}

                          {newInternalTask.frequency === 'Mensual' && (
                            <div className="space-y-1">
                              <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Día específico del mes (1 al 31)</label>
                              <select
                                value={newInternalTask.recurrenceDayOfMonth}
                                onChange={(e) => setNewInternalTask(p => ({ ...p, recurrenceDayOfMonth: parseInt(e.target.value, 10) }))}
                                className="w-full text-xs font-semibold p-2 bg-white border border-indigo-200 rounded-lg text-slate-800 outline-none cursor-pointer focus:border-indigo-400"
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <option key={day} value={day}>El día {day} de cada mes</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {newInternalTask.frequency === 'Anual' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Día del mes</label>
                                <select
                                  value={newInternalTask.recurrenceDayOfMonth}
                                  onChange={(e) => setNewInternalTask(p => ({ ...p, recurrenceDayOfMonth: parseInt(e.target.value, 10) }))}
                                  className="w-full text-xs font-semibold p-2 bg-white border border-indigo-200 rounded-lg text-slate-800 outline-none cursor-pointer focus:border-indigo-400"
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>Día {day}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Mes del año</label>
                                <select
                                  value={newInternalTask.recurrenceMonthOfYear}
                                  onChange={(e) => setNewInternalTask(p => ({ ...p, recurrenceMonthOfYear: parseInt(e.target.value, 10) }))}
                                  className="w-full text-xs font-semibold p-2 bg-white border border-indigo-200 rounded-lg text-slate-800 outline-none cursor-pointer focus:border-indigo-400"
                                >
                                  <option value={1}>Enero</option>
                                  <option value={2}>Febrero</option>
                                  <option value={3}>Marzo</option>
                                  <option value={4}>Abril</option>
                                  <option value={5}>Mayo</option>
                                  <option value={6}>Junio</option>
                                  <option value={7}>Julio</option>
                                  <option value={8}>Agosto</option>
                                  <option value={9}>Septiembre</option>
                                  <option value={10}>Octubre</option>
                                  <option value={11}>Noviembre</option>
                                  <option value={12}>Diciembre</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {newInternalTask.frequency === 'Diario' && (
                            <p className="text-[10px] text-slate-500 leading-normal">
                              La tarea se repetirá de forma continua todos los días de la semana a partir de la fecha de inicio.
                            </p>
                          )}

                          {/* End Date Checkbox for recurrence */}
                          <div className="bg-white border border-indigo-100 rounded-lg p-2.5 space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="new_hasEndDate"
                                checked={newInternalTask.hasEndDate}
                                onChange={(e) => setNewInternalTask(p => ({ ...p, hasEndDate: e.target.checked }))}
                                className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                              />
                              <label htmlFor="new_hasEndDate" className="text-[11px] text-slate-700 font-semibold cursor-pointer select-none">
                                📅 ¿Tiene fecha límite o fecha final de recurrencia?
                              </label>
                            </div>

                            {newInternalTask.hasEndDate && (
                              <div className="space-y-1 pt-1.5 border-t border-indigo-50">
                                <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Fecha de Finalización</label>
                                <input
                                  type="date"
                                  required
                                  value={newInternalTask.recurrenceEndDate}
                                  onChange={(e) => setNewInternalTask(p => ({ ...p, recurrenceEndDate: e.target.value }))}
                                  className="w-full text-xs p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:bg-white"
                                />
                              </div>
                            )}
                          </div>

                          {/* Beautiful Preview of Selected Recurrence */}
                          <div className="bg-indigo-600 text-white rounded-lg p-2.5 text-[11px] font-bold flex items-center gap-1.5 shadow-xs">
                            <Clock className="w-3.5 h-3.5 text-indigo-200 shrink-0" />
                            <span>
                              Recurrencia: <strong className="text-amber-200">{
                                getRecurrenceDescription({
                                  ...newInternalTask,
                                  id: '',
                                  assignedToId: '',
                                  ticketId: '',
                                  status: 'Pendiente',
                                  notes: ''
                                } as any)
                              }</strong>
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Técnico Asignado</label>
                        <select
                          value={newInternalTask.assignedToId}
                          disabled={!isSupervisor}
                          onChange={(e) => setNewInternalTask(p => ({ ...p, assignedToId: e.target.value }))}
                          className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {agentsExceptA1.map(a => (
                            <option key={a.id} value={a.id}>{a.name} {a.id === currentAgentId ? '(Tú)' : ''}</option>
                          ))}
                        </select>
                        {!isSupervisor && (
                          <p className="text-[9px] text-slate-400 font-medium">Los técnicos con rol usuario solo se pueden asignar tareas a sí mismos.</p>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Ticket Externo CRM (Opcional)</label>
                          <input
                            type="text"
                            placeholder="Ej: CRM-1234 (Auto si vacío)"
                            value={newInternalTask.ticketId}
                            onChange={(e) => setNewInternalTask(p => ({ ...p, ticketId: e.target.value }))}
                            className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:bg-white uppercase"
                          />
                        </div>

                        {newInternalTask.type === 'Programada' && (
                          <div className="space-y-1">
                            <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Fecha Programada *</label>
                            <input
                              type="date"
                              required
                              value={newInternalTask.scheduledDate}
                              onChange={(e) => setNewInternalTask(p => ({ ...p, scheduledDate: e.target.value }))}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:bg-white"
                            />
                          </div>
                        )}

                        {newInternalTask.type === 'Interna' && !newInternalTask.hasNoDate && (
                          <div className="space-y-1">
                            <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Fecha Programada</label>
                            <input
                              type="date"
                              value={newInternalTask.scheduledDate}
                              onChange={(e) => setNewInternalTask(p => ({ ...p, scheduledDate: e.target.value }))}
                              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none focus:bg-white"
                            />
                          </div>
                        )}

                        {newInternalTask.type === 'Interna' && newInternalTask.hasNoDate && (
                          <div className="space-y-1">
                            <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Fecha Programada</label>
                            <input
                              type="text"
                              disabled
                              value="Sin fecha definida"
                              className="w-full text-xs p-2 bg-slate-150 border border-slate-200 rounded-lg text-slate-500 outline-none cursor-not-allowed"
                            />
                          </div>
                        )}

                        {newInternalTask.type === 'Recurrente' && (
                          <div className="space-y-1">
                            <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Fecha Programada</label>
                            <input
                              type="text"
                              disabled
                              value="Definida por regla"
                              className="w-full text-xs p-2 bg-slate-150 border border-slate-200 rounded-lg text-slate-500 outline-none cursor-not-allowed"
                            />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Instrucciones / Notas</label>
                        <textarea
                          rows={4}
                          placeholder="Detalla el alcance y entregables técnicos..."
                          value={newInternalTask.notes}
                          onChange={(e) => setNewInternalTask(p => ({ ...p, notes: e.target.value }))}
                          className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 outline-none focus:bg-white resize-none"
                        />
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsInternalTaskDrawerOpen(false)}
                        className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                      >
                        📅 Programar Tarea
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
