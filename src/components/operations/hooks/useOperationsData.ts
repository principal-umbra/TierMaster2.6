import { useState, useEffect } from 'react';
import { AgentDutyState, SpecialDutyAssignment, AbsenceRecord, AbsenceRequest, CalendarEvent } from '../types';
import { createDefaultWeeklySchedule } from '../utils/helpers';
import { subscribeToDesignations } from '../../../db/firebaseService';

export const useOperationsData = (agents: any[], currentAgentId: string) => {
  const [dutyStates, setDutyStates] = useState<AgentDutyState[]>(() => {
    let initial: AgentDutyState[] = [];
    const saved = localStorage.getItem('tm_ops_duty_states');
    if (saved) {
      try { initial = JSON.parse(saved); } catch (e) {}
    }
    
    // Sync with current agents (add missing ones and preserve loaded/current status)
    const synced = agents.map((agent, index) => {
       const existing = initial.find(s => s.agentId === agent.id);
       if (existing) {
         return {
           ...existing,
           status: (agent.status as AgentDutyState['status']) || existing.status || 'Disponible'
         };
       }
       
       let status: AgentDutyState['status'] = (agent.status as AgentDutyState['status']) || 'Disponible';
       
       return {
         agentId: agent.id,
         status,
         checkInTime: null,
         checkOutTime: null,
         workSchedule: index % 2 === 0 ? '08:00 - 17:00' : '09:00 - 18:00',
         weeklySchedule: createDefaultWeeklySchedule('08:00 - 17:00')
       };
    });
    
    return synced;
  });

  useEffect(() => {
     setDutyStates(prev => {
        let hasChanges = false;
        const next = prev.map(existingState => {
           // PROTECTION: Never let external/parent updates overwrite the logged-in agent's own status
           if (currentAgentId && existingState.agentId === currentAgentId) {
              return existingState;
           }
           const agent = agents.find(a => a.id === existingState.agentId);
           if (agent && agent.status && agent.status !== existingState.status) {
              hasChanges = true;
              return { ...existingState, status: agent.status as AgentDutyState['status'] };
           }
           return existingState;
        });

        const brandNew: AgentDutyState[] = [];
        agents.forEach((agent) => {
           const existing = next.find(s => s.agentId === agent.id);
           if (!existing) {
              hasChanges = true;
              brandNew.push({
                 agentId: agent.id,
                 status: (agent.status as AgentDutyState['status']) || 'Disponible',
                 checkInTime: null,
                 checkOutTime: null,
                 workSchedule: '08:00 - 17:00',
                 weeklySchedule: createDefaultWeeklySchedule('08:00 - 17:00')
              });
           }
        });

        return hasChanges ? [...next, ...brandNew] : prev;
     });
  }, [agents, currentAgentId]);

  const [hasLoadedDesignaciones, setHasLoadedDesignaciones] = useState(false);
  const [hasLoadedJornada, setHasLoadedJornada] = useState(false);
  const [hasLoadedAusencias, setHasLoadedAusencias] = useState(false);
  
  const [asistencia, setAsistencia] = useState<any[]>([]);
  const [selectedAsistenciaDate, setSelectedAsistenciaDate] = useState(new Date().toISOString().split('T')[0]);
  const [hasLoadedAsistencia, setHasLoadedAsistencia] = useState(false);
  const [isSyncingAsistencia, setIsSyncingAsistencia] = useState(false);

  return {
    dutyStates,
    setDutyStates,
    hasLoadedDesignaciones,
    setHasLoadedDesignaciones,
    hasLoadedJornada,
    setHasLoadedJornada,
    hasLoadedAusencias,
    setHasLoadedAusencias,
    asistencia,
    setAsistencia,
    selectedAsistenciaDate,
    setSelectedAsistenciaDate,
    hasLoadedAsistencia,
    setHasLoadedAsistencia,
    isSyncingAsistencia,
    setIsSyncingAsistencia
  };
};
