import React, { useState, useMemo, useEffect } from 'react';
import { ComingSoonSubTab } from '../ui/ComingSoonSubTab';
import { Agent, Achievement, TierConfig, Certification, ActionPlanItem, AgentProfile, AgentEvaluation, InternalTask, ContractorTask, AsistenciaRow, AusenciaRow, JornadaRow } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { AgentAvatarLogo } from '../AgentAvatarLogo';
import { 
  fetchAgentProfiles, 
  saveAgentProfile,
  fetchCRMData,
  fetchWeeklyBacklog,
  fetchHistoricalBacklog,
  fetchAvailableSprints,
  sortSprintsDescending,
  fetchSystemSettings,
  checkSprintMatch,
  isDateInActiveWeek,
  subscribeToCRMData,
  subscribeToWeeklyBacklog,
  subscribeToWeeklyBacklogContractors,
  subscribeCollaborations,
  subscribeToProgrammedVisits,
  subscribeToAusencias,
  subscribeToJornadas
} from '../../db/firebaseService';
import { subscribeToAsistencia } from '../../db/asistenciaService';
import { DEFAULT_JORNADAS } from '../../db/initialSeedData';
import { FullEvaluationDetailModal } from '../evaluation/FullEvaluationDetailModal';
import { CRITICAL_BUSINESS_FAULTS } from '../evaluation/criteria/constants';

interface ProfilesTabProps {
  agents: Agent[];
  tiers: TierConfig[];
  certifications: Certification[];
  catalogAchievements: Achievement[];
  onAwardAchievement: (agentId: string, achievementId: string) => void;
  onRevokeAchievement: (agentId: string, achievementId: string) => void;
  onEnrollAgent?: (agentId: string, id: string, type: "certification" | "achievement") => void;
  onUnenrollAgent?: (agentId: string, id: string, type: "certification" | "achievement") => void;
  currentUser?: { username: string; name: string; email: string; role?: string } | null;
  onTabChange?: (tab: any) => void;
  comingSoonConfig?: Record<string, boolean>;
  internalTasks?: InternalTask[];
  contractorTasks?: ContractorTask[];
}

