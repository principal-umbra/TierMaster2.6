import React, { useMemo, useState, useEffect } from 'react';
import { Agent } from '../../../types';
import { CRITERIA } from './constants';

interface CollaborativeCriterionProps {
  agent: Agent;
  globalScore: number;
  subScores: Record<string, number>;
  onSubScoreChange: (subId: string, val: number) => void;
  onEvidenceChange: (subId: string, text: string) => void;
}

const RUBRICS: Record<string, { title: string; desc: string; prompts: string[]; levels: { pts: number; label: string; desc: string }[] }> = {
  comm: {
    title: "Comunicación Interna",
    desc: "Clara y profesional con el equipo",
    prompts: ["¿Transmite información de forma clara y sin ambigüedades?", "¿Utiliza los canales adecuados para cada situación?", "¿Es oportuno en sus actualizaciones?"],
    levels: [
      { pts: 40, label: "Reactiva", desc: "Comunica solo cuando se exige. Ocasionalmente carece de tacto." },
      { pts: 65, label: "Básica", desc: "Comunica lo necesario pero falta proactividad o claridad plena." },
      { pts: 85, label: "Efectiva", desc: "Mantiene al equipo informado de manera clara, proactiva y oportuna." },
      { pts: 100, label: "Ejemplar", desc: "Excelente articulación. Anticipa necesidades de información del equipo." }
    ]
  },
  collab: {
    title: "Escucha Activa y Colaboración",
    desc: "Recibe feedback y apoya al equipo",
    prompts: ["¿Demuestra apertura al recibir retroalimentación?", "¿Busca formas de ayudar a sus compañeros?", "¿Fomenta un ambiente colaborativo?"],
    levels: [
      { pts: 40, label: "Aislado", desc: "Se resiste al feedback o prefiere trabajar strictly en silos." },
      { pts: 65, label: "Receptivo", desc: "Acepta feedback pero rara vez ofrece apoyo a otros compañeros." },
      { pts: 85, label: "Colaborativo", desc: "Participa activamente, aplica feedback y apoya cuando se le pide." },
      { pts: 100, label: "Sinergista", desc: "Busca feedback constantemente y eleva activamente el nivel del equipo." }
    ]
  },
  crit: {
    title: "Pensamiento Crítico y Urgencia",
    desc: "Toma de decisiones con criterio",
    prompts: ["¿Identifica correctamente qué situaciones son críticas?", "¿Propone soluciones antes de escalar?", "¿Analiza el impacto de sus decisiones?"],
    levels: [
      { pts: 40, label: "Dependiente", desc: "Requiere instrucciones constantes, dificultad para priorizar urgencias." },
      { pts: 65, label: "En Desarrollo", desc: "Resuelve problemas básicos, pero duda o escala situaciones ambiguas." },
      { pts: 85, label: "Resolutivo", desc: "Toma buenas decisiones autónomas y entiende qué es realmente urgente." },
      { pts: 100, label: "Estratégico", desc: "Anticipa bloqueos, gestiona crisis con calma y propone mejoras." }
    ]
  },
  resp: {
    title: "Responsabilidad y Consistencia",
    desc: "Cumple lo asumido y es confiable",
    prompts: ["¿Asume la propiedad de sus tareas?", "¿Entrega los resultados en los plazos acordados?", "¿Cómo reacciona ante errores?"],
    levels: [
      { pts: 40, label: "Inconsistente", desc: "Frecuentes incumplimientos de compromisos, requiere supervisión." },
      { pts: 65, label: "Variable", desc: "Cumple la mayoría de las veces, pero requiere algo de seguimiento." },
      { pts: 85, label: "Confiable", desc: "Entrega constante, asume sus errores con madurez y cumple promesas." },
      { pts: 100, label: "Garante", desc: "Asume total propiedad de sus resultados. Es un pilar de confianza." }
    ]
  },
  disc: {
    title: "Horario y Disciplina Operativa",
    desc: "Cumple su jornada y administra su tiempo",
    prompts: ["¿Mantiene un horario constante y predecible?", "¿Gestiona sus pausas de forma transparente?", "¿Es disponible durante su jornada?"],
    levels: [
      { pts: 40, label: "Irregular", desc: "Tardanzas frecuentes, pausas extendidas no autorizadas." },
      { pts: 65, label: "Adecuado", desc: "Cumple el horario estándar, manejo básico de pausas." },
      { pts: 85, label: "Disciplinado", desc: "Puntualidad constante, excelente y transparente gestión de sus pausas." },
      { pts: 100, label: "Referente", desc: "Optimiza su tiempo al máximo, disponibilidad intachable en su turno." }
    ]
  }
};

