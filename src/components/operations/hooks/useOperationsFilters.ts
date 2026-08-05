import { useState, useEffect } from 'react';

export const useOperationsFilters = (initialSubTab?: string) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'administracion' | 'jornada' | 'asistencia' | 'ausencias' | 'externo' | 'calendario'>(initialSubTab as any || 'dashboard');
  
  // Calendar Filters & Layers
  const [calendarFilters, setCalendarFilters] = useState({
    general: true,      // Tareas, Designaciones, Ausencias equipo
    particular: true,   // Eventos aislados, tareas asignadas específicamente
    tasks: true,
    absences: true,
    designations: true,
    isolated: true
  });
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'agenda'>('month');
  const [isEventDrawerOpen, setIsEventDrawerOpen] = useState(false);
  const [selectedAgendaItem, setSelectedAgendaItem] = useState<any | null>(null);
  const [bitacoraPage, setBitacoraPage] = useState(1);
  const BITACORA_PAGE_SIZE = 10;

  const [adminSubTab, setAdminSubTab] = useState<'cobertura' | 'jornada' | 'asistencia' | 'solicitudes'>('cobertura');
  const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
  const [revealedReasons, setRevealedReasons] = useState<Record<string, boolean>>({});

  const toggleReason = (id: string) => setRevealedReasons(p => ({ ...p, [id]: !p[id] }));

  // Weekly schedule modal states
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [tempWeeklySchedule, setTempWeeklySchedule] = useState<{ [day: string]: any } | null>(null);
  const [drawerAgentId, setDrawerAgentId] = useState<string | null>(null);

  // Sync subtab if prop changes from outside
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab as any);
    }
  }, [initialSubTab]);

  return {
    activeSubTab,
    setActiveSubTab,
    calendarFilters,
    setCalendarFilters,
    calendarViewMode,
    setCalendarViewMode,
    isEventDrawerOpen,
    setIsEventDrawerOpen,
    selectedAgendaItem,
    setSelectedAgendaItem,
    bitacoraPage,
    setBitacoraPage,
    BITACORA_PAGE_SIZE,
    adminSubTab,
    setAdminSubTab,
    hoveredStatus,
    setHoveredStatus,
    revealedReasons,
    setRevealedReasons,
    toggleReason,
    editingAgentId,
    setEditingAgentId,
    tempWeeklySchedule,
    setTempWeeklySchedule,
    drawerAgentId,
    setDrawerAgentId
  };
};
