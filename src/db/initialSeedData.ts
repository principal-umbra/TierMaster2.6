import { 
  JornadaRow, 
  AsistenciaRow, 
  DesignationRow, 
  AusenciaRow, 
  InternalTask, 
  ContractorTask, 
  IsolatedEvent 
} from '../types';

// =========================================================================
// 1. JORNADAS PREDETERMINADAS (Gestión Operativa - Jornada)
// =========================================================================
export const DEFAULT_JORNADAS: JornadaRow[] = [
  {
    idAgente: 'AG-FR-765',
    nombreAgente: 'Francisco Ramirez',
    lunes: '08:00 - 17:00',
    martes: '08:00 - 17:00',
    miercoles: '08:00 - 17:00',
    jueves: '08:00 - 17:00',
    viernes: '08:00 - 17:00',
    sabado: 'Libre',
    domingo: 'Libre',
    diaRemoto: 'Miércoles',
    turnoAsignado: 'Mañana - Grupo A',
    ultimaActualizacion: new Date().toISOString()
  },
  {
    idAgente: 'AG-HH-691',
    nombreAgente: 'Hendel Herrera',
    lunes: '08:00 - 17:00',
    martes: '08:00 - 17:00',
    miercoles: '08:00 - 17:00',
    jueves: '08:00 - 17:00',
    viernes: '08:00 - 17:00',
    sabado: 'Libre',
    domingo: 'Libre',
    diaRemoto: 'Jueves',
    turnoAsignado: 'Mañana - Grupo A',
    ultimaActualizacion: new Date().toISOString()
  },
  {
    idAgente: 'AG-RB-101',
    nombreAgente: 'Rafael Bello',
    lunes: '08:00 - 17:00',
    martes: '08:00 - 17:00',
    miercoles: '08:00 - 17:00',
    jueves: '08:00 - 17:00',
    viernes: '08:00 - 17:00',
    sabado: 'Libre',
    domingo: 'Libre',
    diaRemoto: 'Martes',
    turnoAsignado: 'Mañana - Grupo B',
    ultimaActualizacion: new Date().toISOString()
  },
  {
    idAgente: 'AG-RP-509',
    nombreAgente: 'Robert Pichardo',
    lunes: '09:00 - 18:00',
    martes: '09:00 - 18:00',
    miercoles: '09:00 - 18:00',
    jueves: '09:00 - 18:00',
    viernes: '09:00 - 18:00',
    sabado: 'Libre',
    domingo: 'Libre',
    diaRemoto: 'Viernes',
    turnoAsignado: 'Tarde - Grupo Cloud',
    ultimaActualizacion: new Date().toISOString()
  },
  {
    idAgente: 'AG-AD-712',
    nombreAgente: 'Andri Dominguez',
    lunes: '08:00 - 17:00',
    martes: '08:00 - 17:00',
    miercoles: '08:00 - 17:00',
    jueves: '08:00 - 17:00',
    viernes: '08:00 - 17:00',
    sabado: 'Libre',
    domingo: 'Libre',
    diaRemoto: 'Lunes',
    turnoAsignado: 'Mañana - Grupo B',
    ultimaActualizacion: new Date().toISOString()
  },
  {
    idAgente: 'AG-RQ-371',
    nombreAgente: 'Raymond Quintana',
    lunes: '08:00 - 17:00',
    martes: '08:00 - 17:00',
    miercoles: '08:00 - 17:00',
    jueves: '08:00 - 17:00',
    viernes: '08:00 - 17:00',
    sabado: 'Libre',
    domingo: 'Libre',
    diaRemoto: 'Lunes',
    turnoAsignado: 'DBA & Core Coord',
    ultimaActualizacion: new Date().toISOString()
  }
];

// =========================================================================
// 2. ASISTENCIAS PREDETERMINADAS
// =========================================================================
export const DEFAULT_ASISTENCIAS: AsistenciaRow[] = [
  {
    id: '2026-07-06_AG-FR-765',
    fecha: '2026-07-06',
    idAgente: 'AG-FR-765',
    nombreAgente: 'Francisco Ramirez',
    checkIn: '08:01',
    checkOut: '17:05',
    estado: 'Presente',
    ultimaActualizacion: new Date().toISOString()
    },
  {
    id: '2026-07-06_AG-HH-691',
    fecha: '2026-07-06',
    idAgente: 'AG-HH-691',
    nombreAgente: 'Hendel Herrera',
    checkIn: '07:58',
    checkOut: '17:01',
    estado: 'Presente',
    ultimaActualizacion: new Date().toISOString()
    },
  {
    id: '2026-07-06_AG-RB-101',
    fecha: '2026-07-06',
    idAgente: 'AG-RB-101',
    nombreAgente: 'Rafael Bello',
    checkIn: '08:12',
    checkOut: '17:00',
    estado: 'Retraso',
    ultimaActualizacion: new Date().toISOString()
    }
];

