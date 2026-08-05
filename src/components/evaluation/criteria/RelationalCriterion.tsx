import React, { useState, useEffect, useMemo } from 'react';
import { Agent, Certification } from '../../../types';

interface RelationalCriterionProps {
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

// Basic support operational cases for reference
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

// Configuration of performance levels with EMERALD color theme (Competente = 85% - Bien)
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
    badgeColor: 'bg-[#10B981] border-[#10B981]/30 text-white', 
    activeClass: 'bg-[#10B981] hover:bg-[#0d9488] text-white border-[#10B981] ring-4 ring-emerald-500/15' 
  },
  { 
    level: 4, 
    title: 'Sobresaliente', 
    score: 100, 
    badgeColor: 'bg-emerald-100 border-emerald-300 text-emerald-950', 
    activeClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 ring-4 ring-emerald-500/15' 
  }
];

// Helper to map score to level
const getActiveLevel = (score: number) => {
  if (score <= 50) return 1;
  if (score <= 74) return 2;
  if (score <= 92) return 3;
  return 4;
};

// Help helper for visual badges
const getLevelBadgeInfo = (score: number) => {
  if (score <= 50) return { level: 1, title: 'Insuficiente', color: 'bg-rose-100 border-rose-300 text-rose-950 font-bold' };
  if (score <= 74) return { level: 2, title: 'En Desarrollo', color: 'bg-amber-100 border-amber-300 text-amber-950 font-bold' };
  if (score <= 92) return { level: 3, title: 'Competente', color: 'bg-emerald-100 border-emerald-300 text-emerald-950 font-bold' };
  return { level: 4, title: 'Sobresaliente', color: 'bg-teal-100 border-teal-300 text-teal-950 font-bold' };
};

