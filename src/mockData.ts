import { Agent, Certification, Achievement, TierConfig, XpEvent, ScrumTask } from './types';

export const INITIAL_TIERS: TierConfig[] = [
  {
    id: 'l1',
    name: 'L1 Novice',
    minXp: 0,
    maxXp: 1500,
    badgeName: 'Novice L1',
    colorHex: '#94A3B8', // Slate grey
    desc: 'Nivel inicial enfocado en adquirir conocimientos básicos de protocolos, procesos técnicos iniciales y flujos de atención.',
    requiredKpiAvg: 50,
    weights: { knowledge: 30, execution: 20, relational: 20, collaborative: 15, control: 15 },
    eligibleKpis: ['knowledge', 'execution', 'relational', 'collaborative', 'control']
  },
  {
    id: 'l1.5',
    name: 'L1.5 Junior',
    minXp: 1500,
    maxXp: 3000,
    badgeName: 'Junior L1.5',
    colorHex: '#64748B', // Cool slate
    desc: 'Agente intermedio con conocimientos consolidados de soporte técnico nivel 1, listo para transición a diagnóstico autónomo.',
    requiredKpiAvg: 60,
    weights: { knowledge: 25, execution: 25, relational: 20, collaborative: 15, control: 15 },
    eligibleKpis: ['knowledge', 'execution', 'relational', 'collaborative', 'control']
  },
  {
    id: 'l2',
    name: 'L2 Proficient',
    minXp: 3000,
    maxXp: 5000,
    badgeName: 'Proficient L2',
    colorHex: '#CD7F32', // Bronze
    desc: 'Agente autónomo habilitado para atender requerimientos de complejidad intermedia y flujos de escalamiento estándar.',
    requiredKpiAvg: 65,
    weights: { knowledge: 25, execution: 25, relational: 20, collaborative: 15, control: 15 },
    eligibleKpis: ['knowledge', 'execution', 'relational', 'collaborative', 'control']
  },
  {
    id: 'l3',
    name: 'L3 Expert',
    minXp: 5000,
    maxXp: 10000,
    badgeName: 'Expert L3',
    colorHex: '#F59E0B', // Gold
    desc: 'Especialista sénior con alto nivel de diagnóstico técnico autónomo, mentoría interna y comunicación compleja.',
    requiredKpiAvg: 80,
    weights: { knowledge: 20, execution: 30, relational: 20, collaborative: 15, control: 15 },
    eligibleKpis: ['knowledge', 'execution', 'relational', 'collaborative', 'control']
  },
  {
    id: 's1',
    name: 'S1 Coordinador',
    minXp: 10000,
    maxXp: 20000,
    badgeName: 'Coordinador S1',
    colorHex: '#8B5CF6', // Purple
    desc: 'Coordinador del área técnica. Gestiona colas de trabajo, asignaciones de turnos y reporta a la gerencia.',
    requiredKpiAvg: 85,
    weights: { knowledge: 20, execution: 20, relational: 20, collaborative: 20, control: 20 },
    eligibleKpis: ['knowledge', 'execution', 'relational', 'collaborative', 'control']
  },
  {
    id: 's2',
    name: 'S2 Supervisor',
    minXp: 20000,
    maxXp: 40000,
    badgeName: 'Supervisor S2',
    colorHex: '#EC4899', // Pink
    desc: 'Supervisor general de operaciones de soporte. Responsable de KPIs consolidados del equipo.',
    requiredKpiAvg: 90,
    weights: { knowledge: 20, execution: 20, relational: 20, collaborative: 20, control: 20 },
    eligibleKpis: ['knowledge', 'execution', 'relational', 'collaborative', 'control']
  },
  {
    id: 'a1',
    name: 'A1 Gerencia',
    minXp: 40000,
    maxXp: 100000,
    badgeName: 'Director / Gerente A1',
    colorHex: '#EF4444', // Red
    desc: 'Único y exclusivo para la alta gerencia. No es un rango aspirable para la operación técnica común.',
    requiredKpiAvg: 95,
    weights: { knowledge: 20, execution: 20, relational: 20, collaborative: 20, control: 20 },
    eligibleKpis: ['knowledge', 'execution', 'relational', 'collaborative', 'control']
  }
];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'hero_fup',
    title: 'Héroe del FUP',
    description: 'Completó y dio seguimiento oportuno a 20 requerimientos bloqueados sin retrasos.',
    iconName: 'support_agent'
  },
  {
    id: 'block_buster',
    title: 'Detonador de Bloqueos',
    description: 'Identificó y ayudó a resolver un bloqueador crítico que impactaba a múltiples clientes.',
    iconName: 'gavel'
  },
  {
    id: 'diagnosis_warrior',
    title: 'Guerrero de Diagnóstico',
    description: 'Demostró solución autónoma en incidentes sumamente complejos documentando causa raíz.',
    iconName: 'psychology'
  },
  {
    id: 'empathic_comm',
    title: 'Comunicador Empático',
    description: 'Recibió felicitaciones directas de clientes críticos destacando tono profesional y claridad.',
    iconName: 'handshake'
  },
  {
    id: 'scrum_master',
    title: 'Maestro del Scrum',
    description: 'Mantuvo al 100% sus actualizaciones de Deber Diario (Ayer-Hoy-Bloqueos) de forma clara y oportuna.',
    iconName: 'task_alt'
  }
];

