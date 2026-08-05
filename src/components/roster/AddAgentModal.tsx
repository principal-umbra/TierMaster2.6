import React, { useState } from 'react';
import { Agent, DimensionScores, TierConfig } from '../../types';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { AgentAvatarLogo, getContrastColor } from '../AgentAvatarLogo';
import { getTierBadgeProps } from './RosterTab';

interface AddAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAgent: (newAgent: Agent) => void;
  tiers: TierConfig[];
  paletteColors: { name: string; hex: string }[];
}

export default function AddAgentModal({
  isOpen,
  onClose,
  onAddAgent,
  tiers,
  paletteColors
}: AddAgentModalProps) {
  const [newAgentId, setNewAgentId] = useState('');
  const [newAgentName, setNewAgentName] = useState('');
  const [newAgentRole, setNewAgentRole] = useState('');
  const [newAgentTeam, setNewAgentTeam] = useState('Inbound Tech Team');
  const [newAgentTierId, setNewAgentTierId] = useState<string>(tiers[0]?.id || 'l1');
  const [newAgentAvatarBg, setNewAgentAvatarBg] = useState('#2563EB');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCreateAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim() || !newAgentRole.trim() || !newAgentTeam.trim()) {
      setErrorMsg('Por favor completa todos los campos obligatorios del técnico.');
      return;
    }
    setErrorMsg('');

    const generatedId = newAgentId.trim() || `AG-${Math.floor(1000 + Math.random() * 9000)}`;

    const startingTier = tiers.find(t => t.id === newAgentTierId) || tiers[0];
    const defaultScores: DimensionScores = {
      knowledge: 80,
      execution: 80,
      relational: 80,
      collaborative: 80,
      control: 80
    };

    const words = newAgentName.trim().split(/\s+/);
    const derivedInitials = words.map(w => w[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() || 'AG';

    const newAgent: Agent = {
      id: generatedId,
      name: newAgentName,
      initials: derivedInitials,
      avatar: '',
      avatarBg: newAgentAvatarBg,
      role: newAgentRole,
      team: newAgentTeam,
      tierId: newAgentTierId,
      currentXp: startingTier.minXp,
      dimensionScores: defaultScores,
      achievements: [],
      scrumLogs: [],
      xpEvents: [
        {
          id: `ev_welcome_${Date.now()}`,
          agentId: generatedId,
          title: 'Registro Inicial',
          description: `Ingreso oficial al roster como técnico con rango ${startingTier.name}.`,
          xpYield: 0,
          type: 'bonus',
          date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
        }
      ],
      skills: [],
      specialties: [],
      improvementAreas: [],
      painPoints: [],
      actionPlan: []
    };

    onAddAgent(newAgent);
    
    // Reset Form
    setNewAgentId('');
    setNewAgentName('');
    setNewAgentRole('');
    setNewAgentTierId(tiers[0]?.id || 'l1');
    setNewAgentAvatarBg('#2563EB');
    onClose();
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9999] flex justify-end font-sans">
      <div 
        className="absolute inset-0 cursor-pointer" 
        onClick={onClose}
      />

      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.35 }}
        className="relative w-full max-w-md sm:max-w-lg h-full bg-white shadow-2xl flex flex-col z-10 border-l border-slate-205 overflow-hidden"
      >
        <div className="absolute top-0 inset-x-0 h-1.5 bg-blue-800" />

        <div className="flex justify-between items-center pb-4 pt-5 px-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-800 text-xl font-bold">person_add</span>
            <h3 className="font-display font-black text-slate-900 text-sm.5 tracking-tight uppercase">
              Registro de Nuevo Técnico
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 cursor-pointer w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all bg-transparent border-none"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <form onSubmit={handleCreateAgent} className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 animate-fade-in shadow-3xs">
              <span className="material-symbols-outlined text-red-600 text-base">error_outline</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-between text-xs shadow-3xs">
            <div className="space-y-1 overflow-hidden">
              <span className="block text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest">Tarjeta Visual</span>
              <div className="truncate">
                <h4 className="font-sans font-bold text-slate-900 truncate max-w-[180px]">
                  {newAgentName || 'Nombre del Técnico'}
                </h4>
                <p className="text-[10px] text-slate-500 truncate mt-0.5">
                  {newAgentRole || 'Cargo / Rol'}
                </p>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="font-mono bg-white text-slate-500 px-1 border border-slate-205 rounded text-[8px] font-bold">
                  {newAgentId || 'ID Temporal'}
                </span>
                <span 
                  className="font-mono text-[7px] uppercase font-semibold px-2 py-0.5 rounded-full border"
                  style={{ 
                    backgroundColor: getTierBadgeProps(newAgentTierId, (tiers.find(t => t.id === newAgentTierId) || tiers[0]).colorHex).bg,
                    color: getTierBadgeProps(newAgentTierId, (tiers.find(t => t.id === newAgentTierId) || tiers[0]).colorHex).text,
                    borderColor: getTierBadgeProps(newAgentTierId, (tiers.find(t => t.id === newAgentTierId) || tiers[0]).colorHex).border
                  }}
                >
                  {(tiers.find(t => t.id === newAgentTierId) || tiers[0]).badgeName}
                </span>
              </div>
            </div>
            
            <div className="shrink-0 pl-1.5">
              <AgentAvatarLogo 
                name={newAgentName || '?'}
                initials={
                  newAgentName 
                    ? newAgentName.split(' ').map(n => n[0]).filter(Boolean).join('').substring(0, 2).toUpperCase() 
                    : '?'
                }
                avatarBg={newAgentAvatarBg}
                tierColor={(tiers.find(t => t.id === newAgentTierId) || tiers[0]).colorHex}
                size="md"
                className="shadow-3xs border border-slate-200"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">ID Identificación (Opcional)</label>
              <input
                type="text"
                placeholder="Ej: AG-7704 (Auto si vacío)"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-800 uppercase focus:border-blue-800 focus:ring-1 focus:ring-blue-800 bg-white"
                value={newAgentId}
                onChange={(e) => setNewAgentId(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Nombre Completo *</label>
              <input
                type="text"
                required
                placeholder="Ej: Félix Cuevas"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-800 focus:ring-1 focus:ring-blue-800 bg-white"
                value={newAgentName}
                onChange={(e) => setNewAgentName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Rol / Cargo Especialidad *</label>
              <input
                type="text"
                required
                placeholder="Ej: Administrador Cloud Sénior"
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:border-blue-800 focus:ring-1 focus:ring-blue-800 bg-white"
                value={newAgentRole}
                onChange={(e) => setNewAgentRole(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Equipo Técnico *</label>
              <select
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-800 cursor-pointer focus:border-blue-800 focus:ring-1 focus:ring-blue-800 bg-white"
                value={newAgentTeam}
                onChange={(e) => setNewAgentTeam(e.target.value)}
              >
                <option value="Inbound Tech Team">Inbound Tech Team</option>
                <option value="Outbound Tech Team">Outbound Tech Team</option>
                <option value="Redes & Infraestructura">Redes & Infraestructura</option>
                <option value="Servicios de Middleware">Servicios de Middleware</option>
                <option value="DBA & Core Business">DBA & Core Business</option>
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Tier de Madurez Inicial</label>
              <div className="grid grid-cols-4 gap-2">
                {tiers.map((t, index) => (
                  <button
                    key={`add-agent-tier-${t.id}-${index}`}
                    type="button"
                    onClick={() => setNewAgentTierId(t.id as any)}
                    className={`p-2 rounded-xl border text-center flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      newAgentTierId === t.id 
                        ? 'border-blue-800 bg-blue-50/50 shadow-xs' 
                        : 'border-slate-205 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: t.colorHex }}
                    />
                    <span className="font-mono text-[9px] font-bold text-slate-800 uppercase block">{t.id}</span>
                    <span className="text-[8px] text-slate-500 font-semibold truncate max-w-full leading-none">{t.badgeName.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4">
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-2">Color de Fondo del Avatar</label>
              <div className="flex flex-wrap gap-2 items-center">
                {paletteColors.map((palette) => {
                  const isSelected = newAgentAvatarBg.toLowerCase() === palette.hex.toLowerCase();
                  return (
                    <button
                      key={palette.hex}
                      type="button"
                      onClick={() => setNewAgentAvatarBg(palette.hex)}
                      className={`w-7 h-7 rounded-full transition-all duration-150 flex items-center justify-center shrink-0 cursor-pointer hover:scale-110 active:scale-95 ${
                        isSelected ? 'ring-2 ring-blue-800 ring-offset-2 scale-105' : 'border border-slate-200'
                      }`}
                      style={{ backgroundColor: palette.hex }}
                      title={palette.name}
                    >
                      {isSelected && (
                        <span className="material-symbols-outlined text-[13px]" style={{ color: getContrastColor(palette.hex) === 'white' ? '#fff' : '#000' }}>
                          check
                        </span>
                      )}
                    </button>
                  );
                })}
                
                <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-200">
                  <input
                    type="color"
                    value={newAgentAvatarBg}
                    onChange={(e) => setNewAgentAvatarBg(e.target.value)}
                    className="w-7 h-7 rounded-md border border-slate-350 cursor-pointer p-0 shrink-0 select-none bg-transparent"
                    title="Color Personalizado"
                  />
                  <span className="font-mono text-[9px] text-slate-500 font-bold uppercase">{newAgentAvatarBg}</span>
                </div>
              </div>
            </div>

          </div>
        </form>

        <div className="border-t border-slate-100 p-5 bg-slate-50 flex justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 hover:bg-slate-200/80 border border-slate-250 text-slate-700 text-xs font-bold rounded-lg cursor-pointer transition-colors bg-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => handleCreateAgent(e)}
            className="px-4 py-2 bg-blue-800 hover:bg-blue-900 border border-blue-900 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            Confirmar Registro
          </button>
        </div>

      </motion.div>
    </div>,
    document.body
  );
}
