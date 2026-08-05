import React, { useState } from 'react';
import { Agent, TierConfig } from '../../types';
import { motion } from 'motion/react';
import { AgentAvatarLogo } from '../AgentAvatarLogo';
import { getTierBadgeProps } from '../roster/RosterTab';

interface LeaderboardTabProps {
  agents: Agent[];
  tiers: TierConfig[];
  currentUser?: { username: string; name: string; email: string; role?: string } | null;
  onNavigateTab?: (tab: string, subTab?: string) => void;
}

export default function LeaderboardTab({ agents, tiers, currentUser, onNavigateTab }: LeaderboardTabProps) {
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedAuditAgent, setSelectedAuditAgent] = useState<Agent | null>(null);

  // Filter out A1 tier agents from the leaderboard ranking entirely as they do not classify
  const eligibleAgents = agents.filter(agent => agent.tierId?.toLowerCase() !== 'a1');

  // Separate regular agents from S1 & S2 agents (Coordinators & Supervisors)
  const regularAgents = eligibleAgents.filter(agent => {
    const tid = agent.tierId?.toLowerCase();
    return tid !== 's1' && tid !== 's2';
  });

  const supervisorAgents = eligibleAgents.filter(agent => {
    const tid = agent.tierId?.toLowerCase();
    return tid === 's1' || tid === 's2';
  });

  // Sort both groups strictly by XP descendently
  const sortedRegularAgents = [...regularAgents].sort((a, b) => b.currentXp - a.currentXp);
  const sortedSupervisorAgents = [...supervisorAgents].sort((a, b) => b.currentXp - a.currentXp);

  // Map regular agents to include their competitive rank indices (1, 2, 3...)
  const rankedRegularAgents = sortedRegularAgents.map((agent, index) => ({
    ...agent,
    rank: index + 1,
    isSupervisor: false
  }));

  // Map supervisor agents (they stay below, do not have a competitive numeric rank)
  const rankedSupervisorAgents = sortedSupervisorAgents.map((agent) => ({
    ...agent,
    rank: undefined,
    isSupervisor: true
  }));

  // Combine them to construct the final rankings dataset
  const rankedAgents = [...rankedRegularAgents, ...rankedSupervisorAgents];

  // Filtered dataset
  const filteredRankings = rankedAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) || 
                          agent.id.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === 'all' ? true : agent.tierId === tierFilter;
    return matchesSearch && matchesTier;
  });

  // Extract Podium (strictly Top 3 of regular competitive roster)
  const rank1 = rankedRegularAgents[0];
  const rank2 = rankedRegularAgents[1];
  const rank3 = rankedRegularAgents[2];

  const rank1Color = rank1 ? (tiers.find(t => t.id === rank1.tierId) || tiers[0]).colorHex : '#2563eb';
  const rank2Color = rank2 ? (tiers.find(t => t.id === rank2.tierId) || tiers[0]).colorHex : '#64748b';
  const rank3Color = rank3 ? (tiers.find(t => t.id === rank3.tierId) || tiers[0]).colorHex : '#64748b';

  // Remainder table dataset - always show all to list everyone on the team in their rank position as requested
  const useRawTableList = tierFilter !== 'all' || search !== '';
  const tableList = filteredRankings;

  // Trend mapping helper
  // Trend mapping helper for podium (smaller icon, no color class since it's wrapped)
  const getTrendInfo = (prevScore: number, currentScore: number) => {
    // Board-wide context helper: calculate competitive averages
    const eligibleScores = eligibleAgents.map(a => {
      return (a.xpBreakdown?.performanceScore || 0) + (a.xpBreakdown?.attendanceScore || 0) + (a.xpBreakdown?.eventXp || 0);
    });
    const avgScore = eligibleScores.reduce((sum, s) => sum + s, 0) / (eligibleScores.length || 1);
    
    // Low performance/score check: if the score is under 50% of the team average, or strictly under 100 XP,
    // they are considered low score on the board and are disqualified from Stars and Trophies (e.g. Robert Pichardo with 27 XP).
    const isLowScoreContext = currentScore < avgScore * 0.5 || currentScore < 100;

    if (prevScore === 0) {
      if (currentScore === 0) {
        return {
          icon: 'trending_flat',
          colorClass: 'text-slate-600',
          title: 'Sin cambios (ambos 0 XP)'
        };
      }
      if (currentScore >= 100 && !isLowScoreContext) {
        return {
          icon: 'emoji_events',
          colorClass: 'text-amber-700 drop-shadow-[0_0_2px_rgba(217,119,6,0.3)] animate-bounce',
          title: '¡Desempeño estelar! Mucho más del doble vs anterior (anterior era 0 XP)'
        };
      }
      if (currentScore >= 50 && !isLowScoreContext) {
        return {
          icon: 'star',
          colorClass: 'text-amber-700 drop-shadow-[0_0_2px_rgba(217,119,6,0.2)] animate-pulse',
          title: '¡Excelente aumento! Doble o más vs anterior (anterior era 0 XP)'
        };
      }
      return {
        icon: 'trending_up',
        colorClass: 'text-emerald-700',
        title: 'Aumento significativo vs anterior (anterior era 0 XP)'
      };
    }

    const ratio = currentScore / prevScore;
    const pct = (ratio - 1) * 100;

    // Mucho más del doble (ratio >= 2.5)
    if (ratio >= 2.5 && !isLowScoreContext) {
      return {
        icon: 'emoji_events',
        colorClass: 'text-amber-700 drop-shadow-[0_0_2px_rgba(217,119,6,0.3)] animate-bounce',
        title: `¡Desempeño Extraordinario! Mucho más del doble (+${Math.round(pct)}%)`
      };
    }
    // Por encima del doble (ratio >= 2.0)
    if (ratio >= 2.0 && !isLowScoreContext) {
      return {
        icon: 'star',
        colorClass: 'text-amber-700 drop-shadow-[0_0_2px_rgba(217,119,6,0.2)] animate-pulse',
        title: `¡Excelente! Por encima del doble (+${Math.round(pct)}%)`
      };
    }
    // 35% o más de incremento
    if (pct >= 35) {
      return {
        icon: 'trending_up',
        colorClass: 'text-emerald-700 font-extrabold',
        title: `Incremento considerable (+${Math.round(pct)}%)`
      };
    }
    // 35% o más de decremento
    if (pct <= -35) {
      return {
        icon: 'trending_down',
        colorClass: 'text-red-700 font-extrabold',
        title: `Disminución considerable (${Math.round(pct)}%)`
      };
    }
    // Margen de entre 5% y 10% (ya sea mas o menos) se mantiene en gris y recta (incluimos de -10% a 10%)
    if (pct >= -10 && pct <= 10) {
      return {
        icon: 'trending_flat',
        colorClass: 'text-slate-600',
        title: `Estable / Consistente (${pct >= 0 ? '+' : ''}${Math.round(pct)}%)`
      };
    }
    // Entre +10% y +35% (ligero incremento)
    if (pct > 10) {
      return {
        icon: 'trending_up',
        colorClass: 'text-emerald-700',
        title: `Ligero incremento (+${Math.round(pct)}%)`
      };
    }
    // Entre -10% y -35% (ligera disminución)
    return {
      icon: 'trending_down',
      colorClass: 'text-red-600',
      title: `Ligera disminución (${Math.round(pct)}%)`
    };
  };

  const renderPodiumTrendIcon = (agent: Agent) => {
    const prevScore = agent.xpBreakdown?.previousSprintScore || 0;
    const currentScore = (agent.xpBreakdown?.performanceScore || 0) + (agent.xpBreakdown?.attendanceScore || 0) + (agent.xpBreakdown?.eventXp || 0);
    return getTrendInfo(prevScore, currentScore).icon;
  };
  
  const getPodiumTrendColor = (agent: Agent) => {
    const prevScore = agent.xpBreakdown?.previousSprintScore || 0;
    const currentScore = (agent.xpBreakdown?.performanceScore || 0) + (agent.xpBreakdown?.attendanceScore || 0) + (agent.xpBreakdown?.eventXp || 0);
    return getTrendInfo(prevScore, currentScore).colorClass;
  };

  const renderTrend = (agent: Agent) => {
    if (agent.tierId?.toLowerCase() === 's1' || agent.tierId?.toLowerCase() === 's2') {
      return (
        <span className="material-symbols-outlined text-slate-400 select-none cursor-not-allowed" title="Tendencia congelada">
          trending_flat
        </span>
      );
    }
    const prevScore = agent.xpBreakdown?.previousSprintScore || 0;
    const currentScore = (agent.xpBreakdown?.performanceScore || 0) + (agent.xpBreakdown?.attendanceScore || 0) + (agent.xpBreakdown?.eventXp || 0);
    const info = getTrendInfo(prevScore, currentScore);
    
    return (
      <span className={`material-symbols-outlined ${info.colorClass}`} title={info.title}>
        {info.icon}
      </span>
    );
  };

  return (
    <div className="flex-grow flex flex-col gap-8" id="leaderboard-view-container">
          {/* Search Header and KPI context */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4" id="leaderboard-heading">
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">LeaderBoard</h2>
              <p className="font-sans text-sm text-slate-300">Puntuaciones públicas competitivas en tiempo real basadas en la acumulación de XP en todas las dimensiones operativas.</p>
            </div>
        
        <div className="flex items-center gap-2 bg-slate-900 px-3.5 py-2.5 rounded-xl border border-slate-800 text-xs font-mono text-indigo-400 self-start md:self-auto shadow-md">
          <span className="material-symbols-outlined text-[16px] text-indigo-400">calendar_month</span>
          <span className="font-black uppercase tracking-wider">Q3 2026 (Período Activo)</span>
        </div>
      </div>

      {/* Podium Cards Section - Top 3 (Visible when not actively searching/filtering, keep always beautiful in desktop) */}
      {!useRawTableList && (
        <section className="relative px-2 py-4" id="leaderboard-podium-section">
          {/* Subtle background ambiance */}
          <div className="absolute inset-0 bg-indigo-50/15 border border-slate-200/30 rounded-3xl pointer-events-none -z-10 backdrop-blur-xs" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end pt-12 md:max-w-4xl mx-auto">
            
            {/* Rank 2 - Sarah Jenkins Gold Frame */}
            {rank2 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="order-2 md:order-1 flex flex-col items-center group cursor-default"
              >
                <div className="relative w-full bg-white rounded-2xl border-t-[4px] border-amber-500 p-5 pt-8 flex flex-col items-center text-center shadow-md hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1">
                  
                  {/* Badge floating above portrait */}
                  <div className="absolute -top-10 flex flex-col items-center">
                    <span className="font-mono text-[9px] font-black uppercase text-amber-800 bg-amber-50 border border-amber-300 rounded-full px-3 py-1 shadow-sm mb-2">
                      Rango 2
                    </span>
                    <div className="w-16 h-16 rounded-full border-2 border-amber-500 bg-slate-50 relative shadow-md flex items-center justify-center">
                      <AgentAvatarLogo 
                        name={rank2.name}
                        initials={rank2.initials}
                        tierColor={rank2Color}
                        size="md"
                        className="w-full h-full border-0 shadow-none"
                      />
                      <div className={`absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-slate-200 flex items-center justify-center shadow-xs ${getPodiumTrendColor(rank2)}`}>
                        <span className="material-symbols-outlined text-[10px] font-extrabold">{renderPodiumTrendIcon(rank2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body stats */}
                  <div className="mt-8 w-full">
                    <h3 className="font-display font-extrabold text-slate-900 text-sm line-clamp-1">{rank2.name}</h3>
                    <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{rank2.role}</p>

                    <div className="mt-4 bg-slate-50 py-2.5 px-3 rounded-xl border border-slate-200/80 w-full text-xs font-mono flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px] font-medium">Tier</span>
                        <span className="font-sans font-black text-[9px] bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded uppercase shadow-2xs">
                          {tiers.find(t=>t.id===rank2.tierId)?.badgeName.split(' ')[0] || 'L3'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5 mt-1">
                        <span className="text-slate-500 text-[10px] font-medium">Puntos XP</span>
                        <span className="font-bold text-slate-900">{rank2.currentXp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* Rank 1 - Marcus Chen Diamond / Neon frame */}
            {rank1 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="order-1 md:order-2 flex flex-col items-center group relative z-10 cursor-default"
              >
                {/* Glowing halo behind Rank 1 */}
                <div className="absolute inset-0 bg-indigo-500/5 blur-3xl rounded-full -z-10 scale-95" />
                
                <div className="relative w-full bg-white rounded-2xl border-t-[6px] border-[#1e40af] p-5 pt-10 flex flex-col items-center text-center shadow-lg hover:shadow-xl transition-all duration-300 md:scale-105 transform group-hover:-translate-y-2">
                  
                  {/* Floating Rank 1 Tag */}
                  <div className="absolute -top-12 flex flex-col items-center">
                    <span className="font-mono text-[9px] font-black uppercase text-indigo-800 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 shadow-sm mb-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px] font-extrabold text-[#1e40af]">star</span> Rank 1
                    </span>
                    <div className="w-20 h-20 rounded-full border-2 border-[#1e40af] bg-indigo-50 relative shadow-md flex items-center justify-center">
                      <AgentAvatarLogo 
                        name={rank1.name}
                        initials={rank1.initials}
                        tierColor={rank1Color}
                        size="md"
                        className="w-full h-full border-0 shadow-none"
                      />
                      <div className={`absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 border border-slate-200 flex items-center justify-center shadow-sm ${getPodiumTrendColor(rank1)}`}>
                        <span className="material-symbols-outlined text-xs font-black">{renderPodiumTrendIcon(rank1)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="mt-10 w-full">
                    <h3 className="font-display font-extrabold text-slate-900 text-base line-clamp-1">{rank1.name}</h3>
                    <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{rank1.role}</p>

                    <div className="mt-4 bg-indigo-50/30 py-3.5 px-3 rounded-xl border border-indigo-100/70 w-full text-xs font-mono flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-indigo-950/70 text-[10px] font-medium">Tier</span>
                        <span className="font-sans font-black text-[9px] bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded uppercase shadow-2xs">
                          {tiers.find(t=>t.id===rank1.tierId)?.badgeName.split(' ')[0] || 'L1'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-indigo-100/60 pt-2 mt-1.5">
                        <span className="text-indigo-950/70 text-[10px] font-medium">Puntos XP</span>
                        <span className="font-display text-sm font-extrabold text-[#1e40af]">{rank1.currentXp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

            {/* Rank 3 - Elena Rodriguez Silver Frame */}
            {rank3 && (
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="order-3 flex flex-col items-center group cursor-default"
              >
                <div className="relative w-full bg-white rounded-2xl border-t-[4px] border-slate-400 p-5 pt-8 flex flex-col items-center text-center shadow-md hover:shadow-lg transition-all duration-300 transform group-hover:-translate-y-1">
                  
                  {/* Floating Tag */}
                  <div className="absolute -top-10 flex flex-col items-center">
                    <span className="font-mono text-[9px] font-black uppercase text-slate-800 bg-slate-50 border border-slate-300 rounded-full px-3 py-1 shadow-sm mb-2">
                      Rango 3
                    </span>
                    <div className="w-16 h-16 rounded-full border-2 border-slate-400 bg-slate-50 relative shadow-md flex items-center justify-center">
                      <AgentAvatarLogo 
                        name={rank3.name}
                        initials={rank3.initials}
                        tierColor={rank3Color}
                        size="md"
                        className="w-full h-full border-0 shadow-none"
                      />
                      <div className={`absolute -bottom-1 -right-1 bg-white rounded-full p-1 border border-slate-200 flex items-center justify-center shadow-xs ${getPodiumTrendColor(rank3)}`}>
                        <span className="material-symbols-outlined text-[10px] font-extrabold">{renderPodiumTrendIcon(rank3)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body stats */}
                  <div className="mt-8 w-full">
                    <h3 className="font-display font-extrabold text-slate-900 text-sm line-clamp-1">{rank3.name}</h3>
                    <p className="font-mono text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{rank3.role}</p>

                    <div className="mt-4 bg-slate-50 py-2.5 px-3 rounded-xl border border-slate-200/80 w-full text-xs font-mono flex flex-col gap-1.5 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-[10px] font-medium">Tier</span>
                        <span className="font-sans font-black text-[9px] bg-slate-200 text-slate-800 border border-slate-300 px-2 py-0.5 rounded uppercase shadow-2xs">
                          {tiers.find(t=>t.id===rank3.tierId)?.badgeName.split(' ')[0] || 'L2'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-200/60 pt-1.5 mt-1">
                        <span className="text-slate-500 text-[10px] font-medium">Puntos XP</span>
                        <span className="font-bold text-slate-900">{rank3.currentXp.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                </div>
              </motion.div>
            )}

          </div>
        </section>
      )}

      {/* Rankings List & Search Toolbar */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden" id="leaderboard-table-section">
        
        {/* Filter bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-display text-xs font-black uppercase tracking-wider text-white">
              {useRawTableList ? 'Resultados de Búsqueda / Filtro' : 'Tabla Completa de Posiciones'}
            </h3>

            {/* Quick Access: Análisis por Roster */}
            <button
              onClick={() => onNavigateTab?.('request_backlog', 'roster_analysis')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-95 text-white border border-indigo-400/40 rounded-xl text-xs font-extrabold transition-all shadow-sm cursor-pointer hover:shadow-indigo-500/20"
              title="Ir a la sección de Análisis por Roster en el Backlog de Requerimientos"
              id="btn-quick-roster-analysis"
            >
              <span className="material-symbols-outlined text-sm">analytics</span>
              <span>Análisis por Roster</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Inline search */}
            <div className="relative flex-grow sm:flex-grow-0 sm:w-52">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-300">search</span>
              <input 
                type="text" 
                placeholder="Filtrar por nombre o ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 transition-all font-sans font-medium"
              />
            </div>

            {/* Inline select */}
            <div className="relative">
              <select
                value={tierFilter}
                onChange={(e) => setTierFilter(e.target.value)}
                className="appearance-none py-1.5 pl-3.5 pr-8 text-xs bg-slate-800 border border-slate-700 rounded-xl text-white font-sans font-medium cursor-pointer focus:outline-none focus:border-indigo-400 transition-all"
              >
                <option value="all" className="bg-slate-900 text-white font-medium">Ver todos los tiers</option>
                {tiers.map((t, index) => (
                  <option key={`leaderboard-tier-opt-${t.id}-${index}`} value={t.id} className="bg-slate-900 text-white font-medium">{t.name.split(' ')[1]}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none select-none text-sm">
                keyboard_arrow_down
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic Rankings Table */}
        <div className="overflow-x-auto bg-white">
          <table className="w-full text-left border-collapse min-w-[650px]" id="leaderboard-data-table">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200/80">
                <th className="py-3 px-6 text-slate-700 font-mono text-[10px] uppercase font-bold tracking-wider text-center w-20">Rango</th>
                <th className="py-3 px-6 text-slate-700 font-mono text-[10px] uppercase font-bold tracking-wider">Nombre del Agente</th>
                <th className="py-3 px-6 text-slate-700 font-mono text-[10px] uppercase font-bold tracking-wider">Tier Actual</th>
                <th className="py-3 px-6 text-slate-700 font-mono text-[10px] uppercase font-bold tracking-wider text-center w-20">Tendencia</th>
                <th className="py-3 px-6 text-slate-700 font-mono text-[10px] uppercase font-bold tracking-wider text-right">Puntos XP Totales</th>
                <th className="py-3 px-6 text-slate-700 font-mono text-[10px] uppercase font-bold tracking-wider text-center w-24">Detalles</th>
              </tr>
            </thead>
            <tbody className="font-sans text-xs bg-white">
              {tableList.map((agent, index) => {
                const currentTier = tiers.find(t => t.id === agent.tierId) || tiers[0];
                const isFirstSupervisorInList = agent.isSupervisor && (index === 0 || !tableList[index - 1].isSupervisor);
                return (
                  <React.Fragment key={agent.id}>
                    {isFirstSupervisorInList && (
                      <tr className="bg-slate-100/90 border-t border-b border-indigo-200" id="supervisor-section-divider">
                        <td colSpan={6} className="py-3.5 px-6 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <span className="h-px bg-indigo-200 flex-grow" />
                            <span className="font-mono text-[10px] font-black uppercase text-indigo-900 tracking-wider flex items-center gap-2">
                              <span className="material-symbols-outlined text-[15px] text-indigo-700">shield_person</span>
                              División de Coordinación & Supervisión (Fuera de Podio)
                            </span>
                            <span className="h-px bg-indigo-200 flex-grow" />
                          </div>
                        </td>
                      </tr>
                    )}
                    <tr 
                      onClick={() => {
                        if (agent.isSupervisor) return;
                        if (agent.xpBreakdown) {
                          setSelectedAuditAgent(agent);
                        }
                      }}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-all duration-150 group ${agent.isSupervisor ? 'cursor-default' : agent.xpBreakdown ? 'cursor-pointer' : 'cursor-default'}`}
                      title={agent.isSupervisor ? "Supervisores/Coordinadores fuera de competición" : agent.xpBreakdown ? "Haga clic para ver desglose y auditoría detallada de puntos" : undefined}
                    >
                      {/* Position */}
                      <td className="py-4.5 px-6 text-center text-indigo-700 font-mono font-black text-xs">
                        {agent.isSupervisor ? (
                          <span className="text-slate-400 font-bold" title="Rango de Supervisión / Fuera de Competición">
                            —
                          </span>
                        ) : (
                          `#${agent.rank}`
                        )}
                      </td>

                      {/* Agent Name card */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          <AgentAvatarLogo 
                            name={agent.name}
                            initials={agent.initials}
                            tierColor={(tiers.find(t => t.id === agent.tierId) || tiers[0]).colorHex}
                            size="md"
                            className="group-hover:scale-105 transition-transform duration-200"
                          />
                          <div>
                            <p className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{agent.name}</p>
                            <p className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mt-0.5">ID: {agent.id} &bull; <span className="text-slate-500">{agent.role}</span></p>
                          </div>
                        </div>
                      </td>

                      {/* Badge */}
                      <td className="py-4.5 px-6">
                        {(() => {
                           const badgeProps = getTierBadgeProps(agent.tierId, currentTier.colorHex);
                           return (
                             <span 
                               className="inline-block font-mono text-[8.5px] uppercase font-bold px-2.5 py-0.5 rounded-full border shadow-2xs select-none tracking-wider"
                               style={{ 
                                 backgroundColor: badgeProps.bg,
                                 color: badgeProps.text,
                                 borderColor: badgeProps.border
                               }}
                             >
                               {currentTier.badgeName}
                             </span>
                           );
                        })()}
                      </td>

                      {/* Trend */}
                      <td className="py-4.5 px-6 text-center">
                        <div className="inline-flex justify-center transform group-hover:scale-110 transition-transform">
                          {renderTrend(agent)}
                        </div>
                      </td>

                      {/* XP Score accumulative */}
                      <td className="py-4.5 px-6 text-right font-mono font-black text-xs text-slate-900 tracking-wide tabular-nums">
                        {agent.currentXp.toLocaleString()} <span className="text-slate-500 font-normal">XP</span>
                      </td>

                      {/* Details action button (Auditar) */}
                      <td className="py-4.5 px-6 text-center">
                        {agent.isSupervisor ? (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-400 border border-slate-200 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold select-none cursor-not-allowed uppercase tracking-wider" title="Auditoría congelada para rango de supervisión">
                            Congelado
                          </span>
                        ) : agent.xpBreakdown ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAuditAgent(agent);
                            }}
                            className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/50 hover:border-indigo-300/80 px-3 py-1.5 rounded-lg transition-all shadow-2xs cursor-pointer select-none"
                            title="Ver desglose detallado de puntos (Auditoría)"
                          >
                            <span className="material-symbols-outlined text-[14px]">analytics</span>
                            <span>Auditar</span>
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px] select-none">—</span>
                        )}
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {tableList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-xs text-slate-400 italic">
                    Sin resultados bajo los filtros indicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info pagination */}
        <div className="px-6 py-3.5 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs font-medium text-slate-200">
          <span className="text-slate-200 font-medium">Mostrando {tableList.length} de {filteredRankings.length} agentes técnicos evaluados</span>
          <span className="font-mono font-bold tracking-widest text-indigo-300 text-[10px] uppercase">FHONS Mastery Sync</span>
        </div>

      </section>

      {/* Dynamic Performance & Attendance Audit Modal */}
      {selectedAuditAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="keep-dark-bg relative w-full max-w-5xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
              <div>
                <h3 className="text-lg font-extrabold font-display text-white">Auditoría de Desempeño y Asistencia</h3>
                <p className="text-slate-300 text-xs font-mono">Agente: {selectedAuditAgent.name} (ID: {selectedAuditAgent.id})</p>
              </div>
              <button 
                onClick={() => setSelectedAuditAgent(null)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Body scrollable */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-3">
                  {/* Dynamic score summary */}
                  {(() => {
                    const auditEvalXp = selectedAuditAgent.xpBreakdown?.evaluationsScore !== undefined
                      ? selectedAuditAgent.xpBreakdown.evaluationsScore
                      : (selectedAuditAgent.xpEvents || [])
                          .filter(e => e.type === 'eval')
                          .reduce((sum, e) => sum + (Number(e.xpYield) || 0), 0);

                    const auditEvalCount = selectedAuditAgent.evaluationsHistory?.length 
                      || (selectedAuditAgent.xpEvents || []).filter(e => e.type === 'eval').length 
                      || selectedAuditAgent.xpBreakdown?.evaluationsCount 
                      || 0;

                    return (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-center shadow-inner">
                          <span className="text-slate-300 text-[9px] uppercase font-mono block">XP Total de Rango</span>
                          <span className="text-lg font-black text-cyan-300 font-display mt-0.5 block">{selectedAuditAgent.currentXp.toLocaleString()} XP</span>
                        </div>
                        <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-center shadow-inner">
                          <span className="text-slate-300 text-[9px] uppercase font-mono block">Rendimiento Tickets</span>
                          <span className="text-lg font-black text-emerald-300 font-display mt-0.5 block">+{selectedAuditAgent.xpBreakdown?.performanceScore || 0} XP</span>
                        </div>
                        <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-center shadow-inner">
                          <span className="text-slate-300 text-[9px] uppercase font-mono block">Adherencia Check-In</span>
                          <span className={`text-lg font-black font-display mt-0.5 block ${(selectedAuditAgent.xpBreakdown?.attendanceScore || 0) >= 0 ? 'text-indigo-200' : 'text-rose-200'}`}>
                            {(selectedAuditAgent.xpBreakdown?.attendanceScore || 0) >= 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown?.attendanceScore || 0} XP
                          </span>
                        </div>
                        {selectedAuditAgent.xpBreakdown?.sprintMetricsScore !== undefined && (
                          <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-center shadow-inner">
                            <span className="text-slate-300 text-[9px] uppercase font-mono block">Métricas Sprint</span>
                            <span className={`text-lg font-black font-display mt-0.5 block ${(selectedAuditAgent.xpBreakdown?.sprintMetricsScore || 0) >= 0 ? 'text-teal-200' : 'text-rose-200'}`}>
                              {(selectedAuditAgent.xpBreakdown?.sprintMetricsScore || 0) > 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown?.sprintMetricsScore || 0} XP
                            </span>
                          </div>
                        )}
                        <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-center shadow-inner flex flex-col justify-center">
                          <span className="text-slate-300 text-[9px] uppercase font-mono block">Eventos / Extras</span>
                          <span className="text-base font-black text-violet-300 font-display mt-0.5 block">{(selectedAuditAgent.xpBreakdown?.eventXp || 0) >= 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown?.eventXp || 0} XP</span>
                          {selectedAuditAgent.xpBreakdown?.baseXp ? <span className="text-[9px] text-slate-400 font-mono mt-0 block">Base: {selectedAuditAgent.xpBreakdown.baseXp} XP</span> : null}
                        </div>
                        <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-center shadow-inner flex flex-col justify-center">
                          <span className="text-slate-300 text-[9px] uppercase font-mono block">Evaluaciones Sprint</span>
                          <span className={`text-base font-black font-display mt-0.5 block ${auditEvalXp > 0 ? 'text-amber-300' : 'text-amber-300/80'}`}>
                            +{auditEvalXp} XP
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono mt-0 block">
                            {auditEvalCount} {auditEvalCount === 1 ? 'Evaluación' : 'Evaluaciones'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                  {/* 2. Attendance / check-in breakdown */}
                  <div className="space-y-3 mt-4">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">schedule</span> Historial de Puntualidad
                    </h4>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 grid grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 bg-indigo-950/40 rounded-lg border border-indigo-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Temprano</span>
                        <span className="text-sm font-black font-mono text-indigo-300 block">{selectedAuditAgent.xpBreakdown?.earlyCheckIns || 0} d</span>
                      </div>
                      <div className="p-2 bg-emerald-950/40 rounded-lg border border-emerald-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">A Tiempo</span>
                        <span className="text-sm font-black font-mono text-emerald-300 block">{selectedAuditAgent.xpBreakdown?.onTimeCheckIns || 0} d</span>
                      </div>
                      <div className="p-2 bg-amber-950/40 rounded-lg border border-amber-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Gracia</span>
                        <span className="text-sm font-black font-mono text-amber-300 block">{selectedAuditAgent.xpBreakdown?.graceCheckIns || 0} d</span>
                      </div>
                      <div className="p-2 bg-orange-950/40 rounded-lg border border-orange-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Tardanza</span>
                        <span className="text-sm font-black font-mono text-orange-300 block">{selectedAuditAgent.xpBreakdown?.lateCheckIns || 0} d</span>
                      </div>
                      <div className="p-2 bg-rose-950/40 rounded-lg border border-rose-900/30">
                        <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Falta</span>
                        <span className="text-sm font-black font-mono text-rose-300 block">{selectedAuditAgent.xpBreakdown?.missingCheckIns || 0} d</span>
                      </div>
                    </div>
                  </div>
                  </div>

                {/* Right Column */}
                <div className="space-y-3">
                  {/* 1. Ticket performance breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">assignment</span> Auditoría de Tickets (CRM)
                    </h4>
                    <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 grid grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 bg-emerald-900/40 rounded-lg border border-emerald-700/50">
                        <span className="text-slate-200 block text-[9px] uppercase tracking-wider mb-1">Cerrados</span>
                        <span className="text-sm font-black font-mono text-emerald-300 block">{selectedAuditAgent.xpBreakdown?.completedTickets || 0}</span>
                        <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">+{(selectedAuditAgent.xpBreakdown as any)?.ticketsScore ?? (selectedAuditAgent.xpBreakdown ? (selectedAuditAgent.xpBreakdown.performanceScore - ((selectedAuditAgent.xpBreakdown as any).escalacionesScore || 0) - ((selectedAuditAgent.xpBreakdown as any).visitasScore || 0) - ((selectedAuditAgent.xpBreakdown as any).tareasScore || 0) - ((selectedAuditAgent.xpBreakdown as any).evaluationsScore || 0)) : 0)} XP</span>
                      </div>
                      <div className="p-2 bg-emerald-900/40 rounded-lg border border-emerald-700/50">
                        <span className="text-slate-200 block text-[9px] uppercase tracking-wider mb-1">Escalaciones</span>
                        <span className="text-sm font-black font-mono text-emerald-300 block">{(selectedAuditAgent.xpBreakdown as any)?.escalacionesCompletadas || 0}</span>
                        <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">+{(selectedAuditAgent.xpBreakdown as any)?.escalacionesScore || 0} XP</span>
                      </div>
                      <div className="p-2 bg-emerald-900/40 rounded-lg border border-emerald-700/50">
                        <span className="text-slate-200 block text-[9px] uppercase tracking-wider mb-1">Visitas</span>
                        <span className="text-sm font-black font-mono text-emerald-300 block">{(selectedAuditAgent.xpBreakdown as any)?.visitasCompletadas || 0}</span>
                        <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">+{(selectedAuditAgent.xpBreakdown as any)?.visitasScore || 0} XP</span>
                      </div>
                      <div className="p-2 bg-emerald-900/40 rounded-lg border border-emerald-700/50">
                        <span className="text-slate-200 block text-[9px] uppercase tracking-wider mb-1">Tareas</span>
                        <span className="text-sm font-black font-mono text-emerald-300 block">{(selectedAuditAgent.xpBreakdown as any)?.tareasCompletadas || 0}</span>
                        <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">+{(selectedAuditAgent.xpBreakdown as any)?.tareasScore || 0} XP</span>
                      </div>
                      <div className="p-2 bg-emerald-900/40 rounded-lg border border-emerald-700/50">
                        <span className="text-slate-200 block text-[9px] uppercase tracking-wider mb-1">Evaluaciones</span>
                        <span className="text-sm font-black font-mono text-emerald-300 block">{(selectedAuditAgent.xpBreakdown as any)?.evaluacionesCompletadas || selectedAuditAgent.xpBreakdown?.evaluationsCount || selectedAuditAgent.evaluationsHistory?.length || 0}</span>
                        <span className="text-[9px] text-emerald-400 font-bold block mt-0.5">+{selectedAuditAgent.xpBreakdown?.evaluationsScore || 0} XP</span>
                      </div>
                    </div>
                  </div>

                  {/* Sprint Metrics */}
                  {selectedAuditAgent.xpBreakdown?.asignados !== undefined && (
                    <div className="space-y-3">
                      <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-xs">analytics</span> Métricas del Sprint
                      </h4>
                      <div className="bg-slate-800 p-3 rounded-xl border border-slate-700 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="p-2.5 bg-slate-900/40 keep-dark-bg rounded-lg border border-slate-600/50">
                          <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Carga ({selectedAuditAgent.xpBreakdown.cargaTrabajo})</span>
                          <span className={`text-sm font-black font-mono block ${(selectedAuditAgent.xpBreakdown.cargaScore || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {(selectedAuditAgent.xpBreakdown.cargaScore || 0) > 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown.cargaScore || 0}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-900/40 keep-dark-bg rounded-lg border border-slate-600/50">
                          <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Aporte ({selectedAuditAgent.xpBreakdown.aporteRes || 0}%)</span>
                          <span className={`text-sm font-black font-mono block ${(selectedAuditAgent.xpBreakdown.aporteScore || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {(selectedAuditAgent.xpBreakdown.aporteScore || 0) > 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown.aporteScore || 0}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-900/40 keep-dark-bg rounded-lg border border-slate-600/50">
                          <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Carga Roster ({selectedAuditAgent.xpBreakdown.cargaGlobalRoster || 0}%)</span>
                          <span className={`text-sm font-black font-mono block ${(selectedAuditAgent.xpBreakdown.globalLoadScore || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {(selectedAuditAgent.xpBreakdown.globalLoadScore || 0) > 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown.globalLoadScore || 0}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-900/40 keep-dark-bg rounded-lg border border-slate-600/50">
                          <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Eficiencia ({selectedAuditAgent.xpBreakdown.eficienciaEquipo || 0}%)</span>
                          <span className={`text-sm font-black font-mono block ${(selectedAuditAgent.xpBreakdown.efficiencyScore || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {(selectedAuditAgent.xpBreakdown.efficiencyScore || 0) > 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown.efficiencyScore || 0}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-900/40 keep-dark-bg rounded-lg border border-slate-600/50">
                          <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Res. Global ({selectedAuditAgent.xpBreakdown.resolucionGlobal || 0}%)</span>
                          <span className={`text-sm font-black font-mono block ${(selectedAuditAgent.xpBreakdown.resolucionGlobalScore || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {(selectedAuditAgent.xpBreakdown.resolucionGlobalScore || 0) > 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown.resolucionGlobalScore || 0}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-900/40 keep-dark-bg rounded-lg border border-slate-600/50">
                          <span className="text-slate-300 block text-[9px] uppercase tracking-wider mb-1">Foco ({selectedAuditAgent.xpBreakdown.indiceFoco || 0}%)</span>
                          <span className={`text-sm font-black font-mono block ${(selectedAuditAgent.xpBreakdown.indiceFocoScore || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {(selectedAuditAgent.xpBreakdown.indiceFocoScore || 0) > 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown.indiceFocoScore || 0}
                          </span>
                        </div>
                        <div className="p-2.5 bg-slate-900/40 keep-dark-bg rounded-lg border border-slate-600/50 col-span-3 flex justify-between items-center px-3">
                          <span className="text-slate-300 text-[9px] uppercase tracking-wider">Impacto Roster ({selectedAuditAgent.xpBreakdown.impactoRosterText || 'N/A'})</span>
                          <span className={`text-sm font-black font-mono ${(selectedAuditAgent.xpBreakdown.impactoRosterScore || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                            {(selectedAuditAgent.xpBreakdown.impactoRosterScore || 0) > 0 ? '+' : ''}{selectedAuditAgent.xpBreakdown.impactoRosterScore || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  </div>
                </div>

                  {/* List of dates */}
                  <div className="space-y-2">
                    <h4 className="text-[11px] font-mono font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-xs">list_alt</span> Detalle de Asistencia
                    </h4>
                    <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-900 keep-dark-bg">
                      <div className="w-full">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead className="sticky top-0 bg-slate-800 z-10 shadow">
                            <tr className="text-slate-300 border-b border-slate-700">
                              <th className="py-1.5 px-2 font-mono text-[9px] uppercase font-bold">Fecha</th>
                              <th className="py-1.5 px-2 font-mono text-[9px] uppercase font-bold">In</th>
                              <th className="py-1.5 px-2 font-mono text-[9px] uppercase font-bold">Esp</th>
                              <th className="py-1.5 px-2 font-mono text-[9px] uppercase font-bold">Detalle</th>
                              <th className="py-1.5 px-2 font-mono text-[9px] uppercase font-bold text-right">XP</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800">
                            {selectedAuditAgent.xpBreakdown?.attendanceDetail && selectedAuditAgent.xpBreakdown.attendanceDetail.length > 0 ? (
                              selectedAuditAgent.xpBreakdown.attendanceDetail.map((detail, idx) => (
                                <tr key={`audit-detail-${idx}`} className="hover:bg-slate-800/30">
                                  <td className="py-1.5 px-2 font-mono text-slate-100 whitespace-nowrap text-[10px]">{detail.fecha}</td>
                                  <td className="py-1.5 px-2 font-mono text-white font-bold text-[10px]">{detail.checkIn}</td>
                                  <td className="py-1.5 px-2 font-mono text-slate-300 text-[10px]">{detail.expectedCheckIn}</td>
                                  <td className="py-1.5 px-2">
                                    <span className={`inline-block px-1 py-0.5 rounded text-[8px] font-bold ${
                                      detail.estado === 'Temprano' ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/50' :
                                      detail.estado === 'A Tiempo' ? 'bg-blue-900/50 text-blue-300 border border-blue-700/50' :
                                      detail.estado === 'Gracia' ? 'bg-amber-900/50 text-amber-300 border border-amber-700/50' :
                                      detail.estado === 'Tardanza' ? 'bg-orange-900/50 text-orange-300 border border-orange-700/50' :
                                      detail.estado === 'Falta' ? 'bg-rose-900/50 text-rose-300 border border-rose-700/50' :
                                      detail.estado === 'Permiso' ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700/50' :
                                      detail.estado === 'Vacaciones' ? 'bg-purple-900/50 text-purple-300 border border-purple-700/50' :
                                      detail.estado === 'Visita' ? 'bg-sky-900/50 text-sky-300 border border-sky-700/50' :
                                      detail.estado === 'Home Office' ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50' :
                                      detail.estado === 'Justificado' ? 'bg-teal-900/50 text-teal-300 border border-teal-700/50' :
                                      detail.estado === 'Remoto' ? 'bg-cyan-900/50 text-cyan-300 border border-cyan-700/50' :
                                      'bg-slate-800 text-slate-200 border border-slate-600'
                                    }`}>
                                      {detail.estado}
                                    </span>
                                  </td>
                                  <td className={`py-1.5 px-2 text-right font-mono font-bold text-[10px] ${detail.points > 0 ? 'text-emerald-400' : detail.points < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                                    {detail.points > 0 ? `+${detail.points}` : detail.points === 0 ? '0' : detail.points}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={5} className="py-4 text-center text-slate-400 italic text-[10px]">
                                  Sin registros de asistencia con horario asignado.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-slate-700 bg-slate-800 flex justify-between items-center text-xs mt-auto">
              <span className="text-slate-400">Cálculo automático en tiempo real según Roster y CRM.</span>
              <button 
                onClick={() => setSelectedAuditAgent(null)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded text-[11px] font-bold transition-colors shadow-sm"
              >
                Cerrar Auditoría
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
