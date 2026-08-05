import { AsistenciaRowComponent } from './AsistenciaRowComponent';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ComingSoonSubTab } from '../ui/ComingSoonSubTab';
import { Agent, InternalTask, ContractorTask, IsolatedEvent, AusenciaRow } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { fetchAsistencia, pushAsistencia, subscribeToAsistencia } from '../../db/asistenciaService';
import { 
  subscribeToDesignations, 
  updateDesignation,
  fetchCalendarEvents,
  saveCalendarEvents,
  saveCalendarEvent,
  deleteCalendarEvent,
  deleteCalendarEvents,
  deleteEvent,
  deleteAusencia,
  fetchAllPersonalReminders,
  savePersonalRemindersForAgent,
  getProgrammedVisits,
  fetchJornadas,
  saveJornadas,
  fetchAusencias,
  saveAusencias,
  subscribeToJornadas,
  subscribeToAusencias,
  saveSingleInternalTask,
  deleteSingleInternalTask
} from '../../db/firebaseService';
import { SpecialDutyDoc } from '../../types';
import { AsistenciaRow } from '../../types';
import { safeLocalStorageSet, debouncedSafeSetItem } from '../../lib/storage';
import {
  Users, Database, 
  Clock, 
  Calendar as CalendarIcon, 
  Shield, 
  MessageSquare, 
  AlertTriangle, 
  Plane, CheckSquare, 
  MapPin, 
  UserCheck, 
  UserX, 
  CheckCircle, 
  TrendingUp, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Check, 
  X,
  Wrench,
  Briefcase, 
  CalendarDays,
  Coffee,
  HelpCircle,
  Clock8,
  FileText,
  User,
  ArrowRightLeft,
  Car,
  Phone,
  Map,
  History,
  MinusCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { OperationsTabProps, AgentDutyState, SpecialDutyAssignment, AbsenceRecord, AbsenceRequest, ExternalWorkRecord, CalendarEvent, DailySchedule } from './types';
import { createDefaultWeeklySchedule, getRecurrenceDescription } from './utils/helpers';
import { useOperationsData } from './hooks/useOperationsData';
import { useOperationsFilters } from './hooks/useOperationsFilters';
import { OperationsProvider } from './OperationsContext';
import { OperationsToast } from './ui/OperationsToast';
import { OperationsHeader } from './ui/OperationsHeader';
import { OperationsFilterBar } from './ui/OperationsFilterBar';
import { OperationsDashboardTab } from './ui/OperationsDashboardTab';
import { OperationsAdminTab } from './ui/OperationsAdminTab';
import { OperationsAusenciasTab } from './ui/OperationsAusenciasTab';
import { OperationsTareasTab } from './ui/OperationsTareasTab';
import { OperationsCalendarioTab } from './ui/OperationsCalendarioTab';
import { OperationsModals } from './ui/OperationsModals';


export default function OperationsTab({ 
  agents, 
  currentUser, 
  hideNavBar,
  hideGestionOperativa,
  initialSubTab, 
  onUpdateAgent,
  internalTasks,
  setInternalTasks,
  contractorTasks,
  setContractorTasks,
  isolatedEvents,
  setIsolatedEvents,
  comingSoonConfig = {}
}: OperationsTabProps) {
  const isSupervisor = currentUser?.role?.toLowerCase() !== 'user';
  
  // Find current agent if logged in as simple user
  const loggedInAgent = agents.find(a => a.email === currentUser?.email || (currentUser?.name && a.name.includes(currentUser.name))) || agents[0];
  const currentAgentId = loggedInAgent?.id || agents[0]?.id || '';

  const { 
    dutyStates, 
    setDutyStates, 
    hasLoadedDesignaciones, 
    setHasLoadedDesignaciones,
    hasLoadedJornada,
    setHasLoadedJornada,
    hasLoadedAusencias,
    setHasLoadedAusencias,
    asistencia,
    setAsistencia,
    selectedAsistenciaDate,
    setSelectedAsistenciaDate,
    hasLoadedAsistencia,
    setHasLoadedAsistencia,
    isSyncingAsistencia,
    setIsSyncingAsistencia
  } = useOperationsData(agents, currentAgentId);
  const { 
    activeSubTab,
    setActiveSubTab,
    calendarFilters,
    setCalendarFilters,
    calendarViewMode,
    setCalendarViewMode,
    isEventDrawerOpen,
    setIsEventDrawerOpen,
    selectedAgendaItem,
    setSelectedAgendaItem,
    bitacoraPage,
    setBitacoraPage,
    BITACORA_PAGE_SIZE,
    adminSubTab,
    setAdminSubTab,
    hoveredStatus,
    setHoveredStatus,
    revealedReasons,
    setRevealedReasons,
    toggleReason,
    editingAgentId,
    setEditingAgentId,
    tempWeeklySchedule,
    setTempWeeklySchedule,
    drawerAgentId,
    setDrawerAgentId
  } = useOperationsFilters(initialSubTab);


  const [specialDuties, setSpecialDuties] = useState<SpecialDutyAssignment>(() => {
    const saved = localStorage.getItem('tm_ops_special_duties');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }

    // Default designations (Guardia, Chat, Alertas)
    return {
      guardiaId: agents[0]?.id || '',
      chatId: agents[1]?.id || '',
      alertasId: agents[2]?.id || '',
      assignedDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
    };
  });

  const [absences, setAbsences] = useState<AbsenceRecord[]>(() => {
    const saved = localStorage.getItem('tm_ops_absences');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }

    return [];
  });

  const [programmedVisits, setProgrammedVisits] = useState<any[]>([]);

  const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>(() => {
    const saved = localStorage.getItem('tm_ops_absence_requests');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }

    // Default realistic mock requests
    return [
      {
        id: 'req_1',
        agentId: agents[1]?.id || 'ag_2',
        type: 'Vacaciones',
        startDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 17 * 86400000).toISOString().split('T')[0],
        reason: 'Periodo de descanso anual solicitado para viaje familiar.',
        status: 'Pendiente',
        requestedAt: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
      },
      {
        id: 'req_2',
        agentId: agents[2]?.id || 'ag_3',
        type: 'Permiso',
        startDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        endDate: new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0],
        reason: 'Asuntos personales de carácter urgente (trámites notariales).',
        status: 'Pendiente',
        requestedAt: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0]
      }
    ];
  });

  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState<string>('');

  // Tareas state now comes from props

  // Unified task detail modal states
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<{
    type: 'internal' | 'contractor';
    id: string;
  } | null>(null);
  const [taskModalTab, setTaskModalTab] = useState<'detalles' | 'actor' | 'seguimiento'>('detalles');
  const [isChangingAssignee, setIsChangingAssignee] = useState(false);
  const [modalFollowUpInput, setModalFollowUpInput] = useState('');
  const [modalReportInput, setModalReportInput] = useState('');
  const [modalAuthCode, setModalAuthCode] = useState('');

  const [isReprogrammingDate, setIsReprogrammingDate] = useState(false);
  const [tempScheduledDate, setTempScheduledDate] = useState('');
  const [tempStartDate, setTempStartDate] = useState('');
  const [tempDueDate, setTempDueDate] = useState('');
  const [tempType, setTempType] = useState<'Interna' | 'Programada' | 'Recurrente'>('Interna');
  const [tempFrequency, setTempFrequency] = useState<'Diario' | 'Semanal' | 'Mensual' | 'Anual'>('Mensual');
  const [tempRecurrenceDayOfWeek, setTempRecurrenceDayOfWeek] = useState('Viernes');
  const [tempRecurrenceDayOfMonth, setTempRecurrenceDayOfMonth] = useState(5);
  const [tempRecurrenceMonthOfYear, setTempRecurrenceMonthOfYear] = useState(7);
  const [tempHasNoDate, setTempHasNoDate] = useState(false);
  const [tempHasEndDate, setTempHasEndDate] = useState(false);
  const [tempRecurrenceEndDate, setTempRecurrenceEndDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (selectedTaskForModal) {
      const isInternal = selectedTaskForModal.type === 'internal';
      const task = isInternal
        ? internalTasks.find(t => t.id === selectedTaskForModal.id)
        : contractorTasks.find(t => t.id === selectedTaskForModal.id);
      
      if (task) {
        if (isInternal) {
          const t = task as InternalTask;
          setTempScheduledDate(t.scheduledDate || '');
          setTempType(t.type || 'Interna');
          setTempFrequency(t.frequency || 'Mensual');
          setTempRecurrenceDayOfWeek(t.recurrenceDayOfWeek || 'Viernes');
          setTempRecurrenceDayOfMonth(t.recurrenceDayOfMonth || 5);
          setTempRecurrenceMonthOfYear(t.recurrenceMonthOfYear || 7);
          setTempHasNoDate(!!t.hasNoDate);
          setTempHasEndDate(!!t.hasEndDate);
          setTempRecurrenceEndDate(t.recurrenceEndDate || '');
        } else {
          const c = task as ContractorTask;
          setTempStartDate(c.startDate || '');
          setTempDueDate(c.dueDate || '');
        }
      }
    } else {
      setIsReprogrammingDate(false);
      setShowDeleteConfirm(false);
    }
  }, [selectedTaskForModal, internalTasks, contractorTasks]);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  // Memoized lists and variables for Aggressive Memoization
  const regularNonA1NonS1Agents = useMemo(() => {
    return agents.filter(a => {
      const t = a.tierId?.toLowerCase();
      return t !== 'a1' && t !== 's1';
    });
  }, [agents]);

  const nonUserAndSpecificAgents = useMemo(() => {
    return agents.filter(a => a.role !== 'User' && a.role !== 'Invitado' && a.id !== 'AG-CF-409' && a.id !== 'AG-AF-145');
  }, [agents]);

  const pendingAbsenceRequests = useMemo(() => {
    return absenceRequests.filter(r => r.status === 'Pendiente');
  }, [absenceRequests]);

  const nonPendingAbsenceRequests = useMemo(() => {
    return absenceRequests.filter(r => r.status !== 'Pendiente');
  }, [absenceRequests]);

  const agentsExceptA1 = useMemo(() => {
    return agents.filter(a => a.tierId?.toLowerCase() !== 'a1');
  }, [agents]);

  const activeInternalTasksCount = useMemo(() => {
    return internalTasks.filter(t => t.status !== 'Completado').length;
  }, [internalTasks]);

  const myActiveInternalTasksCount = useMemo(() => {
    return internalTasks.filter(t => t.assignedToId === currentAgentId && t.status !== 'Completado').length;
  }, [internalTasks, currentAgentId]);

  const totalSuccessTasksCount = useMemo(() => {
    const internalSuccess = internalTasks.filter(t => t.status === 'Completado').length;
    const contractorSuccess = contractorTasks.filter(c => c.status === 'Completado').length;
    return internalSuccess + contractorSuccess;
  }, [internalTasks, contractorTasks]);

  // Keep localStorage updated
  useEffect(() => {
    safeLocalStorageSet('tm_ops_duty_states', JSON.stringify(dutyStates));
  }, [dutyStates]);

  // Status updates are now directly propagated to the parent and Firestore via our explicit change handlers (handleUpdateMyStatus, handleCheckIn, etc.)
  // to avoid any cyclic dependency or feedback loops.

    
  // Synchronize Special Duties with Firestore
  useEffect(() => {
    const isEntryInCurrentWeek = (entry: any): boolean => {
      if (!entry || !entry.startDate) return false;
      
      const today = new Date();
      const todayStr = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      
      // 1. Is today within the assignment range?
      const entryStart = entry.startDate;
      const entryEnd = entry.endDate || entry.startDate;
      if (todayStr >= entryStart && todayStr <= entryEnd) {
        return true;
      }
      
      // 2. Or does it overlap with the current week (Monday - Sunday)?
      const day = today.getDay();
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diffToMonday));
      monday.setHours(0,0,0,0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      
      const toYYYYMMDD = (d: Date) => {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      };
      
      const weekStart = toYYYYMMDD(monday);
      const weekEnd = toYYYYMMDD(sunday);
      
      return (entryStart <= weekEnd && entryEnd >= weekStart);
    };

    const getActiveAgentFromDesignation = (docData: any): string => {
      if (!docData) return '';
      const history = docData.history || [];
      if (history.length === 0) {
        return docData.currentAgentId || '';
      }
      const latestEntry = history[history.length - 1];
      if (isEntryInCurrentWeek(latestEntry)) {
        return latestEntry.agentId || '';
      }
      return '';
    };

    const unsubscribe = subscribeToDesignations((data) => {
      let gId = getActiveAgentFromDesignation(data['guardia']);
      let cId = getActiveAgentFromDesignation(data['chat']);
      let aId = getActiveAgentFromDesignation(data['alertas']);

      const eligibleGuardia = agents.filter(a => {
        const t = a.tierId?.toLowerCase();
        return t !== 'a1' && t !== 's1';
      });
      
      const eligibleChatAlerts = agents.filter(a => {
        const t = a.tierId?.toLowerCase();
        return t !== 'a1' && t !== 's1' && t !== 'l2' && t !== 's2';
      });

      if (!gId && eligibleGuardia.length > 0) gId = eligibleGuardia[0]?.id || '';
      if (!cId && eligibleChatAlerts.length > 0) cId = eligibleChatAlerts.find(a => a.id !== gId)?.id || eligibleChatAlerts[0]?.id || '';
      if (!aId && eligibleChatAlerts.length > 0) aId = eligibleChatAlerts.find(a => a.id !== gId && a.id !== cId)?.id || eligibleChatAlerts[0]?.id || '';

      const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

      setSpecialDuties({
        guardiaId: gId,
        chatId: cId,
        alertasId: aId,
        assignedDate: todayStr
      });
      setHasLoadedDesignaciones(true);
    });
    return () => unsubscribe();
  }, [agents]);


  useEffect(() => {
    safeLocalStorageSet('tm_ops_absences', JSON.stringify(absences));
  }, [absences]);

  useEffect(() => {
    safeLocalStorageSet('tm_ops_absence_requests', JSON.stringify(absenceRequests));
  }, [absenceRequests]);

  useEffect(() => {
    safeLocalStorageSet('tm_ops_internal_tasks', JSON.stringify(internalTasks));
  }, [internalTasks]);

  useEffect(() => {
    const loadCalendarEventsAndReminders = async () => {
      try {
        const events = await fetchCalendarEvents();
        if (events && events.length > 0) {
          setCalendarEvents(events);
        }
        
        const reminders = await fetchAllPersonalReminders();
        if (reminders && reminders.length > 0) {
          setIsolatedEvents(reminders);
        }

        const visits = await getProgrammedVisits();
        if (visits && visits.length > 0) {
          setProgrammedVisits(visits);
        }
      } catch (err) {
        console.error("Error loading calendar data from Firestore:", err);
      }
    };
    loadCalendarEventsAndReminders();
  }, [agents]);

  // --- AUTOMATIC DESIGNATIONS ROTATION SCHEDULING ENGINE ---
  const recalculateAndScheduleRotations = (
    startGuardiaId: string,
    startChatId: string,
    startAlertasId: string,
    startDateStr: string
  ): CalendarEvent[] => {
    // Exclude A1 and S1 from all rotations
    const eligibleGuardia = agents.filter(a => {
      const t = a.tierId?.toLowerCase();
      return t !== 'a1' && t !== 's1';
    });
    
    // Exclude A1, S1, L2, S2 from Chat and Alertas
    const eligibleChatAlerts = agents.filter(a => {
      const t = a.tierId?.toLowerCase();
      return t !== 'a1' && t !== 's1' && t !== 'l2' && t !== 's2';
    });

    if (eligibleGuardia.length === 0 || eligibleChatAlerts.length === 0) {
      return [];
    }

    // Sort to have consistent rotation sequence
    eligibleGuardia.sort((a, b) => a.id.localeCompare(b.id));
    eligibleChatAlerts.sort((a, b) => a.id.localeCompare(b.id));

    let gIdx = eligibleGuardia.findIndex(a => a.id === startGuardiaId);
    if (gIdx === -1) gIdx = 0;

    let cIdx = eligibleChatAlerts.findIndex(a => a.id === startChatId);
    if (cIdx === -1) cIdx = 0;

    let aIdx = eligibleChatAlerts.findIndex(a => a.id === startAlertasId);
    if (aIdx === -1) aIdx = 0;

    const newEvents: CalendarEvent[] = [];
    const baseDate = new Date(startDateStr + 'T12:00:00');
    
    let mondaysPassed = 0;
    let weekdaysPassed = 0;

    for (let i = 0; i <= 14; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      const dStr = d.toISOString().split('T')[0];
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      
      if (i > 0 && d.getDay() === 1) {
        mondaysPassed++;
      }

      // 1. Guardia Everyday (Weekly blocks aligned to Monday)
      let chosenGIdx = (gIdx + mondaysPassed) % eligibleGuardia.length;
      let attempts = 0;
      while (attempts < eligibleGuardia.length) {
        const candidate = eligibleGuardia[chosenGIdx];
        const hasVisitOnDay = programmedVisits.some(v => {
          if (v.estado_visita === 'Cerrada') return false;
          const visitDate = (v.fecha_visita || '').split(' ')[0];
          if (visitDate !== dStr) return false;
          const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
          if (!techName) return false;
          return (candidate.name || '').toLowerCase().includes(techName) || (candidate.id || '').toLowerCase() === techName;
        });
        const isAbsent = !hasVisitOnDay && absences.some(abs => dStr >= abs.startDate && dStr <= abs.endDate && abs.agentId === candidate.id);
        if (!isAbsent) {
          break;
        }
        chosenGIdx = (chosenGIdx + 1) % eligibleGuardia.length;
        attempts++;
      }
      const guardAgent = eligibleGuardia[chosenGIdx];

      newEvents.push({
        id: `cal_auto_g_${dStr}`,
        agentId: guardAgent.id,
        type: 'guardia',
        date: dStr,
        note: 'Guardia técnica operativa rotativa de 24 horas (Programado Automático)'
      });

      // 2. Chat & Alertas Weekdays Only
      if (!isWeekend) {
        // Build active pool excluding the current guard
        const chatPool = eligibleChatAlerts.filter(a => a.id !== guardAgent.id);
        
        // Ensure start agent is found in this pool, else use 0
        let startCPoolIdx = chatPool.findIndex(a => a.id === startChatId);
        if (startCPoolIdx === -1) startCPoolIdx = 0;
        
        let chosenCPoolIdx = (startCPoolIdx + weekdaysPassed) % chatPool.length;
        let cAttempts = 0;
        while (cAttempts < chatPool.length) {
          const candidate = chatPool[chosenCPoolIdx];
          const hasVisitOnDay = programmedVisits.some(v => {
            if (v.estado_visita === 'Cerrada') return false;
            const visitDate = (v.fecha_visita || '').split(' ')[0];
            if (visitDate !== dStr) return false;
            const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
            if (!techName) return false;
            return (candidate.name || '').toLowerCase().includes(techName) || (candidate.id || '').toLowerCase() === techName;
          });
          const isAbsent = !hasVisitOnDay && absences.some(abs => dStr >= abs.startDate && dStr <= abs.endDate && abs.agentId === candidate.id);
          if (!isAbsent) break;
          chosenCPoolIdx = (chosenCPoolIdx + 1) % chatPool.length;
          cAttempts++;
        }
        const chatAgent = chatPool[chosenCPoolIdx];
        
        newEvents.push({
          id: `cal_auto_c_${dStr}`,
          agentId: chatAgent.id,
          type: 'chat',
          date: dStr,
          note: 'Responsable de canal de chat unificado (Programado Automático)'
        });

        // Build alerts pool excluding guard and chat
        const alertPool = chatPool.filter(a => a.id !== chatAgent.id);
        
        let startAPoolIdx = alertPool.findIndex(a => a.id === startAlertasId);
        if (startAPoolIdx === -1) startAPoolIdx = 0;
        
        let chosenAPoolIdx = (startAPoolIdx + weekdaysPassed) % alertPool.length;
        let aAttempts = 0;
        while (aAttempts < alertPool.length) {
          const candidate = alertPool[chosenAPoolIdx];
          const hasVisitOnDay = programmedVisits.some(v => {
            if (v.estado_visita === 'Cerrada') return false;
            const visitDate = (v.fecha_visita || '').split(' ')[0];
            if (visitDate !== dStr) return false;
            const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
            if (!techName) return false;
            return (candidate.name || '').toLowerCase().includes(techName) || (candidate.id || '').toLowerCase() === techName;
          });
          const isAbsent = !hasVisitOnDay && absences.some(abs => dStr >= abs.startDate && dStr <= abs.endDate && abs.agentId === candidate.id);
          if (!isAbsent) break;
          chosenAPoolIdx = (chosenAPoolIdx + 1) % alertPool.length;
          aAttempts++;
        }
        const alertaAgent = alertPool[chosenAPoolIdx];

        newEvents.push({
          id: `cal_auto_a_${dStr}`,
          agentId: alertaAgent.id,
          type: 'alerta',
          date: dStr,
          note: 'Responsable de consola de alarmas críticas (Programado Automático)'
        });
        
        weekdaysPassed++;
      }
    }

    return newEvents;
  };

  const handleAutoScheduleNextWeeks = async () => {
    if (!isSupervisor) {
      showToast('Acceso denegado: Se requieren permisos de supervisor', 'error');
      return;
    }

    try {
      const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const generatedEvents = recalculateAndScheduleRotations(
        specialDuties.guardiaId,
        specialDuties.chatId,
        specialDuties.alertasId,
        todayStr
      );

      if (generatedEvents && generatedEvents.length > 0) {
        const eventsToDelete = calendarEvents.filter(e => {
          const isRotationEvent = e.type === 'guardia' || e.type === 'chat' || e.type === 'alerta';
          const isFuture = e.date >= todayStr;
          return isRotationEvent && isFuture;
        });

        if (eventsToDelete.length > 0) {
          await deleteCalendarEvents(eventsToDelete.map(e => e.id));
        }

        // Filter out existing auto-scheduled future events locally
        const otherEvents = calendarEvents.filter(e => {
          const isRotationEvent = e.type === 'guardia' || e.type === 'chat' || e.type === 'alerta';
          const isFuture = e.date >= todayStr;
          return !(isRotationEvent && isFuture);
        });

        const filteredGenerated = generatedEvents.filter(ge => {
          return !otherEvents.some(oe => !oe.id.startsWith('cal_auto_') && oe.date === ge.date && oe.type === ge.type);
        });

        const updatedEvents = [...otherEvents, ...filteredGenerated];
        setCalendarEvents(updatedEvents);
        
        // Save to Firestore automatically
        await saveCalendarEvents(filteredGenerated);
        showToast('¡Calendario Operativo auto-programado para las próximas 2 semanas con éxito!', 'success');
      } else {
        showToast('Error al auto-programar: No hay suficientes agentes elegibles.', 'error');
      }
    } catch (err) {
      console.error('Error in auto-scheduling:', err);
      showToast('Ocurrió un error al auto-programar las rotaciones.', 'error');
    }
  };

  const handleSaveChangesToFirestore = async () => {
    if (!isSupervisor) {
      showToast('Acceso denegado: Se requieren permisos de supervisor', 'error');
      return;
    }

    try {
      const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      const assignerName = currentUser?.name || currentUser?.username || 'Sistema';

      const getWeekRange = () => {
        const today = new Date();
        const day = today.getDay();
        const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(today.setDate(diffToMonday));
        monday.setHours(0,0,0,0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23,59,59,999);
        
        const toYYYYMMDD = (d: Date) => {
          return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        };
        
        return {
          startDate: toYYYYMMDD(monday),
          endDate: toYYYYMMDD(sunday)
        };
      };

      const weekBounds = getWeekRange();

      // Save Guardia Designation
      const guardAgent = agents.find(a => a.id === specialDuties.guardiaId);
      if (guardAgent) {
        await updateDesignation('guardia', {
          currentAgentId: guardAgent.id,
          currentAgentName: guardAgent.name,
          history: [{
            agentId: guardAgent.id,
            agentName: guardAgent.name,
            startDate: weekBounds.startDate,
            endDate: weekBounds.endDate,
            assignedBy: assignerName,
            updatedAt: new Date().toISOString()
          }],
          updatedAt: new Date().toISOString()
        });
      }

      // Save Chat Designation
      const chatAgent = agents.find(a => a.id === specialDuties.chatId);
      if (chatAgent) {
        await updateDesignation('chat', {
          currentAgentId: chatAgent.id,
          currentAgentName: chatAgent.name,
          history: [{
            agentId: chatAgent.id,
            agentName: chatAgent.name,
            startDate: weekBounds.startDate,
            endDate: weekBounds.endDate,
            assignedBy: assignerName,
            updatedAt: new Date().toISOString()
          }],
          updatedAt: new Date().toISOString()
        });
      }

      // Save Alertas Designation
      const alertsAgent = agents.find(a => a.id === specialDuties.alertasId);
      if (alertsAgent) {
        await updateDesignation('alertas', {
          currentAgentId: alertsAgent.id,
          currentAgentName: alertsAgent.name,
          history: [{
            agentId: alertsAgent.id,
            agentName: alertsAgent.name,
            startDate: weekBounds.startDate,
            endDate: weekBounds.endDate,
            assignedBy: assignerName,
            updatedAt: new Date().toISOString()
          }],
          updatedAt: new Date().toISOString()
        });
      }

      // Save all calendar events to Firestore
      await saveCalendarEvents(calendarEvents);
      
      showToast('¡Todas las designaciones y el calendario operativo se han guardado con éxito!', 'success');
    } catch (err) {
      console.error('Error saving changes to Firestore:', err);
      showToast('Error al guardar los cambios en Firestore.', 'error');
    }
  };

  // --- AUTOMATIC UNDER-THE-HOOD GOOGLE SHEETS SYNCHRONIZATION ---
  const isSyncingDesignacionesRef = useRef(false);

  // Helper to check if a date is past today
  const isPast = (dateStr: string) => {
    if (!dateStr) return true;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const targetDate = new Date(dateStr);
    targetDate.setHours(0,0,0,0);
    return targetDate < today;
  };

  const getNextMonday = (from: Date) => {
    const next = new Date(from);
    next.setDate(from.getDate() + ((1 + 7 - from.getDay()) % 7 || 7));
    return next;
  };

  const getNextSunday = (from: Date) => {
    const next = new Date(from);
    next.setDate(from.getDate() + (7 - from.getDay()));
    return next;
  };

  const getRandomAgentByTier = (tierPrefixes: string[]) => {
    const eligible = agents.filter(a => tierPrefixes.some(prefix => a.tierId.toLowerCase().startsWith(prefix)));
    if (eligible.length === 0) return agents[0];
    return eligible[Math.floor(Math.random() * eligible.length)];
  };

  
  // -- Fetch Jornada --

  useEffect(() => {
    if (!agents || agents.length === 0) return;
    
    const unsubscribe = subscribeToAsistencia(agents, (rows) => {
      if (rows && rows.length > 0) {
        setAsistencia(prev => {
          const next = [...prev];
          rows.forEach(row => {
            const localIdx = next.findIndex(r => r.id === row.id);
            if (localIdx >= 0) {
              // If the local item has a truthy `ultimaActualizacion`, it has unsaved local edits.
              // Preserve those edits instead of overwriting them with old Firestore data.
              if (!next[localIdx].ultimaActualizacion) {
                next[localIdx] = row;
              }
            } else {
              next.push(row);
            }
          });
          return next;
        });
        // Sync with dutyStates
        setDutyStates(prev => prev.map(s => {
          const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
          const row = rows.find((r: any) => r.idAgente === s.agentId && r.fecha === todayStr);
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
      setHasLoadedAsistencia(true);
    });
    
    return () => {
      unsubscribe();
    };
  }, [agents]);

  useEffect(() => {
    const unsubscribe = subscribeToJornadas((rows) => {
      if (rows && rows.length > 0) {
         setDutyStates(prev => {
           const updated = [...prev];
           rows.forEach(r => {
             const agentIndex = updated.findIndex(u => u.agentId === r.idAgente);
             if (agentIndex !== -1) {
                const schedule: { [day: string]: any } = {};
                const days = [
                  { name: 'Lunes', val: r.lunes },
                  { name: 'Martes', val: r.martes },
                  { name: 'Miércoles', val: r.miercoles },
                  { name: 'Jueves', val: r.jueves },
                  { name: 'Viernes', val: r.viernes },
                  { name: 'Sábado', val: r.sabado },
                  { name: 'Domingo', val: r.domingo },
                ];
                days.forEach(d => {
                   const val = d.val || 'Libre';
                   const isLibre = val.toLowerCase().includes('libre');
                   let start = '08:00';
                   let end = '17:00';
                   if (!isLibre && val.includes('-')) {
                      const parts = val.split('-');
                      start = parts[0].trim();
                      end = parts[1].trim();
                   }
                   const isRemote = (r.diaRemoto || '').includes(d.name);
                   schedule[d.name] = {
                     start,
                     end,
                     isActive: !isLibre,
                     isRemote
                   };
                });
                
                // Construct summary
                const activeDays = Object.entries(schedule).filter(([_, d]) => d.isActive);
                let summary = '';
                if (activeDays.length > 0) {
                  // Group by hours
                  const groups: Record<string, string[]> = {};
                  activeDays.forEach(([name, d]) => {
                    const timeStr = `${d.start}-${d.end}`;
                    if (!groups[timeStr]) groups[timeStr] = [];
                    groups[timeStr].push(name.substring(0, 3));
                  });
                  
                  const timeParts = Object.entries(groups).map(([timeStr, days]) => {
                    if (days.length === activeDays.length && activeDays.length >= 5) {
                      return `Lun-Vie: ${timeStr}`;
                    }
                    return `${days.join(',')}: ${timeStr}`;
                  });
                  
                  const remotes = activeDays.filter(([_, d]) => d.isRemote).map(([name]) => name.substring(0,3));
                  let remoteStr = '';
                  if (remotes.length === activeDays.length) {
                    remoteStr = '(100% Remoto)';
                  } else if (remotes.length > 0) {
                    remoteStr = `(Remoto: ${remotes.join(', ')})`;
                  } else {
                    remoteStr = '(Presencial)';
                  }
                  
                  summary = `${timeParts.join(' | ')} ${remoteStr}`;
                } else {
                  summary = 'Sin horario asignado';
                }

                updated[agentIndex] = {
                   ...updated[agentIndex],
                   weeklySchedule: schedule as any,
                   workSchedule: summary
                };
             }
           });
           return updated;
         });
      }
      setHasLoadedJornada(true);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  const isSyncingJornadaRef = useRef(false);
  useEffect(() => {
    // Auto-sync removed to prevent Firestore limit exhaustion.
    // Jornadas will only be saved when explicitly modified by handleSaveWeeklySchedule.
  }, []);


  // 3. Fetch absences and requests on mount and when googleToken/spreadsheetId changes
  const isDirtyAusenciasRef = useRef(false);
  const isSyncingAusenciasRef = useRef(false);

  useEffect(() => {
    const unsubscribe = subscribeToAusencias((rows) => {
      // Do not fetch/overwrite if we have local unsaved modifications or are currently writing
      if (isDirtyAusenciasRef.current || isSyncingAusenciasRef.current) return;

      if (rows) {
        const loadedRequests: AbsenceRequest[] = rows.map(r => ({
          id: r.idSolicitud,
          agentId: r.idAgente,
          type: r.tipo as any,
          startDate: r.fechaInicio,
          endDate: r.fechaFin,
          reason: r.motivo,
          status: r.estado as any,
          requestedAt: r.fechaSolicitud || new Date().toISOString().split('T')[0],
          reviewedBy: r.revisadoPor,
          reviewedAt: r.fechaRevision,
          solicitadoPor: r.solicitadoPor,
          notas: r.notas,
          duracionTipo: r.duracionTipo || 'Día Completo',
          horaInicio: r.horaInicio || '',
          horaFin: r.horaFin || ''
        }));

        const loadedRecords: AbsenceRecord[] = rows
          .filter(r => r.estado.trim().toLowerCase() === 'aprobado')
          .map(r => ({
            id: `abs_${r.idSolicitud}`,
            agentId: r.idAgente,
            type: r.tipo as any,
            startDate: r.fechaInicio,
            endDate: r.fechaFin,
            reason: r.motivo,
            approvedBy: r.revisadoPor || 'Administrador',
            duracionTipo: r.duracionTipo || 'Día Completo',
            horaInicio: r.horaInicio || '',
            horaFin: r.horaFin || ''
          }));

        setAbsenceRequests(loadedRequests);
        setAbsences(loadedRecords);

        // Update calendar events with loaded approved absences
        setCalendarEvents(prev => {
          const otherEvents = prev.filter(e => e.type !== 'ausencia');
          const absEvents = loadedRecords.map(rec => ({
            id: `cal_abs_abs_${rec.id.replace('abs_', '')}`,
            agentId: rec.agentId,
            type: 'ausencia' as const,
            date: rec.startDate,
            note: `${rec.type}: ${rec.reason}`
          }));
          return [...otherEvents, ...absEvents];
        });
      }
      setHasLoadedAusencias(true);
    });

    return () => {
      unsubscribe();
    };
  }, [agents]);

  // Synchronize absenceRequests to Firestore "ausencias" (debounced)
  useEffect(() => {
    if (!hasLoadedAusencias) return;
    // Only push if there are unsaved local modifications (marked as dirty)
    if (!isDirtyAusenciasRef.current) return;
    
    const syncToSheets = async () => {
      if (isSyncingAusenciasRef.current) return;
      isSyncingAusenciasRef.current = true;
      try {
        const rowsToPush: AusenciaRow[] = absenceRequests.map(r => {
          const agentName = agents.find(a => a.id === r.agentId)?.name || 'Técnico';
          return {
            idSolicitud: r.id,
            idAgente: r.agentId,
            nombreAgente: agentName,
            tipo: r.type,
            fechaInicio: r.startDate,
            fechaFin: r.endDate,
            motivo: r.reason,
            estado: r.status,
            fechaSolicitud: r.requestedAt,
            solicitadoPor: r.solicitadoPor || currentUser?.name || currentUser?.username || 'Sistema',
            revisadoPor: r.reviewedBy || '',
            fechaRevision: r.reviewedAt || '',
            notas: r.notas || '',
            duracionTipo: r.duracionTipo || 'Día Completo',
            horaInicio: r.horaInicio || '',
            horaFin: r.horaFin || ''
          };
        });

        await saveAusencias(rowsToPush);
        console.log("Ausencias and Vacaciones synced to Firestore successfully");
        isDirtyAusenciasRef.current = false; // Sync finished, clear dirty flag!
      } catch (err) {
        console.error("Error syncing Ausencias to Firestore:", err);
      } finally {
        isSyncingAusenciasRef.current = false;
      }
    };

    const timer = setTimeout(() => {
      syncToSheets();
    }, 2000); // 2 seconds debounce

    return () => clearTimeout(timer);
  }, [absenceRequests, hasLoadedAusencias, agents, currentUser]);

   
  // --- TOAST NOTIFICATIONS ---
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // --- ACTIONS HANDLERS ---
  const syncAsistenciaChange = (agentId: string, updates: Partial<AsistenciaRow>) => {
    const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return;
    
    setAsistencia(prev => {
       const next = [...prev];
       const existingIdx = next.findIndex(a => a.idAgente === agentId && a.fecha === todayStr);
       let rowToSave: AsistenciaRow;
       if (existingIdx >= 0) {
           next[existingIdx] = { ...next[existingIdx], ...updates, ultimaActualizacion: new Date().toISOString() };
           rowToSave = next[existingIdx];
       } else {
           rowToSave = {
              id: `${todayStr}_${agentId}`,
              fecha: todayStr,
              idAgente: agentId,
              nombreAgente: agent.name,
              checkIn: '',
              checkOut: '',
              estado: 'Ausente',
              ultimaActualizacion: new Date().toISOString(),
              ...updates
           };
           next.push(rowToSave);
       }
       
       pushAsistencia([rowToSave]).catch(err => {
               console.error("Error auto-syncing Asistencia", err);
           });
       return next;
    });
  };
  
  // 1. Availability / Checks
  const handleCheckIn = (agentId: string) => {
    syncAsistenciaChange(agentId, { checkIn: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), estado: 'Presente' });
    const nowStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    setDutyStates(prev => prev.map(s => {
      if (s.agentId === agentId) {
        return {
          ...s,
          checkInTime: nowStr,
          status: 'Disponible'
        };
      }
      return s;
    }));
    const agent = agents.find(a => a.id === agentId);
    if (agent && onUpdateAgent) {
      onUpdateAgent({ ...agent, status: 'Disponible' });
    }
    showToast(`Check-In registrado para el técnico a las ${nowStr}`, 'success');
  };

  const handleCheckOut = (agentId: string) => {
    syncAsistenciaChange(agentId, { checkOut: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) });
    const nowStr = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    setDutyStates(prev => prev.map(s => {
      if (s.agentId === agentId) {
        return {
          ...s,
          checkOutTime: nowStr,
          status: 'Finalizó su jornada'
        };
      }
      return s;
    }));
    const agent = agents.find(a => a.id === agentId);
    if (agent && onUpdateAgent) {
      onUpdateAgent({ ...agent, status: 'Finalizó su jornada' });
    }
    showToast(`Check-Out registrado correctamente a las ${nowStr}`, 'success');
  };

  const handleUpdateStatus = (agentId: string, status: AgentDutyState['status']) => {
    setDutyStates(prev => prev.map(s => {
      if (s.agentId === agentId) {
        return { ...s, status };
      }
      return s;
    }));
    const agent = agents.find(a => a.id === agentId);
    if (agent && onUpdateAgent) {
      onUpdateAgent({ ...agent, status });
    }
    
    // Find agent name
    const agName = agents.find(a => a.id === agentId)?.name || 'Técnico';
    showToast(`Estado de ${agName} actualizado a: ${status}`, 'info');
  };

  const handleUpdateSchedule = (agentId: string, schedule: string) => {
    setDutyStates(prev => prev.map(s => {
      if (s.agentId === agentId) {
        return { ...s, workSchedule: schedule };
      }
      return s;
    }));
  };

  
  
  const handleUpdateMyStatus = (newStatus: AgentDutyState['status']) => {
    if (!loggedInAgent) return;
    setDutyStates(prev => prev.map(s => {
      if (s.agentId === loggedInAgent.id) {
        return { ...s, status: newStatus };
      }
      return s;
    }));
    if (onUpdateAgent) {
      onUpdateAgent({ ...loggedInAgent, status: newStatus });
    }
  };

  const handleSaveWeeklySchedule = (agentId: string, schedule: { [day: string]: DailySchedule }) => {
    let summary = 'Lunes a Sábado';
    const activeDays = Object.entries(schedule).filter(([_, d]) => d.isActive);
    if (activeDays.length > 0) {
      const first = activeDays[0][1];
      const allSameHours = activeDays.every(([_, d]) => d.start === first.start && d.end === first.end);
      const allSameRemote = activeDays.every(([_, d]) => d.isRemote === first.isRemote);
      if (allSameHours && allSameRemote) {
        const dayNames = activeDays.map(([name]) => name.substring(0, 3)).join('-');
        summary = `${dayNames}: ${first.start}-${first.end} (${first.isRemote ? 'Remoto' : 'Presencial'})`;
      } else if (allSameHours) {
        const remotes = activeDays.filter(([_, d]) => d.isRemote).map(([name]) => name.substring(0,3));
        if (remotes.length === 0) {
          summary = `Lun-Sáb: ${first.start}-${first.end} (Presencial)`;
        } else {
          summary = `Lun-Sáb: ${first.start}-${first.end} (${remotes.join(',')} Remoto)`;
        }
      } else {
        const remotesCount = activeDays.filter(([_, d]) => d.isRemote).length;
        summary = `Horario Var. (${remotesCount} d. Remoto)`;
      }
    } else {
      summary = 'Sin horario asignado';
    }

    setDutyStates(prev => prev.map(s => {
      if (s.agentId === agentId) {
        return {
          ...s,
          weeklySchedule: schedule,
          workSchedule: summary
        };
      }
      return s;
    }));

    // Explicitly sync this agent's schedule to Google Sheets / Firestore
    const getDayStr = (day: string) => {
      const d = schedule[day];
      if (!d || !d.isActive) return 'Libre';
      return `${d.start} - ${d.end}`;
    };
    const remotes = Object.keys(schedule).filter(k => schedule[k].isActive && schedule[k].isRemote);
    const diaRemoto = remotes.join(', ') || 'Ninguno';
    const ag = agents.find(a => a.id === agentId);
    
    const rowToPush = {
      idAgente: agentId,
      nombreAgente: ag?.name || '',
      lunes: getDayStr('Lunes'),
      martes: getDayStr('Martes'),
      miercoles: getDayStr('Miércoles'),
      jueves: getDayStr('Jueves'),
      viernes: getDayStr('Viernes'),
      sabado: getDayStr('Sábado'),
      domingo: getDayStr('Domingo'),
      diaRemoto: diaRemoto,
      turnoAsignado: summary,
      ultimaActualizacion: new Date().toISOString()
    };
    
    saveJornadas([rowToPush]).catch(console.error);

    const agName = ag?.name || 'Técnico';
    showToast(`Horario semanal de ${agName} actualizado correctamente`, 'success');
  };

  // 2. Cobertura Rotations
  const handleAssignSpecialDuty = async (type: 'guardia' | 'chat' | 'alerta', agentId: string) => {
    if (!isSupervisor) {
      showToast('Acceso denegado: Se requieren permisos de supervisor', 'error');
      return;
    }

    const agent = agents.find(a => a.id === agentId);
    const tier = agent?.tierId?.toLowerCase();

    // Exclusion rule: A1 and S1 are excluded from all rotation processes
    if (tier === 'a1' || tier === 's1') {
      showToast('Conflicto Operativo: Los tiers A1 y S1 están excluidos por completo de las designaciones.', 'error');
      return;
    }

    // Priority rule: Guardia cannot be assigned Chat or Alerta at the same time
    if (type === 'chat' || type === 'alerta') {
      if (agentId === specialDuties.guardiaId) {
        showToast('Conflicto Operativo: El técnico designado para Guardia tiene prioridad operativa y está exento de Chat/Alertas.', 'error');
        return;
      }
    }

    const getWeekRange = () => {
      const today = new Date();
      const day = today.getDay();
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diffToMonday));
      monday.setHours(0,0,0,0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      
      const toYYYYMMDD = (d: Date) => {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      };
      
      return {
        startDate: toYYYYMMDD(monday),
        endDate: toYYYYMMDD(sunday)
      };
    };

    const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const agName = agent?.name || 'Técnico';
    const assignerName = currentUser?.name || currentUser?.username || 'Sistema';
    
    const fType = type === 'alerta' ? 'alertas' : type;

    // Helper to get available agents excluding restricted tiers
    const getAvailableAgent = (excludeId: string, currentId: string) => {
      if (currentId !== excludeId && currentId !== '') return currentId;
      const candidates = agents.filter(a => {
        const t = a.tierId?.toLowerCase();
        return a.id !== excludeId && t !== 'a1' && t !== 's1';
      });
      return candidates.length > 0 ? candidates[0].id : agents[0].id;
    };

    try {
      const weekBounds = getWeekRange();

      // 1. Update the requested designation
      const newHistoryLog = {
        agentId,
        agentName: agName,
        startDate: weekBounds.startDate,
        endDate: weekBounds.endDate,
        assignedBy: assignerName,
        updatedAt: new Date().toISOString()
      };

      await updateDesignation(fType, {
        currentAgentId: agentId,
        currentAgentName: agName,
        history: [newHistoryLog], // Simplified history for now, just the latest
        updatedAt: new Date().toISOString()
      });
      
      // Add to calendar events
      const newCalEvent = {
        id: `cal_dynamic_${Date.now()}`,
        agentId,
        type,
        date: todayStr,
        note: `Asignación especial manual de ${type.toUpperCase()}`
      };
      
      const oldEventsForToday = calendarEvents.filter(e => e.date === todayStr && e.type === type);
      if (oldEventsForToday.length > 0) {
        deleteCalendarEvents(oldEventsForToday.map(e => e.id)).catch(err => console.error("Error deleting old manual event:", err));
      }

      setCalendarEvents(prev => [newCalEvent, ...prev.filter(e => !(e.date === todayStr && e.type === type))]);
      saveCalendarEvent(newCalEvent).catch(err => console.error("Error saving manual calendar event:", err));

      // 2. If changing guardia, recalculate others to ensure no conflicts
      if (type === 'guardia') {
         let newChatId = specialDuties.chatId;
         let newAlertasId = specialDuties.alertasId;
         let changed = false;

         if (newChatId === agentId) {
            newChatId = getAvailableAgent(agentId, newChatId);
            const chatName = agents.find(a => a.id === newChatId)?.name || 'Técnico';
            await updateDesignation('chat', {
              currentAgentId: newChatId,
              currentAgentName: chatName,
              history: [{
                agentId: newChatId,
                agentName: chatName,
                startDate: weekBounds.startDate,
                endDate: weekBounds.endDate,
                assignedBy: 'Sistema (Auto-recorrido)',
                updatedAt: new Date().toISOString()
              }],
              updatedAt: new Date().toISOString()
            });
            changed = true;
         }

         if (newAlertasId === agentId) {
            newAlertasId = getAvailableAgent(agentId, newChatId !== agentId ? newChatId : ''); // Avoid assigning both to same if possible
            const alertName = agents.find(a => a.id === newAlertasId)?.name || 'Técnico';
            await updateDesignation('alertas', {
              currentAgentId: newAlertasId,
              currentAgentName: alertName,
              history: [{
                agentId: newAlertasId,
                agentName: alertName,
                startDate: weekBounds.startDate,
                endDate: weekBounds.endDate,
                assignedBy: 'Sistema (Auto-recorrido)',
                updatedAt: new Date().toISOString()
              }],
              updatedAt: new Date().toISOString()
            });
            changed = true;
         }

         if (changed) {
            showToast(`¡Guardia Asignada! Chat y Alertas fueron reasignados para evitar conflictos con el nuevo Guardia.`, 'success');
         } else {
            showToast(`¡Asignado! ${agName} es ahora Responsable de ${type.toUpperCase()}`, 'success');
         }
      } else {
        showToast(`¡Asignado! ${agName} es ahora Responsable de ${type.toUpperCase()}`, 'success');
      }

      // Recalculate rotations for the next 2 weeks automatically and update calendarEvents
      const updatedGId = type === 'guardia' ? agentId : specialDuties.guardiaId;
      const updatedCId = type === 'chat' ? agentId : specialDuties.chatId;
      const updatedAId = type === 'alerta' ? agentId : specialDuties.alertasId;
      
      const generatedEvents = recalculateAndScheduleRotations(
        updatedGId,
        updatedCId,
        updatedAId,
        todayStr
      );

      if (generatedEvents && generatedEvents.length > 0) {
        // Delete old future events from Firestore first to avoid duplicates
        const eventsToDelete = calendarEvents.filter(e => {
          const isAutoEvent = e.id.startsWith('cal_auto_');
          const isFuture = e.date >= todayStr;
          return isAutoEvent && isFuture;
        });
        if (eventsToDelete.length > 0) {
          deleteCalendarEvents(eventsToDelete.map(e => e.id)).catch(err => console.error("Error deleting old auto events:", err));
        }

        setCalendarEvents(prev => {
          const otherEvents = prev.filter(e => {
            const isAutoEvent = e.id.startsWith('cal_auto_');
            const isFuture = e.date >= todayStr;
            return !(isAutoEvent && isFuture);
          });
          
          const filteredGenerated = generatedEvents.filter(ge => {
            return !otherEvents.some(oe => !oe.id.startsWith('cal_auto_') && oe.date === ge.date && oe.type === ge.type);
          });

          const combined = [...otherEvents, ...filteredGenerated];
          saveCalendarEvents(filteredGenerated).catch(err => console.error("Error saving automatic rotations:", err));
          return combined;
        });
      }

    } catch (e) {
      showToast('Error al actualizar designación', 'error');
      console.error(e);
    }
  };

  // 3. Absences
  const [newAbsence, setNewAbsence] = useState({
    agentId: '',
    type: 'Vacaciones' as AbsenceRecord['type'],
    startDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    reason: '',
    duracionTipo: 'Día Completo' as 'Día Completo' | 'Medio Día (Mañana)' | 'Medio Día (Tarde)' | 'Horario Específico',
    horaInicio: '',
    horaFin: ''
  });
  const [autoApproveAbsence, setAutoApproveAbsence] = useState(isSupervisor);

  // Keep agentId synced based on user role (Supervisor vs User)
  useEffect(() => {
    if (!isSupervisor) {
      if (currentAgentId && newAbsence.agentId !== currentAgentId) {
        setNewAbsence(prev => ({ ...prev, agentId: currentAgentId }));
      }
    } else {
      if (!newAbsence.agentId && agents.length > 0) {
        setNewAbsence(prev => ({ ...prev, agentId: agents[0].id }));
      }
    }
  }, [currentAgentId, isSupervisor, agents, newAbsence.agentId]);

  const handleAddAbsenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAbsence.reason.trim()) {
      showToast('Por favor, ingresa el motivo de la ausencia.', 'error');
      return;
    }

    const targetAgentId = isSupervisor ? newAbsence.agentId : currentAgentId;
    if (!targetAgentId) {
      showToast('No se ha podido identificar tu colaborador en el sistema.', 'error');
      return;
    }

    isDirtyAusenciasRef.current = true; // Mark as dirty!

    const reqId = `req_${Date.now()}`;
    const newReq: AbsenceRequest = {
      id: reqId,
      agentId: targetAgentId,
      type: newAbsence.type,
      startDate: newAbsence.startDate,
      endDate: newAbsence.endDate,
      reason: newAbsence.reason,
      status: (isSupervisor && autoApproveAbsence) ? 'Aprobado' : 'Pendiente',
      requestedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      reviewedBy: (isSupervisor && autoApproveAbsence) ? (currentUser?.name || 'Administrador') : undefined,
      reviewedAt: (isSupervisor && autoApproveAbsence) ? new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0] : undefined,
      solicitadoPor: currentUser?.name || currentUser?.username || 'Sistema',
      duracionTipo: newAbsence.duracionTipo,
      horaInicio: newAbsence.horaInicio,
      horaFin: newAbsence.horaFin
    };

    setAbsenceRequests(prev => [newReq, ...prev]);

    if (isSupervisor && autoApproveAbsence) {
      const rec: AbsenceRecord = {
        id: `abs_${newReq.id}`,
        agentId: newReq.agentId,
        type: newReq.type,
        startDate: newReq.startDate,
        endDate: newReq.endDate,
        reason: newReq.reason,
        approvedBy: currentUser?.name || 'Administrador',
        duracionTipo: newReq.duracionTipo,
        horaInicio: newReq.horaInicio,
        horaFin: newReq.horaFin
      };

      setAbsences(prev => [rec, ...prev]);

      // Update duty status if the absence spans today
      const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      if (todayStr >= newAbsence.startDate && todayStr <= newAbsence.endDate) {
        setDutyStates(prev => prev.map(s => {
          if (s.agentId === targetAgentId) {
            return { ...s, status: 'Fuera de oficina' };
          }
          return s;
        }));
      }

      // Add calendar event
      const newCalAbsEvent: CalendarEvent = {
        id: `cal_abs_abs_${newReq.id}`,
        agentId: rec.agentId,
        type: 'ausencia',
        date: rec.startDate,
        note: `${rec.type}: ${rec.reason}`
      };
      setCalendarEvents(prev => [...prev, newCalAbsEvent]);
      saveCalendarEvent(newCalAbsEvent).catch(err => console.error(err));

      const agName = agents.find(a => a.id === rec.agentId)?.name || 'Técnico';
      showToast(`Ausencia registrada y aprobada para ${agName}`, 'success');
    } else {
      const agName = agents.find(a => a.id === newReq.agentId)?.name || 'Técnico';
      showToast(`Solicitud de ausencia para ${agName} enviada a revisión`, 'info');
    }

    setNewAbsence({
      agentId: isSupervisor ? (agents[0]?.id || '') : currentAgentId,
      type: 'Vacaciones',
      startDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      reason: '',
      duracionTipo: 'Día Completo',
      horaInicio: '',
      horaFin: ''
    });
  };

  const approveRequest = (reqId: string) => {
    if (!isSupervisor) {
      showToast('No tienes permisos de supervisor para aprobar solicitudes.', 'error');
      return;
    }

    isDirtyAusenciasRef.current = true; // Mark as dirty!

    setAbsenceRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: 'Aprobado',
          reviewedBy: currentUser?.name || 'Administrador',
          reviewedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
        };
      }
      return r;
    }));

    const req = absenceRequests.find(r => r.id === reqId);
    if (req) {
      const rec: AbsenceRecord = {
        id: `abs_${req.id}`,
        agentId: req.agentId,
        type: req.type,
        startDate: req.startDate,
        endDate: req.endDate,
        reason: req.reason,
        approvedBy: currentUser?.name || 'Administrador',
        duracionTipo: req.duracionTipo || 'Día Completo',
        horaInicio: req.horaInicio || '',
        horaFin: req.horaFin || ''
      };

      setAbsences(prev => {
        if (prev.some(a => a.id === rec.id)) return prev;
        return [rec, ...prev];
      });

      const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
      if (todayStr >= req.startDate && todayStr <= req.endDate) {
        setDutyStates(prev => prev.map(s => {
          if (s.agentId === req.agentId) {
            return { ...s, status: 'Fuera de oficina' };
          }
          return s;
        }));
      }

      const newCalAbsEvent: CalendarEvent = {
        id: `cal_abs_abs_${req.id}`,
        agentId: rec.agentId,
        type: 'ausencia',
        date: rec.startDate,
        note: `${rec.type}: ${rec.reason}`
      };
      setCalendarEvents(prev => [...prev, newCalAbsEvent]);
      saveCalendarEvent(newCalAbsEvent).catch(err => console.error(err));

      const agName = agents.find(a => a.id === req.agentId)?.name || 'Técnico';
      showToast(`Solicitud de ${agName} aprobada correctamente`, 'success');
    }
  };

  const rejectRequest = (reqId: string) => {
    if (!isSupervisor) {
      showToast('No tienes permisos de supervisor para rechazar solicitudes.', 'error');
      return;
    }
    setRejectingRequestId(reqId);
    setRejectionNote('');
  };

  const confirmRejectRequest = () => {
    if (!rejectingRequestId) return;
    const reqId = rejectingRequestId;

    isDirtyAusenciasRef.current = true; // Mark as dirty!

    setAbsenceRequests(prev => prev.map(r => {
      if (r.id === reqId) {
        return {
          ...r,
          status: 'Rechazado',
          reviewedBy: currentUser?.name || 'Administrador',
          reviewedAt: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
          notas: rejectionNote.trim() || 'Rechazado sin comentarios'
        };
      }
      return r;
    }));

    setAbsences(prev => prev.filter(a => a.id !== `abs_${reqId}`));
    deleteAusencia(reqId).catch(err => console.error("Error deleting rejected ausencia:", err));
    setCalendarEvents(prev => prev.filter(e => e.id !== `cal_abs_abs_${reqId}`));
    deleteCalendarEvent(`cal_abs_abs_${reqId}`).catch(err => console.error("Error deleting abs calendar event:", err));

    const req = absenceRequests.find(r => r.id === reqId);
    const agName = req ? (agents.find(a => a.id === req.agentId)?.name || 'Técnico') : 'Técnico';
    showToast(`Solicitud de ${agName} rechazada con comentario`, 'info');

    setRejectingRequestId(null);
    setRejectionNote('');
  };

  const handleDeleteAbsence = (id: string) => {
    if (!isSupervisor) {
      showToast('No tienes permisos de supervisor para borrar ausencias.', 'error');
      return;
    }

    isDirtyAusenciasRef.current = true; // Mark as dirty!

    setAbsences(prev => prev.filter(a => a.id !== id));
    deleteAusencia(id.replace('abs_', '')).catch(err => console.error("Error deleting ausencia:", err));
    setCalendarEvents(prev => prev.filter(e => e.id !== `cal_abs_${id}` && e.id !== `cal_abs_abs_${id.replace('abs_', '')}`));
    deleteCalendarEvents([`cal_abs_${id}`, `cal_abs_abs_${id.replace('abs_', '')}`]).catch(err => console.error("Error deleting abs calendar events:", err));
    
    // Also mark request as rejected/removed if it existed
    const possibleReqId = id.replace('abs_', '');
    setAbsenceRequests(prev => prev.map(r => {
      if (r.id === possibleReqId) {
        return { ...r, status: 'Rechazado' };
      }
      return r;
    }));

    showToast('Registro de ausencia eliminado.', 'info');
  };

  // 4. Internal Tasks & Contractor Tasks Management
  const [activeTaskType, setActiveTaskType] = useState<'internas' | 'contratistas'>('internas');
  const [taskViewFilter, setTaskViewFilter] = useState<'general' | 'mine'>('general');
  const [taskSearchQuery, setTaskSearchQuery] = useState('');
  const [isInternalTaskDrawerOpen, setIsInternalTaskDrawerOpen] = useState(false);
  const [isContractorTaskDrawerOpen, setIsContractorTaskDrawerOpen] = useState(false);

  const [newInternalTask, setNewInternalTask] = useState({
    title: '',
    assignedToId: '',
    type: 'Interna' as 'Interna' | 'Programada' | 'Recurrente',
    frequency: 'Mensual' as 'Única' | 'Diario' | 'Semanal' | 'Mensual' | 'Anual',
    scheduledDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    ticketId: '',
    notes: '',
    recurrenceDayOfWeek: 'Viernes',
    recurrenceDayOfMonth: 5,
    recurrenceMonthOfYear: 7,
    hasNoDate: false,
    hasEndDate: false,
    recurrenceEndDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  });

  const [newContractorTask, setNewContractorTask] = useState({
    title: '',
    contractorName: '',
    supervisorAgentId: '',
    ticketId: '',
    startDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
    notes: ''
  });

  // Sync default assignments based on logged-in user
  useEffect(() => {
    if (!isSupervisor) {
      if (currentAgentId) {
        setNewInternalTask(prev => ({ ...prev, assignedToId: currentAgentId }));
        setNewContractorTask(prev => ({ ...prev, supervisorAgentId: currentAgentId }));
      }
    } else {
      if (agents.length > 0) {
        setNewInternalTask(prev => ({ ...prev, assignedToId: prev.assignedToId || agents[0].id }));
        setNewContractorTask(prev => ({ ...prev, supervisorAgentId: prev.supervisorAgentId || agents[0].id }));
      }
    }
  }, [currentAgentId, isSupervisor, agents]);

  // Modals / inline update states
  const [completingInternalTaskId, setCompletingInternalTaskId] = useState<string | null>(null);
  const [internalTaskReport, setInternalTaskReport] = useState('');

  const [followingUpContractorId, setFollowingUpContractorId] = useState<string | null>(null);
  const [contractorFollowUpText, setContractorFollowUpText] = useState('');
  const [contractorStatusSelect, setContractorStatusSelect] = useState<ContractorTask['status']>('Asignado a Contratista');

  // HANDLERS FOR INTERNAL TASKS
  const handleCreateInternalTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInternalTask.title.trim()) {
      showToast('Por favor, ingresa el título de la tarea.', 'error');
      return;
    }

    const ticketId = newInternalTask.ticketId.trim()
      ? newInternalTask.ticketId.trim().toUpperCase()
      : `CRM-${Math.floor(1000 + Math.random() * 9000)}`;

    const assignedId = isSupervisor ? newInternalTask.assignedToId : currentAgentId;
    if (!assignedId) {
      showToast('No se puede asignar la tarea: técnico no identificado.', 'error');
      return;
    }

    const newTask: InternalTask = {
      id: `int_${Date.now()}`,
      title: newInternalTask.title.trim(),
      assignedToId: assignedId,
      type: newInternalTask.type,
      frequency: newInternalTask.type === 'Recurrente' ? newInternalTask.frequency : undefined,
      scheduledDate: newInternalTask.type === 'Recurrente'
        ? ''
        : (newInternalTask.type === 'Interna' && newInternalTask.hasNoDate ? '' : newInternalTask.scheduledDate),
      ticketId: ticketId,
      status: 'Pendiente',
      notes: newInternalTask.notes.trim(),
      recurrenceDayOfWeek: newInternalTask.type === 'Recurrente' ? newInternalTask.recurrenceDayOfWeek : undefined,
      recurrenceDayOfMonth: newInternalTask.type === 'Recurrente' ? newInternalTask.recurrenceDayOfMonth : undefined,
      recurrenceMonthOfYear: newInternalTask.type === 'Recurrente' ? newInternalTask.recurrenceMonthOfYear : undefined,
      hasNoDate: newInternalTask.type === 'Interna' ? newInternalTask.hasNoDate : undefined,
      hasEndDate: newInternalTask.type === 'Recurrente' ? newInternalTask.hasEndDate : undefined,
      recurrenceEndDate: (newInternalTask.type === 'Recurrente' && newInternalTask.hasEndDate) ? newInternalTask.recurrenceEndDate : undefined,
    };

    setInternalTasks(prev => [newTask, ...prev]);
    saveSingleInternalTask(newTask);
    showToast(`Tarea interna "${newTask.title}" programada correctamente`, 'success');
    setIsInternalTaskDrawerOpen(false);

    // Reset Form
    setNewInternalTask({
      title: '',
      assignedToId: isSupervisor ? (agents[0]?.id || '') : currentAgentId,
      type: 'Interna',
      frequency: 'Mensual',
      scheduledDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      ticketId: '',
      notes: '',
      recurrenceDayOfWeek: 'Viernes',
      recurrenceDayOfMonth: 5,
      recurrenceMonthOfYear: 7,
      hasNoDate: false,
      hasEndDate: false,
      recurrenceEndDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
    });
  };

  const handleUpdateInternalTaskStatus = (id: string, newStatus: InternalTask['status']) => {
    let targetTask: InternalTask | null = null;
    setInternalTasks(prev => prev.map(t => {
      if (t.id === id) {
        targetTask = { ...t, status: newStatus };
        return targetTask;
      }
      return t;
    }));
    if (targetTask) {
      saveSingleInternalTask(targetTask);
    }
    showToast(`Estado de la tarea actualizado a: ${newStatus}`, 'info');
  };

  const handleOpenCompleteInternalTask = (id: string) => {
    setCompletingInternalTaskId(id);
    setInternalTaskReport('');
  };

  const handleSaveInternalTaskCompletion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingInternalTaskId) return;

    const nowIso = new Date().toISOString();
    let targetTask: InternalTask | null = null;
    setInternalTasks(prev => prev.map(t => {
      if (t.id === completingInternalTaskId) {
        targetTask = {
          ...t,
          status: 'Completado',
          completionReport: internalTaskReport.trim() || 'Completado con éxito',
          completedDate: nowIso,
          CompletedDate: nowIso
        };
        return targetTask;
      }
      return t;
    }));

    if (targetTask) {
      saveSingleInternalTask(targetTask);
    }

    setCompletingInternalTaskId(null);
    setInternalTaskReport('');
    showToast('La tarea interna ha sido completada y archivada', 'success');
  };

  const handleDeleteInternalTask = (id: string) => {
    setInternalTasks(prev => prev.filter(t => t.id !== id));
    deleteSingleInternalTask(id);
    showToast('Tarea interna eliminada.', 'info');
  };

  // HANDLERS FOR CONTRACTOR TASKS
  const handleCreateContractorTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContractorTask.title.trim() || !newContractorTask.contractorName.trim()) {
      showToast('Por favor, rellena los campos requeridos del contratista.', 'error');
      return;
    }

    const ticketId = newContractorTask.ticketId.trim()
      ? newContractorTask.ticketId.trim().toUpperCase()
      : `CNT-${Math.floor(1000 + Math.random() * 9000)}`;

    const supervisorId = isSupervisor ? newContractorTask.supervisorAgentId : currentAgentId;
    if (!supervisorId) {
      showToast('No se puede asignar: supervisor de roster no identificado.', 'error');
      return;
    }

    const newTask: ContractorTask = {
      id: `cont_${Date.now()}`,
      title: newContractorTask.title.trim(),
      contractorName: newContractorTask.contractorName.trim(),
      supervisorAgentId: supervisorId,
      ticketId: ticketId,
      status: 'Asignado a Contratista',
      startDate: newContractorTask.startDate,
      dueDate: newContractorTask.dueDate,
      notes: newContractorTask.notes.trim()
    };

    setContractorTasks(prev => [newTask, ...prev]);
    showToast(`Tarea de contratista asignada para "${newTask.contractorName}"`, 'success');
    setIsContractorTaskDrawerOpen(false);

    // Reset Form
    setNewContractorTask({
      title: '',
      contractorName: '',
      supervisorAgentId: isSupervisor ? (agents[0]?.id || '') : currentAgentId,
      ticketId: '',
      startDate: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleOpenFollowUpContractor = (task: ContractorTask) => {
    setFollowingUpContractorId(task.id);
    setContractorFollowUpText(task.followUpNotes || '');
    setContractorStatusSelect(task.status);
  };

  const handleSaveContractorFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!followingUpContractorId) return;

    setContractorTasks(prev => prev.map(t => {
      if (t.id === followingUpContractorId) {
        return {
          ...t,
          status: contractorStatusSelect,
          followUpNotes: contractorFollowUpText.trim()
        };
      }
      return t;
    }));

    setFollowingUpContractorId(null);
    setContractorFollowUpText('');
    showToast('Bitácora y estado de contratista actualizados.', 'success');
  };

  const handleDeleteContractorTask = (id: string) => {
    setContractorTasks(prev => prev.filter(c => c.id !== id));
    showToast('Tarea de contratista eliminada.', 'info');
  };

  // Tareas state now comes from props
  
  // 5. Calendar Planning Handler
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [quickEventForm, setQuickEventForm] = useState({
    agentId: agents[0]?.id || '',
    type: 'guardia' as CalendarEvent['type'],
    note: '',
    intensity: 3,
    eventCategory: 'particular' as 'general' | 'particular',
    isAssignedToOther: false
  });

  const handleAddCalendarEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCalendarDay) return;

    if (quickEventForm.eventCategory === 'general') {
        // Check Guardia priority rules if scheduling Chat or Alerta
        if (quickEventForm.type === 'chat' || quickEventForm.type === 'alerta') {
          const isGuardiaOnThisDay = calendarEvents.some(
            ev => ev.date === selectedCalendarDay && ev.type === 'guardia' && ev.agentId === quickEventForm.agentId
          );
          if (isGuardiaOnThisDay) {
            showToast('Conflicto Operativo: El agente seleccionado ya tiene Guardia asignada este día y está exento de Chat/Alertas.', 'error');
            return;
          }
        }

        const newEvent: CalendarEvent = {
          id: `cal_manual_${Date.now()}`,
          agentId: quickEventForm.agentId,
          type: quickEventForm.type,
          date: selectedCalendarDay,
          note: quickEventForm.note.trim() || `Asignación programada de ${quickEventForm.type}`
        };

        setCalendarEvents(prev => [newEvent, ...prev]);
        saveCalendarEvent(newEvent).catch(err => console.error("Error saving manual event:", err));
        showToast('Evento general agendado con éxito', 'success');
    } else {
        if (isSupervisor && quickEventForm.isAssignedToOther) {
          // Admin assigning to a specific technician
          const targetAgentId = quickEventForm.agentId;
          const targetAgent = agents.find(a => a.id === targetAgentId);
          
          const newIsolated: IsolatedEvent = {
            id: `iso_${targetAgentId}_${Date.now()}`,
            agentId: targetAgentId,
            title: quickEventForm.note.trim() || 'Recordatorio Administrativo',
            date: selectedCalendarDay,
            type: 'Otro',
            intensity: quickEventForm.intensity,
            notes: `Enviado por administración (${agents.find(a => a.id === currentAgentId)?.name || 'Admin'})`
          };
          
          setIsolatedEvents(prev => [...prev, newIsolated]);
          showToast(`Recordatorio enviado a ${targetAgent?.name || 'técnico'}`, 'success');
        } else {
          // Default: Reminder for self
          const newIsolated: IsolatedEvent = {
            id: `iso_${Date.now()}`,
            agentId: currentAgentId,
            title: quickEventForm.note.trim() || 'Mi Recordatorio',
            date: selectedCalendarDay,
            type: 'Otro',
            intensity: quickEventForm.intensity,
            notes: ''
          };
          setIsolatedEvents(prev => [...prev, newIsolated]);
          showToast('Recordatorio personal guardado', 'success');
        }
    }

    setQuickEventForm(p => ({ ...p, note: '', isAssignedToOther: false }));
  };

  const handleRemoveCalendarEvent = (id: string) => {
    if (!isSupervisor) {
      showToast('Se requieren privilegios de supervisor para alterar el calendario.', 'error');
      return;
    }
    setCalendarEvents(prev => prev.filter(e => e.id !== id));
    deleteCalendarEvent(id).catch(err => console.error("Error deleting calendar event:", err));
    showToast('Asignación cancelada.', 'info');
  };

  const handleRemoveIsolatedEvent = (id: string) => {
    setIsolatedEvents(prev => prev.filter(e => e.id !== id));
    deleteEvent(id).catch(err => console.error("Error deleting isolated event:", err));
    showToast('Evento particular eliminado.', 'info');
  };

  // Helper to get day intensity
  const getDayWorkloadIntensity = (dateStr: string) => {
    let score = 0;
    score += calendarEvents.filter(e => e.date === dateStr).length * 2;
    score += absences.filter(a => dateStr >= a.startDate && dateStr <= a.endDate).length * 1.5;
    const activeVisits = programmedVisits.filter(v => {
      if (v.estado_visita === 'Cerrada') return false;
      const visitDate = (v.fecha_visita || '').split(' ')[0];
      return visitDate === dateStr;
    });
    score += activeVisits.length * 1.5;
    return Math.min(score, 10);
  };


  // --- COMPUTED DATA FOR METRICS ---
  const todayStrForMetrics = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
  const activeAbsenceAgentIds = new Set(
    absences
      .filter(a => todayStrForMetrics >= a.startDate && todayStrForMetrics <= a.endDate)
      .map(a => a.agentId)
  );

  const activeColaborators = dutyStates.filter(s => !activeAbsenceAgentIds.has(s.agentId) && s.status !== 'Finalizó su jornada' && s.checkInTime !== null).length;
  const availableColaborators = dutyStates.filter(s => !activeAbsenceAgentIds.has(s.agentId) && (s.status === 'Disponible' || s.status === 'En llamada')).length;
  const outOfOfficeColaborators = dutyStates.filter(s => !activeAbsenceAgentIds.has(s.agentId) && (s.status === 'Fuera de oficina' || s.status === 'Finalizó su jornada')).length;
  const absentColaborators = activeAbsenceAgentIds.size;

  const currentGuardiaAgent = agents.find(a => a.id === specialDuties.guardiaId);
  const currentChatAgent = agents.find(a => a.id === specialDuties.chatId);
  const currentAlertasAgent = agents.find(a => a.id === specialDuties.alertasId);

  // General operational load metric
  const getAgentActiveTasksCount = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return 0;
    return agent.scrumLogs?.filter(t => t.status !== 'done').length || 0;
  };


  // --- CALENDAR GENERATION HELPERS ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCalendarViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const calendarYear = calendarViewDate.getFullYear();
  const calendarMonth = calendarViewDate.getMonth();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  // Correctly offset standard getDay() so Monday is first
  let firstDayIdx = getFirstDayOfMonth(calendarYear, calendarMonth) - 1; 
  if (firstDayIdx < 0) firstDayIdx = 6; // Sunday becomes index 6

  const calendarDaysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const leadingBlanks = Array.from({ length: firstDayIdx }, (_, i) => null);

  const currentAgentState = dutyStates.find(s => s.agentId === currentAgentId);
  const currentStatus = currentAgentState?.status || 'Disponible';
  const isCheckedIn = !!currentAgentState?.checkInTime;
  const isCheckedOut = !!currentAgentState?.checkOutTime;

  const operationsContextValue = {
    agents,
    currentUser,
    hideNavBar,
    initialSubTab,
    onUpdateAgent,
    internalTasks,
    setInternalTasks,
    contractorTasks,
    setContractorTasks,
    isolatedEvents,
    setIsolatedEvents,
    activeSubTab,
    setActiveSubTab,
    dutyStates,
    setDutyStates,
    asistencia,
    setAsistencia,
    selectedAsistenciaDate,
    setSelectedAsistenciaDate,
    editingAgentId,
    setEditingAgentId,
    tempWeeklySchedule,
    setTempWeeklySchedule,
    drawerAgentId,
    setDrawerAgentId,
    calendarFilters,
    setCalendarFilters,
    calendarViewMode,
    setCalendarViewMode,
    isEventDrawerOpen,
    setIsEventDrawerOpen,
    selectedAgendaItem,
    setSelectedAgendaItem,
    adminSubTab,
    setAdminSubTab,
    hoveredStatus,
    setHoveredStatus,
    revealedReasons,
    toggleReason,
    bitacoraPage,
    setBitacoraPage,
    BITACORA_PAGE_SIZE,
    isSyncingAsistencia,
    setIsSyncingAsistencia,
    hasLoadedAsistencia,
    setHasLoadedAsistencia,
    hasLoadedDesignaciones,
    hasLoadedJornada,
    hasLoadedAusencias,
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
  };

  return (
    <OperationsProvider value={operationsContextValue}>
      <div className="space-y-6" id="ops-module-root">
        <OperationsToast />
        <OperationsHeader />
        <OperationsFilterBar />

        {/* --- SUB-TAB CONTENT RENDERING --- */}
        {(() => {
          const sectionKey = initialSubTab === 'administracion' ? 'operations_admin' : 'operations';
          const subKey = `${sectionKey}_${activeSubTab}`;
          const isSubBlocked = comingSoonConfig && !!comingSoonConfig[subKey];
          if (isSubBlocked) {
            return (
              <ComingSoonSubTab
                title={
                  activeSubTab === 'dashboard' ? 'Dashboard Operativo' :
                  activeSubTab === 'ausencias' ? 'Ausencias & Vacaciones' :
                  activeSubTab === 'externo' ? 'Reporte Histórico' :
                  activeSubTab === 'calendario' ? 'Calendario Operativo' :
                  activeSubTab === 'administracion' ? 'Administración Operativa' :
                  activeSubTab
                }
              />
            );
          }
          return (
            <>
              {activeSubTab === 'dashboard' && <OperationsDashboardTab />}
              {activeSubTab === 'administracion' && <OperationsAdminTab />}
              {activeSubTab === 'ausencias' && <OperationsAusenciasTab />}
              {activeSubTab === 'externo' && <OperationsTareasTab />}
              {activeSubTab === 'calendario' && <OperationsCalendarioTab />}
            </>
          );
        })()}

        <OperationsModals />
      </div>
    </OperationsProvider>
  );
}
