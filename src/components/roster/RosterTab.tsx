import React, { useState } from 'react';
import { Agent, XpEvent, TierConfig } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import RosterFiltersBar from './RosterFiltersBar';
import AgentCard from './AgentCard';
import AgentTable from './AgentTable';
import AddAgentModal from './AddAgentModal';
import BatchRewardModal from './BatchRewardModal';
import AgentDetailModal from './AgentDetailModal';

// Helper to guarantee WCAG-accessible text and border colors on light backgrounds
export const getTierBadgeProps = (tierId: string, baseColor: string) => {
  switch (tierId) {
    case 'l1': // Slate
      return {
        bg: '#f1f5f9',
        text: '#1e293b',
        border: '#cbd5e1',
        dot: '#64748b'
      };
    case 'l2': // Bronze
      return {
        bg: '#fdf3e7',
        text: '#854d0e',
        border: '#fcd34d',
        dot: '#b45309'
      };
    case 'l3': // Gold
      return {
        bg: '#fef3c7',
        text: '#78350f',
        border: '#f59e0b',
        dot: '#d97706'
      };
    case 'l4': // Diamond
      return {
        bg: '#f0f9ff',
        text: '#0369a1',
        border: '#bae6fd',
        dot: '#0ea5e9'
      };
    case 's1': // Coordinator (Violet)
      return {
        bg: '#f5f3ff',
        text: '#5b21b6',
        border: '#ddd6fe',
        dot: '#8b5cf6'
      };
    case 's2': // Supervisor (Pink)
      return {
        bg: '#fdf2f8',
        text: '#9d174d',
        border: '#fbcfe8',
        dot: '#ec4899'
      };
    case 'a1': // Gerencia (Red)
      return {
        bg: '#fef2f2',
        text: '#991b1b',
        border: '#fecaca',
        dot: '#ef4444'
      };
    default:
      return {
        bg: `${baseColor}12`,
        text: baseColor,
        border: `${baseColor}24`,
        dot: baseColor
      };
  }
};

const AVATAR_COLOR_PALETTE = [
  { name: 'Azul Real', hex: '#2563EB' },
  { name: 'Esmeralda', hex: '#059669' },
  { name: 'Púrpura', hex: '#7C3AED' },
  { name: 'Ámbar', hex: '#D97706' },
  { name: 'Índigo', hex: '#4F46E5' },
  { name: 'Carmesí', hex: '#DC2626' },
  { name: 'Cian', hex: '#0891B2' },
  { name: 'Rosa Místico', hex: '#DB2777' },
  { name: 'Verde Bosque', hex: '#16A34A' },
  { name: 'Gris Grafito', hex: '#4B5563' }
];

interface RosterTabProps {
  agents: Agent[];
  tiers: TierConfig[];
  onSelectAgentForEval: (agentId: string) => void;
  onAddAgent?: (newAgent: Agent) => void;
  onUpdateAgent?: (updatedAgent: Agent) => void;
  onDeleteAgent?: (agentId: string) => void;
}

