import React, { useState, useEffect, useMemo } from 'react';
import { Agent, Certification } from '../../../types';

interface ExecutionCriterionProps {
  agent: Agent;
  globalScore: number;
  subScores: Record<string, number>;
  onSubScoreChange: (subId: string, val: number) => void;
  certifications?: Certification[];
  sheetCases?: any[];
  allSheetCases?: any[];
  useRandomSelection?: boolean;
  setUseRandomSelection?: (val: boolean) => void;
  manuallySelectedIds?: string[];
  setManuallySelectedIds?: (ids: string[]) => void;
  onReRollRandom?: () => void;
  casesLoading?: boolean;
  casesError?: string;
  feedbackText?: string;
  onFeedbackChange?: (val: string) => void;
}

interface SupportBasicCase {
  id: string;
  ticketId: string;
  title: string;
  category: string;
  status: string;
  account: string;
  contact: string;
}

// Basic, non-assumptive real-world support operational cases
const BASE_SUPPORT_CASES: SupportBasicCase[] = [
  {
    id: 'req_cctv_offline',
    ticketId: 'REQ-2401',
    title: 'Falla de Conectividad y Señal en Dispositivo CCTV Sucursal Sur',
    category: 'Conectividad / Redes',
    status: 'Cerrado - Resuelto',
    account: 'Fintech Express Corp',
    contact: 'Carlos Mendoza'
  },
  {
    id: 'req_access_blocked',
    ticketId: 'REQ-2582',
    title: 'Bloqueo Preventivo de Acceso Operativo por Reintentos de Clave',
    category: 'Soporte Técnico / Accesos',
    status: 'Cerrado - Resuelto',
    account: 'Global Logistics SAC',
    contact: 'Ana María Gómez'
  },
  {
    id: 'req_sla_escalation',
    ticketId: 'REQ-2911',
    title: 'Demora en Despacho de Repuestos de Enlace de Red',
    category: 'Gestión de Casos / Seguimiento',
    status: 'Cerrado - Escalado',
    account: 'Inversiones San José',
    contact: 'Roberto Dávila'
  }
];

// Definition of performance levels for direct interactive rating (Competente = 85% - Bien)
const LEVELS_CONFIG = [
  { 
    level: 1, 
    title: 'Insuficiente', 
    score: 40, 
    badgeColor: 'bg-rose-100 border-rose-300 text-rose-950', 
    activeClass: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 ring-4 ring-rose-500/15' 
  },
  { 
    level: 2, 
    title: 'En Desarrollo', 
    score: 65, 
    badgeColor: 'bg-amber-100 border-amber-300 text-amber-950', 
    activeClass: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-500 ring-4 ring-amber-500/15' 
  },
  { 
    level: 3, 
    title: 'Competente', 
    score: 85, 
    badgeColor: 'bg-indigo-100 border-indigo-300 text-indigo-950', 
    activeClass: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 ring-4 ring-indigo-500/15' 
  },
  { 
    level: 4, 
    title: 'Sobresaliente', 
    score: 100, 
    badgeColor: 'bg-emerald-100 border-emerald-300 text-emerald-950', 
    activeClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 ring-4 ring-emerald-500/15' 
  }
];

// Helper to match active score to the nearest level badge
const getActiveLevel = (score: number) => {
  if (score <= 50) return 1;
  if (score <= 74) return 2;
  if (score <= 92) return 3;
  return 4;
};