export function RelationalCriterion({ 
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
}: RelationalCriterionProps) {
  
  // State for storing per-case evaluation scores
  const [caseEvaluations, setCaseEvaluations] = useState<Record<string, Record<string, number>>>(() => {
    try {
      const saved = localStorage.getItem(`eval_rel_cases_${agent.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync caseEvaluations with localStorage when changed or agent changes
  useEffect(() => {
    try {
      if (agent.id) {
        localStorage.setItem(`eval_rel_cases_${agent.id}`, JSON.stringify(caseEvaluations));
      }
    } catch (e) {}
  }, [caseEvaluations, agent.id]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`eval_rel_cases_${agent.id}`);
      if (saved) {
        setCaseEvaluations(JSON.parse(saved));
      } else {
        setCaseEvaluations({});
      }
    } catch (e) {
      setCaseEvaluations({});
    }
  }, [agent.id]);

  // Parse and map spreadsheet rows
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

  // Selected request state
  const [activeRequestId, setActiveRequestId] = useState<string>('');

  useEffect(() => {
    if (finalRequests && finalRequests.length > 0) {
      if (!finalRequests.some(r => r.id === activeRequestId)) {
        setActiveRequestId(finalRequests[0].id);
      }
    }
  }, [finalRequests, activeRequestId]);
  
  const activeRequest = finalRequests.find(r => r.id === activeRequestId) || finalRequests[0];

  // Calculate average score for each axis across all active requests
  const computedSubScores = useMemo(() => {
    const axes = ['tone', 'clar', 'time', 'list'];
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

  // The 4 Customer Service Evaluation Axes & Contextual Levels description
  const axesDefinitions = [
    {
      id: 'tone',
      label: '1. Tono Profesional y Empatía',
      desc: 'Mide la asertividad, cortesía, calidez y capacidad de contención ante la frustración del cliente.',
      icon: 'sentiment_satisfied',
      scenarios: {
        1: 'Tono cortante, frío o impaciente. Falta de empatía ante la urgencia del cliente.',
        2: 'Tono neutro o robótico. Respuesta estandarizada sin personalizar ni validar la molestia.',
        3: 'Tono cálido, asertivo y personalizado. Conecta bien con la frustración y calma al usuario.',
        4: 'Empatía excepcional y acompañamiento continuo. Genera confianza y una experiencia memorable.'
      }
    },
    {
      id: 'clar',
      label: '2. Claridad y Redacción',
      desc: 'Evalúa la ortografía, estructuración del texto y uso de un lenguaje simple y entendible.',
      icon: 'chat_bubble',
      scenarios: {
        1: 'Exceso de tecnicismos incomprensibles o errores ortográficos severos que confunden al cliente.',
        2: 'Redacción aceptable pero desordenada. El cliente necesita repreguntar para entender los pasos.',
        3: 'Mensaje impecable, claro, ordenado con viñetas explicativas y lenguaje amigable.',
        4: 'Estructura didáctica perfecta, preventiva e ilustrativa. Evita cualquier duda posterior.'
      }
    },
    {
      id: 'time',
      label: '3. Oportunidad y Cumplimiento de Compromisos',
      desc: 'Valida la velocidad de respuesta, proactividad en el seguimiento (FUP) y respeto de acuerdos.',
      icon: 'schedule',
      scenarios: {
        1: 'Respuestas fuera de plazo de SLA. Deja al cliente en espera sin actualizaciones de estado.',
        2: 'Cumple con el plazo límite de SLA pero es reactivo. No gestiona expectativas de tiempos de entrega.',
        3: 'Respuestas ágiles, proactivo en el seguimiento (FUP) y respeta fielmente los compromisos.',
        4: 'Anticipación total. Se comunica proactivamente antes del vencimiento para reportar avances.'
      }
    },
    {
      id: 'list',
      label: '4. Escucha Activa',
      desc: 'Califica la comprensión del problema del cliente para evitar repeticiones o respuestas erróneas.',
      icon: 'record_voice_over',
      scenarios: {
        1: 'Ignora el requerimiento real del cliente o responde de forma automática sobre otro tema.',
        2: 'Atiende a medias. Vuelve a solicitar información o archivos que el cliente ya había enviado.',
        3: 'Identifica la necesidad real y de fondo a la primera. Valida el entendimiento con el cliente.',
        4: 'Comprensión profunda. Lee entre líneas, responde la duda implícita y previene futuras consultas.'
      }
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
    const axes = ['tone', 'clar', 'time', 'list'];
    const scores = axes.map(a => getCaseAxisScore(caseId, a));
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round(sum / axes.length);
  };

  const getCaseEvaluatedAxesCount = (caseId: string): number => {
    const caseEval = caseEvaluations[caseId];
    if (!caseEval) return 0;
    return Object.keys(caseEval).length;
  };

  const handleSelectLevel = (axisId: string, levelScore: number) => {
    if (!activeRequest) return;
    const cId = activeRequest.id;

    setCaseEvaluations(prev => {
      const currentCaseEvals = prev[cId] || {
        tone: subScores.tone ?? 75,
        clar: subScores.clar ?? 75,
        time: subScores.time ?? 75,
        list: subScores.list ?? 75,
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

  // Extract clean number from ID
  const copyToClipboard = (text: string) => {
    const numericPart = text.replace(/[^\d]/g, '');
    navigator.clipboard.writeText(numericPart);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Progress computation
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
          <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-100 shrink-0">
            <span className="material-symbols-outlined text-3xl">support_agent</span>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-display font-bold text-2xl text-slate-800">Servicio al Cliente y Comunicación (KPI 3)</h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase px-2.5 py-1 rounded-full border border-emerald-100">
                Calidad de Atención
              </span>
            </div>
            <p className="text-slate-500 text-xs mt-1 max-w-2xl leading-normal">
              Evalúa la empatía, redacción y escucha activa del agente en sus interacciones externas. Contrasta el número de ticket en tu CRM externo y califica de forma ágil y dinámica el nivel alcanzado en los 4 ejes clave.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Active Agent Context */}
          <div className="bg-slate-50 border border-slate-150 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
              {agent.initials || agent.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Agente Evaluado</span>
              <span className="text-xs font-bold text-slate-700">{agent.name}</span>
            </div>
          </div>

          {/* KPI Score Card */}
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex items-center gap-4 justify-between shadow-sm min-w-[150px]">
            <div>
              <span className="text-[9px] text-emerald-700 font-bold uppercase tracking-wider block font-sans">SCORE SERVICIO</span>
              <span className="text-3xl font-black text-emerald-600 font-mono tracking-tight">
                {globalScore} <span className="text-xs text-emerald-550 font-normal">/100</span>
              </span>
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-xs border border-emerald-100">
              <span className="material-symbols-outlined font-black text-xl">reviews</span>
            </div>
          </div>
        </div>
      </div>

      {/* Google Sheets Integration Panel */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-650">grid_on</span>
            <div>
              <h4 className="font-bold text-slate-800 text-sm font-sans">Origen de Requerimientos: Google Sheets</h4>
              <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">
                Casos asignados a {agent.name} importados de la planilla semanal de producción.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {casesLoading ? (
              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <span className="animate-spin inline-block w-3 h-3 border-2 border-emerald-600 border-t-transparent rounded-full" />
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
                  className="text-emerald-650 focus:ring-emerald-500"
                />
                <span className="text-slate-800 font-semibold">3 al Azar (Por Defecto)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input 
                  type="radio" 
                  checked={!useRandomSelection} 
                  onChange={() => setUseRandomSelection(false)}
                  className="text-emerald-650 focus:ring-emerald-500"
                />
                <span className="text-slate-800 font-semibold">Selección Manual Específica</span>
              </label>

              {useRandomSelection && onReRollRandom && (
                <button
                  type="button"
                  onClick={onReRollRandom}
                  className="bg-white border border-slate-300 hover:bg-slate-50 text-emerald-600 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all ml-auto"
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
                          isChecked ? 'bg-emerald-50/55 border-emerald-400' : 'hover:bg-slate-50 border-slate-150'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCheckboxManualToggle(String(id))}
                          className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
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
            Casos Seleccionados para Auditar ({finalRequests.length} cargados):
          </span>
          <span className="text-[11px] text-emerald-800 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-150">
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
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-md ring-2 ring-emerald-600/5' 
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                  }`}
                >
                  {isActive && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white px-2 py-0.5 rounded-bl-lg text-[9px] font-black uppercase tracking-wider shadow-xs">
                      En Auditoría (Caso #{idx + 1})
                    </div>
                  )}

                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                      {tc.ticketId}
                    </span>
                    
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${
                        caseScore >= 85 ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                        caseScore >= 70 ? 'bg-teal-100 text-teal-900 border-teal-300' :
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
                      className={`h-full transition-all duration-300 ${isFullyEvaluated ? 'bg-emerald-500' : 'bg-teal-600'}`} 
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
          <div className="bg-gradient-to-r from-emerald-50/90 via-slate-50 to-emerald-50/90 border border-emerald-200/90 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm mt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0">
                <span className="material-symbols-outlined">analytics</span>
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-2">
                  <span>Puntuación del Criterio por Promedio de Casos</span>
                  <span className="bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded uppercase">
                    {finalRequests.length} {finalRequests.length === 1 ? 'Caso' : 'Casos'}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                  Puntúa cada requerimiento de forma independiente. La nota global de Servicio al Cliente (<strong>{globalScore} pts</strong>) es el promedio exacto de los {finalRequests.length} casos auditados.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0 bg-white p-2.5 rounded-xl border border-emerald-150 shadow-2xs">
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
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' 
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span className="text-[10px] opacity-80 font-mono">Caso #{idx + 1}:</span>
                    <span>{score} pts</span>
                  </button>
                );
              })}

              <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

              <div className="bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg text-xs font-black text-emerald-800 flex items-center gap-1">
                <span className="text-[10px] text-emerald-600 uppercase font-bold">PROMEDIO:</span>
                <span className="text-sm font-mono">{globalScore} pts</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid Area */}
      {activeRequest ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: Ticket Basic Metadata, External CRM Lookup, and Final Feedback box */}
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
                <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-750 block">NÚMERO DE TICKET ID</span>
                    <span className="text-lg font-black font-mono text-emerald-950 block mt-0.5">{activeRequest.ticketId}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeRequest.ticketId)}
                    className="bg-white hover:bg-slate-50 border border-emerald-200 hover:border-emerald-300 text-emerald-700 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-xs transition-all"
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
                  <div className="flex items-center gap-2 text-emerald-400">
                    <span className="material-symbols-outlined text-lg animate-pulse">link</span>
                    <span className="text-xs font-black uppercase tracking-wider font-sans">CONSULTA EN CRM EXTERNO</span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-normal font-sans">
                    Para auditar la interacción de soporte, chats o correos oficiales enviados por el agente, por favor busca el ticket en tu <strong>CRM de Operaciones Corporativas</strong> usando el ID numérico:
                  </p>
                  <div className="bg-slate-950 p-2.5 rounded-lg flex items-center justify-between border border-slate-800 font-mono text-xs text-emerald-300 select-all cursor-pointer hover:border-emerald-500/50 transition-all">
                    <span>ID: {activeRequest.ticketId.replace(/[^\d]/g, '')}</span>
                    <span className="material-symbols-outlined text-xs text-emerald-400">arrow_right_alt</span>
                  </div>
                </div>

              </div>
            </div>

            {/* General Feedback / Final Comments Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col gap-3.5">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <span className="material-symbols-outlined text-emerald-600 text-xl font-bold">rate_review</span>
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
                  placeholder="Ej: Excelente actitud y comunicación clara con el cliente. Manejó la molestia de forma empática y resolvió proactivamente..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-850 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/10 focus:border-emerald-500 resize-none transition-all leading-relaxed"
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
                    { text: "Excelente tono profesional, empatía impecable y comunicación muy clara.", color: "text-emerald-700 bg-emerald-50/70 border-emerald-100 hover:bg-emerald-100/70 hover:border-emerald-200" },
                    { text: "Responde de forma clara, pero se recomienda ser más proactivo en el seguimiento (FUP).", color: "text-amber-700 bg-amber-50/70 border-amber-100 hover:bg-amber-100/70 hover:border-amber-200" },
                    { text: "Falta de empatía en la interacción. Requiere coaching en comunicación y manejo de tensión.", color: "text-rose-700 bg-rose-50/70 border-rose-100 hover:bg-rose-100/70 hover:border-rose-200" }
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

            {/* Guidance tip */}
            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-3 text-xs leading-normal text-slate-700">
              <span className="material-symbols-outlined text-emerald-600 shrink-0">help</span>
              <div>
                <p>
                  Copia el número limpio del ticket para buscar la interacción al instante en tu CRM externo y selecciona los niveles de desempeño a la derecha.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: The Agile 4 Evaluation Axes Segmented Controls */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 pb-3 gap-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-base font-sans flex items-center gap-2">
                    <span>Matriz de Desempeño: Servicio al Cliente</span>
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evaluando específicamente: <strong className="text-emerald-800 font-mono">{activeRequest.ticketId}</strong> ({activeRequest.account})
                  </p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-bold px-3 py-1 rounded-xl shrink-0 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-600">edit_note</span>
                  <span>Puntuación para este Caso: <strong>{getCaseAverageScore(activeRequest.id)} pts</strong></span>
                </div>
              </div>

              {/* Loop over the 4 customer service axes */}
              <div className="space-y-4">
                {axesDefinitions.map((axis) => {
                  const score = getCaseAxisScore(activeRequest.id, axis.id);
                  const activeLvl = getActiveLevel(score);
                  const lvlBadge = getLevelBadgeInfo(score);

                  return (
                    <div 
                      key={axis.id} 
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col gap-3.5 hover:border-slate-300 transition-all"
                    >
                      {/* Axis Header */}
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shrink-0">
                            <span className="material-symbols-outlined text-lg">{axis.icon}</span>
                          </div>
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm font-sans">{axis.label}</h5>
                            <p className="text-xs text-slate-500 leading-snug mt-0.5">{axis.desc}</p>
                          </div>
                        </div>

                        {/* Direct score bubble */}
                        <div className="text-right shrink-0">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider border ${lvlBadge.color}`}>
                            {score} pts
                          </span>
                        </div>
                      </div>

                      {/* Level Selection Grid */}
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

                      {/* Contextual Scenario Description based on currently selected score/level */}
                      <div className="bg-slate-50/80 border border-slate-150 rounded-xl p-3 text-xs text-slate-700 leading-relaxed mt-1 flex items-start gap-2.5">
                        <span className="material-symbols-outlined text-slate-400 text-sm shrink-0 mt-0.5">info</span>
                        <div>
                          <span className="font-bold text-slate-650 block text-[10px] uppercase tracking-wider mb-0.5">
                            Evidencia / Guía de Nivel {activeLvl}:
                          </span>
                          <span>
                            {axis.scenarios[activeLvl as 1 | 2 | 3 | 4]}
                          </span>
                        </div>
                      </div>

                      {/* Precise adjustment slider */}
                      <div className="flex items-center gap-4 pt-3 border-t border-slate-100">
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
                          style={{ accentColor: '#10B981' }}
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
          <span className="material-symbols-outlined text-emerald-600 text-4xl">folder_off</span>
          <h4 className="font-bold text-slate-800">No se encontraron requerimientos</h4>
          <p className="text-xs max-w-sm">
            No se registran requerimientos activos en esta ronda. Por favor revisa los filtros de origen.
          </p>
        </div>
      )}

    </div>
  );
}