const CULTURE_VALUES = [
  { id: 'proact', label: 'Proactividad e Iniciativa', desc: 'Anticipación a problemas, iniciativa para tomar tareas complejas y proponer soluciones.' },
  { id: 'noblame', label: 'Cultura sin Culpa (No-Blame)', desc: 'Asume errores con madurez, comparte lecciones aprendidas y orienta esfuerzos a resolver.' },
  { id: 'mentoria', label: 'Mentoría y Apoyo a Pares', desc: 'Guía activa a compañeros, resolución de dudas técnicas y aportes valiosos a los foros.' },
  { id: 'ownership', label: 'Sentido de Propiedad (Ownership)', desc: 'Responsabilidad total sobre el ciclo de vida de los casos asignados y la satisfacción final.' }
];

const POSITIVE_INCIDENTS = [
  { id: 'inc_high_res', label: 'Resolución autónoma de incidente crítico', pts: 10, desc: 'Resolvió de forma independiente un evento de alta prioridad sin requerir escalamiento.' },
  { id: 'inc_kb_doc', label: 'Iniciativa para documentar soluciones', pts: 10, desc: 'Creó y compartió documentación de troubleshooting de gran valor para el equipo.' },
  { id: 'inc_guard_support', label: 'Apoyo excepcional en guardias', pts: 10, desc: 'Apoyó voluntariamente a compañeros fuera de su turno regular o durante picos de carga.' }
];

const NEGATIVE_INCIDENTS = [
  { id: 'inc_late_report', label: 'Falta de reporte de ausencia/retraso', pts: 15, desc: 'No reportó oportunamente una inasistencia o demora de conexión en los canales acordados.' },
  { id: 'inc_pause_breach', label: 'Desviación en pautas de pausa/conexión', pts: 15, desc: 'Incumplió repetidamente el cronograma de conexión o extendió sus pausas sin justificación.' },
  { id: 'inc_harsh_comm', label: 'Tono inapropiado en comunicación', pts: 15, desc: 'Utilizó un tono imperativo, agresivo o poco colaborador en chats internos.' }
];

const LEADERSHIP_COMPETENCIES = [
  { id: 'stress', label: 'Autorregulación y Control de Estrés', desc: 'Mantiene la calma y racionalidad ante picos de tickets críticos o clientes complejos.' },
  { id: 'negotiation', label: 'Negociación y Consenso', desc: 'Resuelve diferencias técnicas o procedimentales en el equipo de forma diplomática.' },
  { id: 'empathy', label: 'Empatía y Calidez Situacional', desc: 'Entiende las necesidades emocionales y de soporte de compañeros y usuarios finales.' },
  { id: 'autonomy', label: 'Autogestión y Proactividad Técnica', desc: 'Opera con alta autonomía en toma de deisiones críticas sin supervisión constante.' }
];

const LEADERSHIP_LEVELS = [
  { pts: 10, label: 'Inicial', desc: 'Nivel básico, requiere guía.' },
  { pts: 15, label: 'Sólido', desc: 'Consistente y maduro.' },
  { pts: 20, label: 'Líder', desc: 'Supera expectativas, es ejemplo.' }
];

const PDI_COMMITMENTS = [
  { id: 'pdi_coviewing', label: 'Co-viewing Colaborativo', desc: 'Participar activamente en calibraciones técnicas semanales.', pts: 5 },
  { id: 'pdi_techtalk', label: 'Tech Talk Especializado', desc: 'Dictar una sesión interna de capacitación sobre troubleshooting.', pts: 5 },
  { id: 'pdi_onboarding', label: 'Mentor de Onboarding', desc: 'Apadrinar a un agente de nuevo ingreso durante su primer sprint.', pts: 5 },
  { id: 'pdi_kb_doc', label: 'Redacción de KB Avanzada', desc: 'Escribir y estructurar guías de descarte en la KB interna.', pts: 5 }
];

