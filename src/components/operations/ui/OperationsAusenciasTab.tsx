// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, Plane } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { ActivityDrawer } from '../modals/ActivityDrawer';


export const OperationsAusenciasTab = () => {
  const {
    currentUser,
    activeSubTab,
    agents,
    revealedReasons,
    toggleReason,
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
      {/* 4. AUSENCIAS */}

            {activeSubTab === 'ausencias' && (
        <div className="space-y-6 animate-fadeIn">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Report absence form */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 h-fit">
              <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                Registrar Ausencia o Permiso
              </h3>
              <p className="text-slate-500 text-xs">
                Registra vacaciones programadas, licencias médicas o jornadas de trabajo remoto autorizadas.
              </p>

              <form onSubmit={handleAddAbsenceSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-slate-400 font-bold uppercase block">Colaborador</label>
                  <select
                    value={isSupervisor ? newAbsence.agentId : currentAgentId}
                    onChange={(e) => setNewAbsence(p => ({ ...p, agentId: e.target.value }))}
                    disabled={!isSupervisor}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    {isSupervisor ? (
                      agentsExceptA1.map(a => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))
                    ) : (
                      loggedInAgent ? (
                        <option value={loggedInAgent.id}>{loggedInAgent.name}</option>
                      ) : (
                        agentsExceptA1.map(a => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))
                      )
                    )}
                  </select>
                  {!isSupervisor && (
                    <p className="text-[10px] text-slate-400 font-sans italic mt-1">
                      Como técnico con rol de usuario, solo puedes registrar ausencias para ti mismo.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Tipo de Ausencia</label>
                  <select
                    value={newAbsence.type}
                    onChange={(e) => setNewAbsence(p => ({ ...p, type: e.target.value as any }))}
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                  >
                    <option value="Vacaciones">Vacaciones</option>
                    <option value="Permiso">Permiso Personal</option>
                    <option value="Licencia">Licencia Médica</option>
                    <option value="Ausencia Programada">Ausencia Programada</option>
                    <option value="Trabajo Remoto">Trabajo Remoto</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={newAbsence.startDate}
                      onChange={(e) => {
                        const sDate = e.target.value;
                        setNewAbsence(p => {
                          const isSame = Boolean(sDate && p.endDate && sDate === p.endDate);
                          return {
                            ...p,
                            startDate: sDate,
                            duracionTipo: isSame ? p.duracionTipo : 'Día Completo',
                            horaInicio: isSame ? p.horaInicio : '',
                            horaFin: isSame ? p.horaFin : ''
                          };
                        });
                      }}
                      className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Fecha de Fin</label>
                    <input
                      type="date"
                      value={newAbsence.endDate}
                      onChange={(e) => {
                        const eDate = e.target.value;
                        setNewAbsence(p => {
                          const isSame = Boolean(p.startDate && eDate && p.startDate === eDate);
                          return {
                            ...p,
                            endDate: eDate,
                            duracionTipo: isSame ? p.duracionTipo : 'Día Completo',
                            horaInicio: isSame ? p.horaInicio : '',
                            horaFin: isSame ? p.horaFin : ''
                          };
                        });
                      }}
                      className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                    />
                  </div>
                </div>

                {/* Schedule options are ONLY rendered when start and end date are the same day */}
                {newAbsence.startDate && newAbsence.endDate && newAbsence.startDate === newAbsence.endDate && (
                  <>
                    <div className="space-y-1 animate-fadeIn">
                      <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Cobertura Horaria / Jornada</label>
                      <select
                        value={newAbsence.duracionTipo || 'Día Completo'}
                        onChange={(e) => {
                          const val = e.target.value as any;
                          setNewAbsence(p => {
                            let hIni = p.horaInicio || '';
                            let hFin = p.horaFin || '';
                            if (val === 'Medio Día (Mañana)') {
                              hIni = '08:00';
                              hFin = '12:00';
                            } else if (val === 'Medio Día (Tarde)') {
                              hIni = '13:00';
                              hFin = '17:00';
                            } else if (val === 'Horario Específico') {
                              if (!hIni) hIni = '09:00';
                              if (!hFin) hFin = '13:00';
                            } else {
                              hIni = '';
                              hFin = '';
                            }
                            return {
                              ...p,
                              duracionTipo: val,
                              horaInicio: hIni,
                              horaFin: hFin
                            };
                          });
                        }}
                        className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none"
                      >
                        <option value="Día Completo">Día Completo (Toda la jornada)</option>
                        <option value="Medio Día (Mañana)">Medio Día (Mañana: 08:00 - 12:00)</option>
                        <option value="Medio Día (Tarde)">Medio Día (Tarde: 13:00 - 17:00)</option>
                        <option value="Horario Específico">Horario Específico (Rango de horas)</option>
                      </select>
                    </div>

                    {newAbsence.duracionTipo && newAbsence.duracionTipo !== 'Día Completo' && (
                      <div className="grid grid-cols-2 gap-3 p-2.5 bg-indigo-50/50 border border-indigo-150 rounded-lg animate-fadeIn">
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-indigo-700 font-bold uppercase">Hora Inicio Ausencia</label>
                          <input
                            type="time"
                            value={newAbsence.horaInicio || '08:00'}
                            onChange={(e) => setNewAbsence(p => ({ ...p, horaInicio: e.target.value }))}
                            className="w-full text-xs font-semibold p-1.5 bg-white border border-indigo-200 rounded-lg text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-indigo-700 font-bold uppercase">Hora Fin Ausencia</label>
                          <input
                            type="time"
                            value={newAbsence.horaFin || '12:00'}
                            onChange={(e) => setNewAbsence(p => ({ ...p, horaFin: e.target.value }))}
                            className="w-full text-xs font-semibold p-1.5 bg-white border border-indigo-200 rounded-lg text-slate-800 outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="space-y-1">
                  <label className="font-mono text-[9px] text-slate-400 font-bold uppercase">Motivo / Descripción</label>
                  <textarea
                    rows={2}
                    value={newAbsence.reason}
                    onChange={(e) => setNewAbsence(p => ({ ...p, reason: e.target.value }))}
                    placeholder="Describe detalladamente el motivo o tique administrativo de soporte..."
                    className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 outline-none resize-none"
                  />
                </div>

                {isSupervisor && (
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="autoApproveAbsence"
                      checked={autoApproveAbsence}
                      onChange={(e) => setAutoApproveAbsence(e.target.checked)}
                      className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                    <label htmlFor="autoApproveAbsence" className="text-[11px] font-semibold text-slate-600 select-none cursor-pointer">
                      Aprobación automática (Inmediata)
                    </label>
                  </div>
                )}

                {!isSupervisor && (
                  <p className="text-[10px] text-amber-600 bg-amber-50/50 border border-amber-100 rounded-lg p-2 leading-relaxed">
                    ℹ️ Tu solicitud se enviará en estado <strong>Pendiente</strong> para la revisión y aprobación por parte de un supervisor.
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all shadow-sm cursor-pointer"
                >
                  {isSupervisor && autoApproveAbsence ? 'Confirmar y Autorizar' : 'Enviar Solicitud'}
                </button>
              </form>
            </div>

            {/* List of absences */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm lg:col-span-2 space-y-4">
              <h3 className="font-display font-bold text-sm text-slate-800 flex items-center gap-2">
                <Plane className="w-4 h-4 text-blue-600" />
                Ausencias y Permisos Vigentes
              </h3>
              
              <div className="space-y-3 max-h-[450px] overflow-y-auto no-scrollbar">
                {absences.map(abs => {
                  const name = agents.find(a => a.id === abs.agentId)?.name || 'Técnico';
                  const isRequester = currentUser?.name === name;
                  const isApproved = true; // Assuming all absences are approved
                  
                  let badgeColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  if (abs.type === 'Vacaciones') badgeColor = 'bg-teal-50 text-teal-700 border-teal-100';
                  else if (abs.type === 'Trabajo Remoto') badgeColor = 'bg-violet-50 text-violet-700 border-violet-100';

                  const isSameDayAbs = abs.startDate === abs.endDate;

                  return (
                    <div key={abs.id} className="border border-slate-150 p-4 rounded-xl space-y-2 bg-slate-50/50 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded uppercase">
                            {name}
                          </span>
                          <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                            {abs.type}
                          </span>
                          {isSameDayAbs && (abs.duracionTipo && abs.duracionTipo !== 'Día Completo' || (abs.horaInicio && abs.horaFin)) && (
                            <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded border bg-indigo-50 text-indigo-700 border-indigo-150 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-indigo-500" />
                              {abs.duracionTipo === 'Horario Específico' || (abs.horaInicio && abs.horaFin)
                                ? `${abs.duracionTipo ? abs.duracionTipo + ': ' : ''}${abs.horaInicio || ''} - ${abs.horaFin || ''}`
                                : (abs.duracionTipo || 'Día Completo')}
                            </span>
                          )}
                        </div>
                        <p 
                          className={`text-xs font-bold leading-snug cursor-pointer ${
                            isApproved && !revealedReasons[abs.id] 
                              ? "text-slate-400 italic" 
                              : "text-slate-800"
                          }`}
                          onClick={() => {
                            if (isApproved && isRequester) {
                              toggleReason(abs.id);
                            }
                          }}
                          title={!isApproved || (isRequester && revealedReasons[abs.id]) ? abs.reason : "Privado - Pulsa para ver"}
                        >
                          {isApproved && !revealedReasons[abs.id] 
                            ? "Privado - Pulsa para ver" 
                            : abs.reason
                          }
                        </p>
                        <div className="text-[10px] font-mono text-slate-400 space-y-0.5">
                          <p>Desde: <strong className="text-slate-600">{abs.startDate}</strong> &bull; Hasta: <strong className="text-slate-600">{abs.endDate}</strong></p>
                          {isSameDayAbs && (abs.duracionTipo && abs.duracionTipo !== 'Día Completo' || (abs.horaInicio && abs.horaFin)) && (
                            <p>Horario: <strong className="text-indigo-600">{abs.duracionTipo || 'Día Completo'}{abs.horaInicio && abs.horaFin ? ` (${abs.horaInicio} - ${abs.horaFin})` : ''}</strong></p>
                          )}
                          <p>Autorizado por: <strong className="text-slate-500">{abs.approvedBy}</strong></p>
                        </div>
                      </div>

                      {isSupervisor && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAbsence(abs.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-lg shrink-0 transition-all cursor-pointer"
                          title="Eliminar ausencia"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}

                {absences.length === 0 && (
                  <div className="text-center py-12 text-slate-400 text-xs space-y-2">
                    <UserCheck className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="font-bold">No hay ausencias programadas vigentes en el equipo.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>
      )}


    </>
  );
};
