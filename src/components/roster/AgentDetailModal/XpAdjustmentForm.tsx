import React, { useState } from 'react';
import { Agent, TierConfig, XpEvent } from '../../../types';
import { motion } from 'motion/react';

interface XpAdjustmentFormProps {
  agent: Agent;
  tiers: TierConfig[];
  onUpdateAgent: (updatedAgent: Agent) => void;
  onNotify: (msg: string | null) => void;
  xpNotification: string | null;
}

export default function XpAdjustmentForm({
  agent,
  tiers,
  onUpdateAgent,
  onNotify,
  xpNotification
}: XpAdjustmentFormProps) {
  const [xpAdjValue, setXpAdjValue] = useState<number>(100);
  const [xpAdjTitle, setXpAdjTitle] = useState<string>('Soporte Extraordinario');
  const [xpAdjDesc, setXpAdjDesc] = useState<string>('Apoyo extendido para solucionar incidentes críticos.');
  const [xpAdjType, setXpAdjType] = useState<'bonus' | 'penalty'>('bonus');
  const [localErrorMsg, setLocalErrorMsg] = useState('');

  const XP_PRESETS = [
    { title: 'Soporte Extraordinario', value: 100, type: 'bonus' as const, desc: 'Apoyo extendido para solucionar incidentes críticos.' },
    { title: 'Guardia de Fin de Semana', value: 150, type: 'bonus' as const, desc: 'Disponibilidad activa y cobertura técnica fuera del horario.' },
    { title: 'Certificación Aprobada', value: 300, type: 'bonus' as const, desc: 'Acreditación técnica aprobada formalmente en su perfil.' },
    { title: 'Retraso en Reporte', value: 50, type: 'penalty' as const, desc: 'Incumplimiento o retraso injustificado de la bitácora Scrum.' },
    { title: 'Felicitación de Cliente', value: 200, type: 'bonus' as const, desc: 'Feedback formal excelente por soporte sobresaliente de cliente.' },
  ];

  const handleApplyXp = () => {
    if (!xpAdjTitle.trim()) {
      setLocalErrorMsg('Por favor indica un título para la incidencia.');
      return;
    }
    if (xpAdjValue <= 0) {
      setLocalErrorMsg('Por favor indica un valor de XP mayor a cero.');
      return;
    }
    setLocalErrorMsg('');

    const finalYield = xpAdjType === 'bonus' ? Math.abs(xpAdjValue) : -Math.abs(xpAdjValue);
    let newXp = Math.max(0, agent.currentXp + finalYield);

    // Auto calculate matching tier
    let newTierId = agent.tierId;
    for (const tier of tiers) {
      if (newXp >= tier.minXp && newXp <= tier.maxXp) {
        newTierId = tier.id;
        break;
      }
    }
    if (newXp > tiers[tiers.length - 1].maxXp) {
      newTierId = 'l4';
    }

    const newEvent: XpEvent = {
      id: `ev_adj_${Date.now()}`,
      agentId: agent.id,
      title: xpAdjTitle,
      description: xpAdjDesc || (xpAdjType === 'bonus' ? 'Asignación de puntos extra oficiales' : 'Descuento de puntos por penalización'),
      xpYield: finalYield,
      type: xpAdjType,
      date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    };

    const updatedAgent: Agent = {
      ...agent,
      currentXp: newXp,
      tierId: newTierId,
      xpEvents: [newEvent, ...(agent.xpEvents || [])]
    };

    onUpdateAgent(updatedAgent);

    // Show notification
    const isTierPromo = newTierId !== agent.tierId;
    const promoWord = newXp > agent.currentXp ? 'PROMOVIDO' : 'DEGRADADO';
    const notificationMsg = isTierPromo 
      ? `¡Impacto XP registrado! El técnico ha sido ${promoWord} automáticamente a: ${tiers.find(t => t.id === newTierId)?.badgeName}`
      : `¡Impacto de XP de ${finalYield > 0 ? '+' : ''}${finalYield} puntos aplicado correctamente!`;
    
    onNotify(notificationMsg);
    setXpAdjDesc('');
    
    // Clear notification after 4s
    setTimeout(() => {
      onNotify(null);
    }, 5000);
  };

  return (
    <div className="border border-slate-205/85 rounded-xl p-4 bg-slate-50 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-800" />
      
      <div className="flex justify-between items-center mb-2.5">
        <h4 className="font-display font-black text-slate-800 text-[10.5px] flex items-center gap-1.5 uppercase tracking-wider select-none">
          <span className="material-symbols-outlined text-sm text-blue-855">military_tech</span>
          Registrar Evento de Rendimiento / Impacto XP
        </h4>
        <span className="text-[8.5px] text-blue-800 font-mono font-black select-none bg-blue-100 px-1.5 py-0.5 rounded uppercase">Módulo de Gestión</span>
      </div>

      {xpNotification && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-150 flex items-center gap-1.5 mb-3"
        >
          <span className="material-symbols-outlined text-sm text-emerald-755">check_circle</span>
          {xpNotification}
        </motion.div>
      )}

      {localErrorMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-2.5 rounded-lg bg-red-50 text-red-850 text-[11px] font-bold border border-red-150 flex items-center gap-1.5 mb-3"
        >
          <span className="material-symbols-outlined text-sm text-red-600">error_outline</span>
          {localErrorMsg}
        </motion.div>
      )}

      {/* Presets Grid */}
      <div className="space-y-3">
        <div>
          <span className="block text-[8.5px] font-bold text-slate-400 font-mono uppercase tracking-wider mb-2">Píldoras de Carga Rápida:</span>
          <div className="flex flex-wrap gap-1.5">
            {XP_PRESETS.map((preset, index) => (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setXpAdjTitle(preset.title);
                  setXpAdjValue(Math.abs(preset.value));
                  setXpAdjType(preset.type);
                  setXpAdjDesc(preset.desc);
                  setLocalErrorMsg('');
                }}
                className={`px-2 py-1 rounded-md border text-[10px] font-bold transition-all cursor-pointer ${
                  xpAdjTitle === preset.title
                    ? 'bg-blue-800 text-white border-blue-900 shadow-3xs'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                }`}
              >
                {preset.title} ({preset.type === 'bonus' ? '+' : '-'}{preset.value})
              </button>
            ))}
          </div>
        </div>

        {/* Manual inputs fields row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">Título de Incidencia</label>
            <input 
              type="text"
              value={xpAdjTitle}
              onChange={(e) => setXpAdjTitle(e.target.value)}
              placeholder="Ej: Guardia Especial"
              className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
            />
          </div>

          <div>
            <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">Puntos XP</label>
            <div className="flex gap-1.5">
              <select
                value={xpAdjType}
                onChange={(e) => setXpAdjType(e.target.value as 'bonus' | 'penalty')}
                className="text-xs border border-slate-200 rounded-lg bg-white px-1.5 cursor-pointer max-w-[45px] text-center font-bold"
              >
                <option value="bonus" className="text-emerald-700">+</option>
                <option value="penalty" className="text-rose-750">-</option>
              </select>
              <input 
                type="number"
                min="1"
                max="1000"
                value={xpAdjValue}
                onChange={(e) => setXpAdjValue(Number(e.target.value))}
                className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded-lg text-slate-850 bg-white font-mono font-bold"
              />
            </div>
          </div>
        </div>

        {/* Custom Description */}
        <div>
          <label className="block text-[9.5px] font-bold text-slate-500 uppercase mb-1">Detalles / Comentario Justificativo</label>
          <textarea
            rows={2}
            value={xpAdjDesc}
            onChange={(e) => setXpAdjDesc(e.target.value)}
            placeholder="Indique las justificaciones de este impacto técnico..."
            className="w-full text-[11px] px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-800 bg-white"
          />
        </div>

        {/* Apply button */}
        <div className="flex justify-end pt-0.5">
          <button
            type="button"
            onClick={handleApplyXp}
            className="px-3.5 py-1.5 bg-blue-800 hover:bg-blue-900 border border-blue-950 text-white font-bold text-xs rounded-lg transition-all flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[13px]">add_task</span>
            Aplicar Impacto de XP
          </button>
        </div>

      </div>
    </div>
  );
}
