// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Search, Filter, Plus, Calendar as CalendarIcon, MapPin, User, CheckCircle2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Play, Square, Pause, ExternalLink, MessageSquare, ShieldAlert, Phone, HelpCircle, X, Save, Edit3, Trash2, Camera, MoreVertical, FileText, Download, Briefcase, FileSignature, Coffee, UserX, Loader2, ArrowRight, UserCheck, AlertTriangle, Building2, HardHat, FileCheck, CheckSquare, Settings, Activity, Upload, Image as ImageIcon, Map, FileCode2, Zap, MonitorPlay, CheckCircle, ChevronDown, Clock8, MinusCircle, Plane, Shield, TrendingUp, Users } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { ActivityDrawer } from '../modals/ActivityDrawer';


export const OperationsCalendarioTab = () => {
  const {
    isolatedEvents,
    activeSubTab,
    agents,
    internalTasks,
    contractorTasks,
    calendarFilters,
    setCalendarFilters,
    calendarViewMode,
    setCalendarViewMode,
    isEventDrawerOpen,
    setIsEventDrawerOpen,
    selectedAgendaItem,
    setSelectedAgendaItem,
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
      {/* 6. CALENDARIO OPERATIVO (MASTER TRIPLE-COLUMN WORKSPACE) */}
      {activeSubTab === 'calendario' && (
        <div className="space-y-6 animate-fadeIn relative">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUMN 1: LAYERS & FILTERS (Col 2) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-black text-[10px] uppercase tracking-widest text-indigo-300/80">Capas de Datos</h3>
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400/50" />
                </div>

                <div className="space-y-2">
                  <button 
                    onClick={() => setCalendarFilters(p => ({ ...p, general: !p.general }))}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      calendarFilters.general ? 'bg-white/10 border-white/20' : 'bg-slate-800/40 border-transparent opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="text-[10px] font-bold">Roster</span>
                    </div>
                    {calendarFilters.general ? <CheckCircle className="w-3 h-3 text-indigo-400" /> : <MinusCircle className="w-3 h-3 text-slate-600" />}
                  </button>

                  <button 
                    onClick={() => setCalendarFilters(p => ({ ...p, tasks: !p.tasks }))}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      calendarFilters.tasks ? 'bg-white/10 border-white/20' : 'bg-slate-800/40 border-transparent opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[10px] font-bold">Tareas</span>
                    </div>
                    {calendarFilters.tasks ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <MinusCircle className="w-3 h-3 text-slate-600" />}
                  </button>

                  <button 
                    onClick={() => setCalendarFilters(p => ({ ...p, isolated: !p.isolated }))}
                    className={`w-full p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                      calendarFilters.isolated ? 'bg-white/10 border-white/20' : 'bg-slate-800/40 border-transparent opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[10px] font-bold">Agenda</span>
                    </div>
                    {calendarFilters.isolated ? <CheckCircle className="w-3 h-3 text-amber-400" /> : <MinusCircle className="w-3 h-3 text-slate-600" />}
                  </button>
                </div>
              </div>

              <button 
                onClick={() => {
                  setQuickEventForm(p => ({ ...p, eventCategory: 'particular', agentId: currentAgentId, isAssignedToOther: false }));
                  setIsEventDrawerOpen(true);
                }}
                className="w-full py-4 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2 group"
              >
                <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                Recordatorio Personal
              </button>
            </div>

            {/* COLUMN 2: MASTER CALENDAR GRID (Col 7) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
                {/* Integrated Navigation Header */}
                <div className="flex items-center justify-between mb-6 px-1">
                  <div className="flex items-center gap-1.5">
                    <button onClick={handlePrevMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"><ChevronDown className="w-4 h-4 rotate-90" /></button>
                    <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em] min-w-[160px] text-center">
                      {monthNames[calendarMonth]} {calendarYear}
                    </h2>
                    <button onClick={handleNextMonth} className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 transition-colors"><ChevronDown className="w-4 h-4 -rotate-90" /></button>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedCalendarDay(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0])}
                    className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all"
                  >
                    Hoy
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-px bg-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                    <div key={d} className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                  ))}
                  {leadingBlanks.map((_, idx) => (
                    <div key={`month_blank_${idx}`} className="bg-slate-50/30 min-h-[100px] border-t border-r border-slate-100/50" />
                  ))}
                  {calendarDaysArray.map(day => {
                    const dayStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const isToday = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] === dayStr;
                    const isSelected = selectedCalendarDay === dayStr;
                    const intensity = getDayWorkloadIntensity(dayStr);
                    
                    const dayTasks = internalTasks.filter(t => t.scheduledDate === dayStr);
                    const dayContTasks = contractorTasks.filter(t => t.dueDate === dayStr);
                    const dayEvents = calendarEvents.filter(e => e.date === dayStr);
                    const dayIsolated = isolatedEvents.filter(e => e.date === dayStr);
                    const dayAbsences = absences.filter(a => dayStr >= a.startDate && dayStr <= a.endDate);
                    const dayVisits = programmedVisits.filter(v => {
                      if (v.estado_visita === 'Cerrada') return false;
                      const visitDate = (v.fecha_visita || '').split(' ')[0];
                      return visitDate === dayStr;
                    });

                    return (
                      <div 
                        key={`month_day_${day}`} 
                        onClick={() => setSelectedCalendarDay(dayStr)} 
                        className={`min-h-[110px] bg-white border-t border-r border-slate-100 p-2 transition-all cursor-pointer relative group flex flex-col ${
                          isSelected ? 'bg-indigo-50/50 ring-2 ring-inset ring-indigo-200 z-10' : 'hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-[11px] font-mono font-black mb-1.5 ${
                          isToday ? 'text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-lg border border-blue-100 shadow-sm w-fit' : 'text-slate-400 group-hover:text-slate-700'
                        }`}>
                          {day}
                        </span>
                        
                        <div className="flex-1 space-y-1.5">
                          {intensity > 0 && (
                            <div className="h-1 rounded-full overflow-hidden flex bg-slate-100">
                              <div 
                                className={`h-full transition-all ${intensity > 7 ? 'bg-rose-500' : intensity > 4 ? 'bg-amber-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${Math.min(intensity * 10, 100)}%` }} 
                              />
                            </div>
                          )}
                          
                          <div className="space-y-0.5">
                            {/* Roles prioritized: Guardia, Chat, Alertas */}
                            {dayEvents.map(e => {
                                const agent = agents.find(a => a.id === e.agentId);
                                const initials = agent?.initials || '??';
                                let color = "bg-indigo-50 text-indigo-700 border-indigo-100";
                                let label = e.type === 'guardia' ? 'G' : e.type === 'chat' ? 'C' : e.type === 'alerta' ? 'A' : e.type.substring(0,1).toUpperCase();
                                
                                if (e.type === 'guardia') color = "bg-indigo-600 text-white border-indigo-700";
                                else if (e.type === 'chat') color = "bg-emerald-500 text-white border-emerald-600";
                                else if (e.type === 'alerta') color = "bg-rose-500 text-white border-rose-600";
 
                                return (
                                  <div key={e.id} className={`text-[7px] font-black uppercase tracking-tight px-1 py-0.5 rounded border truncate flex justify-between items-center ${color}`}>
                                    <span>{label}</span>
                                    <span className="opacity-80 ml-1 font-mono">{initials}</span>
                                  </div>
                                );
                            })}
                            
                            {/* Absences (Vacations) */}
                            {dayAbsences.map(a => (
                                <div key={a.id} className="text-[7px] font-black uppercase tracking-tight bg-rose-50 text-rose-700 px-1 py-0.5 rounded border border-rose-200 truncate flex justify-between items-center">
                                  <span>VAC</span>
                                  <span className="opacity-80 font-mono">{agents.find(ag => ag.id === a.agentId)?.initials || '??'}</span>
                                </div>
                            ))}

                            {/* Programmed Visits */}
                            {dayVisits.slice(0, 1).map(v => {
                              const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
                              const matchedAgent = techName ? agents.find(a => (a.name || '').toLowerCase().includes(techName) || (a.id || '').toLowerCase() === techName) : undefined;
                              const initials = matchedAgent?.initials || (v.tecnico_visita || v.tecnico || '??').substring(0, 2).toUpperCase();
                              return (
                                <div key={v.id} className="text-[7px] font-black uppercase tracking-tight bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-200 truncate flex justify-between items-center">
                                  <span className="truncate">📅 {v.cliente || 'Visita'}</span>
                                  <span className="opacity-80 font-mono ml-1 shrink-0">{initials}</span>
                                </div>
                              );
                            })}
 
                            {/* Internal Tasks */}
                            {dayTasks.slice(0, 1).map(t => (
                              <div key={t.id} className="text-[7px] font-black uppercase tracking-tight bg-slate-50 text-slate-500 px-1 py-0.5 rounded border border-slate-200 truncate">
                                📋 {t.title}
                              </div>
                            ))}
                            
                            {/* Contractor Tasks */}
                            {dayContTasks.slice(0, 1).map(t => (
                              <div key={t.id} className="text-[7px] font-black uppercase tracking-tight bg-purple-50 text-purple-700 px-1 py-0.5 rounded border border-purple-200 truncate">
                                👷 {t.title}
                              </div>
                            ))}
 
                            {(dayEvents.length + dayAbsences.length + dayTasks.length + dayContTasks.length + dayIsolated.length + dayVisits.length) > 4 && (
                              <div className="text-[6px] font-bold text-slate-400 text-right pr-1">
                                + {(dayEvents.length + dayAbsences.length + dayTasks.length + dayContTasks.length + dayIsolated.length + dayVisits.length) - 4} más
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMN 3: LIVE AGENDA DETAIL (Col 3) */}
            <div className="lg:col-span-3 space-y-4 h-full flex flex-col">
              <div className="flex items-center justify-between bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-2">
                <div>
                  <h2 className="text-base font-display font-black text-slate-800 leading-none">Hoja de Ruta</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">{selectedCalendarDay}</p>
                </div>
                <div className="flex flex-col items-end">
                   <div className={`w-2 h-2 rounded-full mb-1 ${getDayWorkloadIntensity(selectedCalendarDay || '') > 7 ? 'bg-rose-500 animate-pulse' : getDayWorkloadIntensity(selectedCalendarDay || '') > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                   <span className="text-[9px] font-black font-mono text-slate-600 uppercase">Carga: {Math.round(getDayWorkloadIntensity(selectedCalendarDay || '') * 10)}%</span>
                </div>
              </div>

              <div className="flex-1 space-y-3 max-h-[700px] overflow-y-auto no-scrollbar pr-1">
                <AnimatePresence mode="popLayout">
                  {(() => {
                    const dateStr = selectedCalendarDay || '';
                    const agendaItems: any[] = [];
                    if (calendarFilters.general) {
                      calendarEvents.filter(e => e.date === dateStr).forEach(e => agendaItems.push({ ...e, source: 'designation' }));
                      absences.filter(a => dateStr >= a.startDate && dateStr <= a.endDate).forEach(a => agendaItems.push({ ...a, source: 'absence' }));
                    }
                    if (calendarFilters.tasks) {
                      internalTasks.filter(t => t.scheduledDate === dateStr).forEach(t => agendaItems.push({ ...t, source: 'internal_task' }));
                      contractorTasks.filter(t => t.dueDate === dateStr).forEach(t => agendaItems.push({ ...t, source: 'contractor_task' }));
                      programmedVisits.filter(v => {
                        if (v.estado_visita === 'Cerrada') return false;
                        const visitDate = (v.fecha_visita || '').split(' ')[0];
                        return visitDate === dateStr;
                      }).forEach(v => {
                        agendaItems.push({ ...v, source: 'programmed_visit' });
                      });
                    }
                    if (calendarFilters.isolated) {
                      isolatedEvents.filter(e => e.date === dateStr).forEach(e => agendaItems.push({ ...e, source: 'isolated' }));
                    }

                    if (agendaItems.length === 0) {
                      return (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-20 bg-slate-50/30 rounded-3xl border-2 border-dashed border-slate-100">
                          <CalendarIcon className="w-8 h-8 text-slate-200 mb-3" />
                          <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Día sin registros</p>
                        </motion.div>
                      );
                    }

                    return agendaItems.map((item, idx) => {
                      const agent = item.source === 'programmed_visit'
                        ? (() => {
                            const techName = (item.tecnico_visita || item.tecnico || '').trim().toLowerCase();
                            if (!techName) return { name: 'Sin asignar', initials: 'SA' };
                            const matched = agents.find(a => (a.name || '').toLowerCase().includes(techName) || (a.id || '').toLowerCase() === techName);
                            if (matched) return matched;
                            const displayName = item.tecnico_visita || item.tecnico || 'Sin asignar';
                            return { name: displayName, initials: displayName.substring(0, 2).toUpperCase() };
                          })()
                        : agents.find(a => a.id === (item.agentId || item.assignedToId || item.supervisorAgentId));
                      let icon = <Clock8 className="w-3.5 h-3.5" />;
                      let colorClass = "bg-white border-slate-100 text-slate-800";
                      let title = item.title || item.note || "Sin título";
                      let designationTypeLabel = '';

                      if (item.source === 'designation') {
                        if (item.type === 'guardia') {
                          icon = <span className="text-[12px]">🛡️</span>;
                          colorClass = "bg-indigo-50/50 border-indigo-100 text-indigo-900";
                          title = "Guardia (24h)";
                        } else if (item.type === 'chat') {
                          icon = <span className="text-[12px]">💬</span>;
                          colorClass = "bg-emerald-50/50 border-emerald-100 text-emerald-900";
                          title = "Canal de Chat";
                        } else if (item.type === 'alerta') {
                          icon = <span className="text-[12px]">🚨</span>;
                          colorClass = "bg-rose-50/50 border-rose-100 text-rose-900";
                          title = "Consola Alertas";
                        } else {
                          icon = <Shield className="w-3.5 h-3.5" />;
                          colorClass = "bg-indigo-50/50 border-indigo-100 text-indigo-900";
                        }
                      } else if (item.source === 'internal_task') {
                        icon = <Briefcase className="w-3.5 h-3.5" />;
                        colorClass = "bg-emerald-50/50 border-emerald-100 text-emerald-900";
                      } else if (item.source === 'contractor_task') {
                        icon = <Users className="w-3.5 h-3.5" />;
                        colorClass = "bg-purple-50/50 border-purple-100 text-purple-900";
                      } else if (item.source === 'isolated') {
                        icon = <User className="w-3.5 h-3.5" />;
                        colorClass = "bg-amber-50/50 border-amber-200 text-amber-900";
                      } else if (item.source === 'absence') {
                        icon = <Plane className="w-3.5 h-3.5" />;
                        colorClass = "bg-rose-50/50 border-rose-100 text-rose-900";
                        title = `${item.type}`;
                      } else if (item.source === 'programmed_visit') {
                        icon = <span className="text-[14px]">📅</span>;
                        colorClass = "bg-blue-50/50 border-blue-100 text-blue-900";
                        title = `${item.cliente || 'Visita'}: ${item.asunto || 'Visita Programada'}`;
                      }

                      return (
                        <motion.div
                          key={`${item.source}_${item.id || idx}`}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          onClick={() => setSelectedAgendaItem({ ...item, agent })}
                          className={`p-3.5 rounded-2xl border-l-4 shadow-sm flex items-center justify-between gap-3 group transition-all hover:translate-x-1 hover:shadow-md cursor-pointer ${
                            item.source === 'designation' ? 'bg-indigo-50/50 border-indigo-500 text-indigo-900 border-y border-r border-indigo-100' :
                            item.source === 'internal_task' ? 'bg-emerald-50/50 border-emerald-500 text-emerald-900 border-y border-r border-emerald-100' :
                            item.source === 'contractor_task' ? 'bg-purple-50/50 border-purple-500 text-purple-900 border-y border-r border-purple-100' :
                            item.source === 'absence' ? 'bg-rose-50/50 border-rose-500 text-rose-900 border-y border-r border-rose-100' :
                            item.source === 'programmed_visit' ? 'bg-blue-50/50 border-blue-500 text-blue-900 border-y border-r border-blue-100' :
                            'bg-amber-50/50 border-amber-500 text-amber-900 border-y border-r border-amber-100'
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center border border-current/10 shrink-0 shadow-sm">
                              {icon}
                            </div>
                            <div className="truncate">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-[7px] font-black uppercase tracking-[0.1em] px-1.5 py-0.5 rounded bg-current/5 border border-current/10">
                                  {item.source.replace('_', ' ')}
                                </span>
                                {item.status && (
                                  <span className="text-[7px] font-bold uppercase text-slate-400">
                                    • {item.status}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-[11px] font-black truncate leading-tight">{title}</h4>
                              <p className="text-[9px] font-bold opacity-60 truncate mt-0.5">{agent?.name || 'Sistema'}</p>
                            </div>
                          </div>
                          <div className="bg-white/50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <ChevronDown className="w-3.5 h-3.5 -rotate-90 opacity-60" />
                          </div>
                        </motion.div>
                      );
                    });
                  })()}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* NEW ACTIVITY DRAWER (DRYWALL) */}
          <ActivityDrawer 
            isOpen={isEventDrawerOpen}
            onClose={() => setIsEventDrawerOpen(false)}
            selectedCalendarDay={selectedCalendarDay}
            quickEventForm={quickEventForm}
            setQuickEventForm={setQuickEventForm}
            isSupervisor={isSupervisor}
            agents={agents}
            currentAgentId={currentAgentId}
            handleAddCalendarEvent={handleAddCalendarEvent}
          />
        </div>
      )}
    </>
  );
};
