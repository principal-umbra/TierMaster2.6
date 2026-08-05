import React, { useState, useEffect, useMemo } from 'react';
import { Agent, DimensionScores, DimensionType, Certification, AgentEvaluation } from '../../types';
import { motion } from 'motion/react';
import { AgentAvatarLogo } from '../AgentAvatarLogo';
import { fetchCRMData, fetchWeeklyBacklog, fetchHistoricalBacklog, fetchSystemSettings, checkSprintMatch } from '../../db/firebaseService';
import { FullEvaluationDetailModal } from './FullEvaluationDetailModal';

interface EvaluationTabProps {
  agents: Agent[];
  initialSelectedAgentId: string;
  initialSubTab?: 'dashboard' | 'directory' | 'evaluations';
  onSubmitEvaluation: (
    agentId: string, 
    scores: DimensionScores, 
    log: { suceso: string; accion: string; conclusion: string }, 
    xpYield: number, 
    evaluationsCount?: number,
    mimoObj?: { mantener: string; iniciar: string; mejorar: string; omitir: string },
    subScoresObj?: Record<string, Record<string, number>>,
    criterionFeedbacksObj?: Record<string, string>,
    auditedCasesList?: Array<{ id: string; title?: string; source?: string }>,
    flowTypeVal?: 'flow' | 'specific',
    criticalData?: {
      criticalFaultsApplied?: string[];
      criticalFaultsNotes?: string;
      isCriticalFail?: boolean;
      criticalPenaltyPct?: number;
      finalScoreOverride?: number;
    }
  ) => void;
  certifications?: Certification[];
  onUpdateAgent?: (agent: Agent) => void;
  currentWeekRange?: string;
}

const TIER_COLORS: Record<string, string> = {
  l1: '#64748b',
  'l1.5': '#0284c7',
  l2: '#2563eb',
  l3: '#7c3aed',
  l4: '#db2777',
  s1: '#d97706',
  s2: '#b45309'
};

const TIER_LABELS: Record<string, string> = {
  l1: 'Nivel 1 (L1)',
  'l1.5': 'Nivel 1.5 (L1.5)',
  l2: 'Nivel 2 (L2)',
  l3: 'Nivel 3 (L3)',
  l4: 'Nivel 4 (L4)',
  s1: 'Supervisor (S1)',
  s2: 'Coordinador (S2)'
};

import { CRITERIA } from './criteria/constants';
import { KnowledgeCriterion } from './criteria/KnowledgeCriterion';
import { ExecutionCriterion } from './criteria/ExecutionCriterion';
import { RelationalCriterion } from './criteria/RelationalCriterion';
import { CollaborativeCriterion } from './criteria/CollaborativeCriterion';
import { ControlCriterion } from './criteria/ControlCriterion';
import { FinalEvaluationSummary } from './FinalEvaluationSummary';

type EvalMode = 'directory' | 'room' | 'select-specific' | 'evaluate' | 'finalize';
type TopTab = 'dashboard' | 'directory' | 'evaluations';

