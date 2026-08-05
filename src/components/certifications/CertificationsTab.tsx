import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Certification, DimensionType, TierConfig, Achievement, Agent, CertificationImportance } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { LocalIcon } from '../ui/LocalIcon';

interface CertificationsTabProps {
  currentUser?: { username: string; name: string; email: string; role?: string };
  agents?: Agent[];
  certifications: Certification[];
  tiers?: TierConfig[];
  onAddCertification: (cert: Certification) => void;
  onUpdateCertification: (cert: Certification) => void;
  onDeleteCertification: (certId: string) => void;
  onUpdateCertificationTier: (certId: string, tierId: string) => void;
  achievements: Achievement[];
  onAddAchievement: (ach: Achievement) => void;
  onUpdateAchievement: (ach: Achievement) => void;
  onDeleteAchievement: (achId: string) => void;
  onEnrollAgent?: (agentId: string, id: string, type: "certification" | "achievement") => void;
  onUnenrollAgent?: (agentId: string, id: string, type: "certification" | "achievement") => void;
  onFetchFromFirebase?: () => Promise<void>;
  syncStatus?: 'idle' | 'loading' | 'success' | 'error';
  syncMessage?: string;
  spreadsheetId?: string;
  googleToken?: string | null;
  webhookUrl?: string;
}

const ACHIEVEMENT_ICONS = [
  { value: 'emoji_events', label: 'Copa (emoji_events)' },
  { value: 'gavel', label: 'Martillo / Resolución (gavel)' },
  { value: 'psychology', label: 'Mente / Diagnóstico (psychology)' },
  { value: 'handshake', label: 'Apretón / Empatía (handshake)' },
  { value: 'task_alt', label: 'Check / Completitud (task_alt)' },
  { value: 'support_agent', label: 'Soporte / Servicio (support_agent)' },
  { value: 'local_fire_department', label: 'Fuego / Esfuerzo (local_fire_department)' },
  { value: 'star', label: 'Estrella / Honor (star)' },
  { value: 'workspace_premium', label: 'Sello / Premium (workspace_premium)' },
  { value: 'military_tech', label: 'Rango / Insignia (military_tech)' },
  { value: 'flash_on', label: 'Rayo / Agilidad (flash_on)' }
];

