import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Agent } from '../../../types';
import { CRITERIA } from './constants';

interface ControlCriterionProps {
  agent: Agent;
  globalScore: number;
  subScores: Record<string, number>;
  onSubScoreChange: (subId: string, val: number) => void;
  onEvidenceChange: (subId: string, text: string) => void;
  allSheetCases?: any[];
}

interface CaseEvaluation {
  sac: number;       // Estructura S-A-C (0 | 12 | 25)
  sla: number;       // Control de SLA / ETA (0 | 12 | 25)
  evidence: number;  // Diagnóstico & Evidencias (0 | 12 | 25)
  closure: number;   // Cierre & Notificación CRM (0 | 12 | 25)
  blockers?: number; // Legacy fallback for previous state
  sync?: number;     // Legacy fallback for previous state
  notes: string;
  complexity: 'Baja' | 'Media' | 'Alta';
  isAudited: boolean;
}

interface CargaCalibration {
  volumeAssignments: number; // 0 | 12 | 25 (Manejo de Carga & Asignaciones)
  etaCoherence: number;      // 0 | 12 | 25 (Coherencia de Tiempos ETA vs Real)
  dailyLog: number;          // 0 | 12 | 25 (Disciplina de Bitácora & Registro Diario)
  fupProactivity: number;    // 0 | 12 | 25 (Proactividad & Seguimiento FUP General)
  // Legacy fallbacks
  yesterdayVeracity?: number;
  todayPlanning?: number;
  blockersFup?: number;
  etaCommitment?: number;
}