interface RubricType {
  title: string;
  desc: string;
  prompts: string[];
  levels: { pts: number; label: string; desc: string }[];
}

function AssessmentStep({ subId, rubric, score, onScoreChange, onEvidenceChange, evidenceText, className = '' }: { 
  key?: string,
  subId: string, 
  rubric: RubricType, 
  score: number, 
  onScoreChange: (val: number) => void,
  onEvidenceChange: (text: string) => void,
  evidenceText: string,
  className?: string
}) {
  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-200 shadow-sm ${className}`}>
      <div className="mb-4">
        <h4 className="font-bold text-slate-800 text-base">{rubric.title}</h4>
        <p className="text-xs text-slate-500 font-medium">{rubric.desc}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1">
        <div className="flex flex-col h-full">
          <div className="bg-slate-50 p-4 rounded-xl mb-4">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Guía de Reflexión</h5>
            <ul className="text-[11px] text-slate-650 list-disc pl-4 space-y-1 leading-relaxed">
              {rubric.prompts.map((p, i) => <li key={i}>{p}</li>)}
            </ul>
          </div>
          <textarea
            className="w-full text-xs p-3 rounded-lg border border-slate-200 focus:ring-1 focus:ring-orange-500 flex-1 min-h-[100px] resize-none"
            placeholder="Documenta la evidencia (Método STAR)..."
            value={evidenceText}
            onChange={(e) => onEvidenceChange(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2.5 h-full justify-start">
          {rubric.levels.map((level, idx) => {
            let isActive = false;
            if (idx === 0 && score < 50) isActive = true;
            if (idx === 1 && score >= 50 && score < 75) isActive = true;
            if (idx === 2 && score >= 75 && score < 92) isActive = true;
            if (idx === 3 && score >= 92) isActive = true;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onScoreChange(level.pts)}
                className={`flex text-left p-3 rounded-xl border transition-all ${
                  isActive 
                    ? 'border-orange-500 bg-orange-50/70 shadow-sm ring-1 ring-orange-500/10' 
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className={`font-black text-sm mr-3 mt-0.5 min-w-[20px] text-center ${isActive ? 'text-orange-600' : 'text-slate-400'}`}>
                  {level.pts}
                </span>
                <div>
                  <div className={`font-bold text-xs ${isActive ? 'text-orange-850' : 'text-slate-700'}`}>{level.label}</div>
                  <div className="text-[10.5px] text-slate-500 leading-snug mt-0.5">{level.desc}</div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function CollaborativeCriterion({ agent, globalScore, subScores, onSubScoreChange, onEvidenceChange }: CollaborativeCriterionProps) {
  const criterion = CRITERIA.find(c => c.key === 'collaborative')!;

  // 1. Local Storage State Management for cultural alignment and critical incidents (Standard = 20 pts per axis -> 80% total)
  const [cultureValues, setCultureValues] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`eval_values_${agent.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { proact: 20, noblame: 20, mentoria: 20, ownership: 20 };
  });

  const [activeIncidents, setActiveIncidents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`eval_incidents_${agent.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // 2. Local Storage State Management for Emotional Intelligence and Situational Leadership (Standard = 20 pts per axis -> 80% total)
  const [leadershipComp, setLeadershipComp] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`eval_leadership_${agent.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return { stress: 20, negotiation: 20, empathy: 20, autonomy: 20 };
  });

  const [selectedPdi, setSelectedPdi] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`eval_pdi_${agent.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  // Calculate behavior score (Índice CAO)
  const behaviorScore = useMemo(() => {
    const baseSum = (Object.values(cultureValues) as number[]).reduce((sum: number, val: number) => sum + val, 0);
    const posCount = activeIncidents.filter(id => POSITIVE_INCIDENTS.some(i => i.id === id)).length;
    const negCount = activeIncidents.filter(id => NEGATIVE_INCIDENTS.some(i => i.id === id)).length;
    
    const finalVal = baseSum + (posCount * 10) - (negCount * 15);
    return Math.max(0, Math.min(100, finalVal));
  }, [cultureValues, activeIncidents]);

  // Calculate leadership score (Índice IELS)
  const leadershipScore = useMemo(() => {
    const baseSum = (Object.values(leadershipComp) as number[]).reduce((sum: number, val: number) => sum + val, 0);
    const pdiSum = selectedPdi.length * 5;
    return Math.max(0, Math.min(100, baseSum + pdiSum));
  }, [leadershipComp, selectedPdi]);

  // Persist local states and update the main subscores inside the parent
  useEffect(() => {
    localStorage.setItem(`eval_values_${agent.id}`, JSON.stringify(cultureValues));
  }, [cultureValues, agent.id]);

  useEffect(() => {
    localStorage.setItem(`eval_incidents_${agent.id}`, JSON.stringify(activeIncidents));
  }, [activeIncidents, agent.id]);

  useEffect(() => {
    localStorage.setItem(`eval_leadership_${agent.id}`, JSON.stringify(leadershipComp));
  }, [leadershipComp, agent.id]);

  useEffect(() => {
    localStorage.setItem(`eval_pdi_${agent.id}`, JSON.stringify(selectedPdi));
  }, [selectedPdi, agent.id]);

  useEffect(() => {
    if (subScores.operat_align !== behaviorScore) {
      onSubScoreChange('operat_align', behaviorScore);
    }
  }, [behaviorScore, onSubScoreChange, subScores.operat_align]);

  useEffect(() => {
    if (subScores.soft_maturity !== leadershipScore) {
      onSubScoreChange('soft_maturity', leadershipScore);
    }
  }, [leadershipScore, onSubScoreChange, subScores.soft_maturity]);

  const handleValueChange = (valId: string, pts: number) => {
    setCultureValues(prev => ({ ...prev, [valId]: pts }));
  };

  const handleIncidentToggle = (incId: string) => {
    setActiveIncidents(prev => 
      prev.includes(incId) ? prev.filter(id => id !== incId) : [...prev, incId]
    );
  };

  const handleLeadershipChange = (compId: string, pts: number) => {
    setLeadershipComp(prev => ({ ...prev, [compId]: pts }));
  };

  const handlePdiToggle = (pdiId: string) => {
    setSelectedPdi(prev => 
      prev.includes(pdiId) ? prev.filter(id => id !== pdiId) : [...prev, pdiId]
    );
  };

  // Compute Left side average (5 rubrics)
  const leftRubrics = ['comm', 'collab', 'crit', 'resp', 'disc'];
  const leftAvg = useMemo(() => {
    let sum = 0;
    let count = 0;
    leftRubrics.forEach(key => {
      if (subScores[key] !== undefined) {
        sum += subScores[key];
        count++;
      }
    });
    return count > 0 ? Math.round(sum / count) : 0;
  }, [subScores]);

  return (
    <div className="p-6 lg:p-10 bg-slate-50/50 min-h-screen">
      {/* Title Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 ${criterion.bg} text-white rounded-xl flex items-center justify-center shadow-md shrink-0`}>
            <span className="material-symbols-outlined text-3xl">{criterion.icon}</span>
          </div>
          <div>
            <h1 className="font-display font-extrabold text-2xl text-slate-900">Evaluación de Habilidades Blandas</h1>
            <p className="text-xs text-slate-500 mt-0.5">Control holístico de cumplimiento de conducta, alineación de valores y registros críticos.</p>
          </div>
        </div>

        {/* Dynamic Metric Scoreboard */}
        <div className="flex flex-wrap items-center gap-4 md:gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">1. Rúbricas (Promedio)</span>
            <span className="text-xl font-bold text-slate-700">{leftAvg} pts</span>
          </div>
          <div className="text-right pl-0 md:pl-6 pt-2 md:pt-0">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">2. Índice CAO (Conducta)</span>
            <span className="text-xl font-bold text-slate-700">{behaviorScore} pts</span>
          </div>
          <div className="text-right pl-0 md:pl-6 pt-2 md:pt-0">
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">3. Índice IELS (Maturidad)</span>
            <span className="text-xl font-bold text-slate-700">{leadershipScore} pts</span>
          </div>
          <div className="text-right pl-0 md:pl-6 pt-2 md:pt-0 bg-orange-50/40 px-4 py-2 rounded-xl border border-orange-100/50">
            <span className="text-[9px] text-orange-600 font-bold uppercase tracking-wider block">Puntaje Final KPI</span>
            <span className={`text-2xl font-black ${criterion.color}`}>{globalScore}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
        {/* Left Column: Standard Rubrics (xl:col-span-7) */}
        <div className="xl:col-span-7 flex flex-col gap-6">
          <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
            <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-500">assignment_turned_in</span>
              1. Rúbricas de Cumplimiento Conductual (Left Panel)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Evaluación sistemática orientada a la consistencia, presencia y disciplina del soporte.
            </p>
          </div>

          {Object.entries(RUBRICS).map(([subId, rubric], index, array) => (
            <AssessmentStep
              key={subId}
              subId={subId}
              rubric={rubric}
              score={subScores[subId] || 0}
              onScoreChange={(val) => onSubScoreChange(subId, val)}
              onEvidenceChange={(text) => onEvidenceChange(subId, text)}
              evidenceText={agent.evidence?.find(e => e.subId === subId)?.text || ''}
              className={index === array.length - 1 ? 'flex-1 flex flex-col' : ''}
            />
          ))}
        </div>

        {/* Right Column: Cultural Calibration Board & emotional intelligence (xl:col-span-5) */}
        <div className="xl:col-span-5 flex flex-col gap-6">
          {/* Component 2: Cultural Calibration Board */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500">verified_user</span>
                  2. Calibración de Valores e Incidentes
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Índice de Conducta y Alineación Operativa (CAO)</p>
              </div>
              <div className="bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-xl text-center shrink-0">
                <span className="text-[10px] text-orange-600 font-extrabold uppercase block tracking-widest">ÍNDICE CAO</span>
                <span className="text-xl font-black text-orange-700">{behaviorScore} / 100</span>
              </div>
            </div>

            {/* Part A: Values Alignment Rating */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-sm text-orange-500">diversity_3</span>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Alineación de Valores Culturales</h4>
              </div>

              {CULTURE_VALUES.map((value) => {
                const currentVal = cultureValues[value.id] || 0;
                return (
                  <div key={value.id} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">{value.label}</h5>
                        <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">{value.desc}</p>
                      </div>
                      <span className="text-[11px] font-black bg-slate-50 text-slate-700 border border-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        {currentVal} pt
                      </span>
                    </div>

                    {/* Segmented rating options (0, 10, 15, 20, 25) */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[0, 10, 15, 20, 25].map((pts) => {
                        const isSelected = currentVal === pts;
                        let ptsLabel = "Cumple";
                        if (pts === 0) ptsLabel = "Deficiente";
                        if (pts === 10) ptsLabel = "Inicial";
                        if (pts === 15) ptsLabel = "Sólido";
                        if (pts === 20) ptsLabel = "Destacado";
                        if (pts === 25) ptsLabel = "Excelente";

                        return (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => handleValueChange(value.id, pts)}
                            className={`py-1.5 px-1 rounded-lg border text-center transition-all ${
                              isSelected
                                ? 'bg-orange-500 border-orange-500 text-white font-black shadow-sm shadow-orange-500/20'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <div className="text-xs">{pts}</div>
                            <div className={`text-[8px] uppercase tracking-wider opacity-80 font-medium ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                              {ptsLabel}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Part B: Operational Incident Log */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-sm text-orange-500">campaign</span>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Bitácora de Incidentes del Sprint</h4>
              </div>

              {/* Positive Incidents */}
              <div className="space-y-2">
                <div className="text-[9px] font-bold uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">add_circle</span> Impactos Positivos (+10 pts)
                </div>
                <div className="space-y-2">
                  {POSITIVE_INCIDENTS.map((inc) => {
                    const isActive = activeIncidents.includes(inc.id);
                    return (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => handleIncidentToggle(inc.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                          isActive
                            ? 'bg-emerald-50 border-emerald-500 shadow-sm shadow-emerald-500/5'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-lg shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-300'}`}>
                          {isActive ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <div>
                          <div className={`text-xs font-bold ${isActive ? 'text-emerald-950' : 'text-slate-700'}`}>{inc.label}</div>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{inc.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Negative Incidents */}
              <div className="space-y-2 pt-2">
                <div className="text-[9px] font-bold uppercase text-rose-600 tracking-wider flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">remove_circle</span> Desviaciones Operativas (-15 pts)
                </div>
                <div className="space-y-2">
                  {NEGATIVE_INCIDENTS.map((inc) => {
                    const isActive = activeIncidents.includes(inc.id);
                    return (
                      <button
                        key={inc.id}
                        type="button"
                        onClick={() => handleIncidentToggle(inc.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                          isActive
                            ? 'bg-rose-50 border-rose-500 shadow-sm shadow-rose-500/5'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                        }`}
                      >
                        <span className={`material-symbols-outlined text-lg shrink-0 ${isActive ? 'text-rose-600' : 'text-slate-300'}`}>
                          {isActive ? 'check_box' : 'check_box_outline_blank'}
                        </span>
                        <div>
                          <div className={`text-xs font-bold ${isActive ? 'text-rose-950' : 'text-slate-700'}`}>{inc.label}</div>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{inc.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Component 3: Emotional Intelligence and Situational Leadership (fills the remaining height) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-slate-500">psychology</span>
                  3. Inteligencia Emocional y Liderazgo
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Índice de Inteligencia Emocional y Liderazgo Situacional (IELS)</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl text-center shrink-0">
                <span className="text-[10px] text-indigo-600 font-extrabold uppercase block tracking-widest">ÍNDICE IELS</span>
                <span className="text-xl font-black text-indigo-700">{leadershipScore} / 100</span>
              </div>
            </div>

            {/* Part A: Leadership Competencies Evaluation */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-sm text-indigo-500">military_tech</span>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Competencias de Liderazgo Situacional</h4>
              </div>

              {LEADERSHIP_COMPETENCIES.map((comp) => {
                const currentVal = leadershipComp[comp.id] || 15;
                return (
                  <div key={comp.id} className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">{comp.label}</h5>
                        <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">{comp.desc}</p>
                      </div>
                      <span className="text-[11px] font-black bg-slate-50 text-slate-700 border border-slate-100 px-2 py-0.5 rounded-md shrink-0">
                        {currentVal} pt
                      </span>
                    </div>

                    {/* Segmented levels options */}
                    <div className="grid grid-cols-3 gap-2">
                      {LEADERSHIP_LEVELS.map((lvl) => {
                        const isSelected = currentVal === lvl.pts;
                        return (
                          <button
                            key={lvl.pts}
                            type="button"
                            onClick={() => handleLeadershipChange(comp.id, lvl.pts)}
                            className={`py-2 px-1.5 rounded-lg border text-center transition-all ${
                              isSelected
                                ? 'bg-indigo-600 border-indigo-600 text-white font-bold shadow-sm shadow-indigo-650/20'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-600'
                            }`}
                          >
                            <div className="text-xs font-bold">{lvl.pts} pts</div>
                            <div className={`text-[8.5px] uppercase tracking-wider opacity-80 mt-0.5 ${isSelected ? 'text-indigo-100 font-bold' : 'text-slate-450'}`}>
                              {lvl.label}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Part B: Plan de Desarrollo Individual (PDI) Commitments */}
            <div className="space-y-4">
              <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-sm text-indigo-500">assignment_turned_in</span>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Compromisos de Plan de Desarrollo (PDI)</h4>
              </div>

              <div className="space-y-2">
                {PDI_COMMITMENTS.map((pdi) => {
                  const isActive = selectedPdi.includes(pdi.id);
                  return (
                    <button
                      key={pdi.id}
                      type="button"
                      onClick={() => handlePdiToggle(pdi.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 ${
                        isActive
                          ? 'bg-indigo-50 border-indigo-500 shadow-sm shadow-indigo-500/5'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100/50'
                      }`}
                    >
                      <span className={`material-symbols-outlined text-lg shrink-0 ${isActive ? 'text-indigo-600' : 'text-slate-300'}`}>
                        {isActive ? 'check_box' : 'check_box_outline_blank'}
                      </span>
                      <div>
                        <div className="flex justify-between items-center w-full">
                          <span className={`text-xs font-bold ${isActive ? 'text-indigo-950' : 'text-slate-700'}`}>{pdi.label}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isActive ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-200 text-slate-600'} shrink-0 ml-2`}>
                            +{pdi.pts} pts
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{pdi.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
