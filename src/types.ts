export type DimensionType = 'knowledge' | 'execution' | 'relational' | 'collaborative' | 'control';

export interface DimensionScores {
  knowledge: number;       // Certificaciones
  execution: number;       // Troubleshooting
  relational: number;      // Servicio al Cliente
  collaborative: number;   // Habilidades Blandas
  control: number;         // Gestión de Requerimientos y Trazabilidad
}

export interface ScrumTask {
  ticketId: string;
  status: 'todo' | 'doing' | 'done';
  yesterday: string;
  today: string;
  blockers: string;
  notes: string;
  lastUpdated: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  iconName: string; // Lucide icon or custom marker
  tierRequired?: string;
  awardedAt?: string;
}

export interface CriticalFaultItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: 'Seguridad & Confidencialidad' | 'SLA & Operaciones' | 'Ética & Servicio' | 'Calidad & Proceso' | 'Gestión de Requerimientos' | 'Disciplina & Adherencia';
  penaltyPct: number;
  icon: string;
}

export interface AgentEvaluation {
  id: string;
  agentId: string;
  evalNumber: number;
  date: string;
  timestamp?: string;
  scores: DimensionScores;
  subScores?: Record<string, Record<string, number>>;
  criterionFeedbacks?: Record<string, string>;
  auditedCases?: Array<{ id: string; title?: string; source?: string }>;
  flowType?: 'flow' | 'specific';
  mimo: {
    mantener: string;
    iniciar: string;
    mejorar: string;
    omitir: string;
  };
  xpYield: number;
  evaluator?: string;
  title?: string;
  // Puntos Críticos del Negocio (Infracciones Graves)
  criticalFaultsApplied?: string[];
  criticalFaultsNotes?: string;
  isCriticalFail?: boolean;
  criticalPenaltyPct?: number;
  finalScoreOverride?: number;
}

export interface XpEvent {
  id: string;
  agentId: string;
  title: string;
  description: string;
  xpYield: number;
  type: 'eval' | 'cert' | 'bonus' | 'penalty';
  date: string;
  evalReferenceId?: string;
  evalData?: AgentEvaluation;
}

export interface ActionPlanItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Evidence {
  subId: string;
  text: string;
  updatedAt?: string;
}

export interface Agent {
  id: string;
  name: string;
  initials?: string; // Siglas oficiales de identificación
  avatar: string;
  avatarBg?: string; // Color de fondo personalizado del avatar por defecto
  role: string;
  team: string;
  tierId: string;
  currentXp: number;
  baseXp?: number;
  previousSprintXp?: number;
  dimensionScores: DimensionScores;
  achievements: string[]; // Achievement IDs
  certifications?: string[]; // Certification IDs
  certProgress?: Record<string, CertProgress>;
  performanceMetrics?: {
    fcr?: number;
    escalationRate?: number;
    csat?: number;
    reopenRate?: number;
  };
  scrumLogs: ScrumTask[];
  xpEvents: XpEvent[];
  skills?: string[];
  specialties?: string[];
  improvementAreas?: string[];
  painPoints?: string[];
  actionPlan?: ActionPlanItem[];
  evidence?: Evidence[];
  email?: string;
  status?: string;
  evaluationsCount?: number; // Number of historical weekly evaluations performed
  evaluationsHistory?: AgentEvaluation[];
  xpBreakdown?: {
    performanceScore: number;
    attendanceScore: number;
    eventXp?: number;
    evaluationsScore?: number;
    evaluationsCount?: number;
    baseXp?: number;
    previousSprintScore?: number;
    completedTickets: number;
    ticketsScore?: number;
    tareasCompletadas?: number;
    tareasScore?: number;
    evaluacionesCompletadas?: number;
    escalacionesCompletadas?: number;
    escalacionesScore?: number;
    visitasCompletadas?: number;
    visitasScore?: number;
    workingTickets: number;
    pendingTickets: number;
    asignados?: number;
    cargaTrabajo?: string;
    aporteRes?: number;
    cargaGlobalRoster?: number;
    eficienciaEquipo?: number;
    resolucionGlobal?: number;
    indiceFoco?: number;
    sprintMetricsScore?: number;
    cargaScore?: number;
    aporteScore?: number;
    globalLoadScore?: number;
    efficiencyScore?: number;
    resolucionGlobalScore?: number;
    indiceFocoScore?: number;
    impactoRosterScore?: number;
    impactoRosterText?: string;
    earlyCheckIns: number;
    onTimeCheckIns: number;
    graceCheckIns: number;
    lateCheckIns: number;
    missingCheckIns: number;
    attendanceDetail: Array<{
      fecha: string;
      checkIn: string;
      expectedCheckIn: string;
      points: number;
      estado: string;
    }>;
  };
}

export interface AgentProfile {
  agentId: string;
  skills: string[];
  specialties: string[];
  improvementAreas: string[];
  painPoints: string[];
  actionPlan: ActionPlanItem[];
}


export type CertificationImportance = 'low' | 'medium' | 'high' | 'core' | 'critical' | 'nice_to_have';