export default function EvaluationTab({ 
  agents, 
  initialSelectedAgentId, 
  initialSubTab = 'dashboard',
  onSubmitEvaluation, 
  certifications = [], 
  onUpdateAgent,
  currentWeekRange
}: EvaluationTabProps) {
  // Exclude A1 agents from evaluation tab completely
  const evalAgents = useMemo(() => {
    return agents.filter(a => (a.tierId || '').toLowerCase() !== 'a1');
  }, [agents]);

  // Separate Tier L (evaluable, counted in stats) vs Tier S (admin, frozen stats, non-evaluable)
  const tierLAgents = useMemo(() => {
    return evalAgents.filter(a => (a.tierId || '').toLowerCase().startsWith('l'));
  }, [evalAgents]);

  const tierSAgents = useMemo(() => {
    return evalAgents.filter(a => {
      const tid = (a.tierId || '').toLowerCase();
      return tid === 's1' || tid === 's2' || tid.startsWith('s');
    });
  }, [evalAgents]);

  const [topTab, setTopTab] = useState<TopTab>(initialSubTab);
  const [mode, setMode] = useState<EvalMode>(initialSelectedAgentId ? 'room' : 'directory');
  const [selectedAgentId, setSelectedAgentId] = useState(() => {
    if (initialSelectedAgentId) {
      const found = evalAgents.find(a => a.id === initialSelectedAgentId);
      if (found && (found.tierId || '').toLowerCase().startsWith('l')) return initialSelectedAgentId;
    }
    return tierLAgents[0]?.id || evalAgents[0]?.id || '';
  });
  const currentAgent = evalAgents.find(a => a.id === selectedAgentId) || tierLAgents[0] || evalAgents[0];

  // Directory and Dashboard filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTierFilter, setSelectedTierFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'evaluated' | 'pending'>('all');

  // Evaluaciones Realizadas tab filters
  const [evalSearchTerm, setEvalSearchTerm] = useState('');
  const [evalAgentFilter, setEvalAgentFilter] = useState('all');
  const [evalTierFilter, setEvalTierFilter] = useState('all');
  const [evalScoreFilter, setEvalScoreFilter] = useState('all');
  const [evalFlowFilter, setEvalFlowFilter] = useState('all');
  const [evalSortBy, setEvalSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [evalPage, setEvalPage] = useState(1);
  const EVAL_ITEMS_PER_PAGE = 10;

  // History & Evaluation Detail Modals
  const [selectedHistoryAgent, setSelectedHistoryAgent] = useState<Agent | null>(null);
  const [selectedEvaluationDetail, setSelectedEvaluationDetail] = useState<{ agent: Agent; eval: AgentEvaluation } | null>(null);

  // Global list of published evaluations across all agents
  const allPublishedEvaluations = useMemo(() => {
    const list: Array<{ agent: Agent; evaluation: AgentEvaluation }> = [];
    evalAgents.forEach(agent => {
      if (agent.evaluationsHistory && agent.evaluationsHistory.length > 0) {
        agent.evaluationsHistory.forEach(ev => {
          list.push({ agent, evaluation: ev });
        });
      } else {
        const evalEvents = (agent.xpEvents || []).filter(e => e.type === 'eval');
        evalEvents.forEach((ev, idx) => {
          if (ev.evalData) {
            list.push({ agent, evaluation: ev.evalData });
          } else {
            list.push({
              agent,
              evaluation: {
                id: ev.id,
                agentId: agent.id,
                evalNumber: evalEvents.length - idx,
                date: ev.date || 'Reciente',
                scores: agent.dimensionScores || { knowledge: 25, execution: 25, relational: 25, collaborative: 25, control: 25 },
                mimo: {
                  mantener: 'Cumplimiento operacional constante.',
                  iniciar: 'Consistencia en documentación.',
                  mejorar: 'Optimización de SLA.',
                  omitir: 'Sin omisiones registradas.'
                },
                xpYield: ev.xpYield || 60,
                evaluator: 'Admin / Calibrador Senior',
                title: ev.title || `Evaluación Formal #${evalEvents.length - idx}`
              }
            });
          }
        });
      }
    });

    return list.sort((a, b) => {
      const dateA = new Date(a.evaluation.date).getTime() || 0;
      const dateB = new Date(b.evaluation.date).getTime() || 0;
      if (dateA !== dateB) return dateB - dateA;
      return (b.evaluation.evalNumber || 0) - (a.evaluation.evalNumber || 0);
    });
  }, [evalAgents]);

  const filteredPublishedEvaluations = useMemo(() => {
    return allPublishedEvaluations.filter(({ agent, evaluation }) => {
      // Búsqueda por texto
      if (evalSearchTerm.trim()) {
        const q = evalSearchTerm.toLowerCase().trim();
        const matchAgent = agent.name.toLowerCase().includes(q) || agent.id.toLowerCase().includes(q);
        const matchTitle = (evaluation.title || '').toLowerCase().includes(q);
        const matchEvaluator = (evaluation.evaluator || '').toLowerCase().includes(q);
        const matchMimo = evaluation.mimo ? (
          (evaluation.mimo.mantener || '').toLowerCase().includes(q) ||
          (evaluation.mimo.iniciar || '').toLowerCase().includes(q) ||
          (evaluation.mimo.mejorar || '').toLowerCase().includes(q)
        ) : false;
        if (!matchAgent && !matchTitle && !matchEvaluator && !matchMimo) return false;
      }

      // Filtro por Agente
      if (evalAgentFilter !== 'all' && agent.id !== evalAgentFilter) {
        return false;
      }

      // Filtro por Tier
      if (evalTierFilter !== 'all' && (agent.tierId || '').toLowerCase() !== evalTierFilter.toLowerCase()) {
        return false;
      }

      // Filtro por Flujo
      if (evalFlowFilter !== 'all') {
        const flow = evaluation.flowType || 'flow';
        if (flow !== evalFlowFilter) return false;
      }

      // Filtro por Calificación
      const avgScore = evaluation.scores ? Math.round(
        ((evaluation.scores.knowledge || 0) +
         (evaluation.scores.execution || 0) +
         (evaluation.scores.relational || 0) +
         (evaluation.scores.collaborative || 0) +
         (evaluation.scores.control || 0)) / 5
      ) : 0;

      if (evalScoreFilter === 'sobresaliente' && avgScore < 90) return false;
      if (evalScoreFilter === 'cumple' && (avgScore < 75 || avgScore >= 90)) return false;
      if (evalScoreFilter === 'desarrollo' && (avgScore < 50 || avgScore >= 75)) return false;
      if (evalScoreFilter === 'insuficiente' && avgScore >= 50) return false;

      return true;
    }).sort((a, b) => {
      const getAvg = (ev: AgentEvaluation) => ev.scores ? Math.round(((ev.scores.knowledge || 0) + (ev.scores.execution || 0) + (ev.scores.relational || 0) + (ev.scores.collaborative || 0) + (ev.scores.control || 0)) / 5) : 0;
      const avgA = getAvg(a.evaluation);
      const avgB = getAvg(b.evaluation);

      if (evalSortBy === 'highest') return avgB - avgA;
      if (evalSortBy === 'lowest') return avgA - avgB;

      const dateA = new Date(a.evaluation.date).getTime() || 0;
      const dateB = new Date(b.evaluation.date).getTime() || 0;
      if (evalSortBy === 'oldest') {
        if (dateA !== dateB) return dateA - dateB;
        return (a.evaluation.evalNumber || 0) - (b.evaluation.evalNumber || 0);
      }
      // 'newest'
      if (dateA !== dateB) return dateB - dateA;
      return (b.evaluation.evalNumber || 0) - (a.evaluation.evalNumber || 0);
    });
  }, [allPublishedEvaluations, evalSearchTerm, evalAgentFilter, evalTierFilter, evalFlowFilter, evalScoreFilter, evalSortBy]);

  useEffect(() => {
    setEvalPage(1);
  }, [evalSearchTerm, evalAgentFilter, evalTierFilter, evalScoreFilter, evalFlowFilter, evalSortBy]);

  const totalEvalPages = Math.ceil(filteredPublishedEvaluations.length / EVAL_ITEMS_PER_PAGE) || 1;
  const paginatedEvaluations = useMemo(() => {
    const start = (evalPage - 1) * EVAL_ITEMS_PER_PAGE;
    return filteredPublishedEvaluations.slice(start, start + EVAL_ITEMS_PER_PAGE);
  }, [filteredPublishedEvaluations, evalPage]);

  const [flowType, setFlowType] = useState<'flow' | 'specific'>('flow');
  const [currentStep, setCurrentStep] = useState(0);

  const [scores, setScores] = useState<DimensionScores>({
    knowledge: 85, execution: 92, relational: 78, collaborative: 88, control: 70
  });

  const [subScores, setSubScores] = useState<Record<string, Record<string, number>>>({});

  const [mimoMantener, setMimoMantener] = useState('');
  const [mimoIniciar, setMimoIniciar] = useState('');
  const [mimoMejorar, setMimoMejorar] = useState('');
  const [mimoOmitir, setMimoOmitir] = useState('');
  const [isMimoOptional, setIsMimoOptional] = useState(false);

  const [suceso, setSuceso] = useState('');
  const [accion, setAccion] = useState('');
  const [conclusion, setConclusion] = useState('');

  const [criterionFeedbacks, setCriterionFeedbacks] = useState<Record<string, string>>({
    knowledge: '',
    execution: '',
    relational: '',
    collaborative: '',
    control: ''
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // States for loading agent cases from Firestore
  const [allSheetCases, setAllSheetCases] = useState<any[]>([]);
  const [casesLoading, setCasesLoading] = useState<boolean>(false);
  const [casesError, setCasesError] = useState<string>('');
  const [useRandomSelection, setUseRandomSelection] = useState<boolean>(true);
  const [manuallySelectedIds, setManuallySelectedIds] = useState<string[]>([]);
  const [randomSeed, setRandomSeed] = useState<number>(0);

  const isAgentNameMatch = (nameA: string, nameB: string): boolean => {
    if (!nameA || !nameB) return false;
    const clean = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
    const cleanA = clean(nameA);
    const cleanB = clean(nameB);
    return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
  };

  useEffect(() => {
    if (currentAgent) {
      const loadCases = async () => {
        setCasesLoading(true);
        setCasesError('');
        try {
          let activeWeek = currentWeekRange || localStorage.getItem('current_week_range') || '';
          try {
            const settings = await fetchSystemSettings();
            if (settings && settings.current_week_range) {
              activeWeek = settings.current_week_range;
            }
          } catch (e) {
            console.error("Error fetching system settings inside EvaluationTab:", e);
          }

          const [crmData, weeklyBacklog, historicalBacklog] = await Promise.all([
            fetchCRMData("requerimientos_en_curso").catch(() => []),
            fetchWeeklyBacklog().catch(() => []),
            fetchHistoricalBacklog().catch(() => [])
          ]);

          const allTicketsMap = new Map<string, any>();
          const addTicket = (ticket: any) => {
            if (!ticket) return;
            const id = String(ticket.id || ticket["ID"] || ticket["ID Tarea"] || "").trim();
            if (id) {
              allTicketsMap.set(id, { ...ticket, id });
            }
          };

          crmData.forEach(t => addTicket({ ...t, _sourceSheet: 'requerimientos_en_curso' }));
          weeklyBacklog.forEach(t => addTicket({ ...t, _sourceSheet: 'backlog_semanal' }));
          historicalBacklog.forEach(t => addTicket({ ...t, _sourceSheet: 'historico_completados' }));

          const combined = Array.from(allTicketsMap.values());

          const isTicketForAgent = (ticket: any): boolean => {
            const tAgentId = String(ticket.agentid || ticket.agentId || ticket['Agent ID'] || ticket.idAgente || ticket.tecnico_visita_id || '').trim();
            if (tAgentId && tAgentId.toLowerCase() === currentAgent.id.toLowerCase()) return true;
            
            const assigned = ticket["Assigned To"] || ticket["assigned to"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || ticket.tecnico_visita || ticket.tecnico || "";
            return isAgentNameMatch(assigned, currentAgent.name);
          };

          const agentCases = combined.filter(row => {
            if (!isTicketForAgent(row)) return false;
            return checkSprintMatch(row, activeWeek);
          });

          setAllSheetCases(agentCases);
          setManuallySelectedIds([]);
        } catch (err: any) {
          console.error("Error al buscar requerimientos del agente para el sprint:", err);
          setCasesError(err.message || "Error al conectar con Firestore.");
          setAllSheetCases([]);
        } finally {
          setCasesLoading(false);
        }
      };
      loadCases();
    } else {
      setAllSheetCases([]);
    }
  }, [selectedAgentId, currentWeekRange]);

  // Pseudorandom selection for cases
  const activeCases = useMemo(() => {
    if (!useRandomSelection) {
      if (manuallySelectedIds.length === 0) return [];
      return allSheetCases.filter(c => manuallySelectedIds.includes(c.id));
    }
    if (allSheetCases.length <= 2) return allSheetCases;

    const shuffled = [...allSheetCases];
    let seed = randomSeed;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 9301 + 49297) % 233280;
      const rnd = seed / 233280;
      const j = Math.floor(rnd * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, 2);
  }, [allSheetCases, useRandomSelection, manuallySelectedIds, randomSeed]);

  useEffect(() => {
    if (currentAgent) {
      const initScores = getAgentDimensionScores(currentAgent);
      setScores(initScores);
      setSubScores({});
      setMimoMantener('');
      setMimoIniciar('');
      setMimoMejorar('');
      setMimoOmitir('');
      setIsMimoOptional(false);
      setSuceso('');
      setAccion('');
      setConclusion('');
      setCriterionFeedbacks({
        knowledge: '',
        execution: '',
        relational: '',
        collaborative: '',
        control: ''
      });
    }
  }, [selectedAgentId]);

  const handleSubScoreChange = (dimension: DimensionType, subId: string, value: number) => {
    setSubScores(prev => {
      const dimObj = prev[dimension] || {};
      const newDimObj = { ...dimObj, [subId]: value };
      
      const values = Object.values(newDimObj) as number[];
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = Math.round(sum / values.length);
        setScores(prevScores => ({ ...prevScores, [dimension]: avg }));
      }

      return { ...prev, [dimension]: newDimObj };
    });
  };

  const handleEvidenceChange = (dimension: DimensionType, subId: string, text: string) => {
    if (!currentAgent || !onUpdateAgent) return;
    const existingEvidence = currentAgent.evidence || [];
    const index = existingEvidence.findIndex(e => e.subId === subId);
    let updated;
    if (index >= 0) {
      updated = [...existingEvidence];
      updated[index] = { subId, text, updatedAt: new Date().toISOString() };
    } else {
      updated = [...existingEvidence, { subId, text, updatedAt: new Date().toISOString() }];
    }
    onUpdateAgent({ ...currentAgent, evidence: updated });
  };

  const getAgentEvalsCount = (agent: Agent): number => {
    if (agent.evaluationsHistory) {
      return agent.evaluationsHistory.length;
    }
    return agent.evaluationsCount || 0;
  };

  const getAgentDimensionScores = (agent: Agent): DimensionScores => {
    let raw: DimensionScores = { knowledge: 80, execution: 80, relational: 80, collaborative: 80, control: 80 };
    if (agent.evaluationsHistory && agent.evaluationsHistory.length > 0) {
      const sorted = [...agent.evaluationsHistory].sort((a, b) => (b.evalNumber || 0) - (a.evalNumber || 0));
      if (sorted[0]?.scores) {
        raw = sorted[0].scores;
      }
    } else if (agent.dimensionScores) {
      raw = agent.dimensionScores;
    }
    
    // Normalize uncalibrated/legacy 25% defaults so certification non-mandate doesn't plummet technical knowledge
    return {
      knowledge: (raw.knowledge ?? 25) <= 25 ? 80 : raw.knowledge,
      execution: (raw.execution ?? 25) <= 25 ? 80 : raw.execution,
      relational: (raw.relational ?? 25) <= 25 ? 80 : raw.relational,
      collaborative: (raw.collaborative ?? 25) <= 25 ? 80 : raw.collaborative,
      control: (raw.control ?? 25) <= 25 ? 80 : raw.control,
    };
  };

  const getAgentGlobalScore = (agent: Agent): number => {
    const scores = getAgentDimensionScores(agent);
    const { knowledge = 80, execution = 80, relational = 80, collaborative = 80, control = 80 } = scores;
    return Math.round((knowledge + execution + relational + collaborative + control) / 5);
  };

  // Organizational stats calculation (STRICTLY ON TIER L AGENTS)
  const stats = useMemo(() => {
    const total = tierLAgents.length;
    if (total === 0) {
      return {
        total: 0,
        evaluatedCount: 0,
        totalEvalsPublished: 0,
        avgGlobal: 0,
        excellentCount: 0,
        standardCount: 0,
        lowStandardCount: 0,
        avgKnowledge: 0,
        avgExecution: 0,
        avgRelational: 0,
        avgCollaborative: 0,
        avgControl: 0,
        topPerformers: [],
        needsSupport: []
      };
    }

    const evaluatedCount = tierLAgents.filter(a => getAgentEvalsCount(a) > 0).length;
    const totalEvalsPublished = tierLAgents.reduce((acc: number, a) => acc + getAgentEvalsCount(a), 0);
    
    const scoresWithAgents = tierLAgents.map(agent => {
      const scores = getAgentDimensionScores(agent);
      return {
        agent,
        scores,
        globalScore: getAgentGlobalScore(agent)
      };
    });

    const avgGlobal = Math.round(scoresWithAgents.reduce((acc: number, item) => acc + item.globalScore, 0) / total);

    const excellentCount = scoresWithAgents.filter(item => item.globalScore >= 80).length;
    const standardCount = scoresWithAgents.filter(item => item.globalScore >= 60 && item.globalScore < 80).length;
    const lowStandardCount = scoresWithAgents.filter(item => item.globalScore < 60).length;

    const avgKnowledge = Math.round(scoresWithAgents.reduce((acc: number, item) => acc + (item.scores.knowledge ?? 25), 0) / total);
    const avgExecution = Math.round(scoresWithAgents.reduce((acc: number, item) => acc + (item.scores.execution ?? 25), 0) / total);
    const avgRelational = Math.round(scoresWithAgents.reduce((acc: number, item) => acc + (item.scores.relational ?? 25), 0) / total);
    const avgCollaborative = Math.round(scoresWithAgents.reduce((acc: number, item) => acc + (item.scores.collaborative ?? 25), 0) / total);
    const avgControl = Math.round(scoresWithAgents.reduce((acc: number, item) => acc + (item.scores.control ?? 25), 0) / total);

    const sortedByScore = [...scoresWithAgents].sort((a, b) => b.globalScore - a.globalScore);
    const topPerformers = sortedByScore.slice(0, 3);
    const needsSupport = sortedByScore.filter(item => item.globalScore < 70 || getAgentEvalsCount(item.agent) === 0).slice(0, 3);

    return {
      total,
      evaluatedCount,
      totalEvalsPublished,
      avgGlobal,
      excellentCount,
      standardCount,
      lowStandardCount,
      avgKnowledge,
      avgExecution,
      avgRelational,
      avgCollaborative,
      avgControl,
      topPerformers,
      needsSupport
    };
  }, [tierLAgents]);

  // Filter helper for search, tier and status
  const filterAgent = (agent: Agent) => {
    const searchLower = searchTerm.toLowerCase().trim();
    const matchesSearch = !searchLower || 
      agent.name.toLowerCase().includes(searchLower) ||
      (agent.role && agent.role.toLowerCase().includes(searchLower)) ||
      (agent.initials && agent.initials.toLowerCase().includes(searchLower)) ||
      (agent.email && agent.email.toLowerCase().includes(searchLower));

    const matchesTier = selectedTierFilter === 'all' || agent.tierId === selectedTierFilter;

    const evalsCount = getAgentEvalsCount(agent);
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'evaluated' && evalsCount > 0) ||
      (statusFilter === 'pending' && evalsCount === 0);

    return matchesSearch && matchesTier && matchesStatus;
  };

  const filteredLAgents = useMemo(() => tierLAgents.filter(filterAgent), [tierLAgents, searchTerm, selectedTierFilter, statusFilter]);
  const filteredSAgents = useMemo(() => tierSAgents.filter(filterAgent), [tierSAgents, searchTerm, selectedTierFilter, statusFilter]);

  const xpYield = useMemo(() => {
    if (flowType === 'flow') {
      const avg = Math.round((scores.knowledge + scores.execution + scores.relational + scores.collaborative + scores.control) / 5);
      return Math.round(avg * 0.8);
    } else {
      const targetCrit = CRITERIA[Math.max(0, Math.min(currentStep, CRITERIA.length - 1))];
      const key = targetCrit.key as keyof DimensionScores;
      const val = scores[key] || 0;
      return Math.round((val / 5) * 0.8);
    }
  }, [scores, flowType, currentStep]);

  const handlePublish = (
    finalScores?: DimensionScores, 
    newEvaluationsCount?: number,
    criticalData?: {
      criticalFaultsApplied: string[];
      criticalFaultsNotes: string;
      isCriticalFail: boolean;
      criticalPenaltyPct: number;
      finalScoreOverride: number;
      overrideXpYield: number;
    }
  ) => {
    if (!currentAgent) return;
    
    if (!isMimoOptional && (!mimoMantener.trim() || !mimoMejorar.trim())) {
      setErrorMessage('Por favor complete al menos los campos principales (1. Mantener y 3. Mejorar) del Feedback MIMO o activa la opción "Hacer MIMO Opcional" para publicar.');
      return;
    }

    const scoresToSubmit = finalScores || scores;
    const evalsCountToSubmit = newEvaluationsCount ?? ((currentAgent.evaluationsCount || 0) + 1);

    const sucesoFormatted = (mimoMantener.trim() || mimoIniciar.trim())
      ? `[MANTENER]: ${mimoMantener.trim() || 'Sin observaciones'}${mimoIniciar.trim() ? ' | [INICIAR]: ' + mimoIniciar.trim() : ''}`
      : 'Evaluación publicada sin feedback cualitativo MIMO.';
    const accionFormatted = mimoMejorar.trim() 
      ? `[MEJORAR]: ${mimoMejorar.trim()}`
      : 'Sin acciones de mejora específicas registradas.';
    const conclusionFormatted = `[OMITIR]: ${mimoOmitir.trim() || 'Sin omisiones registradas.'}`;

    const mimoObj = {
      mantener: mimoMantener.trim() || (isMimoOptional ? 'Sin observaciones' : ''),
      iniciar: mimoIniciar.trim(),
      mejorar: mimoMejorar.trim() || (isMimoOptional ? 'Sin observaciones' : ''),
      omitir: mimoOmitir.trim()
    };

    const auditedCasesList = (activeCases || []).map((c: any) => ({
      id: String(c.id || c['ID Tarea'] || c['ID Requerimiento'] || ''),
      title: String(c.title || c['Summary'] || c['Asunto'] || c['Descripción'] || c['ID Tarea'] || 'Caso Auditado'),
      source: String(c._sourceSheet || 'backlog')
    }));

    const finalXpYield = criticalData?.isCriticalFail ? criticalData.overrideXpYield : xpYield;

    onSubmitEvaluation(
      currentAgent.id, 
      scoresToSubmit, 
      { suceso: sucesoFormatted, accion: accionFormatted, conclusion: conclusionFormatted }, 
      finalXpYield, 
      evalsCountToSubmit,
      mimoObj,
      subScores,
      criterionFeedbacks,
      auditedCasesList,
      flowType,
      criticalData
    );
    
    setSuccessMessage(`Evaluación ${evalsCountToSubmit}ª con Feedback MIMO publicada exitosamente para ${currentAgent.name}.`);
    setErrorMessage('');

    setTimeout(() => {
      setSuccessMessage('');
      setMode('directory');
      setTopTab('dashboard');
    }, 2000);
  };

  const startEvaluationForAgent = (agentId: string) => {
    setSelectedAgentId(agentId);
    setMode('room');
  };

  return (
    <div className="flex-grow flex flex-col gap-6 animate-fade-in">
      
      {/* Main Mode Directory / Dashboard container */}
      {mode === 'directory' && (
        <div className="flex flex-col gap-6">
          
          {/* Top Sub-Navigation Header */}
          <div className="bg-white p-3 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
              <button
                onClick={() => setTopTab('dashboard')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  topTab === 'dashboard'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">space_dashboard</span>
                Dashboard General
              </button>

              <button
                onClick={() => setTopTab('directory')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  topTab === 'directory'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">badge</span>
                Directorio de Agentes
                <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                  topTab === 'directory' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tierLAgents.length}
                </span>
              </button>

              <button
                onClick={() => setTopTab('evaluations')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  topTab === 'evaluations'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span className="material-symbols-outlined text-lg">fact_check</span>
                Evaluaciones Realizadas
                <span className={`text-xs px-2 py-0.5 rounded-full font-extrabold ${
                  topTab === 'evaluations' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {allPublishedEvaluations.length}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 px-2">
              <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Matriz Activa: <strong className="text-slate-800">FHONS Standard v2.2</strong></span>
              </div>
              <button
                onClick={() => {
                  setTopTab('directory');
                  if (tierLAgents[0]) startEvaluationForAgent(tierLAgents[0].id);
                }}
                className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1.5 border border-indigo-200"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Iniciar Auditoría
              </button>
            </div>
          </div>

          {/* VIEW 1: DASHBOARD GENERAL */}
          {topTab === 'dashboard' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* Hero Banner Dashboard - High Accessibility Light Theme */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-50/80 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold">
                      <span className="material-symbols-outlined text-sm">analytics</span>
                      Métricas Organizacionales de Auditoría
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Gala y Control General de Desempeño
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed font-sans font-medium">
                      Supervisión consolidada de los 5 ejes de evaluación, cobertura de auditorías semanales y estado de cumplimiento técnico del equipo.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <div>
                      <p className="text-[10px] text-slate-500 font-mono uppercase font-black tracking-wider">Promedio Global</p>
                      <p className="text-3xl font-black font-display text-slate-900 mt-0.5">{stats.avgGlobal}%</p>
                    </div>
                    <div className="h-10 w-px bg-slate-200 mx-1"></div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-mono uppercase font-black tracking-wider">Estatus</p>
                      <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-black ${
                        stats.avgGlobal >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        stats.avgGlobal >= 60 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {stats.avgGlobal >= 80 ? 'Excelente' : stats.avgGlobal >= 60 ? 'En Norma' : 'Bajo Estándar'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Executive KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* KPI 1 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono text-slate-500 uppercase tracking-wider">Promedio Global</span>
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                      <span className="material-symbols-outlined text-xl">speed</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 font-display">{stats.avgGlobal}%</span>
                      <span className={`text-xs font-bold ${
                        stats.avgGlobal >= 80 ? 'text-emerald-600' : stats.avgGlobal >= 60 ? 'text-amber-600' : 'text-rose-600'
                      }`}>
                        {stats.avgGlobal >= 80 ? 'Supera Meta' : stats.avgGlobal >= 60 ? 'Dentro de Rango' : 'Atención Req.'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Promedio ponderado en los 5 ejes</p>
                  </div>
                </div>

                {/* KPI 2 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono text-slate-500 uppercase tracking-wider">Evaluaciones Publicadas</span>
                    <div className="p-2 bg-teal-50 text-teal-600 rounded-xl">
                      <span className="material-symbols-outlined text-xl">fact_check</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-3xl font-black text-slate-900 font-display">{stats.totalEvalsPublished}</span>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Auditorías semanales registradas</p>
                  </div>
                </div>

                {/* KPI 3 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono text-slate-500 uppercase tracking-wider">Cobertura de Agentes</span>
                    <div className="p-2 bg-cyan-50 text-cyan-600 rounded-xl">
                      <span className="material-symbols-outlined text-xl">groups</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-slate-900 font-display">{stats.evaluatedCount} <span className="text-lg text-slate-400 font-bold">/ {stats.total}</span></span>
                      <span className="text-xs font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-100">
                        {stats.total > 0 ? Math.round((stats.evaluatedCount / stats.total) * 100) : 0}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Agentes con al menos 1 evaluación</p>
                  </div>
                </div>

                {/* KPI 4 */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold font-mono text-slate-500 uppercase tracking-wider">Cumplimiento por Nivel</span>
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                      <span className="material-symbols-outlined text-xl">equalizer</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 text-center bg-emerald-50 border border-emerald-100 p-2 rounded-xl">
                      <p className="text-base font-black text-emerald-700 leading-none">{stats.excellentCount}</p>
                      <p className="text-[9px] font-bold text-emerald-600 uppercase mt-1">Excel.</p>
                    </div>
                    <div className="flex-1 text-center bg-amber-50 border border-amber-100 p-2 rounded-xl">
                      <p className="text-base font-black text-amber-700 leading-none">{stats.standardCount}</p>
                      <p className="text-[9px] font-bold text-amber-600 uppercase mt-1">Norma</p>
                    </div>
                    <div className="flex-1 text-center bg-rose-50 border border-rose-100 p-2 rounded-xl">
                      <p className="text-base font-black text-rose-700 leading-none">{stats.lowStandardCount}</p>
                      <p className="text-[9px] font-bold text-rose-600 uppercase mt-1">Bajo</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Breakdown by 5 Dimensions / Criteria */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600">pie_chart</span>
                      Desempeño Promedio por Ejes del Modelo
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Comparativa organizacional de los 5 criterios evaluados a todos los agentes técnicos.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {CRITERIA.map(crit => {
                    let score = 25;
                    if (crit.key === 'knowledge') score = stats.avgKnowledge;
                    else if (crit.key === 'execution') score = stats.avgExecution;
                    else if (crit.key === 'relational') score = stats.avgRelational;
                    else if (crit.key === 'collaborative') score = stats.avgCollaborative;
                    else if (crit.key === 'control') score = stats.avgControl;

                    return (
                      <div key={crit.key} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between gap-3 hover:border-slate-300 transition-all">
                        <div className="flex items-center gap-2.5">
                          <div className={`p-2 rounded-xl ${crit.bg} text-white shadow-xs`}>
                            <span className="material-symbols-outlined text-lg">{crit.icon}</span>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs leading-tight line-clamp-1">{crit.title}</p>
                            <span className="text-[10px] text-slate-600 font-mono">{crit.short}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-baseline justify-between mb-1.5">
                            <span className="text-2xl font-black text-slate-900 font-display">{score}%</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                              score >= 80 ? 'bg-emerald-100 text-emerald-800' : score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {score >= 80 ? 'Alto' : score >= 60 ? 'Medio' : 'Bajo'}
                            </span>
                          </div>
                          
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div className={`h-full ${crit.bg} transition-all duration-500`} style={{ width: `${score}%` }}></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Performers vs Support Needed */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Top Performers */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <span className="material-symbols-outlined text-xl font-bold">emoji_events</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Destacados en Evaluación</h4>
                        <p className="text-xs text-slate-500">Agentes con mayor promedio acumulado en la matriz</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {stats.topPerformers.map((item, idx) => (
                        <div key={item.agent.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-all">
                          <div className="flex items-center gap-3 min-w-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center font-extrabold text-xs font-mono ${
                              idx === 0 ? 'bg-amber-400 text-amber-950 shadow-xs' : idx === 1 ? 'bg-slate-300 text-slate-800' : 'bg-amber-700/20 text-amber-800'
                            }`}>
                              #{idx + 1}
                            </span>
                            <AgentAvatarLogo name={item.agent.name} initials={item.agent.initials} tierColor={TIER_COLORS[item.agent.tierId] || '#64748b'} size="sm" />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 text-xs truncate">{item.agent.name}</p>
                              <p className="text-[11px] text-slate-500 truncate">{item.agent.role}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-base font-black text-slate-900 font-display">{item.globalScore}%</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase">{getAgentEvalsCount(item.agent)} Evals</p>
                            </div>
                            <button
                              onClick={() => startEvaluationForAgent(item.agent.id)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title="Auditar agente"
                            >
                              <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Agents Needing Support / Pending */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                      <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                        <span className="material-symbols-outlined text-xl font-bold">warning</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">Requieren Prioridad / Apoyo</h4>
                        <p className="text-xs text-slate-500">Agentes con bajo promedio o pendientes de evaluación formal</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {stats.needsSupport.length > 0 ? (
                        stats.needsSupport.map((item) => (
                          <div key={item.agent.id} className="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100/80 rounded-2xl border border-slate-100 transition-all">
                            <div className="flex items-center gap-3 min-w-0">
                              <AgentAvatarLogo name={item.agent.name} initials={item.agent.initials} tierColor={TIER_COLORS[item.agent.tierId] || '#64748b'} size="sm" />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-xs truncate">{item.agent.name}</p>
                                <span className={`inline-block text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                                  getAgentEvalsCount(item.agent) === 0 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {getAgentEvalsCount(item.agent) === 0 ? 'Sin evaluación semanal' : 'Bajo Estándar'}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className={`text-base font-black font-display ${item.globalScore < 60 ? 'text-rose-600' : 'text-amber-600'}`}>{item.globalScore}%</p>
                                <p className="text-[9px] font-bold text-slate-500 uppercase">{getAgentEvalsCount(item.agent)} Evals</p>
                              </div>
                              <button
                                onClick={() => startEvaluationForAgent(item.agent.id)}
                                className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs hover:bg-indigo-700 transition-colors shadow-xs"
                              >
                                Auditar
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-500 text-xs font-medium">
                          Todos los agentes tienen evaluaciones publicadas y se encuentran sobre el estándar mínimo.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Bitácora de Evaluaciones Publicadas (Recent Feed) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
                      <span className="material-symbols-outlined text-2xl font-bold">verified</span>
                    </div>
                    <div>
                      <h3 className="font-display font-extrabold text-slate-900 text-lg flex items-center gap-2">
                        Bitácora de Evaluaciones Registradas
                        <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200">
                          {allPublishedEvaluations.length} {allPublishedEvaluations.length === 1 ? 'Publicada' : 'Publicadas'}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">
                        Historial consolidado de auditorías semanales y Feedback MIMO guardadas en el sistema.
                      </p>
                    </div>
                  </div>
                </div>

                {allPublishedEvaluations.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">assignment_late</span>
                    <p className="text-sm font-bold text-slate-700">Aún no hay evaluaciones registradas en esta vista</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                      Inicia una auditoría desde la tabla de abajo para calificar a un técnico y publicar su Feedback MIMO.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allPublishedEvaluations.map(({ agent, evaluation }) => {
                      const avgScore = Math.round(
                        ((evaluation.scores?.knowledge || 0) +
                         (evaluation.scores?.execution || 0) +
                         (evaluation.scores?.relational || 0) +
                         (evaluation.scores?.collaborative || 0) +
                         (evaluation.scores?.control || 0)) / 5
                      );

                      return (
                        <div 
                          key={evaluation.id} 
                          className="p-4 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200 hover:border-indigo-300 rounded-2xl transition-all shadow-xs flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <AgentAvatarLogo name={agent.name} initials={agent.initials} tierColor={TIER_COLORS[agent.tierId] || '#64748b'} size="sm" />
                              <div className="min-w-0">
                                <h4 className="font-bold text-slate-900 text-xs truncate">{agent.name}</h4>
                                <p className="text-[10px] text-slate-500">{evaluation.title || `Evaluación #${evaluation.evalNumber}`} • {evaluation.date}</p>
                              </div>
                            </div>

                            <div className="text-right">
                              <span className={`inline-block font-black text-sm font-display px-2.5 py-0.5 rounded-lg ${
                                avgScore >= 80 ? 'bg-emerald-100 text-emerald-800' : avgScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {avgScore}%
                              </span>
                              <p className="text-[9px] text-slate-400 font-medium mt-0.5">{evaluation.evaluator || 'Evaluador Senior'}</p>
                            </div>
                          </div>

                          {/* MIMO snippet */}
                          {evaluation.mimo && (
                            <div className="bg-white p-2.5 rounded-xl border border-slate-100 text-[11px] text-slate-600 space-y-1">
                              <p className="line-clamp-1"><strong className="text-emerald-700 font-extrabold">Mantener:</strong> {evaluation.mimo.mantener}</p>
                              <p className="line-clamp-1"><strong className="text-rose-700 font-extrabold">Mejorar:</strong> {evaluation.mimo.mejorar}</p>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-200/70 text-slate-700 rounded font-bold">K:{evaluation.scores?.knowledge}%</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-200/70 text-slate-700 rounded font-bold">E:{evaluation.scores?.execution}%</span>
                              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-200/70 text-slate-700 rounded font-bold">R:{evaluation.scores?.relational}%</span>
                            </div>
                            <button
                              onClick={() => setSelectedEvaluationDetail({ agent, eval: evaluation })}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                            >
                              <span>Ver Detalle</span>
                              <span className="material-symbols-outlined text-sm">visibility</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Directory / Historical Table inside Dashboard */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display font-extrabold text-slate-900 text-lg flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600">list_alt</span>
                      Directorio de Auditorías Registradas
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">Consulta el historial de evaluaciones de cada técnico y accede a su bitácora.</p>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[200px]">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                      <input
                        type="text"
                        placeholder="Buscar agente o rol..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <select
                      value={selectedTierFilter}
                      onChange={(e) => setSelectedTierFilter(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">Todos los Tiers</option>
                      <option value="l1">Nivel 1 (L1)</option>
                      <option value="l1.5">Nivel 1.5 (L1.5)</option>
                      <option value="l2">Nivel 2 (L2)</option>
                      <option value="l3">Nivel 3 (L3)</option>
                      <option value="l4">Nivel 4 (L4)</option>
                    </select>

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="all">Todos los Estados</option>
                      <option value="evaluated">Con Evaluación</option>
                      <option value="pending">Sin Evaluación</option>
                    </select>
                  </div>
                </div>

                {/* Table Section 1: Tier L Agents (Evaluable) */}
                <div className="overflow-x-auto border border-slate-200 rounded-2xl mb-6 shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                      <span className="font-mono text-xs font-extrabold uppercase text-slate-800">
                        Agentes Técnicos de Operación (Tiers L) — Evaluables
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-200/70 px-2.5 py-0.5 rounded-full">
                      {filteredLAgents.length} Disponibles para Auditoría
                    </span>
                  </div>
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-mono uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5">Agente Técnico</th>
                        <th className="p-3.5">Evaluaciones</th>
                        <th className="p-3.5">Puntuación Global</th>
                        <th className="p-3.5">Desglose 5 Ejes (K, E, R, C, Ctrl)</th>
                        <th className="p-3.5 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredLAgents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-400 font-medium">
                            No se encontraron agentes evaluables con los filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        filteredLAgents.map(agent => {
                          const globalScore = getAgentGlobalScore(agent);
                          const evalsCount = getAgentEvalsCount(agent);
                          const scores = getAgentDimensionScores(agent);

                          return (
                            <tr key={agent.id} className="hover:bg-indigo-50/40 transition-colors">
                              <td className="p-3.5">
                                <div className="flex items-center gap-3">
                                  <AgentAvatarLogo name={agent.name} initials={agent.initials} tierColor={TIER_COLORS[agent.tierId] || '#64748b'} size="sm" />
                                  <div>
                                    <p className="font-bold text-slate-900 text-xs">{agent.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-slate-500">{agent.role}</span>
                                      <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                        {TIER_LABELS[agent.tierId] || agent.tierId}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <span className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full text-xs ${
                                  evalsCount > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'bg-slate-100 text-slate-500'
                                }`}>
                                  <span className="material-symbols-outlined text-sm">history</span>
                                  {evalsCount === 0 ? '0 Semanales' : `${evalsCount}ª Semanales`}
                                </span>
                              </td>

                              <td className="p-3.5">
                                <div className="flex items-center gap-2">
                                  <span className={`font-black text-sm font-display ${
                                    globalScore >= 80 ? 'text-emerald-600' : globalScore >= 60 ? 'text-amber-600' : 'text-rose-600'
                                  }`}>
                                    {globalScore}%
                                  </span>
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                                    globalScore >= 80 ? 'bg-emerald-100 text-emerald-800' : globalScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                  }`}>
                                    {globalScore >= 80 ? 'Excelente' : globalScore >= 60 ? 'En Norma' : 'Bajo Estándar'}
                                  </span>
                                </div>
                              </td>

                              <td className="p-3.5">
                                <div className="flex items-center gap-1.5">
                                  <span className="px-1.5 py-0.5 rounded bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] font-mono font-bold" title="Conocimiento">
                                    K: {scores.knowledge}%
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-mono font-bold" title="Ejecución">
                                    E: {scores.execution}%
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-mono font-bold" title="Relacional">
                                    R: {scores.relational}%
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-mono font-bold" title="Colaborativo">
                                    C: {scores.collaborative}%
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-mono font-bold" title="Control">
                                    Ctrl: {scores.control}%
                                  </span>
                                </div>
                              </td>

                              <td className="p-3.5 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {evalsCount > 0 && (
                                    <button
                                      onClick={() => setSelectedHistoryAgent(agent)}
                                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-xs transition-colors border border-slate-200 inline-flex items-center gap-1"
                                      title="Ver histórico de evaluaciones publicadas"
                                    >
                                      <span className="material-symbols-outlined text-sm">history</span>
                                      <span>Ver Histórico ({evalsCount})</span>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => startEvaluationForAgent(agent.id)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors shadow-xs inline-flex items-center gap-1"
                                  >
                                    <span>Auditar / Evaluar</span>
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Section 2: Tier S1 & S2 Agents (Admin / Frozen Stats) */}
                {filteredSAgents.length > 0 && (
                  <div className="overflow-x-auto border border-amber-200 rounded-2xl bg-amber-50/20 shadow-xs">
                    <div className="px-4 py-3 bg-amber-100/50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-amber-700 text-base">lock</span>
                        <span className="font-mono text-xs font-extrabold uppercase text-amber-900">
                          Equipo Administrativo y Supervisores (Tiers S1 y S2)
                        </span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-200/80 text-amber-900 border border-amber-300">
                          Estadísticas Congeladas (Admin)
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-amber-800">
                        Exentos de Auditoría Semanal ({filteredSAgents.length})
                      </span>
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-amber-100/30 border-b border-amber-200 text-amber-800 font-mono uppercase text-[10px]">
                        <tr>
                          <th className="p-3.5">Supervisión / Admin</th>
                          <th className="p-3.5">Estado</th>
                          <th className="p-3.5">Estatus Módulo</th>
                          <th className="p-3.5">Aviso de Operación</th>
                          <th className="p-3.5 text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-amber-100 bg-white/70">
                        {filteredSAgents.map(agent => (
                          <tr key={agent.id} className="hover:bg-amber-50/50 transition-colors">
                            <td className="p-3.5">
                              <div className="flex items-center gap-3">
                                <AgentAvatarLogo name={agent.name} initials={agent.initials} tierColor={TIER_COLORS[agent.tierId] || '#d97706'} size="sm" />
                                <div>
                                  <p className="font-bold text-slate-900 text-xs">{agent.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-500">{agent.role}</span>
                                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                      {TIER_LABELS[agent.tierId] || agent.tierId.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className="inline-flex items-center gap-1 font-extrabold px-2.5 py-1 rounded-full text-[11px] bg-amber-100 text-amber-800 border border-amber-200">
                                <span className="material-symbols-outlined text-xs">lock</span>
                                Equipo Admin
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="text-xs font-bold text-slate-600 italic">
                                Estadísticas Congeladas
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="text-[11px] font-medium text-slate-500">
                                Líderes de equipo / No requieren evaluación semanal.
                              </span>
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                disabled
                                className="bg-slate-100 text-slate-400 font-bold px-3.5 py-1.5 rounded-xl text-xs border border-slate-200 cursor-not-allowed inline-flex items-center gap-1 opacity-80"
                              >
                                <span className="material-symbols-outlined text-xs">lock</span>
                                <span>No Evaluable</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* VIEW 2: DIRECTORIO DE AGENTES */}
          {topTab === 'directory' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* Header Banner Directorio */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-600"></div>
                <div className="flex items-center gap-4 pl-2">
                  <div className="p-3.5 bg-indigo-50 rounded-2xl text-indigo-600 border border-indigo-100">
                    <span className="material-symbols-outlined font-bold text-3xl">badge</span>
                  </div>
                  <div>
                    <h2 className="font-display text-xl font-extrabold text-slate-900">Directorio de Agentes de Operación</h2>
                    <p className="text-sm text-slate-500 mt-1 font-medium">Seleccione un técnico para revisar sus KPIs, auditar sus tickets y registrar una nueva evaluación semanal.</p>
                  </div>
                </div>
              </div>

              {/* Filters Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                
                {/* Search */}
                <div className="relative flex-1">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                  <input
                    type="text"
                    placeholder="Buscar agente por nombre, rol o siglas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Tier Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1">Tier:</span>
                  {['all', 'l1', 'l1.5', 'l2', 'l3', 'l4', 's1', 's2'].map(tierKey => (
                    <button
                      key={tierKey}
                      type="button"
                      onClick={() => setSelectedTierFilter(tierKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        selectedTierFilter === tierKey
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {tierKey === 'all' ? 'Todos' : TIER_LABELS[tierKey] || tierKey}
                    </button>
                  ))}
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">Estado:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todos los Agentes</option>
                    <option value="evaluated">Con Evaluación Semanal</option>
                    <option value="pending">Sin Evaluación Previa</option>
                  </select>
                </div>

              </div>

              {/* Grid Section 1: Agentes de Operación (Tiers L) */}
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
                    <h3 className="font-mono text-xs font-extrabold uppercase text-slate-800 tracking-wider">
                      Agentes de Operación (Tiers L) — Evaluables
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {filteredLAgents.length} {filteredLAgents.length === 1 ? 'Agente' : 'Agentes'}
                  </span>
                </div>

                {filteredLAgents.length === 0 ? (
                  <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-400 font-medium">
                    No se encontraron agentes evaluables en Tier L con los filtros actuales.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredLAgents.map(agent => {
                      const globalScore = getAgentGlobalScore(agent);
                      const evalsCount = getAgentEvalsCount(agent);
                      const scores = getAgentDimensionScores(agent);

                      return (
                        <div 
                          key={agent.id} 
                          className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-indigo-300 transition-all flex flex-col gap-5 group relative overflow-hidden"
                        >
                          {/* Accent bar */}
                          <div className={`absolute top-0 left-0 w-full h-1.5 ${globalScore >= 80 ? 'bg-emerald-500' : globalScore >= 60 ? 'bg-amber-400' : 'bg-rose-500'}`}></div>

                          {/* Header info */}
                          <div className="flex items-start justify-between gap-3 pt-1">
                            <div className="flex items-center gap-3.5 min-w-0">
                              <AgentAvatarLogo name={agent.name} initials={agent.initials} tierColor={TIER_COLORS[agent.tierId] || '#64748b'} size="md" />
                              <div className="min-w-0">
                                <h3 className="font-bold text-slate-900 text-base leading-snug truncate group-hover:text-indigo-600 transition-colors">
                                  {agent.name}
                                </h3>
                                <p className="text-xs text-slate-500 truncate">{agent.role}</p>
                              </div>
                            </div>

                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 whitespace-nowrap">
                              {TIER_LABELS[agent.tierId] || agent.tierId}
                            </span>
                          </div>

                          {/* Score metrics */}
                          <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100/80 flex items-center justify-between">
                            <div>
                              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Desempeño Acumulado</p>
                              <div className="flex items-baseline gap-2 mt-0.5">
                                <p className={`text-2xl font-black font-display leading-none ${
                                  globalScore >= 80 ? 'text-emerald-600' : globalScore >= 60 ? 'text-amber-500' : 'text-rose-600'
                                }`}>
                                  {globalScore}%
                                </p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                  globalScore >= 80 ? 'bg-emerald-100 text-emerald-800' : globalScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {globalScore >= 80 ? 'Excelente' : globalScore >= 60 ? 'En Norma' : 'Bajo Estándar'}
                                </span>
                              </div>
                            </div>

                            <div className="text-right">
                              <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Histórico</p>
                              <p className="text-sm font-bold text-slate-800 mt-0.5">
                                {evalsCount === 0 ? 'Sin auditorías' : `${evalsCount}ª Eval`}
                              </p>
                            </div>
                          </div>

                          {/* Dimension scores preview */}
                          <div className="space-y-1.5 pt-1 border-t border-slate-100">
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-cyan-500"></span> Certificaciones
                              </span>
                              <span className="font-mono font-bold">{scores.knowledge}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Troubleshooting
                              </span>
                              <span className="font-mono font-bold">{scores.execution}%</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] font-medium text-slate-600">
                              <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Servicio al Cliente
                              </span>
                              <span className="font-mono font-bold">{scores.relational}%</span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div className="mt-auto pt-2 flex items-center gap-2">
                            {evalsCount > 0 && (
                              <button
                                onClick={() => setSelectedHistoryAgent(agent)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 px-3 rounded-xl text-xs font-bold transition-all border border-slate-200 flex items-center justify-center gap-1"
                                title="Ver evaluaciones publicadas"
                              >
                                <span className="material-symbols-outlined text-sm">history</span>
                                <span>Ver ({evalsCount})</span>
                              </button>
                            )}
                            <button 
                              onClick={() => startEvaluationForAgent(agent.id)}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                            >
                              <span>{evalsCount === 0 ? 'Iniciar Evaluación' : 'Continuar Auditoría'}</span>
                              <span className="material-symbols-outlined text-sm">arrow_forward</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grid Section 2: Equipo Admin / Supervisión (Tiers S1 y S2) */}
              {filteredSAgents.length > 0 && (
                <div className="mt-4 pt-6 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-amber-600 text-base">lock</span>
                      <h3 className="font-mono text-xs font-extrabold uppercase text-slate-800 tracking-wider">
                        Equipo Administrativo y Supervisores (Tiers S1 y S2)
                      </h3>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        Estadísticas Congeladas
                      </span>
                    </div>
                    <span className="text-xs font-bold text-slate-500">
                      {filteredSAgents.length} {filteredSAgents.length === 1 ? 'Líder Admin' : 'Líderes Admin'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filteredSAgents.map(agent => (
                      <div 
                        key={agent.id} 
                        className="bg-slate-50/60 border border-amber-200 rounded-3xl p-5 shadow-xs flex flex-col gap-4 relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500"></div>

                        <div className="flex items-start justify-between gap-3 pt-1">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <AgentAvatarLogo name={agent.name} initials={agent.initials} tierColor={TIER_COLORS[agent.tierId] || '#d97706'} size="md" />
                            <div className="min-w-0">
                              <h3 className="font-bold text-slate-900 text-base leading-snug truncate">
                                {agent.name}
                              </h3>
                              <p className="text-xs text-slate-500 truncate">{agent.role}</p>
                            </div>
                          </div>

                          <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 whitespace-nowrap">
                            {TIER_LABELS[agent.tierId] || agent.tierId.toUpperCase()}
                          </span>
                        </div>

                        <div className="bg-amber-100/40 rounded-2xl p-3.5 border border-amber-200/60 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-amber-700 text-lg">lock</span>
                            <div>
                              <p className="text-[10px] uppercase font-extrabold text-amber-900 font-mono tracking-wider">Estatus Admin</p>
                              <p className="text-xs font-bold text-amber-800 mt-0.5">Estadísticas Congeladas</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/80 text-amber-900 border border-amber-200">
                            Exento de Auditoría
                          </span>
                        </div>

                        <div className="mt-auto pt-2">
                          <button 
                            disabled
                            className="w-full bg-slate-200/80 text-slate-500 py-2.5 rounded-xl text-xs font-bold border border-slate-300 cursor-not-allowed flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">lock</span>
                            <span>No Evaluable (Equipo Admin)</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* VIEW 3: LISTADO DE EVALUACIONES REALIZADAS */}
          {topTab === 'evaluations' && (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* Hero Banner */}
              <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-50/80 rounded-full blur-3xl pointer-events-none"></div>
                
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-extrabold">
                      <span className="material-symbols-outlined text-sm">fact_check</span>
                      Registro de Evaluaciones
                    </div>
                    <h2 className="font-display text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                      Histórico y Listado de Evaluaciones Realizadas
                    </h2>
                    <p className="text-slate-600 text-sm leading-relaxed font-sans font-medium">
                      Consulte todas las auditorías semanales registradas, desglose por los 5 ejes, compromisos MIMO y reportes completos de calibración por técnico.
                    </p>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="text-center p-2">
                      <p className="text-[10px] font-extrabold uppercase font-mono text-slate-400">Evaluaciones</p>
                      <p className="text-xl font-black text-indigo-700 mt-0.5">{allPublishedEvaluations.length}</p>
                    </div>
                    <div className="text-center p-2 border-l border-slate-200">
                      <p className="text-[10px] font-extrabold uppercase font-mono text-slate-400">Técnicos</p>
                      <p className="text-xl font-black text-slate-800 mt-0.5">
                        {new Set(allPublishedEvaluations.map(e => e.agent.id)).size}
                      </p>
                    </div>
                    <div className="text-center p-2 border-l border-slate-200">
                      <p className="text-[10px] font-extrabold uppercase font-mono text-slate-400">Prom. Global</p>
                      <p className="text-xl font-black text-emerald-600 mt-0.5">
                        {(() => {
                          if (allPublishedEvaluations.length === 0) return '0%';
                          const total = allPublishedEvaluations.reduce((acc, curr) => {
                            const sc = curr.evaluation.scores;
                            if (!sc) return acc;
                            return acc + ((sc.knowledge || 0) + (sc.execution || 0) + (sc.relational || 0) + (sc.collaborative || 0) + (sc.control || 0)) / 5;
                          }, 0);
                          return `${Math.round(total / allPublishedEvaluations.length)}%`;
                        })()}
                      </p>
                    </div>
                    <div className="text-center p-2 border-l border-slate-200">
                      <p className="text-[10px] font-extrabold uppercase font-mono text-slate-400">Filtradas</p>
                      <p className="text-xl font-black text-slate-800 mt-0.5">{filteredPublishedEvaluations.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-filter Toolbar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4">
                
                {/* Search Bar */}
                <div className="relative flex-1 min-w-[240px]">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base">search</span>
                  <input
                    type="text"
                    placeholder="Buscar por agente, evaluador, título o palabra clave MIMO..."
                    value={evalSearchTerm}
                    onChange={(e) => setEvalSearchTerm(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  
                  {/* Agente dropdown */}
                  <select
                    value={evalAgentFilter}
                    onChange={(e) => setEvalAgentFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todos los Agentes ({evalAgents.length})</option>
                    {evalAgents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                  </select>

                  {/* Tier dropdown */}
                  <select
                    value={evalTierFilter}
                    onChange={(e) => setEvalTierFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todos los Tiers</option>
                    {['l1', 'l1.5', 'l2', 'l3', 'l4', 's1', 's2'].map(t => (
                      <option key={t} value={t}>{TIER_LABELS[t] || t.toUpperCase()}</option>
                    ))}
                  </select>

                  {/* Score level dropdown */}
                  <select
                    value={evalScoreFilter}
                    onChange={(e) => setEvalScoreFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todos los Niveles</option>
                    <option value="sobresaliente">Sobresaliente (≥90%)</option>
                    <option value="cumple">Bien / Cumple Estándar (75-89%)</option>
                    <option value="desarrollo">En Desarrollo (50-74%)</option>
                    <option value="insuficiente">Insuficiente (&lt;50%)</option>
                  </select>

                  {/* Flow filter dropdown */}
                  <select
                    value={evalFlowFilter}
                    onChange={(e) => setEvalFlowFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all">Todos los Flujos</option>
                    <option value="flow">Gala Completa (5 Ejes)</option>
                    <option value="specific">Auditoría Específica</option>
                  </select>

                  {/* Sort dropdown */}
                  <select
                    value={evalSortBy}
                    onChange={(e) => setEvalSortBy(e.target.value as any)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="newest">Más Recientes Primero</option>
                    <option value="oldest">Más Antiguas Primero</option>
                    <option value="highest">Mayor Puntaje</option>
                    <option value="lowest">Menor Puntaje</option>
                  </select>

                  {/* Reset filters button */}
                  {(evalSearchTerm || evalAgentFilter !== 'all' || evalTierFilter !== 'all' || evalScoreFilter !== 'all' || evalFlowFilter !== 'all' || evalSortBy !== 'newest') && (
                    <button
                      onClick={() => {
                        setEvalSearchTerm('');
                        setEvalAgentFilter('all');
                        setEvalTierFilter('all');
                        setEvalScoreFilter('all');
                        setEvalFlowFilter('all');
                        setEvalSortBy('newest');
                      }}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold transition-all flex items-center gap-1"
                      title="Limpiar filtros"
                    >
                      <span className="material-symbols-outlined text-sm">restart_alt</span>
                      Limpiar
                    </button>
                  )}
                </div>
              </div>

              {/* List / Table of Evaluations */}
              {filteredPublishedEvaluations.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center shadow-sm space-y-3">
                  <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
                  <h3 className="font-bold text-slate-800 text-base">No se encontraron evaluaciones</h3>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    No existen evaluaciones publicadas que coincidan con los criterios o filtros seleccionados. Intente ajustar los términos de búsqueda o limpiar los filtros.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-extrabold uppercase font-mono text-slate-500 tracking-wider">
                          <th className="py-3.5 px-4">Técnico / Agente</th>
                          <th className="py-3.5 px-4">Evaluación & Fecha</th>
                          <th className="py-3.5 px-4 text-center">Desglose 5 Ejes</th>
                          <th className="py-3.5 px-4 text-center">Calificación Global</th>
                          <th className="py-3.5 px-4 text-center">Flujo & Casos</th>
                          <th className="py-3.5 px-4 text-right">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs font-sans">
                        {paginatedEvaluations.map(({ agent, evaluation }) => {
                          const sc = evaluation.scores || { knowledge: 80, execution: 80, relational: 80, collaborative: 80, control: 80 };
                          const avgScore = Math.round(
                            ((sc.knowledge || 0) +
                             (sc.execution || 0) +
                             (sc.relational || 0) +
                             (sc.collaborative || 0) +
                             (sc.control || 0)) / 5
                          );

                          const isCritical = Boolean(
                            evaluation.isCriticalFail || (evaluation.criticalFaultsApplied && evaluation.criticalFaultsApplied.length > 0)
                          );
                          const finalScore = isCritical 
                            ? (evaluation.finalScoreOverride ?? -(evaluation.criticalPenaltyPct || 100)) 
                            : avgScore;

                          const getStatusInfo = (score: number, isCrit: boolean) => {
                            if (isCrit) {
                              return {
                                label: `Anulada (${score}%)`,
                                badgeClass: 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold',
                                dot: 'bg-rose-600'
                              };
                            }
                            if (score >= 90) return { label: 'Sobresaliente', badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' };
                            if (score >= 75) return { label: 'Bien', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500' };
                            if (score >= 50) return { label: 'En Desarrollo', badgeClass: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
                            return { label: 'Insuficiente', badgeClass: 'bg-rose-50 text-rose-800 border-rose-200', dot: 'bg-rose-500' };
                          };

                          const statusInfo = getStatusInfo(finalScore, isCritical);

                          return (
                            <tr 
                              key={`${agent.id}-${evaluation.id}`}
                              onClick={() => setSelectedEvaluationDetail({ agent, eval: evaluation })}
                              className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                            >
                              {/* Agent Column */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-3">
                                  <AgentAvatarLogo
                                    name={agent.name}
                                    initials={agent.initials}
                                    tierColor={TIER_COLORS[agent.tierId] || '#64748b'}
                                    size="sm"
                                  />
                                  <div>
                                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                                      {agent.name}
                                      <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono">
                                        {agent.id}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-extrabold text-indigo-600">
                                      {TIER_LABELS[agent.tierId] || agent.tierId.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Title & Evaluator */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-800 flex items-center gap-2">
                                  {evaluation.title || `Evaluación Formal #${evaluation.evalNumber || 1}`}
                                  {isCritical && (
                                    <span className="text-[9px] font-black uppercase bg-rose-600 text-white px-1.5 py-0.5 rounded">
                                      Anulada
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center gap-2.5 mt-0.5">
                                  <span className="inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px] text-slate-400">calendar_today</span>
                                    {evaluation.date}
                                  </span>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[13px] text-slate-400">person</span>
                                    {evaluation.evaluator || 'Calibrador Senior'}
                                  </span>
                                </div>
                              </td>

                              {/* 5 Ejes */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="inline-flex flex-col items-center gap-1">
                                  <div className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-slate-50 p-1 rounded-lg border border-slate-200">
                                    <span title="Conocimiento" className="px-1.5 py-0.5 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">C:{sc.knowledge}%</span>
                                    <span title="Ejecución" className="px-1.5 py-0.5 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">E:{sc.execution}%</span>
                                    <span title="Servicio" className="px-1.5 py-0.5 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">S:{sc.relational}%</span>
                                    <span title="Colaboración" className="px-1.5 py-0.5 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">O:{sc.collaborative}%</span>
                                    <span title="Control" className="px-1.5 py-0.5 rounded bg-white text-slate-700 shadow-2xs border border-slate-100">K:{sc.control}%</span>
                                  </div>
                                  {isCritical && (
                                    <span className="text-[9px] font-extrabold text-rose-700 uppercase font-mono tracking-wider">
                                      (Puntuaciones en Registro)
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Score & Badge */}
                              <td className="py-3.5 px-4 text-center">
                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-black ${statusInfo.badgeClass}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></span>
                                  {isCritical ? statusInfo.label : `${avgScore}% — ${statusInfo.label}`}
                                </div>
                              </td>

                              {/* Flow & Audited cases */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="text-xs font-bold text-slate-700">
                                  {evaluation.flowType === 'specific' ? 'Auditoría Específica' : 'Gala Completa'}
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  {evaluation.auditedCasesList?.length ? `${evaluation.auditedCasesList.length} caso(s)` : 'Sin casos'}
                                </div>
                              </td>

                              {/* Action */}
                              <td className="py-3.5 px-4 text-right">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedEvaluationDetail({ agent, eval: evaluation });
                                  }}
                                  className="w-8 h-8 rounded-lg border border-slate-200 bg-white text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-200 group-hover:bg-indigo-50/80 transition-all inline-flex items-center justify-center cursor-pointer ml-auto"
                                  title="Ver detalle de la evaluación"
                                >
                                  <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                    <div className="text-slate-500 font-medium text-center sm:text-left">
                      Mostrando <strong className="text-slate-800 font-bold">{((evalPage - 1) * EVAL_ITEMS_PER_PAGE) + 1}</strong> a <strong className="text-slate-800 font-bold">{Math.min(evalPage * EVAL_ITEMS_PER_PAGE, filteredPublishedEvaluations.length)}</strong> de <strong className="text-slate-800 font-bold">{filteredPublishedEvaluations.length}</strong> evaluaciones
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Previous Page Button */}
                      <button
                        onClick={() => setEvalPage(p => Math.max(1, p - 1))}
                        disabled={evalPage === 1}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
                        title="Página Anterior"
                      >
                        <span className="material-symbols-outlined text-base">chevron_left</span>
                      </button>

                      {/* Page Numbers */}
                      <div className="flex items-center gap-1 px-1">
                        {Array.from({ length: totalEvalPages }, (_, i) => i + 1).map(pageNum => (
                          <button
                            key={pageNum}
                            onClick={() => setEvalPage(pageNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                              evalPage === pageNum
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {pageNum}
                          </button>
                        ))}
                      </div>

                      {/* Next Page Button */}
                      <button
                        onClick={() => setEvalPage(p => Math.min(totalEvalPages, p + 1))}
                        disabled={evalPage >= totalEvalPages}
                        className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center cursor-pointer"
                        title="Página Siguiente"
                      >
                        <span className="material-symbols-outlined text-base">chevron_right</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* EVALUATION ROOM / STEPS */}
      {mode !== 'directory' && currentAgent && (
        <div className="flex flex-col gap-6">
          <div className="flex justify-between items-center">
            <button 
              onClick={() => {
                if (mode === 'room') setMode('directory');
                else if (mode === 'select-specific' || mode === 'evaluate' || mode === 'finalize') setMode('room');
              }}
              className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-bold text-sm bg-white border border-slate-200 px-4 py-2 rounded-xl shadow-sm hover:shadow"
            >
              <span className="material-symbols-outlined text-lg">arrow_back</span>
              {mode === 'room' ? (topTab === 'dashboard' ? 'Volver al Dashboard' : 'Volver al Directorio') : 'Volver a Opciones de Evaluación'}
            </button>

            <span className="text-xs text-slate-500 font-medium">
              Evaluación para: <strong className="text-slate-900">{currentAgent.name}</strong>
            </span>
          </div>

          {/* Agent Header Banner */}
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-4">
              <AgentAvatarLogo name={currentAgent.name} initials={currentAgent.initials} tierColor={TIER_COLORS[currentAgent.tierId] || '#64748b'} size="lg" className="border-2 border-indigo-600 shadow-md" />
              <div>
                <h2 className="font-display text-xl font-extrabold text-[#0f172a]">{currentAgent.name}</h2>
                <p className="font-sans text-sm text-slate-500">{currentAgent.role}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-mono text-[9px] text-slate-500 uppercase font-bold tracking-wider">XP Actual</p>
              <p className="font-display text-xl font-bold text-indigo-700">{currentAgent.currentXp.toLocaleString()}</p>
            </div>
          </div>

          {mode === 'room' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <button onClick={() => { setFlowType('flow'); setCurrentStep(0); setMode('evaluate'); }} className="bg-white hover:bg-indigo-50 border-2 border-indigo-100 hover:border-indigo-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm hover:shadow-lg transition-all group">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">route</span>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-slate-800">Flujo Paso a Paso</h3>
                  <p className="text-sm text-slate-500 mt-2">Realizar una auditoría completa evaluando cada uno de los 5 criterios por separado.</p>
                </div>
              </button>

              <button onClick={() => setMode('select-specific')} className="bg-white hover:bg-teal-50 border-2 border-teal-100 hover:border-teal-300 rounded-3xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm hover:shadow-lg transition-all group">
                <div className="w-16 h-16 bg-teal-100 text-teal-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-3xl">target</span>
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-lg text-slate-800">Criterio Específico</h3>
                  <p className="text-sm text-slate-500 mt-2">Evaluar únicamente un criterio o KPI puntual, manteniendo los demás intactos.</p>
                </div>
              </button>
            </div>
          )}

          {mode === 'select-specific' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {CRITERIA.map((crit, idx) => (
                <button 
                  key={crit.key} 
                  onClick={() => { setFlowType('specific'); setCurrentStep(idx); setMode('evaluate'); }}
                  className="bg-white border border-slate-200 hover:border-indigo-300 p-5 rounded-2xl flex flex-col gap-3 shadow-sm hover:shadow-md transition-all text-left"
                >
                  <div className={`w-10 h-10 ${crit.bg} text-white rounded-xl flex items-center justify-center`}>
                    <span className="material-symbols-outlined text-xl">{crit.icon}</span>
                  </div>
                  <h4 className="font-bold text-slate-800">{crit.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{crit.desc}</p>
                </button>
              ))}
            </div>
          )}

          {mode === 'evaluate' && (
            <div className="bg-white border border-slate-200 rounded-3xl shadow-md overflow-hidden flex flex-col">
              {/* Progress bar for flow */}
              {flowType === 'flow' && (
                <div className="flex w-full h-2">
                  {CRITERIA.map((c, i) => (
                    <div key={c.key} className={`flex-1 ${i <= currentStep ? c.bg : 'bg-slate-100'}`} />
                  ))}
                </div>
              )}

              {CRITERIA[currentStep].key === 'knowledge' && (
                <KnowledgeCriterion 
                  agent={currentAgent} 
                  globalScore={scores.knowledge} 
                  subScores={subScores.knowledge || {}} 
                  onSubScoreChange={(subId, val) => handleSubScoreChange('knowledge', subId, val)} 
                  certifications={certifications}
                  onUpdateAgent={onUpdateAgent}
                  onNextStep={() => {
                    if (flowType === 'flow' && currentStep < CRITERIA.length - 1) {
                      setCurrentStep(prev => prev + 1);
                    } else {
                      setMode('finalize');
                    }
                  }}
                />
              )}
              {CRITERIA[currentStep].key === 'execution' && (
                <ExecutionCriterion 
                  agent={currentAgent} 
                  globalScore={scores.execution} 
                  subScores={subScores.execution || {}} 
                  onSubScoreChange={(subId, val) => handleSubScoreChange('execution', subId, val)} 
                  certifications={certifications}
                  sheetCases={activeCases}
                  allSheetCases={allSheetCases}
                  useRandomSelection={useRandomSelection}
                  setUseRandomSelection={setUseRandomSelection}
                  manuallySelectedIds={manuallySelectedIds}
                  setManuallySelectedIds={setManuallySelectedIds}
                  onReRollRandom={() => setRandomSeed(prev => prev + 1)}
                  casesLoading={casesLoading}
                  casesError={casesError}
                  feedbackText={accion}
                  onFeedbackChange={setAccion}
                />
              )}
              {CRITERIA[currentStep].key === 'relational' && (
                <RelationalCriterion 
                  agent={currentAgent} 
                  globalScore={scores.relational} 
                  subScores={subScores.relational || {}} 
                  onSubScoreChange={(subId, val) => handleSubScoreChange('relational', subId, val)} 
                  sheetCases={activeCases}
                  allSheetCases={allSheetCases}
                  useRandomSelection={useRandomSelection}
                  setUseRandomSelection={setUseRandomSelection}
                  manuallySelectedIds={manuallySelectedIds}
                  setManuallySelectedIds={setManuallySelectedIds}
                  onReRollRandom={() => setRandomSeed(prev => prev + 1)}
                  casesLoading={casesLoading}
                  casesError={casesError}
                  feedbackText={accion}
                  onFeedbackChange={setAccion}
                />
              )}
              {CRITERIA[currentStep].key === 'collaborative' && (
                <CollaborativeCriterion 
                  agent={currentAgent} 
                  globalScore={scores.collaborative} 
                  subScores={subScores.collaborative || {}} 
                  onSubScoreChange={(subId, val) => handleSubScoreChange('collaborative', subId, val)} 
                  onEvidenceChange={(subId, text) => handleEvidenceChange('collaborative', subId, text)}
                />
              )}
              {CRITERIA[currentStep].key === 'control' && (
                <ControlCriterion 
                  agent={currentAgent} 
                  globalScore={scores.control} 
                  subScores={subScores.control || {}} 
                  onSubScoreChange={(subId, val) => handleSubScoreChange('control', subId, val)} 
                  onEvidenceChange={(subId, text) => handleEvidenceChange('control', subId, text)}
                  allSheetCases={allSheetCases}
                />
              )}

              {CRITERIA[currentStep].key !== 'knowledge' && (
                <div className="bg-slate-50 border-t border-slate-100 p-6 flex justify-between items-center">
                  {flowType === 'flow' && currentStep > 0 ? (
                    <button onClick={() => setCurrentStep(prev => prev - 1)} className="text-slate-500 hover:text-slate-800 font-bold px-4 py-2 transition-colors">
                      &larr; Anterior
                    </button>
                  ) : <div></div>}
                  
                  <button 
                    onClick={() => {
                      if (flowType === 'flow' && currentStep < CRITERIA.length - 1) {
                        setCurrentStep(prev => prev + 1);
                      } else {
                        setMode('finalize');
                      }
                    }}
                    className={`px-8 py-3 rounded-xl font-bold text-white shadow-md transition-colors ${CRITERIA[currentStep].bg} hover:brightness-110 flex items-center gap-2`}
                  >
                    {(flowType === 'specific' || currentStep === CRITERIA.length - 1) ? 'Finalizar y Documentar' : 'Siguiente Criterio'}
                    <span className="material-symbols-outlined text-sm">{(flowType === 'specific' || currentStep === CRITERIA.length - 1) ? 'task_alt' : 'arrow_forward'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'finalize' && (
            <FinalEvaluationSummary
              agent={currentAgent}
              flowType={flowType}
              evaluatedCriterionIndex={currentStep}
              scores={scores}
              subScores={subScores}
              mimoMantener={mimoMantener}
              setMimoMantener={setMimoMantener}
              mimoIniciar={mimoIniciar}
              setMimoIniciar={setMimoIniciar}
              mimoMejorar={mimoMejorar}
              setMimoMejorar={setMimoMejorar}
              mimoOmitir={mimoOmitir}
              setMimoOmitir={setMimoOmitir}
              isMimoOptional={isMimoOptional}
              setIsMimoOptional={setIsMimoOptional}
              criterionFeedbacks={criterionFeedbacks}
              setCriterionFeedbacks={setCriterionFeedbacks}
              onSubmit={handlePublish}
              onGoBackToEdit={() => setMode('evaluate')}
              successMessage={successMessage}
              errorMessage={errorMessage}
              xpYield={xpYield}
            />
          )}
        </div>
      )}

      {/* MODAL 1: HISTÓRICO DE EVALUACIONES DE UN AGENTE */}
      {selectedHistoryAgent && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl p-6 md:p-8 flex flex-col gap-6 relative animate-fade-in">
            <button
              onClick={() => setSelectedHistoryAgent(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-4 pr-10 border-b border-slate-100 pb-4">
              <AgentAvatarLogo
                name={selectedHistoryAgent.name}
                initials={selectedHistoryAgent.initials}
                tierColor={TIER_COLORS[selectedHistoryAgent.tierId] || '#64748b'}
                size="md"
              />
              <div>
                <h3 className="font-display text-xl font-extrabold text-slate-900">
                  Histórico de Auditorías — {selectedHistoryAgent.name}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  {selectedHistoryAgent.role} • {TIER_LABELS[selectedHistoryAgent.tierId] || selectedHistoryAgent.tierId}
                </p>
              </div>
            </div>

            {/* Evaluations List */}
            {(() => {
              const agentEvals = allPublishedEvaluations.filter(e => e.agent.id === selectedHistoryAgent.id);
              if (agentEvals.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm font-medium">
                    No hay evaluaciones publicadas para este agente aún.
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {agentEvals.map(({ evaluation }) => {
                    const avgScore = Math.round(
                      ((evaluation.scores?.knowledge || 0) +
                       (evaluation.scores?.execution || 0) +
                       (evaluation.scores?.relational || 0) +
                       (evaluation.scores?.collaborative || 0) +
                       (evaluation.scores?.control || 0)) / 5
                    );

                    return (
                      <div key={evaluation.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                          <div>
                            <span className="text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
                              {evaluation.title || `Evaluación #${evaluation.evalNumber}`}
                            </span>
                            <span className="text-xs text-slate-500 ml-3 font-medium">
                              📅 {evaluation.date} • 👤 {evaluation.evaluator || 'Calibrador Senior'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500 font-bold">Puntuación:</span>
                            <span className={`text-base font-black font-display px-2.5 py-0.5 rounded-lg ${
                              avgScore >= 80 ? 'bg-emerald-100 text-emerald-800' : avgScore >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {avgScore}%
                            </span>
                          </div>
                        </div>

                        {/* Scores breakdown */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                          <div className="bg-white p-2 rounded-xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Conocimiento</p>
                            <p className="font-mono font-bold text-slate-800 mt-0.5">{evaluation.scores?.knowledge}%</p>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Troubleshooting</p>
                            <p className="font-mono font-bold text-slate-800 mt-0.5">{evaluation.scores?.execution}%</p>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Servicio</p>
                            <p className="font-mono font-bold text-slate-800 mt-0.5">{evaluation.scores?.relational}%</p>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Colaboración</p>
                            <p className="font-mono font-bold text-slate-800 mt-0.5">{evaluation.scores?.collaborative}%</p>
                          </div>
                          <div className="bg-white p-2 rounded-xl border border-slate-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Control</p>
                            <p className="font-mono font-bold text-slate-800 mt-0.5">{evaluation.scores?.control}%</p>
                          </div>
                        </div>

                        {/* MIMO Quad */}
                        {evaluation.mimo && (
                          <div className="bg-white p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                              <p className="font-bold text-emerald-800 text-[11px] mb-1">🟢 1. Mantener (Fortalezas)</p>
                              <p className="text-slate-700 leading-relaxed">{evaluation.mimo.mantener || 'Sin comentarios'}</p>
                            </div>
                            <div className="bg-sky-50/50 p-2.5 rounded-lg border border-sky-100">
                              <p className="font-bold text-sky-800 text-[11px] mb-1">🔵 2. Iniciar (Hábitos Deseados)</p>
                              <p className="text-slate-700 leading-relaxed">{evaluation.mimo.iniciar || 'Sin comentarios'}</p>
                            </div>
                            <div className="bg-rose-50/50 p-2.5 rounded-lg border border-rose-100">
                              <p className="font-bold text-rose-800 text-[11px] mb-1">🔴 3. Mejorar (Áreas de Oportunidad)</p>
                              <p className="text-slate-700 leading-relaxed">{evaluation.mimo.mejorar || 'Sin comentarios'}</p>
                            </div>
                            <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                              <p className="font-bold text-amber-800 text-[11px] mb-1">🟡 4. Omitir (Conductas a Eliminar)</p>
                              <p className="text-slate-700 leading-relaxed">{evaluation.mimo.omitir || 'Sin comentarios'}</p>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-end pt-2">
                          <button
                            onClick={() => setSelectedEvaluationDetail({ agent: selectedHistoryAgent, eval: evaluation })}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <span>Consultar Evaluación Completa (Página por Página)</span>
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL 2: DETALLE COMPLETO PAGINADO DE EVALUACIÓN */}
      {selectedEvaluationDetail && (
        <FullEvaluationDetailModal
          agent={selectedEvaluationDetail.agent}
          evaluation={selectedEvaluationDetail.eval}
          certifications={certifications}
          onClose={() => setSelectedEvaluationDetail(null)}
        />
      )}
    </div>
  );
}
