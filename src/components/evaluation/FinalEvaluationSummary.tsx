import React, { useState, useMemo } from 'react';
import { Agent, DimensionScores } from '../../types';
import { CRITERIA, CRITICAL_BUSINESS_FAULTS } from './criteria/constants';
import { AgentAvatarLogo } from '../AgentAvatarLogo';

interface FinalEvaluationSummaryProps {
  agent: Agent;
  flowType: 'flow' | 'specific';
  evaluatedCriterionIndex: number; // For 'specific' mode
  scores: DimensionScores;
  subScores: Record<string, Record<string, number>>;
  mimoMantener: string;
  setMimoMantener: (val: string) => void;
  mimoIniciar: string;
  setMimoIniciar: (val: string) => void;
  mimoMejorar: string;
  setMimoMejorar: (val: string) => void;
  mimoOmitir: string;
  setMimoOmitir: (val: string) => void;
  isMimoOptional?: boolean;
  setIsMimoOptional?: (val: boolean) => void;
  criterionFeedbacks: Record<string, string>;
  setCriterionFeedbacks: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSubmit: (
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
  ) => void;
  onGoBackToEdit: () => void;
  successMessage?: string;
  errorMessage?: string;
  xpYield: number;
}

const TIER_COLORS: Record<string, string> = {
  l1: '#64748b', l2: '#2563eb', l3: '#7c3aed', l4: '#db2777'
};