export interface CertProgress {
  evalId?: string;
  certId: string;
  testPassed: boolean;
  testScore?: string;
  appliedInWork: boolean;
  appliedInWorkNotes?: string;
  expositionScheduled: boolean;
  expositionDate?: string;
  expositionTopic?: string;
  expositionFeedback?: string;
  expositionStatus?: 'pending' | 'scheduled' | 'completed';
  expositionEvaluator?: string;
  finalFeedback?: string;
  completed: boolean;
}

export interface Certification {
  id: string;
  title: string;
  description: string;
  iconName?: string;
  dimension: DimensionType;
  targetTiers: string[];
  status: 'published' | 'draft' | 'archived';
  importance?: CertificationImportance;
  points?: number;
  requirementDoc: {
    suceso: string;
    accion: string;
    conclusion: string;
  };
  enrolledAgentIds?: string[];
  completedAgentIds?: string[];
}

export interface TierConfig {
  id: string;
  name: string;
  minXp: number;
  maxXp: number;
  badgeName: string;
  colorHex: string;
  desc: string;
  requiredKpiAvg: number; // minimum average kpi score to rank up
  eligibleKpis?: DimensionType[]; // the active dimensions for this tier
  weights: {
    knowledge: number;
    execution: number;
    relational: number;
    collaborative: number;
    control: number;
  };
}

export interface InternalTask {
  id: string;
  title: string;
  assignedToId: string;
  type: 'Interna' | 'Programada' | 'Recurrente';
  frequency?: 'Única' | 'Diario' | 'Semanal' | 'Mensual' | 'Anual';
  scheduledDate: string;
  ticketId: string;
  status: 'Pendiente' | 'En proceso' | 'Completado';
  notes: string;
  completionReport?: string;
  completedDate?: string;
  CompletedDate?: string;
  recurrenceDayOfWeek?: string;
  recurrenceDayOfMonth?: number;
  recurrenceMonthOfYear?: number;
  hasNoDate?: boolean;
  hasEndDate?: boolean;
  recurrenceEndDate?: string;
  priority?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  subtasks?: Array<{ id: string; title: string; completed: boolean; assigneeId?: string; assigneeIds?: string[]; startDate?: string; dueDate?: string; description?: string }>;
  checklists?: Array<{
    id: string;
    title: string;
    items: Array<{
      id: string;
      title: string;
      completed: boolean;
      assigneeId?: string;
      assigneeIds?: string[];
      startDate?: string;
      dueDate?: string;
      description?: string;
    }>;
  }>;
  category?: string;
  effortEstimate?: string;
  scheduledTime?: string;
  secondaryDates?: string[];
  recurrenceDays?: string[];
  powerTools?: string[]; // list of enabled power tools, e.g. ['checklist', 'timeline', 'documentation', 'sales']
  timeline?: Array<{ id: string; timestamp: string; title: string; note: string; author: string }>;
  documentation?: string;
  recurrenceConfig?: RecurrenceConfig;
  salesQuotes?: SalesQuote[];
  negotiationStatus?: string; // e.g. 'Contacto Inicial', 'Definición de Requerimientos', 'Propuesta Enviada', 'En Negociación', 'Cierre y Contrato', 'Declinada'
  negotiationLog?: Array<{
    id: string;
    date: string;
    type: 'Reunión' | 'Llamada' | 'Correo' | 'Acuerdo' | 'Nota';
    title: string;
    notes: string;
    author: string;
  }>;
  commercialTerms?: {
    paymentTerms?: string;
    deliveryTime?: string;
    sla?: string;
    warranty?: string;
    exclusions?: string;
  };
  // Visual/Screenshots metadata
  items?: Array<{ name: string; qty: number; price: number; tag: string }>;
  createdDate?: string;
  version?: string;
  scope?: 'Cliente' | 'Interna';
  showInBitacora?: boolean;
  clientName?: string;
  clientRole?: string;
  assignedRole?: string;
}

export interface ContractorTask {
  id: string;
  title: string;
  contractorName: string;
  supervisorAgentId: string;
  ticketId: string;
  status: 'Asignado a Contratista' | 'En proceso por Contratista' | 'Revisión por Supervisor' | 'Completado';
  priority?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  startDate: string;
  dueDate: string;
  notes: string;
  followUpNotes?: string;
  completionNotes?: string;
  contractorType?: 'Agente Contratista' | 'Proveedor de Servicio';
  contractorSpecialty?: string;
  // Visual/Screenshots metadata
  items?: Array<{ name: string; qty: number; price: number; tag: string }>;
  createdDate?: string;
  version?: string;
  clientName?: string;
  clientRole?: string;
  assignedRole?: string;
}

export interface ExternalEscalation {
  id: string;
  ticketId: string; // ID del requerimiento CRM
  title: string; // Asunto / Detalle
  assignedAgentId: string; // Técnico supervisor del Roster
  contractorName: string; // Grupo / Contratista externo asignado
  status: 'Aprobación Pendiente' | 'Espera de Pedido / Cotización' | 'Materiales en Tránsito' | 'En Cola de Programación' | 'Promovido a Visita';
  creationDate: string;
  expectedDate?: string;
  notes: string;
  account?: string;
  contact?: string;
}

