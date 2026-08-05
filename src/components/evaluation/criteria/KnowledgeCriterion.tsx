import React, { useState } from 'react';
import { Agent, Certification, CertProgress, CertificationImportance } from '../../../types';
import { CRITERIA } from './constants';

// Reimplement getTierLvl to correctly match the entire operational tier hierarchy
const getTierLvl = (tierId: string) => {
  const levels: Record<string, number> = { 
    'unassigned': 0,
    'any': 0,
    'l1': 1, 
    'l1.5': 2, 
    'l2': 3, 
    'l3': 4, 
    's1': 5, 
    's2': 6, 
    'a1': 7 
  };
  if (!tierId) return 0;
  const id = tierId.toLowerCase().trim();
  return levels[id] !== undefined ? levels[id] : 0;
};

interface KnowledgeCriterionProps {
  agent: Agent;
  globalScore: number;
  subScores: Record<string, number>;
  onSubScoreChange: (subId: string, val: number) => void;
  certifications?: Certification[];
  onUpdateAgent?: (agent: Agent) => void;
  onNextStep?: () => void;
}

export function KnowledgeCriterion({ 
  agent, 
  globalScore, 
  subScores, 
  onSubScoreChange, 
  certifications = [], 
  onUpdateAgent,
  onNextStep
}: KnowledgeCriterionProps) {
  const criterion = CRITERIA.find(c => c.key === 'knowledge')!;
  
  // Navigation & Sub-filters State
  const [activeTab, setActiveTab] = useState<'in_progress' | 'completed' | 'catalog'>('in_progress');
  const [catalogSubFilter, setCatalogSubFilter] = useState<'all' | 'my_tier' | 'lower_tiers' | 'any_tier'>('all');
  
  // Points Overrides
  const [customCertPoints, setCustomCertPoints] = useState<Record<string, number>>({});
  
  // Evaluation State
  const [selectedEvaluationCertId, setSelectedEvaluationCertId] = useState<string | null>(null);
  const [manualScoreEnabled, setManualScoreEnabled] = useState(false);

  const getPointsForImportance = (importance?: CertificationImportance | string) => {
    try {
      const stored = localStorage.getItem('tm_importance_points');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (importance && parsed[importance] !== undefined) {
          return Number(parsed[importance]);
        }
      }
    } catch (e) {
      console.error(e);
    }
    switch (importance) {
      case 'critical': return 40;
      case 'high': return 30;
      case 'core': return 20;
      case 'medium': return 20;
      case 'low': return 10;
      case 'nice_to_have': return 10;
      default: return 15;
    }
  };

  const isEnrolledOrCompleted = (cId: string) => {
    const isEnrolled = (agent.certifications || []).includes(cId);
    const isCompleted = (agent.certProgress || {})[cId]?.completed === true;
    return isEnrolled || isCompleted;
  };

  // Grouping of Certifications: Filter dynamically across the entire library
  const inProgressCerts = certifications.filter(c => c.status !== 'archived' && 
    (agent.certifications || []).includes(c.id) && 
    !(agent.certProgress || {})[c.id]?.completed
  );
  
  const completedCerts = certifications.filter(c => c.status !== 'archived' && 
    (agent.certProgress || {})[c.id]?.completed === true
  );

  // Available are certifications not started & not completed, and matching eligibility
  const availableCerts = certifications.filter(c => c.status !== 'archived' && 
    !isEnrolledOrCompleted(c.id) && 
    (c.targetTiers?.some(t => getTierLvl(agent.tierId) >= getTierLvl(t) || getTierLvl(t) === 0) ?? true)
  );

  // Sub-filtering available certifications for the Catalog View
  const filteredAvailableCerts = availableCerts.filter(c => {
    const agentLvl = getTierLvl(agent.tierId);
    const tiers = c.targetTiers || ['unassigned'];
    
    if (catalogSubFilter === 'my_tier') {
      return tiers.some(t => getTierLvl(t) === agentLvl && getTierLvl(t) > 0);
    }
    if (catalogSubFilter === 'lower_tiers') {
      return tiers.some(t => getTierLvl(t) < agentLvl && getTierLvl(t) > 0);
    }
    if (catalogSubFilter === 'any_tier') {
      return tiers.some(t => getTierLvl(t) === 0 || t === 'unassigned' || t === 'any');
    }
    return true; // 'all'
  });

  // Assign Certification handler
  const handleApplyCertification = (cert: Certification) => {
    if (!onUpdateAgent) return;
    onUpdateAgent({
       ...agent,
       certifications: [...(agent.certifications || []), cert.id]
    });
  };

  // Remove Certification handler
  const handleRemoveCertification = (certId: string) => {
    if (!onUpdateAgent) return;
    if (window.confirm('¿Está seguro de que desea retirar esta certificación en curso? Se perderá el progreso registrado.')) {
      const currentProgress = agent.certProgress || {};
      const newProgress = { ...currentProgress };
      delete newProgress[certId];
      
      onUpdateAgent({
        ...agent,
        certifications: (agent.certifications || []).filter(id => id !== certId),
        certProgress: newProgress
      });
    }
  };

  // Complete and Graduate Certification Handler
  const handleCompleteCertification = (certId: string, cert: Certification, overridePoints?: number) => {
    if (!onUpdateAgent) return;
    
    const finalPoints = overridePoints !== undefined ? overridePoints : (customCertPoints[certId] ?? (cert.points || getPointsForImportance(cert.importance)));
    
    const currentProgress = agent.certProgress || {};
    const existingProg = currentProgress[certId] || {
      certId,
      testPassed: false,
      appliedInWork: false,
      expositionScheduled: false,
      completed: false
    };

    const newProg = {
      ...existingProg,
      certId,
      completed: true
    };
    
    const newXpEvent = {
      id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentId: agent.id,
      title: `Certificación Completada: ${cert.title}`,
      description: `Completó la certificación: ${cert.title} y sus criterios de validación.`,
      xpYield: finalPoints,
      type: 'cert' as const,
      date: new Date().toISOString()
    };
    
    // Move from active certifications to completed progress
    const updatedAgent = {
      ...agent,
      certifications: (agent.certifications || []).filter(id => id !== certId),
      certProgress: {
        ...currentProgress,
        [certId]: newProg
      },
      currentXp: (agent.currentXp || 0) + finalPoints,
      xpEvents: [newXpEvent, ...(agent.xpEvents || [])]
    };
    
    onUpdateAgent(updatedAgent);
  };

  // Update Progress handler for fine-grained fields
  const handleUpdateProgress = (certId: string, updates: Partial<CertProgress>) => {
    if (!onUpdateAgent) return;
    
    const currentProgress = agent.certProgress || {};
    const certProg = currentProgress[certId] || {
      certId,
      testPassed: false,
      appliedInWork: false,
      expositionScheduled: false,
      completed: false
    };
    
    const newProg = { ...certProg, ...updates };
    
    const updatedAgent = {
      ...agent,
      certProgress: {
        ...currentProgress,
        [certId]: newProg
      }
    };
    
    onUpdateAgent(updatedAgent);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col lg:flex-row min-h-[500px] flex-grow">
        {/* Certifications Core Work Area */}
      <div className="flex-1 p-6 lg:p-8 flex flex-col border-r border-slate-100">
        
        {/* Banner de Presentación */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 ${criterion.bg} text-white rounded-2xl flex items-center justify-center shadow-md shrink-0`}>
              <span className="material-symbols-outlined text-3xl">{criterion.icon}</span>
            </div>
            <div>
              <h3 className="font-display font-extrabold text-xl text-slate-800">Criterio: {criterion.title}</h3>
              <p className="text-slate-500 text-xs mt-0.5 max-w-xl">
                Gestiona las competencias, pruebas y exposiciones requeridas para asegurar el rigor técnico en cada rango operativo.
              </p>
            </div>
          </div>
          
          {/* Card Técnico Contextual */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-xl px-4 py-2.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
              {agent.initials || agent.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">{agent.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Tier {agent.tierId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex border-b border-slate-200 mb-6 bg-slate-100/60 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('in_progress')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'in_progress' 
                ? 'bg-white text-cyan-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            En Curso ({inProgressCerts.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'completed' 
                ? 'bg-white text-emerald-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Completadas ({completedCerts.length})
          </button>
          <button
            onClick={() => setActiveTab('catalog')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              activeTab === 'catalog' 
                ? 'bg-white text-indigo-700 shadow-sm' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            Aplicar Nuevas ({availableCerts.length})
          </button>
        </div>

        {/* Tab 1: EN CURSO */}
        {activeTab === 'in_progress' && (
          <div className="flex-grow flex flex-col gap-6">
            {inProgressCerts.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-12 px-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-center">
                <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">school</span>
                <h5 className="text-sm font-bold text-slate-600 mb-1">Sin certificaciones activas</h5>
                <p className="text-xs text-slate-400 max-w-sm">
                  Este técnico no tiene certificaciones en proceso de evaluación. Explora el catálogo para asignarle una nueva.
                </p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="mt-4 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">library_add</span>
                  Ver Catálogo de Certificaciones
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {inProgressCerts.map(cert => {
                  const prog = (agent.certProgress || {})[cert.id] || {
                    certId: cert.id,
                    testPassed: false,
                    appliedInWork: false,
                    expositionScheduled: false,
                    completed: false
                  };
                  
                  const basePoints = cert.points || getPointsForImportance(cert.importance);
                  const certPoints = customCertPoints[cert.id] !== undefined ? customCertPoints[cert.id] : basePoints;
                  
                  const canComplete = prog.testPassed && prog.appliedInWork && (prog.expositionStatus === 'completed' || (prog.expositionScheduled && prog.expositionDate));

                  return (
                    <div 
                      key={cert.id} 
                      className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-4 relative"
                    >
                      {/* Header de la Tarjeta */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-cyan-600 text-2xl">
                              {cert.iconName || 'workspace_premium'}
                            </span>
                          </div>
                          <div>
                            <h5 className="font-extrabold text-slate-800 text-sm md:text-base flex items-center gap-2 flex-wrap">
                              {cert.title}
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                cert.importance === 'high' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                                cert.importance === 'medium' ? 'bg-amber-50 text-amber-700 border border-amber-100' : 
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}>
                                {cert.importance || 'medium'}
                              </span>
                            </h5>
                            <p className="text-slate-500 text-xs mt-1 max-w-2xl leading-relaxed">
                              {cert.description}
                            </p>
                          </div>
                        </div>

                        {/* Botón Retirar Certificación */}
                        <button
                          onClick={() => handleRemoveCertification(cert.id)}
                          className="self-end md:self-start text-[10px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded transition-all flex items-center gap-1 shrink-0"
                          title="Cancelar y retirar certificación del agente"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                          Retirar
                        </button>
                      </div>

                      {/* Gestor Interactivo de Criterios (Sustituye Checkboxes) */}
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mt-1">
                        
                        {/* Criterio 1: Test Teórico */}
                        <div className={`p-4 rounded-xl border transition-all ${prog.testPassed ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200/80'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined text-lg ${prog.testPassed ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                assignment
                              </span>
                              <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Test Conocimiento</h6>
                            </div>
                            {prog.testPassed ? (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                Aprobado ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                Pendiente
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                            Validar aprobación del examen oficial de conocimientos o diagnóstico interno.
                          </p>

                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateProgress(cert.id, { testPassed: true })}
                                className={`flex-grow py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                  prog.testPassed 
                                    ? 'bg-emerald-600 border border-emerald-600 text-white shadow-sm' 
                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px]">done</span>
                                Aprobado
                              </button>
                              <button
                                onClick={() => handleUpdateProgress(cert.id, { testPassed: false })}
                                className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                                  !prog.testPassed 
                                    ? 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-white border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                                disabled={!prog.testPassed}
                                title="Desmarcar como aprobado"
                              >
                                <span className="material-symbols-outlined text-[14px]">undo</span>
                              </button>
                            </div>

                            {/* Detalle Calificación */}
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Calificación o Nota:</label>
                              <input
                                type="text"
                                placeholder="Ej: 90/100, Aprobado A"
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                                value={prog.testScore || ''}
                                onChange={(e) => handleUpdateProgress(cert.id, { testScore: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Criterio 2: Validación Operativa */}
                        <div className={`p-4 rounded-xl border transition-all ${prog.appliedInWork ? 'bg-emerald-50/40 border-emerald-200' : 'bg-slate-50 border-slate-200/80'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined text-lg ${prog.appliedInWork ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                engineering
                              </span>
                              <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Validación Operativa</h6>
                            </div>
                            {prog.appliedInWork ? (
                              <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                Validado ✓
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                Pendiente
                              </span>
                            )}
                          </div>
                          
                          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                            Comprobar la aplicación real y correcta de los protocolos en tickets o labor diaria.
                          </p>

                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleUpdateProgress(cert.id, { appliedInWork: true })}
                                className={`flex-grow py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                                  prog.appliedInWork 
                                    ? 'bg-emerald-600 border border-emerald-600 text-white shadow-sm' 
                                    : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[14px]">verified</span>
                                Validar en Ops
                              </button>
                              <button
                                onClick={() => handleUpdateProgress(cert.id, { appliedInWork: false })}
                                className={`py-1.5 px-2 rounded-lg border text-xs font-bold transition-all ${
                                  !prog.appliedInWork 
                                    ? 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed' 
                                    : 'bg-white border-slate-300 text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                }`}
                                disabled={!prog.appliedInWork}
                                title="Desmarcar validación"
                              >
                                <span className="material-symbols-outlined text-[14px]">undo</span>
                              </button>
                            </div>

                            {/* Comentarios de Validación */}
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Evidencia o Casos Revisados:</label>
                              <input
                                type="text"
                                placeholder="Ej: Evaluado en ticket #93182"
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 bg-white"
                                value={prog.appliedInWorkNotes || ''}
                                onChange={(e) => handleUpdateProgress(cert.id, { appliedInWorkNotes: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Criterio 3: Exposición de Sábado (Gestión Avanzada) */}
                        <div className={`p-4 rounded-xl border transition-all ${
                          prog.expositionStatus === 'completed' 
                            ? 'bg-emerald-50/40 border-emerald-200' 
                            : prog.expositionStatus === 'scheduled' || prog.expositionScheduled
                            ? 'bg-amber-50/40 border-amber-200' 
                            : 'bg-slate-50 border-slate-200/80'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`material-symbols-outlined text-lg ${
                                prog.expositionStatus === 'completed' ? 'text-emerald-600 font-bold' : 
                                prog.expositionStatus === 'scheduled' || prog.expositionScheduled ? 'text-amber-500' : 'text-slate-400'
                              }`}>
                                co_present
                              </span>
                              <h6 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">Exposición Sábado</h6>
                            </div>
                            
                            <div>
                              {prog.expositionStatus === 'completed' ? (
                                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                                  Completada ✓
                                </span>
                              ) : prog.expositionStatus === 'scheduled' || prog.expositionScheduled ? (
                                <span className="text-[10px] font-extrabold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                                  Programada ⏰
                                </span>
                              ) : (
                                <span className="text-[10px] font-extrabold text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                                  Sin Programar
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                            Exposición formal impartida por el técnico para transferir el conocimiento al equipo.
                          </p>

                          {/* Selector de Estado Integrado */}
                          <div className="flex flex-col gap-2">
                            <div className="grid grid-cols-3 gap-1 bg-slate-200/60 p-0.5 rounded-lg border border-slate-200">
                              <button
                                onClick={() => handleUpdateProgress(cert.id, { 
                                  expositionStatus: 'pending',
                                  expositionScheduled: false,
                                  expositionDate: undefined
                                })}
                                className={`text-[10px] font-bold py-1 rounded-md transition-all ${
                                  !prog.expositionStatus || prog.expositionStatus === 'pending'
                                    ? 'bg-white text-slate-800 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Pendiente
                              </button>
                              <button
                                onClick={() => handleUpdateProgress(cert.id, { 
                                  expositionStatus: 'scheduled',
                                  expositionScheduled: true,
                                  expositionDate: prog.expositionDate || new Date().toISOString().split('T')[0]
                                })}
                                className={`text-[10px] font-bold py-1 rounded-md transition-all ${
                                  prog.expositionStatus === 'scheduled' || (prog.expositionScheduled && prog.expositionStatus !== 'completed')
                                    ? 'bg-amber-500 text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Programar
                              </button>
                              <button
                                onClick={() => handleUpdateProgress(cert.id, { 
                                  expositionStatus: 'completed',
                                  expositionScheduled: true,
                                  expositionDate: prog.expositionDate || new Date().toISOString().split('T')[0]
                                })}
                                className={`text-[10px] font-bold py-1 rounded-md transition-all ${
                                  prog.expositionStatus === 'completed'
                                    ? 'bg-emerald-600 text-white shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-800'
                                }`}
                              >
                                Aprobar
                              </button>
                            </div>

                            {/* Campos Detallados de Exposición */}
                            {(prog.expositionStatus === 'scheduled' || prog.expositionScheduled || prog.expositionStatus === 'completed') && (
                              <div className="space-y-2 mt-2 border-t border-slate-200/60 pt-2 bg-white/40 p-2 rounded-lg">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Fecha:</label>
                                    <input
                                      type="date"
                                      className="w-full text-[10px] px-1.5 py-1 rounded border border-slate-200 bg-white"
                                      value={prog.expositionDate || ''}
                                      onChange={(e) => handleUpdateProgress(cert.id, { expositionDate: e.target.value })}
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Evaluador/Jurado:</label>
                                    <input
                                      type="text"
                                      placeholder="Ej: Supervisor"
                                      className="w-full text-[10px] px-1.5 py-1 rounded border border-slate-200 bg-white focus:outline-none"
                                      value={prog.expositionEvaluator || ''}
                                      onChange={(e) => handleUpdateProgress(cert.id, { expositionEvaluator: e.target.value })}
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Tema Principal de Presentación:</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: Análisis de Casos de Falla"
                                    className="w-full text-[10px] px-2 py-1.5 rounded border border-slate-200 bg-white focus:outline-none"
                                    value={prog.expositionTopic || ''}
                                    onChange={(e) => handleUpdateProgress(cert.id, { expositionTopic: e.target.value })}
                                  />
                                </div>

                                <div>
                                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Feedback / Observaciones:</label>
                                  <textarea
                                    placeholder="Ej: Demostró solidez en las preguntas operativas del jurado..."
                                    rows={1}
                                    className="w-full text-[10px] px-2 py-1.5 rounded border border-slate-200 bg-white focus:outline-none resize-none"
                                    value={prog.expositionFeedback || ''}
                                    onChange={(e) => handleUpdateProgress(cert.id, { expositionFeedback: e.target.value })}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                      </div>

                      {/* Selección para Evaluación */}
                      <div className="mt-2 p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center gap-4 transition-all">
                        <label className="flex items-center gap-3 cursor-pointer w-full">
                          <input 
                            type="radio"
                            name="evaluation_cert"
                            checked={selectedEvaluationCertId === cert.id}
                            onChange={() => setSelectedEvaluationCertId(cert.id)}
                            className="w-5 h-5 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div>
                            <p className="text-xs font-extrabold text-indigo-800">Usar esta certificación para otorgar puntaje</p>
                            <p className="text-[10px] text-indigo-600">Al seleccionarla, podrás graduarla y otorgar XP si los criterios están completos.</p>
                          </div>
                        </label>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: COMPLETADAS */}
        {activeTab === 'completed' && (
          <div className="flex-grow flex flex-col gap-4">
            {completedCerts.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-12 px-6 bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl text-center">
                <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">verified</span>
                <h5 className="text-sm font-bold text-slate-600 mb-1">Sin certificaciones obtenidas</h5>
                <p className="text-xs text-slate-400 max-w-sm">
                  Este técnico aún no ha finalizado ninguna certificación en el sistema. Las certificaciones aprobadas se archivarán aquí.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedCerts.map(cert => {
                  const prog = (agent.certProgress || {})[cert.id] || {
                    certId: cert.id,
                    testPassed: true,
                    appliedInWork: true,
                    expositionScheduled: true,
                    completed: true
                  } as CertProgress;
                  const finalPts = customCertPoints[cert.id] ?? (cert.points || getPointsForImportance(cert.importance));

                  return (
                    <div 
                      key={`comp-${cert.id}`}
                      className="p-4 bg-emerald-50/30 border border-emerald-200/80 rounded-xl shadow-sm flex flex-col gap-3 relative"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className="material-symbols-outlined text-emerald-600 text-2xl">
                            {cert.iconName || 'school'}
                          </span>
                          <div>
                            <h5 className="font-bold text-slate-800 text-sm">{cert.title}</h5>
                            <p className="text-[10px] text-slate-500 mt-0.5">Dimensión: {cert.dimension.toUpperCase()}</p>
                          </div>
                        </div>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-1 rounded shadow-sm shrink-0">
                          +{finalPts} XP
                        </span>
                      </div>

                      {/* Expediente de Logro / Evidencias de Criterios */}
                      <div className="bg-white/80 border border-emerald-100/60 rounded-lg p-3 text-[11px] space-y-2 text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">assignment</span>
                          <span><strong>Examen Teórico:</strong> {prog.testPassed ? 'Aprobado ✓' : 'N/A'} {prog.testScore ? `(Nota: ${prog.testScore})` : ''}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
                          <span><strong>Práctica en Ops:</strong> {prog.appliedInWork ? 'Verificada ✓' : 'N/A'} {prog.appliedInWorkNotes ? `(${prog.appliedInWorkNotes})` : ''}</span>
                        </div>
                        <div className="flex flex-col gap-1 border-t border-slate-100 pt-1.5 mt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[13px] text-emerald-600">co_present</span>
                            <span><strong>Exposición Sábado:</strong> Impartida el {prog.expositionDate || 'S/N'}</span>
                          </div>
                          {prog.expositionTopic && (
                            <p className="pl-[19px] text-[10px] italic text-slate-500">Tema: "{prog.expositionTopic}"</p>
                          )}
                          {prog.expositionFeedback && (
                            <p className="pl-[19px] text-[10px] text-emerald-700 bg-emerald-50/50 p-1.5 rounded border border-emerald-100/30">
                              Feedback: "{prog.expositionFeedback}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: CATALOGO PARA APLICAR (Asignar Nuevas) */}
        {activeTab === 'catalog' && (
          <div className="flex-grow flex flex-col gap-4">
            
            {/* Sub-filtros de Elegibilidad */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-200 w-fit">
              <button
                onClick={() => setCatalogSubFilter('all')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  catalogSubFilter === 'all' 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todas las Elegibles ({availableCerts.length})
              </button>
              <button
                onClick={() => setCatalogSubFilter('my_tier')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  catalogSubFilter === 'my_tier' 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Mi Tier
              </button>
              <button
                onClick={() => setCatalogSubFilter('lower_tiers')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  catalogSubFilter === 'lower_tiers' 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tiers Inferiores
              </button>
              <button
                onClick={() => setCatalogSubFilter('any_tier')}
                className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                  catalogSubFilter === 'any_tier' 
                    ? 'bg-slate-800 text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Universales (Cualquier Tier)
              </button>
            </div>

            {/* Listado de Catálogo */}
            {filteredAvailableCerts.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center py-10 px-6 bg-slate-50/30 border border-slate-200 rounded-2xl text-center">
                <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">info</span>
                <p className="text-xs text-slate-500 font-medium italic">No hay certificaciones disponibles bajo este filtro para su tier actual.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredAvailableCerts.map(cert => (
                  <div 
                    key={`catalog-${cert.id}`} 
                    className="p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-all flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-cyan-600">
                            {cert.iconName || 'school'}
                          </span>
                          <h6 className="font-bold text-slate-800 text-sm">{cert.title}</h6>
                        </div>
                        {cert.status === 'draft' && (
                          <span className="bg-amber-100 text-amber-800 text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                            Borrador
                          </span>
                        )}
                      </div>
                      
                      <p className="text-slate-500 text-[11px] mt-1.5 leading-relaxed line-clamp-2">
                        {cert.description}
                      </p>

                      <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                        <span className="text-[9px] text-cyan-800 bg-cyan-50 border border-cyan-100 px-1.5 py-0.5 rounded">
                          {cert.points || getPointsForImportance(cert.importance)} XP
                        </span>
                        <span className="text-[9px] text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-mono uppercase">
                          Tier Requerido: {(cert.targetTiers || []).join(', ') || 'unassigned'}
                        </span>
                        <span className="text-[9px] text-indigo-800 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded capitalize">
                          {cert.dimension}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleApplyCertification(cert)}
                      className="w-full mt-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-700 hover:text-cyan-800 text-xs font-extrabold py-2 rounded-lg border border-cyan-200/50 hover:border-cyan-300 transition-all flex items-center justify-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">assignment_ind</span>
                      Asignar al Técnico
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Feedback Final (Sección Inferior Integrada) */}
        {selectedEvaluationCertId && (() => {
          const prog = agent.certProgress?.[selectedEvaluationCertId] || {} as any;
          return (
            <div className="mt-8 bg-slate-50 p-5 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-slate-200">
                <span className="material-symbols-outlined text-slate-400">rate_review</span>
                <h4 className="font-extrabold text-slate-700 text-xs uppercase tracking-wider">Feedback Final de Evaluación</h4>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Ingresa un comentario o retroalimentación final sobre el desempeño del técnico en esta certificación. Se registrará en la base de datos.</p>
              <textarea
                value={prog.finalFeedback || ''}
                onChange={(e) => handleUpdateProgress(selectedEvaluationCertId, { finalFeedback: e.target.value })}
                placeholder="Ej: Excelente dominio del tema, pero debe mejorar en la documentación..."
                className="w-full h-24 p-3 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
              />
            </div>
          );
        })()}

      </div>

      {/* System Context Panel (Right Column) */}
      <div className="w-full lg:w-80 bg-slate-50/50 p-6 flex flex-col gap-5 shrink-0">
        <div className="flex items-center gap-2 text-slate-600 pb-3 border-b border-slate-200">
          <span className="material-symbols-outlined text-lg">info</span>
          <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-700">Estado de Certificaciones</h4>
        </div>

        {/* Resumen de Progreso Rápido */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block mb-2">Progreso General del Agente</span>
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1">
              <span>Certificaciones Completadas</span>
              <span className="text-emerald-600">{completedCerts.length}</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ 
                  width: `${certifications.length > 0 ? (completedCerts.length / certifications.length) * 100 : 0}%` 
                }}
              ></div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-center border-t border-slate-100 pt-3">
            <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
              <span className="text-[18px] font-black text-cyan-600 block">{inProgressCerts.length}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">En Curso</span>
            </div>
            <div className="bg-slate-50/50 p-2 rounded-lg border border-slate-100">
              <span className="text-[18px] font-black text-indigo-600 block">{availableCerts.length}</span>
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Disponibles</span>
            </div>
          </div>
        </div>

        {/* Guía Técnica del Escalafón */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-wider block">Jerarquía de Tiers Operativos</span>
          <div className="space-y-1 relative before:absolute before:inset-y-0 before:left-2 before:w-0.5 before:bg-slate-100 ml-1">
            {[
              { id: 'l1', name: 'L1 (Novice)' },
              { id: 'l1.5', name: 'L1.5 (Junior)' },
              { id: 'l2', name: 'L2 (Proficient)' },
              { id: 'l3', name: 'L3 (Expert)' },
              { id: 's1', name: 'S1 (Senior)' },
              { id: 's2', name: 'S2 (Principal)' },
              { id: 'a1', name: 'A1 (Architect)' }
            ].map((tier) => {
              const agentLvl = getTierLvl(agent.tierId);
              const thisLvl = getTierLvl(tier.id);
              const isCurrent = thisLvl === agentLvl;
              const isFuture = thisLvl > agentLvl;
              
              if (thisLvl < agentLvl - 1) return null; // Show only one below max
              
              return (
                <div key={tier.id} className="relative flex items-center gap-3 pl-6 py-1">
                  <div className={`absolute left-[3px] w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm ${
                    isCurrent ? 'bg-cyan-500 scale-125 z-10' :
                    isFuture ? 'bg-slate-300' : 'bg-emerald-400'
                  }`} />
                  <div className={`flex-grow flex items-center justify-between p-1.5 rounded-lg border ${
                    isCurrent ? 'bg-cyan-50 border-cyan-200' : 
                    isFuture ? 'bg-white border-slate-100' : 'bg-slate-50 border-transparent opacity-60'
                  }`}>
                    <span className={`text-[10px] font-mono ${isCurrent ? 'text-cyan-800 font-bold' : 'text-slate-500'}`}>
                      {tier.name}
                    </span>
                    {isCurrent && <span className="text-[8px] font-bold text-cyan-600 uppercase tracking-wider bg-cyan-100 px-1.5 py-0.5 rounded">Actual</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed italic border-t border-slate-100 pt-2.5 mt-2">
            * El técnico progresa superando las certificaciones Core de su Tier actual.
          </p>
        </div>
        {/* Ajuste Manual de Puntaje (Moved from left column) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2">
              <h4 className="font-extrabold text-slate-700 text-[10px] uppercase tracking-wider leading-tight">Ajuste Manual</h4>
              {/* Toggle Button */}
              <button 
                onClick={() => setManualScoreEnabled(!manualScoreEnabled)}
                className={`w-7 h-3.5 flex items-center rounded-full p-0.5 transition-colors ${manualScoreEnabled ? 'bg-cyan-500' : 'bg-slate-300'}`}
              >
                <div className={`bg-white w-2.5 h-2.5 rounded-full shadow-sm transform transition-transform ${manualScoreEnabled ? 'translate-x-3.5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="text-right">
              {(() => {
                const currentScore = (subScores['manual'] || globalScore) <= 25 ? 80 : (subScores['manual'] || globalScore);
                const pct = manualScoreEnabled ? currentScore : 100;
                let ptsText = "- XP";
                if (selectedEvaluationCertId) {
                  const cert = certifications?.find(c => c.id === selectedEvaluationCertId);
                  if (cert) {
                    const basePoints = cert.points || getPointsForImportance(cert.importance);
                    const finalPoints = Math.round(basePoints * (pct / 100));
                    ptsText = `${finalPoints} XP`;
                  }
                }
                return (
                  <div className="flex flex-col items-end">
                    <span className={`text-xl font-black leading-none ${manualScoreEnabled ? criterion.color : 'text-slate-400'}`}>
                      {ptsText}
                    </span>
                    <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">Puntaje a otorgar</span>
                  </div>
                );
              })()}
            </div>
          </div>
          
          <div className={`flex flex-col gap-2 transition-opacity ${manualScoreEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
             <div className="flex items-center gap-2">
               <span className="text-[10px] font-mono font-bold text-slate-400">0%</span>
               <input 
                 type="range" min="0" max="100" 
                 value={(subScores['manual'] || globalScore) <= 25 ? 80 : (subScores['manual'] || globalScore)}
                 onChange={(e) => onSubScoreChange('manual', Number(e.target.value))}
                 className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                 style={{ accentColor: criterion.stroke }}
                 disabled={!manualScoreEnabled}
               />
               <span className="text-[10px] font-mono font-bold text-slate-400">100%</span>
             </div>
             <div className="text-center">
                <span className={`text-[13px] font-black ${manualScoreEnabled ? criterion.color : 'text-slate-400'}`}>
                  {(subScores['manual'] || globalScore) <= 25 ? 80 : (subScores['manual'] || globalScore)}%
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider ml-1">Porcentaje</span>
             </div>
          </div>
        </div>

      </div>
      </div>
      
      {/* Footer de Evaluación para Criterio de Conocimiento */}
      <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col sm:flex-row justify-between items-center gap-4 z-10">
        <div className="text-xs text-slate-500 font-medium">
          {inProgressCerts.length > 0 ? (
            <span>Certificaciones activas en revisión: <strong className="text-slate-800">{inProgressCerts.length}</strong></span>
          ) : (
            <span>El agente no tiene certificaciones activas en proceso.</span>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {selectedEvaluationCertId && (() => {
            const prog = agent.certProgress?.[selectedEvaluationCertId];
            return prog && prog.testPassed && prog.appliedInWork && (prog.expositionStatus === 'completed' || (prog.expositionScheduled && prog.expositionDate));
          })() ? (
            <button 
              onClick={() => {
                if (!selectedEvaluationCertId) return;
                const cert = certifications.find(c => c.id === selectedEvaluationCertId);
                if (!cert) return;
                
                // Calculate final percentage and points
                const percentage = manualScoreEnabled ? (subScores['manual'] || globalScore) : 100;
                const basePoints = cert.points || getPointsForImportance(cert.importance);
                const finalPoints = Math.round(basePoints * (percentage / 100));
                
                // Re-apply custom points to override for graduation
                setCustomCertPoints(prev => ({ ...prev, [cert.id]: finalPoints }));
                
                // Apply the criterion score visually if toggle is off
                if (!manualScoreEnabled) {
                  onSubScoreChange('manual', 100);
                }
                
                // Complete cert (this calls onUpdateAgent)
                handleCompleteCertification(cert.id, cert, finalPoints);
                
                // Proceed
                if (onNextStep) {
                  setTimeout(onNextStep, 300); // slight delay for visual feedback
                }
              }}
              className="bg-cyan-600 text-white hover:bg-cyan-700 px-6 py-3 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
            >
              Otorgar Puntaje y Avanzar
              <span className="material-symbols-outlined text-sm">workspace_premium</span>
            </button>
          ) : null}

          <button 
            onClick={onNextStep} 
            className="bg-cyan-600 text-white hover:bg-cyan-700 px-8 py-3 rounded-xl font-bold shadow-md transition-all flex items-center gap-2"
          >
            Siguiente Criterio
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
}