export const INITIAL_CERTIFICATIONS: Certification[] = [
  {
    id: 'cert_1',
    title: 'Foundational Protocol Handling',
    description: 'Manejo básico de diagnósticos primarios, recolección de síntomas iniciales y estándares de documentación (Suceso-Acción-Conclusión) para incidentes nivel 1.',
    dimension: 'knowledge',
    targetTiers: ['l1'],
    status: 'published',
    iconName: 'menu_book',
    importance: 'core',
    points: 150,
    requirementDoc: {
      suceso: 'Recepción de incidente estándar L1 enviado desde el canal de entrada.',
      accion: 'Verificar datos de cliente, comprobar síntomas remotos y tipificar incidencia.',
      conclusion: 'Caso documentado de acuerdo al estándar de causa y escalado o resuelto.'
    }
  },
  {
    id: 'cert_2',
    title: 'Advanced Escalation Routing',
    description: 'Identificación avanzada de incidentes de alto impacto, coordinación entre departamentos y aplicación de flujos de escalamiento rápido con resúmenes técnicos estructurados.',
    dimension: 'execution',
    targetTiers: ['l2'],
    status: 'published',
    iconName: 'speed',
    importance: 'critical',
    points: 300,
    requirementDoc: {
      suceso: 'Identificación de un síntoma de falla generalizada o degradación crítica de servicios.',
      accion: 'Correr matriz de impacto cruzado, recopilar logs específicos y notificar a sysops.',
      conclusion: 'Escalamiento exitoso en menos de 10 minutos con registro detallado de logs analizados.'
    }
  },
  {
    id: 'cert_3',
    title: 'Cross-functional Mediation',
    description: 'Resolución de fricciones técnicas y de comunicación complejas entre áreas internas y externos de forma diplomática y colaborativa.',
    dimension: 'collaborative',
    targetTiers: ['l3'],
    status: 'published',
    iconName: 'handshake',
    importance: 'core',
    points: 250,
    requirementDoc: {
      suceso: 'Controversia de prioridades en parches de infraestructura crítica involucrando clientes premium.',
      accion: 'Facilitar llamada de alineación técnica detallando riesgos, alcances y tiempos.',
      conclusion: 'Aprobación unánime del cronograma de despliegue sin impactar SLA.'
    }
  },
  {
    id: 'cert_4',
    title: 'Crisis Communication Framework',
    description: 'Protocolos de comunicación de emergencia ante caídas totales de servicio. Elaboración de comunicados técnicos preventivos externos y alineación bajo incidentes críticos.',
    dimension: 'relational',
    targetTiers: ['unassigned'], // Draft
    status: 'draft',
    iconName: 'forum',
    importance: 'nice_to_have',
    points: 100,
    requirementDoc: {
      suceso: 'Interrupción masiva de servicio principal de base de datos.',
      accion: 'Redactar comunicaciones cada 15 minutos en tono empático y sin lenguaje comprometedor.',
      conclusion: 'Control de la ansiedad del cliente con reportes periódicos formales.'
    }
  }
];

