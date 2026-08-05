import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Sparkles, 
  GitCommit, 
  Play, 
  Clock, 
  FileText, 
  AlertTriangle, 
  TrendingUp, 
  FileBadge, 
  ArrowRight, 
  Network, 
  Info, 
  Activity,
  Users2,
  Check,
} from 'lucide-react';

interface MindMapNode {
  id: string;
  label: string;
  shortName: string;
  icon: React.ReactNode;
  category: 'core' | 'scrum-branch' | 'blocker-flow' | 'kaizen';
  status: 'active' | 'in_development' | 'planned';
  description: string;
  extendedDetail: string;
  checklist: string[];
  metrics?: { label: string; value: string };
}

export default function ActionPlanTab() {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('scrum');

  // Definición exacta de los nodos que aparecen en la imagen adjunta
  const nodes: MindMapNode[] = [
    {
      id: 'kaizen',
      label: 'Filosofía Kaizen',
      shortName: 'Kaizen',
      icon: <Sparkles className="w-5 h-5 text-indigo-400" />,
      category: 'kaizen',
      status: 'active',
      description: 'El núcleo de nuestra cultura organizativa: realizar pequeños cambios diarios y constantes para lograr resultados masivos, eficientes y sostenibles a largo plazo.',
      extendedDetail: 'Kaizen es un concepto de mejora continua que involucra a todos los miembros del equipo. Al enfocarnos en pequeñas optimizaciones operativas diarias, eliminamos desperdicios técnicos y mejoramos la calidad del soporte.',
      checklist: [
        'Identificar diariamente micro-fricciones operativas.',
        'Proponer soluciones sencillas de implementación inmediata.',
        'Sostener los estándares alcanzados antes de dar el siguiente paso.'
      ],
      metrics: { label: 'Enfoque', value: 'Mejora Continua' }
    },
    {
      id: 'horario',
      label: 'Fase 1: Horario / Guardias',
      shortName: 'Horario',
      icon: <Clock className="w-5 h-5" />,
      category: 'core',
      status: 'planned',
      description: 'Correcta adherencia al horario y a la metodología del trabajo remoto.',
      extendedDetail: 'Esta fase se centra en asegurar el cumplimiento de los horarios establecidos, la puntualidad en las conexiones y la correcta aplicación de las mejores prácticas y metodologías del trabajo remoto para mantener la productividad e integración del equipo.',
      checklist: [
        'Cumplir estrictamente con los horarios de inicio y fin de jornada.',
        'Asegurar conexión puntual a las reuniones y ceremonias del equipo.',
        'Aplicar correctamente las normas y metodologías del trabajo remoto.'
      ],
      metrics: { label: 'Planificación', value: 'Fase de Madurez 4' }
    },
    {
      id: 'doc',
      label: 'Fase 2: Documentación y Uso del Tiempo',
      shortName: 'Doc',
      icon: <FileText className="w-5 h-5" />,
      category: 'core',
      status: 'planned',
      description: 'Medición de cómo estamos documentando nuestro trabajo y cómo estamos invirtiendo el tiempo.',
      extendedDetail: 'Esta fase evalúa la calidad y constancia al documentar procesos, incidencias y soluciones, así como la gestión y distribución eficiente del tiempo invertido en las distintas tareas de soporte.',
      checklist: [
        'Asegurar que todas las tareas e incidentes queden correctamente documentados.',
        'Medir y analizar la distribución del tiempo invertido en cada tarea.',
        'Identificar fugas de tiempo para mejorar la eficiencia operativa.'
      ],
      metrics: { label: 'Planificación', value: 'Fase de Madurez 5' }
    },
    {
      id: 'kpis',
      label: 'Fase 3: Indicadores Técnicos (KPIs)',
      shortName: 'KPIs',
      icon: <TrendingUp className="w-5 h-5" />,
      category: 'core',
      status: 'in_development',
      description: 'Definición y medición de tiempos de resolución (SLA), tasa de reapertura y puntos de XP acumulados por rendimiento.',
      extendedDetail: 'Implementación de tableros de medición interactivos en tiempo real. Permite a los técnicos autoevaluar su rendimiento cuantitativo y ganar recompensas de nivel dentro de la plataforma.',
      checklist: [
        'Definir umbrales óptimos de tiempo de resolución de tickets.',
        'Vincular la acumulación de XP con la resolución ágil de incidencias.',
        'Establecer metas claras de SLA de atención telefónica y CRM.'
      ],
      metrics: { label: 'Avance', value: '60% En Desarrollo' }
    },
    {
      id: 'soprte_escal',
      label: 'Fase 4: Soporte y Escalación',
      shortName: 'Soprt/Escal',
      icon: <Network className="w-5 h-5" />,
      category: 'core',
      status: 'planned',
      description: 'Modelado matricial de niveles de soporte (L1, L2, L3) y rutas críticas de escalación técnica ante incidentes graves.',
      extendedDetail: 'Define de forma inequívoca el camino de resolución técnica. Evita que tickets críticos se estanquen al asignar responsables directos con conocimientos técnicos progresivos por área.',
      checklist: [
        'Mapear flujo de soporte técnico según complejidad (L1 -> L2 -> L3).',
        'Asignar mentores y líderes técnicos expertos por especialidad.',
        'Estandarizar alertas automáticas para incidentes de severidad alta.'
      ],
      metrics: { label: 'Planificación', value: 'Fase de Madurez 6' }
    },
    {
      id: 'req_prty',
      label: 'Fase 5: Requerimientos y Prioridades',
      shortName: 'Req/Prty',
      icon: <FileBadge className="w-5 h-5" />,
      category: 'core',
      status: 'in_development',
      description: 'Clasificación automatizada de tareas y priorización de solicitudes basada en impacto crítico comercial.',
      extendedDetail: 'Clasificación de la cola de requerimientos operativos procedentes del CRM corporativo. Evita la sobrecarga de tickets no urgentes, permitiendo focalizarse en el backlog de alto valor.',
      checklist: [
        'Configurar matriz de prioridades según el impacto comercial del ticket.',
        'Sincronizar automáticamente solicitudes del CRM con la vista operativa.',
        'Capacitar al equipo en la correcta asignación de niveles de urgencia.'
      ],
      metrics: { label: 'Avance', value: '40% En Desarrollo' }
    },
    {
      id: 'scrum',
      label: 'Fase Actual: Metodología Scrum',
      shortName: 'Scrum',
      icon: <Users2 className="w-5 h-5" />,
      category: 'core',
      status: 'active',
      description: 'Solo tomamos la parte Principal de Fragmentar tareas y ordenarlas sumándole un nivel de disciplina y compromiso para hacer las tareas.',
      extendedDetail: 'En nuestra implementación, nos enfocamos estrictamente en la acción: tomamos la parte principal de fragmentar tareas y ordenarlas, sumándole un alto nivel de disciplina y compromiso de todo el equipo para asegurar su ejecución puntual.',
      checklist: [
        'Participar activamente en la Daily Standup matutina obligatoria.',
        'Mantener el tablero de tareas actualizado en tiempo real.',
        'Exponer proactivamente bloqueos que detengan el flujo del sprint.'
      ],
      metrics: { label: 'Estado', value: '100% ACTIVO 🚀' }
    },
    {
      id: 'ayer',
      label: 'Estatus: Ayer (Daily Scrum)',
      shortName: 'Ayer',
      icon: <GitCommit className="w-5 h-5 text-indigo-400" />,
      category: 'scrum-branch',
      status: 'active',
      description: '¿Qué trabajaste Ayer?',
      extendedDetail: 'La pregunta central de revisión: "¿Qué trabajaste Ayer?". Su objetivo es transparentar lo que realmente se ejecutó, construyendo disciplina y rindiendo cuentas sobre el progreso del día anterior.',
      checklist: [
        'Verificar el cierre formal de los tickets comprometidos ayer.',
        'Registrar los XP ganados por resolución técnica.',
        'Reportar incidentes que hayan quedado inconclusos con su justificación.'
      ],
      metrics: { label: 'Frecuencia', value: 'Diario (Standup)' }
    },
    {
      id: 'hoy',
      label: 'Estatus: Hoy (Daily Scrum)',
      shortName: 'Hoy',
      icon: <Play className="w-5 h-5 text-indigo-400" />,
      category: 'scrum-branch',
      status: 'active',
      description: '¿Qué trabajarás hoy?',
      extendedDetail: 'La pregunta central de planificación: "¿Qué trabajarás hoy?". Busca generar un compromiso explícito del técnico sobre las tareas fragmentadas concretas que va a ejecutar durante la jornada actual.',
      checklist: [
        'Elegir un máximo de 3 tickets prioritarios del CRM para la jornada.',
        'Asegurar disponibilidad técnica para colaborar en retos grupales.',
        'Alinear las tareas comprometidas con los KPIs operativos.'
      ],
      metrics: { label: 'Frecuencia', value: 'Diario (Standup)' }
    },
    {
      id: 'blq',
      label: 'Detección de Bloqueos (BLQ)',
      shortName: 'BLQ',
      icon: <AlertTriangle className="w-5 h-5 text-rose-500 animate-pulse" />,
      category: 'scrum-branch',
      status: 'active',
      description: '¿Tienes algún Bloqueante?',
      extendedDetail: 'La pregunta clave de destrabe: "¿Tienes algún Bloqueante?". Orientada a detectar de forma inmediata cualquier obstáculo que impida el avance de las tareas, elevando la visibilidad del problema.',
      checklist: [
        'Declarar formalmente el bloqueo técnico durante la Daily.',
        'Describir con precisión la causa raíz del impedimento técnico.',
        'Coordinar con un líder de soporte o administrador para su destrabe.'
      ],
      metrics: { label: 'Criticidad', value: 'Alta ⚠️' }
    },
    {
      id: 'eta',
      label: 'Proyección: ETA de Solución',
      shortName: 'ETA',
      icon: <Clock className="w-5 h-5 text-amber-400" />,
      category: 'blocker-flow',
      status: 'active',
      description: 'Definir una fecha estimada para Follow Up.',
      extendedDetail: 'La regla de oro para cualquier bloqueo: "Definir una fecha estimada para Follow Up. No dejarlo al tiempo sino que se programa todo." Esto asegura que el problema tenga una expectativa clara de revisión.',
      checklist: [
        'Negociar o proyectar una hora/fecha de resolución realista para el bloqueo.',
        'Comunicar de forma clara el ETA a las partes interesadas o clientes.',
        'Modificar el estatus técnico si el ETA sufre alteraciones justificadas.'
      ],
      metrics: { label: 'Objetivo', value: 'Programar Revisión' }
    },
    {
      id: 'fup',
      label: 'Acción: Seguimiento Iterativo (FUP)',
      shortName: 'FUP',
      icon: <Activity className="w-5 h-5 text-emerald-400" />,
      category: 'blocker-flow',
      status: 'active',
      description: 'No dejarlo al tiempo sino que se programa todo.',
      extendedDetail: 'La continuación de la regla de oro: "Definir una fecha estimada para Follow Up. No dejarlo al tiempo sino que se programa todo." El FUP es la ejecución puntual de ese seguimiento para garantizar el destrabe.',
      checklist: [
        'Realizar revisiones programadas sobre el estado de la dependencia externa.',
        'Registrar meticulosamente cada interacción del seguimiento en el CRM.',
        'Cerrar formalmente el bloqueo una vez solventado, documentando el aprendizaje.'
      ],
      metrics: { label: 'Acción', value: 'Seguimiento Programado' }
    }
  ];

  const selectedNode = nodes.find(n => n.id === selectedNodeId) || nodes[6]; // Default to Scrum

  return (
    <div className="flex flex-col gap-6 font-sans text-white w-full" id="action-plan-tab-view">
      
      {/* High Contrast Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-[#111827] border-2 border-indigo-500 p-6 md:p-8 shadow-2xl keep-dark-bg text-white-keep">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-violet-600/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-950 border-2 border-indigo-400 text-xs text-white font-mono uppercase tracking-wider font-extrabold text-white-keep keep-dark-bg">
              <Sparkles className="w-4 h-4 text-indigo-300" />
              Filosofía Continua Kaizen
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-black tracking-tight text-white uppercase text-white-keep">
              Plan de Acción Estratégico
            </h1>
            <p className="text-sm text-slate-100 font-bold leading-relaxed bg-[#1e293b] p-4 rounded-xl border border-slate-700 italic keep-dark-bg text-white-keep">
              "Realizar pequeños cambios diarios y constantes para lograr resultados masivos, eficientes y sostenibles a largo plazo."
            </p>
          </div>
          
          <div className="shrink-0 bg-slate-900 border-2 border-emerald-400 p-5 rounded-2xl flex flex-col items-center gap-2 min-w-[190px] text-center shadow-lg keep-dark-bg text-white-keep">
            <span className="text-[11px] font-mono font-black text-slate-300 uppercase tracking-widest text-white-keep">Fase Activa Actual</span>
            <div className="flex items-center gap-2 text-emerald-300 font-black text-sm tracking-wide bg-emerald-950/80 px-3 py-1.5 rounded-xl border border-emerald-500 keep-dark-bg text-white-keep">
              <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              METODOLOGÍA SCRUM
            </div>
            <span className="text-[11px] font-bold text-white bg-slate-800 px-3 py-1 rounded-full border border-slate-700 mt-1 keep-dark-bg text-white-keep">
              Daily Standups Activas
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Area: Accurate representation of the diagram with identical visual architecture */}
        <div className="lg:col-span-8 bg-[#121212] border-2 border-slate-700 rounded-3xl p-6 flex flex-col justify-between shadow-2xl overflow-hidden keep-dark-bg text-white-keep">
          <div>
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-800">
              <div>
                <h3 className="font-display font-black text-lg text-white uppercase tracking-tight flex items-center gap-2 text-white-keep">
                  <span className="w-2.5 h-2.5 bg-indigo-400 rounded-full" />
                  Mapa Conceptual Kaizen &amp; Scrum
                </h3>
                <p className="text-xs text-slate-200 font-bold mt-1 text-white-keep">Haz clic en los cuadros para ver información detallada e interactuar.</p>
              </div>
              <span className="text-xs font-mono bg-slate-800 text-white border border-slate-600 px-3 py-1.5 rounded-xl font-bold uppercase tracking-wider text-white-keep keep-dark-bg">
                Estructura Oficial
              </span>
            </div>

            {/* Scrollable Container to prevent squishing and ensure perfect readability */}
            <div className="w-full overflow-x-auto pb-4 no-scrollbar">
              <div className="relative py-4 w-[740px] h-[550px] bg-[#121212] select-none rounded-2xl border border-slate-800 mx-auto keep-dark-bg text-white-keep">
                
                {/* SVG connection lines with precise coordinates representing the diagram */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                  <defs>
                    {/* SVG markers for sharp white arrows */}
                    <marker id="chalk-arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#ffffff" />
                    </marker>
                    <marker id="chalk-arrow-active" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#818cf8" />
                    </marker>
                  </defs>

                  {/* 1. Connection: Kaizen Right Fork to the 6 elements */}
                  {/* From Kaizen's Right center (120, 212) -> right to 140, then vertical line down & up to each Y coordinate */}
                  {/* Stem */}
                  <path d="M 120,212 L 140,212" stroke="#ffffff" strokeWidth="2.5" fill="none" />
                  
                  {/* Vertical hub line */}
                  <path d="M 140,50 L 140,375" stroke="#ffffff" strokeWidth="2.5" fill="none" />

                  {/* Horizontal branches with arrows pointing to each of the 6 boxes */}
                  {/* Horario (Y=50) */}
                  <path d="M 140,50 L 160,50" stroke="#ffffff" strokeWidth="2" fill="none" markerEnd="url(#chalk-arrow)" />
                  {/* Doc (Y=115) */}
                  <path d="M 140,115 L 160,115" stroke="#ffffff" strokeWidth="2" fill="none" markerEnd="url(#chalk-arrow)" />
                  {/* KPIs (Y=180) */}
                  <path d="M 140,180 L 160,180" stroke="#ffffff" strokeWidth="2" fill="none" markerEnd="url(#chalk-arrow)" />
                  {/* Soprt/Escal (Y=245) */}
                  <path d="M 140,245 L 160,245" stroke="#ffffff" strokeWidth="2" fill="none" markerEnd="url(#chalk-arrow)" />
                  {/* Req/Prty (Y=310) */}
                  <path d="M 140,310 L 160,310" stroke="#ffffff" strokeWidth="2" fill="none" markerEnd="url(#chalk-arrow)" />
                  {/* Scrum (Y=375) - Glow active connection */}
                  <path 
                    d="M 140,375 L 160,375" 
                    stroke="#818cf8" 
                    strokeWidth="3" 
                    fill="none" 
                    markerEnd="url(#chalk-arrow-active)" 
                    className="animate-pulse"
                  />

                  {/* 2. Connections branching off from Scrum (X=215, Y=395) */}
                  {/* Active segment from Scrum to the step-down branch point */}
                  <path 
                    d="M 215,395 L 215,425" 
                    stroke="#818cf8" 
                    strokeWidth="2.5" 
                    fill="none" 
                  />

                  {/* Active branch going straight down to Ayer/Hoy container (Sprint Daily Sync) */}
                  <path 
                    d="M 215,425 L 215,460" 
                    stroke="#818cf8" 
                    strokeWidth="2.5" 
                    fill="none" 
                    markerEnd="url(#chalk-arrow-active)"
                  />

                  {/* White path from branch point continuing horizontally to BLQ */}
                  <path 
                    d="M 215,425 L 430,425" 
                    stroke="#ffffff" 
                    strokeWidth="2.5" 
                    fill="none" 
                    markerEnd="url(#chalk-arrow)"
                  />

                  {/* From BLQ (X=495, Y=445) down to ETA/FUP container */}
                  <path 
                    d="M 495,445 L 495,480" 
                    stroke="#ffffff" 
                    strokeWidth="2" 
                    fill="none" 
                    markerEnd="url(#chalk-arrow)"
                  />

                  {/* Inside ETA/FUP container: Connecting ETA to FUP */}
                  <path 
                    d="M 480,525 L 505,525" 
                    stroke="#ffffff" 
                    strokeWidth="2" 
                    fill="none" 
                    markerEnd="url(#chalk-arrow)"
                  />

                </svg>

                {/* 1. CENTRAL KAIZEN NODE */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNodeId('kaizen')}
                  className={`absolute rounded-2xl border-2 font-display text-xs font-extrabold flex items-center justify-center transition-all cursor-pointer shadow-lg keep-dark-bg ${
                    selectedNodeId === 'kaizen'
                      ? 'border-indigo-400 bg-indigo-950 text-white-keep ring-4 ring-indigo-400/30 font-black'
                      : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                  }`}
                  style={{ left: '10px', top: '190px', width: '110px', height: '44px', zIndex: 10 }}
                >
                  Kaizen
                </motion.button>

                {/* 2. VERTICAL 6 PILLARS ON THE RIGHT */}
                
                {/* Horario */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNodeId('horario')}
                  className={`absolute rounded-xl border-2 text-xs font-bold flex items-center justify-center transition-all cursor-pointer keep-dark-bg ${
                    selectedNodeId === 'horario'
                      ? 'border-indigo-400 bg-indigo-950 text-white-keep ring-2 ring-indigo-400/40 font-black'
                      : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                  }`}
                  style={{ left: '160px', top: '30px', width: '110px', height: '40px', zIndex: 10 }}
                >
                  Horario
                </motion.button>

                {/* Doc */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNodeId('doc')}
                  className={`absolute rounded-xl border-2 text-xs font-bold flex items-center justify-center transition-all cursor-pointer keep-dark-bg ${
                    selectedNodeId === 'doc'
                      ? 'border-indigo-400 bg-indigo-950 text-white-keep ring-2 ring-indigo-400/40 font-black'
                      : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                  }`}
                  style={{ left: '160px', top: '95px', width: '110px', height: '40px', zIndex: 10 }}
                >
                  Doc
                </motion.button>

                {/* KPIs */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNodeId('kpis')}
                  className={`absolute rounded-xl border-2 text-xs font-bold flex items-center justify-center transition-all cursor-pointer keep-dark-bg ${
                    selectedNodeId === 'kpis'
                      ? 'border-indigo-400 bg-indigo-950 text-white-keep ring-2 ring-indigo-400/40 font-black'
                      : 'border-amber-400 bg-amber-950 text-white-keep hover:bg-slate-800'
                  }`}
                  style={{ left: '160px', top: '160px', width: '110px', height: '40px', zIndex: 10 }}
                >
                  KPIs
                </motion.button>

                {/* Soprt/Escal */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNodeId('soprte_escal')}
                  className={`absolute rounded-xl border-2 text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer keep-dark-bg ${
                    selectedNodeId === 'soprte_escal'
                      ? 'border-indigo-400 bg-indigo-950 text-white-keep ring-2 ring-indigo-400/40 font-black'
                      : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                  }`}
                  style={{ left: '160px', top: '225px', width: '110px', height: '40px', zIndex: 10 }}
                  title="Soporte y Escalación"
                >
                  Soprt/Escal
                </motion.button>

                {/* Req/Prty */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNodeId('req_prty')}
                  className={`absolute rounded-xl border-2 text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer keep-dark-bg ${
                    selectedNodeId === 'req_prty'
                      ? 'border-indigo-400 bg-indigo-950 text-white-keep ring-2 ring-indigo-400/40 font-black'
                      : 'border-amber-400 bg-amber-950 text-white-keep hover:bg-slate-800'
                  }`}
                  style={{ left: '160px', top: '290px', width: '110px', height: '40px', zIndex: 10 }}
                  title="Requerimientos y Prioridades"
                >
                  Req/Prty
                </motion.button>

                {/* Scrum (Active Phase) */}
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  onClick={() => setSelectedNodeId('scrum')}
                  className={`absolute rounded-xl border-2 text-xs font-black flex items-center justify-center transition-all cursor-pointer keep-dark-bg ${
                    selectedNodeId === 'scrum'
                      ? 'border-emerald-400 bg-emerald-950 text-white-keep ring-4 ring-emerald-400/50 scale-105'
                      : 'border-indigo-400 bg-slate-900 text-white-keep hover:bg-slate-850'
                  }`}
                  style={{ left: '160px', top: '355px', width: '110px', height: '40px', zIndex: 10 }}
                >
                  <span className="flex items-center gap-1 text-white-keep">
                    Scrum
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  </span>
                </motion.button>

                {/* 3. SUB-SCRUM ACTIVE FLOW BRANCHES */}
                
                {/* Ayer / Hoy Container */}
                <div 
                  className="absolute p-3 rounded-2xl border-2 border-indigo-400 bg-indigo-950/40 shadow-xl flex flex-col justify-center items-center keep-dark-bg text-white-keep"
                  style={{ left: '105px', top: '460px', width: '220px', height: '80px', zIndex: 10 }}
                >
                  <div className="text-[9px] font-mono font-black text-indigo-300 uppercase tracking-widest mb-1.5 text-white-keep">Sprint Daily Sync</div>
                  <div className="flex gap-4">
                    {/* Ayer */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setSelectedNodeId('ayer')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer keep-dark-bg ${
                        selectedNodeId === 'ayer'
                          ? 'border-indigo-400 bg-indigo-900 text-white-keep ring-2 ring-indigo-400/50'
                          : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                      }`}
                      style={{ width: '80px', height: '32px' }}
                    >
                      Ayer
                    </motion.button>
                    {/* Hoy */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setSelectedNodeId('hoy')}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer keep-dark-bg ${
                        selectedNodeId === 'hoy'
                          ? 'border-indigo-400 bg-indigo-900 text-white-keep ring-2 ring-indigo-400/50'
                          : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                      }`}
                      style={{ width: '80px', height: '32px' }}
                    >
                      Hoy
                    </motion.button>
                  </div>
                </div>

                {/* BLQ Node */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setSelectedNodeId('blq')}
                  className={`absolute rounded-xl border-2 text-xs font-black flex items-center justify-center transition-all cursor-pointer keep-dark-bg ${
                    selectedNodeId === 'blq'
                      ? 'border-rose-400 bg-rose-950 text-white-keep ring-4 ring-rose-400/50 scale-105'
                      : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                  }`}
                  style={{ left: '440px', top: '405px', width: '110px', height: '40px', zIndex: 10 }}
                >
                  BLQ
                </motion.button>

                {/* ETA / FUP Container */}
                <div 
                  className="absolute p-3 rounded-2xl border-2 border-emerald-400 bg-emerald-950/20 shadow-xl flex flex-col justify-center items-center keep-dark-bg text-white-keep"
                  style={{ left: '385px', top: '480px', width: '220px', height: '70px', zIndex: 10 }}
                >
                  <div className="text-[9px] font-mono font-black text-emerald-300 uppercase tracking-widest mb-1.5 text-white-keep">Bloqueos Workflow</div>
                  <div className="flex gap-4 items-center">
                    {/* ETA */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setSelectedNodeId('eta')}
                      className={`rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center keep-dark-bg ${
                        selectedNodeId === 'eta'
                          ? 'border-amber-400 bg-amber-950 text-white-keep ring-2 ring-amber-400/50'
                          : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                      }`}
                      style={{ width: '75px', height: '28px' }}
                    >
                      ETA
                    </motion.button>
                    {/* FUP */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => setSelectedNodeId('fup')}
                      className={`rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center justify-center keep-dark-bg ${
                        selectedNodeId === 'fup'
                          ? 'border-emerald-400 bg-emerald-950 text-white-keep ring-2 ring-emerald-400/50'
                          : 'border-white bg-slate-900 text-white-keep hover:bg-slate-800'
                      }`}
                      style={{ width: '75px', height: '28px' }}
                    >
                      FUP
                    </motion.button>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-[#111827] border-2 border-indigo-500 rounded-2xl flex items-center gap-3 keep-dark-bg text-white-keep">
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="text-xs text-white font-bold font-sans leading-relaxed text-white-keep">
              El mapa anterior es interactivo. Al hacer clic en <span className="text-indigo-300 text-white-keep">Kaizen</span>, las fases o los subnodos de Scrum como <span className="text-emerald-300 text-white-keep">Ayer, Hoy, BLQ, ETA, FUP</span>, podrás visualizar toda la información asociada a su madurez y objetivos en el panel de detalle derecho.
            </p>
          </div>
        </div>

        {/* Right Area: HIGH CONTRAST Dynamic Detail panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-[#111827] border-2 border-indigo-400 rounded-3xl p-6 shadow-2xl flex flex-col justify-between flex-1"
            >
              <div className="space-y-6">
                
                {/* Header Detail */}
                <div className="flex items-start justify-between pb-4 border-b-2 border-slate-700">
                  <div className="space-y-1">
                    <span className="text-xs font-mono font-black text-indigo-400 uppercase tracking-widest block">
                      Fase Seleccionada
                    </span>
                    <h3 className="font-display font-black text-xl text-white tracking-tight uppercase leading-tight">
                      {selectedNode.label}
                    </h3>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border-2 border-indigo-400 text-white shrink-0 shadow-md">
                    {selectedNode.icon}
                  </div>
                </div>

                {/* Status indicator badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs text-white">
                    <span className="text-indigo-300 font-bold font-mono">Tipo:</span>
                    <span className="font-extrabold font-sans text-xs">
                      {selectedNode.category === 'kaizen' ? 'Filosofía General' : selectedNode.category === 'core' ? 'Pilar de Roadmap' : 'Subnodo Scrum Team'}
                    </span>
                  </div>
                  {selectedNode.metrics && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-xs text-white">
                      <span className="text-amber-300 font-bold font-mono">{selectedNode.metrics.label}:</span>
                      <span className="font-black font-mono text-xs">{selectedNode.metrics.value}</span>
                    </div>
                  )}
                </div>

                {/* Conceptual description */}
                <div className="space-y-2">
                  <h4 className="font-mono text-xs font-black text-indigo-300 uppercase tracking-wider">¿En qué consiste?</h4>
                  <p className="text-xs text-white font-bold leading-relaxed font-sans bg-slate-950 p-4 rounded-xl border-2 border-slate-800 shadow-inner">
                    {selectedNode.description}
                  </p>
                </div>

                {/* Objective details */}
                <div className="space-y-2 pb-4">
                  <h4 className="font-mono text-xs font-black text-indigo-300 uppercase tracking-wider">Objetivo Organizacional</h4>
                  <p className="text-xs text-slate-200 font-bold leading-relaxed font-sans bg-slate-900 p-4 rounded-xl border border-slate-800">
                    {selectedNode.extendedDetail}
                  </p>
                </div>

              </div>

              {/* Action and Navigation button */}
              <div className="mt-6 pt-4 border-t-2 border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold">
                  Kaizen &amp; Scrum Team 2026
                </span>
                
                <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-black hover:text-indigo-300 transition-colors cursor-pointer bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800 shadow-md">
                  <span>Filosofía Activa</span>
                  <ArrowRight className="w-3.5 h-3.5 text-indigo-400" />
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Quick General Progress Summary */}
          <div className="bg-[#111827] border-2 border-indigo-500 rounded-3xl p-5 shadow-2xl space-y-4 keep-dark-bg text-white-keep">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-white uppercase tracking-tight text-white-keep">Madurez del Plan de Acción</span>
              <span className="text-xs font-mono text-emerald-400 font-black bg-emerald-950 border border-emerald-800 px-2.5 py-1 rounded-lg keep-dark-bg text-white-keep">Fase 1 de 6</span>
            </div>
            
            <div className="space-y-2">
              <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border-2 border-slate-800 keep-dark-bg">
                <div className="bg-gradient-to-r from-emerald-500 to-indigo-600 h-full rounded-full" style={{ width: '20%' }} />
              </div>
              <div className="flex justify-between text-[11px] text-white font-mono font-bold text-white-keep">
                <span className="text-white-keep">0% Inicio</span>
                <span className="text-emerald-400 text-white-keep">Metodología Scrum Activa</span>
                <span className="text-white-keep">100% Kaizen</span>
              </div>
            </div>
            
            <p className="text-xs text-slate-200 font-bold text-center leading-relaxed bg-[#1e293b]/60 p-3 rounded-xl border border-slate-700 keep-dark-bg text-white-keep">
              El equipo domina actualmente el <strong className="text-emerald-300 font-black text-white-keep">Standup Scrum</strong> diario. Estamos en proceso de consolidar <strong className="text-indigo-300 font-black text-white-keep">KPIs e Integraciones de CRM</strong> antes de transicionar a la fase de Soporte y Escalación Matricial.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