export interface CalendarEvent {
  id: string;
  agentId: string;
  type: 'guardia' | 'chat' | 'alerta' | 'ausencia' | 'externo';
  date: string; // YYYY-MM-DD
  note: string;
}

export interface IsolatedEvent {
  id: string;
  agentId: string;
  title: string;
  date: string;
  type: 'Personal' | 'Guardia' | 'Capacitación' | 'Otro';
  notes?: string;
  intensity: number; // 1-5 for workload
}

export interface JornadaRow {
  idAgente: string;
  nombreAgente: string;
  lunes: string;
  martes: string;
  miercoles: string;
  jueves: string;
  viernes: string;
  sabado: string;
  domingo: string;
  diaRemoto: string;
  turnoAsignado: string;
  ultimaActualizacion: string;
}

export interface AsistenciaRow {
  id: string;
  fecha: string;
  idAgente: string;
  nombreAgente: string;
  checkIn: string;
  checkOut: string;
  estado: string;
  ultimaActualizacion: string;
}

export interface DesignationHistoryLog {
  idAgente: string;
  nombreAgente: string;
  fechaInicio: string;
  fechaFin: string;
  asignadoPor: string;
  ultimaActualizacion: string;
}

export interface SpecialDutyDoc {
  currentAgentId: string;
  currentAgentName: string;
  history: DesignationHistoryLog[];
  updatedAt: string;
}

export interface DesignationRow {
  idDesignacion: string;
  tipo: 'Guardia' | 'Chat' | 'Alertas' | string;
  fechaInicio: string;
  fechaFin: string;
  idAgente: string;
  nombreAgente: string;
  asignadoPor: string;
  ultimaActualizacion: string;
}

export interface AusenciaRow {
  idSolicitud: string;
  idAgente: string;
  nombreAgente: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  estado: string;
  fechaSolicitud: string;
  solicitadoPor: string;
  revisadoPor?: string;
  fechaRevision?: string;
  notas?: string;
  duracionTipo?: 'Día Completo' | 'Medio Día (Mañana)' | 'Medio Día (Tarde)' | 'Horario Específico';
  horaInicio?: string;
  horaFin?: string;
}

export interface CRMData {
  headers: string[];
  rows: Record<string, string>[];
}

export interface OperativoTareasResult {
  internalTasks: InternalTask[];
  contractorTasks: ContractorTask[];
}



export interface Collaboration {
  id: string;
  ticketId: string;
  ticketTitle: string;
  assignedToId: string; // The owner
  collaboratorId: string; // The person assisting
  status: 'Solicitada' | 'En Curso' | 'Completada' | 'Rechazada';
  rejectionReason?: string;
  notes: string;
  createdAt: string;
  completedAt?: string;
  acceptedAt?: string;
  acceptedByAdminName?: string;
  priority?: 'Baja' | 'Media' | 'Alta' | 'Crítica';
  type?: 'Asistencia' | 'Escalación' | 'Transferencia' | 'Consulta';
  account?: string;
  contact?: string;
  expectedOutcome?: string;
  resolutionNotes?: string;
  updates?: { id: string; date: string; text: string; authorId: string }[];
}

export interface Contractor {
  id: string;
  name: string;
  type: 'Agente Contratista' | 'Proveedor de Servicio';
  specialty: string;
  email: string;
  phone: string;
  status: 'Activo' | 'Inactivo' | 'Bajo Revisión';
  registeredAt: string;
  taxId?: string;
  slaTarget: number;
  supervisorAgentId: string;
  notes?: string;
  documents?: {
    contractSigned: boolean;
    ndaSigned: boolean;
    taxCertificate: boolean;
    identityVerified: boolean;
  };
  audits?: {
    id: string;
    date: string;
    metric: string;
    score: number;
    auditedBy: string;
    feedback: string;
  }[];
}

export interface RecurrenceConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval?: number;
  startDate: string;
  creationDelayDays?: number;
  nextExecutionDate: string;
  nextCreationDate: string;
  involvedAgentIds: string[];
  includePrebuiltChecklists?: string[];
  customChecklistItems?: string[];
  customChecklists?: Array<{
    id: string;
    title: string;
    items: string[];
  }>;
  includeWikiDocs?: string[];
  keepHistoryInTimeline?: boolean;
  parentTaskId?: string;
  iterationNumber?: number;
  pastIterationsHistory?: Array<{
    taskId: string;
    completedAt: string;
    completedBy: string;
    executionDate: string;
    iteration: number;
  }>;
}

export interface SalesQuote {
  id: string;
  clientName: string;
  clientEmail?: string;
  date: string;
  validUntil: string;
  status: 'Borrador' | 'Enviada' | 'Aceptada' | 'Rechazada';
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    discount?: number; // percentage
  }>;
  taxRate: number; // percentage
  notes?: string;
  subtotal: number;
  total: number;
}