export const MOCK_AVATARS = {
  marcus: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200&h=200', // actually adjusted to crisp portraits
  marcus_chen: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200&h=200',
  sarah: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200&h=200',
  elena: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200&h=200',
  david_o: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200',
  marcus_v: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200&h=200', // professional corporate
  david_k: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200&h=200',
  aisha: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=200&h=200',
  maria: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=200&h=200',
  admin: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200&h=200'
};

export const INITIAL_AGENTS: Agent[] = [
  {
    id: 'AG-FR-765',
    name: 'Francisco Ramirez',
    email: 'framirez@fhons.com',
    initials: 'FR',
    avatar: '',
    avatarBg: '#2563EB',
    role: 'Soporte Técnico Nivel 1',
    team: 'Inbound Tech Team',
    tierId: 'l1',
    currentXp: 1200,
    status: 'Disponible',
    evaluationsCount: 1,
    dimensionScores: { knowledge: 78, execution: 76, relational: 82, collaborative: 80, control: 78 },
    achievements: ['hero_fup'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Diagnóstico N1', 'Atención al Usuario', 'Gestión de Tickets CRM', 'Soporte Remoto', 'Documentación S-A-C'],
    specialties: ['Mesa de Ayuda', 'Resolución de Incidencias L1', 'Configuración de Estaciones de Trabajo'],
    improvementAreas: ['Optimizar tiempo medio de primera respuesta en tickets entrantes', 'Profundizar en análisis de logs de red'],
    painPoints: ['Requerimientos con información incompleta por parte del usuario'],
    actionPlan: [
      { id: 'ap_fr_1', text: 'Completar certificación de Protocolos de Atención Nivel 1', done: true },
      { id: 'ap_fr_2', text: 'Participar en sesión semanal de calibración MIMO con el coordinador', done: false }
    ]
  },
  {
    id: 'AG-HH-691',
    name: 'Hendel Herrera',
    email: 'hherrera@fhons.com',
    initials: 'HH',
    avatar: '',
    avatarBg: '#059669',
    role: 'Soporte Técnico Nivel 1',
    team: 'Inbound Tech Team',
    tierId: 'l1',
    currentXp: 1150,
    status: 'Disponible',
    evaluationsCount: 1,
    dimensionScores: { knowledge: 82, execution: 80, relational: 78, collaborative: 82, control: 80 },
    achievements: ['block_buster'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Análisis de Logs', 'Soporte Hardware/Software', 'Redes Básicas', 'Atención Telefónica', 'Gestión de Turnos'],
    specialties: ['Auditoría de Servidores', 'Firewalls Perimetrales', 'Soporte Técnico en Sitio'],
    improvementAreas: ['Estandarizar formato de cierre de tickets', 'Mejorar documentación de causa raíz'],
    painPoints: ['Concentración de solicitudes durante las horas pico de la mañana'],
    actionPlan: [
      { id: 'ap_hh_1', text: 'Registrar bitácora diaria en Daily Scrum al 100%', done: true },
      { id: 'ap_hh_2', text: 'Revisar matrices de seguridad de red con el equipo Cloud', done: false }
    ]
  },
  {
    id: 'AG-RB-101',
    name: 'Rafael Bello',
    email: 'rbello@fhons.co',
    initials: 'RB',
    avatar: '',
    avatarBg: '#D97706',
    role: 'Soporte Técnico Nivel 1',
    team: 'Inbound Tech Team',
    tierId: 'l1',
    currentXp: 1050,
    status: 'Disponible',
    evaluationsCount: 1,
    dimensionScores: { knowledge: 76, execution: 75, relational: 80, collaborative: 79, control: 74 },
    achievements: ['scrum_master'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Diagnóstico Rápido', 'Administración Active Directory', 'Soporte Telefonía IP', 'Atención de Casos CRM'],
    specialties: ['Mantenimiento Preventivo', 'Gestión de Cuentas de Usuario', 'Soporte de Impresión y Red'],
    improvementAreas: ['Mantener registros de asistencia puntuales', 'Fortalecer notas internas en tickets CRM'],
    painPoints: ['Demoras en respuestas de proveedores externos'],
    actionPlan: [
      { id: 'ap_rb_1', text: 'Asegurar check-in en horario asignado', done: true },
      { id: 'ap_rb_2', text: 'Capacitación en buenas prácticas de FCR', done: false }
    ]
  },
  {
    id: 'AG-RP-509',
    name: 'Robert Pichardo',
    email: 'rpichardo@fhons.com',
    initials: 'RP',
    avatar: '',
    avatarBg: '#7C3AED',
    role: 'Asesor Especialista Cloud',
    team: 'Tier 2 Cloud Team',
    tierId: 'l2',
    currentXp: 3400,
    status: 'Disponible',
    evaluationsCount: 2,
    dimensionScores: { knowledge: 88, execution: 86, relational: 85, collaborative: 87, control: 86 },
    achievements: ['diagnosis_warrior'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Infraestructura Cloud', 'Administración DNS', 'Escalamiento Avanzado', 'Resolución de Incidentes Críticos', 'Sistemas Linux/Windows Server'],
    specialties: ['Sistemas en la Nube', 'Diagnóstico de Redes Avanzado', 'Mantenimiento de Servidores'],
    improvementAreas: ['Consolidar tiempos de escalamiento hacia sysops', 'Brindar mentoría técnica a agentes Nivel 1'],
    painPoints: ['Complejidad en incidencias multicliente concurrentes'],
    actionPlan: [
      { id: 'ap_rp_1', text: 'Dictar taller interno sobre resolución de fallas DNS', done: true },
      { id: 'ap_rp_2', text: 'Obtener certificación Advanced Escalation Routing', done: false }
    ]
  },
  {
    id: 'AG-AD-712',
    name: 'Andri Dominguez',
    email: 'adominguez@fhons.com',
    initials: 'AD',
    avatar: '',
    avatarBg: '#DC2626',
    role: 'Soporte Técnico Junior',
    team: 'Inbound Tech Team',
    tierId: 'l1.5',
    currentXp: 1850,
    status: 'Disponible',
    evaluationsCount: 1,
    dimensionScores: { knowledge: 84, execution: 82, relational: 85, collaborative: 84, control: 83 },
    achievements: ['empathic_comm'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Atención al Cliente', 'Resolución en Primer Contacto (FCR)', 'Redes LAN/WAN', 'Soporte de Aplicaciones', 'Calibración MIMO'],
    specialties: ['Diagnóstico Autónomo', 'Calibración de Servicios', 'Atención de Clientes VIP'],
    improvementAreas: ['Documentación proactiva en base de conocimientos', 'Optimizar tiempos de derivación técnica'],
    painPoints: ['Casos con requerimientos de reconfiguración de infraestructura'],
    actionPlan: [
      { id: 'ap_ad_1', text: 'Publicar 3 artículos técnicos en la base de conocimientos', done: true },
      { id: 'ap_ad_2', text: 'Completar módulo de comunicación empática y manejo de objeciones', done: false }
    ]
  },
  {
    id: 'AG-RQ-371',
    name: 'Raymond Quintana',
    email: 'rquintana@fhons.com',
    initials: 'RQ',
    avatar: '',
    avatarBg: '#4B5563',
    role: 'Coordinador de Soporte & DBA',
    team: 'DBA & Core Business',
    tierId: 's1',
    currentXp: 10000,
    status: 'Disponible',
    evaluationsCount: 3,
    dimensionScores: { knowledge: 92, execution: 90, relational: 89, collaborative: 94, control: 91 },
    achievements: ['scrum_master', 'empathic_comm'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Coordinación de Operaciones', 'Gestión de Base de Datos (DBA)', 'Optimización de Colas', 'Liderazgo de Equipos', 'Supervisión de SLAs'],
    specialties: ['Mantenimiento SQL / Core Business', 'Asignación de Guardias y Turnos', 'Reportes Gerenciales de Calidad'],
    improvementAreas: ['Automatización de reportación de desempeño operativo', 'Monitoreo preventivo de cargas de base de datos'],
    painPoints: ['Picos imprevistos de volumen de solicitudes en cierres de mes'],
    actionPlan: [
      { id: 'ap_rq_1', text: 'Revisión mensual de matrices de evaluación MIMO con supervisores', done: true },
      { id: 'ap_rq_2', text: 'Optimizar flujo de asignación de requerimientos en el CRM', done: true }
    ]
  },
  {
    id: 'AG-RR-943',
    name: 'Ramon Reinoso',
    email: 'rreinoso@fhons.com',
    initials: 'RR',
    avatar: '',
    avatarBg: '#2563EB',
    role: 'Líder Técnico & Supervisor',
    team: 'DBA & Core Business',
    tierId: 's2',
    currentXp: 20000,
    status: 'Disponible',
    evaluationsCount: 3,
    dimensionScores: { knowledge: 95, execution: 93, relational: 92, collaborative: 95, control: 94 },
    achievements: ['diagnosis_warrior', 'hero_fup'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Arquitectura de Sistemas', 'Liderazgo Técnico', 'Supervisión de Operaciones', 'Auditoría de Procesos', 'Gestión de Crisis'],
    specialties: ['Supervisión General de Soporte', 'Alineación Estratégica', 'Calibración de Evaluaciones'],
    improvementAreas: ['Planes de sucesión técnica para niveles L2/L3', 'Reducción de tiempos de ciclo en incidencias complejas'],
    painPoints: ['Coordinación entre múltiples departamentos en ventanas de mantenimiento'],
    actionPlan: [
      { id: 'ap_rr_1', text: 'Establecer programa de mentores técnicos de la plataforma', done: true }
    ]
  },
  {
    id: 'AG-CF-409',
    name: 'Christian Fernandez',
    email: 'cfernandez@fhons.com',
    initials: 'CF',
    avatar: '',
    avatarBg: '#2563EB',
    role: 'CEO',
    team: 'DBA & Core Business',
    tierId: 'a1',
    currentXp: 40000,
    status: 'Disponible',
    evaluationsCount: 5,
    dimensionScores: { knowledge: 98, execution: 96, relational: 95, collaborative: 97, control: 98 },
    achievements: ['empathic_comm', 'scrum_master'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Dirección Ejecutiva', 'Estrategia de Negocios', 'Gestión de Operaciones FHONS', 'Toma de Decisiones Estratégicas'],
    specialties: ['Liderazgo Organizacional', 'Relaciones Estratégicas', 'Dirección General'],
    improvementAreas: ['Supervisión ejecutiva del crecimiento de niveles técnicos'],
    painPoints: ['Optimización continua de recursos tecnológicos'],
    actionPlan: [
      { id: 'ap_cf_1', text: 'Revisión trimestral de KPIs globales de la operación', done: true }
    ]
  },
  {
    id: 'AG-AF-145',
    name: 'Angel Fernandez',
    email: 'afernandez@fhons.com',
    initials: 'AF',
    avatar: '',
    avatarBg: '#2563EB',
    role: 'OWNER / Director',
    team: 'DBA & Core Business',
    tierId: 'a1',
    currentXp: 40000,
    status: 'Disponible',
    evaluationsCount: 5,
    dimensionScores: { knowledge: 98, execution: 97, relational: 96, collaborative: 98, control: 98 },
    achievements: ['block_buster', 'diagnosis_warrior'],
    scrumLogs: [],
    xpEvents: [],
    skills: ['Visión Estratégica', 'Gobierno Corporativo', 'Desarrollo de Negocio', 'Innovación Tecnológica'],
    specialties: ['Dirección Estratégica', 'Inversión Tecnológica', 'Gobierno de TI'],
    improvementAreas: ['Evaluación de expansión operativa y nuevas líneas de servicio'],
    painPoints: ['Alineación de objetivos de negocio a largo plazo'],
    actionPlan: [
      { id: 'ap_af_1', text: 'Alineación estratégica de metas operativas y presupuesto', done: true }
    ]
  }
];