// =========================================================================
// 3. DESIGNACIONES PREDETERMINADAS (Gestion Operativa - Designaciones)
// =========================================================================
export const DEFAULT_DESIGNATIONS: DesignationRow[] = [
  {
    idDesignacion: 'DES-001',
    tipo: 'Guardia Sabatina',
    fechaInicio: '2026-07-11',
    fechaFin: '2026-07-11',
    idAgente: 'AG-FR-765',
    nombreAgente: 'Francisco Ramirez',
    asignadoPor: 'admin@fhons.com.do',
    ultimaActualizacion: new Date().toISOString()
  },
  {
    idDesignacion: 'DES-002',
    tipo: 'Soporte Extraordinario Mantenimiento',
    fechaInicio: '2026-07-08',
    fechaFin: '2026-07-09',
    idAgente: 'AG-RP-509',
    nombreAgente: 'Robert Pichardo',
    asignadoPor: 'admin@fhons.com.do',
    ultimaActualizacion: new Date().toISOString()
  }
];

// =========================================================================
// 4. AUSENCIAS PREDETERMINADAS (Gestion Operativa - Ausencias y Vacaciones)
// =========================================================================
export const DEFAULT_AUSENCIAS: AusenciaRow[] = [];

// =========================================================================
// 5. TAREAS INTERNAS PREDETERMINADAS (Gestion Operativa - Tareas)
// =========================================================================
export const DEFAULT_INTERNAL_TASKS: InternalTask[] = [];

// =========================================================================
// 6. TAREAS DE CONTRATISTAS PREDETERMINADAS
// =========================================================================
export const DEFAULT_CONTRACTOR_TASKS: ContractorTask[] = [];

// =========================================================================
// 7. EVENTOS AISLADOS PREDETERMINADOS (Gestion Operativa - Eventos)
// =========================================================================
export const DEFAULT_EVENTS: IsolatedEvent[] = [];

// =========================================================================
// 8. EVALUACIONES PREDETERMINADAS (Vacío para solo permitir evaluaciones reales)
// =========================================================================
export const DEFAULT_EVALUATIONS: any[] = [];

// =========================================================================
// 9. HISTORIAL DAILY SCRUM PREDETERMINADO (Historial - Daily Scrum)
// =========================================================================
export const DEFAULT_DAILY_SCRUMS = [
  {
    id: 'scrum_001',
    agentId: 'AG-FR-765',
    agentName: 'Francisco Ramirez',
    date: '2026-07-06',
    ayer: 'Resolví ticket CRM-27121 y documenté la solución.',
    hoy: 'Trabajaré en la configuración de la red VPN corporativa.',
    bloqueos: 'Ninguno.',
    notes: 'Todo marchando según lo planificado.',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'scrum_002',
    agentId: 'AG-HH-691',
    agentName: 'Hendel Herrera',
    date: '2026-07-06',
    ayer: 'Audité logs del servidor de desarrollo para detectar fugas de memoria.',
    hoy: 'Configuraré el firewall perimetral para el nuevo segmento.',
    bloqueos: 'Esperando aprobación de puertos por el CEO.',
    notes: 'Bloqueo moderado.',
    lastUpdated: new Date().toISOString()
  }
];

// =========================================================================
// 10. TICKETS BACKLOG CRM PREDETERMINADOS (Request Backlog - CRM)
// =========================================================================
export const DEFAULT_CRM_TICKETS = [
  {
    "ID": "27121",
    "Account": "F.H.O.N.S.",
    "Contact": "Christian Fernández",
    "Subject": "FHONS - Configuración Inicial",
    "Status": "01 Abierto y Pendiente",
    "Priority": "Baja",
    "Assigned To": "Francisco Ramirez",
    "Created Date": "31/07/2025 14:38",
    "Request Type": "Soporte Técnico"
  },
  {
    "ID": "29040",
    "Account": "F.H.O.N.S.",
    "Contact": "Christian Fernández",
    "Subject": "FHONS - Implementación de API",
    "Status": "02 En Proceso",
    "Priority": "Normal",
    "Assigned To": "Francisco Ramirez",
    "Created Date": "21/10/2025 18:41",
    "Request Type": "Desarrollo"
  },
  {
    "ID": "30102",
    "Account": "F.H.O.N.S.",
    "Contact": "Robert Pichardo",
    "Subject": "FHONS - Caída de DNS Principal",
    "Status": "01 Abierto y Pendiente",
    "Priority": "Crítica",
    "Assigned To": "Robert Pichardo",
    "Created Date": "05/07/2026 10:15",
    "Request Type": "Servicios Cloud"
  },
  {
    "ID": "30105",
    "Account": "Cliente Externo S.A.",
    "Contact": "Ing. Juan Pérez",
    "Subject": "Problema de Enrutamiento de VLAN Sede Santiago",
    "Status": "01 Abierto y Pendiente",
    "Priority": "Alta",
    "Assigned To": "Hendel Herrera",
    "Created Date": "06/07/2026 09:30",
    "Request Type": "Soporte de Redes"
  }
];
