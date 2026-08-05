import React from 'react';
import { Agent, InternalTask, ContractorTask, IsolatedEvent } from '../../../types';
export type { Agent, InternalTask, ContractorTask, IsolatedEvent };

export interface OperationsTabProps {
  agents: Agent[];
  currentUser?: { username: string; name: string; email: string; role?: string } | null;
  hideNavBar?: boolean;
  hideGestionOperativa?: boolean;
  initialSubTab?: 'dashboard' | 'administracion' | 'jornada' | 'asistencia' | 'ausencias' | 'externo' | 'calendario';
  onUpdateAgent?: (updatedAgent: Agent) => void;
  internalTasks: InternalTask[];
  setInternalTasks: React.Dispatch<React.SetStateAction<InternalTask[]>>;
  contractorTasks: ContractorTask[];
  setContractorTasks: React.Dispatch<React.SetStateAction<ContractorTask[]>>;
  isolatedEvents: IsolatedEvent[];
  setIsolatedEvents: React.Dispatch<React.SetStateAction<IsolatedEvent[]>>;
  comingSoonConfig?: Record<string, boolean>;
}

export interface DailySchedule {
  start: string;
  end: string;
  isRemote: boolean;
  isActive: boolean;
}

export interface AgentDutyState {
  agentId: string;
  status: 'Disponible' | 'En llamada' | 'Ocupado' | 'En almuerzo' | 'En reunión' | 'En capacitación' | 'Fuera de oficina' | 'Finalizó su jornada';
  checkInTime: string | null;
  checkOutTime: string | null;
  workSchedule: string; // e.g. "08:00 - 17:00"
  weeklySchedule?: {
    [day: string]: DailySchedule;
  };
}

export interface SpecialDutyAssignment {
  guardiaId: string; // Agent ID
  chatId: string;    // Agent ID
  alertasId: string; // Agent ID
  assignedDate: string; // YYYY-MM-DD
}

export interface AbsenceRecord {
  id: string;
  agentId: string;
  type: 'Vacaciones' | 'Permiso' | 'Licencia' | 'Ausencia Programada' | 'Trabajo Remoto';
  startDate: string;
  endDate: string;
  reason: string;
  approvedBy: string;
  duracionTipo?: 'Día Completo' | 'Medio Día (Mañana)' | 'Medio Día (Tarde)' | 'Horario Específico';
  horaInicio?: string;
  horaFin?: string;
}

export interface AbsenceRequest {
  id: string;
  agentId: string;
  type: 'Vacaciones' | 'Permiso' | 'Licencia' | 'Ausencia Programada' | 'Trabajo Remoto';
  startDate: string;
  endDate: string;
  reason: string;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  requestedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  solicitadoPor?: string;
  notas?: string;
  duracionTipo?: 'Día Completo' | 'Medio Día (Mañana)' | 'Medio Día (Tarde)' | 'Horario Específico';
  horaInicio?: string;
  horaFin?: string;
}

export interface ExternalWorkRecord {
  id: string;
  agentId: string;
  type: 'Instalaciones' | 'Visitas a clientes' | 'Mantenimientos' | 'Levantamientos técnicos' | 'Soporte presencial' | 'Compras operativas';
  destination: string;
  reason: string;
  contactName?: string;
  contactPhone?: string;
  vehicleUsed?: string;
  initialKm?: number;
  finalKm?: number;
  departureTime: string;
  arrivalTime?: string | null;
  returnTime: string | null; // null if still active
  durationMinutes: number | null;
  status: 'En tránsito' | 'En sitio' | 'Completado';
  reportNotes?: string;
  followUpRequired?: boolean;
}

export interface CalendarEvent {
  id: string;
  agentId: string;
  type: 'guardia' | 'chat' | 'alerta' | 'ausencia' | 'externo';
  date: string; // YYYY-MM-DD
  note: string;
}