export const FinalEvaluationSummary: React.FC<FinalEvaluationSummaryProps> = ({
  agent,
  flowType,
  evaluatedCriterionIndex,
  scores,
  subScores,
  mimoMantener,
  setMimoMantener,
  mimoIniciar,
  setMimoIniciar,
  mimoMejorar,
  setMimoMejorar,
  mimoOmitir,
  setMimoOmitir,
  isMimoOptional = false,
  setIsMimoOptional,
  criterionFeedbacks,
  setCriterionFeedbacks,
  onSubmit,
  onGoBackToEdit,
  successMessage,
  errorMessage,
  xpYield
}) => {
  // Baseline initial scores from the agent before evaluation
  const initialScores: DimensionScores = useMemo(() => {
    const raw = agent.dimensionScores || {
      knowledge: 80,
      execution: 80,
      relational: 80,
      collaborative: 80,
      control: 80
    };
    return {
      knowledge: (raw.knowledge ?? 25) <= 25 ? 80 : raw.knowledge,
      execution: (raw.execution ?? 25) <= 25 ? 80 : raw.execution,
      relational: (raw.relational ?? 25) <= 25 ? 80 : raw.relational,
      collaborative: (raw.collaborative ?? 25) <= 25 ? 80 : raw.collaborative,
      control: (raw.control ?? 25) <= 25 ? 80 : raw.control,
    };
  }, [agent]);

  // State for historical evaluations count (defaults to agent's evaluationsCount or 0)
  const [pastEvalsCount, setPastEvalsCount] = useState<number>(agent.evaluationsCount ?? 0);

  // Total evaluations including this new weekly session
  const newEvaluationsTotal = pastEvalsCount + 1;

  // Percentage weight of this week's evaluation vs historical baseline
  const sessionWeightPct = Math.round((1 / newEvaluationsTotal) * 100);
  const historyWeightPct = 100 - sessionWeightPct;

  // Determine which criteria were evaluated in this session
  const evaluatedCriteria = useMemo(() => {
    if (flowType === 'flow') {
      return CRITERIA;
    } else {
      const idx = Math.max(0, Math.min(evaluatedCriterionIndex, CRITERIA.length - 1));
      return [CRITERIA[idx]];
    }
  }, [flowType, evaluatedCriterionIndex]);

  // Check if a specific criterion key was modified in this evaluation session
  const isKeyEvaluated = (key: string) => {
    return evaluatedCriteria.some(c => c.key === key);
  };

  // Compute PROPORTIONAL cumulative scores for all 5 axes
  const cumulativeScores: DimensionScores = useMemo(() => {
    const result: DimensionScores = { ...initialScores };
    const keys: (keyof DimensionScores)[] = ['knowledge', 'execution', 'relational', 'collaborative', 'control'];

    keys.forEach(k => {
      const sessionVal = scores[k] ?? initialScores[k];
      const oldVal = initialScores[k] ?? 0;
      if (isKeyEvaluated(k)) {
        // Formula: ((OldScore * N) + SessionScore) / (N + 1)
        result[k] = Math.round((oldVal * pastEvalsCount + sessionVal) / newEvaluationsTotal);
      } else {
        result[k] = oldVal;
      }
    });

    return result;
  }, [initialScores, scores, pastEvalsCount, newEvaluationsTotal, evaluatedCriteria]);

  // Calculate Media Total de la Sesión Actual
  const evaluationAverage = useMemo(() => {
    if (flowType === 'flow') {
      const sum = scores.knowledge + scores.execution + scores.relational + scores.collaborative + scores.control;
      return Math.round(sum / 5);
    } else {
      const targetCrit = CRITERIA[Math.max(0, Math.min(evaluatedCriterionIndex, CRITERIA.length - 1))];
      const key = targetCrit.key as keyof DimensionScores;
      return scores[key] || 0;
    }
  }, [flowType, evaluatedCriterionIndex, scores]);

  // Calculate Initial Average across all 5 dimensions
  const initialAverage = useMemo(() => {
    const sum = initialScores.knowledge + initialScores.execution + initialScores.relational + initialScores.collaborative + initialScores.control;
    return Math.round(sum / 5);
  }, [initialScores]);

  // Overall cumulative new average across all 5 dimensions
  const cumulativeAverage = useMemo(() => {
    const sum = cumulativeScores.knowledge + cumulativeScores.execution + cumulativeScores.relational + cumulativeScores.collaborative + cumulativeScores.control;
    return Math.round(sum / 5);
  }, [cumulativeScores]);

  const cumulativeTotalDelta = cumulativeAverage - initialAverage;

  // Helper to get score badge styling
  const getScoreBadge = (score: number) => {
    if (score >= 85) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'Sobresaliente' };
    if (score >= 70) return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'Satisfactorio' };
    if (score >= 60) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'En Seguimiento' };
    return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'Bajo Estándar' };
  };

  // Helper for Radar Chart SVG points (200x200 viewBox)
  const computePoint = (index: number, val: number) => {
    const angle = -Math.PI / 2 + (2 * Math.PI / 5) * index;
    const r = (val / 100) * 75; // 75px max radius
    return { x: Math.round(100 + r * Math.cos(angle)), y: Math.round(100 + r * Math.sin(angle)) };
  };

  // Critical Faults state & calculations
  const [selectedCriticalFaultIds, setSelectedCriticalFaultIds] = useState<string[]>([]);
  const [criticalFaultsNotes, setCriticalFaultsNotes] = useState<string>('');

  const selectedCriticalFaults = useMemo(() => {
    return CRITICAL_BUSINESS_FAULTS.filter(f => selectedCriticalFaultIds.includes(f.id));
  }, [selectedCriticalFaultIds]);

  const totalCriticalPenaltyPct = useMemo(() => {
    return selectedCriticalFaults.reduce((sum, f) => sum + f.penaltyPct, 0);
  }, [selectedCriticalFaults]);

  const isCriticalFail = selectedCriticalFaults.length > 0;

  const finalScoreWithPenalties = useMemo(() => {
    if (!isCriticalFail) return cumulativeAverage;
    // Anulada: La puntuación obtenida en los criterios queda anulada y el resultado final es directamente el penalizador acumulado en negativo.
    return -Math.abs(totalCriticalPenaltyPct);
  }, [cumulativeAverage, isCriticalFail, totalCriticalPenaltyPct]);

  const effectiveXpYield = useMemo(() => {
    if (!isCriticalFail) return xpYield;
    return -Math.abs(Math.round(totalCriticalPenaltyPct * 1.5));
  }, [xpYield, isCriticalFail, totalCriticalPenaltyPct]);

  const toggleCriticalFault = (id: string) => {
    setSelectedCriticalFaultIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getPolygonPoints = (data: DimensionScores) => {
    return `${computePoint(0, data.knowledge).x},${computePoint(0, data.knowledge).y} ` +
           `${computePoint(1, data.execution).x},${computePoint(1, data.execution).y} ` +
           `${computePoint(2, data.relational).x},${computePoint(2, data.relational).y} ` +
           `${computePoint(3, data.collaborative).x},${computePoint(3, data.collaborative).y} ` +
           `${computePoint(4, data.control).x},${computePoint(4, data.control).y}`;
  };

  const currentAverageBadge = getScoreBadge(evaluationAverage);
  const cumulativeAverageBadge = getScoreBadge(cumulativeAverage);

  const handleFeedbackChange = (key: string, value: string) => {
    setCriterionFeedbacks(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      
      {/* Top Banner / Mode Header */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
        <div className="flex items-center gap-4 pl-2">
          <AgentAvatarLogo 
            name={agent.name} 
            initials={agent.initials} 
            tierColor={TIER_COLORS[agent.tierId] || '#64748b'} 
            size="lg" 
            className="border-2 border-indigo-600 shadow-md shrink-0" 
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                flowType === 'flow' ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-teal-100 text-teal-700 border border-teal-200'
              }`}>
                {flowType === 'flow' ? 'Flujo Completo (5 Criterios)' : `Criterio Específico (${evaluatedCriteria[0]?.title})`}
              </span>
              <span className="text-xs text-slate-500 font-medium">| {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            <h2 className="font-display text-xl font-extrabold text-slate-900 mt-1">
              Resumen Final de Evaluación — {agent.name}
            </h2>
            <p className="text-xs text-slate-600 font-medium mt-0.5">{agent.role} &bull; Auditoría de Desempeño Técnico y Trazabilidad</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
          <button
            type="button"
            onClick={onGoBackToEdit}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">edit</span>
            Modificar Criterios
          </button>
        </div>
      </div>

      {/* Main Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Media Total de Evaluación Semanal y Acumulada */}
        {isCriticalFail ? (
          <div className="bg-rose-50/90 rounded-3xl p-6 shadow-sm border-2 border-rose-300 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600"></div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-rose-800 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-rose-600">block</span>
                  Evaluación Anulada
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white shadow-2xs">
                  Infracción Crítica
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase line-through">
                    Promedio ({cumulativeAverage}%)
                  </span>
                  <span className="font-display text-3xl font-black text-rose-700">
                    {finalScoreWithPenalties}%
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-rose-900 mt-4 pt-3 border-t border-rose-200/80 leading-relaxed font-medium">
              Puntuación de la evaluación <strong>ANULADA</strong>. La nota obtenida ({cumulativeAverage}%) se conserva únicamente como registro auditante. El resultado final es el penalizador: <strong>{finalScoreWithPenalties}%</strong>.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600"></div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-indigo-700">
                  Resultado Semanal vs. Acumulado
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${cumulativeAverageBadge.bg}`}>
                  {cumulativeAverageBadge.text}
                </span>
              </div>
              <div className="flex items-baseline gap-3 mt-3">
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Sesión Semanal</span>
                  <span className="font-display text-3xl font-black text-slate-700">{evaluationAverage}%</span>
                </div>
                <div className="text-xl font-black text-slate-300">&rarr;</div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-mono font-bold text-indigo-700 uppercase">Nuevo Acumulado</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-3xl font-black text-indigo-950">{cumulativeAverage}%</span>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
                      cumulativeTotalDelta > 0 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                        : cumulativeTotalDelta < 0 
                        ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {cumulativeTotalDelta > 0 ? `+${cumulativeTotalDelta}%` : `${cumulativeTotalDelta}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100 leading-relaxed font-medium">
              {pastEvalsCount === 0
                ? `Primera evaluación registrada para ${agent.name}. Establece el promedio acumulado inicial al ${cumulativeAverage}%.`
                : flowType === 'flow' 
                  ? `Impacto proporcional ponderado sobre las ${newEvaluationsTotal} evaluaciones semanales registradas.`
                  : `Resultado del eje ${evaluatedCriteria[0]?.title}. Afecta proporcionalmente el promedio acumulado al ${cumulativeAverage}%.`}
            </p>
          </div>
        )}

        {/* Card 2: Rendimiento XP */}
        {isCriticalFail ? (
          <div className="bg-rose-50/90 rounded-3xl p-6 shadow-sm border-2 border-rose-300 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-rose-800">
                  Deducción de XP
                </span>
                <span className="p-1.5 bg-rose-100 text-rose-700 rounded-xl">
                  <span className="material-symbols-outlined text-xl">trending_down</span>
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-display text-4xl font-black text-rose-700">{effectiveXpYield}</span>
                <span className="text-xs font-extrabold text-rose-800">XP</span>
              </div>
            </div>
            <p className="text-xs text-rose-900 mt-4 pt-3 border-t border-rose-200/80 leading-relaxed font-medium">
              Experiencia descontada directamente del perfil de <strong className="text-rose-950">{agent.name}</strong> por infracción crítica.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-emerald-700">
                  Rendimiento Estimado
                </span>
                <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-xl">
                  <span className="material-symbols-outlined text-xl">trending_up</span>
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="font-display text-4xl font-black text-slate-900">+{xpYield}</span>
                <span className="text-xs font-extrabold text-emerald-700">XP</span>
              </div>
            </div>
            <p className="text-xs text-slate-600 mt-4 pt-3 border-t border-slate-100 leading-relaxed font-medium">
              Experiencia (XP) que se acreditará al perfil de <strong className="text-slate-900">{agent.name}</strong> al publicar esta ficha.
            </p>
          </div>
        )}

        {/* Card 3: Ponderación de Evaluaciones Semanales */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-slate-700">
                Histórico de Evaluaciones
              </span>
              <span className="p-1.5 bg-indigo-50 text-indigo-700 rounded-xl">
                <span className="material-symbols-outlined text-xl">history</span>
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mt-2">
              <span className="font-display text-3xl font-black text-slate-900">
                {newEvaluationsTotal}ª
              </span>
              <span className="text-xs text-slate-600 font-semibold">
                {pastEvalsCount === 0 ? 'Evaluación Inicial (1ª Eval)' : 'Evaluación Semanal'}
              </span>
              <span className="text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full ml-auto">
                Peso: {sessionWeightPct}%
              </span>
            </div>

            <div className="mt-2.5 flex items-center gap-1">
              <span className="text-[10px] font-bold text-slate-500">Histórico Prev:</span>
              <div className="flex items-center gap-1 overflow-x-auto py-0.5">
                {[0, 1, 2, 3, 4, 6, 8, 12].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPastEvalsCount(n)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-extrabold transition cursor-pointer ${
                      pastEvalsCount === n
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={n === 0 ? 'Primera evaluación (sin histórico previo)' : `Considerar ${n} evaluaciones semanales previas`}
                  >
                    {n === 0 ? '0 S (1ª Eval)' : `${n} S`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600 font-medium">
            <span>Histórico ({pastEvalsCount}S): <strong className="text-slate-900">{pastEvalsCount === 0 ? 'Sin Histórico (0%)' : `${historyWeightPct}%`}</strong></span>
            <span>Semana Actual: <strong className="text-indigo-700">{sessionWeightPct}%</strong></span>
          </div>
        </div>

      </div>

      {/* SECTION: Impacto Comparativo por Eje (Proporcional a Evaluaciones Semanales) */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-indigo-600 text-2xl">published_with_changes</span>
            <div>
              <h3 className="font-display font-extrabold text-base text-slate-900">
                Impacto Proporcional por Eje (Histórico Semanal)
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                {pastEvalsCount === 0
                  ? 'Muestra el resultado de la primera evaluación formal (100% de peso acumulado).'
                  : `Muestra la puntuación previa (${pastEvalsCount} semanas), la evaluación actual (${sessionWeightPct}%) y el nuevo promedio acumulado.`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold text-slate-600 self-end sm:self-auto">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
              {pastEvalsCount === 0 ? 'Anterior (Sin Previas)' : `Anterior (${pastEvalsCount}S)`}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              Sesión Semanal
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
              Nuevo Acumulado
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-2">
          {CRITERIA.map((crit) => {
            const key = crit.key as keyof DimensionScores;
            const oldVal = initialScores[key] ?? 0;
            const sessionVal = scores[key] ?? 0;
            const cumulativeVal = cumulativeScores[key] ?? 0;
            const delta = cumulativeVal - oldVal;
            const sessionDelta = sessionVal - oldVal;
            const isEval = isKeyEvaluated(crit.key);

            return (
              <div 
                key={crit.key} 
                className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between gap-3 ${
                  isEval 
                    ? 'bg-indigo-50/50 border-indigo-200 shadow-sm' 
                    : 'bg-slate-50/80 border-slate-200/80 opacity-90'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`w-7 h-7 rounded-lg ${crit.bg} text-white flex items-center justify-center shrink-0 shadow-sm`}>
                      <span className="material-symbols-outlined text-sm">{crit.icon}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      isEval ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {isEval ? 'Auditado' : 'Sin Cambio'}
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-xs truncate" title={crit.title}>
                    {crit.title}
                  </h4>
                </div>

                <div className="space-y-1.5 border-t border-slate-200/60 pt-2.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-slate-500 font-bold">
                      {pastEvalsCount === 0 ? 'Sin Histórico:' : `Previo (${pastEvalsCount}S):`}
                    </span>
                    <span className="font-mono font-extrabold text-slate-600">
                      {pastEvalsCount === 0 ? 'N/A' : `${oldVal}%`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-mono text-amber-700 font-bold">Sesión Semanal:</span>
                    <span className="font-mono font-extrabold text-amber-800">{sessionVal}%</span>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/40">
                    <span className="font-mono text-indigo-900 font-black">Nuevo Acumulado:</span>
                    <span className="font-display font-black text-indigo-950 text-base">{cumulativeVal}%</span>
                  </div>
                </div>

                {/* Progress bar visualizing comparison */}
                <div className="space-y-1.5">
                  <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden relative">
                    {pastEvalsCount > 0 && (
                      <div 
                        className="h-full bg-slate-400 opacity-40 absolute top-0 left-0" 
                        style={{ width: `${oldVal}%` }} 
                      />
                    )}
                    <div 
                      className={`h-full ${crit.bg} absolute top-0 left-0 transition-all duration-500`} 
                      style={{ width: `${cumulativeVal}%` }} 
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-mono text-slate-500">
                      {pastEvalsCount === 0 ? 'Calificación:' : 'Var Acumulada:'}
                    </span>
                    <span className={`font-mono font-black ${
                      pastEvalsCount === 0
                        ? 'text-indigo-700'
                        : delta > 0 
                        ? 'text-emerald-700' 
                        : delta < 0 
                        ? 'text-rose-700' 
                        : 'text-slate-600'
                    }`}>
                      {pastEvalsCount === 0 ? `${cumulativeVal}%` : delta > 0 ? `+${delta}%` : delta < 0 ? `${delta}%` : '0%'}
                    </span>
                  </div>

                  <div className="bg-white/80 border border-slate-200 rounded p-1 text-[9px] font-mono text-slate-500 text-center leading-tight">
                    {pastEvalsCount === 0 
                      ? `1ª Eval: ${sessionVal}% (100% peso)` 
                      : `(${oldVal}% × ${pastEvalsCount} + ${sessionVal}%) / ${newEvaluationsTotal}`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Split Layout: Detailed Scores & Feedbacks vs Radar Chart + Log Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (7 cols): Scores & Feedbacks Breakdown */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Resumen de Puntuaciones */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 text-xl">fact_check</span>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Desglose de Sub-Criterios Auditados
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                {flowType === 'flow' ? '5 Criterios Evaluados' : '1 Criterio Específico Evaluado'}
              </span>
            </div>

            {/* List of Evaluated Criteria */}
            <div className="space-y-4">
              {evaluatedCriteria.map((crit) => {
                const score = scores[crit.key as keyof DimensionScores] || 0;
                const badge = getScoreBadge(score);
                const subCritMap = subScores[crit.key] || {};

                return (
                  <div key={crit.key} className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 ${crit.bg} text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm`}>
                          <span className="material-symbols-outlined text-lg">{crit.icon}</span>
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                            {crit.title}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${badge.bg}`}>
                              {badge.text}
                            </span>
                          </h4>
                          <p className="text-xs text-slate-600 font-medium">{crit.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-2xl font-black text-slate-900">{score}%</span>
                      </div>
                    </div>

                    {/* Sub-criteria Chips/Scores */}
                    {crit.subCriteria && crit.subCriteria.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1 pt-2 border-t border-slate-200/60">
                        {crit.subCriteria.map((sub) => {
                          const subVal = subCritMap[sub.id] ?? score;
                          return (
                            <div key={sub.id} className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                              <span className="text-slate-800 font-bold truncate pr-2" title={sub.label}>
                                {sub.label}
                              </span>
                              <span className={`font-mono font-black px-2 py-0.5 rounded text-[11px] shrink-0 ${
                                subVal >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : subVal >= 60 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-rose-100 text-rose-800 border border-rose-200'
                              }`}>
                                {subVal}%
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Feedbacks por Criterio Evaluado */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col gap-5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <span className="material-symbols-outlined text-amber-600 text-xl">rate_review</span>
              <div>
                <h3 className="font-display font-extrabold text-base text-slate-900">
                  Feedbacks y Observaciones por Criterio
                </h3>
                <p className="text-xs text-slate-600 font-medium mt-0.5">
                  Ingrese o refine las retroalimentaciones específicas que recibirá {agent.name}.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {evaluatedCriteria.map((crit) => {
                const currentFeedback = criterionFeedbacks[crit.key] || '';
                const critScore = scores[crit.key as keyof DimensionScores] || 0;

                return (
                  <div key={crit.key} className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-xs text-slate-900 flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${crit.bg}`}></span>
                        Feedback para {crit.title}
                      </label>
                      <span className="text-[11px] font-mono font-bold text-slate-600">Puntuación: {critScore}%</span>
                    </div>
                    <textarea
                      rows={2}
                      value={currentFeedback}
                      onChange={(e) => handleFeedbackChange(crit.key, e.target.value)}
                      placeholder={`Escriba la retroalimentación técnica u observaciones para ${crit.title}...`}
                      className="w-full bg-white border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition resize-none font-medium"
                    />
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Right Column (5 cols): Radar Chart & Trazabilidad Form */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Radar Chart Card (Dark Mode with High Visibility Grid & Dual Overlay) */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col items-center justify-center relative">
            <div className="w-full flex justify-between items-center mb-3 border-b border-slate-800 pb-2.5">
              <div>
                <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-white">
                  Balance Radar (5 Ejes)
                </h3>
                <p className="text-[11px] text-slate-400">Comparativa visual del Historial vs. Resultado</p>
              </div>
              <span className="font-mono text-[9px] text-indigo-300 font-bold bg-indigo-950 border border-indigo-700/80 px-2 py-1 rounded-md">
                Ajuste de Ejes
              </span>
            </div>

            {/* SVG Radar Container with labels */}
            <div className="relative w-64 h-64 my-4 flex items-center justify-center">
              <svg width="256" height="256" viewBox="0 0 200 200" className="absolute inset-0">
                {/* Background Grid Circles / Concentric Pentagons */}
                <polygon points={getPolygonPoints({ knowledge: 100, execution: 100, relational: 100, collaborative: 100, control: 100 })} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                <polygon points={getPolygonPoints({ knowledge: 75, execution: 75, relational: 75, collaborative: 75, control: 75 })} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                <polygon points={getPolygonPoints({ knowledge: 50, execution: 50, relational: 50, collaborative: 50, control: 50 })} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
                <polygon points={getPolygonPoints({ knowledge: 25, execution: 25, relational: 25, collaborative: 25, control: 25 })} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                
                {/* Axis Spider Lines */}
                {[0, 1, 2, 3, 4].map(i => {
                  const end = computePoint(i, 100);
                  return <line key={i} x1="100" y1="100" x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.2)" strokeDasharray="3,3" />;
                })}
                
                {/* 1. POLYGON: Initial Baseline Scores (Anterior) */}
                <polygon 
                  points={getPolygonPoints(initialScores)} 
                  fill="rgba(148, 163, 184, 0.15)" 
                  stroke="#94a3b8" 
                  strokeWidth="2" 
                  strokeDasharray="4,4" 
                />

                {/* 2. POLYGON: Evaluated New Scores (Resultado) */}
                <polygon 
                  points={getPolygonPoints(scores)} 
                  fill="rgba(99, 102, 241, 0.35)" 
                  stroke="#818cf8" 
                  strokeWidth="3" 
                  className="transition-all duration-300" 
                />

                {/* Dots for Baseline (Initial) */}
                {[0, 1, 2, 3, 4].map((i) => {
                  const keys: (keyof DimensionScores)[] = ['knowledge', 'execution', 'relational', 'collaborative', 'control'];
                  const pt = computePoint(i, initialScores[keys[i]]);
                  return (
                    <circle key={`init-${i}`} cx={pt.x} cy={pt.y} r="3.5" fill="#64748b" stroke="#cbd5e1" strokeWidth="1" />
                  );
                })}

                {/* Dots for Evaluated (New) */}
                <circle cx={computePoint(0, scores.knowledge).x} cy={computePoint(0, scores.knowledge).y} r="5" fill="#06B6D4" stroke="#fff" strokeWidth="2" />
                <circle cx={computePoint(1, scores.execution).x} cy={computePoint(1, scores.execution).y} r="5" fill="#6366F1" stroke="#fff" strokeWidth="2" />
                <circle cx={computePoint(2, scores.relational).x} cy={computePoint(2, scores.relational).y} r="5" fill="#10B981" stroke="#fff" strokeWidth="2" />
                <circle cx={computePoint(3, scores.collaborative).x} cy={computePoint(3, scores.collaborative).y} r="5" fill="#F97316" stroke="#fff" strokeWidth="2" />
                <circle cx={computePoint(4, scores.control).x} cy={computePoint(4, scores.control).y} r="5" fill="#8b5cf6" stroke="#fff" strokeWidth="2" />
              </svg>

              {/* Badges for 5 Axes with Score Numbers & Change Indicators */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded-lg z-10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#06B6D4]"></span>
                <span className="font-mono text-[9px] font-black text-[#38bdf8]">CERT: {scores.knowledge}%</span>
              </div>

              <div className="absolute top-1/4 -right-10 flex items-center gap-1 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded-lg z-10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#6366F1]"></span>
                <span className="font-mono text-[9px] font-black text-[#818cf8]">TROUB: {scores.execution}%</span>
              </div>

              <div className="absolute -bottom-2 right-0 flex items-center gap-1 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded-lg z-10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
                <span className="font-mono text-[9px] font-black text-[#34d399]">SERV: {scores.relational}%</span>
              </div>

              <div className="absolute -bottom-2 left-0 flex items-center gap-1 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded-lg z-10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#F97316]"></span>
                <span className="font-mono text-[9px] font-black text-[#fb923c]">SOFT: {scores.collaborative}%</span>
              </div>

              <div className="absolute top-1/4 -left-10 flex items-center gap-1 bg-slate-950 border border-slate-700 px-2 py-0.5 rounded-lg z-10 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#8b5cf6]"></span>
                <span className="font-mono text-[9px] font-black text-[#a78bfa]">MGMT: {scores.control}%</span>
              </div>
            </div>

            {/* Radar Legend Box */}
            <div className="w-full flex items-center justify-center gap-4 flex-wrap mt-2 pt-3 border-t border-slate-800 text-[10px] font-bold">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-0 border-t-2 border-dashed border-slate-400"></span>
                Historial ({initialAverage}%)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-3 h-1 bg-amber-500 rounded"></span>
                Sesión ({evaluationAverage}%)
              </span>
              <span className="flex items-center gap-1.5 text-indigo-300">
                <span className="w-3 h-1 bg-indigo-500 rounded"></span>
                Acumulado ({cumulativeAverage}%)
              </span>
            </div>
          </div>

          {/* MIMO Method Feedback Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-5 shadow-sm">
            <div className="border-b border-slate-100 pb-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <span className="material-symbols-outlined text-2xl">psychology</span>
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-900 uppercase tracking-wide flex items-center gap-2">
                    Feedback de Evaluación — Método MIMO
                  </h3>
                  <p className="text-xs font-medium text-slate-500">
                    {isMimoOptional 
                      ? 'Matriz de retroalimentación cualitativa (Opcional — Puedes publicar sin completar)'
                      : 'Matriz de retroalimentación cualitativa obligatoria antes de publicar'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMimoOptional?.(!isMimoOptional)}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                    isMimoOptional 
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs' 
                      : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                  }`}
                  title="Activar/desactivar requerimiento de llenar Feedback MIMO antes de publicar"
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] font-black text-white ${
                    isMimoOptional ? 'bg-emerald-600' : 'bg-slate-400'
                  }`}>
                    {isMimoOptional ? '✓' : ''}
                  </span>
                  <span>{isMimoOptional ? 'MIMO Opcional (Activado)' : 'Hacer MIMO Opcional'}</span>
                </button>

                <span className={`text-[10px] font-mono font-black uppercase tracking-wider px-3 py-1 rounded-full border ${
                  isMimoOptional 
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-200' 
                    : 'bg-indigo-100 text-indigo-900 border-indigo-200'
                }`}>
                  {isMimoOptional ? 'Opcional' : 'Estándar MIMO'}
                </span>
              </div>
            </div>
            
            {errorMessage && (
              <div className="bg-rose-50 text-rose-700 p-3.5 rounded-2xl text-xs font-bold border border-rose-200 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg text-rose-600">error</span>
                  <span>{errorMessage}</span>
                </div>
                {!isMimoOptional && (
                  <button
                    type="button"
                    onClick={() => setIsMimoOptional?.(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-all shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <span className="material-symbols-outlined text-sm">toggle_on</span>
                    Activar Modo Opcional y Omitir
                  </button>
                )}
              </div>
            )}

            {/* MIMO Grid (4 Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* 1. MANTENER */}
              <div className="flex flex-col gap-2 bg-emerald-50/50 border border-emerald-200/90 rounded-2xl p-4 transition-all focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-2xs">
                      M
                    </span>
                    <label className="font-mono text-xs font-black text-emerald-950 uppercase tracking-wider">
                      1. MANTENER
                    </label>
                  </div>
                  <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-200">
                    Fortalezas
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Comportamientos, aciertos y buenas prácticas que el agente debe conservar y afianzar.
                </p>
                <textarea 
                  rows={3} 
                  placeholder="Ej: Mantiene excelente nivel de empatía y rigor técnico en la atención de casos críticos..." 
                  value={mimoMantener} 
                  onChange={(e) => setMimoMantener(e.target.value)} 
                  className="w-full bg-white border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 resize-none font-medium leading-relaxed shadow-2xs" 
                />
              </div>

              {/* 2. INICIAR */}
              <div className="flex flex-col gap-2 bg-sky-50/50 border border-sky-200/90 rounded-2xl p-4 transition-all focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-sky-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-2xs">
                      I
                    </span>
                    <label className="font-mono text-xs font-black text-sky-950 uppercase tracking-wider">
                      2. INICIAR
                    </label>
                  </div>
                  <span className="text-[10px] font-extrabold text-sky-800 bg-sky-100/90 px-2 py-0.5 rounded-full border border-sky-200">
                    Nuevas Acciones
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Nuevos hábitos, herramientas, atajos o dinámicas que debe adoptar en su rutina diaria.
                </p>
                <textarea 
                  rows={3} 
                  placeholder="Ej: Iniciar el uso de plantillas de notas de handover antes de escalar a Tier 2..." 
                  value={mimoIniciar} 
                  onChange={(e) => setMimoIniciar(e.target.value)} 
                  className="w-full bg-white border border-sky-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 resize-none font-medium leading-relaxed shadow-2xs" 
                />
              </div>

              {/* 3. MEJORAR */}
              <div className="flex flex-col gap-2 bg-amber-50/50 border border-amber-200/90 rounded-2xl p-4 transition-all focus-within:border-amber-500 focus-within:ring-1 focus-within:ring-amber-500 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-2xs">
                      M
                    </span>
                    <label className="font-mono text-xs font-black text-amber-950 uppercase tracking-wider">
                      3. MEJORAR
                    </label>
                  </div>
                  <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
                    Oportunidades
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Competencias, metodologías o tiempos de resolución que requieren perfeccionamiento.
                </p>
                <textarea 
                  rows={3} 
                  placeholder="Ej: Profundizar el diagnóstico inicial de causa raíz para optimizar el AHT en un 15%..." 
                  value={mimoMejorar} 
                  onChange={(e) => setMimoMejorar(e.target.value)} 
                  className="w-full bg-white border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 resize-none font-medium leading-relaxed shadow-2xs" 
                />
              </div>

              {/* 4. OMITIR */}
              <div className="flex flex-col gap-2 bg-rose-50/50 border border-rose-200/90 rounded-2xl p-4 transition-all focus-within:border-rose-500 focus-within:ring-1 focus-within:ring-rose-500 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-rose-600 text-white font-mono text-xs font-black flex items-center justify-center shadow-2xs">
                      O
                    </span>
                    <label className="font-mono text-xs font-black text-rose-950 uppercase tracking-wider">
                      4. OMITIR
                    </label>
                  </div>
                  <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100/90 px-2 py-0.5 rounded-full border border-rose-200">
                    A Descontinuar
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  Prácticas no deseadas, omisiones recurrentes, atajos o errores que debe erradicar.
                </p>
                <textarea 
                  rows={3} 
                  placeholder="Ej: Omitir el cierre anticipado de casos sin la confirmación explícita del usuario..." 
                  value={mimoOmitir} 
                  onChange={(e) => setMimoOmitir(e.target.value)} 
                  className="w-full bg-white border border-rose-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 resize-none font-medium leading-relaxed shadow-2xs" 
                />
              </div>

            </div>

            {/* CRITICAL BUSINESS POINTS SECTION (Infracciones Graves) */}
            <div className="mt-2 pt-4 border-t border-slate-200 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 bg-rose-100 text-rose-700 rounded-xl">
                    <span className="material-symbols-outlined text-lg font-bold">report_problem</span>
                  </span>
                  <div>
                    <h4 className="font-display font-extrabold text-xs text-rose-950 uppercase tracking-wider">
                      Puntos Críticos del Negocio (Infracciones Severas)
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Si el agente infringió alguno de estos puntos, la evaluación pasará automáticamente a negativo.
                    </p>
                  </div>
                </div>
                {isCriticalFail && (
                  <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-rose-600 text-white shadow-xs animate-pulse">
                    🚨 Infracción Activa
                  </span>
                )}
              </div>

              {/* Grid of Critical Fault Checkboxes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {CRITICAL_BUSINESS_FAULTS.map((fault) => {
                  const isChecked = selectedCriticalFaultIds.includes(fault.id);
                  return (
                    <div
                      key={fault.id}
                      onClick={() => toggleCriticalFault(fault.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isChecked
                          ? 'bg-rose-50/90 border-rose-500 shadow-sm ring-1 ring-rose-500'
                          : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                      }`}
                    >
                      <div className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                        isChecked ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-300'
                      }`}>
                        {isChecked && <span className="material-symbols-outlined text-sm font-black">check</span>}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded ${
                            isChecked ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-700'
                          }`}>
                            {fault.code}
                          </span>
                          <span className="text-[10px] font-black font-mono text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                            -{fault.penaltyPct}%
                          </span>
                        </div>
                        <h5 className={`font-bold text-xs leading-tight ${isChecked ? 'text-rose-950' : 'text-slate-800'}`}>
                          {fault.title}
                        </h5>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                          {fault.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Textarea for critical faults auditor notes */}
              {isCriticalFail && (
                <div className="mt-1 flex flex-col gap-1.5 animate-fade-in">
                  <label className="text-[11px] font-bold text-rose-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-rose-600">edit_note</span>
                    Observaciones y Detalle de la Infracción Crítica:
                  </label>
                  <textarea
                    rows={2}
                    value={criticalFaultsNotes}
                    onChange={(e) => setCriticalFaultsNotes(e.target.value)}
                    placeholder="Escriba los detalles específicos del incumplimiento crítico constatado..."
                    className="w-full bg-white border border-rose-300 rounded-xl p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-1 focus:ring-rose-600 resize-none font-medium"
                  />
                </div>
              )}

              {/* ALERT BANNER IF CRITICAL FAULT IS ACTIVE */}
              {isCriticalFail && (
                <div className="p-4 bg-rose-950 text-white rounded-2xl border-2 border-rose-600 shadow-md flex flex-col gap-2 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-rose-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-rose-400 text-xl animate-bounce">warning</span>
                      <span className="font-mono text-xs font-black uppercase text-rose-200 tracking-wider">
                        EVALUACIÓN ANULADA POR INFRACCIÓN CRÍTICA
                      </span>
                    </div>
                    <span className="text-[10px] font-extrabold bg-rose-800 text-rose-100 px-2.5 py-0.5 rounded-full uppercase">
                      Penalización Aplicada
                    </span>
                  </div>

                  <p className="text-xs text-rose-100 font-medium leading-relaxed">
                    Al seleccionar <strong>{selectedCriticalFaults.length} penalizador(es) crítico(s)</strong>, la puntuación obtenida en los criterios (<strong>{cumulativeAverage}%</strong>) queda <strong>ANULADA</strong> y se mantiene únicamente como registro histórico de auditoría. El resultado final de la evaluación es el penalizador: <strong>{finalScoreWithPenalties}%</strong>.
                  </p>

                  <div className="flex items-center justify-between pt-1 font-mono">
                    <div className="text-xs">
                      <span className="text-rose-300 font-bold">Resultado Final Definitivo: </span>
                      <strong className="text-rose-400 text-lg font-black">{finalScoreWithPenalties}%</strong>
                    </div>
                    <div className="text-xs">
                      <span className="text-rose-300 font-bold">Deducción de XP: </span>
                      <strong className="text-rose-400 text-lg font-black">{effectiveXpYield} XP</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button 
              type="button"
              onClick={() => onSubmit(
                cumulativeScores, 
                newEvaluationsTotal,
                {
                  criticalFaultsApplied: selectedCriticalFaultIds,
                  criticalFaultsNotes: criticalFaultsNotes.trim(),
                  isCriticalFail,
                  criticalPenaltyPct: totalCriticalPenaltyPct,
                  finalScoreOverride: finalScoreWithPenalties,
                  overrideXpYield: effectiveXpYield
                }
              )} 
              className={`w-full mt-2 rounded-2xl py-4 px-6 font-mono text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all cursor-pointer ${
                isCriticalFail 
                  ? 'bg-rose-700 hover:bg-rose-800 text-white border border-rose-600' 
                  : 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white'
              }`}
            >
              <span className="material-symbols-outlined">{isCriticalFail ? 'gavel' : 'publish'}</span>
              {isCriticalFail 
                ? `Publicar Evaluación Anulada con Penalización (${finalScoreWithPenalties}%)` 
                : isMimoOptional && (!mimoMantener.trim() && !mimoMejorar.trim())
                  ? 'Publicar Evaluación Formal (MIMO Omitido / Opcional)'
                  : 'Publicar Evaluación Formal con Feedback MIMO (Acumulada)'}
            </button>

            {successMessage && (
              <div className="text-emerald-700 text-xs font-bold text-center mt-2 bg-emerald-50 border border-emerald-200 p-3 rounded-2xl shadow-2xs flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">check_circle</span>
                {successMessage}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
