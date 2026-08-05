import React, { useState, useEffect } from 'react';
import { Agent } from '../../types';
import { motion } from 'motion/react';
import { fetchLeaderboardSettings, saveLeaderboardSettings, LeaderboardSettings, DEFAULT_LEADERBOARD_SETTINGS, fetchAvailableSprints, fetchAgents, saveSprintSnapshot, deleteSprintSnapshot } from '../../db/firebaseService';
import { getTierBadgeProps } from '../roster/RosterTab';
import { AgentAvatarLogo } from '../AgentAvatarLogo';

interface LeaderboardAdminSettingsProps {
  agents: Agent[];
}

export default function LeaderboardAdminSettings({ agents }: LeaderboardAdminSettingsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'global' | 'history' | 'config'>('global');
  
  const [settings, setSettings] = useState<LeaderboardSettings>(DEFAULT_LEADERBOARD_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [sprints, setSprints] = useState<string[]>([]);
  const [selectedSprint, setSelectedSprint] = useState<string>('');
  const [sprintAgents, setSprintAgents] = useState<Agent[]>(agents);
  const [loadingAgents, setLoadingAgents] = useState(false);
  
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Temprano' | 'A Tiempo' | 'Gracia' | 'Tardanza' | 'Falta' | 'Permiso' | 'Remoto'>('all');
  

  useEffect(() => {
    Promise.all([
      fetchLeaderboardSettings(),
      fetchAvailableSprints()
    ]).then(([s, fetchedSprints]) => {
      setSettings(s);
      setSprints(fetchedSprints);
      if (fetchedSprints.length > 0) {
        setSelectedSprint(fetchedSprints[0]);
      }
      setLoading(false);
    });
  }, []);
  
  useEffect(() => {
    if (!selectedSprint) return;
    setLoadingAgents(true);
    fetchAgents(selectedSprint).then(fetched => {
      setSprintAgents(fetched);
      setLoadingAgents(false);
    });
  }, [selectedSprint]);

  const handleSaveSnapshot = async () => {
    if (!selectedSprint || selectedSprint === 'all') {
      alert('Debes seleccionar un sprint específico para guardar su snapshot definitivo.');
      return;
    }
    
    if (window.confirm(`¿Estás seguro de que quieres cerrar y GUARDAR DEFINITIVAMENTE los indicadores para el sprint "${selectedSprint}"?\n\nEsta acción registrará las métricas actuales (Asignados, Eficiencia, Carga, Aporte, etc.) de manera permanente, evitando que cambien si los casos se mueven a históricos la próxima semana.`)) {
      setSaving(true);
      try {
        const snapshotData = {
          sprint: selectedSprint,
          savedAt: new Date().toISOString(),
          agents: sprintAgents.reduce((acc, a) => {
            acc[a.id] = {
              currentXp: a.currentXp,
              baseXp: a.baseXp,
              xpBreakdown: a.xpBreakdown,
            };
            return acc;
          }, {} as Record<string, any>)
        };
        await saveSprintSnapshot(selectedSprint, snapshotData);
        alert(`Snapshot para "${selectedSprint}" guardado exitosamente.`);
      } catch (err) {
        console.error(err);
        alert('Error al guardar el snapshot.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSettingChange = (key: keyof LeaderboardSettings, value: string) => {
    setSettings(prev => ({ ...prev, [key]: parseInt(value) || 0 }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveLeaderboardSettings(settings);
      
      // Refetch agents so the UI reflects the new settings immediately
      setLoadingAgents(true);
      const fetched = await fetchAgents(selectedSprint === 'all' ? undefined : selectedSprint, true);
      setSprintAgents(fetched);
      setLoadingAgents(false);
      
      alert('Configuración guardada correctamente.');
    } catch (e) {
      alert('Error al guardar.');
      setLoadingAgents(false);
    }
    setSaving(false);
  };
  
  const eligibleAgents = sprintAgents.filter(a => {
    const tid = a.tierId?.toLowerCase();
    return tid !== 'a1' && tid !== 's1' && tid !== 's2';
  });
  
  const selectedAgent = sprintAgents.find(a => a.id === selectedAgentId);

  // Helper for attendance stats
  const getAttendanceStats = (agent: Agent) => {
    if (!agent.xpBreakdown) return { rate: 0, total: 0, positive: 0 };
    const { earlyCheckIns, onTimeCheckIns, graceCheckIns, lateCheckIns, missingCheckIns } = agent.xpBreakdown;
    const total = (earlyCheckIns || 0) + (onTimeCheckIns || 0) + (graceCheckIns || 0) + (lateCheckIns || 0) + (missingCheckIns || 0);
    const positive = (earlyCheckIns || 0) + (onTimeCheckIns || 0);
    const rate = total > 0 ? Math.round((positive / total) * 100) : 0;
    return { rate, total, positive };
  };

  const getDayName = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return 'N/A';
    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    // dateStr is YYYY-MM-DD
    try {
      const date = new Date(dateStr + 'T00:00:00');
      if (isNaN(date.getTime())) return 'N/A';
      return days[date.getDay()];
    } catch {
      return 'N/A';
    }
  };

  const filteredAttendance = selectedAgent?.xpBreakdown?.attendanceDetail?.filter((detail: any) => {
    // Exclude invalid records or generic statuses
    if (!detail.fecha || detail.fecha === 'N/A' || detail.estado === 'ACTIVO') return false;
    
    const dayName = getDayName(detail.fecha);
    // Exclude Sundays as requested (Lunes a Sabado)
    if (dayName === 'Dom') return false;
    
    const matchesSearch = detail.fecha?.includes(searchTerm) || detail.estado?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || detail.estado === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  return (
    <div className="flex-grow flex flex-col gap-6 h-full min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl md:text-2xl font-black text-slate-900 tracking-tight">Admin Leaderboard</h2>
        </div>
        <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-lg">
          <button
            onClick={() => setActiveSubTab('global')}
            className={`px-3 py-1.5 rounded-md font-sans text-[10px] font-black uppercase tracking-wider transition-all ${
              activeSubTab === 'global' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Bitácora Global
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-md font-sans text-[10px] font-black uppercase tracking-wider transition-all ${
              activeSubTab === 'history' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Detalle Agente
          </button>
          <button
            onClick={() => setActiveSubTab('config')}
            className={`px-3 py-1.5 rounded-md font-sans text-[10px] font-black uppercase tracking-wider transition-all ${
              activeSubTab === 'config' 
                ? 'bg-indigo-600 text-white shadow-sm' 
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Ajustes
          </button>
        </div>
      </div>

      <div className="flex-grow min-h-0 bg-slate-50 border border-slate-800 rounded-xl overflow-hidden p-6 flex flex-col">
        {activeSubTab === 'global' && (
        <div className="flex-grow flex flex-col gap-6 h-full min-h-0">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full min-h-0">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-display mb-1">Bitácora Global del Periodo</h3>
                <p className="text-sm text-slate-600">Resumen total de puntos logrados por el equipo. Filtra por sprint o semana.</p>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm font-bold text-slate-700">Sprint:</label>
                <select 
                  className="bg-slate-50 border border-slate-300 text-slate-900 px-4 py-2 rounded-lg font-sans outline-none focus:border-indigo-500"
                  value={selectedSprint}
                  onChange={(e) => setSelectedSprint(e.target.value)}
                >
                  <option value="all">Todo el Histórico (Global)</option>
                  {sprints.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {selectedSprint && selectedSprint !== 'all' && (
                  <button 
                    onClick={handleSaveSnapshot}
                    disabled={saving}
                    className="ml-4 flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold font-display shadow-sm transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">save</span>
                    Guardar Snapshot Definitivo
                  </button>
                )}
              </div>
            </div>
             {loadingAgents ? (
              <div className="flex-grow flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-indigo-600 text-3xl">sync</span>
              </div>
            ) : (
            <div className="overflow-y-auto pr-2 flex flex-col gap-6">
              <div>
                <p className="text-sm text-slate-600">
                  Resumen total de puntos e indicadores logrados por el equipo en el sprint o periodo seleccionado. La suma coincide con el detalle individual de todos los agentes.
                </p>
              </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-center items-center text-center">
                <span className="material-symbols-outlined text-indigo-600 text-3xl mb-1">military_tech</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Score Global Total</span>
                <span className="text-3xl font-display font-black text-slate-900 mt-1">
                  {eligibleAgents.reduce((sum, a) => sum + (a.currentXp || 0), 0).toLocaleString()} XP
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  Equipo activo ({eligibleAgents.length} agentes)
                </span>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rendimiento Operativo</span>
                  <span className="material-symbols-outlined text-emerald-600 text-2xl">task_alt</span>
                </div>
                <div className="text-2xl font-mono font-bold text-emerald-600">
                  +{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.performanceScore || 0), 0).toLocaleString()} XP
                </div>
                <div className="text-[11px] text-slate-600 mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
                  <div className="flex justify-between"><span>Tickets CRM:</span> <span className="font-bold text-slate-800">{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.completedTickets || 0), 0)}</span></div>
                  <div className="flex justify-between"><span>Escalaciones:</span> <span className="font-bold text-slate-800">{eligibleAgents.reduce((sum, a) => sum + ((a.xpBreakdown as any)?.escalacionesCompletadas || 0), 0)}</span></div>
                  <div className="flex justify-between"><span>Visitas / Tareas:</span> <span className="font-bold text-slate-800">{eligibleAgents.reduce((sum, a) => sum + ((a.xpBreakdown as any)?.visitasCompletadas || 0) + ((a.xpBreakdown as any)?.tareasCompletadas || 0), 0)}</span></div>
                  <div className="flex justify-between"><span>Evaluaciones:</span> <span className="font-bold text-slate-800">{eligibleAgents.reduce((sum, a) => sum + ((a.xpBreakdown as any)?.evaluacionesCompletadas || a.xpBreakdown?.evaluationsCount || 0), 0)}</span></div>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Asistencia & Adherencia</span>
                  <span className="material-symbols-outlined text-blue-600 text-2xl">schedule</span>
                </div>
                <div className={`text-2xl font-mono font-bold ${eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.attendanceScore || 0), 0) >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                  {eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.attendanceScore || 0), 0) > 0 ? '+' : ''}{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.attendanceScore || 0), 0).toLocaleString()} XP
                </div>
                <div className="text-[11px] text-slate-600 mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
                  <div className="flex justify-between"><span>A Tiempo / Temprano:</span> <span className="font-bold text-emerald-600">{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.onTimeCheckIns || 0) + (a.xpBreakdown?.earlyCheckIns || 0), 0)} d</span></div>
                  <div className="flex justify-between"><span>Gracia:</span> <span className="font-bold text-amber-600">{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.graceCheckIns || 0), 0)} d</span></div>
                  <div className="flex justify-between"><span>Tardanza / Falta:</span> <span className="font-bold text-rose-600">{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.lateCheckIns || 0) + (a.xpBreakdown?.missingCheckIns || 0), 0)} d</span></div>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Métricas & Eventos</span>
                  <span className="material-symbols-outlined text-purple-600 text-2xl">analytics</span>
                </div>
                <div className="flex flex-col">
                  <div className="text-xl font-mono font-bold text-purple-600">
                    {eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.sprintMetricsScore || 0), 0) >= 0 ? '+' : ''}{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.sprintMetricsScore || 0), 0).toLocaleString()} XP
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">Métricas Sprint</span>
                </div>
                <div className="text-[11px] text-slate-600 mt-2 flex flex-col gap-1 border-t border-slate-200 pt-2">
                  <div className="flex justify-between">
                    <span>Bonos / Eventos:</span> 
                    <span className="font-bold text-purple-700 font-mono">
                      {eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.eventXp || 0), 0) >= 0 ? '+' : ''}{eligibleAgents.reduce((sum, a) => sum + (a.xpBreakdown?.eventXp || 0), 0)} XP
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
              <div className="flex items-center justify-between mb-4 border-b border-slate-200 pb-2">
                <div>
                  <h4 className="font-bold text-slate-800">Desglose Detallado por Agente</h4>
                  <p className="text-xs text-slate-500">Haz clic en cualquier agente para ver su ficha individual y la bitácora completa de registros.</p>
                </div>
                <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 font-bold">
                  {eligibleAgents.length} Agentes
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[10px] text-slate-500 uppercase bg-slate-200/80 font-black">
                    <tr>
                      <th className="px-3 py-2.5 rounded-tl-lg">Agente</th>
                      <th className="px-2 py-2.5 text-center">Tickets</th>
                      <th className="px-2 py-2.5 text-center">Escalaciones</th>
                      <th className="px-2 py-2.5 text-center">Visitas</th>
                      <th className="px-2 py-2.5 text-center">Tareas</th>
                      <th className="px-2 py-2.5 text-center">Eval.</th>
                      <th className="px-3 py-2.5 text-right">Rendimiento</th>
                      <th className="px-3 py-2.5 text-right">Puntualidad</th>
                      <th className="px-3 py-2.5 text-right">Métricas</th>
                      <th className="px-3 py-2.5 text-right">Eventos</th>
                      <th className="px-3 py-2.5 text-right">Base</th>
                      <th className="px-3 py-2.5 text-right rounded-tr-lg">Total XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/60">
                    {eligibleAgents.map(a => {
                      const perfScore = a.xpBreakdown?.performanceScore || 0;
                      const attScore = a.xpBreakdown?.attendanceScore || 0;
                      const metScore = a.xpBreakdown?.sprintMetricsScore || 0;
                      const evtScore = a.xpBreakdown?.eventXp || 0;
                      const baseXp = a.xpBreakdown?.baseXp || 0;

                      return (
                        <tr 
                          key={a.id} 
                          onClick={() => {
                            setSelectedAgentId(a.id);
                            setActiveSubTab('history');
                          }}
                          className="hover:bg-indigo-50/70 transition-colors cursor-pointer group"
                        >
                          <td className="px-3 py-2.5 font-bold text-slate-900 flex items-center gap-2">
                            <span className="group-hover:text-indigo-600 transition-colors">{a.name}</span>
                            <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-200 text-slate-600 font-bold">
                              {a.tierId}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono font-bold text-slate-700">
                            {a.xpBreakdown?.completedTickets || 0}
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono font-bold text-slate-700">
                            {(a.xpBreakdown as any)?.escalacionesCompletadas || 0}
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono font-bold text-slate-700">
                            {(a.xpBreakdown as any)?.visitasCompletadas || 0}
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono font-bold text-slate-700">
                            {(a.xpBreakdown as any)?.tareasCompletadas || 0}
                          </td>
                          <td className="px-2 py-2.5 text-center font-mono font-bold text-slate-700">
                            {(a.xpBreakdown as any)?.evaluacionesCompletadas || a.xpBreakdown?.evaluationsCount || 0}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-emerald-600 font-bold">
                            +{perfScore.toLocaleString()}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono font-bold ${attScore >= 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                            {attScore > 0 ? '+' : ''}{attScore.toLocaleString()}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono font-bold ${metScore >= 0 ? 'text-purple-600' : 'text-rose-600'}`}>
                            {metScore > 0 ? '+' : ''}{metScore.toLocaleString()}
                          </td>
                          <td className={`px-3 py-2.5 text-right font-mono font-bold ${evtScore >= 0 ? 'text-violet-600' : 'text-rose-600'}`}>
                            {evtScore > 0 ? '+' : ''}{evtScore.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                            {baseXp.toLocaleString()}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono font-black text-indigo-700 text-sm group-hover:scale-105 transition-transform">
                            {a.currentXp?.toLocaleString() || 0} XP
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
            )}
          </div>
        </div>
      )}
      
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {/* Consolidated Controls Row */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agente:</span>
              <select 
                className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-48 p-1.5 outline-none font-medium"
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
              >
                <option value="">Seleccionar...</option>
                {[...eligibleAgents].sort((a, b) => a.name.localeCompare(b.name)).map(agent => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sprint:</span>
              <select 
                className="bg-white border border-slate-200 text-slate-900 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-64 p-1.5 outline-none font-medium"
                value={selectedSprint}
                onChange={(e) => setSelectedSprint(e.target.value)}
              >
                {sprints.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col">
            {!selectedAgent ? (
              <div className="py-20 flex items-center justify-center">
                <p className="text-slate-400 font-mono text-xs uppercase tracking-widest animate-pulse">Selecciona un agente para ver el detalle</p>
              </div>
            ) : (
              <div className="p-4 flex flex-col gap-4">
                {/* Compact Metrics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
                  <div className="lg:col-span-4 flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <AgentAvatarLogo name={selectedAgent.name} size="md" />
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{selectedAgent.name}</h4>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] uppercase font-black px-1.5 py-0.5 rounded ${getTierBadgeProps(selectedAgent.tierId || '', selectedAgent.avatarBg || '').bg} ${getTierBadgeProps(selectedAgent.tierId || '', selectedAgent.avatarBg || '').text}`}>
                          {selectedAgent.tierId}
                        </span>
                        <span className="text-indigo-600 font-mono font-bold text-[10px]">{selectedAgent.currentXp} XP</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Asistencia</span>
                      <span className="text-lg font-display font-black text-emerald-700">{getAttendanceStats(selectedAgent).rate}%</span>
                    </div>
                    <span className="material-symbols-outlined text-emerald-300 text-xl">event_available</span>
                  </div>

                  <div className="lg:col-span-4 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Completados</span>
                      <span className="text-lg font-display font-black text-indigo-700">{selectedAgent.xpBreakdown?.completedTickets || 0}</span>
                    </div>
                    <span className="material-symbols-outlined text-indigo-300 text-xl">confirmation_number</span>
                  </div>
                </div>

                {selectedAgent.xpBreakdown ? (
                  (() => {
                    const eventosTotal = selectedAgent.xpBreakdown.eventXp || 0;
                    
                    return (
                      <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Column 1: XP Summary & Events */}
                      <div className="lg:col-span-3 bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col">
                        <h5 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wider">Desglose General</h5>
                        <div className="space-y-2">
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Tickets CRM ({selectedAgent.xpBreakdown.completedTickets})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).ticketsScore ?? (selectedAgent.xpBreakdown.performanceScore - ((selectedAgent.xpBreakdown as any).escalacionesScore || 0) - ((selectedAgent.xpBreakdown as any).visitasScore || 0) - ((selectedAgent.xpBreakdown as any).tareasScore || 0) - ((selectedAgent.xpBreakdown as any).evaluationsScore || 0))} XP</span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Puntualidad</span>
                            <span className={`font-bold ${selectedAgent.xpBreakdown.attendanceScore >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {selectedAgent.xpBreakdown.attendanceScore > 0 ? '+' : ''}{selectedAgent.xpBreakdown.attendanceScore} XP
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Total Sprint Métricas</span>
                            <span className={`font-bold ${(selectedAgent.xpBreakdown.sprintMetricsScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {(selectedAgent.xpBreakdown.sprintMetricsScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.sprintMetricsScore || 0} XP
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Escalaciones ({(selectedAgent.xpBreakdown as any).escalacionesCompletadas || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).escalacionesScore || 0} XP</span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Visitas ({(selectedAgent.xpBreakdown as any).visitasCompletadas || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).visitasScore || 0} XP</span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Tareas ({(selectedAgent.xpBreakdown as any).tareasCompletadas || 0})</span>
                            <span className="text-emerald-600 font-bold">+{(selectedAgent.xpBreakdown as any).tareasScore || 0} XP</span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Evaluaciones ({(selectedAgent.xpBreakdown as any).evaluacionesCompletadas || selectedAgent.xpBreakdown.evaluationsCount || 0})</span>
                            <span className="text-emerald-600 font-bold">+{selectedAgent.xpBreakdown.evaluationsScore || 0} XP</span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-500">Eventos & Bonos</span>
                            <span className={`font-bold ${eventosTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {eventosTotal > 0 ? '+' : ''}{eventosTotal} XP
                            </span>
                          </div>
                          <div className="flex justify-between text-[12px] py-2 mt-2 border-t border-slate-200">
                            <span className="text-slate-900 font-black">Total XP Generado en Sprint</span>
                            <span className="text-indigo-600 font-black">{selectedAgent.xpBreakdown.performanceScore + selectedAgent.xpBreakdown.attendanceScore + (selectedAgent.xpBreakdown.sprintMetricsScore || 0) + eventosTotal} XP</span>
                          </div>
                          <div className="flex justify-between text-[11px] py-1 border-b border-slate-50">
                            <span className="text-slate-900 font-bold">Base XP</span>
                            <span className="text-indigo-600 font-bold">{selectedAgent.xpBreakdown.baseXp} XP</span>
                          </div>
                        </div>
                      </div>

                      {/* Column 2: Sprint Metrics */}
                      <div className="lg:col-span-3 bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col">
                        <h5 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wider">Métricas del Sprint</h5>
                        <div className="space-y-2">
                            {(selectedAgent.xpBreakdown.asignados !== undefined) ? (
                              <>
                                <div className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                                  <span className="text-slate-500">Carga Trabajo ({selectedAgent.xpBreakdown.cargaTrabajo})</span>
                                  <span className={`font-bold ${(selectedAgent.xpBreakdown.cargaScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(selectedAgent.xpBreakdown.cargaScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.cargaScore || 0} XP</span>
                                </div>
                                <div className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                                  <span className="text-slate-500">Aporte Resolución ({selectedAgent.xpBreakdown.aporteRes || 0}%)</span>
                                  <span className={`font-bold ${(selectedAgent.xpBreakdown.aporteScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(selectedAgent.xpBreakdown.aporteScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.aporteScore || 0} XP</span>
                                </div>
                                <div className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                                  <span className="text-slate-500">Carga Global Roster ({selectedAgent.xpBreakdown.cargaGlobalRoster || 0}%)</span>
                                  <span className={`font-bold ${(selectedAgent.xpBreakdown.globalLoadScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(selectedAgent.xpBreakdown.globalLoadScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.globalLoadScore || 0} XP</span>
                                </div>
                                <div className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                                  <span className="text-slate-500">Eficiencia Equipo ({selectedAgent.xpBreakdown.eficienciaEquipo || 0}%)</span>
                                  <span className={`font-bold ${(selectedAgent.xpBreakdown.efficiencyScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(selectedAgent.xpBreakdown.efficiencyScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.efficiencyScore || 0} XP</span>
                                </div>
                                <div className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                                  <span className="text-slate-500">Resolución Global ({selectedAgent.xpBreakdown.resolucionGlobal || 0}%)</span>
                                  <span className={`font-bold ${(selectedAgent.xpBreakdown.resolucionGlobalScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(selectedAgent.xpBreakdown.resolucionGlobalScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.resolucionGlobalScore || 0} XP</span>
                                </div>
                                <div className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                                  <span className="text-slate-500">Índice de Foco ({selectedAgent.xpBreakdown.indiceFoco || 0}%)</span>
                                  <span className={`font-bold ${(selectedAgent.xpBreakdown.indiceFocoScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(selectedAgent.xpBreakdown.indiceFocoScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.indiceFocoScore || 0} XP</span>
                                </div>
                                <div className="flex justify-between text-[10px] py-1 border-b border-slate-50">
                                  <span className="text-slate-500">Impacto Roster ({selectedAgent.xpBreakdown.impactoRosterText || 'N/A'})</span>
                                  <span className={`font-bold ${(selectedAgent.xpBreakdown.impactoRosterScore || 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{(selectedAgent.xpBreakdown.impactoRosterScore || 0) > 0 ? '+' : ''}{selectedAgent.xpBreakdown.impactoRosterScore || 0} XP</span>
                                </div>
                              </>
                            ) : (
                              <div className="text-center py-4 text-slate-300 text-[10px] italic">No elegible o sin datos</div>
                            )}
                          </div>
                      </div>

                      {/* Column 3: Attendance Table */}
                      <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
                        <div className="p-3 border-b border-slate-100 flex items-center justify-between">
                          <h5 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Bitácora de Asistencia</h5>
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <input 
                                type="text"
                                placeholder="Filtrar..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="bg-slate-50 border border-slate-200 rounded-md pl-7 pr-2 py-1 text-[10px] outline-none focus:border-indigo-500 w-24"
                              />
                              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">search</span>
                            </div>
                            <select 
                              value={statusFilter}
                              onChange={e => setStatusFilter(e.target.value as any)}
                              className="bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-[10px] outline-none focus:border-indigo-500 font-medium"
                            >
                              <option value="all">Filtro</option>
                              <option value="Temprano">Temprano</option>
                              <option value="A Tiempo">A Tiempo</option>
                              <option value="Gracia">Gracia</option>
                              <option value="Tardanza">Tardanza</option>
                              <option value="Falta">Falta</option>
                            </select>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-[10px] text-left border-separate border-spacing-0">
                            <thead className="sticky top-0 bg-slate-50 z-10">
                              <tr className="text-slate-400 font-black uppercase tracking-widest">
                                <th className="px-3 py-2 border-b border-slate-200">Día</th>
                                <th className="px-3 py-2 border-b border-slate-200">Fecha</th>
                                <th className="px-3 py-2 border-b border-slate-200">Estado</th>
                                <th className="px-3 py-2 border-b border-slate-200">Esperado</th>
                                <th className="px-3 py-2 border-b border-slate-200">Registro</th>
                                <th className="px-3 py-2 border-b border-slate-200 text-right">XP</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredAttendance.length > 0 ? (
                                filteredAttendance.map((detail: any, idx: number) => {
                                  const dayName = getDayName(detail.fecha);
                                  const isPos = detail.points > 0;
                                  const isNeg = detail.points < 0;
                                  return (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0">
                                      <td className="px-3 py-2.5 font-black text-slate-400 border-b border-slate-100">{dayName}</td>
                                      <td className="px-3 py-2.5 font-medium text-slate-600 border-b border-slate-100">{detail.fecha || 'N/A'}</td>
                                      <td className="px-3 py-2.5 border-b border-slate-100">
                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                          detail.estado === 'Temprano' ? 'bg-emerald-100 text-emerald-700' :
                                          detail.estado === 'A Tiempo' ? 'bg-blue-100 text-blue-700' :
                                          detail.estado === 'Gracia' ? 'bg-amber-100 text-amber-700' :
                                          detail.estado === 'Tardanza' ? 'bg-rose-100 text-rose-700' :
                                          detail.estado === 'Falta' ? 'bg-slate-800 text-white-keep' :
                                          detail.estado === 'Permiso' ? 'bg-indigo-100 text-indigo-700' :
                                          detail.estado === 'Vacaciones' ? 'bg-purple-100 text-purple-700' :
                                          detail.estado === 'Visita' ? 'bg-sky-100 text-sky-700' :
                                          detail.estado === 'Home Office' ? 'bg-cyan-100 text-cyan-700' :
                                          detail.estado === 'Justificado' ? 'bg-teal-100 text-teal-700' :
                                          detail.estado === 'Remoto' ? 'bg-cyan-100 text-cyan-700' :
                                          'bg-slate-100 text-slate-500'
                                        }`}>
                                          {detail.estado}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2.5 text-slate-400 font-mono border-b border-slate-100">{detail.expectedCheckIn}</td>
                                      <td className="px-3 py-2.5 text-slate-400 font-mono border-b border-slate-100">{detail.checkIn}</td>
                                      <td className={`px-3 py-2.5 text-right font-black font-mono border-b border-slate-100 ${
                                        isPos ? 'text-emerald-600' : isNeg ? 'text-rose-600' : 'text-slate-300'
                                      }`}>
                                        {isPos ? '+' : ''}{detail.points}
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={6} className="text-center py-8 text-slate-300 font-mono italic">No hay datos</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Footer */}
                        <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-between gap-1">
                          {[
                            { l: 'TEM', v: selectedAgent.xpBreakdown.earlyCheckIns, c: 'text-emerald-600' },
                            { l: 'AT', v: selectedAgent.xpBreakdown.onTimeCheckIns, c: 'text-blue-600' },
                            { l: 'GRA', v: selectedAgent.xpBreakdown.graceCheckIns, c: 'text-amber-600' },
                            { l: 'TAR', v: selectedAgent.xpBreakdown.lateCheckIns, c: 'text-rose-600' },
                            { l: 'FAL', v: selectedAgent.xpBreakdown.missingCheckIns, c: 'text-slate-800' }
                          ].map(s => (
                            <div key={s.l} className="flex-grow bg-white px-2 py-1 rounded border border-slate-200 flex flex-col items-center">
                              <span className="text-[8px] font-black text-slate-400">{s.l}</span>
                              <span className={`text-[10px] font-black ${s.c}`}>{s.v || 0}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Full-width: Eventos y Bonos */}
                      <div className="lg:col-span-12 bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-col">
                        <h5 className="font-bold text-slate-800 text-xs mb-3 uppercase tracking-wider">Historial de Eventos & Bonos Manuales</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
                          {selectedAgent.xpEvents && selectedAgent.xpEvents.length > 0 ? (
                            selectedAgent.xpEvents.map((event: any, idx: number) => (
                              <div key={idx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 flex justify-between items-center">
                                <div className="min-w-0">
                                  <div className="text-[11px] font-bold text-slate-800 truncate">{event.title}</div>
                                  <div className="text-[10px] text-slate-400">{event.date}</div>
                                </div>
                                <span className={`font-mono font-bold text-[11px] ${event.xpYield >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {event.xpYield > 0 ? '+' : ''}{event.xpYield}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-full text-center py-4 text-slate-300 text-[10px] italic">
                              Sin eventos o bonos asignados en este sprint.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                    );
                  })()
                ) : (
                  <div className="flex-grow flex items-center justify-center text-slate-400 text-xs italic py-10">
                    Cargando desglose...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

        {activeSubTab === 'config' && (
          <div className="h-full flex flex-col gap-4 min-h-0">
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">Configuración de Parámetros XP</h3>
              <p className="text-sm text-slate-600">Ajusta los multiplicadores y parámetros que el sistema utiliza para calcular la experiencia de los agentes basándose en Roster y CRM.</p>
            </div>
            
            {loading ? (
              <div className="flex-grow flex justify-center items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : (
              <div className="flex-grow bg-slate-50 border-slate-200 rounded-lg p-6 border border-slate-200 overflow-y-auto">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Tickets & Rendimiento */}
                  <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6">
                    <div>
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                        <span className="material-symbols-outlined text-emerald-600">task_alt</span>
                        <h4 className="font-bold text-slate-900 text-lg">Métricas de Tickets (XP)</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Ticket Completado</span>
                            <span className="text-[11px] text-slate-500">CRM/Backlog resuelto</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.completedTickets} 
                            onChange={(e) => handleSettingChange('completedTickets', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Escalación Completada</span>
                            <span className="text-[11px] text-slate-500">Resolución de ticket escalado</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.completedEscalations || 0} 
                            onChange={(e) => handleSettingChange('completedEscalations', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Visita Completada</span>
                            <span className="text-[11px] text-slate-500">Resolución de ticket presencial/visita</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.completedVisits || 0} 
                            onChange={(e) => handleSettingChange('completedVisits', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Tarea Completada</span>
                            <span className="text-[11px] text-slate-500">Tarea resuelta en Request Backlog / Tareas</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.completedTasks || 0} 
                            onChange={(e) => handleSettingChange('completedTasks', e.target.value)}
                          />
                        </div>
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Evaluación Realizada</span>
                            <span className="text-[11px] text-slate-500">Evaluación de desempeño por agente</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.completedEvaluations || 0} 
                            onChange={(e) => handleSettingChange('completedEvaluations', e.target.value)}
                          />
                        </div>
                        
                        
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                        <span className="material-symbols-outlined text-amber-500">database</span>
                        <h4 className="font-bold text-slate-900 text-lg">Orígenes de Datos (Tickets)</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-slate-50" 
                            checked={settings.sourceCrm}
                            onChange={(e) => setSettings(prev => ({...prev, sourceCrm: e.target.checked}))}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">Requerimientos en Curso (CRM)</span>
                            <span className="text-[11px] text-slate-500">Base principal de tickets activos</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-slate-50" 
                            checked={settings.sourceWeekly}
                            onChange={(e) => setSettings(prev => ({...prev, sourceWeekly: e.target.checked}))}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">Backlog Semanal</span>
                            <span className="text-[11px] text-slate-500">Tareas planificadas de la semana</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-slate-50" 
                            checked={settings.sourceHistorical}
                            onChange={(e) => setSettings(prev => ({...prev, sourceHistorical: e.target.checked}))}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">Histórico Completados</span>
                            <span className="text-[11px] text-slate-500">Tickets resueltos de semanas anteriores</span>
                          </div>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-slate-50" 
                            checked={settings.sourceAdminDone}
                            onChange={(e) => setSettings(prev => ({...prev, sourceAdminDone: e.target.checked}))}
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800 group-hover:text-slate-900 transition-colors">Admin Backlog Done</span>
                            <span className="text-[11px] text-slate-500">Tareas administrativas completadas</span>
                          </div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Puntualidad & Asistencia + Estados */}
                  <div className="flex flex-col gap-8">
                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                        <span className="material-symbols-outlined text-indigo-600">schedule</span>
                        <h4 className="font-bold text-slate-900 text-lg">Asistencia y Puntualidad (XP)</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Check-in Temprano</span>
                            <span className="text-[11px] text-slate-500">Antes de la hora esperada</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.earlyCheckIns} 
                            onChange={(e) => handleSettingChange('earlyCheckIns', e.target.value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Check-in A Tiempo</span>
                            <span className="text-[11px] text-slate-500">Hora exacta esperada</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.onTimeCheckIns} 
                            onChange={(e) => handleSettingChange('onTimeCheckIns', e.target.value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Check-in en Gracia</span>
                            <span className="text-[11px] text-slate-500">Dentro de 15 minutos tarde</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.graceCheckIns} 
                            onChange={(e) => handleSettingChange('graceCheckIns', e.target.value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Tardanza</span>
                            <span className="text-[11px] text-rose-500">Más de 15 minutos tarde</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-rose-300 focus:border-rose-500 text-rose-600 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.lateCheckIns} 
                            onChange={(e) => handleSettingChange('lateCheckIns', e.target.value)}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between group">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-800">Inasistencia</span>
                            <span className="text-[11px] text-rose-500">Falta / Sin Check-in</span>
                          </div>
                          <input 
                            type="number" 
                            className="bg-slate-50 border border-rose-300 focus:border-rose-500 text-rose-600 px-3 py-1.5 rounded-lg w-24 text-right font-mono outline-none transition-colors" 
                            value={settings.missingCheckIns} 
                            onChange={(e) => handleSettingChange('missingCheckIns', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-3">
                        <span className="material-symbols-outlined text-blue-600">rule</span>
                        <h4 className="font-bold text-slate-900 text-lg">Criterios de Estado (Keywords)</h4>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <span className="text-sm font-bold text-slate-800">Palabras clave: Resuelto</span>
                          <span className="text-[11px] text-slate-500">Separadas por coma. Los tickets que contengan estas palabras en su estado contarán como completados.</span>
                          <textarea 
                            className="bg-slate-50 border border-slate-300 focus:border-indigo-500 text-slate-900 px-3 py-2 rounded-lg text-sm font-mono outline-none transition-colors resize-none h-20"
                            value={settings.statusResolvedWords?.join(', ')}
                            onChange={(e) => {
                              const words = e.target.value.split(',').map(w => w.trim()).filter(w => w);
                              setSettings(prev => ({...prev, statusResolvedWords: words}));
                            }}
                          />
                        </div>
                        
                        
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 flex justify-end">
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-slate-900 px-8 py-3 rounded-xl font-bold font-sans transition-all flex items-center gap-2 shadow-lg shadow-indigo-900/20"
                  >
                    {saving ? (
                      <>
                        <span className="animate-spin material-symbols-outlined text-sm">sync</span>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-sm">save</span>
                        Guardar Configuración
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