const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const normalizeStatus = (status: string): string => {
  if (!status) return '';
  return status
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const isStatusResolved = (status: string): boolean => {
  if (!status) return false;
  const s = normalizeStatus(status);
  if (s.includes('confirmar')) return false;
  return (
    s.includes('completad') ||
    s.includes('resuelt') ||
    s.includes('cerrad') ||
    s.includes('exitos') ||
    s.includes('finalizad') ||
    s.includes('terminad') ||
    s.includes('entregad') ||
    s.includes('cancelad') ||
    s.includes('anulad') ||
    s.includes('rechazad') ||
    s.includes('done') ||
    s.includes('closed') ||
    s.includes('resolved') ||
    s.includes('completed') ||
    s.includes('historico')
  );
};

const isStatusInProgress = (status: string): boolean => {
  if (!status) return false;
  const s = normalizeStatus(status);
  return s.includes('progres') ||
    s.includes('curso') ||
    s.includes('intern') ||
    s.includes('espera') ||
    s.includes('trabajando') ||
    s.includes('proceso') ||
    s.includes('procesando') ||
    s.includes('waiting') ||
    s.includes('hold') ||
    s.includes('reparacion') ||
    s.includes('programad') ||
    s.includes('atencion') ||
    s.includes('atención');
};

const isAgentNameMatch = (nameA: string, nameB: string): boolean => {
  if (!nameA || !nameB) return false;
  const cleanA = normalizeName(nameA);
  const cleanB = normalizeName(nameB);
  if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  const partsA = cleanA.split(' ').filter(p => p.length > 2);
  const partsB = cleanB.split(' ').filter(p => p.length > 2);
  const matchingParts = partsA.filter(p => partsB.includes(p));
  return matchingParts.length >= 2 || (partsA.length === 1 && partsB.length === 1 && partsA[0] === partsB[0]);
};

export default function ProfilesTab({ 
  agents, 
  tiers, 
  certifications,
  catalogAchievements, 
  onAwardAchievement, 
  onRevokeAchievement,
  onEnrollAgent,
  onUnenrollAgent,
  currentUser,
  onTabChange,
  comingSoonConfig = {},
  internalTasks = [],
  contractorTasks = []
}: ProfilesTabProps) {
  const isUserRole = currentUser?.role?.toLowerCase() === 'user';
  
  const matchedAgent = isUserRole 
    ? (
        agents.find(a => a.email?.toLowerCase().trim() === currentUser?.email?.toLowerCase().trim()) ||
        agents.find(a => a.name?.toLowerCase().trim() === currentUser?.name?.toLowerCase().trim()) ||
        agents.find(a => a.id?.toLowerCase().trim() === currentUser?.username?.toLowerCase().trim()) ||
        agents[0]
      )
    : null;

  const [selectedAgentId, setSelectedAgentId] = useState(() => {
    if (isUserRole && matchedAgent) return matchedAgent.id;
    return agents[0]?.id || '';
  });

  const [activeTab, setActiveTab] = useState<'resumen' | 'evaluaciones' | 'backlog' | 'operaciones' | 'adherencia' | 'competencias'>('resumen');
  const [showAwardPanel, setShowAwardPanel] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [inspectingEvaluation, setInspectingEvaluation] = useState<AgentEvaluation | null>(null);
  const [taskFilter, setTaskFilter] = useState<'Todos' | 'Pendiente' | 'En proceso' | 'Completado'>('Todos');
  const [evalCurrentPage, setEvalCurrentPage] = useState(1);

  const selectedAgent = isUserRole && matchedAgent 
    ? matchedAgent 
    : (agents.find(a => a.id === selectedAgentId) || agents[0]);

  // Reset evaluation page when selected agent or tab changes
  useEffect(() => {
    setEvalCurrentPage(1);
  }, [selectedAgent.id, activeTab]);

  const [profiles, setProfiles] = useState<Record<string, AgentProfile>>({});
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Load profiles from Firestore
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const list = await fetchAgentProfiles();
        if (!active) return;
        const map: Record<string, AgentProfile> = {};
        list.forEach(p => {
          map[p.agentId] = p;
        });
        setProfiles(map);
      } catch (err) {
        console.error('Error loading profiles from Firestore:', err);
      } finally {
        if (active) setLoadingProfiles(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  const activeProfile = useMemo((): AgentProfile => {
    const defaultProfile: AgentProfile = {
      agentId: selectedAgent.id,
      skills: selectedAgent.skills || [],
      specialties: selectedAgent.specialties || [],
      improvementAreas: selectedAgent.improvementAreas || [],
      painPoints: selectedAgent.painPoints || [],
      actionPlan: selectedAgent.actionPlan || []
    };
    return profiles[selectedAgent.id] || defaultProfile;
  }, [profiles, selectedAgent]);

  const updateProfileField = async <K extends keyof AgentProfile>(field: K, newValue: AgentProfile[K]) => {
    const updatedProfile: AgentProfile = {
      ...activeProfile,
      agentId: selectedAgent.id,
      [field]: newValue
    };

    setProfiles(prev => ({
      ...prev,
      [selectedAgent.id]: updatedProfile
    }));

    try {
      await saveAgentProfile(selectedAgent.id, updatedProfile);
    } catch (err) {
      console.error('Error saving agent profile to Firestore:', err);
    }
  };

  const teamRanking = useMemo(() => {
    if (!selectedAgent) return 1;
    const sortedAgents = [...agents].sort((a, b) => b.currentXp - a.currentXp);
    return sortedAgents.findIndex(a => a.id === selectedAgent.id) + 1;
  }, [agents, selectedAgent]);

  if (!selectedAgent) {
    return (
      <div className="py-12 flex flex-col items-center justify-center min-h-[50vh] text-slate-400 font-sans">
        <span className="material-symbols-outlined text-4xl mb-4 opacity-50">person_off</span>
        <p>No se encontraron agentes disponibles para visualizar perfiles.</p>
      </div>
    );
  }

  const currentTier = tiers.find(t => t.id === selectedAgent.tierId) || tiers[0];
  const nextTierIndex = tiers.findIndex(t => t.id === selectedAgent.tierId) + 1;
  const nextTier = nextTierIndex < tiers.length ? tiers[nextTierIndex] : null;

  const minXp = currentTier.minXp;
  const maxXp = currentTier.maxXp;
  const xpOffsetRange = maxXp - minXp;
  const currentOffset = Math.max(0, selectedAgent.currentXp - minXp);
  const rawProgressPercent = xpOffsetRange > 0 ? (currentOffset / xpOffsetRange) * 100 : 100;
  const progressPercent = Math.min(100, Math.max(0, rawProgressPercent));
  const isCapped = !nextTier;
  const xpToGo = isCapped ? 0 : Math.max(0, maxXp - selectedAgent.currentXp);

  const scoresObj = (selectedAgent.evaluationsHistory && selectedAgent.evaluationsHistory.length > 0 && selectedAgent.evaluationsHistory[0]?.scores)
    ? selectedAgent.evaluationsHistory[0].scores
    : (selectedAgent.dimensionScores || { knowledge: 25, execution: 25, relational: 25, collaborative: 25, control: 25 });
  const scoreKeys: Array<keyof typeof scoresObj> = ['knowledge', 'execution', 'relational', 'collaborative', 'control'];
  
  let lowestDimensionKey: keyof typeof scoresObj = 'relational';
  let lowestScore = 1000;
  scoreKeys.forEach(k => {
    if (scoresObj[k] < lowestScore) {
      lowestScore = scoresObj[k];
      lowestDimensionKey = k;
    }
  });

  const getDimensionLabel = (key: string) => {
    switch (key) {
      case 'knowledge': return 'Conocimiento Técnico';
      case 'execution': return 'Resolución y Ejecución';
      case 'relational': return 'Atención al Cliente';
      case 'collaborative': return 'Impacto en el Equipo';
      case 'control': return 'Procesos y Calidad';
      default: return key.toUpperCase();
    }
  };

  const getDimensionIcon = (key: string) => {
    switch (key) {
      case 'knowledge': return 'school';
      case 'execution': return 'build';
      case 'relational': return 'support_agent';
      case 'collaborative': return 'groups';
      case 'control': return 'rule';
      default: return 'star';
    }
  };

  const getDimensionColorClass = (key: string) => {
    switch (key) {
      case 'knowledge': return 'text-sky-400 bg-sky-400/10 border-sky-400/20';
      case 'execution': return 'text-violet-400 bg-violet-400/10 border-violet-400/20';
      case 'relational': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'collaborative': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'control': return 'text-slate-300 bg-slate-300/10 border-slate-300/20';
      default: return 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20';
    }
  };

  const computePoint = (index: number, val: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI / 5) * index;
    const r = (val / 100) * 65; 
    const x = 90 + r * Math.cos(angle);
    const y = 90 + r * Math.sin(angle);
    return { x: Math.round(x), y: Math.round(y) };
  };

  const p1 = computePoint(0, scoresObj.knowledge);
  const p2 = computePoint(1, scoresObj.execution);
  const p3 = computePoint(2, scoresObj.relational);
  const p4 = computePoint(3, scoresObj.control); 
  const p5 = computePoint(4, scoresObj.collaborative);
  const polyPoints = `${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y} ${p5.x},${p5.y}`;

  const tabs = [
    { id: 'resumen', label: 'Resumen 360°', icon: 'dashboard' },
    { id: 'evaluaciones', label: 'Evaluaciones y MIMO', icon: 'rate_review' },
    { id: 'backlog', label: 'Request Backlog', icon: 'inbox' },
    { id: 'operaciones', label: 'Escalaciones, Tareas y Visitas', icon: 'engineering' },
    { id: 'adherencia', label: 'Adherencia', icon: 'schedule' },
    { id: 'competencias', label: 'Competencias', icon: 'radar' }
  ] as const;

  // Compute tasks assigned to this agent
  const agentTasks = useMemo(() => {
    const internalAssigned = (internalTasks || []).filter(t => {
      const tId = String(t.assignedToId || (t as any).assignedTo || (t as any).agentId || '').trim();
      const tName = String((t as any).assignedTo || (t as any).responsable || (t as any).agent || '').trim();
      return (tId && tId.toLowerCase() === selectedAgent.id.toLowerCase()) ||
             isAgentNameMatch(selectedAgent.name, tId) ||
             isAgentNameMatch(selectedAgent.name, tName);
    });
    const contractorAssigned = (contractorTasks || []).filter(t => {
      const cId = String((t as any).assignedToId || (t as any).agentId || '').trim();
      const cName = String((t as any).assignedTo || (t as any).contractorName || (t as any).responsable || '').trim();
      return (cId && cId.toLowerCase() === selectedAgent.id.toLowerCase()) ||
             isAgentNameMatch(selectedAgent.name, cId) ||
             isAgentNameMatch(selectedAgent.name, cName);
    });
    return [...internalAssigned, ...contractorAssigned];
  }, [internalTasks, contractorTasks, selectedAgent]);

  const taskStats = useMemo(() => {
    // 1. Tareas internas y de contratistas
    const internalCompleted = agentTasks.filter(t => {
      const statusLower = String(t.status || '').toLowerCase().trim();
      return t.status === 'Completado' || t.completed === true || !!t.completedDate || !!t.CompletedDate || statusLower === 'completed' || statusLower === 'completado' || statusLower === 'terminado';
    }).length;
    const internalInProgress = agentTasks.filter(t => {
      const statusLower = String(t.status || '').toLowerCase().trim();
      return !t.completed && !t.completedDate && !t.CompletedDate && (t.status === 'En proceso' || statusLower === 'en proceso' || statusLower === 'working');
    }).length;
    const internalPending = agentTasks.filter(t => {
      const statusLower = String(t.status || '').toLowerCase().trim();
      return !t.completed && !t.completedDate && !t.CompletedDate && internalCompleted === 0 && internalInProgress === 0 || t.status === 'Pendiente' || statusLower === 'pendiente';
    }).length;

    // 2. Requerimientos del Request Backlog (CRM/MIMO) registrados en xpBreakdown
    const bd = selectedAgent.xpBreakdown;
    const crmCompleted = bd?.completedTickets || 0;
    const crmInProgress = bd?.workingTickets || 0;
    const crmPending = bd?.pendingTickets || 0;

    // Consolidamos la totalidad de casos resueltos, en proceso y pendientes
    const finalCompleted = crmCompleted + internalCompleted;
    const finalInProgress = crmInProgress + internalInProgress;
    const finalPending = crmPending + internalPending;
    const finalTotal = finalCompleted + finalInProgress + finalPending;

    // Tasa de Eficiencia de Cierre
    const efficiency = finalTotal > 0 
      ? Math.round((finalCompleted / finalTotal) * 100) 
      : (bd?.resolucionGlobal !== undefined && bd?.resolucionGlobal !== null ? bd.resolucionGlobal : 100);

    return {
      completed: finalCompleted,
      inProgress: finalInProgress,
      pending: finalPending,
      total: finalTotal > 0 ? finalTotal : (bd?.asignados || 0),
      efficiency
    };
  }, [agentTasks, selectedAgent]);

  // -------------------------------------------------------------
  // Real-time Request Backlog & Sprint Data States for Selected Agent
  // -------------------------------------------------------------
  const [crmRows, setCrmRows] = useState<any[]>([]);
  const [weeklyRows, setWeeklyRows] = useState<any[]>([]);
  const [contractorWeeklyRows, setContractorWeeklyRows] = useState<any[]>([]);
  const [historicalRows, setHistoricalRows] = useState<any[]>([]);
  const [availableSprints, setAvailableSprints] = useState<string[]>([]);
  const [activeSystemSprint, setActiveSystemSprint] = useState<string>('');
  const [backlogLoading, setBacklogLoading] = useState<boolean>(true);

  // Backlog View Filters
  const [sprintFilterMode, setSprintFilterMode] = useState<'current' | 'previous' | string>('current');
  const [statusFilterMode, setStatusFilterMode] = useState<'Todos' | 'Pendiente' | 'En proceso' | 'Completado'>('Todos');
  const [backlogSearchQuery, setBacklogSearchQuery] = useState<string>('');
  const [backlogCurrentPage, setBacklogCurrentPage] = useState<number>(1);

  // Subscribe and load real-time CRM, Weekly, Contractor, and Historical backlog data
  useEffect(() => {
    let isMounted = true;
    setBacklogLoading(true);

    const initData = async () => {
      try {
        const [settings, sprints, historical] = await Promise.all([
          fetchSystemSettings().catch(() => ({})),
          fetchAvailableSprints().catch(() => []),
          fetchHistoricalBacklog().catch(() => [])
        ]);
        if (isMounted) {
          if (settings?.current_week_range) {
            setActiveSystemSprint(settings.current_week_range);
          }
          if (sprints && sprints.length > 0) {
            setAvailableSprints(sprints);
          }
          if (historical && historical.length > 0) {
            setHistoricalRows(historical);
          }
        }
      } catch (e) {
        console.error('Error loading request backlog data:', e);
      } finally {
        if (isMounted) setBacklogLoading(false);
      }
    };

    initData();

    const unsubCRM = subscribeToCRMData('requerimientos_en_curso', (rows) => {
      if (isMounted) setCrmRows(rows);
    });

    const unsubWeekly = subscribeToWeeklyBacklog((rows) => {
      if (isMounted) setWeeklyRows(rows);
    });

    const unsubContractorWeekly = subscribeToWeeklyBacklogContractors((rows) => {
      if (isMounted) setContractorWeeklyRows(rows);
    });

    return () => {
      isMounted = false;
      unsubCRM();
      unsubWeekly();
      unsubContractorWeekly();
    };
  }, []);

  // Reset page whenever selected agent or filter parameters change
  useEffect(() => {
    setBacklogCurrentPage(1);
  }, [selectedAgent.id, sprintFilterMode, statusFilterMode, backlogSearchQuery, activeTab]);

  // Comprehensive Agent Matcher function for real-time tickets from Firestore
  const isTicketForCurrentAgent = useMemo(() => {
    return (ticket: any): boolean => {
      if (!ticket || !selectedAgent) return false;

      // 1. Direct Agent ID match across all standard Firestore fields
      const agentIdFields = [
        ticket.agentid,
        ticket.agentId,
        ticket['Agent ID'],
        ticket.idAgente,
        ticket.tecnico_visita_id,
        ticket.assignedToId,
        ticket.contractorId,
        ticket.AgentID,
        ticket['ID Técnico'],
        ticket.tecnico_id
      ];

      const selectedIdLower = String(selectedAgent.id || '').toLowerCase().trim();
      if (selectedIdLower && agentIdFields.some(id => id && String(id).toLowerCase().trim() === selectedIdLower)) {
        return true;
      }

      // 2. Name match across all possible assigned name fields in production CRM & Backlog
      const assignedNameFields = [
        ticket['Assigned To'],
        ticket['assignedTo'],
        ticket['Técnico asignado'],
        ticket['Tecnico asignado'],
        ticket['Técnico Asignado'],
        ticket['Asignado'],
        ticket['Agent'],
        ticket['agent'],
        ticket['tecnico_visita'],
        ticket['tecnico'],
        ticket['contractorName'],
        ticket['tecnico_nombre'],
        ticket['tecnico_asignado'],
        ticket['Técnico'],
        ticket['Tecnico']
      ];

      for (const nameVal of assignedNameFields) {
        if (nameVal && isAgentNameMatch(selectedAgent.name, String(nameVal))) {
          return true;
        }
      }

      return false;
    };
  }, [selectedAgent]);

  // Formatted & Deduplicated Agent Requests
  const agentFormattedRequests = useMemo(() => {
    const map = new Map<string, any>();

    const parseRequest = (raw: any, defaultSource: string) => {
      const tId = String(
        raw.ID || 
        raw.id || 
        raw.ticketId || 
        raw['Ticket ID'] || 
        raw['ID Requerimiento'] || 
        raw.id_registro_visita || 
        ''
      ).trim();

      const title = String(
        raw['Título'] || 
        raw.Title || 
        raw['Requerimiento / Asunto'] || 
        raw.asunto || 
        raw['Requerimiento'] || 
        raw['Solicitud'] || 
        raw.title || 
        raw['Descripción'] || 
        raw.description || 
        raw.comentario_visita ||
        'Requerimiento'
      ).trim();

      const desc = String(
        raw['Descripción'] || 
        raw.description || 
        raw.comentario_visita || 
        raw.notes || 
        raw['Trabajo Realizado'] || 
        ''
      ).trim();

      const client = String(
        raw['Account'] || 
        raw['Cliente'] || 
        raw.cliente || 
        raw['Empresa'] || 
        raw['Cuenta'] || 
        ''
      ).trim();

      const priority = String(
        raw['Priority'] || 
        raw['Prioridad'] || 
        raw.prioridad_visita || 
        raw.priority || 
        'Normal'
      ).trim();

      const type = String(
        raw['Tipo'] || 
        raw.type || 
        raw['Especialidad'] || 
        raw['Categoría'] || 
        'Técnico'
      ).trim();

      const rawSprintStr = String(
        raw.sprint_trabajo || 
        raw['Semana Actual'] || 
        raw['Sprint'] || 
        raw.sprint || 
        ''
      ).trim();

      const sprint = rawSprintStr || (defaultSource === 'Histórico Sprints' || defaultSource === 'Histórico Completados' ? 'Histórico' : (activeSystemSprint || 'Semana Actual'));

      const date = String(
        raw['Fecha'] || 
        raw['Resolved Date'] || 
        raw['Fecha Completado'] || 
        raw.fecha_visita || 
        raw.scheduledDate || 
        raw.created_at || 
        raw.timestamp_cierre || 
        ''
      ).trim();

      let status: 'Completado' | 'En proceso' | 'Pendiente' = 'Pendiente';
      if (defaultSource === 'Histórico Sprints' || defaultSource === 'Histórico Completados') {
        status = 'Completado';
      } else {
        const rawStatus = String(raw.Status || raw.Estado || raw.estado_visita || raw.status || raw.columna || '').trim();
        if (isStatusResolved(rawStatus)) {
          status = 'Completado';
        } else if (isStatusInProgress(rawStatus)) {
          status = 'En proceso';
        } else {
          status = 'Pendiente';
        }
      }

      // Check whether item strictly belongs to current active sprint
      let isCurrentSprint = false;
      if (defaultSource === 'Histórico Sprints' || defaultSource === 'Histórico Completados') {
        isCurrentSprint = false;
      } else if (defaultSource === 'CRM En Curso') {
        isCurrentSprint = true;
      } else {
        if (rawSprintStr) {
          const sLower = rawSprintStr.toLowerCase();
          const activeLower = (activeSystemSprint || '').toLowerCase();
          if (
            sLower === activeLower ||
            sLower === 'actual' ||
            sLower.includes('semana actual') ||
            (activeLower && (sLower.includes(activeLower) || activeLower.includes(sLower)))
          ) {
            isCurrentSprint = true;
          } else {
            isCurrentSprint = false;
          }
        } else if (date && activeSystemSprint) {
          isCurrentSprint = isDateInActiveWeek(date, activeSystemSprint);
        } else {
          isCurrentSprint = true;
        }
      }

      return {
        id: tId || `REQ-${Math.random().toString(36).substr(2, 6)}`,
        ticketId: tId || 'REQ',
        title,
        description: desc,
        client: client || 'Sin cliente especificado',
        status,
        priority: priority || 'Normal',
        type: type || 'Técnico',
        sprint,
        date,
        source: defaultSource,
        isCurrentSprint
      };
    };

    // 1. Active CRM Rows (First priority: active workload in CRM En Curso)
    crmRows.filter(isTicketForCurrentAgent).forEach(r => {
      const item = parseRequest(r, 'CRM En Curso');
      map.set(item.id, item);
    });

    // 2. Weekly Backlog Rows for Agents (Completed in current sprint)
    weeklyRows.filter(isTicketForCurrentAgent).forEach(r => {
      const item = parseRequest(r, 'Backlog Semanal');
      if (!map.has(item.id)) {
        map.set(item.id, item);
      } else {
        const existing = map.get(item.id);
        if (item.status === 'Completado' && existing.status !== 'Completado') {
          map.set(item.id, { ...existing, status: 'Completado', source: 'Backlog Semanal', isCurrentSprint: item.isCurrentSprint });
        }
      }
    });

    // 3. Weekly Backlog Rows for Contractors (Completed in current sprint)
    contractorWeeklyRows.filter(isTicketForCurrentAgent).forEach(r => {
      const item = parseRequest(r, 'Backlog Contratistas');
      if (!map.has(item.id)) {
        map.set(item.id, item);
      } else {
        const existing = map.get(item.id);
        if (item.status === 'Completado' && existing.status !== 'Completado') {
          map.set(item.id, { ...existing, status: 'Completado', source: 'Backlog Contratistas', isCurrentSprint: item.isCurrentSprint });
        }
      }
    });

    // 4. Historical Rows (Completed across past sprints)
    historicalRows.filter(isTicketForCurrentAgent).forEach(r => {
      const item = parseRequest(r, 'Histórico Sprints');
      if (!map.has(item.id)) {
        map.set(item.id, item);
      }
    });

    // 5. Directly Assigned Tasks from System
    agentTasks.forEach((task, idx) => {
      const tid = task.ticketId || task.id || `TASK-${idx + 1}`;
      if (!map.has(tid)) {
        map.set(tid, {
          id: tid,
          ticketId: tid,
          title: task.title,
          description: task.notes || '',
          client: task.client || 'Interno',
          status: (task.status === 'Completado' ? 'Completado' : task.status === 'En proceso' ? 'En proceso' : 'Pendiente'),
          priority: task.priority || 'Normal',
          type: task.type || 'Asignación Directa',
          sprint: activeSystemSprint || 'Actual',
          date: task.scheduledDate || '',
          source: 'Tarea Asignada',
          isCurrentSprint: true
        });
      }
    });

    return Array.from(map.values());
  }, [crmRows, weeklyRows, contractorWeeklyRows, historicalRows, agentTasks, isTicketForCurrentAgent, activeSystemSprint]);

  // Sprint Groups
  const currentSprintRequests = useMemo(() => {
    return agentFormattedRequests.filter(r => r.isCurrentSprint);
  }, [agentFormattedRequests]);

  const previousSprintsRequests = useMemo(() => {
    return agentFormattedRequests.filter(r => !r.isCurrentSprint);
  }, [agentFormattedRequests]);

  // Filter requests according to selected Sprint Mode
  const activeScopeRequests = useMemo(() => {
    if (sprintFilterMode === 'current') {
      return currentSprintRequests;
    }
    if (sprintFilterMode === 'previous') {
      return previousSprintsRequests;
    }
    // Specific sprint selected
    return agentFormattedRequests.filter(r => 
      r.sprint.toLowerCase().trim() === sprintFilterMode.toLowerCase().trim() ||
      checkSprintMatch({ sprint_trabajo: r.sprint }, sprintFilterMode)
    );
  }, [agentFormattedRequests, currentSprintRequests, previousSprintsRequests, sprintFilterMode]);

  // Top KPI Indicators Dedicated to this Agent
  const agentBacklogKpis = useMemo(() => {
    const completed = activeScopeRequests.filter(r => r.status === 'Completado').length;
    const inProgress = activeScopeRequests.filter(r => r.status === 'En proceso').length;
    const pending = activeScopeRequests.filter(r => r.status === 'Pendiente').length;
    const assigned = inProgress + pending;
    const totalScope = completed + assigned;
    const efficiency = totalScope > 0 ? Math.round((completed / totalScope) * 100) : 100;
    const totalHistoricalCompleted = agentFormattedRequests.filter(r => r.status === 'Completado').length;

    return {
      assigned,
      totalScope,
      completed,
      inProgress,
      pending,
      efficiency,
      totalHistoricalCompleted
    };
  }, [activeScopeRequests, agentFormattedRequests]);

  // Filter requests by Status & Search Query
  const filteredAgentRequests = useMemo(() => {
    let list = activeScopeRequests;

    if (statusFilterMode !== 'Todos') {
      list = list.filter(r => r.status === statusFilterMode);
    }

    if (backlogSearchQuery.trim()) {
      const q = backlogSearchQuery.toLowerCase().trim();
      list = list.filter(r => 
        r.ticketId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.client && r.client.toLowerCase().includes(q)) ||
        r.priority.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q)
      );
    }

    return list;
  }, [activeScopeRequests, statusFilterMode, backlogSearchQuery]);

  // Pagination for Requests List (Max 10 per page)
  const BACKLOG_PER_PAGE = 10;
  const totalBacklogPages = Math.ceil(filteredAgentRequests.length / BACKLOG_PER_PAGE) || 1;
  const currentBacklogPageNumber = Math.min(Math.max(1, backlogCurrentPage), totalBacklogPages);

  const paginatedAgentRequests = useMemo(() => {
    const start = (currentBacklogPageNumber - 1) * BACKLOG_PER_PAGE;
    return filteredAgentRequests.slice(start, start + BACKLOG_PER_PAGE);
  }, [filteredAgentRequests, currentBacklogPageNumber]);

  // -------------------------------------------------------------
  // Real-time Escalaciones, Tareas y Visitas States for Selected Agent
  // -------------------------------------------------------------
  const [collaborations, setCollaborations] = useState<any[]>([]);
  const [programmedVisits, setProgrammedVisits] = useState<any[]>([]);
  const [opsSprintFilterMode, setOpsSprintFilterMode] = useState<'current' | 'previous' | string>('current');
  const [opsCategoryFilter, setOpsCategoryFilter] = useState<'Todos' | 'Escalación' | 'Tarea' | 'Visita'>('Todos');
  const [opsStatusFilter, setOpsStatusFilter] = useState<'Todos' | 'Pendiente' | 'En proceso' | 'Completado'>('Todos');
  const [opsSearchQuery, setOpsSearchQuery] = useState<string>('');
  const [opsCurrentPage, setOpsCurrentPage] = useState<number>(1);

  // Reset page whenever filter parameters change
  useEffect(() => {
    setOpsCurrentPage(1);
  }, [selectedAgent.id, opsSprintFilterMode, opsCategoryFilter, opsStatusFilter, opsSearchQuery, activeTab]);

  // Subscribe to real-time collaborations and programmed visits
  useEffect(() => {
    const unsubscribeCollab = subscribeCollaborations((list) => {
      setCollaborations(list || []);
    });
    const unsubscribeVisits = subscribeToProgrammedVisits((list) => {
      setProgrammedVisits(list || []);
    });
    return () => {
      if (unsubscribeCollab) unsubscribeCollab();
      if (unsubscribeVisits) unsubscribeVisits();
    };
  }, []);

  // Comprehensive Operational Items List (Escalaciones, Tareas, Visitas) for Selected Agent
  const agentOpsItems = useMemo(() => {
    if (!selectedAgent) return [];
    const items: {
      id: string;
      category: 'Escalación' | 'Tarea' | 'Visita';
      title: string;
      detail: string;
      clientOrLocation: string;
      status: 'Completado' | 'En proceso' | 'Pendiente';
      rawStatus: string;
      priority: string;
      sprint: string;
      date: string;
      isCurrentSprint: boolean;
      requerimientoId?: string;
      notes?: string;
      raw: any;
    }[] = [];

    const agentName = selectedAgent.name || '';
    const agentId = selectedAgent.id || '';

    // Helper to evaluate item's sprint status accurately
    const evaluateItemSprint = (rawItem: any, itemDate: string, explicitSprintVal: string, status: string) => {
      const explicitSprint = String(explicitSprintVal || '').trim();
      
      // Check if explicit sprint matches active system sprint
      const isExplicitCurrent = explicitSprint && (
        explicitSprint.toLowerCase() === activeSystemSprint.toLowerCase() ||
        explicitSprint.toLowerCase().includes('actual') ||
        explicitSprint.toLowerCase().includes('curso') ||
        checkSprintMatch(rawItem, activeSystemSprint)
      );

      let isCurrentSprint = false;
      let displaySprint = explicitSprint;

      if (explicitSprint && explicitSprint !== 'undefined' && explicitSprint.toLowerCase() !== 'actual') {
        isCurrentSprint = !!isExplicitCurrent;
        displaySprint = explicitSprint;
      } else {
        // No explicit sprint or generic 'Actual'
        if (itemDate) {
          isCurrentSprint = isDateInActiveWeek(itemDate, activeSystemSprint);
          if (isCurrentSprint) {
            displaySprint = activeSystemSprint || 'Sprint Actual';
          } else {
            // Try to match itemDate with availableSprints
            const matchedAvailableSprint = availableSprints.find(s => isDateInActiveWeek(itemDate, s));
            if (matchedAvailableSprint) {
              displaySprint = matchedAvailableSprint;
            } else {
              displaySprint = `Sprint Anterior (${itemDate})`;
            }
          }
        } else {
          // No date and no explicit sprint
          if (status === 'Pendiente' || status === 'En proceso') {
            isCurrentSprint = true;
            displaySprint = activeSystemSprint || 'Sprint Actual';
          } else {
            isCurrentSprint = false;
            displaySprint = 'Sprint Anterior';
          }
        }
      }

      return { isCurrentSprint, displaySprint };
    };

    // 1. Escalaciones (Collaborations)
    (collaborations || []).forEach((c, idx) => {
      const collabId = String(c.collaboratorId || c.agentId || '').trim();
      const collabName = String(c.collaboratorName || c.nombreAgente || c.solicitante || c.responsable || '').trim();
      const isMatch = (collabId && collabId.toLowerCase() === agentId.toLowerCase()) ||
                      isAgentNameMatch(agentName, collabName);

      if (isMatch) {
        const rawStatus = String(c.status || c.estado || '').trim();
        let status: 'Completado' | 'En proceso' | 'Pendiente' = 'Pendiente';
        if (isStatusResolved(rawStatus)) {
          status = 'Completado';
        } else if (isStatusInProgress(rawStatus)) {
          status = 'En proceso';
        }

        const explicitSprint = String(c.sprint || c.sprint_trabajo || c['Semana Actual'] || '').trim();
        const date = String(c.acceptedAt || c.createdAt || c.fecha || c.completedAt || c.timestamp_cierre || '').trim();
        const { isCurrentSprint, displaySprint } = evaluateItemSprint(c, date, explicitSprint, status);

        items.push({
          id: c.id || c.collabId || `ESC-${idx + 1}`,
          category: 'Escalación',
          title: c.requerimientoTitulo || c.motivo || c.titulo || 'Escalación Operativa',
          detail: c.notes || c.observaciones || c.motivo || 'Atención de soporte especializado / escalación',
          clientOrLocation: c.solicitante ? `Solicitante: ${c.solicitante}` : 'Soporte Nivel 2',
          status,
          rawStatus,
          priority: c.prioridad || 'Alta',
          sprint: displaySprint,
          date,
          isCurrentSprint,
          requerimientoId: c.requerimientoId || c.ticketId || '',
          notes: c.notes || '',
          raw: c
        });
      }
    });

    // 2. Tareas (Internal Tasks & Contractor Tasks assigned to agent)
    ((internalTasks as any[]) || []).concat((contractorTasks as any[]) || []).forEach((t: any, idx: number) => {
      const tAgentId = String(t.assignedToId || t.assignedTo || t.agentId || '').trim();
      const assigned = String(t.assignedTo || t.tecnico || t.responsable || t.agent || '').trim();
      const isMatch = (tAgentId && tAgentId.toLowerCase() === agentId.toLowerCase()) ||
                      isAgentNameMatch(agentName, tAgentId) ||
                      isAgentNameMatch(agentName, assigned);

      if (isMatch) {
        const rawStatus = String(t.status || t.columna || '').trim();
        let status: 'Completado' | 'En proceso' | 'Pendiente' = 'Pendiente';
        if (t.completed === true || isStatusResolved(rawStatus)) {
          status = 'Completado';
        } else if (isStatusInProgress(rawStatus)) {
          status = 'En proceso';
        }

        const explicitSprint = String(t.sprint || t.sprint_trabajo || t['Semana Actual'] || '').trim();
        let date = String(t.completedDate || t.CompletedDate || t.completedAt || '').trim();
        if (!date && t.completionReport) {
          const match = String(t.completionReport).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (match) {
            const [, m, d, y] = match;
            date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          }
        }
        if (!date) {
          date = String(t.createdDate || t.createdAt || t.dueDate || t.updatedAt || t.scheduledDate || '').trim();
        }
        const { isCurrentSprint, displaySprint } = evaluateItemSprint(t, date, explicitSprint, status);

        items.push({
          id: t.id || `TASK-${idx + 1}`,
          category: 'Tarea',
          title: t.title || t.titulo || 'Tarea Operativa',
          detail: t.description || t.notes || 'Tarea asignada directamente',
          clientOrLocation: t.category || t.client || 'Operaciones Internas',
          status,
          rawStatus,
          priority: t.priority || 'Normal',
          sprint: displaySprint,
          date,
          isCurrentSprint,
          requerimientoId: t.ticketId || t.requerimientoId || '',
          notes: t.notes || t.description || '',
          raw: t
        });
      }
    });

    // 3. Visitas Programadas
    (programmedVisits || []).forEach((v, idx) => {
      const tAgentId = String(v.AgentID || v.tecnico_visita_id || '').trim();
      const assigned = String(v.tecnico_visita || v.tecnico || v.tecnico_nombre || '').trim();
      const isMatch = (tAgentId && tAgentId.toLowerCase() === agentId.toLowerCase()) ||
                      isAgentNameMatch(agentName, assigned);

      if (isMatch) {
        const rawStatus = String(v.estado_visita || v.estado || v.status || '').trim();
        let status: 'Completado' | 'En proceso' | 'Pendiente' = 'Pendiente';
        if (isStatusResolved(rawStatus)) {
          status = 'Completado';
        } else if (isStatusInProgress(rawStatus)) {
          status = 'En proceso';
        }

        const explicitSprint = String(v.sprint || v.sprint_trabajo || v['Semana Actual'] || '').trim();
        const date = String(v.fecha_visita || v.timestamp_cierre || v.fecha || '').trim();
        const { isCurrentSprint, displaySprint } = evaluateItemSprint(v, date, explicitSprint, status);

        items.push({
          id: String(v.id || v.ID || v.id_registro_visita || `VIS-${idx + 1}`).trim(),
          category: 'Visita',
          title: `Visita Técnica - ${v.cliente || v.requerimiento_id || 'Terreno'}`,
          detail: v.comentario_visita || v.motivo || v.direccion_visita || 'Visita programada en terreno',
          clientOrLocation: v.direccion_visita || v.cliente || 'Dirección de cliente',
          status,
          rawStatus,
          priority: 'Normal',
          sprint: displaySprint,
          date,
          isCurrentSprint,
          requerimientoId: v.requerimiento_id || '',
          notes: v.comentario_visita || '',
          raw: v
        });
      }
    });

    return items;
  }, [collaborations, programmedVisits, internalTasks, contractorTasks, selectedAgent, activeSystemSprint, availableSprints]);

  // Combined All Available Sprints
  const allAvailableSprints = useMemo(() => {
    const sprintSet = new Set<string>(availableSprints);
    if (activeSystemSprint) sprintSet.add(activeSystemSprint);

    historicalRows.forEach(r => {
      const s = String(r.sprint_trabajo || r['Semana Actual'] || r.sprint || '').trim();
      if (s && s !== 'undefined') sprintSet.add(s);
    });

    agentOpsItems.forEach(item => {
      if (item.sprint && item.sprint !== 'Sprint Anterior' && !item.sprint.startsWith('Sprint Anterior (')) {
        sprintSet.add(item.sprint);
      }
    });

    return sortSprintsDescending(Array.from(sprintSet).filter(Boolean));
  }, [availableSprints, activeSystemSprint, historicalRows, agentOpsItems]);

  // Filtered operational items
  const activeScopeOpsItems = useMemo(() => {
    return agentOpsItems.filter(item => {
      // Sprint filter
      if (opsSprintFilterMode === 'current') {
        if (!item.isCurrentSprint && item.sprint.toLowerCase().trim() !== activeSystemSprint.toLowerCase().trim()) {
          return false;
        }
      } else if (opsSprintFilterMode === 'previous') {
        if (item.isCurrentSprint || item.sprint.toLowerCase().trim() === activeSystemSprint.toLowerCase().trim()) {
          return false;
        }
      } else {
        // Specific sprint selected
        const filterTarget = opsSprintFilterMode.toLowerCase().trim();
        const itemSprint = item.sprint.toLowerCase().trim();
        const matchesSprint = itemSprint === filterTarget || checkSprintMatch(item.raw, opsSprintFilterMode);
        if (!matchesSprint) return false;
      }

      // Category filter
      if (opsCategoryFilter !== 'Todos' && item.category !== opsCategoryFilter) {
        return false;
      }

      // Status filter
      if (opsStatusFilter !== 'Todos' && item.status !== opsStatusFilter) {
        return false;
      }

      // Search filter
      if (opsSearchQuery.trim()) {
        const q = opsSearchQuery.toLowerCase().trim();
        const textToSearch = `${item.id} ${item.title} ${item.detail} ${item.clientOrLocation} ${item.category} ${item.sprint} ${item.date} ${item.requerimientoId || ''} ${item.notes || ''}`.toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [agentOpsItems, opsSprintFilterMode, activeSystemSprint, opsCategoryFilter, opsStatusFilter, opsSearchQuery]);

  // Operational KPIs
  const opsKpis = useMemo(() => {
    const completed = activeScopeOpsItems.filter(i => i.status === 'Completado').length;
    const inProgress = activeScopeOpsItems.filter(i => i.status === 'En proceso').length;
    const pending = activeScopeOpsItems.filter(i => i.status === 'Pendiente').length;
    const assigned = inProgress + pending;
    const totalScope = completed + assigned;
    const efficiency = totalScope > 0 ? Math.round((completed / totalScope) * 100) : 100;

    const escalacionesCount = activeScopeOpsItems.filter(i => i.category === 'Escalación' && i.status === 'Completado').length;
    const tareasCount = activeScopeOpsItems.filter(i => i.category === 'Tarea' && i.status === 'Completado').length;
    const visitasCount = activeScopeOpsItems.filter(i => i.category === 'Visita' && i.status === 'Completado').length;

    return {
      assigned,
      totalScope,
      completed,
      inProgress,
      pending,
      escalacionesCount,
      tareasCount,
      visitasCount,
      efficiency
    };
  }, [activeScopeOpsItems]);

  const OPS_PER_PAGE = 10;
  const totalOpsPages = Math.ceil(activeScopeOpsItems.length / OPS_PER_PAGE) || 1;
  const currentOpsPageNumber = Math.min(Math.max(1, opsCurrentPage), totalOpsPages);

  const paginatedOpsItems = useMemo(() => {
    const start = (currentOpsPageNumber - 1) * OPS_PER_PAGE;
    return activeScopeOpsItems.slice(start, start + OPS_PER_PAGE);
  }, [activeScopeOpsItems, currentOpsPageNumber]);

  // -------------------------------------------------------------
  // Real-time Adherencia & Asistencia States for Selected Agent
  // -------------------------------------------------------------
  const [asistenciaRows, setAsistenciaRows] = useState<AsistenciaRow[]>([]);
  const [ausenciaRows, setAusenciaRows] = useState<AusenciaRow[]>([]);
  const [jornadasRows, setJornadasRows] = useState<JornadaRow[]>([]);

  const [adherenceSprintFilterMode, setAdherenceSprintFilterMode] = useState<'current' | 'previous' | string>('current');
  const [adherenceStatusFilter, setAdherenceStatusFilter] = useState<'Todos' | 'A Tiempo' | 'Tardanzas' | 'Faltas / Ausencias' | 'Visitas'>('Todos');
  const [adherenceSearchQuery, setAdherenceSearchQuery] = useState<string>('');
  const [adherenceCurrentPage, setAdherenceCurrentPage] = useState<number>(1);

  // Subscribe to real-time asistencia, ausencias, and jornadas from Firestore
  useEffect(() => {
    if (!agents || agents.length === 0) return;
    const unsubAsistencia = subscribeToAsistencia(agents, (rows) => {
      setAsistenciaRows(rows || []);
    });
    const unsubAusencias = subscribeToAusencias((rows) => {
      setAusenciaRows(rows || []);
    });
    const unsubJornadas = subscribeToJornadas((rows) => {
      setJornadasRows(rows || []);
    });
    return () => {
      if (unsubAsistencia) unsubAsistencia();
      if (unsubAusencias) unsubAusencias();
      if (unsubJornadas) unsubJornadas();
    };
  }, [agents]);

  // Reset adherence pagination on filter changes
  useEffect(() => {
    setAdherenceCurrentPage(1);
  }, [selectedAgent.id, adherenceSprintFilterMode, adherenceStatusFilter, adherenceSearchQuery, activeTab]);

  // Day Name Helper
  const getSpanishDayName = (dateStr: string): string => {
    if (!dateStr || dateStr.length < 10) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return days[dateObj.getDay()];
      }
    } catch (e) {
      // fallback
    }
    return '';
  };

  // Helper to determine exact expected check-in based on agent's weekly schedule (Jornada)
  const getAgentExpectedCheckIn = (
    agentId: string,
    agentName: string,
    fecha: string,
    jornadasList: JornadaRow[],
    fallbackExpected?: string
  ): string => {
    if (!fecha) return fallbackExpected || '08:00';
    const normId = (agentId || '').toLowerCase().trim();
    const normName = (agentName || '').toLowerCase().trim();

    // Find agent jornada row
    const jRow = (jornadasList || []).find(j => 
      (j.idAgente && j.idAgente.toLowerCase().trim() === normId) ||
      (j.nombreAgente && j.nombreAgente.toLowerCase().trim() === normName)
    ) || DEFAULT_JORNADAS.find(j => 
      (j.idAgente && j.idAgente.toLowerCase().trim() === normId) ||
      (j.nombreAgente && j.nombreAgente.toLowerCase().trim() === normName)
    );

    const dayName = getSpanishDayName(fecha); // 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'

    if (jRow && dayName) {
      const jKey = dayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const shiftStr = (jRow as any)[jKey];
      if (shiftStr) {
        const shiftLower = shiftStr.toLowerCase();
        if (shiftLower.includes('remoto')) {
          return 'Remoto';
        }
        if (shiftLower.includes('libre')) {
          return 'Libre';
        }
        if (shiftStr.includes(' - ')) {
          const start = shiftStr.split(' - ')[0].trim();
          if (jRow.diaRemoto && jRow.diaRemoto.toLowerCase().includes(dayName.toLowerCase())) {
            return 'Remoto';
          }
          return start;
        }
      }
      if (jRow.diaRemoto && jRow.diaRemoto.toLowerCase().includes(dayName.toLowerCase())) {
        return 'Remoto';
      }
    }

    if (dayName === 'Sábado' || dayName === 'Domingo') {
      return 'Libre';
    }

    if (fallbackExpected && fallbackExpected !== '08:00' && fallbackExpected !== '--:--' && fallbackExpected !== 'N/A') {
      return fallbackExpected;
    }

    return '08:00';
  };

  // Check-In Deviation Helper
  const getDeviationLabel = (checkIn: string, expectedCheckIn: string, estado: string) => {
    const st = (estado || '').toLowerCase();
    if (expectedCheckIn === 'Libre' || st.includes('libre')) {
      return 'Día Libre';
    }
    if (!checkIn || checkIn === '--:--' || checkIn === 'N/A') {
      if (st.includes('permiso') || st.includes('vacaciones') || st.includes('ausencia') || st.includes('licencia') || st.includes('justificado')) return 'Ausencia Justificada';
      if (st.includes('inasistencia') || st.includes('falta') || st.includes('ausente')) return 'Sin Check-in (Inasistencia)';
      if (st.includes('visita') || st.includes('campo') || st.includes('terreno')) return 'En Terreno';
      return 'Sin Check-in (Inasistencia)';
    }
    if (!expectedCheckIn || expectedCheckIn === '--:--' || expectedCheckIn === 'N/A' || expectedCheckIn === 'Remoto' || expectedCheckIn === 'Libre') {
      return 'Registrado';
    }
    try {
      const [cH, cM] = checkIn.split(':').map(Number);
      const [eH, eM] = expectedCheckIn.split(':').map(Number);
      if (!isNaN(cH) && !isNaN(cM) && !isNaN(eH) && !isNaN(eM)) {
        const checkInMinutes = cH * 60 + cM;
        const expectedMinutes = eH * 60 + eM;
        const diff = checkInMinutes - expectedMinutes;
        if (diff <= 0) {
          return `${Math.abs(diff)} min temprano`;
        } else if (diff <= 5) {
          return 'A tiempo';
        } else {
          return `+${diff} min retardo`;
        }
      }
    } catch (e) {
      // fallback
    }
    return estado;
  };

  // Comprehensive List of Adherence Items for Selected Agent
  const agentAdherenceItems = useMemo(() => {
    if (!selectedAgent) return [];

    const itemsMap = new Map<string, any>();
    const agentId = selectedAgent.id.toLowerCase().trim();
    const agentName = selectedAgent.name.toLowerCase().trim();

    // 1. From selectedAgent.xpBreakdown.attendanceDetail
    if (selectedAgent.xpBreakdown?.attendanceDetail) {
      selectedAgent.xpBreakdown.attendanceDetail.forEach((att: any, idx: number) => {
        const fecha = att.fecha || `RECORD-${idx}`;
        const rawCheckIn = att.checkIn || '--:--';
        const hasValidCheckIn = rawCheckIn && rawCheckIn !== '--:--' && rawCheckIn !== 'N/A' && String(rawCheckIn).trim() !== '';

        let finalEstado = att.estado || 'Presente';
        let finalPoints = att.points ?? (hasValidCheckIn ? 10 : -15);

        const isJustifiedAbsence = 
          finalEstado.toLowerCase().includes('permiso') || 
          finalEstado.toLowerCase().includes('vacaciones') || 
          finalEstado.toLowerCase().includes('licencia') || 
          finalEstado.toLowerCase().includes('justificado') || 
          finalEstado.toLowerCase().includes('libre');

        const isExplicitInasistencia = 
          finalEstado.toLowerCase().includes('inasistencia') || 
          finalEstado.toLowerCase().includes('ausente') || 
          finalEstado.toLowerCase().includes('falta');

        if (isExplicitInasistencia || (!hasValidCheckIn && !isJustifiedAbsence)) {
          finalEstado = 'Inasistencia';
          finalPoints = -15;
        }

        const expCheckIn = getAgentExpectedCheckIn(
          selectedAgent.id,
          selectedAgent.name,
          att.fecha,
          jornadasRows,
          att.expectedCheckIn
        );

        if (hasValidCheckIn && !isJustifiedAbsence && expCheckIn && expCheckIn.includes(':') && expCheckIn !== 'Remoto' && expCheckIn !== 'Libre') {
          try {
            const [cH, cM] = rawCheckIn.split(':').map(Number);
            const [eH, eM] = expCheckIn.split(':').map(Number);
            if (!isNaN(cH) && !isNaN(cM) && !isNaN(eH) && !isNaN(eM)) {
              const diff = (cH * 60 + cM) - (eH * 60 + eM);
              if (diff > 0) {
                finalEstado = 'Tardanza';
              } else if (diff === 0 && finalEstado.toLowerCase() === 'presente') {
                finalEstado = 'A Tiempo';
              }
            }
          } catch (e) {
            // fallback
          }
        }

        itemsMap.set(fecha, {
          id: `att-${fecha}`,
          fecha: att.fecha || '',
          checkIn: rawCheckIn,
          checkOut: '--:--',
          expectedCheckIn: expCheckIn,
          estado: finalEstado,
          points: finalPoints,
          motivo: '',
          source: 'xpBreakdown'
        });
      });
    }

    // 2. From realtimeAsistencia (higher priority over default breakdown)
    (asistenciaRows || []).forEach((row: AsistenciaRow) => {
      const rId = String(row.idAgente || '').toLowerCase().trim();
      const rName = String(row.nombreAgente || '').toLowerCase().trim();
      if (rId === agentId || (rName && rName === agentName)) {
        const fecha = row.fecha;
        if (fecha) {
          const existing = itemsMap.get(fecha) || {};
          const rawCheckIn = row.checkIn || existing.checkIn || '--:--';
          const hasValidCheckIn = rawCheckIn && rawCheckIn !== '--:--' && rawCheckIn !== 'N/A' && String(rawCheckIn).trim() !== '';

          let rowEstado = row.estado || existing.estado || 'Inasistencia';
          let rowPoints = existing.points ?? (hasValidCheckIn ? 10 : -15);

          const isJustifiedAbsence = 
            rowEstado.toLowerCase().includes('permiso') || 
            rowEstado.toLowerCase().includes('vacaciones') || 
            rowEstado.toLowerCase().includes('licencia') || 
            rowEstado.toLowerCase().includes('justificado') || 
            rowEstado.toLowerCase().includes('libre');

          const isExplicitInasistencia = 
            rowEstado.toLowerCase().includes('inasistencia') || 
            rowEstado.toLowerCase().includes('ausente') || 
            rowEstado.toLowerCase().includes('falta');

          if (isExplicitInasistencia || (!hasValidCheckIn && !isJustifiedAbsence)) {
            rowEstado = 'Inasistencia';
            rowPoints = -15;
          }

          const expCheckIn = getAgentExpectedCheckIn(
            selectedAgent.id,
            selectedAgent.name,
            row.fecha,
            jornadasRows,
            existing.expectedCheckIn
          );

          if (hasValidCheckIn && !isJustifiedAbsence && expCheckIn && expCheckIn.includes(':') && expCheckIn !== 'Remoto' && expCheckIn !== 'Libre') {
            try {
              const [cH, cM] = rawCheckIn.split(':').map(Number);
              const [eH, eM] = expCheckIn.split(':').map(Number);
              if (!isNaN(cH) && !isNaN(cM) && !isNaN(eH) && !isNaN(eM)) {
                const diff = (cH * 60 + cM) - (eH * 60 + eM);
                if (diff > 0) {
                  rowEstado = 'Tardanza';
                } else if (diff === 0 && rowEstado.toLowerCase() === 'presente') {
                  rowEstado = 'A Tiempo';
                }
              }
            } catch (e) {
              // fallback
            }
          }

          itemsMap.set(fecha, {
            id: row.id || `asist-${fecha}`,
            fecha: row.fecha,
            checkIn: rawCheckIn,
            checkOut: row.checkOut || existing.checkOut || '--:--',
            expectedCheckIn: expCheckIn,
            estado: rowEstado,
            points: rowPoints,
            motivo: existing.motivo || '',
            source: 'asistencia'
          });
        }
      }
    });

    // 3. From realtimeAusencias
    (ausenciaRows || []).forEach((aus: AusenciaRow) => {
      const aId = String(aus.idAgente || '').toLowerCase().trim();
      const aName = String(aus.nombreAgente || '').toLowerCase().trim();
      if (aId === agentId || (aName && aName === agentName)) {
        const key = aus.fechaInicio;
        if (key) {
          itemsMap.set(key, {
            id: aus.idSolicitud || `aus-${key}`,
            fecha: key,
            fechaFin: aus.fechaFin || key,
            checkIn: '--:--',
            checkOut: '--:--',
            expectedCheckIn: 'N/A',
            estado: aus.tipo || 'Permiso',
            points: 0,
            motivo: aus.motivo || aus.notas || 'Ausencia/Permiso',
            source: 'ausencia'
          });
        }
      }
    });

    // Process sprint mapping
    const list = Array.from(itemsMap.values()).map(item => {
      const dateStr = item.fecha;
      let isCurrentSprint = false;
      let displaySprint = 'Sprint Anterior';

      if (dateStr) {
        isCurrentSprint = isDateInActiveWeek(dateStr, activeSystemSprint);
        if (isCurrentSprint) {
          displaySprint = activeSystemSprint || 'Sprint Actual';
        } else {
          const matchedSprint = allAvailableSprints.find(s => isDateInActiveWeek(dateStr, s));
          if (matchedSprint) {
            displaySprint = matchedSprint;
          } else {
            displaySprint = `Sprint Anterior (${dateStr.substring(0, 7)})`;
          }
        }
      }

      return {
        ...item,
        sprint: displaySprint,
        isCurrentSprint
      };
    });

    return list.sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
  }, [selectedAgent, asistenciaRows, ausenciaRows, activeSystemSprint, allAvailableSprints]);

  // Filtered Adherence Items based on Sprint, Category & Search
  const filteredAdherenceItems = useMemo(() => {
    return agentAdherenceItems.filter(item => {
      // Sprint Filter
      if (adherenceSprintFilterMode === 'current') {
        if (!item.isCurrentSprint && item.sprint.toLowerCase().trim() !== activeSystemSprint.toLowerCase().trim()) {
          return false;
        }
      } else if (adherenceSprintFilterMode === 'previous') {
        if (item.isCurrentSprint || item.sprint.toLowerCase().trim() === activeSystemSprint.toLowerCase().trim()) {
          return false;
        }
      } else {
        const filterTarget = adherenceSprintFilterMode.toLowerCase().trim();
        const itemSprint = item.sprint.toLowerCase().trim();
        const matches = itemSprint === filterTarget || checkSprintMatch({ fecha: item.fecha }, adherenceSprintFilterMode);
        if (!matches) return false;
      }

      // Status Filter
      if (adherenceStatusFilter !== 'Todos') {
        const st = item.estado.toLowerCase();
        if (adherenceStatusFilter === 'A Tiempo' && !(st.includes('presente') || st.includes('tiempo') || st.includes('temprano'))) return false;
        if (adherenceStatusFilter === 'Tardanzas' && !(st.includes('tardanza') || st.includes('demora') || st.includes('atraso'))) return false;
        if (adherenceStatusFilter === 'Faltas / Ausencias' && !(st.includes('falta') || st.includes('inasistencia') || st.includes('permiso') || st.includes('ausencia') || st.includes('vacaciones'))) return false;
        if (adherenceStatusFilter === 'Visitas' && !(st.includes('visita') || st.includes('campo') || st.includes('terreno'))) return false;
      }

      // Search Query Filter
      if (adherenceSearchQuery.trim()) {
        const q = adherenceSearchQuery.toLowerCase().trim();
        const textToSearch = `${item.fecha} ${item.checkIn} ${item.expectedCheckIn} ${item.estado} ${item.motivo || ''} ${item.sprint}`.toLowerCase();
        if (!textToSearch.includes(q)) return false;
      }

      return true;
    });
  }, [agentAdherenceItems, adherenceSprintFilterMode, activeSystemSprint, adherenceStatusFilter, adherenceSearchQuery]);

  // Adherence Statistics for Current Sprint View Scope
  const adherenceStats = useMemo(() => {
    const itemsInScope = agentAdherenceItems.filter(item => {
      if (adherenceSprintFilterMode === 'current') {
        return item.isCurrentSprint || item.sprint.toLowerCase().trim() === activeSystemSprint.toLowerCase().trim();
      } else if (adherenceSprintFilterMode === 'previous') {
        return !item.isCurrentSprint && item.sprint.toLowerCase().trim() !== activeSystemSprint.toLowerCase().trim();
      } else {
        const filterTarget = adherenceSprintFilterMode.toLowerCase().trim();
        const itemSprint = item.sprint.toLowerCase().trim();
        return itemSprint === filterTarget || checkSprintMatch({ fecha: item.fecha }, adherenceSprintFilterMode);
      }
    });

    const total = itemsInScope.length;
    let onTimeCount = 0;
    let lateCount = 0;
    let missingCount = 0;
    let visitCount = 0;
    let absenceCount = 0;
    let totalPoints = 0;

    itemsInScope.forEach(item => {
      const st = item.estado.toLowerCase();
      totalPoints += item.points || 0;

      if (st.includes('presente') || st.includes('tiempo') || st.includes('temprano')) {
        onTimeCount++;
      } else if (st.includes('tardanza') || st.includes('demora') || st.includes('atraso')) {
        lateCount++;
      } else if (st.includes('falta') || st.includes('inasistencia')) {
        missingCount++;
      } else if (st.includes('visita') || st.includes('campo') || st.includes('terreno')) {
        visitCount++;
      } else if (st.includes('permiso') || st.includes('vacaciones') || st.includes('ausencia') || st.includes('licencia') || st.includes('justificado')) {
        absenceCount++;
      } else {
        onTimeCount++;
      }
    });

    const compliantCount = onTimeCount + visitCount + absenceCount;
    const rate = total > 0 ? Math.round((compliantCount / total) * 100) : 100;

    return {
      total,
      onTimeCount,
      lateCount,
      missingCount,
      visitCount,
      absenceCount,
      rate,
      totalPoints
    };
  }, [agentAdherenceItems, adherenceSprintFilterMode, activeSystemSprint]);

  const ADHERENCE_PER_PAGE = 10;
  const totalAdherencePages = Math.ceil(filteredAdherenceItems.length / ADHERENCE_PER_PAGE) || 1;
  const currentAdherencePageNumber = Math.min(Math.max(1, adherenceCurrentPage), totalAdherencePages);

  const paginatedAdherenceItems = useMemo(() => {
    const start = (currentAdherencePageNumber - 1) * ADHERENCE_PER_PAGE;
    return filteredAdherenceItems.slice(start, start + ADHERENCE_PER_PAGE);
  }, [filteredAdherenceItems, currentAdherencePageNumber]);

  // Attendance stats
  const attendanceStats = useMemo(() => {
    const bd = selectedAgent.xpBreakdown;
    const early = bd?.earlyCheckIns || 0;
    const onTime = bd?.onTimeCheckIns || 0;
    const grace = bd?.graceCheckIns || 0;
    const late = bd?.lateCheckIns || 0;
    const missing = bd?.missingCheckIns || 0;
    const total = early + onTime + grace + late + missing;
    const positive = early + onTime + grace;
    const rate = total > 0 ? Math.round((positive / total) * 100) : 100;
    const score = bd?.attendanceScore ?? 100;

    return { early, onTime, grace, late, missing, total, rate, score };
  }, [selectedAgent]);

  const skills = activeProfile.skills;
  const specialties = activeProfile.specialties;

  const subKey = `profiles_${activeTab}`;
  const isSubBlocked = comingSoonConfig && !!comingSoonConfig[subKey];

  // Evaluations History List
  const evaluationsList = useMemo(() => {
    if (selectedAgent.evaluationsHistory && selectedAgent.evaluationsHistory.length > 0) {
      return selectedAgent.evaluationsHistory;
    }

    const evalEvents = (selectedAgent.xpEvents || []).filter(ev => ev.type === 'eval');
    if (evalEvents.length > 0) {
      return evalEvents.map((ev, idx) => {
        if (ev.evalData) return ev.evalData;
        
        let m = {
          mantener: `Mantiene una alta consistencia operativa y calidad de atención en su rutina diaria.`,
          iniciar: 'Iniciar el registro continuo en bitácora de turno y participación activa en calibraciones.',
          mejorar: `Optimizar tiempos de atención y diagnóstico inicial en la dimensión de ${getDimensionLabel(lowestDimensionKey)}.`,
          omitir: 'Omitir el cierre prematuro de casos sin la confirmación explícita del usuario.'
        };

        if (ev.description && ev.description.includes('MIMO:')) {
          const parts = ev.description.split('MIMO:');
          if (parts[1]) {
            m.mantener = parts[1].replace(/\[M\]:\s*/, '').trim();
          }
        }

        return {
          id: ev.id,
          agentId: selectedAgent.id,
          evalNumber: evalEvents.length - idx,
          date: ev.date || 'Reciente',
          scores: selectedAgent.dimensionScores,
          mimo: m,
          xpYield: ev.xpYield || 60,
          evaluator: 'Admin / Calibrador Senior',
          title: ev.title || `Evaluación Formal #${evalEvents.length - idx}`
        };
      });
    }

    if ((selectedAgent.evaluationsCount || 0) > 0) {
      const evCount = selectedAgent.evaluationsCount || 1;
      return Array.from({ length: evCount }).map((_, idx) => {
        const num = evCount - idx;
        return {
          id: `default_eval_${selectedAgent.id}_${num}`,
          agentId: selectedAgent.id,
          evalNumber: num,
          date: num === 1 ? 'Calibración Reciente' : `Evaluación Semana #${num}`,
          scores: selectedAgent.dimensionScores,
          mimo: {
            mantener: `Demuestra fortaleza en atención al cliente, rigor técnico y apego a los procesos del área.`,
            iniciar: `Iniciar la documentación activa de soluciones técnicas recurrentes en la base de conocimientos.`,
            mejorar: `Perfeccionar el diagnóstico inicial para incrementar la resolución en primer contacto (FCR).`,
            omitir: `Omitir categorizaciones genéricas y demoras en el registro de seguimiento.`
          },
          xpYield: Math.round(
            (((selectedAgent.dimensionScores.knowledge || 0) +
              (selectedAgent.dimensionScores.execution || 0) +
              (selectedAgent.dimensionScores.relational || 0) +
              (selectedAgent.dimensionScores.collaborative || 0) +
              (selectedAgent.dimensionScores.control || 0)) / 5) * 0.8
          ),
          evaluator: 'Admin / Calibrador Senior',
          title: `Evaluación Formal #${num}`
        };
      });
    }

    return [];
  }, [selectedAgent, lowestDimensionKey]);

  // Pagination for evaluations list (max 10 items per page)
  const EVALS_PER_PAGE = 10;
  const totalEvalPages = Math.ceil(evaluationsList.length / EVALS_PER_PAGE) || 1;
  const currentEvalPage = Math.min(Math.max(1, evalCurrentPage), totalEvalPages);

  const paginatedEvaluations = useMemo(() => {
    const start = (currentEvalPage - 1) * EVALS_PER_PAGE;
    return evaluationsList.slice(start, start + EVALS_PER_PAGE);
  }, [evaluationsList, currentEvalPage]);

  // Overall Evaluation Stats (handles critical failures & nullifications)
  const evaluationSummaryStats = useMemo(() => {
    if (evaluationsList.length === 0) {
      const sc = selectedAgent.dimensionScores || { knowledge: 80, execution: 80, relational: 80, collaborative: 80, control: 80 };
      const avg = Math.round(((sc.knowledge || 0) + (sc.execution || 0) + (sc.relational || 0) + (sc.collaborative || 0) + (sc.control || 0)) / 5);
      return {
        avgScore: avg,
        hasCriticalFail: false,
        criticalCount: 0,
        evalCount: 0,
        statusText: avg >= 85 ? 'Sobresaliente' : avg >= 70 ? 'Bien' : avg >= 50 ? 'En Desarrollo' : 'Necesita Mejora',
        statusColor: avg >= 85 ? 'emerald' : avg >= 70 ? 'indigo' : avg >= 50 ? 'amber' : 'rose'
      };
    }

    let hasCritical = false;
    let criticalCount = 0;
    let sumScores = 0;

    evaluationsList.forEach(ev => {
      const isCrit = Boolean(ev.isCriticalFail || (ev.criticalFaultsApplied && ev.criticalFaultsApplied.length > 0));
      if (isCrit) {
        hasCritical = true;
        criticalCount += (ev.criticalFaultsApplied?.length || 1);
        const overrideVal = ev.finalScoreOverride ?? -(ev.criticalPenaltyPct || 100);
        sumScores += overrideVal;
      } else {
        const sc = ev.scores || { knowledge: 80, execution: 80, relational: 80, collaborative: 80, control: 80 };
        const k = (sc.knowledge ?? 25) <= 25 ? 80 : sc.knowledge;
        const e = (sc.execution ?? 25) <= 25 ? 80 : sc.execution;
        const r = (sc.relational ?? 25) <= 25 ? 80 : sc.relational;
        const c1 = (sc.collaborative ?? 25) <= 25 ? 80 : sc.collaborative;
        const c2 = (sc.control ?? 25) <= 25 ? 80 : sc.control;
        sumScores += Math.round((k + e + r + c1 + c2) / 5);
      }
    });

    const globalAvg = Math.round(sumScores / evaluationsList.length);

    let statusText = 'Sobresaliente';
    let statusColor = 'emerald';

    if (hasCritical) {
      statusText = 'Anulada / Infracción Crítica';
      statusColor = 'rose';
    } else if (globalAvg >= 85) {
      statusText = 'Sobresaliente';
      statusColor = 'emerald';
    } else if (globalAvg >= 70) {
      statusText = 'Bien';
      statusColor = 'indigo';
    } else if (globalAvg >= 50) {
      statusText = 'En Desarrollo';
      statusColor = 'amber';
    } else {
      statusText = 'Necesita Mejora';
      statusColor = 'rose';
    }

    return {
      avgScore: globalAvg,
      hasCriticalFail: hasCritical,
      criticalCount,
      evalCount: evaluationsList.length,
      statusText,
      statusColor
    };
  }, [evaluationsList, selectedAgent]);

  // Filter tasks for the Backlog view
  const filteredTasks = useMemo(() => {
    if (taskFilter === 'Todos') return agentTasks;
    return agentTasks.filter(t => t.status === taskFilter);
  }, [agentTasks, taskFilter]);

  return (
    <div className="flex-grow flex flex-col gap-6 font-sans text-slate-200 w-full" id="agent-profile-view">
      
      {/* Selector Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 rounded-xl">
            <span className="material-symbols-outlined text-indigo-400">badge</span>
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg text-white leading-tight">
              {isUserRole ? 'Mi Expediente Profesional' : 'Expediente del Agente'}
            </h1>
            <p className="text-xs text-slate-400">Visión integrada de desempeño: Evaluaciones, Request Backlog y Gestión Operativa</p>
          </div>
        </div>
        
        {!isUserRole && (
          <div className="relative w-full sm:w-72">
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="appearance-none bg-slate-950 border border-slate-700 hover:border-slate-600 py-2.5 pl-4 pr-10 rounded-xl text-sm text-white font-medium focus:outline-none focus:border-indigo-500 w-full cursor-pointer transition-colors"
            >
              {agents.map(a => (
                <option key={a.id} value={a.id} className="bg-slate-900 text-slate-200">
                  {a.name} ({a.team})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none text-[20px]">
              expand_more
            </span>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-slate-800 bg-slate-900/50 rounded-t-2xl px-2 pt-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 text-sm font-medium flex items-center gap-2 relative whitespace-nowrap transition-colors ${
              activeTab === tab.id 
                ? 'text-indigo-400' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded-t-lg'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="profileTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content Container */}
      <div className="bg-transparent rounded-b-2xl min-h-[500px]">
        {isSubBlocked ? (
          <ComingSoonSubTab
            title={
              activeTab === 'resumen' ? 'Resumen 360°' :
              activeTab === 'evaluaciones' ? 'Evaluaciones y MIMO' :
              activeTab === 'backlog' ? 'Request Backlog' :
              activeTab === 'operaciones' ? 'Escalaciones, Tareas y Visitas' :
              activeTab === 'adherencia' ? 'Adherencia Operativa' :
              activeTab === 'competencias' ? 'Ficha de Competencias' :
              activeTab
            }
          />
        ) : (
          <AnimatePresence mode="wait">
          
          {/* TAB 1: RESUMEN 360° (EXECUTIVE DASHBOARD) */}
          {activeTab === 'resumen' && (
            <motion.div 
              key="resumen"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              {/* Hero Profile Card */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row gap-8 items-center shadow-md overflow-hidden relative">
                
                <div 
                  className="absolute top-0 right-0 w-[40%] h-full opacity-[0.03] pointer-events-none"
                  style={{ background: `linear-gradient(90deg, transparent, ${currentTier.colorHex})` }}
                />

                <div className="relative shrink-0 z-10">
                  <AgentAvatarLogo 
                    name={selectedAgent.name}
                    initials={selectedAgent.initials}
                    tierColor={currentTier.colorHex}
                    size="xl"
                    className="w-32 h-32 md:w-36 md:h-36 border-4 border-slate-900 shadow-xl"
                  />
                  <div 
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap border-2 border-slate-900 uppercase tracking-widest text-white-keep"
                    style={{ backgroundColor: currentTier.colorHex, color: '#ffffff' }}
                  >
                    <span className="material-symbols-outlined text-[14px]">stars</span>
                    {currentTier.badgeName}
                  </div>
                </div>

                <div className="flex-grow text-center lg:text-left z-10">
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-white mb-2">{selectedAgent.name}</h2>
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5 mb-3">
                    <span className="text-xs font-semibold text-slate-300">{selectedAgent.role}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-3 py-0.5 rounded-lg border border-indigo-500/20 uppercase tracking-wider">
                      {selectedAgent.team}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700"></span>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-0.5 rounded-lg border border-emerald-500/20 uppercase tracking-wider">
                      Ranking #{teamRanking}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    Especialista en {selectedAgent.team}. Registra un nivel de avance constante en la matriz operativa, con trazabilidad completa en evaluaciones, asignaciones y calidad de atención.
                  </p>
                </div>

                <div className="w-full lg:w-72 bg-slate-950 p-5 rounded-2xl border border-slate-800 shrink-0 z-10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-widest">Experiencia Acumulada</span>
                    {!isCapped && (
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Sig. {currentTier.maxXp.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <div className="font-display text-3xl font-bold text-white mb-2">
                    {selectedAgent.currentXp.toLocaleString()} <span className="text-sm font-normal text-slate-500">XP</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden mb-2">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${isCapped ? 100 : progressPercent}%`, backgroundColor: currentTier.colorHex }}
                    />
                  </div>
                  {!isCapped && (
                    <p className="text-[10px] text-slate-400 text-center">
                      Faltan <strong className="text-white">{xpToGo.toLocaleString()} XP</strong> para ascender de nivel
                    </p>
                  )}
                </div>
              </div>

              {/* 360° Integrated Measurement Header (The 3 Operational Pillars) */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                      <span className="material-symbols-outlined text-indigo-400">monitoring</span>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-white">Autopercepción Integrada de Desempeño (360°)</h3>
                      <p className="text-xs text-slate-400">Visión global que consolida las 3 fuentes de medición del agente en el sistema</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                    Sistema Kaizen
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Pillar 1: Evaluaciones */}
                  <div className={`p-4 rounded-2xl border flex flex-col justify-between transition-colors ${
                    evaluationSummaryStats.hasCriticalFail 
                      ? 'bg-rose-950/20 border-rose-500/40' 
                      : 'bg-slate-950 border-slate-800 hover:border-indigo-500/30'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`material-symbols-outlined text-xl ${evaluationSummaryStats.hasCriticalFail ? 'text-rose-400' : 'text-indigo-400'}`}>
                          {evaluationSummaryStats.hasCriticalFail ? 'gavel' : 'rate_review'}
                        </span>
                        <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">1. Evaluaciones</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${
                        evaluationSummaryStats.hasCriticalFail 
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' 
                          : 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20'
                      }`}>
                        {evaluationSummaryStats.evalCount} Registrada(s)
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="flex items-baseline gap-2">
                        <span className={`font-display text-3xl font-black ${
                          evaluationSummaryStats.hasCriticalFail ? 'text-rose-400' : 'text-white'
                        }`}>
                          {evaluationSummaryStats.avgScore}%
                        </span>
                        <span className="text-xs text-slate-400 font-medium">Promedio</span>
                      </div>
                      <p className={`text-[11px] font-bold mt-1 ${
                        evaluationSummaryStats.hasCriticalFail ? 'text-rose-300' : 'text-slate-300'
                      }`}>
                        Estatus: {evaluationSummaryStats.statusText}
                      </p>
                    </div>

                    <button 
                      onClick={() => setActiveTab('evaluaciones')}
                      className="mt-3 text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center justify-between pt-2 border-t border-slate-800/80"
                    >
                      <span>Ver Calibraciones y MIMO</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>

                  {/* Pillar 2: Request Backlog */}
                  <div className="bg-slate-950 border border-slate-800 hover:border-indigo-500/30 p-4 rounded-2xl flex flex-col justify-between transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl text-sky-400">inbox</span>
                        <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">2. Request Backlog</span>
                      </div>
                      <span className="px-2 py-0.5 bg-sky-500/10 text-sky-300 border border-sky-500/20 rounded text-[10px] font-black uppercase">
                        {taskStats.total} Asignados
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-3xl font-black text-white">{taskStats.efficiency}%</span>
                        <span className="text-xs text-slate-400 font-medium">Eficiencia Cierre</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-300 mt-1">
                        {taskStats.completed} Resueltos • {taskStats.inProgress} En Proceso • {taskStats.pending} Pendientes
                      </p>
                    </div>

                    <button 
                      onClick={() => setActiveTab('backlog')}
                      className="mt-3 text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center justify-between pt-2 border-t border-slate-800/80"
                    >
                      <span>Ver Carga de Requerimientos</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>

                  {/* Pillar 3: Gestión Operativa & Asistencia */}
                  <div className="bg-slate-950 border border-slate-800 hover:border-indigo-500/30 p-4 rounded-2xl flex flex-col justify-between transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-xl text-emerald-400">schedule</span>
                        <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">3. Gestión Operativa</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded text-[10px] font-black uppercase">
                        {attendanceStats.score} Pts Asistencia
                      </span>
                    </div>

                    <div className="my-2">
                      <div className="flex items-baseline gap-2">
                        <span className="font-display text-3xl font-black text-white">{attendanceStats.rate}%</span>
                        <span className="text-xs text-slate-400 font-medium">Puntualidad</span>
                      </div>
                      <p className="text-[11px] font-bold text-slate-300 mt-1">
                        Aporte Roster {selectedAgent.xpBreakdown?.aporteRes || 0}% • Foco {selectedAgent.xpBreakdown?.indiceFoco || 0}% • Eficiencia {taskStats.efficiency}%
                      </p>
                    </div>

                    <button 
                      onClick={() => setActiveTab('adherencia')}
                      className="mt-3 text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center justify-between pt-2 border-t border-slate-800/80 cursor-pointer"
                    >
                      <span>Ver Detalle de Adherencia</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown Panels */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 5 Dimensions Scores */}
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-indigo-400">radar</span>
                        Desempeño por Ejes Evaluativos (5 Dimensiones)
                      </h3>
                      <button 
                        onClick={() => setActiveTab('competencias')} 
                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300"
                      >
                        Ver Radar →
                      </button>
                    </div>

                    <div className="space-y-3.5">
                      {scoreKeys.map(key => {
                        const val = (scoresObj as any)[key] || 0;
                        return (
                          <div key={key} className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex flex-col gap-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-slate-300 font-semibold flex items-center gap-2">
                                <span className={`p-1 rounded-md border ${getDimensionColorClass(key)}`}>
                                  <span className="material-symbols-outlined text-[14px]">{getDimensionIcon(key)}</span>
                                </span>
                                {getDimensionLabel(key)}
                              </span>
                              <span className="font-mono font-bold text-white text-sm">{val}%</span>
                            </div>
                            <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${val}%`,
                                  backgroundColor: val >= 80 ? '#10b981' : val >= 60 ? '#3b82f6' : val >= 40 ? '#f59e0b' : '#ef4444'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Service Operational Performance Metrics */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col gap-4">
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-emerald-400">analytics</span>
                      Indicadores de Desempeño Operativo
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Aporte a Cierres
                        </span>
                        <span className="font-display text-2xl font-bold text-emerald-400">
                          {selectedAgent.xpBreakdown?.aporteRes || 0}%
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Del total del Roster</span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Índice de Foco
                        </span>
                        <span className="font-display text-2xl font-bold text-sky-400">
                          {selectedAgent.xpBreakdown?.indiceFoco || 0}%
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Casos en Proceso Activo</span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Eficiencia Resolución
                        </span>
                        <span className="font-display text-2xl font-bold text-amber-400">
                          {taskStats.efficiency}%
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Tasa Cierre Requerimientos</span>
                      </div>

                      <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Evaluaciones MIMO
                        </span>
                        <span className="font-display text-2xl font-bold text-indigo-400">
                          {selectedAgent.evaluationsCount || selectedAgent.evaluationsHistory?.length || 0}
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">Calibraciones de Calidad</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                      <h3 className="font-display font-bold text-sm text-white flex items-center justify-between mb-3">
                        <span>Check-Ins & Asistencia</span>
                        <span className="text-xs font-mono font-bold text-emerald-400">{attendanceStats.score} pts</span>
                      </h3>
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">A Tiempo</span>
                          <span className="font-bold text-emerald-400">{attendanceStats.onTime + attendanceStats.early}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Tardanzas</span>
                          <span className="font-bold text-amber-400">{attendanceStats.late}</span>
                        </div>
                        <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                          <span className="text-[10px] text-slate-500 block">Faltas</span>
                          <span className="font-bold text-rose-400">{attendanceStats.missing}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </motion.div>
          )}

          {/* TAB 2: EVALUACIONES Y FEEDBACK MIMO */}
          {activeTab === 'evaluaciones' && (
            <motion.div 
              key="evaluaciones"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-6"
            >
              {/* Header KPI Summary Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl">
                    <span className="material-symbols-outlined text-[28px] text-indigo-400">rate_review</span>
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-lg text-white">Historial de Evaluaciones y Feedback MIMO</h3>
                    <p className="text-xs text-slate-400">Registro oficial de calibraciones de desempeño, penalizaciones críticas y matrices de evolución</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Promedio Global</span>
                    <span className={`font-display font-bold text-lg ${
                      evaluationSummaryStats.hasCriticalFail ? 'text-rose-400' : 'text-emerald-400'
                    }`}>
                      {evaluationSummaryStats.avgScore}%
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Evaluaciones</span>
                    <span className="font-display font-bold text-lg text-indigo-400">
                      {evaluationsList.length}
                    </span>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 text-center col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Estado Global</span>
                    <span className={`font-display font-bold text-xs truncate block uppercase ${
                      evaluationSummaryStats.hasCriticalFail ? 'text-rose-400' : 'text-amber-400'
                    }`}>
                      {evaluationSummaryStats.statusText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Critical Fail Alert Banner */}
              {evaluationSummaryStats.hasCriticalFail && (
                <div className="bg-rose-950/40 border-2 border-rose-500/60 rounded-3xl p-5 shadow-lg flex items-start gap-4">
                  <div className="p-2.5 bg-rose-600 text-white rounded-2xl shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-2xl">block</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-black text-rose-300 text-base uppercase tracking-wider">
                        Atención: Evaluación Anulada por Infracción Crítica
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white">
                        {evaluationSummaryStats.criticalCount} Penalizador(es)
                      </span>
                    </div>
                    <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                      Este agente posee al menos una evaluación cuya nota sobre criterios ha sido <strong>ANULADA</strong> debido a una infracción grave del negocio. Las puntuaciones en las 5 dimensiones se conservan exclusivamente como registro de auditoría.
                    </p>
                  </div>
                </div>
              )}

              {/* Evaluations List */}
              {evaluationsList.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50">
                    <span className="material-symbols-outlined text-3xl text-slate-400">assignment_late</span>
                  </div>
                  <h4 className="font-bold text-slate-200 text-base">Sin Evaluaciones Publicadas</h4>
                  <p className="text-sm text-slate-400 max-w-md">
                    {selectedAgent.name} aún no tiene evaluaciones formales registradas. Las evaluaciones y retroalimentación MIMO publicadas por la administración aparecerán en este apartado.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 px-1">
                    <h4 className="font-display font-bold text-sm text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-400 text-lg">format_list_bulleted</span>
                      Historial de Evaluaciones ({evaluationsList.length})
                    </h4>
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm text-indigo-400">touch_app</span>
                      Haz clic en cualquier fila para abrir el detalle completo
                    </span>
                  </div>

                  {/* List Container / Table */}
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
                    {/* Header Row (Desktop) */}
                    <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 bg-slate-950/80 border-b border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                      <div className="col-span-3">Evaluación</div>
                      <div className="col-span-2">Fecha</div>
                      <div className="col-span-3">Evaluador</div>
                      <div className="col-span-2 text-center">Calificación / Estado</div>
                      <div className="col-span-2 text-right">Acción</div>
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-slate-800/80">
                      {paginatedEvaluations.map((ev, index) => {
                        const isCritical = Boolean(ev.isCriticalFail || (ev.criticalFaultsApplied && ev.criticalFaultsApplied.length > 0));
                        const sc = ev.scores || { knowledge: 80, execution: 80, relational: 80, collaborative: 80, control: 80 };
                        const k = (sc.knowledge ?? 25) <= 25 ? 80 : sc.knowledge;
                        const e = (sc.execution ?? 25) <= 25 ? 80 : sc.execution;
                        const r = (sc.relational ?? 25) <= 25 ? 80 : sc.relational;
                        const c1 = (sc.collaborative ?? 25) <= 25 ? 80 : sc.collaborative;
                        const c2 = (sc.control ?? 25) <= 25 ? 80 : sc.control;
                        const rawAvg = Math.round((k + e + r + c1 + c2) / 5);
                        const finalDisplayScore = isCritical 
                          ? (ev.finalScoreOverride ?? -(ev.criticalPenaltyPct || 100))
                          : rawAvg;

                        return (
                          <div 
                            key={ev.id || index}
                            onClick={() => setInspectingEvaluation(ev)}
                            className={`group p-4 md:px-6 md:py-4 transition-all cursor-pointer flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center ${
                              isCritical 
                                ? 'bg-rose-950/10 hover:bg-rose-950/30' 
                                : 'hover:bg-indigo-950/20'
                            }`}
                          >
                            {/* Column 1: Title & Badges */}
                            <div className="col-span-3 flex items-center gap-2.5 mb-2 md:mb-0">
                              <div className={`p-2 rounded-xl flex items-center justify-center shrink-0 ${
                                isCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/10 text-indigo-400'
                              }`}>
                                <span className="material-symbols-outlined text-lg">
                                  {isCritical ? 'gavel' : 'assignment_turned_in'}
                                </span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-sm text-slate-100 group-hover:text-indigo-300 transition-colors truncate">
                                  {ev.title || `Evaluación Formal #${ev.evalNumber || (index + 1)}`}
                                </span>
                                {isCritical && (
                                  <span className="inline-flex text-[9px] font-extrabold uppercase tracking-wider text-rose-400 font-mono">
                                    Infracción Crítica
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Column 2: Date */}
                            <div className="col-span-2 text-xs text-slate-400 font-medium flex items-center gap-1.5 mb-1 md:mb-0">
                              <span className="material-symbols-outlined text-sm text-slate-500">calendar_today</span>
                              <span>{ev.date}</span>
                            </div>

                            {/* Column 3: Evaluator */}
                            <div className="col-span-3 text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-2 md:mb-0">
                              <span className="material-symbols-outlined text-sm text-slate-500">person</span>
                              <span className="truncate">{ev.evaluator || 'Calibración Oficial'}</span>
                            </div>

                            {/* Column 4: Score & XP */}
                            <div className="col-span-2 flex items-center justify-start md:justify-center gap-2 mb-2 md:mb-0">
                              <span className={`text-xs font-bold font-mono px-2.5 py-1 rounded-lg border ${
                                isCritical 
                                  ? 'text-rose-300 bg-rose-500/20 border-rose-500/40 font-black' 
                                  : 'text-indigo-300 bg-indigo-500/15 border-indigo-500/30'
                              }`}>
                                {isCritical ? `ANULADA (${finalDisplayScore}%)` : `${rawAvg}%`}
                              </span>
                              <span className="text-xs font-bold font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg">
                                {ev.xpYield > 0 ? `+${ev.xpYield}` : ev.xpYield} XP
                              </span>
                            </div>

                            {/* Column 5: Action Button */}
                            <div className="col-span-2 flex justify-end items-center">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectingEvaluation(ev);
                                }}
                                className="w-full md:w-auto px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm group-hover:scale-105"
                              >
                                <span>Consultar</span>
                                <span className="material-symbols-outlined text-sm">open_in_new</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination Controls */}
                    {totalEvalPages > 1 && (
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3.5 bg-slate-950/80 border-t border-slate-800 text-xs text-slate-400">
                        <div>
                          Mostrando <span className="font-bold text-slate-200">{(currentEvalPage - 1) * EVALS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-200">{Math.min(currentEvalPage * EVALS_PER_PAGE, evaluationsList.length)}</span> de <span className="font-bold text-slate-200">{evaluationsList.length}</span> evaluaciones
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={currentEvalPage === 1}
                            onClick={() => setEvalCurrentPage(prev => Math.max(1, prev - 1))}
                            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                            <span>Anterior</span>
                          </button>
                          <span className="px-3 py-1.5 font-mono text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 rounded-xl">
                            {currentEvalPage} / {totalEvalPages}
                          </span>
                          <button
                            type="button"
                            disabled={currentEvalPage >= totalEvalPages}
                            onClick={() => setEvalCurrentPage(prev => Math.min(totalEvalPages, prev + 1))}
                            className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors flex items-center gap-1"
                          >
                            <span>Siguiente</span>
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Full Evaluation Detail Modal */}
              {inspectingEvaluation && selectedAgent && (
                <FullEvaluationDetailModal
                  agent={selectedAgent}
                  evaluation={inspectingEvaluation}
                  certifications={selectedAgent.certifications}
                  onClose={() => setInspectingEvaluation(null)}
                />
              )}
            </motion.div>
          )}

          {/* TAB 3: REQUEST BACKLOG DEDICADO AL AGENTE */}
          {activeTab === 'backlog' && (
            <motion.div
              key="backlog"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header & Sprint View Switcher */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-indigo-400 text-2xl">inbox</span>
                    <h3 className="font-display text-xl font-black text-white">
                      Request Backlog de {selectedAgent.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Monitoreo de carga técnica, requerimientos del sprint y registro histórico de cierres.
                  </p>
                </div>

                {/* Sprint Selector & Toggle Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-slate-950/80 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setSprintFilterMode('current')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        sprintFilterMode === 'current'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      Sprint Actual
                    </button>

                    <button
                      type="button"
                      onClick={() => setSprintFilterMode('previous')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        sprintFilterMode === 'previous'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">history</span>
                      Sprints Anteriores
                    </button>
                  </div>

                  {/* Dropdown for Specific Sprint Selection */}
                  {availableSprints.length > 0 && (
                    <select
                      value={sprintFilterMode.includes('current') || sprintFilterMode.includes('previous') ? '' : sprintFilterMode}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSprintFilterMode(e.target.value);
                        }
                      }}
                      className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-bold rounded-2xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Filtrar por Sprint Específico --</option>
                      {availableSprints.map((s, idx) => (
                        <option key={idx} value={s}>
                          {s === activeSystemSprint ? `⭐ ${s} (Sprint Activo)` : s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Indicadores Superiores / KPI Dashboard Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* 1. Total Asignados */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400">Asignados</span>
                    <span className="material-symbols-outlined text-indigo-400 text-lg">assignment</span>
                  </div>
                  <div>
                    <span className="font-display text-2xl md:text-3xl font-black text-white">{agentBacklogKpis.assigned}</span>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">En el alcance seleccionado</p>
                  </div>
                </div>

                {/* 2. Completados / Resueltos */}
                <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-emerald-700/50 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-emerald-400">Completados</span>
                    <span className="material-symbols-outlined text-emerald-400 text-lg">check_circle</span>
                  </div>
                  <div>
                    <span className="font-display text-2xl md:text-3xl font-black text-emerald-400">{agentBacklogKpis.completed}</span>
                    <p className="text-[10px] text-emerald-500/80 font-bold mt-0.5">{agentBacklogKpis.efficiency}% de éxito</p>
                  </div>
                </div>

                {/* 3. En Proceso */}
                <div className="bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-700/50 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-amber-400">En Proceso</span>
                    <span className="material-symbols-outlined text-amber-400 text-lg">hourglass_top</span>
                  </div>
                  <div>
                    <span className="font-display text-2xl md:text-3xl font-black text-amber-400">{agentBacklogKpis.inProgress}</span>
                    <p className="text-[10px] text-amber-500/80 font-medium mt-0.5">En desarrollo activo</p>
                  </div>
                </div>

                {/* 4. Pendientes */}
                <div className="bg-slate-900/90 border border-sky-900/40 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-sky-700/50 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-sky-400">Pendientes</span>
                    <span className="material-symbols-outlined text-sky-400 text-lg">pending_actions</span>
                  </div>
                  <div>
                    <span className="font-display text-2xl md:text-3xl font-black text-sky-400">{agentBacklogKpis.pending}</span>
                    <p className="text-[10px] text-sky-500/80 font-medium mt-0.5">Por iniciar atención</p>
                  </div>
                </div>

                {/* 5. Tasa de Eficiencia */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden col-span-2 md:col-span-1">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-indigo-400">Eficiencia</span>
                    <span className="material-symbols-outlined text-indigo-400 text-lg">donut_large</span>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-2xl md:text-3xl font-black text-white">{agentBacklogKpis.efficiency}%</span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">{agentBacklogKpis.totalHistoricalCompleted} Hist.</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${agentBacklogKpis.efficiency}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Filters & Search Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* Status Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                  {(['Todos', 'Pendiente', 'En proceso', 'Completado'] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatusFilterMode(st)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        statusFilterMode === st
                          ? st === 'Completado' ? 'bg-emerald-600 text-white shadow-sm'
                            : st === 'En proceso' ? 'bg-amber-600 text-white shadow-sm'
                            : st === 'Pendiente' ? 'bg-sky-600 text-white shadow-sm'
                            : 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-950/80 text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-800'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Text Search Input */}
                <div className="relative w-full sm:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Buscar ticket, cliente, ID..."
                    value={backlogSearchQuery}
                    onChange={(e) => setBacklogSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  {backlogSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setBacklogSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Requests List Table / View */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                {backlogLoading ? (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-3xl animate-spin text-indigo-400">sync</span>
                    <p className="text-xs font-medium">Sincronizando solicitudes y requerimientos en tiempo real...</p>
                  </div>
                ) : paginatedAgentRequests.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                          <th className="py-3.5 px-4">Ticket ID</th>
                          <th className="py-3.5 px-4">Requerimiento</th>
                          <th className="py-3.5 px-4">Cliente / Tipo</th>
                          <th className="py-3.5 px-4">Prioridad</th>
                          <th className="py-3.5 px-4">Sprint / Fecha</th>
                          <th className="py-3.5 px-4">Origen</th>
                          <th className="py-3.5 px-4 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {paginatedAgentRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-800/30 transition-colors group">
                            {/* Ticket ID */}
                            <td className="py-3.5 px-4 font-mono font-bold text-indigo-400 whitespace-nowrap">
                              {req.ticketId}
                            </td>

                            {/* Title & Description */}
                            <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                              <p className="font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                                {req.title}
                              </p>
                              {req.description && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                  {req.description}
                                </p>
                              )}
                            </td>

                            {/* Client & Type */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p className="font-semibold text-slate-200">{req.client || 'Sin cliente'}</p>
                              <span className="text-[10px] text-slate-500 font-mono">{req.type}</span>
                            </td>

                            {/* Priority */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  req.priority?.toLowerCase().includes('urgente')
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                    : req.priority?.toLowerCase().includes('alta')
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : req.priority?.toLowerCase().includes('media')
                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {req.priority}
                              </span>
                            </td>

                            {/* Sprint & Date */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p className="font-mono text-[11px] font-bold text-slate-300">{req.sprint}</p>
                              {req.date && <p className="text-[10px] text-slate-500">{req.date}</p>}
                            </td>

                            {/* Origen / Source */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-medium bg-slate-950 text-slate-400 border border-slate-800">
                                {req.source}
                              </span>
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span
                                className={`px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                                  req.status === 'Completado'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : req.status === 'En proceso'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    req.status === 'Completado'
                                      ? 'bg-emerald-400'
                                      : req.status === 'En proceso'
                                      ? 'bg-amber-400 animate-pulse'
                                      : 'bg-sky-400'
                                  }`}
                                />
                                {req.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-slate-600">inbox</span>
                    <p className="text-sm font-semibold text-slate-400">No se encontraron requerimientos en esta vista</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Prueba cambiando de sprint, modificando los filtros de estado o ajustando el término de búsqueda.
                    </p>
                  </div>
                )}

                {/* Pagination Controls (Max 10 items per page) */}
                {filteredAgentRequests.length > 0 && (
                  <div className="bg-slate-950/80 border-t border-slate-800 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-slate-400 font-mono">
                      Mostrando <strong className="text-white">{(currentBacklogPageNumber - 1) * BACKLOG_PER_PAGE + 1}</strong> a{' '}
                      <strong className="text-white">
                        {Math.min(currentBacklogPageNumber * BACKLOG_PER_PAGE, filteredAgentRequests.length)}
                      </strong>{' '}
                      de <strong className="text-white">{filteredAgentRequests.length}</strong> requerimientos
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setBacklogCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentBacklogPageNumber === 1}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                        Anterior
                      </button>

                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-400 px-2">
                        <span className="text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                          {currentBacklogPageNumber}
                        </span>
                        <span>/</span>
                        <span>{totalBacklogPages}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setBacklogCurrentPage((prev) => Math.min(prev + 1, totalBacklogPages))}
                        disabled={currentBacklogPageNumber >= totalBacklogPages}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 cursor-pointer transition-all flex items-center gap-1"
                      >
                        Siguiente
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: ESCALACIONES, TAREAS Y VISITAS */}
          {activeTab === 'operaciones' && (
            <motion.div
              key="operaciones"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header & Sprint View Switcher */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-indigo-400 text-2xl">engineering</span>
                    <h3 className="font-display text-xl font-black text-white">
                      Escalaciones, Tareas y Visitas de {selectedAgent.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Seguimiento integral de operaciones técnicas, asistencias especializadas y visitas de terreno en el sprint actual e históricos.
                  </p>
                </div>

                {/* Sprint Selector & Toggle Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-slate-950/80 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setOpsSprintFilterMode('current')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        opsSprintFilterMode === 'current'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      Sprint Actual
                    </button>

                    <button
                      type="button"
                      onClick={() => setOpsSprintFilterMode('previous')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        opsSprintFilterMode === 'previous'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">history</span>
                      Sprints Anteriores
                    </button>
                  </div>

                  {/* Dropdown for Specific Sprint Selection */}
                  {allAvailableSprints.length > 0 && (
                    <select
                      value={opsSprintFilterMode === 'current' || opsSprintFilterMode === 'previous' ? '' : opsSprintFilterMode}
                      onChange={(e) => {
                        if (e.target.value) {
                          setOpsSprintFilterMode(e.target.value);
                        }
                      }}
                      className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs font-bold rounded-2xl px-3 py-2 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Filtrar por Sprint Específico --</option>
                      {allAvailableSprints.map((s, idx) => (
                        <option key={idx} value={s}>
                          {s === activeSystemSprint ? `⭐ ${s} (Sprint Activo)` : s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Top KPI Dashboard Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {/* 1. Asignadas Activas */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-slate-700 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-slate-400">Asignados</span>
                    <span className="material-symbols-outlined text-indigo-400 text-lg">assignment</span>
                  </div>
                  <div>
                    <span className="font-display text-2xl md:text-3xl font-black text-white">{opsKpis.assigned}</span>
                    <p className="text-[10px] text-slate-500 font-medium mt-0.5">En el alcance seleccionado</p>
                  </div>
                </div>

                {/* 2. Escalaciones Resueltas */}
                <div className="bg-slate-900/90 border border-indigo-900/40 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-indigo-700/50 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-indigo-400">Escalaciones</span>
                    <span className="material-symbols-outlined text-indigo-400 text-lg">support_agent</span>
                  </div>
                  <div>
                    <span className="font-display text-2xl md:text-3xl font-black text-indigo-400">{opsKpis.escalacionesCount}</span>
                    <p className="text-[10px] text-indigo-500/80 font-bold mt-0.5">Atenciones completadas</p>
                  </div>
                </div>

                {/* 3. Tareas Completadas */}
                <div className="bg-slate-900/90 border border-sky-900/40 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-sky-700/50 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-sky-400">Tareas</span>
                    <span className="material-symbols-outlined text-sky-400 text-lg">task_alt</span>
                  </div>
                  <div>
                    <span className="font-display text-2xl md:text-3xl font-black text-sky-400">{opsKpis.tareasCount}</span>
                    <p className="text-[10px] text-sky-500/80 font-medium mt-0.5">Tareas finalizadas</p>
                  </div>
                </div>

                {/* 4. Visitas Cerradas */}
                <div className="bg-slate-900/90 border border-amber-900/40 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden group hover:border-amber-700/50 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-amber-400">Visitas</span>
                    <span className="material-symbols-outlined text-amber-400 text-lg">pin_drop</span>
                  </div>
                  <div>
                    <span className="font-display text-2xl md:text-3xl font-black text-amber-400">{opsKpis.visitasCount}</span>
                    <p className="text-[10px] text-amber-500/80 font-medium mt-0.5">Cierres en terreno</p>
                  </div>
                </div>

                {/* 5. Cumplimiento Operativo */}
                <div className="bg-slate-900/90 border border-emerald-900/40 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden col-span-2 md:col-span-1 group hover:border-emerald-700/50 transition-all">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-emerald-400">Cumplimiento</span>
                    <span className="material-symbols-outlined text-emerald-400 text-lg">verified</span>
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-display text-2xl md:text-3xl font-black text-emerald-400">{opsKpis.efficiency}%</span>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">{opsKpis.completed} Cierres</span>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                        style={{ width: `${opsKpis.efficiency}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col lg:flex-row items-center justify-between gap-4">
                {/* Category & Status Filter Pills */}
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                  {/* Category selector */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
                    {(['Todos', 'Escalación', 'Tarea', 'Visita'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setOpsCategoryFilter(cat)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          opsCategoryFilter === cat
                            ? cat === 'Escalación' ? 'bg-indigo-600 text-white shadow-sm'
                              : cat === 'Tarea' ? 'bg-sky-600 text-white shadow-sm'
                              : cat === 'Visita' ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Status selector */}
                  <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
                    {(['Todos', 'Pendiente', 'En proceso', 'Completado'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setOpsStatusFilter(st)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          opsStatusFilter === st
                            ? st === 'Completado' ? 'bg-emerald-600 text-white shadow-sm'
                              : st === 'En proceso' ? 'bg-amber-600 text-white shadow-sm'
                              : st === 'Pendiente' ? 'bg-sky-600 text-white shadow-sm'
                              : 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Text Search Input */}
                <div className="relative w-full lg:w-72">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por ID, asunto, cliente..."
                    value={opsSearchQuery}
                    onChange={(e) => setOpsSearchQuery(e.target.value)}
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                  />
                  {opsSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setOpsSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Operational Items Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-sm">
                {paginatedOpsItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] font-bold font-mono text-slate-400 uppercase tracking-wider">
                          <th className="py-3.5 px-4">Tipo / ID</th>
                          <th className="py-3.5 px-4">Asunto / Detalle</th>
                          <th className="py-3.5 px-4">Ubicación / Contexto</th>
                          <th className="py-3.5 px-4">Prioridad</th>
                          <th className="py-3.5 px-4">Sprint / Fecha</th>
                          <th className="py-3.5 px-4 text-right">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-xs">
                        {paginatedOpsItems.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-800/30 transition-colors group">
                            {/* Type Badge & ID */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider inline-flex items-center gap-1 ${
                                  item.category === 'Escalación'
                                    ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                                    : item.category === 'Tarea'
                                    ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[13px]">
                                  {item.category === 'Escalación' ? 'support_agent' : item.category === 'Tarea' ? 'task_alt' : 'pin_drop'}
                                </span>
                                {item.category}
                              </span>
                              <p className="font-mono text-[11px] text-slate-400 font-bold mt-1">{item.id}</p>
                            </td>

                            {/* Title & Detail */}
                            <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                              <p className="font-bold text-white line-clamp-1 group-hover:text-indigo-300 transition-colors">
                                {item.title}
                              </p>
                              {item.detail && (
                                <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                                  {item.detail}
                                </p>
                              )}
                            </td>

                            {/* Location / Context */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p className="font-semibold text-slate-200">{item.clientOrLocation}</p>
                              {item.requerimientoId && (
                                <span className="text-[10px] text-slate-500 font-mono">Req: {item.requerimientoId}</span>
                              )}
                            </td>

                            {/* Priority */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                                  item.priority?.toLowerCase().includes('urgente')
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                    : item.priority?.toLowerCase().includes('alta')
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : item.priority?.toLowerCase().includes('media')
                                    ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                                }`}
                              >
                                {item.priority}
                              </span>
                            </td>

                            {/* Sprint & Date */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <p className="font-mono text-[11px] font-bold text-slate-300">{item.sprint}</p>
                              {item.date && <p className="text-[10px] text-slate-500">{item.date}</p>}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              <span
                                className={`px-3 py-1 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 ${
                                  item.status === 'Completado'
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : item.status === 'En proceso'
                                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    item.status === 'Completado'
                                      ? 'bg-emerald-400'
                                      : item.status === 'En proceso'
                                      ? 'bg-amber-400 animate-pulse'
                                      : 'bg-sky-400'
                                  }`}
                                />
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-4xl text-slate-600">engineering</span>
                    <p className="text-sm font-semibold text-slate-400">No se encontraron operaciones registradas para este agente</p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      Prueba cambiando el filtro de sprint, seleccionando otra categoría o modificando el término de búsqueda.
                    </p>
                  </div>
                )}

                {/* Pagination Controls */}
                {activeScopeOpsItems.length > 0 && (
                  <div className="bg-slate-950/80 border-t border-slate-800 p-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-xs text-slate-400 font-mono">
                      Mostrando <strong className="text-white">{(currentOpsPageNumber - 1) * OPS_PER_PAGE + 1}</strong> a{' '}
                      <strong className="text-white">
                        {Math.min(currentOpsPageNumber * OPS_PER_PAGE, activeScopeOpsItems.length)}
                      </strong>{' '}
                      de <strong className="text-white">{activeScopeOpsItems.length}</strong> operaciones
                    </p>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOpsCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentOpsPageNumber === 1}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                        Anterior
                      </button>

                      <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-400 px-2">
                        <span className="text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
                          {currentOpsPageNumber}
                        </span>
                        <span>/</span>
                        <span>{totalOpsPages}</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setOpsCurrentPage((prev) => Math.min(prev + 1, totalOpsPages))}
                        disabled={currentOpsPageNumber >= totalOpsPages}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 cursor-pointer transition-all flex items-center gap-1"
                      >
                        Siguiente
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 5: ADHERENCIA OPERATIVA Y CONTROL DE ASISTENCIA */}
          {activeTab === 'adherencia' && (
            <motion.div
              key="adherencia"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Header & Sprint View Switcher */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-emerald-400 text-2xl">schedule</span>
                    <h3 className="font-display text-xl font-black text-white">
                      Adherencia Operativa y Control de Horarios - {selectedAgent.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-medium">
                    Registro en tiempo real de puntualidad, check-ins, ausencias, justificaciones y horas de jornada por sprint.
                  </p>
                </div>

                {/* Sprint Selector Controls */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="bg-slate-950 p-1 rounded-2xl border border-slate-800 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setAdherenceSprintFilterMode('current')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        adherenceSprintFilterMode === 'current'
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">bolt</span>
                      Sprint Activo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdherenceSprintFilterMode('previous')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        adherenceSprintFilterMode === 'previous'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">history</span>
                      Sprints Anteriores
                    </button>
                  </div>

                  {/* Dropdown for Specific Sprint Selection */}
                  {allAvailableSprints.length > 0 && (
                    <select
                      value={adherenceSprintFilterMode === 'current' || adherenceSprintFilterMode === 'previous' ? '' : adherenceSprintFilterMode}
                      onChange={(e) => {
                        if (e.target.value) {
                          setAdherenceSprintFilterMode(e.target.value);
                        }
                      }}
                      className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-bold rounded-2xl px-3 py-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Filtrar por Sprint Específico --</option>
                      {allAvailableSprints.map((s, idx) => (
                        <option key={idx} value={s}>
                          {s === activeSystemSprint ? `⭐ ${s} (Sprint Activo)` : s}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Key Adherence KPIs (Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {/* Rate % */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Índice Adherencia</span>
                    <span className="material-symbols-outlined text-lg text-emerald-400">verified</span>
                  </div>
                  <div>
                    <div className="font-display text-3xl font-black text-white">
                      {adherenceStats.rate}%
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {adherenceStats.rate >= 90 ? 'Excelente cumplimiento' : adherenceStats.rate >= 80 ? 'Aceptable' : 'Requiere atención'}
                    </p>
                  </div>
                </div>

                {/* On Time */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">A Tiempo</span>
                    <span className="material-symbols-outlined text-lg text-emerald-400">check_circle</span>
                  </div>
                  <div>
                    <div className="font-display text-3xl font-black text-emerald-400">
                      {adherenceStats.onTimeCount}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Check-ins en regla</p>
                  </div>
                </div>

                {/* Late */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Tardanzas</span>
                    <span className="material-symbols-outlined text-lg text-amber-400">schedule</span>
                  </div>
                  <div>
                    <div className="font-display text-3xl font-black text-amber-400">
                      {adherenceStats.lateCount}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Llegadas con atraso</p>
                  </div>
                </div>

                {/* Absences / Ausencias */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Faltas / Permisos</span>
                    <span className="material-symbols-outlined text-lg text-rose-400">event_busy</span>
                  </div>
                  <div>
                    <div className="font-display text-3xl font-black text-rose-400">
                      {adherenceStats.missingCount + adherenceStats.absenceCount}
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {adherenceStats.missingCount} Inasistencias • {adherenceStats.absenceCount} Permisos
                    </p>
                  </div>
                </div>

                {/* Points */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-slate-400 mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Puntos Asistencia</span>
                    <span className="material-symbols-outlined text-lg text-indigo-400">workspace_premium</span>
                  </div>
                  <div>
                    <div className="font-display text-3xl font-black text-indigo-400">
                      {adherenceStats.totalPoints} <span className="text-sm font-sans text-slate-400">pts</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Puntaje XP acumulado</p>
                  </div>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Category / Status Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
                    {(['Todos', 'A Tiempo', 'Tardanzas', 'Faltas / Ausencias', 'Visitas'] as const).map(f => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setAdherenceStatusFilter(f)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          adherenceStatusFilter === f
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  {/* Search Input */}
                  <div className="relative w-full sm:w-72">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Buscar fecha, estado, nota..."
                      value={adherenceSearchQuery}
                      onChange={(e) => setAdherenceSearchQuery(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-2xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-full"
                    />
                    {adherenceSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setAdherenceSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Adherence Log Table */}
                <div className="overflow-x-auto custom-scrollbar border border-slate-800 rounded-2xl bg-slate-950/50">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                        <th className="py-3 px-4 font-bold">Fecha / Día</th>
                        <th className="py-3 px-4 font-bold">Horario Programado</th>
                        <th className="py-3 px-4 font-bold">Check-In Real</th>
                        <th className="py-3 px-4 font-bold">Check-Out Real</th>
                        <th className="py-3 px-4 font-bold">Desviación / Detalle</th>
                        <th className="py-3 px-4 font-bold">Estado Adherencia</th>
                        <th className="py-3 px-4 font-bold">Sprint</th>
                        <th className="py-3 px-4 font-bold text-right">Puntos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-sans">
                      {paginatedAdherenceItems.length > 0 ? (
                        paginatedAdherenceItems.map((item, idx) => {
                          const dayName = getSpanishDayName(item.fecha);
                          const deviation = getDeviationLabel(item.checkIn, item.expectedCheckIn, item.estado);
                          const st = item.estado.toLowerCase();

                          let badgeColor = 'bg-slate-800 text-slate-300 border-slate-700';
                          let iconName = 'schedule';

                          if (st.includes('libre')) {
                            badgeColor = 'bg-slate-700/40 text-slate-400 border-slate-600/30';
                            iconName = 'weekend';
                          } else if (st.includes('remoto')) {
                            badgeColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                            iconName = 'laptop_chromebook';
                          } else if (st.includes('presente') || st.includes('tiempo') || st.includes('temprano')) {
                            badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                            iconName = 'check_circle';
                          } else if (st.includes('tardanza') || st.includes('demora') || st.includes('atraso')) {
                            badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                            iconName = 'warning';
                          } else if (st.includes('falta') || st.includes('inasistencia')) {
                            badgeColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
                            iconName = 'cancel';
                          } else if (st.includes('visita') || st.includes('campo') || st.includes('terreno')) {
                            badgeColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                            iconName = 'directions_car';
                          } else if (st.includes('permiso') || st.includes('vacaciones') || st.includes('ausencia') || st.includes('licencia') || st.includes('justificado')) {
                            badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                            iconName = 'event_busy';
                          }

                          return (
                            <tr key={item.id || idx} className="hover:bg-slate-900/60 transition-colors">
                              <td className="py-3 px-4 font-mono font-bold text-white whitespace-nowrap">
                                {item.fecha || 'N/A'}
                                {dayName && <span className="text-[10px] text-slate-400 block font-sans font-normal">{dayName}</span>}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-300">
                                {item.expectedCheckIn || '08:00'}
                              </td>
                              <td className="py-3 px-4 font-mono text-white font-bold">
                                {item.checkIn || '--:--'}
                              </td>
                              <td className="py-3 px-4 font-mono text-slate-400">
                                {item.checkOut || '--:--'}
                              </td>
                              <td className="py-3 px-4 text-slate-300">
                                <span className={`text-[11px] font-medium ${
                                  deviation.includes('retardo') ? 'text-amber-400 font-bold' :
                                  deviation.includes('temprano') || deviation.includes('A tiempo') ? 'text-emerald-400' :
                                  'text-slate-400'
                                }`}>
                                  {deviation}
                                </span>
                                {item.motivo && (
                                  <p className="text-[10px] text-slate-500 italic mt-0.5 max-w-xs truncate">{item.motivo}</p>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase border ${badgeColor}`}>
                                  <span className="material-symbols-outlined text-[12px]">{iconName}</span>
                                  {item.estado}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-xs font-mono text-slate-400">
                                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                                  {item.sprint}
                                </span>
                              </td>
                              <td className={`py-3 px-4 font-mono font-extrabold text-right ${
                                (item.points ?? 0) < 0 ? 'text-rose-400' : (item.points ?? 0) > 0 ? 'text-emerald-400' : 'text-slate-400'
                              }`}>
                                {item.points > 0 ? `+${item.points}` : (item.points ?? 0)} XP
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-10 text-center text-slate-500 italic text-xs">
                            No se encontraron registros de adherencia ni marcaciones para los filtros seleccionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                {filteredAdherenceItems.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-400">
                    <div>
                      Mostrando <span className="font-bold text-white">{((currentAdherencePageNumber - 1) * ADHERENCE_PER_PAGE) + 1}</span> a{' '}
                      <span className="font-bold text-white">{Math.min(currentAdherencePageNumber * ADHERENCE_PER_PAGE, filteredAdherenceItems.length)}</span> de{' '}
                      <span className="font-bold text-white">{filteredAdherenceItems.length}</span> registros de adherencia
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdherenceCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentAdherencePageNumber === 1}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 cursor-pointer transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                        Anterior
                      </button>

                      <span className="font-mono text-xs font-bold text-white px-2">
                        {currentAdherencePageNumber} / {totalAdherencePages}
                      </span>

                      <button
                        type="button"
                        onClick={() => setAdherenceCurrentPage(prev => Math.min(prev + 1, totalAdherencePages))}
                        disabled={currentAdherencePageNumber >= totalAdherencePages}
                        className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 cursor-pointer transition-all flex items-center gap-1"
                      >
                        Siguiente
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 6: COMPETENCIAS */}
          {activeTab === 'competencias' && (
            <motion.div 
              key="competencias"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-6"
            >
              {/* Radar Chart Panel */}
              <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col items-center shadow-sm">
                <h3 className="font-semibold text-white w-full text-left mb-6">Radar de Competencias</h3>
                <div className="relative w-56 h-56 mt-4 mb-8">
                  <svg width="100%" height="100%" viewBox="0 0 180 180" className="absolute inset-0">
                    <polygon points="90,10 166,65 137,150 43,150 14,65" fill="none" stroke="#334155" strokeWidth="1" />
                    <polygon points="90,31 147,72 125,135 55,135 33,72" fill="none" stroke="#334155" strokeWidth="1" />
                    <polygon points="90,52 128,79 113,120 67,120 52,79" fill="none" stroke="#334155" strokeWidth="1" />
                    <polygon points="90,73 109,87 102,105 78,105 71,87" fill="none" stroke="#334155" strokeWidth="1" />
                    <line x1="90" y1="90" x2="90" y2="10" stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1="90" y1="90" x2="166" y2="65" stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1="90" y1="90" x2="137" y2="150" stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1="90" y1="90" x2="43" y2="150" stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                    <line x1="90" y1="90" x2="14" y2="65" stroke="#475569" strokeWidth="1" strokeDasharray="2,2" />
                    <polygon points={polyPoints} fill="rgba(99, 102, 241, 0.2)" stroke="#818cf8" strokeWidth="2" />
                    <circle cx={p1.x} cy={p1.y} r="4" fill="#38bdf8" />
                    <circle cx={p2.x} cy={p2.y} r="4" fill="#a78bfa" />
                    <circle cx={p3.x} cy={p3.y} r="4" fill="#34d399" />
                    <circle cx={p4.x} cy={p4.y} r="4" fill="#94a3b8" />
                    <circle cx={p5.x} cy={p5.y} r="4" fill="#fbbf24" />
                  </svg>
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-sky-400">TEC</div>
                  <div className="absolute top-1/4 -right-8 text-[10px] font-bold text-violet-400">RES</div>
                  <div className="absolute -bottom-6 right-8 text-[10px] font-bold text-emerald-400">ATC</div>
                  <div className="absolute -bottom-6 left-8 text-[10px] font-bold text-slate-300">PRO</div>
                  <div className="absolute top-1/4 -left-8 text-[10px] font-bold text-amber-400">COL</div>
                </div>
                
                <div className="w-full space-y-6">
                  <div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Especialidades Activas</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {specialties.length > 0 ? (
                        specialties.map(sp => (
                          <span key={sp} className="text-xs bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 font-medium shadow-2xs">
                            {sp}
                            {!isUserRole && (
                              <button
                                onClick={() => {
                                  const nextList = specialties.filter(item => item !== sp);
                                  updateProfileField('specialties', nextList);
                                }}
                                className="text-slate-400 hover:text-rose-600 transition-colors text-[14px] flex items-center justify-center font-bold px-0.5"
                                title="Eliminar especialidad"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin especialidades registradas</span>
                      )}
                    </div>
                    {!isUserRole && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const input = form.elements.namedItem('newSpecialty') as HTMLInputElement;
                          const val = input.value.trim();
                          if (val && !specialties.includes(val)) {
                            updateProfileField('specialties', [...specialties, val]);
                            input.value = '';
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          name="newSpecialty"
                          placeholder="Nueva especialidad..."
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <button
                          type="submit"
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 shrink-0"
                        >
                          + Agregar
                        </button>
                      </form>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">Habilidades Clave</div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {skills.length > 0 ? (
                        skills.map(sk => (
                          <span key={sk} className="text-xs bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 font-medium shadow-2xs">
                            {sk}
                            {!isUserRole && (
                              <button
                                onClick={() => {
                                  const nextList = skills.filter(item => item !== sk);
                                  updateProfileField('skills', nextList);
                                }}
                                className="text-slate-400 hover:text-rose-600 transition-colors text-[14px] flex items-center justify-center font-bold px-0.5"
                                title="Eliminar habilidad"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500 italic">Sin habilidades registradas</span>
                      )}
                    </div>
                    {!isUserRole && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const form = e.currentTarget;
                          const input = form.elements.namedItem('newSkill') as HTMLInputElement;
                          const val = input.value.trim();
                          if (val && !skills.includes(val)) {
                            updateProfileField('skills', [...skills, val]);
                            input.value = '';
                          }
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          name="newSkill"
                          placeholder="Nueva habilidad..."
                          className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <button
                          type="submit"
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold px-3 py-1.5 bg-slate-800/50 rounded-lg border border-slate-700/50 shrink-0"
                        >
                          + Agregar
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* Dimensions Breakdown */}
              <div className="lg:col-span-8 flex flex-col gap-4">
                {scoreKeys.map((key) => {
                  const score = (scoresObj as any)[key];
                  const colorClass = getDimensionColorClass(key);
                  return (
                    <div key={key} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex items-center gap-5">
                      <div className={`p-3 rounded-xl border ${colorClass}`}>
                        <span className="material-symbols-outlined text-[24px]">{getDimensionIcon(key)}</span>
                      </div>
                      <div className="flex-grow">
                        <div className="flex justify-between items-end mb-2">
                          <h4 className="font-semibold text-slate-200">{getDimensionLabel(key)}</h4>
                          <span className="font-display font-bold text-xl text-white">{score}<span className="text-sm font-normal text-slate-500">/100</span></span>
                        </div>
                        <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div 
                            className="h-full rounded-full transition-all duration-1000"
                            style={{ 
                              width: `${score}%`,
                              backgroundColor: score >= 80 ? '#10b981' : score >= 50 ? '#fbbf24' : '#ef4444'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}



        </AnimatePresence>
        )}
      </div>
    </div>
  );
}
