import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';

interface BatchRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (value: number, targetTeam: string, reason: string) => void;
  agentsCount: number;
  teams: { name: string; count: number }[];
}

export default function BatchRewardModal({
  isOpen,
  onClose,
  onApply,
  agentsCount,
  teams
}: BatchRewardModalProps) {
  const [batchRewardValue, setBatchRewardValue] = useState(100);
  const [batchTargetTeam, setBatchTargetTeam] = useState('all');
  const [batchRewardReason, setBatchRewardReason] = useState('Resolución Extraordinaria de Incidentes de Equipo');

  if (!isOpen) return null;

  const handleApply = () => {
    onApply(batchRewardValue, batchTargetTeam, batchRewardReason);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-[9999] flex items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden relative scale-100 max-h-[90vh] flex flex-col"
      >
        <div className="absolute top-0 inset-x-0 h-1.5 bg-amber-500" />

        <div className="flex justify-between items-center pb-3 pt-5 px-6 border-b border-slate-100 bg-amber-50/20 shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-xl font-bold">workspace_premium</span>
            <h3 className="font-display font-black text-slate-900 text-sm tracking-tight uppercase">
              Incentivo Grupal de Equipo
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-800 cursor-pointer w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all bg-transparent border-none outline-none"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          <p className="text-xs text-slate-500 leading-normal">
            Premia a múltiples ingenieros o a un departamento completo de forma simultánea. El puntaje especificado será sumado a la XP de cada técnico correspondiente y se registrará un evento oficial en sus perfiles históricos.
          </p>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Equipo Técnico Objetivo</label>
              <select
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-800 cursor-pointer bg-white"
                value={batchTargetTeam}
                onChange={(e) => setBatchTargetTeam(e.target.value)}
              >
                <option value="all">Asignar a todos los ingenieros ({agentsCount})</option>
                {teams.map(t => (
                  <option key={t.name} value={t.name}>{t.name} ({t.count})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Puntos de XP a Otorgar</label>
              <div className="grid grid-cols-4 gap-2">
                {[50, 100, 200, 300].map((xpVal) => (
                  <button
                    key={xpVal}
                    type="button"
                    onClick={() => setBatchRewardValue(xpVal)}
                    className={`py-2 px-1 rounded-xl border text-center transition-all font-mono font-bold text-xs cursor-pointer ${
                      batchRewardValue === xpVal 
                        ? 'border-amber-500 bg-amber-50 text-amber-950 shadow-3xs' 
                        : 'border-slate-205 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    +{xpVal} XP
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">Personalizado:</span>
                <input 
                  type="number"
                  min="10"
                  max="1000"
                  value={batchRewardValue}
                  onChange={(e) => setBatchRewardValue(Number(e.target.value))}
                  className="w-20 text-xs text-center font-mono font-bold border border-slate-200 rounded p-1 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10.5px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">Motivo / Justificación de la XP Colectiva</label>
              <textarea
                rows={2}
                required
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg text-slate-850 bg-white"
                placeholder="Escribe el motivo de la felicitación..."
                value={batchRewardReason}
                onChange={(e) => setBatchRewardReason(e.target.value)}
              />
            </div>
          </div>
        </div>

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
            onClick={handleApply}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white border border-amber-600 text-xs font-bold rounded-lg cursor-pointer transition-colors"
          >
            Otorgar XP Grupal
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