// Help helper for visual metadata
const getLevelBadgeInfo = (score: number) => {
  if (score <= 50) return { level: 1, title: 'Insuficiente', color: 'bg-rose-100 border-rose-300 text-rose-950 font-bold' };
  if (score <= 74) return { level: 2, title: 'En Desarrollo', color: 'bg-amber-100 border-amber-300 text-amber-950 font-bold' };
  if (score <= 92) return { level: 3, title: 'Competente', color: 'bg-indigo-100 border-indigo-300 text-indigo-950 font-bold' };
  return { level: 4, title: 'Sobresaliente', color: 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold' };
};

export function ExecutionCriterion({ 
  agent, 
  globalScore, 
  subScores, 
  onSubScoreChange,
  sheetCases = [],
  allSheetCases = [],
  useRandomSelection = true,
  setUseRandomSelection,
  manuallySelectedIds = [],
  setManuallySelectedIds,
  onReRollRandom,
  casesLoading = false,
  casesError = '',
  feedbackText = '',
  onFeedbackChange
}: ExecutionCriterionProps) {
  
  // State for storing per-case evaluation scores
  const [caseEvaluations, setCaseEvaluations] = useState<Record<string, Record<string, number>>>(() => {
    try {
      const saved = localStorage.getItem(`eval_exec_cases_${agent.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync caseEvaluations with localStorage when changed or agent changes
  useEffect(() => {
    try {
      if (agent.id) {
        localStorage.setItem(`eval_exec_cases_${agent.id}`, JSON.stringify(caseEvaluations));
      }
    } catch (e) {}
  }, [caseEvaluations, agent.id]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`eval_exec_cases_${agent.id}`);
      if (saved) {
        setCaseEvaluations(JSON.parse(saved));
      } else {
        setCaseEvaluations({});
      }
    } catch (e) {
      setCaseEvaluations({});
    }
  }, [agent.id]);

  // Parse and map Google Sheets row data into a clean, uniform basic schema
  const finalRequests = useMemo(() => {
    if (sheetCases && sheetCases.length > 0) {
      return sheetCases.map((sc, idx) => {
        const ticketId = sc["ID"] || sc["id"] || `REQ-${1000 + idx}`;
        return {
          id: String(ticketId),
          ticketId: ticketId.toString().startsWith("REQ-") ? ticketId : `REQ-${ticketId}`,
          title: sc["Subject"] || sc["subject"] || sc["Asunto"] || "Sin Asunto",
          category: sc["Request Type"] || sc["request type"] || sc["Tipo"] || "Soporte Operativo",
          status: sc["Status"] || sc["status"] || sc["Estado"] || "Cerrado",
          account: sc["Account"] || sc["account"] || sc["Cuenta"] || "Cliente General",
          contact: sc["Contact"] || sc["contact"] || sc["Contacto"] || "Usuario"
        };
      });
    }
    return BASE_SUPPORT_CASES;
  }, [sheetCases]);

  // Selection of request/ticket to audit
  const [activeRequestId, setActiveRequestId] = useState<string>('');

  // Synchronize activeRequestId to match valid case in finalRequests
  useEffect(() => {
    if (finalRequests && finalRequests.length > 0) {
      if (!finalRequests.some(r => r.id === activeRequestId)) {
        setActiveRequestId(finalRequests[0].id);
      }
    }
  }, [finalRequests, activeRequestId]);
  
  // Active selected request object
  const activeRequest = finalRequests.find(r => r.id === activeRequestId) || finalRequests[0];

  // Calculate average score for each axis across all active requests
  const computedSubScores = useMemo(() => {
    const axes = ['proc', 'tool', 'diag', 'res'];
    const result: Record<string, number> = {};

    axes.forEach(axisId => {
      const validScores: number[] = [];
      finalRequests.forEach(req => {
        const caseEval = caseEvaluations[req.id];
        if (caseEval && typeof caseEval[axisId] === 'number') {
          validScores.push(caseEval[axisId]);
        } else {
          // Default fallback score if not explicitly set for this case (Competente = 80)
          const currentPropScore = subScores[axisId] ?? 80;
          validScores.push(currentPropScore);
        }
      });

      if (validScores.length > 0) {
        const avg = validScores.reduce((sum, v) => sum + v, 0) / validScores.length;
        result[axisId] = Math.round(avg);
      } else {
        result[axisId] = subScores[axisId] ?? 80;
      }
    });

    return result;
  }, [finalRequests, caseEvaluations, subScores]);

  // Notify parent component of computed average sub-scores
  useEffect(() => {
    (Object.entries(computedSubScores) as [string, number][]).forEach(([axisId, score]) => {
      if (subScores[axisId] !== score) {
        onSubScoreChange(axisId, score);
      }
    });
  }, [computedSubScores]);

  // Define the 4 Core Evaluation Axes of Troubleshooting
  const axesDefinitions = [
    {
      id: 'proc',
      label: '1. Uso de Procesos Técnicos',
      desc: 'Revisión del descarte secuencial, respeto de playbooks de red y seguridad.',
      icon: 'account_tree',
      tip: 'Verifica si el agente siguió la jerarquía correcta de validaciones antes de actuar.'
    },
    {
      id: 'tool',
      label: '2. Dominio de Herramientas Internas',
      desc: 'Mide la habilidad con las consolas de diagnóstico y sistemas asignados.',
      icon: 'construction',
      tip: 'Evalúa el registro de consolas puestas en práctica en la bitácora.'
    },
    {
      id: 'diag',
      label: '3. Calidad del Diagnóstico',
      desc: 'Precisión técnica en identificar el origen y delimitar causas.',
      icon: 'biotech',
      tip: 'Premia la consistencia lógica del diagnóstico asentado.'
    },
    {
      id: 'res',
      label: '4. Resolución o Escalación Técnica',
      desc: 'Formato SAC de la nota técnica, claridad y recomendaciones preventivas.',
      icon: 'assignment_turned_in',
      tip: 'Revisa si la nota de resolución es limpia, clara y sigue la estructura SAC.'
    }
  ];

  // Helper getters for case scores and evaluations
  const getCaseAxisScore = (caseId: string, axisId: string): number => {
    if (caseEvaluations[caseId] && typeof caseEvaluations[caseId][axisId] === 'number') {
      return caseEvaluations[caseId][axisId];
    }
    return subScores[axisId] ?? 75;
  };

  const getCaseAverageScore = (caseId: string): number => {
    const axes = ['proc', 'tool', 'diag', 'res'];
    const scores = axes.map(a => getCaseAxisScore(caseId, a));
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / axes.length);
  };

  const getCaseEvaluatedAxesCount = (caseId: string): number => {
    const caseEval = caseEvaluations[caseId];
    if (!caseEval) return 0;
    return Object.keys(caseEval).length;
  };

  // Agile score updater per active case
  const handleSelectLevel = (axisId: string, levelScore: number) => {
    if (!activeRequest) return;
    const cId = activeRequest.id;

    setCaseEvaluations(prev => {
      const currentCaseEvals = prev[cId] || {
        proc: subScores.proc ?? 75,
        tool: subScores.tool ?? 75,
        diag: subScores.diag ?? 75,
        res: subScores.res ?? 75,
      };
      return {
        ...prev,
        [cId]: {
          ...currentCaseEvals,
          [axisId]: levelScore
        }
      };
    });
  };

  // Extracts ONLY the numeric digits of the ticket ID when copying
  const copyToClipboard = (text: string) => {
    const numericPart = text.replace(/[^\d]/g, '');
    navigator.clipboard.writeText(numericPart);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Computes progress for the cases based on evaluated axes
  const getCaseProgress = (caseId: string) => {
    const axesCount = getCaseEvaluatedAxesCount(caseId);
    return `${Math.round((axesCount / 4) * 100)}%`;
  };

  const handleCheckboxManualToggle = (id: string) => {
    if (!setManuallySelectedIds || !manuallySelectedIds) return;
    const isAlreadySelected = manuallySelectedIds.includes(id);
    if (isAlreadySelected) {
      setManuallySelectedIds(manuallySelectedIds.filter(x => x !== id));
    } else {
      if (manuallySelectedIds.length >= 3) {
        alert("Puedes seleccionar un máximo de 3 casos para evaluar simultáneamente.");
        return;
      }
      setManuallySelectedIds([...manuallySelectedIds, id]);
    }
  };

  return (
    <div className="w-full bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-150 p-6 lg:p-8 flex flex-col gap-6">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 shrink-0">
            <span className="material-symbols-outlined text-3xl">psychology</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-bold text-2xl text-slate-800">Evaluación de Troubleshooting (KPI 2)</h3>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-indigo-100">
                Auditoría Ágil
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl leading-normal">
              Evalúa el nivel de descarte técnico del agente según la evidencia en el CRM. Elige de forma directa y dinámica el desempeño alcanzado en los 4 ejes principales para registrar de manera ágil el puntaje.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Agent Profile Context */}
          <div className="bg-slate-50 border border-slate-150 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
              {agent.initials || agent.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Agente Evaluado</span>
              <span className="text-xs font-bold text-slate-700">{agent.name}</span>
            </div>
          </div>

          {/* KPI Score Card */}
          <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-2xl flex items-center gap-4 justify-between shadow-sm min-w-[150px]">
            <div>
              <span className="text-[9px] text-indigo-700 font-bold uppercase tracking-wider block font-sans">SCORE TROUBLESHOOTING</span>
              <span className="text-3xl font-black text-indigo-600 font-mono tracking-tight">
                {globalScore} <span className="text-xs text-indigo-500 font-normal">/100</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600 shadow-xs border border-indigo-100">
              <span className="material-symbols-outlined font-black text-xl">verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Sheets Integration Panel */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600">grid_on</span>
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-sans">Origen de Requerimientos: Google Sheets</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                Casos asignados a {agent.name} importados de la planilla semanal de producción.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {casesLoading ? (
              <span className="text-xs text-indigo-600 font-medium flex items-center gap-1">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full" />
                Cargando planilla...
              </span>
            ) : allSheetCases.length > 0 ? (
              <span className="text-xs bg-emerald-100 text-emerald-950 font-bold px-2.5 py-1 rounded-full border border-emerald-300">
                {allSheetCases.length} casos reales encontrados
              </span>
            ) : (
              <span className="text-xs bg-amber-100 text-amber-950 font-bold px-2.5 py-1 rounded-full border border-amber-300 animate-pulse">
                Usando casos simulados de respaldo operativo
              </span>
            )}
          </div>
        </div>

        {casesError && (
          <div className="bg-rose-50 border border-rose-200 text-rose-900 p-3 rounded-xl text-xs flex gap-2">
            <span className="material-symbols-outlined text-rose-600 shrink-0">error</span>
            <span>{casesError}. Mostrando casos de descarte simulados para mantener el flujo de auditoría.</span>
          </div>
        )}

        {/* Selection mode toggle */}
        {allSheetCases.length > 0 && setUseRandomSelection && (
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-3">
            <div className="flex flex-wrap items-center gap-4 text-xs font-sans">
              <span className="text-slate-650 font-bold uppercase tracking-wider text-[10px]">Modo de Selección:</span>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="radio" 
                  checked={useRandomSelection} 
                  onChange={() => setUseRandomSelection(true)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-800 font-semibold">3 al Azar (Por Defecto)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="radio" 
                  checked={!useRandomSelection} 
                  onChange={() => setUseRandomSelection(false)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-800 font-semibold">Selección Manual Específica</span>
              </label>

              {useRandomSelection && onReRollRandom && (
                <button
                  type="button"
                  onClick={onReRollRandom}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-indigo-600 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all ml-auto"
                >
                  <span className="material-symbols-outlined text-xs">shuffle</span>
                  Volver a Sorteo
                </button>
              )}
            </div>

            {/* Manual case selectors */}
            {!useRandomSelection && (
              <div className="bg-white border border-slate-200 p-3 rounded-xl space-y-2 max-h-[140px] overflow-y-auto">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">
                  Selecciona hasta 3 requerimientos para auditar en esta ronda:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {allSheetCases.map(row => {
                    const id = row["ID"] || row["id"];
                    const isChecked = manuallySelectedIds.includes(String(id));
                    return (
                      <label 
                        key={id}
                        className={`p-2 rounded-lg border text-xs flex items-start gap-2 cursor-pointer transition-all select-none ${
                          isChecked ? 'bg-indigo-50/55 border-indigo-400' : 'hover:bg-slate-50 border-slate-150'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxManualToggle(String(id))}
                          className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 block line-clamp-1">{row["Subject"] || "Sin Asunto"}</span>
                          <span className="text-[10px] text-slate-500">Ticket #{id} • {row["Request Type"] || "Soporte"}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ticket Selector Button Cards */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-500 uppercase tracking-wider block">
            Requerimientos para Auditar ({finalRequests.length} cargados):
          </span>
          <span className="text-[11px] text-indigo-700 font-extrabold bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-150">
            Puntuación Multicaso Independiente
          </span>
        </div>

        {finalRequests.length === 0 ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2.5">
            <span className="material-symbols-outlined text-amber-500 text-4xl select-none">info</span>
            <div className="font-sans font-bold text-slate-800 text-sm">No tiene información en este instante</div>
            <p className="text-xs text-slate-500 max-w-md leading-relaxed">
              Este agente no cuenta con requerimientos completados registrados en el sprint en curso para ser auditados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {finalRequests.map((tc, idx) => {
              const isActive = activeRequestId === tc.id;
              const caseScore = getCaseAverageScore(tc.id);
              const axesCount = getCaseEvaluatedAxesCount(tc.id);
              const progressPct = Math.round((axesCount / 4) * 100);
              const isFullyEvaluated = axesCount >= 4;

              return (
                <button
                  key={tc.id}
                  type="button"
                  onClick={() => setActiveRequestId(tc.id)}
                  className={`flex flex-col text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
                    isActive 
                      ? 'border-indigo-600 bg-indigo-50/20 shadow-md ring-2 ring-indigo-600/5' 
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white px-2 py-0.5 rounded-bl-lg text-[9px] font-black uppercase tracking-wider shadow-xs">
                      En Auditoría (Caso #{idx + 1})
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                      {tc.ticketId}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                        caseScore >= 85 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        caseScore >= 70 ? 'bg-indigo-100 text-indigo-900 border-indigo-300' :
                        caseScore >= 50 ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        'bg-rose-100 text-rose-900 border-rose-300'
                      }`}>
                        {caseScore} pts
                      </span>
                    </div>
                  </div>

                  <h4 className="font-bold text-slate-800 text-xs leading-snug line-clamp-2 min-h-[32px]">{tc.title}</h4>
                  <p className="text-[10px] text-slate-550 mt-1 block font-medium truncate">Cuenta: {tc.account}</p>
                  
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 mt-3 pt-2 border-t border-slate-100">
                    <span>Avance: {progressPct}% ({axesCount}/4 ejes)</span>
                    <span className={isFullyEvaluated ? "text-emerald-600 font-extrabold" : "text-amber-600"}>
                      {isFullyEvaluated ? "Completado" : "En curso"}
                    </span>
                  </div>

                  <div className="w-full bg-slate-150 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${isFullyEvaluated ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* PROMEDIO MULTICASO DYNAMIC BANNER */}
        {finalRequests.length > 0 && (
          <div className="bg-gradient-to-r from-indigo-50/90 via-slate-50 to-indigo-50/90 border border-indigo-200/90 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm mt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>Puntuación del Criterio por Promedio de Casos</span>
                  <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                    {finalRequests.length} {finalRequests.length === 1 ? 'Caso' : 'Casos'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Puntúa cada requerimiento de forma independiente. La nota global de Troubleshooting (<strong>{globalScore} pts</strong>) es el promedio exacto de los {finalRequests.length} casos auditados.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 bg-white p-2.5 rounded-xl border border-indigo-150 shadow-2xs">
              {finalRequests.map((tc, idx) => {
                const score = getCaseAverageScore(tc.id);
                const isSelected = activeRequestId === tc.id;
                return (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => setActiveRequestId(tc.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] opacity-80 font-mono">Caso #{idx + 1}:</span>
                    <span>{score} pts</span>
                  </button>
                );
              })}

              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

              <div className="bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-lg text-xs font-black text-indigo-700 flex items-center gap-1">
                <span className="text-[10px] text-indigo-500 uppercase font-bold">PROMEDIO:</span>
                <span className="text-sm font-mono">{globalScore} pts</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid Area */}
      {activeRequest ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Ticket Basic Metadata and External CRM Lookup Guidance */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
              
              <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-slate-700 text-lg">info</span>
                <span className="text-xs text-slate-800 font-bold uppercase tracking-wider">
                  Ficha del Requerimiento Seleccionado
                </span>
              </div>

              <div className="p-5 flex flex-col gap-4">
                
                {/* Subject Block */}
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-450 block">Asunto / Síntoma Reportado:</span>
                  <p className="text-xs font-bold text-slate-800 mt-1 leading-normal">{activeRequest.title}</p>
                </div>

                {/* Ticket ID Highlights with Quick Copy Feature */}
                <div className="bg-indigo-50 border border-indigo-150 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-700 block">NÚMERO DE TICKET ID</span>
                    <span className="text-lg font-black font-mono text-indigo-950 block mt-0.5">{activeRequest.ticketId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeRequest.ticketId)}
                    className="bg-white hover:bg-slate-50 border border-indigo-200 hover:border-indigo-300 text-indigo-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">
                      {copiedId === activeRequest.ticketId ? 'check_circle' : 'content_copy'}
                    </span>
                    {copiedId === activeRequest.ticketId ? 'Copiado' : 'Copiar ID'}
                  </button>
                </div>

                {/* Account & Contact & Category Metadata */}
                <div className="grid grid-cols-2 gap-3 border-t border-b border-slate-100 py-3 text-xs">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 block">Cuenta / Cliente</span>
                    <span className="font-bold text-slate-800 block mt-0.5 truncate">{activeRequest.account}</span>
                    <span className="text-[10px] text-slate-500 block truncate">({activeRequest.contact})</span>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 block">Tipo de Requerimiento</span>
                    <span className="font-bold text-slate-850 block mt-0.5">{activeRequest.category}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-450 block">Estado de Registro</span>
                    <span className="inline-block mt-1 text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                      {activeRequest.status}
                    </span>
                  </div>
                </div>

                {/* CRM EXTERNAL INTEGRATION BOX */}
                <div className="bg-slate-900 text-white rounded-xl p-4 border border-slate-800 space-y-3 mt-1">
                  <div className="flex items-center gap-2 text-indigo-400">
                    <span className="material-symbols-outlined text-lg animate-pulse">link</span>
                    <span className="text-xs font-black uppercase tracking-wider font-sans">CONSULTA EN CRM EXTERNO</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal font-sans">
                    Para auditar las evidencias completas de este caso (historial de comandos ejecutados, diagnóstico técnico asentado y nota de cierre oficial de este agente), por favor ingresa al <strong>CRM de Operaciones Corporativas</strong> y realiza la búsqueda con este ID:
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg flex items-center justify-between border border-slate-800 font-mono text-xs text-indigo-300 select-all cursor-pointer hover:border-indigo-500/50 transition-all">
                    <span>ID: {activeRequest.ticketId.replace(/[^\d]/g, '')}</span>
                    <span className="material-symbols-outlined text-xs text-indigo-400">arrow_right_alt</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Quick Guidelines */}
            <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex gap-3 text-xs leading-normal text-slate-700">
              <span className="material-symbols-outlined text-indigo-600 shrink-0">help</span>
              <div>
                <p>
                  Copia el número limpio del ticket para buscarlo al instante en tu CRM corporativo y evalúa en un clic en el panel contiguo.
                </p>
              </div>
            </div>

            {/* General Feedback / Final Comments Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <span className="material-symbols-outlined text-indigo-600 text-xl font-bold">rate_review</span>
                <h4 className="font-display font-extrabold text-slate-800 text-sm tracking-tight">Comentario de Feedback Final</h4>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Escribe las conclusiones y observaciones generales para toda la evaluación de este agente. Se consolidará en la nota final.
              </p>
              
              <div className="relative">
                <textarea
                  rows={3}
                  value={feedbackText}
                  onChange={(e) => onFeedbackChange?.(e.target.value)}
                  placeholder="Ej: Excelente descarte y diagnóstico técnico rápido con nota de cierre impecable. Sigue con el buen apego a playbooks..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 resize-none transition-all leading-relaxed"
                />
                {feedbackText.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onFeedbackChange?.('')}
                    className="absolute bottom-2.5 right-2.5 bg-slate-200/60 hover:bg-slate-200 text-slate-500 text-[10px] font-bold px-1.5 py-0.5 rounded transition-all"
                  >
                    Limpiar
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 mt-1">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Plantillas rápidas (Autofill):</span>
                  <span className="text-[10px] font-mono text-slate-400">{feedbackText.length} caracteres</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {[
                    { text: "Excelente descarte y diagnóstico rápido con nota de cierre impecable.", color: "text-emerald-700 bg-emerald-50/70 border-emerald-100 hover:bg-emerald-100/70 hover:border-emerald-200" },
                    { text: "Buen análisis técnico, pero se sugiere mejorar la claridad del formato SAC en la nota.", color: "text-amber-700 bg-amber-50/70 border-amber-100 hover:bg-amber-100/70 hover:border-amber-200" },
                    { text: "Se identifica descarte incompleto. Requiere coaching técnico inmediato para troubleshooting.", color: "text-rose-700 bg-rose-50/70 border-rose-100 hover:bg-rose-100/70 hover:border-rose-200" }
                  ].map((tpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => onFeedbackChange?.(tpl.text)}
                      className={`text-left text-[11px] font-bold px-3 py-2 rounded-xl border transition-all truncate shrink-0 ${tpl.color}`}
                      title={tpl.text}
                    >
                      {tpl.text}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Agile 4 Evaluation Axes interactive Performance Buttons */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 pb-3 gap-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-base font-sans flex items-center gap-2">
                    <span>Matriz de Desempeño de Troubleshooting</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluando específicamente: <strong className="text-indigo-700 font-mono">{activeRequest.ticketId}</strong> ({activeRequest.account})
                  </p>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold px-3 py-1 rounded-xl shrink-0 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-indigo-600">edit_note</span>
                  <span>Puntuación para este Caso: <strong>{getCaseAverageScore(activeRequest.id)} pts</strong></span>
                </div>
              </div>

              {/* Loop over the 4 axes with beautiful segmented controls */}
              <div className="space-y-4">
                {axesDefinitions.map((axis) => {
                  const score = getCaseAxisScore(activeRequest.id, axis.id);
                  const activeLvl = getActiveLevel(score);
                  const lvlBadge = getLevelBadgeInfo(score);

                  return (
                    <div 
                      key={axis.id} 
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3 hover:border-slate-300 transition-all"
                    >
                      {/* Axis Header and Info */}
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100 shrink-0">
                            <span className="material-symbols-outlined text-lg">{axis.icon}</span>
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm font-sans">{axis.label}</h5>
                            <p className="text-xs text-slate-500 font-medium leading-none mt-0.5">{axis.desc}</p>
                          </div>
                        </div>

                        {/* Direct score bubble */}
                        <div className="text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider border ${lvlBadge.color}`}>
                            {score} pts
                          </span>
                        </div>
                      </div>

                      {/* Dynamic, responsive Level Buttons Matrix */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-2">
                        {LEVELS_CONFIG.map((lvl) => {
                          const isSelected = activeLvl === lvl.level;
                          
                          const buttonStyle = isSelected 
                            ? lvl.activeClass 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs hover:shadow-sm';

                          return (
                            <button
                              key={lvl.level}
                              type="button"
                              onClick={() => handleSelectLevel(axis.id, lvl.score)}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${buttonStyle}`}
                            >
                              <span className="text-[9px] uppercase font-bold tracking-wider opacity-90 block">
                                Nivel {lvl.level}
                              </span>
                              <span className="text-xs font-extrabold mt-1 block">
                                {lvl.title}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 mt-1 rounded ${
                                isSelected ? 'bg-white/20' : 'bg-slate-50 text-slate-550'
                              }`}>
                                {lvl.score} pts
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Precise adjustment slider (Secondary) */}
                      <div className="flex items-center gap-4 pt-3 border-t border-slate-100 mt-1">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
                          Ajuste de Precisión:
                        </span>
                        <input 
                          type="range"
                          min="0"
                          max="100"
                          value={score}
                          onChange={(e) => handleSelectLevel(axis.id, Number(e.target.value))}
                          className="flex-grow h-1 rounded-lg appearance-none cursor-pointer bg-slate-200 hover:bg-slate-250 transition-colors"
                          style={{ accentColor: '#4f46e5' }}
                        />
                        <span className="text-xs font-mono font-bold text-slate-700 min-w-[24px] text-right">
                          {score}
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-2 text-slate-600">
          <span className="material-symbols-outlined text-indigo-600 text-4xl">folder_off</span>
          <h4 className="font-bold text-slate-800">No se encontraron requerimientos</h4>
          <p className="text-xs max-w-sm">
            No se registran requerimientos activos en esta ronda. Por favor revisa los filtros de origen.
          </p>
        </div>
      )}

    </div>
  );
}