export function ControlCriterion({ 
  agent, 
  globalScore, 
  subScores, 
  onSubScoreChange, 
  onEvidenceChange,
  allSheetCases = [] 
}: ControlCriterionProps) {
  const criterion = CRITERIA.find(c => c.key === 'control')!;

  // 1. Process and filter real completed cases exclusively from the current sprint
  const completedSprintTickets = useMemo(() => {
    if (!allSheetCases || allSheetCases.length === 0) return [];
    return allSheetCases.filter(ticket => {
      const rawStatus = String(ticket["Status"] || ticket["status"] || ticket["Estado"] || ticket["estado"] || "").toLowerCase();
      const status = rawStatus.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      // Determine if the ticket represents a strictly completed/resolved task
      return (
        status.includes("completad") || 
        status.includes("cerrad") || 
        status.includes("resuelt") || 
        status.includes("done") || 
        status.includes("resolved") || 
        status.includes("closed") || 
        status.includes("completed") || 
        status.includes("finalizad") || 
        status.includes("terminad")
      );
    });
  }, [allSheetCases]);

  // 2. Fallback realistic sprint cases if none exist in the database for this specific agent and active sprint
  const fallbackCases = useMemo(() => {
    const code1 = 1200 + (agent.name.charCodeAt(0) % 900);
    const code2 = 3400 + (agent.name.charCodeAt(1) % 900);
    const code3 = 5600 + (agent.name.charCodeAt(2) % 900);
    return [
      {
        id: `fallback-${agent.id}-1`,
        ticketId: `REQ-${code1}`,
        title: `Descarte técnico de pérdida de paquetes en Enlace IP - Canal Crítico`,
        category: 'Conectividad / Enlaces',
        status: 'Completado en Sprint',
        account: 'Distribuidora Logística Central',
        contact: 'Ing. Alejandro Solis',
        isFallback: true
      },
      {
        id: `fallback-${agent.id}-2`,
        ticketId: `REQ-${code2}`,
        title: `Restauración de Servicio CCTV Sucursal Poniente y Bitácora Local`,
        category: 'Canales de Servicio',
        status: 'Completado en Sprint',
        account: 'Supermercados del Centro',
        contact: 'Esteban Reyes',
        isFallback: true
      },
      {
        id: `fallback-${agent.id}-3`,
        ticketId: `REQ-${code3}`,
        title: `Revisión de Parámetros de Red y Cambio de Switches L2 Core`,
        category: 'Infraestructura',
        status: 'Completado en Sprint',
        account: 'Corporativo San Angel',
        contact: 'Patricia Valdéz',
        isFallback: true
      }
    ];
  }, [agent]);

  // --- SELECTION AND TICKET MANAGEMENT FOR AGENT ---
  const [selectedCaseIds, setSelectedCaseIds] = useState<string[]>([]);
  const [hasInitializedSelection, setHasInitializedSelection] = useState<boolean>(false);

  // Synchronize and auto-initialize state when agent or completedSprintTickets changes
  useEffect(() => {
    let initVal = false;
    try {
      initVal = localStorage.getItem(`eval_control_initialized_${agent.id}`) === 'true';
    } catch (e) {}
    setHasInitializedSelection(initVal);

    let selectedVal: string[] = [];
    try {
      const saved = localStorage.getItem(`eval_control_selected_case_ids_${agent.id}`);
      if (saved) {
        selectedVal = JSON.parse(saved);
      } else if (!initVal && completedSprintTickets.length > 0) {
        // Auto-initialize with first 3 real completed tickets of the active sprint
        selectedVal = completedSprintTickets.slice(0, 3).map(t => String(t.id || t["ID"] || t["id"] || ""));
        localStorage.setItem(`eval_control_initialized_${agent.id}`, 'true');
        localStorage.setItem(`eval_control_selected_case_ids_${agent.id}`, JSON.stringify(selectedVal));
        initVal = true;
        setHasInitializedSelection(true);
      }
    } catch (e) {}
    setSelectedCaseIds(selectedVal);
    setManagerSearchTerm('');
  }, [agent.id, completedSprintTickets]);

  // Persist selected case IDs whenever it changes for the active agent
  useEffect(() => {
    if (selectedCaseIds.length > 0 || hasInitializedSelection) {
      localStorage.setItem(`eval_control_selected_case_ids_${agent.id}`, JSON.stringify(selectedCaseIds));
    }
  }, [selectedCaseIds, agent.id, hasInitializedSelection]);

  // Filter completed sprint tickets down to those selected by the user
  const activeCasesList = useMemo(() => {
    const selected = completedSprintTickets.filter(t => {
      const id = String(t.id || t["ID"] || t["id"] || "");
      return selectedCaseIds.includes(id);
    });

    if (completedSprintTickets.length > 0) {
      return selected;
    }

    if (selected.length === 0) {
      return fallbackCases;
    }
    return selected;
  }, [completedSprintTickets, selectedCaseIds, fallbackCases]);

  const isUsingFallback = useMemo(() => {
    if (completedSprintTickets.length > 0) {
      return false;
    }
    const selected = completedSprintTickets.filter(t => {
      const id = String(t.id || t["ID"] || t["id"] || "");
      return selectedCaseIds.includes(id);
    });
    return selected.length === 0;
  }, [completedSprintTickets, selectedCaseIds]);

  const [expandedCaseId, setExpandedCaseId] = useState<string>('');
  const [showManager, setShowManager] = useState<boolean>(false);
  const [managerSearchTerm, setManagerSearchTerm] = useState<string>('');

  const lastAgentIdRef = useRef<string>(agent.id);

  useEffect(() => {
    const activeIds = activeCasesList.map(c => String(c.id || c["ID"] || c["id"] || ""));
    const firstId = activeCasesList.length > 0 ? String(activeCasesList[0].id || activeCasesList[0]["ID"] || activeCasesList[0]["id"] || "") : "";

    if (lastAgentIdRef.current !== agent.id) {
      lastAgentIdRef.current = agent.id;
      setExpandedCaseId(firstId);
    } else {
      setExpandedCaseId(prev => {
        if (prev && !activeIds.includes(prev)) {
          return firstId;
        }
        return prev;
      });
    }
  }, [activeCasesList, agent.id]);

  // Case evaluations state
  const [evaluations, setEvaluations] = useState<Record<string, CaseEvaluation>>(() => {
    try {
      const saved = localStorage.getItem(`eval_control_evals_${agent.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {};
  });

  useEffect(() => {
    localStorage.setItem(`eval_control_evals_${agent.id}`, JSON.stringify(evaluations));
  }, [evaluations, agent.id]);

  const resolvedEvaluations = useMemo(() => {
    const updated = { ...evaluations };

    activeCasesList.forEach((c, idx) => {
      const caseId = String(c.id || c["ID"] || c["id"] || "");
      if (!updated[caseId]) {
        updated[caseId] = {
          sac: idx === 0 ? 25 : (idx === 1 ? 12 : 25),
          sla: idx === 0 ? 12 : (idx === 1 ? 25 : 12),
          evidence: idx === 0 ? 25 : (idx === 1 ? 12 : 25),
          closure: idx === 0 ? 12 : (idx === 1 ? 25 : 25),
          notes: idx === 0 
            ? 'Caso resuelto de forma pulcra. Siguió la metodología SAC con gran detalle y adjuntó las evidencias completas del diagnóstico y solución.'
            : 'Sigue correctamente los hitos de tiempo de ETA y registra evidencias básicas, aunque se sugiere detallar con mayor precisión la conclusión.',
          complexity: idx === 0 ? 'Media' : 'Alta',
          isAudited: true
        };
      }
    });

    return updated;
  }, [activeCasesList, evaluations]);

  useEffect(() => {
    const keysBefore = Object.keys(evaluations);
    const keysAfter = Object.keys(resolvedEvaluations);
    if (keysBefore.length !== keysAfter.length) {
      setEvaluations(resolvedEvaluations);
    }
  }, [resolvedEvaluations, evaluations]);

  const toggleCaseSelection = (id: string) => {
    setSelectedCaseIds(prev => {
      const isSelected = prev.includes(id);
      const updated = isSelected 
        ? prev.filter(x => x !== id) 
        : [...prev, id];
      localStorage.setItem(`eval_control_selected_case_ids_${agent.id}`, JSON.stringify(updated));
      return updated;
    });
  };

  const updateCaseRating = (caseId: string, key: keyof CaseEvaluation, val: any) => {
    setEvaluations(prev => {
      const currentCase = prev[caseId] || {
        sac: 21,
        sla: 21,
        evidence: 21,
        closure: 21,
        notes: '',
        complexity: 'Media',
        isAudited: true
      };
      return {
        ...prev,
        [caseId]: {
          ...currentCase,
          [key]: val
        }
      };
    });
  };

  const updateCaseAxisScore = (caseId: string, axisKey: 'sac' | 'sla' | 'evidence' | 'closure', val: number) => {
    updateCaseRating(caseId, axisKey, val);
  };

  // Carga Calibration State (Standard = 21 pts per component -> 84% total)
  const [cargaCalib, setCargaCalib] = useState<CargaCalibration>(() => {
    try {
      const saved = localStorage.getItem(`eval_control_carga_${agent.id}`) || localStorage.getItem(`eval_control_scrum_${agent.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      volumeAssignments: 21,
      etaCoherence: 21,
      dailyLog: 21,
      fupProactivity: 21
    };
  });

  useEffect(() => {
    localStorage.setItem(`eval_control_carga_${agent.id}`, JSON.stringify(cargaCalib));
  }, [cargaCalib, agent.id]);

  const [cargaEvidence, setCargaEvidence] = useState('');
  const [trazEvidence, setTrazEvidence] = useState('');

  useEffect(() => {
    const ce = agent.evidence?.find(e => e.subId === 'carga')?.text || '';
    const te = agent.evidence?.find(e => e.subId === 'traz')?.text || '';
    setCargaEvidence(ce);
    setTrazEvidence(te);
  }, [agent.id, agent.evidence]);

  const auditedPool = useMemo(() => {
    return activeCasesList.filter(c => {
      const caseId = String(c.id || c["ID"] || c["id"] || "");
      const ev = evaluations[caseId];
      return ev && ev.isAudited;
    });
  }, [activeCasesList, evaluations]);

  const trazScore = useMemo(() => {
    if (auditedPool.length === 0) return 85;
    const caseScores = auditedPool.map(c => {
      const caseId = String(c.id || c["ID"] || c["id"] || "");
      const ev = evaluations[caseId];
      if (!ev) return 85;
      const sac = ev.sac ?? 21;
      const sla = ev.sla ?? 21;
      const evidence = ev.evidence ?? ev.blockers ?? ev.sync ?? 21;
      const closure = ev.closure ?? 21;
      return sac + sla + evidence + closure;
    });
    const avg = caseScores.reduce((sum, val) => sum + val, 0) / auditedPool.length;
    return Math.round(avg);
  }, [auditedPool, evaluations]);

  const cargaScore = useMemo(() => {
    const v1 = cargaCalib.volumeAssignments ?? cargaCalib.yesterdayVeracity ?? 21;
    const v2 = cargaCalib.etaCoherence ?? cargaCalib.todayPlanning ?? 21;
    const v3 = cargaCalib.dailyLog ?? cargaCalib.blockersFup ?? 21;
    const v4 = cargaCalib.fupProactivity ?? cargaCalib.etaCommitment ?? 21;
    return v1 + v2 + v3 + v4;
  }, [cargaCalib]);

  useEffect(() => {
    if (subScores.traz !== trazScore) {
      onSubScoreChange('traz', trazScore);
    }
    if (subScores.carga !== cargaScore) {
      onSubScoreChange('carga', cargaScore);
    }
  }, [trazScore, cargaScore, subScores.traz, subScores.carga, onSubScoreChange]);

  const handleUpdateCargaRating = (key: keyof CargaCalibration, val: number) => {
    setCargaCalib(prev => ({ ...prev, [key]: val }));
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (score >= 75) return 'text-violet-700 bg-violet-50 border-violet-200';
    if (score >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    return 'text-rose-700 bg-rose-50 border-rose-200';
  };

  return (
    <div className="p-6 lg:p-8 bg-slate-50/50 min-h-screen">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-violet-600"></div>
        <div className="flex items-center gap-4 pl-2">
          <div className="w-14 h-14 bg-violet-600 text-white rounded-2xl flex items-center justify-center shadow-lg shrink-0">
            <span className="material-symbols-outlined text-3xl">fact_check</span>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-slate-900">Auditoría Operativa y de Trazabilidad</h1>
            <p className="text-xs text-slate-500 mt-0.5">Evaluación rigurosa de los requerimientos completados en el Sprint actual y gestión de carga de trabajo.</p>
          </div>
        </div>

        {/* Dynamic score summary */}
        <div className="flex flex-wrap items-center gap-5 md:gap-8 divide-y md:divide-y-0 md:divide-x divide-slate-100 bg-slate-50/60 p-4 rounded-xl border border-slate-100">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Auditoría CRM (traz)</span>
            <span className="text-xl font-bold text-slate-800">{trazScore} / 100</span>
          </div>
          <div className="text-right pl-0 md:pl-8 pt-2 md:pt-0">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">Gestión de Carga (carga)</span>
            <span className="text-xl font-bold text-slate-800">{cargaScore} / 100</span>
          </div>
          <div className="text-right pl-0 md:pl-8 pt-2 md:pt-0">
            <span className="text-[10px] text-violet-600 font-extrabold uppercase tracking-widest block">Índice Global</span>
            <span className={`text-2xl font-black ${criterion.color}`}>{globalScore} pts</span>
          </div>
        </div>
      </div>

      {/* 2. ALERT/INFO BANNER REGARDING CASES SOURCE */}
      <div className={`p-4 rounded-xl border mb-6 flex items-start gap-3 transition shadow-sm ${
        isUsingFallback 
          ? 'bg-amber-50/70 border-amber-200 text-amber-900' 
          : 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
      }`}>
        <span className="material-symbols-outlined shrink-0 mt-0.5">
          {isUsingFallback ? 'info' : 'verified'}
        </span>
        <div className="text-xs">
          {isUsingFallback ? (
            <>
              <span className="font-extrabold block">Casos Representativos del Sprint Activo</span>
              <span>No se detectaron requerimientos cerrados en la base de datos para <strong>{agent.name}</strong> en el Sprint activo. Se cargaron 3 casos operacionales de muestra del Sprint actual para la calibración del criterio.</span>
            </>
          ) : (
            <>
              <span className="font-extrabold block">Requerimientos Completados del Sprint Activo</span>
              <span>Se han recuperado con éxito <strong>{completedSprintTickets.length} casos completados</strong> por el técnico en este Sprint. Utilice las fichas a continuación para evaluar la trazabilidad y calidad de la documentación.</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        
        {/* ==================== LEFT COLUMN: REAL SPRINT CASES AUDIT (col-span-7) ==================== */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full">
            <div className="border-b border-slate-100 pb-4 mb-6">
              <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500">reviews</span>
                1. Fichas de Auditoría de Casos del Técnico (Sprint Activo)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Audite individualmente los requerimientos cerrados del técnico en el Sprint actual. Cada caso se califica en base a 4 ejes universales de documentación y trazabilidad técnica.
              </p>
            </div>

            {/* COMPACT CASE SELECTION CONTROL BAR */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50 border border-slate-200/80 px-4 py-3 rounded-xl mb-6 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-500 text-lg">folder_managed</span>
                <span className="text-xs text-slate-700 font-bold">
                  {selectedCaseIds.length === 0 ? (
                    completedSprintTickets.length > 0 ? (
                      <span className="text-rose-700 font-bold">Sin requerimientos seleccionados para evaluar</span>
                    ) : (
                      <span className="text-amber-700 font-semibold">Sin casos reales en base de datos para este sprint</span>
                    )
                  ) : (
                    <span>Casos en evaluación: <strong className="text-indigo-600 font-extrabold">{selectedCaseIds.length}</strong></span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowManager(!showManager)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 active:bg-violet-200 transition border border-violet-200 shadow-sm shrink-0"
              >
                <span className="material-symbols-outlined text-sm">
                  {showManager ? "expand_less" : "tune"}
                </span>
                <span>{showManager ? "Cerrar Gestor de Casos" : "⚙️ Administrar Casos"}</span>
              </button>
            </div>

            {/* EXPANDABLE CASE SELECTION MANAGER */}
            {showManager && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-violet-600 text-lg">rule_folder</span>
                    <span className="text-xs uppercase font-extrabold tracking-wider text-slate-700">
                      Selección de Casos del Sprint para Auditoría
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400">
                    Sprint Actual
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-extrabold text-slate-600">
                      Casos de {agent.name} Completados en el Sprint ({completedSprintTickets.length})
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Habilite o deshabilite los tickets completados en el Sprint activo para incluirlos en la auditoría.
                    </p>
                  </div>

                  {/* Filter input */}
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                      search
                    </span>
                    <input
                      type="text"
                      value={managerSearchTerm}
                      onChange={(e) => setManagerSearchTerm(e.target.value)}
                      placeholder="Buscar por ID, asunto o cuenta del cliente..."
                      className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 focus:ring-1 focus:ring-violet-500 bg-white animate-none"
                    />
                  </div>

                  {/* Available CRM list */}
                  <div className="max-h-[240px] overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 pr-1">
                    {completedSprintTickets.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 italic">
                        No se encontraron requerimientos completados en este Sprint para auditar.
                      </div>
                    ) : (() => {
                      const filtered = completedSprintTickets.filter(t => {
                        const term = managerSearchTerm.toLowerCase().trim();
                        if (!term) return true;
                        const tId = String(t.ticketId || t["ID"] || t["ID Tarea"] || "").toLowerCase();
                        const tTitle = String(t.title || t["Subject"] || t["Asunto"] || "").toLowerCase();
                        const tAccount = String(t.account || t["Account"] || t["Cuenta"] || "").toLowerCase();
                        return tId.includes(term) || tTitle.includes(term) || tAccount.includes(term);
                      });

                      if (filtered.length === 0) {
                        return (
                          <div className="p-4 text-center text-xs text-slate-400 italic">
                            Ningún requerimiento coincide con los filtros de búsqueda.
                          </div>
                        );
                      }

                      return filtered.map((t, idx) => {
                        const id = String(t.id || t["ID"] || t["id"] || "");
                        const isSelected = selectedCaseIds.includes(id);
                        const tId = t.ticketId || t["ID"] || t["ID Tarea"] || `REQ-${idx + 1}`;
                        const tTitle = t.title || t["Subject"] || t["Asunto"] || "Sin Título";
                        const tAccount = t.account || t["Account"] || t["Cuenta"] || "Cliente General";

                        return (
                          <div key={id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 px-1.5 py-0.5 rounded text-[10px]">
                                  {tId}
                                </span>
                                <span className="text-[11px] font-bold text-slate-600 truncate">
                                  {tAccount}
                                </span>
                              </div>
                              <div className="text-xs text-slate-700 truncate font-semibold mt-1" title={tTitle}>
                                {tTitle}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleCaseSelection(id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                                isSelected
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-700'
                                  : 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100'
                              }`}
                            >
                              {isSelected ? (
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs leading-none">check</span>
                                  Incluido en Evaluación
                                </span>
                              ) : '+ Incluir en Ficha'}
                            </button>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Cases List with Accordion Style */}
            <div className="space-y-4 flex-grow">
              {activeCasesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                  <span className="material-symbols-outlined text-slate-400 text-3xl mb-2">assignment_late</span>
                  <p className="text-xs font-bold text-slate-700">Sin requerimientos incluidos para evaluación</p>
                  <p className="text-[11px] text-slate-500 max-w-[280px] mt-1">
                    Abre el <strong className="text-violet-600 font-bold">Gestor de Casos</strong> arriba para seleccionar qué requerimientos del Sprint de {agent.name} deseas auditar.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowManager(true)}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 transition shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">tune</span>
                    Abrir Selección de Casos
                  </button>
                </div>
              ) : activeCasesList.map((c, cIdx) => {
                const caseId = String(c.id || c["ID"] || c["id"] || "");
                const caseEvaluation = evaluations[caseId] || {
                  sac: 12,
                  sla: 12,
                  evidence: 12,
                  closure: 12,
                  notes: '',
                  complexity: 'Media',
                  isAudited: true
                };

                const isExpanded = expandedCaseId === caseId;
                const sacScore = caseEvaluation.sac ?? 12;
                const slaScore = caseEvaluation.sla ?? 12;
                const evidenceScore = caseEvaluation.evidence ?? caseEvaluation.blockers ?? caseEvaluation.sync ?? 12;
                const closureScore = caseEvaluation.closure ?? 12;
                const totalCaseScore = sacScore + slaScore + evidenceScore + closureScore;

                const tId = c.ticketId || c["ID"] || c["ID Tarea"] || `REQ-${cIdx + 1}`;
                const tTitle = c.title || c["Subject"] || c["Asunto"] || "Sin Título";
                const tCategory = c.category || c["Request Type"] || c["Tipo"] || "Soporte Operativo";
                const tAccount = c.account || c["Account"] || c["Cuenta"] || "Cliente General";
                const tContact = c.contact || c["Contact"] || c["Contacto"] || "Usuario";

                return (
                  <div 
                    key={caseId} 
                    className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                      isExpanded 
                        ? 'border-violet-300 shadow-md bg-white' 
                        : 'border-slate-200 hover:border-slate-350 hover:shadow-sm bg-slate-50/30'
                    }`}
                  >
                    {/* Header Trigger */}
                    <button
                      type="button"
                      onClick={() => setExpandedCaseId(isExpanded ? '' : caseId)}
                      className="w-full p-4 flex items-center justify-between text-left focus:outline-none"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <span className="text-slate-400 font-mono text-xs shrink-0 font-bold">#0{cIdx + 1}</span>
                        <div className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded-lg border border-slate-200 shrink-0 uppercase tracking-wide">
                          {tId}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-xs truncate max-w-[280px] sm:max-w-[420px]">
                            {tTitle}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                            {tAccount} &bull; {tCategory}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        {/* Audit switch toggle */}
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCaseRating(caseId, 'isAudited', !caseEvaluation.isAudited);
                          }}
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[10px] font-extrabold cursor-pointer transition ${
                            caseEvaluation.isAudited 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : 'bg-slate-100 border-slate-200 text-slate-400'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[12px]">
                            {caseEvaluation.isAudited ? 'toggle_on' : 'toggle_off'}
                          </span>
                          <span>{caseEvaluation.isAudited ? 'Auditando' : 'Ignorar'}</span>
                        </div>

                        {/* Case Score Indicator */}
                        {caseEvaluation.isAudited ? (
                          <div className={`px-2 py-1 rounded-lg border text-[11px] font-black ${getScoreColor(totalCaseScore)}`}>
                            {totalCaseScore} pts
                          </div>
                        ) : (
                          <div className="px-2 py-1 rounded-lg border border-slate-200 bg-slate-100 text-slate-400 text-[11px] font-medium">
                            Omitido
                          </div>
                        )}

                        <span className={`material-symbols-outlined text-slate-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-violet-600' : ''
                        }`}>
                          expand_more
                        </span>
                      </div>
                    </button>

                    {/* Expandable Body */}
                    {isExpanded && (
                      <div className="p-5 border-t border-slate-100 bg-slate-50/30">
                        
                        {/* Case Info block */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-150 mb-5 text-[10.5px] text-slate-600">
                          <div>
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider">Contacto / Cliente:</span>
                            <span className="font-bold text-slate-800">{tContact}</span> ({tAccount})
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider">Categoría de Servicio:</span>
                            <span className="font-bold text-slate-800">{tCategory}</span>
                          </div>
                          <div className="flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] text-slate-400 font-extrabold uppercase block tracking-wider">Complejidad:</span>
                              <select
                                value={caseEvaluation.complexity}
                                onChange={(e) => updateCaseRating(caseId, 'complexity', e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-slate-700 text-[10px] focus:ring-1 focus:ring-violet-500"
                              >
                                <option value="Baja">Complejidad Baja</option>
                                <option value="Media">Complejidad Media</option>
                                <option value="Alta">Complejidad Alta</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Axis ratings grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* 1. Estructura S-A-C */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-indigo-500">playlist_add_check</span>
                                Estructura S-A-C
                              </span>
                              <span className="text-[10px] font-black text-slate-400">{sacScore} pt</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { pts: 0, label: 'Crítico (0)', tooltip: 'No sigue estructura SAC (Ausente/Escueto)' },
                                { pts: 12, label: 'Parcial (12)', tooltip: 'Documentación incompleta o desordenada' },
                                { pts: 25, label: 'Excelente (25)', tooltip: 'Suceso, Acción y Conclusión perfectos' }
                              ].map(lvl => (
                                <button
                                  key={lvl.pts}
                                  type="button"
                                  onClick={() => updateCaseAxisScore(caseId, 'sac', lvl.pts)}
                                  className={`py-1.5 px-1 rounded-lg border text-center transition text-[9.5px] ${
                                    sacScore === lvl.pts
                                      ? 'bg-indigo-600 border-indigo-600 text-white font-black'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title={lvl.tooltip}
                                >
                                  {lvl.label}
                                </button>
                              ))}
                            </div>
                            <span className="text-[8px] text-slate-400 block mt-1">Estructuración clara: Suceso → Acción → Conclusión.</span>
                          </div>

                          {/* 2. Control de SLA / ETA */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-orange-500">alarm_on</span>
                                Control de SLA / ETA
                              </span>
                              <span className="text-[10px] font-black text-slate-400">{slaScore} pt</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { pts: 0, label: 'Crítico (0)', tooltip: 'No alerta desviaciones o excede SLA silencioso' },
                                { pts: 12, label: 'Parcial (12)', tooltip: 'Alerta sobre el límite o sin plan alterno' },
                                { pts: 25, label: 'Excelente (25)', tooltip: 'Manejo impecable de expectativas de entrega' }
                              ].map(lvl => (
                                <button
                                  key={lvl.pts}
                                  type="button"
                                  onClick={() => updateCaseAxisScore(caseId, 'sla', lvl.pts)}
                                  className={`py-1.5 px-1 rounded-lg border text-center transition text-[9.5px] ${
                                    slaScore === lvl.pts
                                      ? 'bg-orange-600 border-orange-600 text-white font-black'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title={lvl.tooltip}
                                >
                                  {lvl.label}
                                </button>
                              ))}
                            </div>
                            <span className="text-[8px] text-slate-400 block mt-1">Manejo de expectativas de entrega con el cliente.</span>
                          </div>

                          {/* 3. Diagnóstico & Evidencias (Universal) */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-amber-500">attachment</span>
                                Diagnóstico & Evidencias
                              </span>
                              <span className="text-[10px] font-black text-slate-400">{evidenceScore} pt</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { pts: 0, label: 'Crítico (0)', tooltip: 'Sin evidencias, capturas, logs ni justificación técnica' },
                                { pts: 12, label: 'Parcial (12)', tooltip: 'Evidencias o bitácora incompleta para validar el descarte' },
                                { pts: 25, label: 'Excelente (25)', tooltip: 'Diagnóstico riguroso con capturas, pruebas o adjuntos claros' }
                              ].map(lvl => (
                                <button
                                  key={lvl.pts}
                                  type="button"
                                  onClick={() => updateCaseAxisScore(caseId, 'evidence', lvl.pts)}
                                  className={`py-1.5 px-1 rounded-lg border text-center transition text-[9.5px] ${
                                    evidenceScore === lvl.pts
                                      ? 'bg-amber-600 border-amber-600 text-white font-black'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title={lvl.tooltip}
                                >
                                  {lvl.label}
                                </button>
                              ))}
                            </div>
                            <span className="text-[8px] text-slate-400 block mt-1">Capturas, bitácora de descarte o adjuntos técnicos de respaldo.</span>
                          </div>

                          {/* 4. Cierre & Notificación CRM */}
                          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-emerald-500">verified</span>
                                Cierre & Notificación CRM
                              </span>
                              <span className="text-[10px] font-black text-slate-400">{closureScore} pt</span>
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              {[
                                { pts: 0, label: 'Crítico (0)', tooltip: 'Cierre mecánico sin validación ni aviso al cliente' },
                                { pts: 12, label: 'Parcial (12)', tooltip: 'Cierre básico con notificación escueta' },
                                { pts: 25, label: 'Excelente (25)', tooltip: 'Verificación de solución, notificación y cierre definitivo' }
                              ].map(lvl => (
                                <button
                                  key={lvl.pts}
                                  type="button"
                                  onClick={() => updateCaseAxisScore(caseId, 'closure', lvl.pts)}
                                  className={`py-1.5 px-1 rounded-lg border text-center transition text-[9.5px] ${
                                    closureScore === lvl.pts
                                      ? 'bg-emerald-600 border-emerald-600 text-white font-black'
                                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                  }`}
                                  title={lvl.tooltip}
                                >
                                  {lvl.label}
                                </button>
                              ))}
                            </div>
                            <span className="text-[8px] text-slate-400 block mt-1">Verificación de solución, comunicación final y cierre limpio en CRM.</span>
                          </div>

                        </div>

                        {/* Qualitative Notes on Case */}
                        <div className="mt-4">
                          <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                            Comentarios Específicos del Caso:
                          </label>
                          <textarea
                            value={caseEvaluation.notes}
                            onChange={(e) => updateCaseRating(caseId, 'notes', e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 bg-white placeholder-slate-400 resize-none h-16"
                            placeholder="Anote observaciones o deficiencias encontradas sobre este ticket específico..."
                          />
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* General Trazability evidence box */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                Conclusiones de Trazabilidad y Documentación CRM (Criterio General)
              </label>
              <textarea
                value={trazEvidence}
                onChange={(e) => {
                  setTrazEvidence(e.target.value);
                  onEvidenceChange('traz', e.target.value);
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 bg-slate-50 placeholder-slate-400 min-h-[90px]"
                placeholder="Escriba el feedback consolidado sobre el estándar S-A-C, calidad de evidencias y registro en CRM..."
              />
              <span className="text-[9.5px] text-slate-400 italic mt-1 block">
                * Este texto se guardará de forma automática en el reporte de la evaluación.
              </span>
            </div>

          </div>
        </div>

        {/* ==================== RIGHT COLUMN: GESTIÓN DE CARGA Y CUMPLIMIENTO (col-span-5) ==================== */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          
          {/* A. GESTIÓN DE CARGA, ASIGNACIONES Y CUMPLIMIENTO */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-5">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                    <span className="material-symbols-outlined text-slate-500">pending_actions</span>
                    2. Gestión de Carga, Asignaciones y Cumplimiento
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Evaluación del volumen de asignaciones, coherencia de estimaciones, bitácora diaria y seguimiento activo.</p>
                </div>
                <div className="bg-violet-50 border border-violet-100 px-3 py-1 rounded-xl text-center shrink-0">
                  <span className="text-[9px] text-violet-650 font-black uppercase block tracking-wider leading-none">SCORE CARGA</span>
                  <span className="text-lg font-black text-violet-700">{cargaScore} / 100</span>
                </div>
              </div>

              {/* Calibration criteria factors */}
              <div className="space-y-4">
                
                {/* 1. Manejo de Carga & Asignaciones */}
                <div className="space-y-1.5 pb-3 border-b border-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-[11.5px] font-extrabold text-slate-800">Manejo de Carga & Asignaciones</h5>
                      <p className="text-[9.5px] text-slate-450 leading-snug">¿Mantiene un avance constante y ordenado del volumen de requerimientos asignados en el Sprint?</p>
                    </div>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md">
                      {cargaCalib.volumeAssignments ?? cargaCalib.yesterdayVeracity ?? 25} pt
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { pts: 0, label: 'Bajo (0)', tooltip: 'Desorganización o acumulación injustificada de tickets asignados' },
                      { pts: 12, label: 'Parcial (12)', tooltip: 'Atiende la carga asignada pero con ligeros retrasos o acumulación' },
                      { pts: 25, label: 'Óptimo (25)', tooltip: 'Manejo ordenado y fluido de la totalidad de su carga de trabajo' }
                    ].map(lvl => {
                      const curVal = cargaCalib.volumeAssignments ?? cargaCalib.yesterdayVeracity ?? 25;
                      return (
                        <button
                          key={lvl.pts}
                          type="button"
                          onClick={() => handleUpdateCargaRating('volumeAssignments', lvl.pts)}
                          className={`py-1.5 px-1 rounded-lg border text-center transition text-[10px] ${
                            curVal === lvl.pts
                              ? 'bg-violet-600 border-violet-600 text-white font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title={lvl.tooltip}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Coherencia de Tiempos (ETA vs Real) */}
                <div className="space-y-1.5 pb-3 border-b border-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-[11.5px] font-extrabold text-slate-800">Coherencia de Tiempos (ETA vs Ejecución)</h5>
                      <p className="text-[9.5px] text-slate-450 leading-snug">¿Existe congruencia entre el tiempo estimado (ETA/ATS) y el tiempo realmente dedicado a la solución?</p>
                    </div>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md">
                      {cargaCalib.etaCoherence ?? cargaCalib.todayPlanning ?? 12} pt
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { pts: 0, label: 'Desviado (0)', tooltip: 'Desvíos constantes de tiempo sin justificación ni comunicación oportuna' },
                      { pts: 12, label: 'Aceptable (12)', tooltip: 'Cumple tiempos en la mayoría de casos con desvíos menores justificados' },
                      { pts: 25, label: 'Preciso (25)', tooltip: 'Estimaciones realistas y alta puntualidad en compromisos de entrega' }
                    ].map(lvl => {
                      const curVal = cargaCalib.etaCoherence ?? cargaCalib.todayPlanning ?? 12;
                      return (
                        <button
                          key={lvl.pts}
                          type="button"
                          onClick={() => handleUpdateCargaRating('etaCoherence', lvl.pts)}
                          className={`py-1.5 px-1 rounded-lg border text-center transition text-[10px] ${
                            curVal === lvl.pts
                              ? 'bg-violet-600 border-violet-600 text-white font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title={lvl.tooltip}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Disciplina de Bitácora & Registro Diario */}
                <div className="space-y-1.5 pb-3 border-b border-slate-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-[11.5px] font-extrabold text-slate-800">Disciplina de Bitácora & Registro Diario</h5>
                      <p className="text-[9.5px] text-slate-450 leading-snug">¿Mantiene actualizada la bitácora del CRM reflejando con transparencia el avance real de sus casos?</p>
                    </div>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md">
                      {cargaCalib.dailyLog ?? cargaCalib.blockersFup ?? 25} pt
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { pts: 0, label: 'Inconsistente (0)', tooltip: 'Sin actualizaciones diarias ni registro claro del trabajo realizado' },
                      { pts: 12, label: 'Parcial (12)', tooltip: 'Registra avances periódicos aunque con variaciones en el nivel de detalle' },
                      { pts: 25, label: 'Consistente (25)', tooltip: 'Bitácora diaria completa, clara y transparente sobre el estado de sus casos' }
                    ].map(lvl => {
                      const curVal = cargaCalib.dailyLog ?? cargaCalib.blockersFup ?? 25;
                      return (
                        <button
                          key={lvl.pts}
                          type="button"
                          onClick={() => handleUpdateCargaRating('dailyLog', lvl.pts)}
                          className={`py-1.5 px-1 rounded-lg border text-center transition text-[10px] ${
                            curVal === lvl.pts
                              ? 'bg-violet-600 border-violet-600 text-white font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title={lvl.tooltip}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Proactividad & Seguimiento (FUP) General */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h5 className="text-[11.5px] font-extrabold text-slate-800">Proactividad & Seguimiento (FUP) General</h5>
                      <p className="text-[9.5px] text-slate-450 leading-snug">¿Mantiene un seguimiento activo de sus requerimientos impulsando su resolución frente a clientes y equipo?</p>
                    </div>
                    <span className="text-[10px] font-black bg-slate-100 text-slate-650 px-2 py-0.5 rounded-md">
                      {cargaCalib.fupProactivity ?? cargaCalib.etaCommitment ?? 12} pt
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { pts: 0, label: 'Pasivo (0)', tooltip: 'Actitud pasiva sin dar seguimiento a casos ni requerir información de avance' },
                      { pts: 12, label: 'Informa (12)', tooltip: 'Realiza seguimientos estándar (FUP) y notifica el estado de los requerimientos' },
                      { pts: 25, label: 'Resolutivo (25)', tooltip: 'Proactivo en empujar casos, gestionar dependencias e informar al cliente' }
                    ].map(lvl => {
                      const curVal = cargaCalib.fupProactivity ?? cargaCalib.etaCommitment ?? 12;
                      return (
                        <button
                          key={lvl.pts}
                          type="button"
                          onClick={() => handleUpdateCargaRating('fupProactivity', lvl.pts)}
                          className={`py-1.5 px-1 rounded-lg border text-center transition text-[10px] ${
                            curVal === lvl.pts
                              ? 'bg-violet-600 border-violet-600 text-white font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                          title={lvl.tooltip}
                        >
                          {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>

            {/* Evidence for Carga & Tiempos */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <label className="block text-[11px] font-extrabold text-slate-600 uppercase tracking-wider mb-2">
                Evidencia de Carga Operativa y Gestión de Tiempos
              </label>
              <textarea
                value={cargaEvidence}
                onChange={(e) => {
                  setCargaEvidence(e.target.value);
                  onEvidenceChange('carga', e.target.value);
                }}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-1 focus:ring-violet-500 bg-slate-50 placeholder-slate-400 min-h-[90px]"
                placeholder="Notas sobre volumen de requerimientos, cumplimiento de ETA, proactividad en el seguimiento (FUP) y disciplina de bitácora..."
              />
            </div>
          </div>

          {/* B. HISTORIC SCRUM LOGS PERMANENT BOX */}
          <div className="bg-slate-900 border border-slate-950 text-slate-100 rounded-2xl p-5 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block"></span>
              </div>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase ml-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-xs">terminal</span>
                Bitácora y Trazabilidad Diaria - {agent.initials || agent.name.slice(0, 3).toUpperCase()}
              </span>
            </div>

            {agent.scrumLogs && agent.scrumLogs.length > 0 ? (
              <div className="space-y-4 font-mono text-[10.5px]">
                {agent.scrumLogs.slice(0, 3).map((log, logIdx) => (
                  <div key={log.ticketId || logIdx} className="bg-slate-950/80 p-3 rounded-lg border border-slate-850">
                    <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-slate-850/60 pb-1.5 mb-2">
                      <span>📌 TICKET: {log.ticketId}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[8px] uppercase tracking-widest ${
                        log.status === 'done' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-slate-300">
                      <p><strong className="text-slate-500 text-[10px]">AYER:</strong> {log.yesterday}</p>
                      <p><strong className="text-slate-500 text-[10px]">HOY:</strong> {log.today}</p>
                      {log.blockers && (
                        <p className="text-rose-400">
                          <strong className="text-rose-500 text-[10px]">BLOQUEOS:</strong> {log.blockers}
                        </p>
                      )}
                    </div>
                    <div className="text-right text-[8px] text-slate-500 mt-2">
                      Sincronizado: {log.lastUpdated ? new Date(log.lastUpdated).toLocaleDateString() : 'Turno actual'}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 italic font-mono text-xs">
                No hay logs activos cargados en la bitácora del agente para este sprint.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