export default function RosterTab({
  agents,
  tiers,
  onSelectAgentForEval,
  onAddAgent,
  onUpdateAgent,
  onDeleteAgent
}: RosterTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals operational states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBatchRewardOpen, setIsBatchRewardOpen] = useState(false);
  const [selectedAgentDetails, setSelectedAgentDetails] = useState<Agent | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Filter agents block
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          agent.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          agent.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = selectedTier === 'all' ? true : agent.tierId === selectedTier;
    return matchesSearch && matchesTier;
  });

  // Calculate high-level stats
  const averageXp = Math.round(agents.reduce((acc, curr) => acc + curr.currentXp, 0) / (agents.length || 1));
  const seniorAgents = agents.filter(a => a.tierId === 'l3' || a.tierId === 'l4').length;

  // List of distinct teams with counts
  const distinctTeams = Array.from(new Set(agents.map(a => a.team))).map(teamName => ({
    name: teamName,
    count: agents.filter(a => a.team === teamName).length
  }));

  // Trigger Bulk Team Award
  const handleApplyBatchAward = (value: number, targetTeam: string, reason: string) => {
    if (!onUpdateAgent) return;
    const targetAgents = targetTeam === 'all' 
      ? agents 
      : agents.filter(a => a.team === targetTeam);
    
    if (targetAgents.length === 0) {
      showToast('No hay técnicos en el equipo seleccionado.');
      return;
    }

    targetAgents.forEach(agent => {
      const updatedEvent: XpEvent = {
        id: `ev_batch_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        agentId: agent.id,
        title: 'Incentivo de Equipo',
        description: reason,
        xpYield: Number(value),
        type: 'bonus',
        date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
      };

      onUpdateAgent({
        ...agent,
        currentXp: agent.currentXp + Number(value),
        xpEvents: [updatedEvent, ...agent.xpEvents]
      });
    });

    setIsBatchRewardOpen(false);
    showToast(`¡Se han otorgado +${value} XP a ${targetAgents.length} técnicos pertenecientes a "${targetTeam === 'all' ? 'Todos los Equipos' : targetTeam}"!`);
  };

  // Synchronize state when selectedAgentDetails changes (e.g. if updated via evaluation)
  const activeAgentInRoster = selectedAgentDetails 
    ? agents.find(a => a.id === selectedAgentDetails.id) || null 
    : null;

  return (
    <div className="flex-grow flex flex-col gap-5" id="roster-view-container">
      {/* Search, Filters, and KPI statistics */}
      <RosterFiltersBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        selectedTier={selectedTier}
        setSelectedTier={setSelectedTier}
        viewMode={viewMode}
        setViewMode={setViewMode}
        tiers={tiers}
        agentsCount={filteredAgents.length}
        totalAgents={agents.length}
        averageXp={averageXp}
        seniorAgents={seniorAgents}
        onOpenBatchReward={() => setIsBatchRewardOpen(true)}
        onOpenAddAgent={() => setIsAddModalOpen(true)}
        hasUpdateAgent={!!onUpdateAgent}
        hasAddAgent={!!onAddAgent}
      />



      {/* Roster Display Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" 
            id="roster-cards-grid"
          >
            {filteredAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                tiers={tiers}
                onClick={() => setSelectedAgentDetails(agent)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
          >
            <AgentTable
              agents={filteredAgents}
              tiers={tiers}
              onSelectAgent={(agent) => setSelectedAgentDetails(agent)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* No results placeholder */}
      {filteredAgents.length === 0 && (
        <div className="py-12 text-center bg-white rounded-xl border border-dashed border-slate-300 flex flex-col items-center justify-center gap-2">
          <span className="material-symbols-outlined text-3xl text-slate-400 select-none">group_off</span>
          <p className="text-xs font-sans text-slate-500 font-bold animate-pulse">No se encontraron agentes que coincidan con los filtros de búsqueda.</p>
        </div>
      )}

      {/* Modal 1: Registrar Nuevo Técnico */}
      {onAddAgent && (
        <AddAgentModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onAddAgent={onAddAgent}
          tiers={tiers}
          paletteColors={AVATAR_COLOR_PALETTE}
        />
      )}

      {/* Modal 2: Expediente Detallado (Read, Update, Delete) */}
      {activeAgentInRoster && (
        <AgentDetailModal
          agent={activeAgentInRoster}
          tiers={tiers}
          onClose={() => setSelectedAgentDetails(null)}
          onSelectAgentForEval={onSelectAgentForEval}
          onUpdateAgent={onUpdateAgent}
          onDeleteAgent={onDeleteAgent}
          paletteColors={AVATAR_COLOR_PALETTE}
        />
      )}

      {/* Modal 3: Incentivo Colectivo Grupal */}
      {onUpdateAgent && (
        <BatchRewardModal
          isOpen={isBatchRewardOpen}
          onClose={() => setIsBatchRewardOpen(false)}
          onApply={handleApplyBatchAward}
          agentsCount={agents.length}
          teams={distinctTeams}
        />
      )}

      {/* Roster Toast Notification overlay */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900/95 border border-slate-700/80 text-white p-4 rounded-xl shadow-2xl z-[99999] flex items-center gap-3.5 max-w-sm animate-fade-in backdrop-blur-sm">
          <span className="material-symbols-outlined text-amber-500 font-bold select-none text-xl">
            notifications_active
          </span>
          <p className="font-sans text-xs font-semibold text-slate-100">
            {toastMessage}
          </p>
        </div>
      )}
    </div>
  );
}
