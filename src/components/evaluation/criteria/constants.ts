import { CriticalFaultItem } from '../../../types';

export const CRITERIA = [
  { 
    key: 'knowledge', short: 'CERT', title: 'Certificaciones', 
    icon: 'school', color: 'text-[#06B6D4]', bg: 'bg-[#06B6D4]', stroke: '#06B6D4', 
    desc: 'Adquisición, comprensión y aplicación del conocimiento formal.',
    subCriteria: [
      { id: 'ruta', label: 'Ruta de certificaciones requerida', desc: 'Cumplimiento de la ruta formativa para subir de Tier' },
      { id: 'comp', label: 'Comprensión del contenido', desc: 'Profundidad real de entendimiento del material' },
      { id: 'app', label: 'Aplicación real del conocimiento', desc: 'Aplicación en la resolución de requerimientos' },
      { id: 'exp', label: 'Capacidad de explicar', desc: 'Transferencia de conocimiento a clientes y equipo' }
    ]
  },
  { 
    key: 'execution', short: 'TROUB', title: 'Troubleshooting', 
    icon: 'build', color: 'text-[#6366F1]', bg: 'bg-[#6366F1]', stroke: '#6366F1', 
    desc: 'Capacidad técnica para diagnosticar y resolver siguiendo el método correcto.',
    subCriteria: [
      { id: 'proc', label: 'Uso correcto de procesos', desc: 'Sigue el flujo técnico establecido sin saltar pasos' },
      { id: 'tool', label: 'Dominio de herramientas internas', desc: 'Uso eficiente de herramientas de diagnóstico' },
      { id: 'diag', label: 'Diagnóstico técnico', desc: 'Identifica la causa raíz con precisión' },
      { id: 'res', label: 'Resolución o escalación', desc: 'Aplica solución o escala con continuidad técnica' }
    ]
  },
  { 
    key: 'relational', short: 'SERV', title: 'Servicio al Cliente', 
    icon: 'support_agent', color: 'text-[#10B981]', bg: 'bg-[#10B981]', stroke: '#10B981', 
    desc: 'Calidad de la atención y comunicación externa del agente.',
    subCriteria: [
      { id: 'tone', label: 'Tono profesional y empatía', desc: 'Comunicación respetuosa, empática y firme' },
      { id: 'clar', label: 'Claridad y redacción', desc: 'Respuestas claras, ordenadas y entendibles' },
      { id: 'time', label: 'Oportunidad y cumplimiento', desc: 'Respuestas a tiempo y manejo de expectativas' },
      { id: 'list', label: 'Escucha activa', desc: 'Entiende el contexto antes de contestar' }
    ]
  },
  { 
    key: 'collaborative', short: 'SOFT', title: 'Habilidades Blandas', 
    icon: 'groups', color: 'text-[#F97316]', bg: 'bg-[#F97316]', stroke: '#F97316', 
    desc: 'Comportamiento interno, madurez y disciplina dentro del equipo.',
    subCriteria: [
      { id: 'comm', label: 'Comunicación interna', desc: 'Clara y profesional con el equipo' },
      { id: 'collab', label: 'Escucha activa y colaboración', desc: 'Recibe feedback y apoya al equipo' },
      { id: 'crit', label: 'Pensamiento crítico y urgencia', desc: 'Toma de decisiones con criterio' },
      { id: 'resp', label: 'Responsabilidad y consistencia', desc: 'Cumple lo asumido y es confiable' },
      { id: 'disc', label: 'Horario y disciplina operativa', desc: 'Cumple su jornada y administra su tiempo' }
    ]
  },
  { 
    key: 'control', short: 'MGMT', title: 'Gestión del Req. y Trazabilidad', 
    icon: 'settings_suggest', color: 'text-[#8b5cf6]', bg: 'bg-[#8b5cf6]', stroke: '#8b5cf6', 
    desc: 'Administración del requerimiento y visibilidad en CRM.',
    subCriteria: [
      { id: 'carga', label: 'Gestión de Asignaciones y Carga', desc: 'Carga vs Tiempo, Ayer-Hoy-Bloqueos y FUP' },
      { id: 'traz', label: 'Trazabilidad y Documentación', desc: 'Registro claro (Suceso/Acción/Conclusión) en CRM' }
    ]
  }
];

