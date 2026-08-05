import React from 'react';
import { Agent, TierConfig } from '../../types';
import { motion } from 'motion/react';
import { AgentAvatarLogo } from '../AgentAvatarLogo';
import { getTierBadgeProps } from './RosterTab'; // We'll export getTierBadgeProps from RosterTab

interface AgentCardProps {
  key?: string;
  agent: Agent;
  tiers: TierConfig[];
  onClick: () => void;
}

export default function AgentCard({ agent, tiers, onClick }: AgentCardProps) {
  const currentTier = tiers.find(t => t.id === agent.tierId) || tiers[0];
  const nextTierIndex = tiers.findIndex(t => t.id === agent.tierId) + 1;
  const nextTier = nextTierIndex < tiers.length ? tiers[nextTierIndex] : null;

  // Calculate progress parameters
  const minXp = currentTier.minXp;
  const maxXp = currentTier.maxXp;
  const absoluteXpRange = maxXp - minXp;
  const currentXpOffset = Math.max(0, agent.currentXp - minXp);
  const rawProgressPercent = absoluteXpRange > 0 ? (currentXpOffset / absoluteXpRange) * 100 : 100;
  const progressPercent = Math.min(100, Math.max(0, rawProgressPercent));
  const isMaxXp = !nextTier;

  // Check Scrum registered
  const hasScrumCurrent = agent.scrumLogs && agent.scrumLogs.length > 0;
  const scrumTask = hasScrumCurrent ? agent.scrumLogs[0] : null;

  return (
    <div
      onClick={onClick}
      className="bg-white border border-slate-200 hover:border-blue-500 rounded-2xl p-5 flex flex-col gap-4 relative cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group overflow-hidden select-none"
      id={`agent-card-${agent.id}`}
      title="Haz clic para abrir ficha técnica y gestionar"
    >
      {/* Modern subtle ambient color blur background on active hover */}
      <div 
        className="absolute -right-16 -top-16 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none" 
        style={{ backgroundColor: currentTier.colorHex }}
      />

      {/* Modern Sleek Accent Top Line */}
      <div 
        className="absolute top-0 left-6 right-6 h-[2px] transition-all duration-300 group-hover:h-[3px] rounded-b-md opacity-70 group-hover:opacity-100"
        style={{ backgroundColor: currentTier.colorHex }}
      />

      {/* Header Row */}
      <div className="flex justify-between items-center gap-2 mt-0.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            {/* Dynamic glow halo around avatar on hover */}
            <div 
              className="absolute inset-0 rounded-full blur-[2px] scale-105 opacity-0 group-hover:opacity-30 transition-all duration-350"
              style={{ backgroundColor: currentTier.colorHex }}
            />
            <AgentAvatarLogo 
              name={agent.name}
              initials={agent.initials}
              tierColor={currentTier.colorHex}
              avatarBg={agent.avatarBg}
              size="md"
              className="transition-all duration-350 group-hover:scale-105 relative z-10"
            />
            <span 
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border border-white z-20 ${
                scrumTask ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h4 className="font-sans font-bold text-xs.5 text-slate-900 truncate group-hover:text-blue-700 transition-colors leading-tight">{agent.name}</h4>
              {agent.initials && (
                <span className="font-mono text-[9px] font-extrabold bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-150 shrink-0 select-none">
                  {agent.initials}
                </span>
              )}
            </div>
            <p className="font-sans text-[10px] text-slate-400 font-medium truncate mt-0.5">{agent.role}</p>
          </div>
        </div>

        {(() => {
          const badgeProps = getTierBadgeProps(currentTier.id, currentTier.colorHex);
          return (
            <span 
              className="font-mono text-[8.5px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full shrink-0 border transition-all shadow-xs flex items-center gap-1 select-none"
              style={{ 
                backgroundColor: badgeProps.bg,
                color: badgeProps.text,
                borderColor: badgeProps.border
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: badgeProps.dot }} />
              {currentTier.badgeName}
            </span>
          );
        })()}
      </div>

      {/* Progressive XP Block - Elevated Micro-Dashboard styling */}
      <div className="flex flex-col gap-2 font-sans bg-slate-50/50 group-hover:bg-slate-50 rounded-xl p-2.5 border border-slate-100/80 transition-colors duration-300">
        <div className="flex justify-between items-center text-[10px]">
          <div className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px] text-slate-400">electric_bolt</span>
            <span className="font-bold text-slate-500">Score Points</span>
          </div>
          <div className="font-mono text-[10px] text-slate-700 font-bold">
            {agent.currentXp} <span className="text-slate-400 font-normal">/ {isMaxXp ? 'Max' : currentTier.maxXp}</span>
          </div>
        </div>
        {/* Modern minimalist track-bar */}
        <div className="w-full bg-slate-200/50 h-[4px] rounded-full overflow-hidden relative">
          <div 
            className="h-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] rounded-full relative"
            style={{ 
              width: `${isMaxXp ? 100 : progressPercent}%`,
              backgroundColor: currentTier.colorHex,
              boxShadow: `0 0 6px ${currentTier.colorHex}50`
            }}
          />
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[9px] text-slate-400 select-none">
        <div className="flex items-center gap-1">
          <span className="font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-bold">{agent.id}</span>
        </div>
        <span className="text-blue-600 group-hover:text-blue-800 font-sans font-bold text-[10px] flex items-center gap-0.5 transition-all duration-300">
          Gestionar Ficha <span className="material-symbols-outlined text-[12px] transform group-hover:translate-x-1 transition-transform duration-300">arrow_forward</span>
        </span>
      </div>
    </div>
  );
}
