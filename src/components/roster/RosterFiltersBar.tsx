import React from 'react';
import { TierConfig } from '../../types';
import { 
  Users, 
  Search, 
  ChevronDown, 
  LayoutGrid, 
  List, 
  Award, 
  UserPlus, 
  Sparkles, 
  BadgeCheck, 
  TrendingUp 
} from 'lucide-react';

interface RosterFiltersBarProps {
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  selectedTier: string;
  setSelectedTier: (s: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (v: 'grid' | 'list') => void;
  tiers: TierConfig[];
  agentsCount: number;
  totalAgents: number;
  averageXp: number;
  seniorAgents: number;
  onOpenBatchReward: () => void;
  onOpenAddAgent: () => void;
  hasUpdateAgent: boolean;
  hasAddAgent: boolean;
}

export default function RosterFiltersBar({
  searchTerm,
  setSearchTerm,
  selectedTier,
  setSelectedTier,
  viewMode,
  setViewMode,
  tiers,
  agentsCount,
  totalAgents,
  averageXp,
  seniorAgents,
  onOpenBatchReward,
  onOpenAddAgent,
  hasUpdateAgent,
  hasAddAgent
}: RosterFiltersBarProps) {
  return (
    <div 
      className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col gap-4" 
      id="roster-filters-bar"
    >
      {/* 1. TOP ROW: Title & Detailed High-Fidelity KPI Cards */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4" id="roster-header-top">
        
        {/* Left Side: Brand/Section title & Active Badge (No Description) */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 shadow-3xs shrink-0 flex items-center justify-center">
            <Users className="w-5 h-5 stroke-[2.25]" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-black text-slate-900 tracking-tight uppercase">
                Roster de Técnicos de TI
              </h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-sans font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60 px-2.5 py-0.5 rounded-full shadow-3xs">
                <BadgeCheck className="w-3 h-3 text-emerald-600 fill-emerald-100" />
                {agentsCount} Activos
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Elegant Grid of KPI Cards (More compact layout) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full lg:w-auto" id="roster-header-kpis">
          
          {/* Card 1: Total Operativo */}
          <div className="bg-slate-50/50 border border-slate-200/30 py-2 px-3.5 rounded-xl flex items-center gap-3 hover:bg-slate-50 hover:border-slate-200/60 transition-all shadow-3xs">
            <div className="p-1.5 bg-white border border-slate-200/40 rounded-lg text-slate-500 shadow-3xs shrink-0 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <span className="block text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400">Total Operativo</span>
              <span className="font-sans font-black text-slate-800 text-xs mt-0.5 block">
                {totalAgents} Ingenieros
              </span>
            </div>
          </div>

          {/* Card 2: Promedio XP */}
          <div className="bg-slate-50/50 border border-slate-200/30 py-2 px-3.5 rounded-xl flex items-center gap-3 hover:bg-slate-50 hover:border-slate-200/60 transition-all shadow-3xs">
            <div className="p-1.5 bg-white border border-slate-200/40 rounded-lg text-amber-500 shadow-3xs shrink-0 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
            </div>
            <div>
              <span className="block text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400">Promedio XP</span>
              <span className="font-sans font-black text-slate-800 text-xs mt-0.5 block">
                {averageXp.toLocaleString()} pts
              </span>
            </div>
          </div>

          {/* Card 3: Líderes L3/L4 */}
          <div className="bg-slate-50/50 border border-slate-200/30 py-2 px-3.5 rounded-xl flex items-center gap-3 hover:bg-slate-50 hover:border-slate-200/60 transition-all shadow-3xs">
            <div className="p-1.5 bg-white border border-slate-200/40 rounded-lg text-indigo-500 shadow-3xs shrink-0 flex items-center justify-center">
              <Award className="w-3.5 h-3.5 text-indigo-500 fill-indigo-500/10" />
            </div>
            <div>
              <span className="block text-[8px] font-mono font-bold uppercase tracking-wider text-slate-400">Líderes L3/L4</span>
              <span className="font-sans font-black text-slate-800 text-xs mt-0.5 block">
                {seniorAgents} Séniors
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Elegant, clean horizontal border line divisor */}
      <div className="h-px bg-slate-100 w-full" />

      {/* 2. BOTTOM ROW: Interactive controls, search query bars & key action utilities */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="roster-header-controls">
        
        {/* Left: Responsive filtering inputs (Search + Select Tier) */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          
          {/* Search Box */}
          <div className="relative flex-grow sm:flex-grow-0 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none select-none" />
            <input
              type="text"
              placeholder="Buscar por nombre, ID o rol..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 text-slate-800 placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 focus:bg-white transition-all font-sans"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              id="roster-search-input"
            />
          </div>

          {/* Tier select Dropdown */}
          <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
            <select
              className="appearance-none w-full bg-slate-50 border border-slate-200 rounded-xl pl-3.5 pr-10 py-2 text-xs text-slate-700 font-sans focus:outline-none focus:ring-2 focus:ring-indigo-500/15 focus:border-indigo-600 focus:bg-white transition-all cursor-pointer"
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              id="roster-tier-select"
            >
              <option value="all">Filtro: Todos Tiers</option>
              {tiers.map((t, index) => (
                <option key={`filter-tier-opt-${t.id}-${index}`} value={t.id} className="bg-white text-slate-800">
                  {t.name} ({t.badgeName})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none select-none" />
          </div>

        </div>

        {/* Right: Grid switcher & global operations actions */}
        <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto md:justify-end">
          
          {/* Display Toggle Switcher */}
          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-inner shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                viewMode === 'grid' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista en Tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                viewMode === 'list' 
                  ? 'bg-white text-indigo-600 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Vista en Tabla"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          {/* Group Incentive Batch Reward */}
          {hasUpdateAgent && (
            <button
              onClick={onOpenBatchReward}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100/90 text-amber-900 font-bold text-xs rounded-xl border border-amber-200/80 hover:border-amber-300/80 transition-all cursor-pointer flex items-center justify-center gap-2 flex-grow sm:flex-grow-0"
              title="Incentivo de Equipo (Asignar XP Global)"
            >
              <Award className="w-4 h-4 text-amber-600 stroke-[2.25] fill-amber-500/10" />
              Incentivo Grupal
            </button>
          )}

          {/* Create Agent Primary Trigger Button */}
          {hasAddAgent && (
            <button
              onClick={onOpenAddAgent}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl border-none transition-all cursor-pointer shadow-md shadow-indigo-600/10 hover:shadow-indigo-700/25 flex items-center justify-center gap-2 flex-grow sm:flex-grow-0"
              id="register-agent-btn"
            >
              <UserPlus className="w-4 h-4 text-white" />
              Registrar Técnico
            </button>
          )}

        </div>

      </div>

    </div>
  );
}

