import React, { useState } from 'react';
import { Agent, TierConfig } from '../../../types';
import { getContrastColor } from '../../AgentAvatarLogo';

interface AgentEditFormProps {
  agent: Agent;
  tiers: TierConfig[];
  onSave: (updated: Agent) => void;
  onCancel: () => void;
  paletteColors: { name: string; hex: string }[];
}

export default function AgentEditForm({
  agent,
  tiers,
  onSave,
  onCancel,
  paletteColors
}: AgentEditFormProps) {
  const [editAgentName, setEditAgentName] = useState(agent.name);
  const [editAgentRole, setEditAgentRole] = useState(agent.role);
  const [editAgentTeam, setEditAgentTeam] = useState(agent.team);
  const [editAgentTierId, setEditAgentTierId] = useState<string>(agent.tierId);
  const [editAgentXp, setEditAgentXp] = useState(agent.baseXp ?? agent.currentXp);
  const [editAgentAvatarBg, setEditAgentAvatarBg] = useState(agent.avatarBg || '#2563EB');
  const [errorMsg, setErrorMsg] = useState('');

  // Multi-value list fields
  const [editAgentSkills, setEditAgentSkills] = useState((agent.skills || []).join(', '));
  const [editAgentSpecialties, setEditAgentSpecialties] = useState((agent.specialties || []).join(', '));
  const [editAgentImprovementAreas, setEditAgentImprovementAreas] = useState((agent.improvementAreas || []).join(', '));
  const [editAgentPainPoints, setEditAgentPainPoints] = useState((agent.painPoints || []).join(', '));

  const handleSave = () => {
    if (!editAgentName.trim()) {
      setErrorMsg('Por favor introduce un nombre válido.');
      return;
    }
    setErrorMsg('');

    const updated: Agent = {
      ...agent,
      name: editAgentName,
      role: editAgentRole,
      team: editAgentTeam,
      tierId: editAgentTierId,
      baseXp: Number(editAgentXp),
      avatarBg: editAgentAvatarBg,
      skills: editAgentSkills.split(',').map(s => s.trim()).filter(Boolean),
      specialties: editAgentSpecialties.split(',').map(s => s.trim()).filter(Boolean),
      improvementAreas: editAgentImprovementAreas.split(',').map(s => s.trim()).filter(Boolean),
      painPoints: editAgentPainPoints.split(',').map(s => s.trim()).filter(Boolean)
    };

    onSave(updated);
  };

  return (
    <div className="border border-slate-200 rounded-2xl p-4 space-y-4 bg-slate-50/50">
      <div className="bg-slate-200/50 p-2.5 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1.5 select-none">
        <span className="material-symbols-outlined text-blue-800 text-sm">edit</span>
        Editando Expediente de Técnico Oficial
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-250 text-red-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2 animate-fade-in shadow-3xs">
          <span className="material-symbols-outlined text-red-600 text-sm">error</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Name */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-605 uppercase tracking-wider mb-1">Nombre Completo</label>
          <input
            type="text"
            className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-850"
            value={editAgentName}
            onChange={(e) => setEditAgentName(e.target.value)}
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-605 uppercase tracking-wider mb-1">Rol / Especialidad</label>
          <input
            type="text"
            className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-855"
            value={editAgentRole}
            onChange={(e) => setEditAgentRole(e.target.value)}
          />
        </div>

        {/* Team */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-605 uppercase tracking-wider mb-1">Equipo Técnico</label>
          <select
            className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-850 cursor-pointer"
            value={editAgentTeam}
            onChange={(e) => setEditAgentTeam(e.target.value)}
          >
            <option value="Inbound Tech Team">Inbound Tech Team</option>
            <option value="Outbound Tech Team">Outbound Tech Team</option>
            <option value="Redes & Infraestructura">Redes & Infraestructura</option>
            <option value="Servicios de Middleware">Servicios de Middleware</option>
            <option value="DBA & Core Business">DBA & Core Business</option>
          </select>
        </div>

        {/* Tier Level */}
        <div>
          <label className="block text-[10.5px] font-bold text-slate-605 uppercase tracking-wider mb-1">Tier Configurado</label>
          <select
            className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-850 cursor-pointer"
            value={editAgentTierId}
            onChange={(e) => setEditAgentTierId(e.target.value as any)}
          >
            {tiers.map((t, index) => (
              <option key={`edit-agent-tier-opt-${t.id}-${index}`} value={t.id}>{t.badgeName}</option>
            ))}
          </select>
        </div>

        {/* XP Override */}
        <div className="sm:col-span-2">
          <label className="block text-[10.5px] font-bold text-slate-605 uppercase tracking-wider mb-1 text-slate-600">Puntos Base de XP</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="10000"
              step="50"
              className="flex-1 cursor-pointer"
              value={editAgentXp}
              onChange={(e) => setEditAgentXp(Number(e.target.value))}
            />
            <span className="font-mono text-xs text-blue-805 bg-white border px-3 py-1 rounded font-black w-24 text-center shrink-0">
              {editAgentXp} PTS
            </span>
          </div>
        </div>

      </div>

      {/* Secciones de Habilidades, Especialidades y Desempeño */}
      <div className="border-t border-slate-200/60 pt-4 space-y-4">
        <div className="bg-slate-100 p-2 rounded-lg text-xs font-bold text-slate-700 flex items-center gap-1.5 select-none">
          <span className="material-symbols-outlined text-indigo-700 text-sm">psychology</span>
          Información de Competencias y Desempeño (Separa con comas)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Especialidades */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-650 uppercase tracking-wider mb-1">Especialidades</label>
            <input
              type="text"
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-850"
              placeholder="Ej: Redes Cloud, Administración Linux"
              value={editAgentSpecialties}
              onChange={(e) => setEditAgentSpecialties(e.target.value)}
            />
            <span className="text-[9px] text-slate-400 mt-0.5 block">Especialidades o áreas de dominio clave del técnico.</span>
          </div>

          {/* Habilidades */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-650 uppercase tracking-wider mb-1">Habilidades</label>
            <input
              type="text"
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-850"
              placeholder="Ej: Bash scripting, SSH, Docker, Apache"
              value={editAgentSkills}
              onChange={(e) => setEditAgentSkills(e.target.value)}
            />
            <span className="text-[9px] text-slate-400 mt-0.5 block">Habilidades prácticas o herramientas técnicas dominadas.</span>
          </div>

          {/* Áreas de mejora */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-650 uppercase tracking-wider mb-1 text-amber-700">Áreas de Mejora</label>
            <textarea
              rows={2}
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-850 custom-scrollbar"
              placeholder="Ej: Documentación más detallada, velocidad de respuesta en picos"
              value={editAgentImprovementAreas}
              onChange={(e) => setEditAgentImprovementAreas(e.target.value)}
            />
            <span className="text-[9px] text-slate-400 mt-0.5 block">Aspectos identificados para potenciar su crecimiento.</span>
          </div>

          {/* Puntos de dolor */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-650 uppercase tracking-wider mb-1 text-rose-700">Puntos de Dolor</label>
            <textarea
              rows={2}
              className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg text-slate-850 custom-scrollbar"
              placeholder="Ej: Se abruma con llamadas simultáneas, impaciencia leve con clientes difíciles"
              value={editAgentPainPoints}
              onChange={(e) => setEditAgentPainPoints(e.target.value)}
            />
            <span className="text-[9px] text-slate-400 mt-0.5 block">Fricciones o limitaciones operativas actuales en el día a día.</span>
          </div>
        </div>
      </div>

      {/* Edición de avatar */}
      <div className="border-t border-slate-200/60 pt-3">
        <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-2">Color de Fondo del Avatar</label>
        <div className="flex flex-wrap gap-2 items-center">
          {paletteColors.map((palette) => {
            const isSelected = editAgentAvatarBg.toLowerCase() === palette.hex.toLowerCase();
            return (
              <button
                key={palette.hex}
                type="button"
                onClick={() => setEditAgentAvatarBg(palette.hex)}
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
              value={editAgentAvatarBg}
              onChange={(e) => setEditAgentAvatarBg(e.target.value)}
              className="w-7 h-7 rounded-md border border-slate-350 cursor-pointer p-0 shrink-0 select-none bg-transparent"
              title="Color Personalizado"
            />
            <span className="font-mono text-[9px] text-slate-500 font-bold uppercase">{editAgentAvatarBg}</span>
          </div>
        </div>
      </div>

      {/* Edit flow togglers */}
      <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200/60 font-sans">
        <button
          type="button"
          onClick={onCancel}
          className="px-3.5 py-1.5 border bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
        >
          Regresar
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-3.5 py-1.5 bg-blue-800 hover:bg-blue-900 border border-blue-900 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-xs">save</span>
          Guardar Cambios
        </button>
      </div>
    </div>
  );
}
