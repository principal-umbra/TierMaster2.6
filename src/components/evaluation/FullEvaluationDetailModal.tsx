import React, { useState, useEffect } from 'react';
import { Agent, AgentEvaluation, Certification } from '../../types';
import { CRITERIA } from './criteria/constants';
import { AgentAvatarLogo } from '../AgentAvatarLogo';

interface FullEvaluationDetailModalProps {
  agent: Agent;
  evaluation: AgentEvaluation;
  certifications?: Certification[];
  onClose: () => void;
}

const TIER_COLORS: Record<string, string> = {
  l1: '#64748b',
  'l1.5': '#3b82f6',
  l2: '#8b5cf6',
  l3: '#d97706',
  s1: '#10b981',
  s2: '#06b6d4',
  a1: '#ec4899',
};

export const FullEvaluationDetailModal: React.FC<FullEvaluationDetailModalProps> = ({
  agent,
  evaluation,
  certifications = [],
  onClose,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(0); // 0..4 criteria, 5 summary

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight') {
        setCurrentPage((prev) => Math.min(5, prev + 1));
      } else if (e.key === 'ArrowLeft') {
        setCurrentPage((prev) => Math.max(0, prev - 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const rawScores = evaluation.scores || {
    knowledge: 80,
    execution: 80,
    relational: 80,
    collaborative: 80,
    control: 80,
  };

  // Normalize legacy 25% uncalibrated defaults so certification penalties don't drag down baseline performance
  const scores = {
    knowledge: (rawScores.knowledge ?? 25) <= 25 ? 80 : rawScores.knowledge,
    execution: (rawScores.execution ?? 25) <= 25 ? 80 : rawScores.execution,
    relational: (rawScores.relational ?? 25) <= 25 ? 80 : rawScores.relational,
    collaborative: (rawScores.collaborative ?? 25) <= 25 ? 80 : rawScores.collaborative,
    control: (rawScores.control ?? 25) <= 25 ? 80 : rawScores.control,
  };

  const avgScore = Math.round(
    ((scores.knowledge || 0) +
      (scores.execution || 0) +
      (scores.relational || 0) +
      (scores.collaborative || 0) +
      (scores.control || 0)) /
      5
  );

  const isCriticalFail = Boolean(evaluation.isCriticalFail || (evaluation.criticalFaultsApplied && evaluation.criticalFaultsApplied.length > 0));
  const finalDisplayScore = isCriticalFail
    ? (evaluation.finalScoreOverride ?? -(evaluation.criticalPenaltyPct || 100))
    : avgScore;

  const getSubScoreValue = (criterionKey: string, subId: string, baseScore: number): number => {
    if (evaluation.subScores?.[criterionKey]?.[subId] !== undefined) {
      return evaluation.subScores[criterionKey][subId];
    }
    // Derive representative sub-score from criterion base score
    return Math.min(100, Math.max(0, baseScore));
  };

  const getStatusBadge = (val: number) => {
    if (val >= 90) return { label: 'Sobresaliente', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
    if (val >= 75) return { label: 'Bien (Cumple Estándar)', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    if (val >= 50) return { label: 'En Desarrollo', bg: 'bg-amber-100 text-amber-800 border-amber-200' };
    return { label: 'Insuficiente', bg: 'bg-rose-100 text-rose-800 border-rose-200' };
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl max-w-7xl 2xl:max-w-[1400px] w-full max-h-[92vh] overflow-hidden border border-slate-200 shadow-2xl flex flex-col relative">
        
        {/* TOP HEADER */}
        <div className="keep-dark-bg bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors z-10"
            title="Cerrar (Esc)"
          >
            <span className="material-symbols-outlined text-xl text-slate-200">close</span>
          </button>

          <div className="flex items-center gap-4 pr-12">
            <AgentAvatarLogo
              name={agent.name}
              initials={agent.initials}
              tierColor={TIER_COLORS[agent.tierId] || '#64748b'}
              size="md"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[11px] font-black uppercase font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {evaluation.title || `Evaluación Formal #${evaluation.evalNumber}`}
                </span>
                <span className="text-xs text-slate-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">calendar_today</span>
                  {evaluation.date}
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-black text-white text-white-keep">
                Consulta Completa: {agent.name}
              </h2>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                Evaluado por: <strong className="text-white font-bold">{evaluation.evaluator || 'Calibrador Senior'}</strong> • Documento ID: <code className="font-mono text-indigo-300">{evaluation.id}</code>
              </p>
            </div>
          </div>

          <div className="keep-dark-bg flex items-center gap-3 self-end sm:self-center bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800">
            <div className="text-right">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block font-mono">Calificación Global</span>
              {isCriticalFail ? (
                <span className="text-xl font-black font-display font-mono text-rose-400">
                  ANULADA ({finalDisplayScore}%)
                </span>
              ) : (
                <span className={`text-2xl font-black font-display font-mono ${
                  avgScore >= 80 ? 'text-emerald-400' : avgScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {avgScore}%
                </span>
              )}
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-right">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-300 block font-mono">Recompensa</span>
              <span className={`text-sm font-black font-mono ${isCriticalFail ? 'text-rose-400' : 'text-indigo-300'}`}>
                {evaluation.xpYield !== undefined ? (evaluation.xpYield > 0 ? `+${evaluation.xpYield}` : `${evaluation.xpYield}`) : '+60'} XP
              </span>
            </div>
          </div>
        </div>

        {/* PAGINATION STEPPER TABS */}
        <div className="bg-slate-100 border-b border-slate-200 p-2 sm:p-3 overflow-x-auto flex items-center gap-1.5 scrollbar-thin">
          {CRITERIA.map((crit, idx) => {
            const isSelected = currentPage === idx;
            const critScore = scores[crit.key as keyof typeof scores] || 0;
            return (
              <button
                key={crit.key}
                onClick={() => setCurrentPage(idx)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-md border border-slate-200'
                    : 'bg-transparent text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs text-white ${crit.bg}`}>
                  <span className="material-symbols-outlined text-sm">{crit.icon}</span>
                </span>
                <span className="hidden sm:inline font-mono text-[10px] uppercase text-slate-400">Pág {idx + 1}</span>
                <span>{crit.short}</span>
                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded-md ${
                  isSelected ? 'bg-slate-100 text-slate-800' : 'bg-slate-200/80 text-slate-600'
                }`}>
                  {critScore}%
                </span>
              </button>
            );
          })}

          {/* Page 6: Summary */}
          <button
            onClick={() => setCurrentPage(5)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              currentPage === 5
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            }`}
          >
            <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs text-white bg-indigo-700">
              <span className="material-symbols-outlined text-sm">verified</span>
            </span>
            <span className="hidden sm:inline font-mono text-[10px] uppercase text-indigo-200">Pág 6</span>
            <span>Resumen Final</span>
          </button>
        </div>

        {/* PAGE CONTENT CONTAINER */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 bg-slate-50 space-y-6">
          
          {/* PAGES 0 - 4: CRITERION DETAILS */}
          {currentPage >= 0 && currentPage < 5 && (() => {
            const crit = CRITERIA[currentPage];
            const critScore = scores[crit.key as keyof typeof scores] || 0;
            const badge = getStatusBadge(critScore);
            const feedbackText = evaluation.criterionFeedbacks?.[crit.key];

            return (
              <div className="space-y-6 animate-fade-in">
                {/* Criterion Header Banner */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="flex items-start gap-4">
                    <div className={`p-4 rounded-2xl text-white ${crit.bg} shadow-md flex items-center justify-center`}>
                      <span className="material-symbols-outlined text-3xl">{crit.icon}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black font-mono uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          PÁGINA {currentPage + 1} DE 6 • CRITERIO {currentPage + 1}
                        </span>
                        <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${badge.bg}`}>
                          {badge.label}
                        </span>
                      </div>
                      <h3 className="font-display text-2xl font-black text-slate-900">
                        {crit.title} ({crit.short})
                      </h3>
                      <p className="text-sm text-slate-500 font-medium mt-1">
                        {crit.desc}
                      </p>
                    </div>
                  </div>

                  <div className="keep-dark-bg bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 flex items-center gap-4 self-start md:self-center min-w-[180px] justify-between">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block font-mono">
                        Puntaje Criterio
                      </span>
                      <span className={`text-3xl font-black font-mono ${crit.color}`}>
                        {critScore}%
                      </span>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-slate-700 flex items-center justify-center font-mono font-bold text-xs" style={{ borderColor: crit.stroke }}>
                      {critScore}
                    </div>
                  </div>
                </div>

                {/* Sub-Criteria Fields Breakdown */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <h4 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600">fact_check</span>
                      Desglose de Campos y Sub-Criterios Evaluados
                    </h4>
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase">
                      {crit.subCriteria.length} Campos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {crit.subCriteria.map((sub) => {
                      const val = getSubScoreValue(crit.key, sub.id, critScore);
                      const subBadge = getStatusBadge(val);

                      return (
                        <div key={sub.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between gap-3 hover:border-slate-300 transition-all">
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="font-bold text-slate-800 text-sm">{sub.label}</span>
                              <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md border ${subBadge.bg}`}>
                                {val}%
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed">
                              {sub.desc}
                            </p>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400 font-bold">
                              <span>Alineación Técnica</span>
                              <span>{val}/100 pts</span>
                            </div>
                            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${val}%`,
                                  backgroundColor: val >= 85 ? '#10b981' : val >= 70 ? '#6366f1' : val >= 50 ? '#f59e0b' : '#ef4444'
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Criterion Specific Details / Context */}
                {crit.key === 'knowledge' && (
                  <div className="bg-sky-50/60 border border-sky-200 p-6 rounded-3xl space-y-3">
                    <h4 className="font-bold text-sky-900 text-sm flex items-center gap-2 font-mono uppercase">
                      <span className="material-symbols-outlined text-sky-600">school</span>
                      Evidencia de Conocimiento y Certificaciones Requeridas
                    </h4>
                    <p className="text-xs text-sky-800 leading-relaxed font-medium">
                      El agente fue evaluado contra la ruta de certificaciones del Tier <strong className="uppercase">{agent.tierId}</strong>.
                      Tiene <strong className="text-sky-950 font-bold">{agent.certifications?.length || 0} certificaciones inscritas</strong> y {(agent.certificationsHistory || []).length} acreditadas oficialmente.
                    </p>
                  </div>
                )}

                {crit.key === 'execution' && evaluation.auditedCases && evaluation.auditedCases.length > 0 && (
                  <div className="bg-indigo-50/60 border border-indigo-200 p-6 rounded-3xl space-y-3">
                    <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2 font-mono uppercase">
                      <span className="material-symbols-outlined text-indigo-600">find_in_page</span>
                      Muestreo de Casos Evaluados en Troubleshooting ({evaluation.auditedCases.length} Muestras)
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {evaluation.auditedCases.map((c, i) => (
                        <div key={i} className="bg-white p-3 rounded-2xl border border-indigo-100 flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg">
                            {c.id}
                          </span>
                          <span className="text-slate-700 font-medium truncate mx-2 max-w-[200px]">
                            {c.title}
                          </span>
                          <span className="text-[10px] font-mono uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded">
                            {c.source}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Qualitative Observations for this Criterion */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-amber-500">rate_review</span>
                    Observaciones Específicas del Criterio
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-slate-700 text-xs sm:text-sm leading-relaxed font-sans">
                    {feedbackText && feedbackText.trim() ? (
                      <p className="whitespace-pre-wrap">{feedbackText}</p>
                    ) : (
                      <p className="italic text-slate-400">
                        Sin notas específicas registradas en este criterio para esta sesión de evaluación. El desempeño general refleja una alineación del {critScore}% con los estándares establecidos.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* PAGE 5: FINAL SUMMARY & MIMO MATRIX */}
          {currentPage === 5 && (
            <div className="space-y-6 animate-fade-in">
              {/* Page 6 Banner */}
              <div className="keep-dark-bg bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl space-y-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-black font-mono uppercase px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                      PÁGINA 6 DE 6 • RESUMEN EJECUTIVO Y MODELO MIMO
                    </span>
                    <h3 className="font-display text-2xl sm:text-3xl font-black text-white text-white-keep mt-2">
                      Dictamen Final y Retroalimentación
                    </h3>
                    <p className="text-xs text-slate-200 mt-1 max-w-xl font-medium">
                      Consolidado formal de la evaluación con distribución en los 5 ejes, matriz MIMO y acuerdo de calibración.
                    </p>
                  </div>

                  <div className="keep-dark-bg bg-slate-950/90 p-5 rounded-2xl border border-indigo-500/30 flex items-center gap-5 text-center">
                    <div>
                      <span className="text-[9px] font-mono uppercase font-bold text-slate-300 block">Promedio Final</span>
                      <span className={`text-4xl font-black font-display font-mono ${
                        avgScore >= 80 ? 'text-emerald-400' : avgScore >= 60 ? 'text-amber-400' : 'text-rose-400'
                      }`}>
                        {avgScore}%
                      </span>
                    </div>
                    <div className="h-10 w-px bg-slate-800" />
                    <div>
                      <span className="text-[9px] font-mono uppercase font-bold text-slate-300 block">Recompensa</span>
                      <span className="text-lg font-black font-mono text-indigo-300">+{evaluation.xpYield || 60} XP</span>
                    </div>
                  </div>
                </div>

                {/* 5 Criteria Overview Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-800/80 text-xs">
                  {CRITERIA.map((c) => {
                    const sc = scores[c.key as keyof typeof scores] || 0;
                    return (
                      <div key={c.key} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center gap-1.5 transition-transform hover:scale-105">
                        <span className="text-[10px] font-black text-slate-600 uppercase font-mono">{c.short}</span>
                        <span className={`font-mono font-black text-lg ${c.color}`}>{sc}%</span>
                        <span className="text-[10px] font-bold text-slate-800 truncate w-full">{c.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MIMO FEEDBACK MATRIX (4 PILLARS) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h4 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">tune</span>
                    Matriz de Retroalimentación MIMO (4 Cuadrantes)
                  </h4>
                  <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                    Plan Continuo de Calibración
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 1. MANTENER */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-black">M</span>
                        1. Mantener (Fortalezas)
                      </span>
                      <span className="text-[9px] font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
                        Continuidad
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans pt-1">
                      {evaluation.mimo?.mantener || 'Mantener la consistencia operativa y calidad de atención registrada.'}
                    </p>
                  </div>

                  {/* 2. INICIAR */}
                  <div className="bg-sky-50/70 border border-sky-200 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-sky-900 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <span className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs font-black">I</span>
                        2. Iniciar (Nuevos Hábitos)
                      </span>
                      <span className="text-[9px] font-extrabold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full uppercase">
                        Innovación
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans pt-1">
                      {evaluation.mimo?.iniciar || 'Iniciar documentación activa en la base de conocimientos.'}
                    </p>
                  </div>

                  {/* 3. MEJORAR */}
                  <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center text-xs font-black">M</span>
                        3. Mejorar (Crecimiento)
                      </span>
                      <span className="text-[9px] font-extrabold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase">
                        Oportunidad
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans pt-1">
                      {evaluation.mimo?.mejorar || 'Reforzar precisión en diagnósticos de solicitudes.'}
                    </p>
                  </div>

                  {/* 4. OMITIR */}
                  <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-2 font-mono">
                        <span className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center text-xs font-black">O</span>
                        4. Omitir (Descontinuar)
                      </span>
                      <span className="text-[9px] font-extrabold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full uppercase">
                        A Eliminar
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans pt-1">
                      {evaluation.mimo?.omitir || 'Omitir cierres sin confirmación explícita del usuario.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* CRITICAL FAULTS BANNER IF PRESENT */}
              {(evaluation.isCriticalFail || (evaluation.criticalFaultsApplied && evaluation.criticalFaultsApplied.length > 0)) && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xl">gavel</span>
                    </span>
                    <div>
                      <h4 className="font-display text-base font-black text-rose-900 flex items-center gap-2">
                        Puntos Críticos del Negocio Infranquiciados
                        <span className="bg-rose-200 text-rose-900 text-[10px] font-mono font-black px-2 py-0.5 rounded-full uppercase">
                          Penalización Aplicada: -{evaluation.criticalPenaltyPct || 0}%
                        </span>
                      </h4>
                      <p className="text-xs text-rose-700 font-medium">
                        Se registraron infracciones a políticas o procesos críticos durante esta auditoría.
                      </p>
                    </div>
                  </div>

                  {evaluation.criticalFaultsApplied && evaluation.criticalFaultsApplied.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-bold text-rose-900 font-mono uppercase tracking-wider">Infracciones Registradas:</p>
                      <ul className="list-disc list-inside text-xs text-rose-800 space-y-1 font-medium bg-rose-100/50 p-3 rounded-2xl border border-rose-200">
                        {evaluation.criticalFaultsApplied.map((fault, idx) => (
                          <li key={idx}>{fault}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {evaluation.criticalFaultsNotes && (
                    <div className="text-xs text-slate-700 bg-white/80 p-3 rounded-2xl border border-rose-200">
                      <strong className="text-rose-900 block font-mono uppercase text-[10px] mb-1">Notas del Auditor:</strong>
                      <p className="italic leading-relaxed">{evaluation.criticalFaultsNotes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* AUDITED CASES TABLE SUMMARY */}
              {evaluation.auditedCases && evaluation.auditedCases.length > 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                  <h4 className="font-display text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">receipt_long</span>
                    Casos y Requerimientos Auditados en esta Evaluación ({evaluation.auditedCases.length})
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden text-xs">
                    {evaluation.auditedCases.map((c, i) => (
                      <div key={i} className="p-3 bg-slate-50 flex items-center justify-between hover:bg-slate-100/80 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-md">
                            {c.id}
                          </span>
                          <span className="font-medium text-slate-800">{c.title}</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold uppercase text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                          {c.source}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EVALUATION AUDIT METADATA */}
              <div className="bg-slate-100 p-5 rounded-3xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-emerald-600 text-xl">verified_user</span>
                  <div>
                    <p className="font-bold text-slate-800">Evaluación Firmada y Publicada Oficialmente</p>
                    <p className="text-[11px] text-slate-500">
                      Fecha: {evaluation.date} • Responsable: {evaluation.evaluator || 'Calibración Senior'}
                    </p>
                  </div>
                </div>

                <span className="font-mono text-[10px] bg-white border border-slate-300 px-3 py-1.5 rounded-xl font-bold text-slate-700">
                  ID: {evaluation.id}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION FOOTER */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between gap-3">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className={`px-4 sm:px-5 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
              currentPage === 0
                ? 'opacity-40 bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span>Anterior</span>
          </button>

          <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-500">
            <span>Página</span>
            <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-mono text-xs">
              {currentPage + 1}
            </span>
            <span>de 6</span>
          </div>

          {currentPage < 5 ? (
            <button
              onClick={() => setCurrentPage((prev) => Math.min(5, prev + 1))}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all flex items-center gap-2"
            >
              <span>{currentPage === 4 ? 'Ver Resumen Final' : 'Siguiente Criterio'}</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-2"
            >
              <span>Finalizar Consulta</span>
              <span className="material-symbols-outlined text-sm">check_circle</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
