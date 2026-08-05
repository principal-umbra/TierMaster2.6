import React from 'react';
import { Agent, TierConfig } from '../../types';
import { AgentAvatarLogo } from '../AgentAvatarLogo';
import { getTierBadgeProps } from './RosterTab';

interface AgentTableProps {
  agents: Agent[];
  tiers: TierConfig[];
  onSelectAgent: (agent: Agent) => void;
}

export default function AgentTable({ agents, tiers, onSelectAgent }: AgentTableProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" id="roster-list-table-container">
      <div className="overflow-x-auto min-w-full">
        <table className="min-w-full table-auto text-left text-xs font-sans">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black tracking-wider uppercase select-none">
            <tr>
              <th className="py-2.5 px-4 font-bold text-[10px]">Técnico</th>
              <th className="py-2.5 px-4 font-bold text-[10px]">Identificación</th>
              <th className="py-2.5 px-4 font-bold text-[10px]">Rol & Equipo</th>
              <th className="py-2.5 px-4 font-bold text-[10px]">Tier de Madurez</th>
              <th className="py-2.5 px-4 font-bold text-[10px]">Estatus de XP</th>
              <th className="py-2.5 px-4 font-bold text-[10px]">Actividad Diario (Scrum)</th>
              <th className="py-2.5 px-4 text-right font-bold text-[10px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {agents.map(agent => {
              const currentTier = tiers.find(t => t.id === agent.tierId) || tiers[0];
              const nextTierIndex = tiers.findIndex(t => t.id === agent.tierId) + 1;
              const nextTier = nextTierIndex < tiers.length ? tiers[nextTierIndex] : null;

              // Scrum Status
              const hasScrumCurrent = agent.scrumLogs && agent.scrumLogs.length > 0;
              const scrumTask = hasScrumCurrent ? agent.scrumLogs[0] : null;

              return (
                <tr 
                  key={agent.id} 
                  className="hover:bg-slate-50/75 transition-colors cursor-pointer group"
                  onClick={() => onSelectAgent(agent)}
                >
                  {/* Name Column */}
                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <AgentAvatarLogo 
                        name={agent.name}
                        initials={agent.initials}
                        tierColor={(tiers.find(t => t.id === agent.tierId) || tiers[0]).colorHex}
                        avatarBg={agent.avatarBg}
                        size="sm"
                      />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-bold text-slate-800 group-hover:text-blue-800 transition-colors">{agent.name}</span>
                        {agent.initials && (
                          <span className="font-mono text-[9px] font-extrabold bg-blue-50 text-blue-700 px-1 py-0.5 rounded border border-blue-150 shrink-0 select-none">
                            {agent.initials}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* ID Column */}
                  <td className="py-2.5 px-4 font-mono text-[10px] font-bold text-slate-550">
                    {agent.id}
                  </td>

                  {/* Role Column */}
                  <td className="py-2.5 px-4 text-xs">
                    <div className="font-bold text-slate-800">{agent.role}</div>
                    <div className="text-[10px] text-slate-400">{agent.team}</div>
                  </td>

                  {/* Tier Column */}
                  <td className="py-2.5 px-4">
                    {(() => {
                      const badgeProps = getTierBadgeProps(currentTier.id, currentTier.colorHex);
                      return (
                        <span 
                          className="inline-block font-mono text-[8px] uppercase font-bold px-2.5 py-0.5 rounded-full border shadow-2xs select-none"
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

                  {/* XP Column */}
                  <td className="py-2.5 px-4">
                    <div className="font-mono text-[10px]">
                      <strong className="text-slate-800">{agent.currentXp}</strong>
                      <span className="text-slate-400"> / {!nextTier ? 'MAX' : currentTier.maxXp} XP</span>
                    </div>
                  </td>

                  {/* Scrum Activity column */}
                  <td className="py-2.5 px-4 max-w-xs transition-all">
                    {scrumTask ? (
                      <div className="truncate text-xs">
                        <span className="font-bold font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 mr-1.5 uppercase text-[9px]">
                          {scrumTask.ticketId}
                        </span>
                        <span className="text-slate-600 italic font-medium">{scrumTask.today}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Sin reporte hoy</span>
                    )}
                  </td>

                  {/* Action Column */}
                  <td className="py-2.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectAgent(agent);
                      }}
                      className="text-[10.5px] bg-slate-100 hover:bg-blue-800 hover:text-white text-blue-800 font-bold py-1 px-2.5 rounded-lg border border-slate-200 hover:border-blue-800 transition-all cursor-pointer"
                    >
                      Ficha
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