export default function CertificationsTab({ currentUser, agents = [],
  certifications, 
  tiers = [], 
  onAddCertification, 
  onUpdateCertification,
  onDeleteCertification,
  onUpdateCertificationTier,
  achievements = [],
  onAddAchievement,
  onUpdateAchievement,
  onDeleteAchievement,
  onEnrollAgent,
  onUnenrollAgent,
  onFetchFromFirebase,
  syncStatus = 'idle',
  syncMessage = '',
  spreadsheetId = '',
  googleToken = null,
  webhookUrl = ''
}: CertificationsTabProps) {
  const isAdmin = currentUser?.role?.toLowerCase() !== 'user' && !!currentUser;
  const currentAgent = currentUser ? (agents.find(a => 
    (a.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()) || 
    (a.id?.toLowerCase().trim() === currentUser.username?.toLowerCase().trim()) ||
    (a.name?.toLowerCase().trim() === currentUser.name?.toLowerCase().trim())
  ) || null) : null;

  const getTierLevel = (tierId: string) => {
    const t = (tierId || '').toLowerCase();
    if (t === 'a1') return 100;
    if (t === 's2') return 90;
    if (t === 's1') return 80;
    if (t === 'l4') return 40;
    if (t === 'l3') return 30;
    if (t === 'l2') return 20;
    if (t === 'l1.5') return 15;
    if (t === 'l1') return 10;
    return 0; // unassigned
  };

  const [libraryMode, setLibraryMode] = useState<'certifications' | 'achievements'>('certifications');
  
  React.useEffect(() => {
    if (!isAdmin && libraryMode !== 'certifications') {
      setLibraryMode('certifications');
    }
  }, [isAdmin, libraryMode]);

  // Tab states for filtering
  const [activeTab, setActiveTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [achSearchQuery, setAchSearchQuery] = useState('');

  // Drawer open state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Form states for certification (New/Edit)
  const [editingCert, setEditingCert] = useState<Certification | null>(null);
  const [title, setTitle] = useState('');
  const [dimension, setDimension] = useState<DimensionType | ''>('');
  const [iconName, setIconName] = useState('');
  const [targetTiers, setTargetTiers] = useState<string[]>([tiers[0]?.id || 'l1']);
  const [importance, setImportance] = useState<CertificationImportance>('medium');
  const [pointsText, setPointsText] = useState('');
  const [sucesoText, setSucesoText] = useState('');
  const [accionText, setAccionText] = useState('');
  const [conclusionText, setConclusionText] = useState('');

  // Form states for achievements (New/Edit)

  const [editingAch, setEditingAch] = useState<Achievement | null>(null);
  const [enrollState, setEnrollState] = useState<{ id: string, type: 'certification' | 'achievement' } | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState('');

  const [achTitle, setAchTitle] = useState('');
  const [achDescription, setAchDescription] = useState('');
  const [achIconName, setAchIconName] = useState('emoji_events');

  const [toastMessage, setToastMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Inline tier reassignment
  const [editingCertId, setEditingCertId] = useState<string | null>(null);

  const getPointsForImportance = (imp: string) => {
    try {
      const stored = localStorage.getItem('tm_importance_points');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed[imp] !== undefined) return Number(parsed[imp]);
      }
    } catch (e) {
      console.error(e);
    }
    const defaults: Record<string, number> = {
      critical: 40,
      high: 30,
      core: 20,
      medium: 20,
      low: 10,
      nice_to_have: 10
    };
    return defaults[imp] || 15;
  };

  const handleCertSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dimension) {
      setErrorMessage("Por favor indique el título y la dimensión de la certificación.");
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    const customPointsNum = pointsText.trim() !== '' && !isNaN(Number(pointsText)) ? Number(pointsText) : undefined;

    if (editingCert) {
      // Edit operation
      const updatedCert: Certification = {
        ...editingCert,
        title,
        description: `Formación curricular oficial para competencias avanzadas en ${dimension.toUpperCase()}.`,
        dimension,
        targetTiers,
        importance,
        points: customPointsNum,
        requirementDoc: {
          suceso: sucesoText || 'Suceso o detonante inicial que inicia el caso.',
          accion: accionText || 'Acciones clave de resolución, diagnóstico técnico y flujos.',
          conclusion: conclusionText || 'Cierre formal, retroalimentación del cliente o escalamiento.'
        }
      };
      onUpdateCertification(updatedCert);
      setToastMessage("¡Certificación actualizada exitosamente!");
      setEditingCert(null);
    } else {
      // Add operation
      const newCert: Certification = {
        id: `cert_${Date.now()}`,
        title,
        description: `Formación curricular oficial para competencias avanzadas en ${dimension.toUpperCase()}.`,
        dimension,
        targetTiers,
        status: 'published',
        importance,
        points: customPointsNum,
        requirementDoc: {
          suceso: sucesoText || 'Suceso o detonante inicial que inicia el caso.',
          accion: accionText || 'Acciones clave de resolución, diagnóstico técnico y flujos.',
          conclusion: conclusionText || 'Cierre formal, retroalimentación del cliente o escalamiento.'
        }
      };
      onAddCertification(newCert);
      setToastMessage("¡Certificación agregada exitosamente!");
    }

    // Reset Form
    setTitle('');
    setDimension('');
    setIconName('');
    setSucesoText('');
    setAccionText('');
    setConclusionText('');
    setTargetTiers([tiers[0]?.id || 'l1']);
    setImportance('medium');
    setPointsText('');
    setIsDrawerOpen(false);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleStartEditCert = (cert: Certification) => {
    setEditingCert(cert);
    setTitle(cert.title);
    setDimension(cert.dimension);
    setIconName(cert.iconName || '');
    setTargetTiers(cert.targetTiers || [tiers[0]?.id || 'l1']);
    setImportance(cert.importance || 'medium');
    setPointsText(cert.points !== undefined && cert.points !== null ? String(cert.points) : '');
    setSucesoText(cert.requirementDoc.suceso);
    setAccionText(cert.requirementDoc.accion);
    setConclusionText(cert.requirementDoc.conclusion);
    setIsDrawerOpen(true);
  };

  const resetCertForm = () => {
    setEditingCert(null);
    setTitle('');
    setDimension('');
    setTargetTiers([tiers[0]?.id || 'l1']);
    setImportance('medium');
    setPointsText('');
    setSucesoText('');
    setAccionText('');
    setConclusionText('');
  };
  const handleCancelEditCert = () => {
    resetCertForm();
    setIsDrawerOpen(false);
  };

  const handleDeleteCertClick = (id: string) => {
    if (true) {
      onDeleteCertification(id);
      setToastMessage("Certificación archivada exitosamente.");
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  // Achievements handlers
  const handleAchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!achTitle.trim() || !achDescription.trim()) {
      setErrorMessage("Por favor indique el título y la descripción del logro.");
      setTimeout(() => setErrorMessage(''), 4000);
      return;
    }

    if (editingAch) {
      // Edit operation
      const updatedAch: Achievement = {
        ...editingAch,
        title: achTitle,
        description: achDescription,
        iconName: achIconName
      };
      onUpdateAchievement(updatedAch);
      setToastMessage("¡Logro actualizado exitosamente!");
      setEditingAch(null);
    } else {
      // Add operation
      const newAch: Achievement = {
        id: `ach_${Date.now()}`,
        title: achTitle,
        description: achDescription,
        iconName: achIconName
      };
      onAddAchievement(newAch);
      setToastMessage("¡Nuevo logro creado y añadido al catálogo!");
    }

    // Reset form
    setAchTitle('');
    setAchDescription('');
    setAchIconName('emoji_events');
    setIsDrawerOpen(false);
    setTimeout(() => setToastMessage(''), 4000);
  };

  const handleStartEditAch = (ach: Achievement) => {
    setEditingAch(ach);
    setAchTitle(ach.title);
    setAchDescription(ach.description);
    setAchIconName(ach.iconName || 'emoji_events');
    setIsDrawerOpen(true);
  };

  const resetAchForm = () => {
    setEditingAch(null);
    setAchTitle('');
    setAchDescription('');
    setAchIconName('emoji_events');
  };
  const handleCancelEditAch = () => {
    resetAchForm();
    setIsDrawerOpen(false);
  };

  const handleDeleteAchClick = (id: string) => {
    if (true) {
      onDeleteAchievement(id);
      setToastMessage("Logro eliminado del catálogo.");
      setTimeout(() => setToastMessage(''), 4000);
    }
  };

  const getDimensionIcon = (dim: DimensionType) => {
    switch (dim) {
      case 'knowledge': return 'psychology';
      case 'execution': return 'build';
      case 'relational': return 'support_agent';
      case 'collaborative': return 'diversity_3';
      case 'control': return 'settings_suggest';
    }
  };

  const getDimensionColor = (dim: DimensionType) => {
    switch (dim) {
      case 'knowledge': return 'text-cyan-400';
      case 'execution': return 'text-violet-400';
      case 'relational': return 'text-emerald-400';
      case 'collaborative': return 'text-amber-400';
      case 'control': return 'text-slate-400';
    }
  };

  const getTierColor = (tierId: string) => {
    const found = tiers.find(t => t.id === tierId);
    return found ? found.colorHex : '#475569';
  };

  const getTierColorHex = (tier: string) => {
    const found = tiers.find(t => t.id === tier);
    if (found) {
      return `border-slate-800 text-white`;
    }
    switch (tier) {
      case 'l1': return 'bg-slate-500 text-white border-slate-400';
      case 'l2': return 'bg-amber-600/80 text-white border-amber-500/40';
      case 'l3': return 'bg-amber-500 text-[#1e1b4b] border-amber-400';
      case 'l4': return 'bg-cyan-500 text-slate-950 border-cyan-400';
      case 's1': return 'bg-violet-600 text-white border-violet-500';
      case 's2': return 'bg-pink-600 text-white border-pink-500';
      case 'a1': return 'bg-red-600 text-white border-red-500';
      default: return 'bg-slate-800 text-slate-355 border-slate-750';
    }
  };

  const getTierName = (tier: string) => {
    const found = tiers.find(t => t.id === tier);
    if (found) return found.name;
    switch (tier) {
      case 'l1': return 'Tier L1 (Novice)';
      case 'l2': return 'Tier L2 (Proficient)';
      case 'l3': return 'Tier L3 (Expert)';
      case 'l4': return 'Tier L4 (Master)';
      case 's1': return 'Tier S1 (Coordinador)';
      case 's2': return 'Tier S2 (Supervisor)';
      case 'a1': return 'Tier A1 (Gerencia)';
      default: return 'Borrador';
    }
  };


  const agentTierLevel = currentAgent ? getTierLevel(currentAgent.tierId) : 0;

  const filteredCerts = certifications.filter(cert => {
    if (cert.status === 'archived') return false;
    const matchesSearch = cert.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          cert.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' ? true : (cert.targetTiers || []).includes(activeTab);
    
    // Si NO es admin, no mostrar certificaciones de nivel superior al suyo
    let matchesUserTier = true;
    /* Comentado para permitir que vean toda la librería 
    if (!isAdmin && currentAgent) {
      const certLevel = getTierLevel(cert.targetTier);
      if (certLevel > agentTierLevel) {
        matchesUserTier = false;
      }
    }
    */
    
    return matchesSearch && matchesTab && matchesUserTier;
  });

  const filteredAchievements = achievements.filter(ach => {
    return ach.title.toLowerCase().includes(achSearchQuery.toLowerCase()) ||
           ach.description.toLowerCase().includes(achSearchQuery.toLowerCase());
  });

  return (
    <div className="flex-grow flex flex-col gap-6" id="certifications-view-container">
      
      {/* Toast Alert / Error notifications */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500/20 text-white p-4 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in"
          >
            <span className="material-symbols-outlined font-black">library_add</span>
            <span className="text-sm font-sans font-semibold">{toastMessage}</span>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-rose-600 to-red-600 border border-rose-500/20 text-white p-4 rounded-xl shadow-xl flex items-center gap-3"
          >
            <span className="material-symbols-outlined font-black">error</span>
            <span className="text-sm font-sans font-semibold">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Library Mode Selector (Top Subtabs) */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-3" id="library-mode-subtabs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setLibraryMode('certifications');
                setActiveTab('all');
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                libraryMode === 'certifications'
                  ? 'bg-indigo-600/20 border-indigo-500/45 text-indigo-400'
                  : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-sm">workspace_premium</span>
              Certificaciones Curriculares
            </button>
            <button
              onClick={() => setLibraryMode('achievements')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                libraryMode === 'achievements'
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                  : 'text-slate-400 hover:text-slate-200 bg-transparent border-transparent'
              }`}
            >
              <span className="material-symbols-outlined text-sm">emoji_events</span>
              Logros, Hitos e Insignias
            </button>
          </div>

          {/* Action button to open Drywall Drawer */}
          <button
            onClick={() => {
              if (libraryMode === 'certifications') {
                resetCertForm();
              } else {
                resetAchForm();
              }
              setIsDrawerOpen(true);
            }}
            className={`px-4.5 py-2.5 rounded-xl text-xs font-extrabold transition-all duration-150 flex items-center gap-2 shadow-lg active:scale-95 cursor-pointer border-none shrink-0 ${
              libraryMode === 'certifications'
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-950/40'
            }`}
          >
            <span className="material-symbols-outlined text-sm font-black">add</span>
            {libraryMode === 'certifications' ? 'Crear Certificación' : 'Crear Logro'}
          </button>
        </div>
      )}

      {libraryMode === 'certifications' ? (
        // Certifications Panel
        <div className="flex flex-col gap-5 w-full" id="certs-main-layout">
          
          {/* Filters, Tabs & Search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filters / Tabbed options */}
            <div className="flex items-center gap-1.5 border-b border-slate-850 pb-1 overflow-x-auto no-scrollbar font-sans text-xs" id="certs-tabs">
              {[
                { id: 'all', label: 'Ver Todos' },
                ...tiers.map(t => ({ id: t.id, label: t.name })),
                { id: 'unassigned', label: 'Borradores' }
              ].filter(tab => {
                if (tab.id === 'unassigned' && !isAdmin) return false;
                return true;
              }).map(tab => {
                const tabId = tab.id;
                const active = activeTab === tabId;
                const label = tab.label;
                return (
                  <button
                    key={tabId}
                    onClick={() => setActiveTab(tabId)}
                    className={`px-4 py-2 font-black whitespace-nowrap border-b-2 cursor-pointer transition-all ${
                      active 
                        ? 'border-indigo-500 text-indigo-400 font-extrabold' 
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Inline search course bar */}
            <div className="relative md:w-80">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</span>
              <input 
                type="text"
                placeholder="Buscar curso, temarios avanzados..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs bg-[#111827]/60 backdrop-blur-md border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Cards Grid - Expanded Full Width */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="certs-cards-grid">
            {filteredCerts.map(cert => (
              <div 
                key={cert.id}
                className="bg-[#111827]/60 backdrop-blur-md rounded-2xl border border-white/5 p-5 flex flex-col gap-4.5 hover:border-indigo-500/40 hover:shadow-xl transition-all relative overflow-hidden group cursor-default"
              >
                {/* Thin colorful top indicator border */}
                <div 
                  className="absolute top-0 left-0 w-full h-1" 
                  style={{ backgroundColor: getTierColor((cert.targetTiers && cert.targetTiers.length > 0) ? cert.targetTiers[0] : 'l1') }}
                />

                {/* Card tag row */}
                <div className="flex justify-between items-center gap-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(cert.targetTiers || []).map(tier => (
                      <span 
                        key={tier}
                        className={`px-2.5 py-0.5 rounded-lg border uppercase font-mono text-[8.5px] font-black tracking-wider ${getTierColorHex(tier)}`}
                        style={{ backgroundColor: `${getTierColor(tier)}15`, borderColor: `${getTierColor(tier)}40`, color: getTierColor(tier) }}
                      >
                        {getTierName(tier).split(' ')[0]} {tier.toUpperCase()}
                      </span>
                    ))}
                    <span className="px-1.5 py-0.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[8.5px] font-black tracking-wider">
                      {cert.points !== undefined && cert.points !== null ? cert.points : getPointsForImportance(cert.importance || 'medium')} XP
                    </span>
                    <span className="px-1.5 py-0.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 font-mono text-[8.5px] font-bold uppercase tracking-wider">
                      {cert.importance || 'medium'}
                    </span>
                  </div>
                  
                  {/* Actions: Edit and Delete for Admins or Enroll/Unenroll for Users */}
                  <div className="flex items-center gap-1.5 transition-all">
                    {isAdmin ? (
                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEnrollState({ id: cert.id, type: 'certification' })}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-600 hover:text-white text-slate-300 transition-colors cursor-pointer border-none flex items-center justify-center"
                          title="Asignar a un agente"
                        >
                          <span className="material-symbols-outlined text-xs font-bold block">person_add</span>
                        </button>
                        <button
                          onClick={() => handleStartEditCert(cert)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-indigo-600 hover:text-white text-slate-300 transition-colors cursor-pointer border-none flex items-center justify-center"
                          title="Editar certificación"
                        >
                          <span className="material-symbols-outlined text-xs font-bold block">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteCertClick(cert.id)}
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-600 hover:text-white text-slate-300 transition-colors cursor-pointer border-none flex items-center justify-center"
                          title="Archivar certificación"
                        >
                          <span className="material-symbols-outlined text-xs font-bold block">delete</span>
                        </button>
                      </div>
                    ) : (
                      currentAgent && (
                        (() => {
                          const isEnrolled = (currentAgent.certifications || []).includes(cert.id);
                          const progress = currentAgent.certProgress?.[cert.id];
                          const isCompleted = progress?.completed;
                          
                          if (isCompleted) {
                            return (
                              <div className="px-3 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-600/40 flex items-center gap-1.5 text-[10px] font-bold">
                                <span className="material-symbols-outlined text-xs font-black">verified</span>
                                Completado
                              </div>
                            );
                          }

                          if (isEnrolled) {
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUnenrollAgent && onUnenrollAgent(currentAgent.id, cert.id, 'certification');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white text-[11px] font-bold transition-all cursor-pointer border border-red-600/40 flex items-center gap-1.5 shadow-lg shadow-red-950/20"
                              >
                                <span className="material-symbols-outlined text-xs font-black">cancel</span>
                                Desinscribirse
                              </button>
                            );
                          } else {
                            return (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEnrollAgent && onEnrollAgent(currentAgent.id, cert.id, 'certification');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white text-[11px] font-bold transition-all cursor-pointer border border-indigo-600/40 flex items-center gap-1.5 shadow-lg shadow-indigo-950/20"
                              >
                                <span className="material-symbols-outlined text-xs font-black">add_circle</span>
                                Inscribirse
                              </button>
                            );
                          }
                        })()
                      )
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="flex gap-3 items-start">
                  {cert.iconName && (
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 shadow-inner">
                      <LocalIcon name={cert.iconName} className="w-6 h-6" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-display font-extrabold text-sm text-white line-clamp-1">{cert.title}</h4>
                  <p className="font-sans text-xs text-slate-400 leading-relaxed mt-1 line-clamp-2">
                    {cert.description}
                  </p>
                </div>
                </div>

                {/* Requirements display accordion snippet */}
                <div className="bg-slate-950/60 border border-slate-850 p-3 rounded-xl text-[10.5px] text-slate-400 font-sans flex flex-col gap-1.5 shadow-inner">
                  <p className="line-clamp-1"><strong>Suceso:</strong> <span className="text-slate-300">{cert.requirementDoc.suceso}</span></p>
                  <p className="line-clamp-1"><strong>Acción:</strong> <span className="text-slate-300">{cert.requirementDoc.accion}</span></p>
                  <p className="line-clamp-1"><strong>Conclusión:</strong> <span className="text-slate-300">{cert.requirementDoc.conclusion}</span></p>
                </div>

                {/* Footer Dimension assignment row */}
                <div className="mt-auto pt-3 border-t border-slate-850 flex justify-between items-center text-xs font-mono">
                  <span className={`flex items-center gap-1.5 font-black ${getDimensionColor(cert.dimension)}`}>
                    <span className="material-symbols-outlined text-base">
                      {getDimensionIcon(cert.dimension)}
                    </span>
                    {cert.dimension.toUpperCase()}
                  </span>

                  {isAdmin && (
                    editingCertId === cert.id ? (
                      <div className="flex items-center gap-1.5">
                        <select
                          onChange={(e) => {
                            onUpdateCertificationTier(cert.id, e.target.value);
                            setEditingCertId(null);
                          }}
                          defaultValue={(cert.targetTiers && cert.targetTiers.length > 0) ? cert.targetTiers[0] : 'l1'}
                          className="py-1 px-2.5 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[9px] text-white focus:outline-none"
                        >
                          {tiers.map((t, index) => (
                            <option key={`cert-inline-tier-${t.id}-${index}`} value={t.id}>{t.name}</option>
                          ))}
                          <option value="unassigned">Borrador</option>
                        </select>
                        <button 
                          onClick={() => setEditingCertId(null)}
                          className="text-rose-400 font-black cursor-pointer px-1 text-xs border-none bg-transparent"
                        >
                          X
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setEditingCertId(cert.id)}
                        className="text-indigo-400 hover:text-indigo-300 font-black text-[10px] uppercase tracking-wider flex items-center gap-0.5 cursor-pointer border-none bg-transparent p-0"
                      >
                        Asignar Tier <span className="material-symbols-outlined text-[13px] font-black">arrow_forward</span>
                      </button>
                    )
                  )}
                </div>

              </div>
            ))}

            {filteredCerts.length === 0 && (
              <div className="col-span-full py-16 text-center text-xs text-slate-500 italic bg-[#111827]/40 border border-white/5 rounded-2xl">
                Ninguna certificación coincide con el filtro seleccionado.
              </div>
            )}
          </div>

        </div>
      ) : (
        // Achievements (Logros y Hitos) Panel
        <div className="flex flex-col gap-5 w-full" id="achievements-main-layout">
          
          {/* Header & Search */}
          <div className="flex justify-between items-center gap-4">
            <div className="relative w-full md:w-80">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">search</span>
              <input 
                type="text"
                placeholder="Buscar logros por título, palabras clave..."
                value={achSearchQuery}
                onChange={(e) => setAchSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs bg-[#111827]/60 backdrop-blur-md border border-white/5 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
              />
            </div>
          </div>

          {/* Achievements Grid - Expanded Full Width */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="achievements-cards-grid">
            {filteredAchievements.map(ach => (
              <div 
                key={ach.id}
                className="bg-[#111827]/60 backdrop-blur-md rounded-2xl border border-amber-500/10 p-5 flex flex-col gap-4.5 hover:border-amber-400/30 hover:shadow-xl transition-all relative overflow-hidden group cursor-default"
              >
                {/* Decorative glowing top strip */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-yellow-600 opacity-60" />

                {/* Icon & Title Layout */}
                <div className="flex gap-4.5 items-start justify-between">
                  <div className="flex gap-3.5 items-center">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                      <LocalIcon name={ach.iconName || 'emoji_events'} className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-sm text-white leading-tight">{ach.title}</h4>
                      <p className="font-mono text-[9px] uppercase font-bold text-amber-500 mt-0.5 tracking-wider">Insignia / Logro</p>
                    </div>
                  </div>

                  {/* Actions: Edit and Delete */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => setEnrollState({ id: ach.id, type: 'achievement' })}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-600 hover:text-white text-slate-350 transition-colors cursor-pointer border-none flex items-center justify-center"
                        title="Asignar a un agente"
                      >
                        <span className="material-symbols-outlined text-xs font-bold block">person_add</span>
                      </button>
                      <button
                        onClick={() => handleStartEditAch(ach)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-amber-500 hover:text-slate-950 text-slate-350 transition-colors cursor-pointer border-none flex items-center justify-center"
                        title="Editar logro"
                      >
                        <span className="material-symbols-outlined text-xs font-bold block">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAchClick(ach.id)}
                        className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-red-600 hover:text-white text-slate-350 transition-colors cursor-pointer border-none flex items-center justify-center"
                        title="Eliminar logro"
                      >
                        <span className="material-symbols-outlined text-xs font-bold block">delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Description */}
                <p className="font-sans text-xs text-slate-400 leading-relaxed min-h-[45px]">
                  {ach.description}
                </p>

                <div className="mt-auto pt-3 border-t border-slate-850/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs text-amber-400">workspace_premium</span>
                    Hito Especializable
                  </span>
                  <span className="text-slate-500 font-bold uppercase tracking-wide text-[9px]">ID: {ach.id}</span>
                </div>

              </div>
            ))}

            {filteredAchievements.length === 0 && (
              <div className="col-span-full py-16 text-center text-xs text-slate-500 italic bg-[#111827]/40 border border-white/5 rounded-2xl">
                Ningún logro o insignia coincide con la búsqueda.
              </div>
            )}
          </div>

        </div>
      )}

      {/* Slide-over Drawer / Drywall Form Container (React Portal) */}
      {createPortal(
        <AnimatePresence>
          {isDrawerOpen && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[9999] flex justify-end font-sans">
              
              {/* Outside Overlay closes the drawer */}
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={() => {
                  if (libraryMode === 'certifications') {
                    handleCancelEditCert();
                  } else {
                    handleCancelEditAch();
                  }
                }}
              />

              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
                className="relative w-full max-w-md sm:max-w-lg h-full bg-white border-l border-slate-200 shadow-2xl flex flex-col z-10 overflow-hidden text-slate-800"
              >
                {/* Visual Top Highlight Line */}
                <div className={`absolute top-0 inset-x-0 h-1.5 ${libraryMode === 'certifications' ? 'bg-indigo-600' : 'bg-amber-500'}`} />

                {/* Header */}
                <div className="flex justify-between items-center pb-4 pt-5 px-6 border-b border-slate-100 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <span className={`material-symbols-outlined text-xl font-bold ${libraryMode === 'certifications' ? 'text-indigo-600' : 'text-amber-500'}`}>
                      {libraryMode === 'certifications' 
                        ? (editingCert ? 'edit_note' : 'workspace_premium') 
                        : (editingAch ? 'military_tech' : 'emoji_events')
                      }
                    </span>
                    <h3 className="font-display font-black text-slate-900 text-base tracking-tight uppercase">
                      {libraryMode === 'certifications' 
                        ? (editingCert ? 'Editar Certificación' : 'Nueva Certificación')
                        : (editingAch ? 'Editar Logro o Hito' : 'Crear Logro o Hito')
                      }
                    </h3>
                  </div>
                  <button 
                    onClick={() => {
                      if (libraryMode === 'certifications') {
                        handleCancelEditCert();
                      } else {
                        handleCancelEditAch();
                      }
                    }}
                    className="text-slate-400 hover:text-slate-800 cursor-pointer w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center transition-all bg-transparent border-none"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>

                {/* Scrollable Form Body */}
                <form 
                  onSubmit={libraryMode === 'certifications' ? handleCertSubmit : handleAchSubmit}
                  className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5 text-slate-800"
                >
                  {libraryMode === 'certifications' ? (
                    // Certifications Form Fields
                    <div className="space-y-4 font-sans text-xs">
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider">Título Curricular</label>
                        <input 
                          type="text"
                          placeholder="Ej: Protocolo de Diagnóstico Avanzado"
                          required
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-sans"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider">Criterio / Dimensión Primaria</label>
                        <div className="relative">
                          <select
                            value={dimension}
                            onChange={(e) => setDimension(e.target.value as DimensionType)}
                            required
                            className="appearance-none w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="" disabled className="text-slate-400">Seleccione dimensión...</option>
                            <option value="knowledge">Conocimiento (Certificaciones)</option>
                            <option value="execution">Troubleshooting (Capacidad Técnica)</option>
                            <option value="relational">Atención al Cliente (Relacional)</option>
                            <option value="collaborative">Habilidades Blandas (Interno)</option>
                            <option value="control">Gestión del Requerimiento (Trazabilidad)</option>
                          </select>
                          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none text-sm font-bold">
                            keyboard_arrow_down
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider">Bitácora Exigida para XP (Plantilla)</label>
                        <div className="border border-slate-200 rounded-xl bg-slate-50 p-2.5 space-y-3">
                          <div>
                            <span className="block text-[10px] font-mono text-slate-500 uppercase font-black mb-1">1. SUCESO / DETONANTE *</span>
                            <textarea 
                              rows={2}
                              required
                              placeholder="Describe el suceso o detonante inicial que inicia el caso de estudio..."
                              value={sucesoText}
                              onChange={(e) => setSucesoText(e.target.value)}
                              className="w-full border border-slate-200 bg-white p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none rounded-lg text-slate-900 placeholder-slate-400 font-sans"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-mono text-slate-500 uppercase font-black mb-1">2. ACCIÓN / RESOLUCIÓN *</span>
                            <textarea 
                              rows={2}
                              required
                              placeholder="Describe los procedimientos de diagnóstico técnico aplicados..."
                              value={accionText}
                              onChange={(e) => setAccionText(e.target.value)}
                              className="w-full border border-slate-200 bg-white p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none rounded-lg text-slate-900 placeholder-slate-400 font-sans"
                            />
                          </div>
                          <div>
                            <span className="block text-[10px] font-mono text-slate-500 uppercase font-black mb-1">3. CONCLUSIÓN / RESULTADO *</span>
                            <textarea 
                              rows={2}
                              required
                              placeholder="Describe el resultado obtenido y el cierre del requerimiento..."
                              value={conclusionText}
                              onChange={(e) => setConclusionText(e.target.value)}
                              className="w-full border border-slate-200 bg-white p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none rounded-lg text-slate-900 placeholder-slate-400 font-sans"
                            />
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Esta bitácora con los 3 bloques estructurados (Suceso, Acción, Conclusión) actuará como plantilla obligatoria para que los técnicos documenten su XP.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nivel de Impacto (Importancia)</label>
                        <select
                          className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
                          value={importance}
                          onChange={(e) => setImportance(e.target.value as CertificationImportance)}
                        >
                          <option value="critical">Crítico ({getPointsForImportance('critical')} XP)</option>
                          <option value="high">Alto Impacto ({getPointsForImportance('high')} XP)</option>
                          <option value="core">Core ({getPointsForImportance('core')} XP)</option>
                          <option value="medium">Impacto Medio ({getPointsForImportance('medium')} XP)</option>
                          <option value="low">Impacto Bajo ({getPointsForImportance('low')} XP)</option>
                          <option value="nice_to_have">Nice to Have ({getPointsForImportance('nice_to_have')} XP)</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider">Puntos Personalizados (XP)</label>
                        <input
                          type="number"
                          placeholder={`Dejar vacío para usar defecto (${getPointsForImportance(importance)} XP)`}
                          value={pointsText}
                          onChange={(e) => setPointsText(e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-sans"
                        />
                        <p className="text-[10px] text-slate-400 mt-0.5">Permite asignar una cantidad de puntos específica que anulará el puntaje del nivel de importancia.</p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Asignación de Escalafón (Tier de Destino)</label>
                        <div className="grid grid-cols-2 gap-2">
                          {tiers.map((tObj, index) => {
                            const selected = targetTiers.includes(tObj.id);
                            return (
                              <label 
                                key={`cert-form-tier-drawer-${tObj.id}-${index}`}
                                className={`flex items-center gap-1.5 p-2.5 rounded-xl border text-[11px] cursor-pointer hover:bg-slate-50 transition-all ${
                                  selected ? 'border-indigo-500 font-bold bg-indigo-50/50 text-indigo-700' : 'border-slate-200 text-slate-600'
                                }`}
                              >
                                <input 
                                  type="checkbox" 
                                  name="targetTiers"
                                  value={tObj.id}
                                  checked={selected}
                                  onChange={() => {
                                    if (selected) {
                                      setTargetTiers(targetTiers.filter(t => t !== tObj.id));
                                    } else {
                                      setTargetTiers([...targetTiers, tObj.id]);
                                    }
                                  }}
                                  className="text-indigo-600 rounded focus:ring-indigo-500 focus:ring-offset-0 bg-white border-slate-200 outline-none cursor-pointer"
                                />
                                <span>{tObj.name}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  ) : (
                    // Achievements Form Fields
                    <div className="space-y-4 font-sans text-xs">
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider">Nombre del Logro / Insignia</label>
                        <input 
                          type="text"
                          placeholder="Ej: Guerrero del Deber / Titán Técnico"
                          required
                          value={achTitle}
                          onChange={(e) => setAchTitle(e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all font-sans"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider">Descripción del Hito</label>
                        <textarea 
                          rows={4}
                          placeholder="Describe el esfuerzo destacado, hito especial o labor por el cual se le otorgará esta insignia personalizada a los técnicos..."
                          required
                          value={achDescription}
                          onChange={(e) => setAchDescription(e.target.value)}
                          className="w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                        />
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="font-mono text-[11px] font-bold text-slate-600 uppercase tracking-wider">Insignia / Icono Coleccionable</label>
                        <div className="flex gap-4.5 items-center">
                          {/* Live Preview */}
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shadow-inner shrink-0">
                            <span className="material-symbols-outlined text-[28px]">
                              {achIconName}
                            </span>
                          </div>

                          <div className="relative flex-grow">
                            <select
                              value={achIconName}
                              onChange={(e) => setAchIconName(e.target.value)}
                              className="appearance-none w-full bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                            >
                              {ACHIEVEMENT_ICONS.map(ic => (
                                <option key={ic.value} value={ic.value}>
                                  {ic.label}
                                </option>
                              ))}
                            </select>
                            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none select-none text-sm font-bold">
                              keyboard_arrow_down
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </form>

                {/* Footer Drawer Actions */}
                <div className="border-t border-slate-100 p-5 bg-slate-50 flex justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (libraryMode === 'certifications') {
                        handleCancelEditCert();
                      } else {
                        handleCancelEditAch();
                      }
                    }}
                    className="px-4.5 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer hover:bg-slate-100 transition-colors bg-white"
                  >
                    Cancelar
                  </button>
                  {libraryMode === 'certifications' && !editingCert && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetTiers(['unassigned']);
                        setToastMessage("Se ha configurado como Borrador (Draft Unassigned) en la lista.");
                        setIsDrawerOpen(false);
                        setTimeout(() => setToastMessage(''), 4000);
                      }}
                      className="px-4.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                    >
                      Borrador
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      if (libraryMode === 'certifications') {
                        handleCertSubmit(e);
                      } else {
                        handleAchSubmit(e);
                      }
                    }}
                    className={`px-5 py-2 text-xs font-bold rounded-xl cursor-pointer transition-colors border-none ${
                      libraryMode === 'certifications'
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/10'
                        : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/10'
                    }`}
                  >
                    {libraryMode === 'certifications' 
                      ? (editingCert ? 'Guardar Cambios' : 'Publicar Certificación')
                      : (editingAch ? 'Guardar Cambios' : 'Crear Logro')
                    }
                  </button>
                </div>

              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Enroll Drawer */}
      {createPortal(
        <AnimatePresence>
          {enrollState && (
            <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-[9999] flex justify-end font-sans">
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={() => setEnrollState(null)}
              />
              
              <motion.div 
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'tween', ease: 'easeInOut', duration: 0.3 }}
                className="relative w-full max-w-md h-full bg-slate-50 border-l border-slate-200 shadow-2xl flex flex-col z-10 overflow-hidden text-slate-800"
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between shrink-0 shadow-sm relative z-20">
                  <div>
                    <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <span className="material-symbols-outlined text-indigo-600">group_add</span>
                      Gestionar Inscripciones
                    </h2>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {enrollState.type === 'certification' ? 'Certificación' : 'Logro'}: {' '}
                      <span className="font-bold text-slate-700">
                        {enrollState.type === 'certification' 
                          ? certifications.find(c => c.id === enrollState.id)?.title 
                          : achievements.find(a => a.id === enrollState.id)?.title}
                      </span>
                    </p>
                  </div>
                  <button 
                    onClick={() => setEnrollState(null)}
                    className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <span className="material-symbols-outlined font-bold text-xl">close</span>
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                  <div className="flex flex-col gap-3">
                    {agents.map(a => {
                      const isEligible = (() => {
                        if (enrollState.type === 'achievement') return true;
                        const cert = certifications.find(c => c.id === enrollState.id);
                        if (!cert) return false;
                        const agentLevel = getTierLevel(a.tierId);
                        return (cert.targetTiers || []).some(t => agentLevel >= getTierLevel(t));
                      })();
                      
                      if (!isEligible) return null;
                      
                      const isEnrolled = enrollState.type === 'certification' 
                        ? (a.certifications || []).includes(enrollState.id)
                        : (a.achievements || []).includes(enrollState.id);
                        
                      return (
                        <div key={a.id} className={`p-3 rounded-xl border flex flex-row items-center justify-between transition-all ${isEnrolled ? 'bg-indigo-50/50 border-indigo-200' : 'bg-white border-slate-200'}`}>
                          <div className="flex items-center gap-3">
                            {a.avatar ? (
                              <img src={a.avatar} alt={a.name} className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm" />
                            ) : (
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm`} style={{ backgroundColor: a.avatarBg || '#6366f1' }}>
                                {a.initials || a.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="font-bold text-sm text-slate-800">{a.name}</p>
                              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">{a.role}</p>
                            </div>
                          </div>
                          
                          <div>
                            {isEnrolled ? (
                              <button
                                onClick={() => {
                                  if (onUnenrollAgent) {
                                    onUnenrollAgent(a.id, enrollState.id, enrollState.type);
                                    setToastMessage('Agente removido exitosamente.');
                                    setTimeout(() => setToastMessage(''), 3000);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 text-xs font-bold transition-colors border border-red-200/50"
                              >
                                Remover
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (onEnrollAgent) {
                                    onEnrollAgent(a.id, enrollState.id, enrollState.type);
                                    setToastMessage('Agente inscrito exitosamente.');
                                    setTimeout(() => setToastMessage(''), 3000);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition-colors shadow-sm shadow-indigo-200"
                              >
                                Inscribir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {agents.filter(a => {
                      if (enrollState.type === 'achievement') return true;
                      const cert = certifications.find(c => c.id === enrollState.id);
                      if (!cert) return false;
                      return (cert.targetTiers || []).some(t => getTierLevel(a.tierId) >= getTierLevel(t));
                    }).length === 0 && (
                      <div className="text-center py-10 px-4 border border-dashed border-slate-300 rounded-2xl bg-slate-50">
                        <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">person_off</span>
                        <h4 className="text-slate-700 font-bold text-sm mb-1">No hay agentes elegibles</h4>
                        <p className="text-xs text-slate-500">
                          Ningún agente cumple con el tier requerido para esta certificación.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}


    </div>
  );
}