export const CRITICAL_BUSINESS_FAULTS: CriticalFaultItem[] = [
  {
    id: 'crit-eth-01',
    code: 'CF-ETH-01',
    title: 'Trato Irrespetuoso u Ofensivo con el Cliente',
    description: 'Uso de lenguaje inapropiado, sarcasmo, falta de respeto o confrontación hostil directa con un cliente o usuario.',
    category: 'Ética & Servicio',
    penaltyPct: 150,
    icon: 'record_voice_over'
  },
  {
    id: 'crit-proc-01',
    code: 'CF-PROC-01',
    title: 'Manipulación de Métricas / Falsificación de Estado',
    description: 'Cerrar casos ficticiamente sin solución, marcar tareas como completadas sin haber realizado el trabajo o alterar registros para inflar rendimiento.',
    category: 'Calidad & Proceso',
    penaltyPct: 150,
    icon: 'running_with_errors'
  },
  {
    id: 'crit-sla-02',
    code: 'CF-SLA-02',
    title: 'Abandono Unilateral de Turno o Guardia Asignada',
    description: 'Ausentarse de la guardia o turno programado de atención inmediata sin previo aviso ni reemplazo coordinado.',
    category: 'SLA & Operaciones',
    penaltyPct: 140,
    icon: 'event_busy'
  },
  {
    id: 'crit-req-01',
    code: 'CF-REQ-01',
    title: 'Cierre de Requerimiento Sin Documentación Adecuada',
    description: 'Marcar un requerimiento como resuelto o cerrado sin incluir las notas de solución, soporte técnico ni documentación mínima requerida.',
    category: 'Gestión de Requerimientos',
    penaltyPct: 120,
    icon: 'description'
  },
  {
    id: 'crit-req-02',
    code: 'CF-REQ-02',
    title: 'Mantenimiento Innecesario de Requerimientos Abiertos',
    description: 'Retener requerimientos abiertos de forma prolongada sin justificación, avances reales ni escalación oportuna (procrastinación operativa).',
    category: 'Gestión de Requerimientos',
    penaltyPct: 115,
    icon: 'hourglass_disabled'
  },
  {
    id: 'crit-disc-01',
    code: 'CF-DISC-01',
    title: 'Ausencias o Tardanzas Injustificadas No Reportadas',
    description: 'No notificar oportunamente ausencias, tardanzas o desconexiones del turno de trabajo a través de los canales de comunicación autorizados.',
    category: 'Disciplina & Adherencia',
    penaltyPct: 125,
    icon: 'person_off'
  },
  {
    id: 'crit-disc-02',
    code: 'CF-DISC-02',
    title: 'Reincidencia en Falta de Adherencia y Mala Gestión del Tiempo',
    description: 'Incumplimiento reiterado de la jornada, pausas prolongadas no autorizadas o mala distribución del tiempo de atención.',
    category: 'Disciplina & Adherencia',
    penaltyPct: 110,
    icon: 'schedule_send'
  },
  {
    id: 'crit-tool-01',
    code: 'CF-TOOL-01',
    title: 'Uso Inadecuado de Herramientas de Trabajo Oficiales',
    description: 'No utilizar o emplear incorrectamente el CRM, sistemas de ticketing o canales de comunicación definidos por la organización.',
    category: 'Calidad & Proceso',
    penaltyPct: 110,
    icon: 'handyman'
  },
  {
    id: 'crit-fb-01',
    code: 'CF-FB-01',
    title: 'Reincidencia en Malas Prácticas Posterior a Feedback',
    description: 'Persistencia en errores o faltas operativas que ya fueron señaladas e instruidas previamente en sesiones de calibración o retroalimentación.',
    category: 'Calidad & Proceso',
    penaltyPct: 130,
    icon: 'sync_problem'
  }
];
