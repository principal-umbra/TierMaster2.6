import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { clearAllDailyScrumBoards } from '../../db/firebaseService';
import { 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  Users, 
  BarChart3, 
  Download, 
  ShieldAlert, 
  Sparkles,
  Search,
  Filter,
  Calendar,
  Layers,
  Send,
  Check,
  User,
  Info,
  List,
  LayoutGrid
} from 'lucide-react';
import { Agent } from '../../types';
import { safeLocalStorageSet, debouncedSafeSetItem } from '../../lib/storage';
import { safeDispatchEvent } from '../../lib/events';

interface DailyAdminUseTabProps {
  agents: Agent[];
}

interface TeamWorkspaceItem {
  agentId: string;
  agentName: string;
  agentEmail: string;
  id: string;
  ticketNo: string;
  title: string;
  category: 'Incidente' | 'Requerimiento' | 'Cambio' | 'Otro';
  column: 'yesterday' | 'today' | 'blocked';
  priority: 'Baja' | 'Media' | 'Alta';
  followUpDate?: string;
  hasReminder?: boolean;
  delayDays?: number;
}

export default function DailyAdminUseTab({ agents }: DailyAdminUseTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('all');
  
  // Views and Sorting States
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [sortBy, setSortBy] = useState<'agent' | 'ticket' | 'category' | 'priority' | 'followUp' | 'status'>('agent');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // State to hold all team items
  const [allTeamItems, setAllTeamItems] = useState<TeamWorkspaceItem[]>([]);
  const [coachingAlerts, setCoachingAlerts] = useState<{ id: string; agentName: string; ticket: string; message: string; date: string }[]>([]);
  const [sentAlertToast, setSentAlertToast] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load and seed team workspaces if empty
  useEffect(() => {
    // 1. Discover existing workspaces in localStorage
    const discoveredItems: TeamWorkspaceItem[] = [];
    const discoveredUsernames = new Set<string>();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fhons_workspace_kanban_items')) {
        let username = key.replace('fhons_workspace_kanban_items', '');
        if (username.startsWith('_')) {
          username = username.substring(1);
        }
        if (!username) {
          username = 'admin';
        }
        
        discoveredUsernames.add(username.toLowerCase().trim());

        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              // Limpiar datos falsos residuales de la caché anterior
              const mockIds = ['item_1', 'item_2', 'item_delayed_1', 'item_3', 'item_4', 'completed_1', 'deleted_1'];
              const realTasks = parsed.filter(t => !t.id || (!t.id.toString().startsWith('seed_task_') && !mockIds.includes(t.id.toString())));
              
              if (realTasks.length !== parsed.length) {
                // Actualizar localStorage sin los datos falsos
                safeLocalStorageSet(key, JSON.stringify(realTasks));
              }

              // Find agent associated with this username/id

              const matchedAgent = agents.find(
                a => a.id.toLowerCase().trim() === username.toLowerCase().trim() ||
                     a.name.toLowerCase().trim() === username.toLowerCase().trim() ||
                     a.email?.toLowerCase().trim().startsWith(username.toLowerCase().trim())
              );
              
              realTasks.forEach((item: any) => {
                discoveredItems.push({
                  agentId: matchedAgent?.id || username,
                  agentName: matchedAgent?.name || username,
                  agentEmail: matchedAgent?.email || `${username}@fhons.com.do`,
                  id: item.id,
                  ticketNo: item.ticketNo || '#INC-MOCK',
                  title: item.title || 'Tarea diaria',
                  category: item.category || 'Otro',
                  column: item.column || 'today',
                  priority: item.priority || 'Media',
                  followUpDate: item.followUpDate,
                  hasReminder: item.hasReminder,
                  delayDays: item.delayDays
                });
              });
            }
          }
        } catch (e) {
          console.error('Error parsing team workspace:', e);
        }
      }
    }

    setAllTeamItems(discoveredItems);

    // Load any alerts
    const cachedAlerts = localStorage.getItem('fhons_admin_sent_alerts');
    if (cachedAlerts) {
      try { setCoachingAlerts(JSON.parse(cachedAlerts)); } catch (e) {}
    } else {
      // No initial dummy alerts
      setCoachingAlerts([]);
      safeLocalStorageSet('fhons_admin_sent_alerts', JSON.stringify([]));
    }

    const handleWorkspaceCleared = () => {
      setAllTeamItems([]);
    };
    window.addEventListener('workspaceCleared', handleWorkspaceCleared);


    return () => {
      window.removeEventListener('workspaceCleared', handleWorkspaceCleared);
    };
  }, [agents]);

  // Handle manual alert reminder trigger
  const sendAlertReminder = useCallback((item: TeamWorkspaceItem, customMsg?: string) => {
    const defaultMsg = `Alerta Administrativa: El ticket ${item.ticketNo} está bloqueado por impedimento y su fecha de seguimiento expiró o requiere atención inmediata. Favor actualizar estatus o coordinar escalación.`;
    const message = customMsg || defaultMsg;
    
    const newAlert = {
      id: Math.random().toString(36).substr(2, 9),
      agentName: item.agentName,
      ticket: item.ticketNo,
      message: message,
      date: new Date().toISOString().split('T')[0]
    };

    setCoachingAlerts(prev => {
      const updatedAlerts = [newAlert, ...prev];
      safeLocalStorageSet('fhons_admin_sent_alerts', JSON.stringify(updatedAlerts));
      return updatedAlerts;
    });

    // Also persist this directly inside the user's specific notifications / local alerts queue!
    const userNotificationsKey = `fhons_user_alerts_${item.agentId.toLowerCase().trim()}`;
    const userAlerts = localStorage.getItem(userNotificationsKey);
    let userAlertsList = [];
    if (userAlerts) {
      try { userAlertsList = JSON.parse(userAlerts); } catch (e) {}
    }
    userAlertsList.unshift({
      id: newAlert.id,
      title: `Alerta de Scrum Master / Admin`,
      message: message,
      ticketNo: item.ticketNo,
      date: newAlert.date,
      read: false
    });
    safeLocalStorageSet(userNotificationsKey, JSON.stringify(userAlertsList));

    setSentAlertToast(`¡Alerta de seguimiento enviada con éxito a ${item.agentName}!`);
    setTimeout(() => {
      setSentAlertToast(null);
    }, 4000);
  }, []);

  // CSV Export simulator
  const exportScrumDataCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Agente,Email,Ticket,Titulo,Categoria,Estado,Prioridad,Fecha Seguimiento\r\n';
    
    allTeamItems.forEach(item => {
      csvContent += `"${item.agentName}","${item.agentEmail}","${item.ticketNo}","${item.title.replace(/"/g, '""')}","${item.category}","${item.column === 'yesterday' ? 'Ayer (Completada)' : item.column === 'today' ? 'Hoy (Activa)' : 'Bloqueado'}","${item.priority}","${item.followUpDate || 'N/A'}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'scrum_team_workspace_report.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAbsoluteDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('fhons_workspace_')) {
            localStorage.removeItem(key);
        }
    }
    setAllTeamItems([]);
    try {
      await clearAllDailyScrumBoards();
    } catch(err) {
      console.error('Error in clearAllDailyScrumBoards:', err);
    }
    safeDispatchEvent('workspaceCleared');
    setShowDeleteConfirm(false);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return allTeamItems.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchLower) || 
                            item.ticketNo.toLowerCase().includes(searchLower) ||
                            item.agentName.toLowerCase().includes(searchLower);
      
      const matchesAgent = selectedAgentFilter === 'all' || item.agentId === selectedAgentFilter;
      const matchesCategory = selectedCategoryFilter === 'all' || item.category === selectedCategoryFilter;
      const matchesPriority = selectedPriorityFilter === 'all' || item.priority === selectedPriorityFilter;

      return matchesSearch && matchesAgent && matchesCategory && matchesPriority;
    });
  }, [allTeamItems, searchTerm, selectedAgentFilter, selectedCategoryFilter, selectedPriorityFilter]);

  // Calculate high-level metrics
  const totalTasks = useMemo(() => allTeamItems.length, [allTeamItems]);
  const activeTasks = useMemo(() => allTeamItems.filter(i => i.column === 'today').length, [allTeamItems]);
  const completedTasks = useMemo(() => allTeamItems.filter(i => i.column === 'yesterday').length, [allTeamItems]);
  const blockedTasks = useMemo(() => allTeamItems.filter(i => i.column === 'blocked').length, [allTeamItems]);

  const priorityHigh = useMemo(() => allTeamItems.filter(i => i.priority === 'Alta').length, [allTeamItems]);
  const priorityMedium = useMemo(() => allTeamItems.filter(i => i.priority === 'Media').length, [allTeamItems]);
  const priorityLow = useMemo(() => allTeamItems.filter(i => i.priority === 'Baja').length, [allTeamItems]);

  const expiredFollowUps = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return allTeamItems.filter(i => {
      if (i.column !== 'blocked' || !i.followUpDate) return false;
      return i.followUpDate < today;
    });
  }, [allTeamItems]);

  // Sub-categorized column lists (for Kanban cards)
  const yesterdayItems = useMemo(() => filteredItems.filter(i => i.column === 'yesterday'), [filteredItems]);
  const todayItems = useMemo(() => filteredItems.filter(i => i.column === 'today'), [filteredItems]);
  const blockedItems = useMemo(() => filteredItems.filter(i => i.column === 'blocked'), [filteredItems]);

  // Blocked alerts consolidated lists
  const allBlockedItems = useMemo(() => allTeamItems.filter(i => i.column === 'blocked'), [allTeamItems]);

  // Unique agents for filters
  const uniqueAgentsForFilter = useMemo(() => {
    return Array.from(new Set(allTeamItems.map(i => i.agentId)));
  }, [allTeamItems]);

  // Sorted list for list view
  const sortedFilteredItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let valA = '';
      let valB = '';

      if (sortBy === 'agent') {
        valA = a.agentName.toLowerCase();
        valB = b.agentName.toLowerCase();
      } else if (sortBy === 'ticket') {
        valA = a.ticketNo.toLowerCase();
        valB = b.ticketNo.toLowerCase();
      } else if (sortBy === 'category') {
        valA = a.category.toLowerCase();
        valB = b.category.toLowerCase();
      } else if (sortBy === 'priority') {
        const weights = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
        const wA = weights[a.priority as keyof typeof weights] || 0;
        const wB = weights[b.priority as keyof typeof weights] || 0;
        return sortOrder === 'asc' ? wA - wB : wB - wA;
      } else if (sortBy === 'followUp') {
        valA = a.followUpDate || '9999-12-31';
        valB = b.followUpDate || '9999-12-31';
      } else if (sortBy === 'status') {
        const weights = { 'yesterday': 1, 'today': 2, 'blocked': 3 };
        const wA = weights[a.column as keyof typeof weights] || 0;
        const wB = weights[b.column as keyof typeof weights] || 0;
        return sortOrder === 'asc' ? wA - wB : wB - wA;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortBy, sortOrder]);

  return (
    <div className="flex-grow flex flex-col gap-6" id="daily-admin-use-dashboard">
      
      {/* Toast Alert */}
      {sentAlertToast && (
        <div className="fixed top-5 right-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-sans text-xs font-bold py-3 px-5 rounded-xl shadow-2xl flex items-center gap-2 border border-emerald-400/20 animate-bounce z-55">
          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
          <span>{sentAlertToast}</span>
        </div>
      )}

      {/* Hero Header Card */}
      <section className="bg-[#111827]/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">admin_panel_settings</span>
            <span className="font-mono text-[9px] text-[#818cf8] font-black uppercase tracking-wider bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40">
              Módulo de Supervisión Avanzada
            </span>
          </div>
          <h1 className="font-display font-extrabold text-lg text-white mt-1.5">Daily Admin Use: Monitoreo Scrum del Equipo</h1>
          <p className="font-sans text-xs text-slate-400 mt-0.5">
            Consolidado en tiempo real de tableros individuales de técnicos. Herramientas de seguimiento, alertas y control de cuellos de botella.
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={exportScrumDataCSV}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#1e293b] to-slate-900 border border-slate-800 hover:border-slate-700 text-white rounded-xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer self-start sm:self-auto"
            id="export-scrum-report"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            Exportar Reporte (CSV)
          </button>
          <button
            onClick={handleAbsoluteDelete}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-900 to-red-950 border border-red-800 hover:border-red-700 text-red-200 rounded-xl font-sans text-xs font-bold transition-all shadow-md cursor-pointer self-start sm:self-auto"
            id="absolute-delete-btn"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Borrado Absoluto
          </button>
        </div>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold text-slate-800 mb-2">¿Confirmar borrado absoluto?</h3>
              <p className="text-slate-600 text-sm mb-6">Esta acción borrará permanentemente todos los datos de los tableros de todos los agentes. No se puede deshacer.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg">Cancelar</button>
                <button onClick={confirmDelete} className="px-4 py-2 text-xs font-bold bg-red-600 text-white hover:bg-red-700 rounded-lg">Borrar Todo</button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Grid of Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="admin-metrics-grid">
        
        {/* Total Tasks Card */}
        <div className="bg-[#111827]/40 backdrop-blur-md p-4.5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[9px] text-slate-450 uppercase tracking-wider font-semibold">Tareas Totales Registradas</p>
            <p className="font-display font-black text-2xl text-white">{totalTasks}</p>
            <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              <span>Suma de todos los tableros</span>
            </p>
          </div>
          <div className="w-10 h-10 bg-indigo-950/30 border border-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Today Card */}
        <div className="bg-[#111827]/40 backdrop-blur-md p-4.5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[9px] text-slate-450 uppercase tracking-wider font-semibold">Hoy en Progreso (Activas)</p>
            <p className="font-display font-black text-2xl text-amber-500">{activeTasks}</p>
            <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-500" />
              <span>Tareas en marcha hoy</span>
            </p>
          </div>
          <div className="w-10 h-10 bg-amber-950/30 border border-amber-900/30 rounded-xl flex items-center justify-center text-amber-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Completed Card */}
        <div className="bg-[#111827]/40 backdrop-blur-md p-4.5 rounded-2xl border border-white/5 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <p className="font-mono text-[9px] text-slate-450 uppercase tracking-wider font-semibold">Completadas Ayer</p>
            <p className="font-display font-black text-2xl text-emerald-500">{completedTasks}</p>
            <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>Cierre de ciclo exitoso</span>
            </p>
          </div>
          <div className="w-10 h-10 bg-emerald-950/30 border border-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Blocked Impediments Card */}
        <div className={`bg-[#111827]/40 backdrop-blur-md p-4.5 rounded-2xl border shadow-md flex items-center justify-between transition-all ${
          blockedTasks > 0 ? 'border-red-900/40 bg-red-950/5' : 'border-white/5'
        }`}>
          <div className="space-y-1">
            <p className="font-mono text-[9px] text-slate-455 uppercase tracking-wider font-semibold">Bloqueadas / Impedimentos</p>
            <p className={`font-display font-black text-2xl ${blockedTasks > 0 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>{blockedTasks}</p>
            <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <AlertTriangle className={`w-3 h-3 ${blockedTasks > 0 ? 'text-red-500' : 'text-slate-400'}`} />
              <span>{expiredFollowUps.length} con fecha expirada</span>
            </p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            blockedTasks > 0 ? 'bg-red-950/40 border border-red-900/40 text-red-500' : 'bg-slate-900 border border-slate-800 text-slate-500'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Alert Center for Blocked Tasks & Follow-Ups */}
      {blockedTasks > 0 && (
        <section className="bg-red-950/10 border border-red-900/30 rounded-2xl p-5 shadow-inner" id="blocked-scrum-alerts">
          <div className="flex items-center gap-2 mb-3">
            <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
            <h2 className="font-display font-extrabold text-sm text-white">Centro de Alertas de Bloqueados Expirados o Críticos</h2>
          </div>
          <p className="font-sans text-xs text-slate-400 mb-4">
            Los siguientes incidentes o requerimientos registran impedimentos activos en los tableros del personal técnico. Requieren coordinación inmediata de coaching o escalación con proveedores.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {allBlockedItems.map(item => {
              const today = new Date().toISOString().split('T')[0];
              const isExpired = item.followUpDate ? item.followUpDate < today : false;
              const isUrgent = item.priority === 'Alta' || isExpired;

              return (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-xl border font-sans relative overflow-hidden transition-all flex flex-col justify-between ${
                    isExpired 
                      ? 'bg-red-950/20 border-red-500/35 shadow-md shadow-red-950/10' 
                      : isUrgent 
                        ? 'bg-[#1e1a2d]/40 border-amber-500/30' 
                        : 'bg-[#111827]/40 border-white/5'
                  }`}
                >
                  {/* Watermark accent */}
                  <div className="absolute -top-3 -right-3 rotate-12 opacity-5 pointer-events-none">
                    <AlertTriangle className="w-20 h-20 text-white" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-900/40 px-2 py-0.5 rounded">
                        {item.ticketNo}
                      </span>
                      <span className={`font-mono text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                        item.priority === 'Alta' 
                          ? 'bg-red-950/40 text-red-500 border-red-900/40' 
                          : item.priority === 'Media' 
                            ? 'bg-amber-950/40 text-amber-500 border-amber-900/40' 
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                      }`}>
                        Prioridad {item.priority}
                      </span>
                    </div>

                    <h3 className="font-sans font-bold text-xs text-slate-200 line-clamp-1">{item.title}</h3>
                    
                    <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-white/5 text-[11px] font-sans">
                      <div>
                        <span className="text-slate-450 block">Responsable:</span>
                        <span className="font-semibold text-slate-250 flex items-center gap-1">
                          <User className="w-3 h-3 text-indigo-400" />
                          {item.agentName}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-450 block">F. Seguimiento:</span>
                        <span className={`font-mono font-bold flex items-center gap-1 ${isExpired ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
                          <Calendar className="w-3 h-3" />
                          {item.followUpDate || 'Sin programar'}
                          {isExpired && <span className="text-[8px] bg-red-600 text-white font-mono px-1 rounded ml-1 font-black">EXP</span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-450 italic">
                      Categoría: {item.category}
                    </span>
                    <button
                      onClick={() => sendAlertReminder(item)}
                      className="bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/20 font-mono text-[9px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                    >
                      <Send className="w-2.5 h-2.5" />
                      Enviar Recordatorio
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Interactive Filters Panel */}
      <section className="bg-[#111827]/40 backdrop-blur-md p-4.5 rounded-2xl border border-white/5 shadow-md flex flex-col md:flex-row items-center gap-4">
        
        {/* Search input */}
        <div className="relative w-full md:flex-1">
          <Search className="w-3.5 h-3.5 text-slate-450 absolute left-3 top-1/2 -translate-y-1/2" />
          <input 
            type="text" 
            placeholder="Buscar por ticket, título de tarea, o técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs font-sans font-medium text-slate-200 placeholder-slate-450 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Filter Agent */}
          <div className="relative font-sans text-xs">
            <select
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="appearance-none bg-slate-950 border border-slate-800 py-2 pl-3.5 pr-8 rounded-xl text-slate-300 font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              <option value="all">👥 Todos los Técnicos</option>
              {uniqueAgentsForFilter.map(id => {
                const name = allTeamItems.find(i => i.agentId === id)?.agentName || id;
                return <option key={id} value={id}>{name}</option>;
              })}
            </select>
          </div>

          {/* Filter Category */}
          <div className="relative font-sans text-xs">
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="appearance-none bg-slate-950 border border-slate-800 py-2 pl-3.5 pr-8 rounded-xl text-slate-300 font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              <option value="all">🏷️ Categorías (Todas)</option>
              <option value="Incidente">Incidente</option>
              <option value="Requerimiento">Requerimiento</option>
              <option value="Cambio">Cambio</option>
              <option value="Otro">Otro</option>
            </select>
          </div>

          {/* Filter Priority */}
          <div className="relative font-sans text-xs">
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="appearance-none bg-slate-950 border border-slate-800 py-2 pl-3.5 pr-8 rounded-xl text-slate-300 font-bold cursor-pointer focus:outline-none focus:border-indigo-500"
            >
              <option value="all">⚡ Prioridades (Todas)</option>
              <option value="Alta">Alta</option>
              <option value="Media">Media</option>
              <option value="Baja">Baja</option>
            </select>
          </div>
        </div>

      </section>

      {/* Main Content Area: Tableros Scrum Consolidados o Vista de Lista */}
      <section className="bg-[#111827]/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-md">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/5">
          <div>
            <h2 className="font-display font-extrabold text-sm text-white">Scrum Consolidado en Tiempo Real</h2>
            <p className="font-sans text-[11px] text-slate-450 mt-0.5">Mostrando {filteredItems.length} de {allTeamItems.length} tareas totales del equipo</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            {/* View switcher segment */}
            <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                onClick={() => setViewMode('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'kanban'
                    ? 'bg-indigo-600/35 text-white border border-indigo-500/25 shadow'
                    : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent'
                }`}
              >
                <LayoutGrid className="w-3 h-3 text-indigo-400" />
                Tablero Kanban
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-indigo-600/35 text-white border border-indigo-500/25 shadow'
                    : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent'
                }`}
              >
                <List className="w-3 h-3 text-indigo-400" />
                Vista de Lista
              </button>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-900">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Escaneo de Actividades Activo</span>
            </div>
          </div>
        </div>

        {viewMode === 'kanban' ? (
          /* 3-Column Kanban Board Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="admin-scrum-kanban-view">

            {/* COLUMN 1: AYER (COMPLETED) */}
            <div className="bg-[#0b0f19]/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3 min-h-[400px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="font-sans font-bold text-xs text-slate-200">Ayer (Completado)</span>
                </div>
                <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-emerald-950/40 text-emerald-450 border border-emerald-900/40 rounded-full">
                  {yesterdayItems.length}
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[500px] no-scrollbar">
                {yesterdayItems.map(item => (
                  <div key={item.id} className="bg-slate-900/60 border border-white/5 p-3.5 rounded-xl font-sans text-xs space-y-2 hover:border-emerald-500/20 transition-all">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-950/40 px-1.5 py-0.5 rounded">
                        {item.ticketNo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{item.agentName}</span>
                    </div>
                    <p className="text-slate-300 font-medium line-clamp-2">{item.title}</p>
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-450">
                      <span>🏷️ {item.category}</span>
                      <span className="font-semibold text-emerald-500 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" /> Completado
                      </span>
                    </div>
                  </div>
                ))}
                {yesterdayItems.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-xs font-sans">
                    No hay tareas completadas en este filtro.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2: HOY (ACTIVE / IN PROGRESS) */}
            <div className="bg-[#0b0f19]/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3 min-h-[400px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className="font-sans font-bold text-xs text-slate-200">Hoy (Activas)</span>
                </div>
                <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-amber-950/40 text-amber-450 border border-amber-900/40 rounded-full">
                  {todayItems.length}
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[500px] no-scrollbar">
                {todayItems.map(item => (
                  <div key={item.id} className="bg-slate-900/60 border border-white/5 p-3.5 rounded-xl font-sans text-xs space-y-2 hover:border-amber-500/20 transition-all">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-950/40 px-1.5 py-0.5 rounded">
                        {item.ticketNo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{item.agentName}</span>
                    </div>
                    <p className="text-slate-300 font-medium line-clamp-2">{item.title}</p>
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-450">
                      <span>🏷️ {item.category}</span>
                      <span className={`font-semibold ${
                        item.priority === 'Alta' ? 'text-red-400 animate-pulse' : 'text-slate-400'
                      }`}>
                        ⚡ {item.priority}
                      </span>
                    </div>
                  </div>
                ))}
                {todayItems.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-xs font-sans">
                    No hay tareas activas para hoy en este filtro.
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 3: BLOQUEADOS */}
            <div className="bg-[#0b0f19]/40 border border-white/5 p-4 rounded-xl flex flex-col gap-3 min-h-[400px]">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                  <span className="font-sans font-bold text-xs text-slate-200">Bloqueados / Impedimentos</span>
                </div>
                <span className="font-mono text-[10px] font-black px-2 py-0.5 bg-red-950/40 text-red-455 border border-red-900/40 rounded-full">
                  {blockedItems.length}
                </span>
              </div>

              <div className="space-y-3 overflow-y-auto max-h-[500px] no-scrollbar">
                {blockedItems.map(item => (
                  <div key={item.id} className="bg-red-950/5 border border-red-900/20 p-3.5 rounded-xl font-sans text-xs space-y-2 hover:border-red-500/40 transition-all">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-950/40 px-1.5 py-0.5 rounded">
                        {item.ticketNo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{item.agentName}</span>
                    </div>
                    <p className="text-slate-300 font-medium line-clamp-2">{item.title}</p>
                    
                    {item.followUpDate && (
                      <div className="text-[10px] text-red-400 bg-red-950/30 border border-red-900/20 px-2 py-1 rounded flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-red-400" />
                        F. Seg: {item.followUpDate}
                      </div>
                    )}

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-450">
                      <span>🏷️ {item.category}</span>
                      <button 
                        onClick={() => sendAlertReminder(item)}
                        className="text-red-400 font-mono text-[9px] hover:underline bg-transparent border-none cursor-pointer p-0"
                      >
                        Alertar ➔
                      </button>
                    </div>
                  </div>
                ))}
                {blockedItems.length === 0 && (
                  <div className="text-center py-10 text-slate-500 text-xs font-sans">
                    ¡Excelente! No hay impedimentos en este filtro.
                  </div>
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Detailed Sorted List View Layout */
          <div className="overflow-x-auto w-full" id="admin-scrum-list-view">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 font-mono text-[10px] text-slate-450 uppercase tracking-wider">
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    onClick={() => {
                      if (sortBy === 'agent') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('agent'); setSortOrder('asc'); }
                    }}
                  >
                    Técnico {sortBy === 'agent' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    onClick={() => {
                      if (sortBy === 'ticket') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('ticket'); setSortOrder('asc'); }
                    }}
                  >
                    Ticket / Tarea {sortBy === 'ticket' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    onClick={() => {
                      if (sortBy === 'category') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('category'); setSortOrder('asc'); }
                    }}
                  >
                    Categoría {sortBy === 'category' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    onClick={() => {
                      if (sortBy === 'priority') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('priority'); setSortOrder('asc'); }
                    }}
                  >
                    Prioridad {sortBy === 'priority' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    onClick={() => {
                      if (sortBy === 'followUp') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('followUp'); setSortOrder('asc'); }
                    }}
                  >
                    F. Seguimiento {sortBy === 'followUp' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th 
                    className="py-3 px-4 cursor-pointer hover:text-indigo-400 select-none transition-colors"
                    onClick={() => {
                      if (sortBy === 'status') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      else { setSortBy('status'); setSortOrder('asc'); }
                    }}
                  >
                    Estado {sortBy === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                  </th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs font-sans text-slate-300">
                {sortedFilteredItems.map(item => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isExpired = item.column === 'blocked' && item.followUpDate && item.followUpDate < todayStr;
                  
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-slate-900/40 transition-colors ${
                        isExpired ? 'bg-red-950/10' : ''
                      }`}
                    >
                      {/* Agent details */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            {item.agentName}
                          </span>
                          <span className="text-[10px] text-slate-450 font-mono">{item.agentEmail}</span>
                        </div>
                      </td>
                      
                      {/* Ticket title */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] text-indigo-400 font-bold bg-indigo-950/45 border border-indigo-900/35 px-1.5 py-0.5 rounded">
                            {item.ticketNo}
                          </span>
                          <p className="text-slate-200 truncate font-semibold mt-1" title={item.title}>
                            {item.title}
                          </p>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4">
                        <span className="text-slate-350 bg-slate-950/80 px-2 py-1 rounded border border-slate-900">
                          {item.category}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span className={`font-mono text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                          item.priority === 'Alta'
                            ? 'bg-red-950/40 text-red-400 border-red-900/40'
                            : item.priority === 'Media'
                              ? 'bg-amber-950/40 text-amber-400 border-amber-900/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {item.priority}
                        </span>
                      </td>

                      {/* Follow-up date */}
                      <td className="py-3 px-4">
                        {item.followUpDate ? (
                          <div className={`flex items-center gap-1 font-mono text-[11px] font-bold ${
                            isExpired ? 'text-red-400 animate-pulse' : 'text-slate-300'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {item.followUpDate}
                            {isExpired && <span className="text-[8px] bg-red-600 text-white font-mono px-1 rounded ml-1 font-black">EXP</span>}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">N/A</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className={`font-mono text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded border ${
                          item.column === 'yesterday'
                            ? 'bg-emerald-950/30 text-emerald-450 border-emerald-900/30'
                            : item.column === 'today'
                              ? 'bg-amber-950/30 text-amber-450 border-amber-900/30'
                              : 'bg-red-950/40 text-red-500 border-red-900/45'
                        }`}>
                          {item.column === 'yesterday' ? 'Completado' : item.column === 'today' ? 'En Progreso' : 'Bloqueado'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        {item.column === 'blocked' ? (
                          <button
                            onClick={() => sendAlertReminder(item)}
                            className="bg-red-900/40 hover:bg-red-800/60 text-red-200 border border-red-500/25 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                          >
                            <Send className="w-2.5 h-2.5" />
                            Alertar
                          </button>
                        ) : (
                          <button
                            onClick={() => sendAlertReminder(item, `Seguimiento de rutina: El Administrador solicita estatus del ticket de hoy ${item.ticketNo} - "${item.title}". Favor reportarse.`)}
                            className="bg-indigo-950/60 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-900/40 font-mono text-[9px] font-bold uppercase tracking-wider px-2.5 py-1.5 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-all"
                          >
                            <Clock className="w-2.5 h-2.5 text-indigo-400" />
                            Estatus
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-500 text-xs font-sans">
                      No se encontraron tareas con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </section>

      {/* Grid: Metrics Bar charts and Coaching action log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Categories & Priorities distribution visually */}
        <section className="bg-[#111827]/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-md flex flex-col gap-4">
          <h2 className="font-display font-extrabold text-sm text-white">Análisis de Distribución de Carga</h2>
          <p className="font-sans text-xs text-slate-400">Desglose porcentual y numérico por categoría de ticket y niveles de prioridad.</p>

          <div className="space-y-4 mt-2">
            {/* Incidentes Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                <span>INCIDENTES (Soporte Operativo)</span>
                <span>{allTeamItems.filter(i => i.category === 'Incidente').length} Tareas</span>
              </div>
              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-500" 
                  style={{ width: `${totalTasks > 0 ? (allTeamItems.filter(i => i.category === 'Incidente').length / totalTasks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Requerimientos Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                <span>REQUERIMIENTOS (Solicitudes de Servicio)</span>
                <span>{allTeamItems.filter(i => i.category === 'Requerimiento').length} Tareas</span>
              </div>
              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-500" 
                  style={{ width: `${totalTasks > 0 ? (allTeamItems.filter(i => i.category === 'Requerimiento').length / totalTasks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Cambios Progress bar */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                <span>CAMBIOS (Implementación / Mejoras)</span>
                <span>{allTeamItems.filter(i => i.category === 'Cambio').length} Tareas</span>
              </div>
              <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-violet-500 transition-all duration-500" 
                  style={{ width: `${totalTasks > 0 ? (allTeamItems.filter(i => i.category === 'Cambio').length / totalTasks) * 100 : 0}%` }}
                ></div>
              </div>
            </div>

            {/* Prioridades quick overview */}
            <div className="grid grid-cols-3 gap-2.5 pt-4 border-t border-white/5 text-center font-mono">
              <div className="bg-red-950/10 border border-red-900/25 p-2 rounded-xl">
                <span className="text-[9px] text-red-400 block font-bold uppercase">ALTA</span>
                <span className="font-display font-black text-lg text-white">{priorityHigh}</span>
              </div>
              <div className="bg-amber-950/10 border border-amber-900/25 p-2 rounded-xl">
                <span className="text-[9px] text-amber-400 block font-bold uppercase">MEDIA</span>
                <span className="font-display font-black text-lg text-white">{priorityMedium}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-2 rounded-xl">
                <span className="text-[9px] text-slate-400 block font-bold uppercase">BAJA</span>
                <span className="font-display font-black text-lg text-white">{priorityLow}</span>
              </div>
            </div>

          </div>
        </section>

        {/* Coaching Alert & Audit Logs */}
        <section className="bg-[#111827]/40 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-md flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display font-extrabold text-sm text-white">Histórico de Alertas de Desempeño</h2>
              <p className="font-sans text-xs text-slate-400">Coordinación directa de coaching y recordatorios emitidos por los Administradores.</p>
            </div>
            <button 
              onClick={() => {
                setCoachingAlerts([]);
                localStorage.removeItem('fhons_admin_sent_alerts');
              }}
              className="text-[10px] font-mono text-red-400 hover:underline bg-transparent border-none cursor-pointer"
            >
              Limpiar Historial
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[250px] no-scrollbar">
            {coachingAlerts.map(alert => (
              <div key={alert.id} className="bg-slate-950/40 border border-slate-900 p-3.5 rounded-xl font-sans text-xs space-y-1.5 flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-950/40 border border-red-900/40 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                  <Send className="w-3 h-3" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{alert.agentName}</span>
                    <span className="text-[10px] text-slate-450">&bull; {alert.date}</span>
                    <span className="font-mono text-[9px] font-bold text-indigo-400 bg-indigo-950/30 px-1.5 py-0.5 rounded border border-indigo-900/35">
                      {alert.ticket}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed mt-1">{alert.message}</p>
                </div>
              </div>
            ))}
            {coachingAlerts.length === 0 && (
              <div className="text-center py-10 text-slate-500 text-xs font-sans">
                No hay alertas de coaching enviadas en este ciclo.
              </div>
            )}
          </div>
        </section>

      </div>

    </div>
  );
}
