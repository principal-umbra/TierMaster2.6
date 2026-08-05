import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Agent, TierConfig, ActionPlanItem } from '../../../types';
import { motion } from 'motion/react';
import { AgentAvatarLogo } from '../../AgentAvatarLogo';
import AgentEditForm from './AgentEditForm';
import { INITIAL_ACHIEVEMENTS } from '../../../mockData';
import { fetchAllCredentials, saveCredential } from '../../../db/firebaseService';
import { 
  Award, 
  Sparkles, 
  TrendingUp, 
  Plus, 
  Trash2, 
  UserCheck, 
  ShieldCheck, 
  UserMinus, 
  Edit3, 
  Check, 
  Lightbulb, 
  Briefcase, 
  X,
  Gauge,
  ClipboardList,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  ShieldAlert
} from 'lucide-react';

interface AgentDetailModalProps {
  agent: Agent;
  tiers: TierConfig[];
  onClose: () => void;
  onSelectAgentForEval: (agentId: string) => void;
  onUpdateAgent?: (updatedAgent: Agent) => void;
  onDeleteAgent?: (agentId: string) => void;
  paletteColors: { name: string; hex: string }[];
}

type TabType = 'profile' | 'balance' | 'actionPlan';

export default function AgentDetailModal({
  agent,
  tiers,
  onClose,
  onSelectAgentForEval,
  onUpdateAgent,
  onDeleteAgent,
  paletteColors
}: AgentDetailModalProps) {
  const [isEditingAgent, setIsEditingAgent] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [newActionText, setNewActionText] = useState('');

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [showNewPasswordText, setShowNewPasswordText] = useState(false);
  const [showConfirmPasswordText, setShowConfirmPasswordText] = useState(false);
  const [isLoadingCredential, setIsLoadingCredential] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [targetCredential, setTargetCredential] = useState<any>(null);

  const [currentUser] = useState<{ username: string; name: string; email: string; role?: string } | null>(() => {
    try {
      const saved = localStorage.getItem('fhons_current_user');
      if (!saved) return null;
      if (saved.startsWith('{')) {
        return JSON.parse(saved);
      }
      return { username: saved, name: 'R. Quintana', email: 'rquintana@fhons.com.do', role: 'User' };
    } catch {
      return null;
    }
  });

  const isAdmin = currentUser?.role?.toLowerCase() !== 'user' && !!currentUser;

  const handleOpenPasswordModal = async () => {
    setShowPasswordModal(true);
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setPasswordSuccess(null);
    setIsLoadingCredential(true);
    try {
      const credentials = await fetchAllCredentials();
      const found = credentials.find(c => 
        (c.agentId && c.agentId === agent.id) ||
        (c.username && c.username.toLowerCase().trim() === agent.name.toLowerCase().trim().replace(/\s+/g, '')) ||
        (agent.email && c.email && c.email.toLowerCase().trim() === agent.email.toLowerCase().trim()) ||
        (c.name && c.name.toLowerCase().trim() === agent.name.toLowerCase().trim())
      );
      setTargetCredential(found || null);
    } catch (err: any) {
      console.error("Error fetching credentials:", err);
    } finally {
      setIsLoadingCredential(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!newPassword) {
      setPasswordError('La contraseña no puede estar vacía.');
      return;
    }
    if (newPassword.length < 4) {
      setPasswordError('La contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Las contraseñas no coinciden. Por favor verifica.');
      return;
    }

    setIsSavingPassword(true);
    try {
      let credentialToSave: any;
      if (targetCredential) {
        credentialToSave = {
          ...targetCredential,
          password: newPassword,
          agentId: agent.id // Ensure agentId is set
        };
      } else {
        const nameParts = agent.name.toLowerCase().trim().split(/\s+/);
        const proposedUsername = nameParts.length >= 2 
          ? `${nameParts[0][0]}${nameParts[nameParts.length - 1]}`
          : nameParts[0];

        credentialToSave = {
          username: proposedUsername,
          password: newPassword,
          name: agent.name,
          email: agent.email || `${proposedUsername}@fhons.com.do`,
          role: 'User',
          agentId: agent.id
        };
      }

      await saveCredential(credentialToSave);
      setPasswordSuccess(`¡Contraseña actualizada exitosamente para el usuario "${credentialToSave.username}"!`);
      setTargetCredential(credentialToSave);
    } catch (err: any) {
      console.error('Error al guardar nueva contraseña:', err);
      setPasswordError('Error al guardar la contraseña en Firestore. Inténtalo de nuevo.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const currentTier = tiers.find(t => t.id === agent.tierId) || tiers[0];
  const nextTier = tiers[tiers.indexOf(currentTier) + 1] || null;

  // Progress calculations
  const progressMin = currentTier.minXp;
  const progressMax = currentTier.maxXp;
  const totalTierXp = progressMax - progressMin;
  const currentTierXp = Math.max(0, agent.currentXp - progressMin);
  const progressPercentage = Math.min(100, Math.max(0, (currentTierXp / totalTierXp) * 100));
  const xpNeeded = nextTier ? Math.max(0, nextTier.minXp - agent.currentXp) : 0;

  // KPI calculations based on total sum
  const kpiScores = agent.dimensionScores;
  const totalScoresSum = kpiScores.knowledge + kpiScores.execution + kpiScores.relational + kpiScores.collaborative + kpiScores.control;

  const getRelativePercent = (score: number) => {
    if (totalScoresSum === 0) return 0;
    return Math.round((score / totalScoresSum) * 100);
  };

  const relKnowledge = getRelativePercent(kpiScores.knowledge);
  const relExecution = getRelativePercent(kpiScores.execution);
  const relRelational = getRelativePercent(kpiScores.relational);
  const relCollaborative = getRelativePercent(kpiScores.collaborative);
  const relControl = getRelativePercent(kpiScores.control);

  // Perfect distribution is 20% in each of the 5 dimensions.
  const deviationSum = 
    Math.abs(relKnowledge - 20) + 
    Math.abs(relExecution - 20) + 
    Math.abs(relRelational - 20) + 
    Math.abs(relCollaborative - 20) + 
    Math.abs(relControl - 20);

  const balanceRigorScore = totalScoresSum === 0 ? 0 : Math.max(0, 100 - Math.round((deviationSum / 160) * 100));

  // Diagnostic advisor based on relative balance
  const getBalanceDiagnosis = () => {
    if (totalScoresSum === 0) {
      return {
        label: 'Sin Evaluaciones',
        badgeColor: 'bg-slate-100 text-slate-750 border-slate-200',
        textColor: 'text-slate-500',
        advice: 'Comienza a evaluar al técnico para obtener diagnósticos de balance operativo.'
      };
    }
    if (balanceRigorScore >= 85) {
      return {
        label: 'Firme (Multidisciplinario)',
        badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200/65',
        textColor: 'text-emerald-800',
        advice: '¡Excelente equilibrio! El técnico distribuye de forma uniforme sus aptitudes sin dejar áreas vulnerables.'
      };
    }
    if (balanceRigorScore >= 60) {
      return {
        label: 'Aceptable (Estable)',
        badgeColor: 'bg-blue-50 text-blue-800 border-blue-200/65',
        textColor: 'text-slate-650',
        advice: 'Rendimiento general balanceado. Hay pequeñas desviaciones que pueden mitigarse con un enfoque focalizado.'
      };
    }

    // Find the absolute lowest area
    const areas = [
      { name: 'Certificaciones', val: relKnowledge },
      { name: 'Troubleshooting', val: relExecution },
      { name: 'Servicio Cliente', val: relRelational },
      { name: 'Habilidades Blandas', val: relCollaborative },
      { name: 'Gestión / Control', val: relControl }
    ];
    const lowest = areas.reduce((prev, current) => (prev.val < current.val) ? prev : current);

    return {
      label: 'Sesgo Crítico (Cojera)',
      badgeColor: 'bg-rose-50 text-rose-800 border-rose-200/65',
      textColor: 'text-rose-900',
      advice: `Atención: El perfil cojea gravemente en "${lowest.name}" (solo aporta el ${lowest.val}% del peso total). Requiere asignación prioritaria en el Plan de Acción.`
    };
  };

  const diagnosis = getBalanceDiagnosis();

  const handleConfirmDelete = () => {
    if (onDeleteAgent) {
      onDeleteAgent(agent.id);
      onClose();
    }
  };

  const handleSaveUpdate = (updated: Agent) => {
    if (onUpdateAgent) {
      onUpdateAgent(updated);
      setIsEditingAgent(false);
    }
  };

  // Action plan managers
  const handleAddActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActionText.trim()) return;
    const newItem: ActionPlanItem = {
      id: `ap_${Date.now()}`,
      text: newActionText.trim(),
      done: false
    };
    const updatedActionPlan = [...(agent.actionPlan || []), newItem];
    if (onUpdateAgent) {
      onUpdateAgent({
        ...agent,
        actionPlan: updatedActionPlan
      });
    }
    setNewActionText('');
  };

  const handleToggleActionItem = (itemId: string) => {
    const updatedActionPlan = (agent.actionPlan || []).map(item => 
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    if (onUpdateAgent) {
      onUpdateAgent({
        ...agent,
        actionPlan: updatedActionPlan
      });
    }
  };

  const handleDeleteActionItem = (itemId: string) => {
    const updatedActionPlan = (agent.actionPlan || []).filter(item => item.id !== itemId);
    if (onUpdateAgent) {
      onUpdateAgent({
        ...agent,
        actionPlan: updatedActionPlan
      });
    }
  };

  const handlePrepopulateActionPlan = () => {
    const defaults: ActionPlanItem[] = [
      { id: `ap_def_1_${Date.now()}`, text: 'Completar auto-capacitación de flujos de escalado L2', done: false },
      { id: `ap_def_2_${Date.now()}`, text: 'Mantener actualizados todos los tickets diarios en standup', done: false },
      { id: `ap_def_3_${Date.now()}`, text: 'Asistir a sesión de mentoría de soft skills y comunicación', done: false }
    ];
    if (onUpdateAgent) {
      onUpdateAgent({
        ...agent,
        actionPlan: defaults
      });
    }
  };

  // Completed action items stats
  const actionItems = agent.actionPlan || [];
  const completedActionsCount = actionItems.filter(item => item.done).length;
  const totalActionsCount = actionItems.length;
  const actionPercentage = totalActionsCount > 0 ? Math.round((completedActionsCount / totalActionsCount) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4 font-sans">
      <motion.div 
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-slate-200 rounded-2xl max-w-5xl w-full h-[85vh] shadow-2xl overflow-hidden flex flex-col"
        id="technician-sheet-panel"
      >
        {/* Dynamic color stripe based on Tier color */}
        <div 
          className="h-2.5 w-full shrink-0" 
          style={{ backgroundColor: currentTier.colorHex }}
        />

        {/* Header decor bar */}
        <div className="flex justify-between items-center py-4 px-6 border-b border-slate-200 bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-black bg-slate-100 text-slate-700 px-2.5 py-1 rounded border border-slate-200 select-none">
              EXPEDIENTE TÉCNICO ID: {agent.id}
            </span>
            <span 
              className="text-[10px] font-mono uppercase font-black px-3 py-1 rounded-full border shadow-3xs"
              style={{
                backgroundColor: `${currentTier.colorHex}15`,
                color: currentTier.colorHex,
                borderColor: `${currentTier.colorHex}40`
              }}
            >
              {currentTier.name}
            </span>
          </div>
          
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0 border-none bg-transparent flex items-center justify-center"
            title="Cerrar expediente"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Container - Flex row layout matching exact height */}
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          {!isEditingAgent ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch h-full">
              
              {/* LEFT COLUMN: PRIMARY PROFILE & ACTIONS (lg:col-span-4) - Elegant & Balanced */}
              <div className="lg:col-span-4 bg-slate-50/50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4 h-full overflow-y-auto no-scrollbar">
                
                {/* Visual Identity Block */}
                <div className="text-center space-y-3.5 pb-4 border-b border-slate-200">
                  <div className="flex justify-center">
                    <div className="relative">
                      <AgentAvatarLogo 
                        name={agent.name}
                        initials={agent.initials}
                        tierColor={currentTier.colorHex}
                        avatarBg={agent.avatarBg}
                        size="xl"
                        className="shadow-md"
                      />
                      <span className="absolute bottom-0 right-0 p-1 bg-white rounded-full border border-slate-150 shadow-sm flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-display font-black text-slate-900 text-[16px] leading-tight tracking-tight flex items-center justify-center gap-1.5">
                      {agent.name}
                      {agent.initials && (
                        <span className="font-mono text-[10px] font-extrabold bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-150 select-none">
                          {agent.initials}
                        </span>
                      )}
                    </h3>
                    <p className="text-xs text-slate-650 font-bold mt-1">
                      {agent.role}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 font-bold uppercase tracking-wider font-mono">
                      {agent.team}
                    </p>
                  </div>
                </div>

                {/* Level Route / Progress Indicator */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-3xs space-y-3 flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] font-mono">Ruta de XP</span>
                    <span className="font-mono font-black text-slate-800 text-[10px] bg-slate-50 border px-2 py-0.5 rounded">
                      {agent.currentXp} / {progressMax} XP
                    </span>
                  </div>

                  {/* Rounded Progress Bar */}
                  <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden relative border border-slate-200/20 shadow-inner">
                    <div 
                      className="h-full rounded-full transition-all duration-500 bg-gradient-to-r"
                      style={{ 
                        width: `${progressPercentage}%`,
                        backgroundImage: `linear-gradient(to right, ${currentTier.colorHex}, #2563eb)` 
                      }}
                    />
                  </div>

                  {/* Level advancement prompt */}
                  {nextTier ? (
                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-lg p-2.5 flex items-start gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <p className="text-[10.5px] text-blue-800 leading-normal font-semibold">
                        Faltan <strong className="font-black">{xpNeeded} XP</strong> para ascender a <span className="font-bold underline" style={{ color: nextTier.colorHex }}>{nextTier.badgeName}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="bg-amber-50/60 border border-amber-100/60 rounded-lg p-2.5 flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 fill-amber-500/10" />
                      <p className="text-[10.5px] text-amber-800 leading-normal font-bold">
                        ¡Nivel máximo alcanzado!
                      </p>
                    </div>
                  )}
                </div>

                {/* Primary Panel Action buttons */}
                <div className="space-y-2.5 pt-2 shrink-0">
                  {(() => {
                    const isSupervisor = agent.tierId?.toLowerCase() === 's1' || agent.tierId?.toLowerCase() === 's2';
                    if (isSupervisor) {
                      return (
                        <div className="w-full px-4 py-2.5 bg-slate-100 border border-slate-200 text-slate-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 select-none cursor-not-allowed">
                          <Lock className="w-4 h-4 text-slate-400" />
                          Evaluación Congelada (Supervisor)
                        </div>
                      );
                    }
                    return (
                      <button
                        onClick={() => {
                          onSelectAgentForEval(agent.id);
                          onClose();
                        }}
                        className="w-full px-4 py-2.5 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl border border-blue-900 hover:border-blue-950 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-blue-800/5"
                      >
                        <UserCheck className="w-4 h-4" />
                        Evaluar Técnico Diario
                      </button>
                    );
                  })()}

                  <div className="grid grid-cols-2 gap-2">
                    {onUpdateAgent && (
                      <button
                        onClick={() => setIsEditingAgent(true)}
                        className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Editar Datos
                      </button>
                    )}

                    {onDeleteAgent && (
                      <button
                        onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
                        className={`px-3 py-2 border font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer ${
                          showDeleteConfirm 
                            ? 'bg-red-650 text-white border-red-700 hover:bg-red-750' 
                            : 'bg-red-50 hover:bg-red-100/80 text-red-700 border-red-150'
                        }`}
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Desvincular
                      </button>
                    )}
                  </div>

                  {isAdmin && (
                    <button
                      onClick={handleOpenPasswordModal}
                      className="w-full px-4 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Cambiar Contraseña
                    </button>
                  )}

                  {/* DELETE CONFIRM BOX */}
                  {showDeleteConfirm && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="border border-red-200 bg-red-50 p-3 rounded-xl flex flex-col gap-2 mt-1"
                    >
                      <div className="text-rose-900 space-y-1">
                        <strong className="text-[11px] font-black flex items-center gap-1">
                          ⚠️ ¿Confirmar Desvinculación?
                        </strong>
                        <p className="text-[10px] text-rose-800 leading-normal">
                          Esta acción removerá definitivamente a {agent.name} del roster. No se puede deshacer.
                        </p>
                      </div>
                      <div className="flex justify-end gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleConfirmDelete}
                          className="px-3 py-1 bg-red-650 text-white text-[10px] font-bold rounded border border-red-750 hover:bg-red-700 cursor-pointer"
                        >
                          Confirmar
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>

              </div>

              {/* RIGHT COLUMN: INTERACTIVE TABS & INTEL PROFILE (lg:col-span-8) */}
              <div className="lg:col-span-8 flex flex-col justify-between space-y-5 h-full min-h-0">
                
                {/* Visual Tab Bar */}
                <div className="flex border-b border-slate-200 gap-2 select-none shrink-0 overflow-x-auto no-scrollbar">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-4 py-3 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'profile'
                        ? 'border-blue-800 text-blue-800 bg-blue-50/5'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-slate-500" />
                    Ficha Operativa
                  </button>

                  <button
                    onClick={() => setActiveTab('balance')}
                    className={`px-4 py-3 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                      activeTab === 'balance'
                        ? 'border-blue-800 text-blue-800 bg-blue-50/5'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Gauge className="w-4 h-4 text-slate-500" />
                    Desempeño y Balance
                  </button>

                  <button
                    onClick={() => setActiveTab('actionPlan')}
                    className={`px-4 py-3 text-xs font-black border-b-2 flex items-center gap-2 transition-all cursor-pointer relative whitespace-nowrap ${
                      activeTab === 'actionPlan'
                        ? 'border-blue-800 text-blue-800 bg-blue-50/5'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ClipboardList className="w-4 h-4 text-slate-500" />
                    Plan de Acción
                    {totalActionsCount > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-indigo-100 text-indigo-700 border border-indigo-200">
                        {completedActionsCount}/{totalActionsCount}
                      </span>
                    )}
                  </button>
                </div>

                {/* TAB CONTENT PANEL - With clean height & elegant negative space */}
                <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5 space-y-4">
                  {activeTab === 'profile' && (
                    <div className="space-y-4.5 animate-fade-in">
                      
                      {/* Grid 1: Specialties, skills, improvement areas and pain points */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left: Specialties & Skills */}
                        <div className="space-y-4">
                          {/* Specialties */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-3xs space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                              Especialidades Clave
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {agent.specialties && agent.specialties.length > 0 ? (
                                agent.specialties.map((spec, i) => (
                                  <span 
                                    key={i} 
                                    className="text-[10.5px] font-semibold bg-indigo-50 text-indigo-850 border border-indigo-200/80 px-2.5 py-0.5 rounded-lg"
                                  >
                                    {spec}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] italic text-slate-400">Ninguna declarada</span>
                              )}
                            </div>
                          </div>

                          {/* Skills */}
                          <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-3xs space-y-2">
                            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                              Habilidades Técnicas
                            </h4>
                            <div className="flex flex-wrap gap-1.5">
                              {agent.skills && agent.skills.length > 0 ? (
                                agent.skills.map((skill, i) => (
                                  <span 
                                    key={i} 
                                    className="text-[10.5px] font-semibold bg-teal-50/60 text-teal-850 border border-teal-200/70 px-2.5 py-0.5 rounded-lg"
                                  >
                                    {skill}
                                  </span>
                                ))
                              ) : (
                                <span className="text-[11px] italic text-slate-400">Sin habilidades registradas</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Development Indicators */}
                        <div className="space-y-4">
                          {/* Improvement Areas */}
                          <div className="border border-amber-200/60 rounded-xl p-4 bg-amber-50/10 shadow-3xs space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5 font-mono">
                              <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                              Áreas de Mejora
                            </h4>
                            <div className="space-y-1.5">
                              {agent.improvementAreas && agent.improvementAreas.length > 0 ? (
                                agent.improvementAreas.map((area, i) => (
                                  <div key={i} className="flex gap-2 text-xs text-slate-700 items-start leading-tight">
                                    <span className="text-amber-500 font-bold">&bull;</span>
                                    <span className="font-semibold">{area}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] italic text-slate-400">Ninguna registrada</p>
                              )}
                            </div>
                          </div>

                          {/* Pain Points */}
                          <div className="border border-rose-200/60 rounded-xl p-4 bg-rose-50/10 shadow-3xs space-y-2">
                            <h4 className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1.5 font-mono">
                              <span className="material-symbols-outlined text-[15px] text-rose-600 mt-[-2px]">report_problem</span>
                              Puntos de Dolor Operativos
                            </h4>
                            <div className="space-y-1.5">
                              {agent.painPoints && agent.painPoints.length > 0 ? (
                                agent.painPoints.map((pain, i) => (
                                  <div key={i} className="flex gap-2 text-xs text-slate-700 items-start leading-tight">
                                    <span className="text-rose-500 font-bold">&bull;</span>
                                    <span className="font-semibold">{pain}</span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[11px] italic text-slate-400">Ninguno registrado</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Achievements */}
                      <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-3xs space-y-2.5">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5 font-mono border-b border-slate-100 pb-2">
                          <Award className="w-4 h-4 text-slate-500" />
                          Logros y Medallas Otorgadas ({agent.achievements.length})
                        </h4>
                        
                        {agent.achievements && agent.achievements.length > 0 ? (
                          <div className="flex flex-wrap gap-2.5 max-h-[140px] overflow-y-auto custom-scrollbar pr-1">
                            {agent.achievements.map((achId, idx) => {
                              const ach = INITIAL_ACHIEVEMENTS.find(a => a.id === achId);
                              if (!ach) return null;
                              return (
                                <div 
                                  key={`${achId}-${idx}`} 
                                  className="flex items-center gap-2.5 border border-slate-150/60 px-3 py-1.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-help shrink-0 shadow-3xs"
                                  title={ach.description}
                                >
                                  <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-amber-600 text-[15px]">
                                      {ach.iconName}
                                    </span>
                                  </div>
                                  <div>
                                    <h5 className="font-sans font-extrabold text-slate-850 text-[11px] leading-tight">
                                      {ach.title}
                                    </h5>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-5 border border-dashed border-slate-150 rounded-xl">
                            <p className="text-xs text-slate-400 font-bold">Sin medallas otorgadas aún en su expediente.</p>
                          </div>
                        )}
                      </div>

                    </div>
                  )}

                  {activeTab === 'balance' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in h-full items-stretch">
                      
                      {/* KPI Dimension score metrics */}
                      <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-3xs space-y-4 flex flex-col justify-between">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                          <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
                            <Gauge className="w-4 h-4 text-indigo-650" />
                            Balance de Desempeño (Relativo)
                          </span>
                          <span className="font-mono font-black text-xs text-blue-800 bg-blue-50/80 px-2.5 py-0.5 rounded-full border border-blue-150" title="Suma total de puntos">
                            {totalScoresSum} PTS
                          </span>
                        </div>

                        <div className="space-y-3.5 flex-1 flex flex-col justify-around py-2">
                          {/* Knowledge */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-655">
                              <span className="truncate">Certificaciones ({kpiScores.knowledge} pts)</span>
                              <span className="font-mono text-indigo-750 bg-indigo-50/60 px-1.5 py-0.5 rounded text-[9.5px]">{relKnowledge}% del total</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 transition-all duration-500" style={{ width: `${relKnowledge}%` }} />
                            </div>
                          </div>

                          {/* Execution */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-655">
                              <span className="truncate">Troubleshooting ({kpiScores.execution} pts)</span>
                              <span className="font-mono text-blue-750 bg-blue-50/60 px-1.5 py-0.5 rounded text-[9.5px]">{relExecution}% del total</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${relExecution}%` }} />
                            </div>
                          </div>

                          {/* Relational */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-655">
                              <span className="truncate">Servicio Cliente ({kpiScores.relational} pts)</span>
                              <span className="font-mono text-teal-750 bg-teal-50/65 px-1.5 py-0.5 rounded text-[9.5px]">{relRelational}% del total</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-teal-500 transition-all duration-500" style={{ width: `${relRelational}%` }} />
                            </div>
                          </div>

                          {/* Collaborative */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-655">
                              <span className="truncate">Habilidades Blandas ({kpiScores.collaborative} pts)</span>
                              <span className="font-mono text-emerald-750 bg-emerald-50/60 px-1.5 py-0.5 rounded text-[9.5px]">{relCollaborative}% del total</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${relCollaborative}%` }} />
                            </div>
                          </div>

                          {/* Control */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] font-bold text-slate-655">
                              <span className="truncate">Gestión y Trazabilidad ({kpiScores.control} pts)</span>
                              <span className="font-mono text-amber-750 bg-amber-50/60 px-1.5 py-0.5 rounded text-[9.5px]">{relControl}% del total</span>
                            </div>
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${relControl}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Operational Rigor & Coverage Balance Traffic Light */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4.5 shadow-3xs flex flex-col justify-between space-y-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center border-b border-slate-150 pb-2.5">
                            <span className="font-bold text-slate-600 uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
                              <ClipboardList className="w-4 h-4 text-slate-500" />
                              Rigor y Cobertura de Perfil
                            </span>
                            <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wider ${diagnosis.badgeColor}`}>
                              {diagnosis.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 py-2 bg-white rounded-xl p-3 border border-slate-150">
                            {/* Score Wheel */}
                            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center bg-slate-50 border-2 border-slate-200 rounded-full shadow-sm">
                              <span className="font-mono text-sm font-black text-slate-850">
                                {balanceRigorScore}%
                              </span>
                            </div>

                            <div className="space-y-0.5">
                              <div className="text-[9.5px] font-black text-slate-400 uppercase tracking-wider">Índice de Consistencia</div>
                              <p className="text-xs font-bold leading-relaxed text-slate-700">
                                {diagnosis.advice}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500 leading-relaxed bg-white border border-slate-150 p-3.5 rounded-lg shadow-3xs">
                          *El índice evalúa el equilibrio de competencias frente al perfil ideal multidisciplinario (20% por área). Permite prevenir lagunas de conocimiento u omisión de procesos clave de forma científica y no limitativa.
                        </div>
                      </div>

                    </div>
                  )}

                  {activeTab === 'actionPlan' && (
                    <div className="space-y-4.5 animate-fade-in h-full flex flex-col justify-between">
                      
                      {/* Action Plan Introduction card */}
                      <div className="bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 p-3.5 rounded-xl flex items-center justify-between shadow-3xs">
                        <div className="space-y-1">
                          <h4 className="font-sans font-bold text-slate-800 text-xs flex items-center gap-1.5">
                            🎯 Plan de Acción y Compromisos de Desarrollo
                          </h4>
                          <p className="text-[10.5px] text-slate-600 leading-tight">
                            Asigna compromisos de crecimiento para mitigar los puntos de dolor y monitorea su desarrollo.
                          </p>
                        </div>

                        {/* Progress Meter */}
                        {totalActionsCount > 0 && (
                          <div className="text-center shrink-0 pl-4 border-l border-blue-200">
                            <span className="block text-[14px] font-mono font-black text-indigo-700 leading-none">
                              {actionPercentage}%
                            </span>
                            <span className="text-[8.5px] font-mono font-bold text-slate-400 uppercase tracking-wider block mt-1">
                              Avance
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Plan List */}
                      <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-3xs flex-1 flex flex-col justify-between space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px] font-mono">
                            Compromisos Activos
                          </span>
                          
                          {totalActionsCount === 0 && (
                            <button
                              onClick={handlePrepopulateActionPlan}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded border border-indigo-200 transition-colors cursor-pointer"
                            >
                              Pre-cargar Recomendaciones
                            </button>
                          )}
                        </div>

                        {actionItems.length > 0 ? (
                          <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1 flex-1">
                            {actionItems.map(item => (
                              <div 
                                key={item.id} 
                                className={`flex items-center justify-between border p-3 rounded-xl transition-all ${
                                  item.done 
                                    ? 'bg-slate-50/50 border-slate-150 opacity-80' 
                                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-3xs'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0 pr-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleActionItem(item.id)}
                                    className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center shrink-0 transition-all cursor-pointer ${
                                      item.done 
                                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                                        : 'border-slate-300 hover:border-blue-700 hover:bg-blue-50/20'
                                    }`}
                                  >
                                    {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                                  </button>
                                  <span 
                                    className={`text-xs font-semibold truncate ${
                                      item.done ? 'line-through text-slate-450' : 'text-slate-705'
                                    }`}
                                  >
                                    {item.text}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteActionItem(item.id)}
                                  className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 cursor-pointer shrink-0 border-none bg-transparent flex items-center justify-center"
                                  title="Remover compromiso"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-10 border border-dashed border-slate-150 rounded-xl flex-1 flex flex-col justify-center">
                            <p className="text-xs text-slate-450 font-bold">No hay compromisos asignados.</p>
                            <p className="text-[10px] text-slate-400 mt-1">Asigna una meta o recomendación abajo.</p>
                          </div>
                        )}

                        {/* Add Action Item Form */}
                        <form onSubmit={handleAddActionItem} className="flex gap-2 pt-3 border-t border-slate-100">
                          <input
                            type="text"
                            placeholder="Ej: Completar capacitación de escalado L2..."
                            className="flex-1 text-xs px-3 py-2 border border-slate-250 rounded-xl text-slate-800 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-800 focus:ring-1 focus:ring-blue-800"
                            value={newActionText}
                            onChange={(e) => setNewActionText(e.target.value)}
                          />
                          <button
                            type="submit"
                            className="px-4 py-2 bg-blue-800 hover:bg-blue-900 text-white font-bold text-xs rounded-xl border border-blue-900 hover:border-blue-950 transition-all cursor-pointer flex items-center justify-center gap-1 shrink-0 shadow-3xs"
                          >
                            <Plus className="w-4 h-4" />
                            Asignar
                          </button>
                        </form>
                      </div>

                    </div>
                  )}
                </div>

              </div>

            </div>
          ) : (
            <div className="h-full overflow-y-auto no-scrollbar">
              <AgentEditForm 
                agent={agent}
                tiers={tiers}
                onSave={handleSaveUpdate}
                onCancel={() => setIsEditingAgent(false)}
                paletteColors={paletteColors}
              />
            </div>
          )}
        </div>

      </motion.div>

      {showPasswordModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-[#0d1425] border border-[#1e293b]/90 rounded-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors cursor-pointer"
              type="button"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-amber-500/10 text-amber-500 rounded-xl">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white font-display">Cambio de Contraseña</h3>
                <p className="text-[11px] text-slate-400">Modificar credenciales de acceso para {agent.name}</p>
              </div>
            </div>

            {isLoadingCredential ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-6 h-6 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Consultando credenciales en Firestore...</span>
              </div>
            ) : (
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-sans space-y-1">
                  <p>
                    <strong className="text-slate-400">Usuario asignado:</strong>{' '}
                    <span className="font-mono text-amber-400 font-bold bg-amber-500/5 px-1.5 py-0.5 rounded border border-amber-500/10">
                      {targetCredential ? targetCredential.username : 'Nuevo usuario autogenerado'}
                    </span>
                  </p>
                  <p>
                    <strong className="text-slate-400">Correo:</strong>{' '}
                    <span className="font-mono text-slate-300">
                      {targetCredential ? targetCredential.email : (agent.email || 'Se creará uno por defecto')}
                    </span>
                  </p>
                  {!targetCredential && (
                    <p className="text-amber-500/90 text-[10px] pt-1">
                      ⚠️ Este técnico no tiene un usuario de acceso registrado. Al guardar la contraseña se creará uno nuevo automáticamente.
                    </p>
                  )}
                </div>

                {passwordError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-start gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400 animate-pulse" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showNewPasswordText ? 'text' : 'password'}
                      placeholder="Mínimo 4 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={isSavingPassword}
                      className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:border-amber-500 transition-all font-sans"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPasswordText(!showNewPasswordText)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showNewPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider pl-0.5">
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </span>
                    <input
                      type={showConfirmPasswordText ? 'text' : 'password'}
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isSavingPassword}
                      className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 text-xs rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:border-amber-500 transition-all font-sans"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPasswordText(!showConfirmPasswordText)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showConfirmPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 cursor-pointer transition-all"
                  >
                    Cerrar
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingPassword}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black rounded-xl cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    {isSavingPassword ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                        Guardando...
                      </>
                    ) : (
                      'Actualizar Contraseña'
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </div>,
    document.body
  );
}
