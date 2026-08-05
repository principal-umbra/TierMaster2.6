import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { 
  INITIAL_AGENTS, 
  INITIAL_TIERS, 
  INITIAL_CERTIFICATIONS, 
  INITIAL_ACHIEVEMENTS 
} from './mockData';
import { Agent, AgentEvaluation, DimensionScores, ScrumTask, Certification, TierConfig, XpEvent, Achievement, InternalTask, ContractorTask, IsolatedEvent } from './types';
import Login from './components/Login';
import FirebaseQuotaAlert from './components/FirebaseQuotaAlert';
import { updateCredentials, migrateDailyScrumHistory, fetchAgents, saveAgents, saveSingleAgent, fetchTiers, saveTiers, fetchCertifications, saveCertifications, fetchEvaluations, saveEvaluations, fetchTasks, saveTasks, fetchGoogleMapsKey, syncProgrammedVisits, subscribeToAgents, saveEvents, fetchEvents, subscribeToComingSoonConfig, saveComingSoonConfig, subscribeToCRMData, subscribeToWeeklyBacklog, subscribeToWeeklyBacklogContractors, fetchSystemSettings, subscribeToProgrammedVisits, subscribeToInternalTasks } from './db/firebaseService';
import { subscribeToAsistencia } from './db/asistenciaService';
import { safeLocalStorageSet, debouncedSafeSetItem, safeGetItem } from './lib/storage';

// Dynamic Lazy Imports
const RosterTab = lazy(() => import('./components/roster/RosterTab'));
const DailyWorkspaceTab = lazy(() => import('./components/daily-workspace/DailyWorkspaceTab'));
const DailyAdminUseTab = lazy(() => import('./components/daily-workspace/DailyAdminUseTab'));
const EvaluationTab = lazy(() => import('./components/evaluation/EvaluationTab'));
const LeaderboardTab = lazy(() => import('./components/leaderboard/LeaderboardTab'));
const LeaderboardAdminSettings = lazy(() => import('./components/leaderboard/LeaderboardAdminSettings'));
const ProfilesTab = lazy(() => import('./components/profiles/ProfilesTab'));
const CertificationsTab = lazy(() => import('./components/certifications/CertificationsTab'));
const ConfigurationTab = lazy(() => import('./components/configuration/ConfigurationTab'));
const OperationsTab = lazy(() => import('./components/operations/OperationsTab'));
const RequestBacklogTab = lazy(() => import('./components/request-backlog/RequestBacklogTab'));
const KpiGuideTab = lazy(() => import('./components/kpi-guide/KpiGuideTab'));
const ActionPlanTab = lazy(() => import('./components/action-plan/ActionPlanTab'));
const ContractorManagementTab = lazy(() => import('./components/contractors/ContractorManagementTab'));


export default function App() {
  // Autenticación de Usuario
  const [currentUser, setCurrentUser] = useState<{ username: string; name: string; email: string; role?: string } | null>(() => {
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

  const handleLogout = () => {
    localStorage.removeItem('fhons_current_user');
    setCurrentUser(null);
    setProfileDropdownOpen(false);
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return 'US';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + (parts[parts.length - 1][0] || '')).toUpperCase();
  };

  useEffect(() => {
    const runMigrations = async () => {
      try {
        // Migración de Scrum History
        if (!localStorage.getItem('tm_migration_scrum_run')) {
            await migrateDailyScrumHistory();
            safeLocalStorageSet('tm_migration_scrum_run', 'true');
        }
        
        // Sincronizar visitas programadas en Firestore
        await syncProgrammedVisits();
      } catch (err) {
        console.warn('No se pudo ejecutar las migraciones o sincronización de inicio. Es posible que Firestore esté vacío o no autenticado:', err);
      }
    };
    runMigrations();
  }, []);

  // Cargar Google Maps Key desde Firestore al iniciar la app
  useEffect(() => {
    fetchGoogleMapsKey().then(key => {
      if (key && key.trim()) {
        safeLocalStorageSet('GOOGLE_MAPS_PLATFORM_KEY', key.trim());
        (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY = key.trim();
      }
    }).catch(err => {
      console.warn('No se pudo cargar la llave de Google Maps desde Firestore al iniciar:', err);
    });
  }, []);

  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [syncMessage, setSyncMessage] = useState<string>('');
  const isSyncingFromFirebase = React.useRef(false);

  // Estados de Tareas Operativas (Globalizados)
  const [internalTasks, setInternalTasksInternal] = useState<InternalTask[]>(() => {
    try {
      const saved = localStorage.getItem('tm_ops_internal_tasks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const shouldSyncTasks = React.useRef(false);
  const setInternalTasks = (update: React.SetStateAction<InternalTask[]>) => {
    shouldSyncTasks.current = true;
    setInternalTasksInternal(prev => {
      const next = typeof update === 'function' ? (update as Function)(prev) : update;
      safeLocalStorageSet('tm_ops_internal_tasks', JSON.stringify(next));
      return next;
    });
  };

  const [contractorTasks, setContractorTasksInternal] = useState<ContractorTask[]>(() => {
    try {
      localStorage.removeItem('tm_ops_contractor_tasks');
    } catch (e) {}
    return [];
  });

  const setContractorTasks = (update: React.SetStateAction<ContractorTask[]>) => {
    shouldSyncTasks.current = true;
    setContractorTasksInternal(prev => {
      const next = typeof update === 'function' ? (update as Function)(prev) : update;
      safeLocalStorageSet('tm_ops_contractor_tasks', JSON.stringify(next));
      return next;
    });
  };

  const [isolatedEvents, setIsolatedEventsInternal] = useState<IsolatedEvent[]>(() => {
    try {
      const saved = localStorage.getItem('tm_ops_isolated_events');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const shouldSyncIsolatedEvents = React.useRef(false);
  const setIsolatedEvents = (update: React.SetStateAction<IsolatedEvent[]>) => {
    shouldSyncIsolatedEvents.current = true;
    setIsolatedEventsInternal(prev => typeof update === 'function' ? (update as Function)(prev) : update);
  };

  const [crmData, setCrmData] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('tm_crm_data');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [currentWeekRange, setCurrentWeekRange] = useState<string>(() => {
    try {
      return localStorage.getItem('current_week_range') || '';
    } catch { return ''; }
  });
  const [realtimeCrmRows, setRealtimeCrmRows] = useState<any[]>([]);
  const [realtimeWeeklyBacklog, setRealtimeWeeklyBacklog] = useState<any[]>([]);
  const [realtimeWeeklyContractors, setRealtimeWeeklyContractors] = useState<any[]>([]);
  const [realtimeAsistenciaRows, setRealtimeAsistenciaRows] = useState<any[]>([]);
  const [programmedVisits, setProgrammedVisits] = useState<any[]>([]);

  const handleFetchFromFirebase = async (isBackground: boolean = false) => {
    if (!isBackground) {
      setSyncStatus('loading');
      setSyncMessage('Sincronizando y descargando roster, jerarquía y tareas de Firestore...');
    }
    try {
      isSyncingFromFirebase.current = true;
      
      try {
        const settings = await fetchSystemSettings();
        if (settings && settings.current_week_range) {
          setCurrentWeekRange(settings.current_week_range);
          safeLocalStorageSet('current_week_range', settings.current_week_range);
        }
      } catch (e) {
        console.error("Error fetching system settings inside App.tsx:", e);
      }

      const fetchedAgents = await fetchAgents(undefined, isBackground);
      const fetchedTiers = await fetchTiers();
      const fetchedCertifications = await fetchCertifications();
      const { internalTasks: fetchedIntTasks, contractorTasks: fetchedContTasks } = await fetchTasks();
      
      if (fetchedIntTasks && fetchedIntTasks.length > 0) {
        setInternalTasksInternal(fetchedIntTasks);
      }
      if (fetchedContTasks && fetchedContTasks.length > 0) {
        setContractorTasks(fetchedContTasks);
      }
      if (!shouldSyncTiers.current && fetchedTiers && fetchedTiers.length > 0) {
        setTiersInternal(fetchedTiers);
      }
      if (!shouldSyncCertifications.current && fetchedCertifications && fetchedCertifications.length > 0) {
        setCertificationsInternal(fetchedCertifications);
      }

      // Sincronizar Certificaciones con Agentes (Lógica existente preservada)
      if (fetchedCertifications && fetchedCertifications.length > 0 && fetchedAgents && fetchedAgents.length > 0) {
        fetchedCertifications.forEach(cert => {
          if (cert.enrolledAgentIds && cert.enrolledAgentIds.length > 0) {
            cert.enrolledAgentIds.forEach((agentId: string) => {
              const agent = fetchedAgents.find(a => a.id === agentId);
              if (agent) {
                if (!agent.certifications) agent.certifications = [];
                if (!agent.certifications.includes(cert.id)) {
                  agent.certifications.push(cert.id);
                }
                if (!agent.certProgress) agent.certProgress = {};
                if (!agent.certProgress[cert.id]) {
                  agent.certProgress[cert.id] = {
                    certId: cert.id,
                    completed: false,
                    testPassed: false,
                    appliedInWork: false,
                    expositionScheduled: false,
                    expositionStatus: 'pending'
                  };
                }
              }
            });
          }
        });
      }

      if (fetchedAgents && fetchedAgents.length > 0) {
        setAgents(fetchedAgents);
        debouncedSafeSetItem('tm_agents', fetchedAgents);
        
        let successMessage = `¡Base de datos Firestore sincronizada! Se cargaron ${fetchedAgents.length} técnicos.`;

        if (!isBackground) {
          setSyncStatus('success');
          setSyncMessage(successMessage);
          setTimeout(() => {
            setSyncStatus('idle');
            setSyncMessage('');
          }, 5000);
        }
      }
    } catch (err: any) {
      console.error(err);
      if (!isBackground) {
        setSyncStatus('error');
        setSyncMessage(`No se pudo sincronizar los datos de Firestore: ${err.message || 'Error desconocido'}. Usando copia local.`);
        setTimeout(() => {
          setSyncStatus('idle');
        }, 7000);
      }
    } finally {
      setTimeout(() => {
        isSyncingFromFirebase.current = false;
      }, 300);
    }
  };

  const handleSaveAgents = async (agentsData: Agent[]) => {
    setSyncStatus('loading');
    setSyncMessage('Sincronizando cambios de técnicos con Firestore...');
    try {
      await saveAgents(agentsData);
      
      setSyncStatus('success');
      setSyncMessage('¡Técnicos sincronizados en Firestore!');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage(`Fallo al enviar datos de técnicos a Firestore: ${err.message || 'Error de conexión'}`);
    }
  };

  const handleSaveCertifications = async (certsData: Certification[]) => {
    try {
      setSyncMessage('Sincronizando cambios de certificaciones con Firestore...');
      await saveCertifications(certsData);
      setSyncMessage('¡Certificaciones actualizadas en Firestore!');
      setSyncStatus('idle');
      setTimeout(() => setSyncMessage(''), 3000);
    } catch (err: any) {
      setSyncStatus('error');
      setSyncMessage(`Fallo al enviar datos de certificaciones a Firestore: ${err.message || 'Error de conexión'}`);
    }
  };

  const handleSaveTiers = async (tiersData: TierConfig[]) => {
    setSyncStatus('loading');
    setSyncMessage('Sincronizando cambios del escalafón (Tiers) con Firestore...');
    try {
      await saveTiers(tiersData);
      
      setSyncStatus('success');
      setSyncMessage('¡Tiers actualizados en Firestore!');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 4000);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage(`Fallo al enviar Tiers a Firestore: ${err.message || 'Error de conexión'}`);
    }
  };

  const handleSaveOperativoTareas = async (intTasks: InternalTask[], contTasks: ContractorTask[]) => {
    setSyncStatus('loading');
    setSyncMessage('Sincronizando tareas operativas con Firestore...');
    try {
      await saveTasks(intTasks, contTasks);
      setSyncStatus('success');
      setSyncMessage('¡Tareas operativas sincronizadas en Firestore!');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage(`Error al sincronizar tareas en Firestore: ${err.message}`);
    }
  };

  const handleSaveOperativoEventos = async (events: IsolatedEvent[]) => {
    setSyncStatus('loading');
    setSyncMessage('Sincronizando eventos operativos con Firestore...');
    try {
      await saveEvents(events);
      setSyncStatus('success');
      setSyncMessage('¡Eventos operativos sincronizados en Firestore!');
      setTimeout(() => {
        setSyncStatus('idle');
        setSyncMessage('');
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setSyncStatus('error');
      setSyncMessage(`Error al sincronizar eventos en Firestore: ${err.message}`);
      setTimeout(() => setSyncStatus('idle'), 5000);
    }
  };

  // Carga inicial desde Firestore al montar el componente
  useEffect(() => {
    handleFetchFromFirebase();
  }, []);

  // Escuchar actualizaciones de configuración del leaderboard para refrescar XP
  useEffect(() => {
    const handleSettingsUpdate = () => {
      handleFetchFromFirebase(true);
    };
    window.addEventListener('leaderboard_settings_updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('leaderboard_settings_updated', handleSettingsUpdate);
    };
  }, []);

  // Suscribirse a cambios en tiempo real del roster de agentes (status, xp, etc.)
  useEffect(() => {
    const unsubscribe = subscribeToAgents((updatedAgentsList) => {
      setAgentsInternal(prev => {
        let hasChanges = false;
        const next = prev.map(agent => {
          const match = updatedAgentsList.find(u => u.id === agent.id);
          if (match) {
            // Check if status, currentXp, tierId, or evaluations have updated
            const evCountMatch = match.evaluationsCount ?? 0;
            const evCountAgent = agent.evaluationsCount ?? 0;
            const historyLenMatch = match.evaluationsHistory?.length ?? 0;
            const historyLenAgent = agent.evaluationsHistory?.length ?? 0;

            const scoreMatchStr = JSON.stringify(match.dimensionScores || {});
            const scoreAgentStr = JSON.stringify(agent.dimensionScores || {});

            if (
              match.status !== agent.status || 
              match.currentXp !== agent.currentXp || 
              match.tierId !== agent.tierId ||
              evCountMatch !== evCountAgent ||
              historyLenMatch !== historyLenAgent ||
              (scoreMatchStr !== scoreAgentStr && scoreMatchStr !== '{}')
            ) {
              hasChanges = true;
              return {
                ...agent,
                ...match,
                status: match.status ?? agent.status,
                currentXp: match.currentXp ?? agent.currentXp,
                tierId: match.tierId ?? agent.tierId,
                evaluationsCount: match.evaluationsCount ?? 0,
                evaluationsHistory: match.evaluationsHistory !== undefined ? match.evaluationsHistory : (agent.evaluationsHistory || []),
                xpEvents: match.xpEvents || agent.xpEvents,
                dimensionScores: match.dimensionScores || agent.dimensionScores
              };
            }
          }
          return agent;
        });

        // Handle completely new agents
        updatedAgentsList.forEach(match => {
          const exists = next.some(a => a.id === match.id);
          if (!exists) {
            hasChanges = true;
            next.push(match);
          }
        });

        return hasChanges ? next : prev;
      });
    });
    return () => unsubscribe();
  }, []);

  // Firestore Real-Time Subscriptions replace the polling.
  // Polling removed to avoid excessive read/write cycles on Firestore free tier.

  // Master States with local storage integration
  const [agents, setAgentsInternal] = useState<Agent[]>(() => {
    try {
      const saved = localStorage.getItem('tm_agents');
      const loadedAgents = saved ? (JSON.parse(saved) as Agent[]) : INITIAL_AGENTS;
      return loadedAgents.map(agent => {
        const defaultAgent = INITIAL_AGENTS.find(ia => ia.id === agent.id);
        const baseAgent = defaultAgent ? { ...defaultAgent, ...agent } : agent;

        return {
          ...baseAgent,
          currentXp: agent.currentXp ?? baseAgent.currentXp ?? 0,
          evaluationsCount: agent.evaluationsCount ?? baseAgent.evaluationsCount ?? 0,
          evaluationsHistory: agent.evaluationsHistory && agent.evaluationsHistory.length > 0 
            ? agent.evaluationsHistory 
            : (baseAgent.evaluationsHistory || []),
          xpEvents: agent.xpEvents && agent.xpEvents.length > 0 
            ? agent.xpEvents 
            : (baseAgent.xpEvents || []),
          dimensionScores: agent.dimensionScores || baseAgent.dimensionScores || {
            knowledge: 25,
            execution: 25,
            relational: 25,
            collaborative: 25,
            control: 25
          },
          achievements: agent.achievements || baseAgent.achievements || [],
          scrumLogs: agent.scrumLogs || baseAgent.scrumLogs || [],
          skills: (agent.skills && agent.skills.length > 0) ? agent.skills : (baseAgent.skills || []),
          specialties: (agent.specialties && agent.specialties.length > 0) ? agent.specialties : (baseAgent.specialties || []),
          improvementAreas: (agent.improvementAreas && agent.improvementAreas.length > 0) ? agent.improvementAreas : (baseAgent.improvementAreas || []),
          painPoints: (agent.painPoints && agent.painPoints.length > 0) ? agent.painPoints : (baseAgent.painPoints || []),
          actionPlan: (agent.actionPlan && agent.actionPlan.length > 0) ? agent.actionPlan : (baseAgent.actionPlan || [])
        };
      });
    } catch (e) {
      return INITIAL_AGENTS;
    }
  });

  const shouldSyncAgents = React.useRef(false);
  const setAgents = (update: React.SetStateAction<Agent[]>) => {
    shouldSyncAgents.current = true;
    setAgentsInternal(prev => {
      const next = typeof update === 'function' ? (update as Function)(prev) : update;
      return next;
    });
  };

  // 1. Subscribe to CRM, Weekly Backlog, and Asistencia in real-time
  useEffect(() => {
    const unsubscribeCRM = subscribeToCRMData('requerimientos_en_curso', (rows) => {
      setRealtimeCrmRows(rows);
    });

    const unsubscribeWeekly = subscribeToWeeklyBacklog((rows) => {
      setRealtimeWeeklyBacklog(rows);
    });

    const unsubscribeWeeklyContractors = subscribeToWeeklyBacklogContractors((rows) => {
      setRealtimeWeeklyContractors(rows);
    });

    return () => {
      unsubscribeCRM();
      unsubscribeWeekly();
      unsubscribeWeeklyContractors();
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToProgrammedVisits((visits) => {
      setProgrammedVisits(visits);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (agents.length === 0) return;
    const unsubscribe = subscribeToAsistencia(agents, (rows) => {
      setRealtimeAsistenciaRows(rows);
    });
    return () => unsubscribe();
  }, [agents]);

  // Suscribirse a cambios en tiempo real de tareas operativas (para reflejar estados, aperturas y avances en vivo entre agentes)
  useEffect(() => {
    const unsubscribe = subscribeToInternalTasks((updatedTasks) => {
      isSyncingFromFirebase.current = true;
      setInternalTasksInternal(updatedTasks);
      safeLocalStorageSet('tm_ops_internal_tasks', JSON.stringify(updatedTasks));
      setTimeout(() => { isSyncingFromFirebase.current = false; }, 500);
    });

    return () => unsubscribe();
  }, []);

  // 2. Debounced background agent refresh to recalculate complete XP and breakdown
  useEffect(() => {
    const timer = setTimeout(() => {
      handleFetchFromFirebase(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [realtimeCrmRows, realtimeWeeklyBacklog, realtimeWeeklyContractors, realtimeAsistenciaRows, programmedVisits]);

  const [tiers, setTiersInternal] = useState<TierConfig[]>(() => {
    try {
      const saved = localStorage.getItem('tm_tiers');
      return saved ? JSON.parse(saved) : INITIAL_TIERS;
    } catch (e) {
      return INITIAL_TIERS;
    }
  });

  const shouldSyncTiers = React.useRef(false);
  const setTiers = (update: React.SetStateAction<TierConfig[]>) => {
    shouldSyncTiers.current = true;
    setTiersInternal(prev => typeof update === 'function' ? (update as Function)(prev) : update);
  };

  const [certifications, setCertificationsInternal] = useState<Certification[]>(() => {
    try {
      const saved = localStorage.getItem('tm_certifications');
      return saved ? JSON.parse(saved) : INITIAL_CERTIFICATIONS;
    } catch (e) {
      return INITIAL_CERTIFICATIONS;
    }
  });

  const shouldSyncCertifications = React.useRef(false);
  const setCertifications = (update: React.SetStateAction<Certification[]>) => {
    shouldSyncCertifications.current = true;
    setCertificationsInternal(prev => typeof update === 'function' ? (update as Function)(prev) : update);
  };

  const [catalogAchievements, setCatalogAchievements] = useState<Achievement[]>(() => {
    try {
      const saved = localStorage.getItem('tm_achievements');
      return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
    } catch (e) {
      return INITIAL_ACHIEVEMENTS;
    }
  });

  useEffect(() => {
    safeLocalStorageSet('tm_achievements', JSON.stringify(catalogAchievements));
  }, [catalogAchievements]);

  // Premium Header interactive states
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  const [notifications, setNotifications] = useState<any[]>([]);
  useEffect(() => { safeGetItem('tm_notifications', []).then(setNotifications); }, []);

  // Sync to local storage & auto-webhook sync

  const isFirstRenderAgents = React.useRef(true);
  useEffect(() => {
    debouncedSafeSetItem('tm_agents', agents);
    
    if (isFirstRenderAgents.current) {
      isFirstRenderAgents.current = false;
      return;
    }

    if (isSyncingFromFirebase.current || !shouldSyncAgents.current) {
      return;
    }
    
    shouldSyncAgents.current = false;
    const delayDebounce = setTimeout(() => {
      handleSaveAgents(agents);
    }, 1000); // Debounce de 1.0s para mayor respuesta en tiempo real
    return () => clearTimeout(delayDebounce);
  }, [agents]);

  const isFirstRenderCerts = React.useRef(true);
  useEffect(() => {
    safeLocalStorageSet('tm_certifications', JSON.stringify(certifications));
    
    if (isFirstRenderCerts.current) {
      isFirstRenderCerts.current = false;
      return;
    }

    if (isSyncingFromFirebase.current || !shouldSyncCertifications.current) {
      return;
    }

    if (!agents || agents.length === 0) {
      return;
    }
    
    shouldSyncCertifications.current = false;
    const delayDebounce = setTimeout(() => {
      handleSaveCertifications(certifications);
    }, 1000);
    return () => clearTimeout(delayDebounce);
  }, [certifications]);

  const isFirstRenderTiers = React.useRef(true);
  useEffect(() => {
    safeLocalStorageSet('tm_tiers', JSON.stringify(tiers));
    
    if (isFirstRenderTiers.current) {
      isFirstRenderTiers.current = false;
      return;
    }

    if (isSyncingFromFirebase.current || !shouldSyncTiers.current) {
      return;
    }
    
    shouldSyncTiers.current = false;
    const delayDebounce = setTimeout(() => {
      handleSaveTiers(tiers);
    }, 1000); // Debounce de 1.0s para mayor respuesta en tiempo real
    return () => clearTimeout(delayDebounce);
  }, [tiers]);

  useEffect(() => {
    safeLocalStorageSet('tm_ops_internal_tasks', JSON.stringify(internalTasks));

    if (isSyncingFromFirebase.current || !shouldSyncTasks.current) {
      return;
    }

    shouldSyncTasks.current = false;
    const delayDebounce = setTimeout(() => {
      handleSaveOperativoTareas(internalTasks, contractorTasks);
    }, 1000);
    return () => clearTimeout(delayDebounce);
  }, [internalTasks, contractorTasks]);

  const isFirstRenderEventos = React.useRef(true);
  useEffect(() => {
    safeLocalStorageSet('tm_ops_isolated_events', JSON.stringify(isolatedEvents));
    
    if (isFirstRenderEventos.current) {
      isFirstRenderEventos.current = false;
      return;
    }

    if (isSyncingFromFirebase.current || !shouldSyncIsolatedEvents.current) return;
    
    shouldSyncIsolatedEvents.current = false;
    const delayDebounce = setTimeout(() => {
      handleSaveOperativoEventos(isolatedEvents);
    }, 2000);
    return () => clearTimeout(delayDebounce);
  }, [isolatedEvents]);

  useEffect(() => {
    safeLocalStorageSet('tm_certifications', JSON.stringify(certifications));
  }, [certifications]);

  useEffect(() => {
    safeLocalStorageSet('tm_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const loggedInAgent = useMemo(() => {
    if (!currentUser) return null;
    const curEmail = currentUser.email?.toLowerCase().trim();
    const curName = currentUser.name?.toLowerCase().trim();
    const curUsername = currentUser.username?.toLowerCase().trim();
    
    let match = agents.find(a => {
      if (curEmail && a.email) {
        const p1 = curEmail.split('@')[0];
        const p2 = a.email.toLowerCase().split('@')[0];
        if (p1 === p2) return true;
      }
      return false;
    });

    if (!match) {
      match = agents.find(a => {
        if (curName && a.name) {
          const n1 = curName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
          const n2 = a.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
          if (n1.includes(n2) || n2.includes(n1)) return true;
        }
        return false;
      });
    }

    if (!match) {
      match = agents.find(a => {
        if (curUsername && a.initials && curUsername === a.initials.toLowerCase()) return true;
        return false;
      });
    }

    // Default fallback
    return match || agents.find(a => a.id === 'AG-RQ-371') || agents[0] || null;
  }, [currentUser, agents]);

  const normalizeName = (name: string): string => {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };

  const isAgentNameMatch = (nameA: string, nameB: string): boolean => {
    if (!nameA || !nameB) return false;
    const cleanA = normalizeName(nameA);
    const cleanB = normalizeName(nameB);
    
    if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
    
    const partsA = cleanA.split(' ').filter(Boolean);
    const partsB = cleanB.split(' ').filter(Boolean);
    
    if (partsA.length > 0 && partsB.length > 0) {
      if (partsA[0] === partsB[0]) {
        if (partsA.length > 1 && partsB.length > 1) {
          if (partsA[1].startsWith(partsB[1]) || partsB[1].startsWith(partsA[1])) {
            return true;
          }
        } else {
          return true;
        }
      }
    }
    return false;
  };

  const normalizeStatus = (status: string): string => {
    if (!status) return '';
    return status
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  const isStatusResolved = (status: string): boolean => {
    if (!status) return false;
    const s = normalizeStatus(status);
    if (s.includes('confirmar')) return false;
    return (
      s.includes('completad') ||
      s.includes('resuelt') ||
      s.includes('cerrad') ||
      s.includes('exitos') ||
      s.includes('finalizad') ||
      s.includes('terminad') ||
      s.includes('entregad') ||
      s.includes('cancelad') ||
      s.includes('anulad') ||
      s.includes('rechazad') ||
      s.includes('done') ||
      s.includes('closed') ||
      s.includes('resolved') ||
      s.includes('completed') ||
      s.includes('historico')
    );
  };

  const isStatusInProgress = (status: string): boolean => {
    if (!status) return false;
    const s = normalizeStatus(status);
    return s.includes('progres') ||
      s.includes('curso') ||
      s.includes('intern') ||
      s.includes('espera') ||
      s.includes('trabajando') ||
      s.includes('proceso') ||
      s.includes('procesando') ||
      s.includes('waiting') ||
      s.includes('hold') ||
      s.includes('reparacion');
  };

  // Real-time roster calculation for loggedInAgent metrics matching "Análisis por Roster"
  const realtimeRosterMetrics = useMemo(() => {
    const findAgentKey = (row: any) => {
      if (!row) return 'Assigned To';
      const keys = Object.keys(row);
      const match = keys.find(k => {
        const lk = k.toLowerCase();
        return lk === 'tecnico asignado' || 
               lk === 'técnico asignado' || 
               lk === 'asignado' || 
               lk === 'agent' || 
               lk === 'assigned to';
      });
      return match || 'Assigned To';
    };

    const findStatusKey = (row: any) => {
      if (!row) return 'Status';
      const keys = Object.keys(row);
      const match = keys.find(k => {
        const lk = k.toLowerCase();
        return lk === 'estado' || lk === 'status';
      });
      return match || 'Status';
    };

    const rosterMap: Record<string, {
      name: string;
      assigned: number;
      working: number;
      completed: number;
      pending: number;
    }> = {};

    agents.forEach(agent => {
      rosterMap[agent.name.toLowerCase().trim()] = {
        name: agent.name,
        assigned: 0,
        working: 0,
        completed: 0,
        pending: 0
      };
    });

    rosterMap['sin_asignar'] = {
      name: 'Sin Asignar / Otros',
      assigned: 0,
      working: 0,
      completed: 0,
      pending: 0
    };

    // Active tickets from CRM
    realtimeCrmRows.forEach(row => {
      const agentKey = findAgentKey(row);
      const statusKey = findStatusKey(row);
      const rawAgentName = String(row[agentKey] || '').trim();
      const isUnassigned = !rawAgentName || 
                            rawAgentName.toLowerCase() === 'unassigned' || 
                            rawAgentName.toLowerCase() === 'sin asignar' || 
                            rawAgentName.toLowerCase() === '-' || 
                            rawAgentName.toLowerCase() === 'n/a' || 
                            rawAgentName.toLowerCase() === 'n/d' || 
                            rawAgentName.toLowerCase() === 'ninguno' || 
                            rawAgentName.toLowerCase() === 'sistema';
                            
      const foundAgent = agents.find(a => isAgentNameMatch(a.name, rawAgentName));
      let targetKey = 'sin_asignar';
      if (foundAgent && !isUnassigned) {
        targetKey = foundAgent.name.toLowerCase().trim();
      }
      
      rosterMap[targetKey].assigned++;
      const statusVal = String(row[statusKey] || '');
      if (isStatusInProgress(statusVal)) {
        rosterMap[targetKey].working++;
      } else if (!isStatusResolved(statusVal)) {
        rosterMap[targetKey].pending++;
      }
    });

    // Completed tickets from weekly backlog
    const activeWeek = currentWeekRange || '';
    const allLogRows = [...realtimeWeeklyBacklog, ...realtimeWeeklyContractors];

    allLogRows.forEach(row => {
      const agentKey = findAgentKey(row);
      const statusKey = findStatusKey(row);
      
      const sprint = String(row.sprint_trabajo || row['Semana Actual'] || '').trim().toLowerCase();
      const activeLower = activeWeek.trim().toLowerCase();
      
      if (activeWeek && sprint) {
        if (sprint !== activeLower && !sprint.includes(activeLower) && !activeLower.includes(sprint)) {
          return;
        }
      }

      const rawAgentName = String(row[agentKey] || row['Assigned To'] || '').trim();
      let targetKey = 'sin_asignar';
      if (rawAgentName) {
        const foundAgent = agents.find(a => isAgentNameMatch(a.name, rawAgentName));
        if (foundAgent) {
          targetKey = foundAgent.name.toLowerCase().trim();
        }
      }

      const statusVal = String(row[statusKey] || row['Status'] || row['Estado'] || '').toUpperCase();
      const regStatus = String(row['Estado Registro'] || '').toUpperCase();
      if (regStatus !== 'MERGED') {
        rosterMap[targetKey].completed++;
      }
    });

    return rosterMap;
  }, [agents, realtimeCrmRows, realtimeWeeklyBacklog, realtimeWeeklyContractors, currentWeekRange]);

  const totalRosterCompleted = useMemo(() => {
    let total = 0;
    Object.entries(realtimeRosterMetrics).forEach(([key, value]) => {
      if (key !== 'sin_asignar') {
        total += (value as any).completed;
      }
    });
    return total;
  }, [realtimeRosterMetrics]);

  const loggedInAgentMetrics = useMemo(() => {
    if (!loggedInAgent) return { completed: 0, assigned: 0, working: 0, pending: 0, aporteRes: 0 };
    const key = loggedInAgent.name.toLowerCase().trim();
    const metrics = (realtimeRosterMetrics as any)[key] || { completed: 0, assigned: 0, working: 0, pending: 0 };
    const aporteRes = totalRosterCompleted > 0 ? Math.round((metrics.completed / totalRosterCompleted) * 100) : 0;
    return { ...metrics, aporteRes };
  }, [loggedInAgent, realtimeRosterMetrics, totalRosterCompleted]);

  const headerAgentSection = useMemo(() => {
    if (!loggedInAgent) return null;

    const totalXp = loggedInAgent.currentXp || 0;
    const sprintXp = (loggedInAgent.xpBreakdown?.performanceScore || 0) + 
                     (loggedInAgent.xpBreakdown?.attendanceScore || 0) + 
                     (loggedInAgent.xpBreakdown?.eventXp || 0) + 
                     (loggedInAgent.xpBreakdown?.sprintMetricsScore || 0);
    const completedReq = loggedInAgentMetrics.completed !== undefined ? loggedInAgentMetrics.completed : (loggedInAgent.xpBreakdown?.completedTickets || 0);
    const assignedReq = loggedInAgentMetrics.assigned !== undefined ? loggedInAgentMetrics.assigned : (loggedInAgent.xpBreakdown?.asignados || 0);
    
    const rawAporte = loggedInAgentMetrics.aporteRes !== undefined ? loggedInAgentMetrics.aporteRes : (loggedInAgent.xpBreakdown?.aporteRes || 0);
    const aporteResFormatted = rawAporte <= 1 && rawAporte > 0 ? `${(rawAporte * 100).toFixed(0)}%` : `${rawAporte}%`;

    const SPANISH_DAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const todayName = SPANISH_DAYS[new Date().getDay()];

    // Schedule (Horario)
    let scheduleStr = 'Libre';
    try {
      const savedStates = localStorage.getItem('tm_ops_duty_states');
      if (savedStates) {
        const parsed = JSON.parse(savedStates);
        const state = parsed.find((s: any) => s.agentId === loggedInAgent.id);
        if (state?.weeklySchedule) {
          const todaySched = state.weeklySchedule[todayName];
          if (todaySched && todaySched.isActive) {
            scheduleStr = `${todaySched.start} - ${todaySched.end}${todaySched.isRemote ? ' (Remoto)' : ''}`;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    if (scheduleStr === 'Libre' && loggedInAgent.id) {
      scheduleStr = '08:00 - 17:00';
    }

    // Attendance registry status (Estado de Registro) - Real-time and fully connected with Gestion Operativa
    const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const liveTodayRow = realtimeAsistenciaRows.find(
      r => r.idAgente === loggedInAgent.id && r.fecha === todayStr
    );

    let expectedCheckIn: string | null = null;
    let expectedCheckOut: string | null = null;
    if (scheduleStr !== 'Libre') {
      const cleanSched = scheduleStr.replace(/\(Remoto\)/i, '').trim();
      const parts = cleanSched.split('-');
      if (parts.length === 2) {
        expectedCheckIn = parts[0].trim();
        expectedCheckOut = parts[1].trim();
      }
    }

    let activeAbsence = null;
    try {
      const savedAbsences = localStorage.getItem('tm_ops_absences');
      if (savedAbsences) {
        const parsedAbsences = JSON.parse(savedAbsences);
        activeAbsence = parsedAbsences.find((abs: any) => 
          todayStr >= abs.startDate && todayStr <= abs.endDate && abs.agentId === loggedInAgent.id
        );
      }
    } catch (e) {
      console.error("Error reading absences from localStorage for header:", e);
    }

    const activeVisitOnDate = programmedVisits.find(v => {
      if (v.estado_visita === 'Cerrada') return false;
      const visitDate = (v.fecha_visita || '').split(' ')[0];
      if (visitDate !== todayStr) return false;
      const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
      if (!techName) return false;
      return (loggedInAgent.name || '').toLowerCase().includes(techName) || (loggedInAgent.id || '').toLowerCase() === techName;
    });

    const hadVisitOnDate = programmedVisits.some(v => {
      const visitDate = (v.fecha_visita || '').split(' ')[0];
      if (visitDate !== todayStr) return false;
      const techName = (v.tecnico_visita || v.tecnico || '').trim().toLowerCase();
      if (!techName) return false;
      return (loggedInAgent.name || '').toLowerCase().includes(techName) || (loggedInAgent.id || '').toLowerCase() === techName;
    });

    let savedEstado = liveTodayRow?.estado || '';
    if (savedEstado === 'Visita' && (!activeVisitOnDate || activeVisitOnDate.estado_visita === 'Cerrada')) {
      savedEstado = '';
    }
    if (activeVisitOnDate && activeVisitOnDate.estado_visita !== 'Cerrada' && (!savedEstado || savedEstado === 'Home Office')) {
      savedEstado = 'Visita';
    }

    let displayEstado = 'Sin registro';
    if (activeAbsence) {
      displayEstado = activeAbsence.type === 'Vacaciones' ? 'Vacaciones' : 'Permiso';
    } else if (savedEstado && savedEstado !== 'Visita') {
      displayEstado = savedEstado;
    } else if (liveTodayRow?.checkIn) {
      if (hadVisitOnDate || liveTodayRow?.estado === 'Visita' || liveTodayRow?.esJustificacion) {
        displayEstado = 'Presente';
      } else if (expectedCheckIn) {
        const [cHour, cMin] = liveTodayRow.checkIn.split(':').map(Number);
        const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
        const diff = (cHour * 60 + cMin) - (eHour * 60 + eMin);
        
        if (diff > 15) {
          displayEstado = 'Tardanza';
        } else if (diff > 0) {
          displayEstado = 'Gracia';
        } else {
          displayEstado = 'Presente';
        }
      } else {
        displayEstado = 'Presente';
      }
    } else {
      if (expectedCheckIn) {
        const today = new Date();
        const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
        const nowMin = today.getHours() * 60 + today.getMinutes();
        const startMin = eHour * 60 + eMin;
        if (nowMin > startMin + 15) {
          displayEstado = 'Inasistencia';
        } else {
          displayEstado = 'Sin registro';
        }
      } else {
        displayEstado = 'Libre';
      }
    }

    let regStatus = displayEstado;

    // Badge styling for registration status
    let statusBg = '';
    const cleanRegStatus = regStatus.toUpperCase();
    if (cleanRegStatus === 'REMOTO' || cleanRegStatus === 'HOME OFFICE') {
      statusBg = 'bg-cyan-50/80 text-cyan-700 border-cyan-200 shadow-sm shadow-cyan-500/5';
    } else if (['PRESENTE', 'TEMPRANO', 'A TIEMPO', 'COMPLETO', 'REGISTRADO'].includes(cleanRegStatus)) {
      statusBg = 'bg-emerald-50/80 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-500/5';
    } else if (['TARDANZA', 'EN FALTA', 'ATRASADO'].includes(cleanRegStatus)) {
      statusBg = 'bg-amber-50/80 text-amber-700 border-amber-200 shadow-sm shadow-amber-500/5';
    } else if (['FALTA', 'AUSENTE', 'FALTÓ', 'INASISTENCIA'].includes(cleanRegStatus)) {
      statusBg = 'bg-rose-50/80 text-rose-700 border-rose-200 shadow-sm shadow-rose-500/5';
    } else if (cleanRegStatus === 'VISITA' || cleanRegStatus === 'VISITA TÉCNICA') {
      statusBg = 'bg-indigo-50/80 text-indigo-700 border-indigo-200 shadow-sm shadow-indigo-500/5';
    } else if (cleanRegStatus === 'VACACIONES') {
      statusBg = 'bg-violet-50/80 text-violet-700 border-violet-200 shadow-sm shadow-violet-500/5';
    } else if (cleanRegStatus === 'PERMISO') {
      statusBg = 'bg-blue-50/80 text-blue-700 border-blue-200 shadow-sm shadow-blue-500/5';
    } else {
      statusBg = 'bg-slate-50/80 text-slate-600 border-slate-200 shadow-sm shadow-slate-500/5';
    }

    let roleDisplay = loggedInAgent.role || 'Técnico';
    if (roleDisplay.toLowerCase().trim().endsWith(' de')) {
      roleDisplay = roleDisplay.trim().slice(0, -3);
    }
    if (roleDisplay.toLowerCase().trim() === 'coordinador de') {
      roleDisplay = 'Coordinador';
    }

    const todayNameUpper = todayName.toUpperCase();

    return (
      <div className="hidden md:flex flex-wrap items-center gap-3 select-none" id="header-user-realtime-deck">
        
        {/* Real-time stats capsule */}
        <div className="h-10 flex items-center bg-white border border-slate-200/80 shadow-sm rounded-xl px-4 gap-4 hover:border-slate-300 transition-all duration-200">
          
          {/* XP Total */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-violet-500 font-bold leading-none">stars</span>
            <div className="flex items-baseline">
              <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider mr-1">XP:</span>
              <span className="font-display font-black text-[12.5px] text-slate-800 leading-none">{totalXp.toLocaleString()}</span>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-200/80" />

          {/* XP Sprint */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-emerald-500 font-bold leading-none">bolt</span>
            <div className="flex items-baseline">
              <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider mr-1">SPRINT:</span>
              <span className="font-display font-black text-[12.5px] text-emerald-650 leading-none">+{sprintXp.toLocaleString()}</span>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-200/80" />

          {/* Requests */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-slate-400 font-bold leading-none">fact_check</span>
            <div className="flex items-baseline">
              <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider mr-1">REQ:</span>
              <span className="font-display font-black text-[12.5px] text-slate-800 leading-none">
                {completedReq}<span className="text-slate-350 font-medium mx-0.5">/</span>{assignedReq}
              </span>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-200/80" />

          {/* Aporte Resolucion */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-blue-500 font-bold leading-none">pie_chart</span>
            <div className="flex items-baseline">
              <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider mr-1">APORTE:</span>
              <span className="font-display font-black text-[12.5px] text-blue-600 leading-none">{aporteResFormatted}</span>
            </div>
          </div>

        </div>

        {/* Duty Hub capsule */}
        <div className="h-10 flex items-center bg-white border border-slate-200/80 shadow-sm rounded-xl px-3.5 gap-3 hover:border-slate-300 transition-all duration-200">
          
          {/* Horario */}
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[17px] text-amber-500 font-bold leading-none">schedule</span>
            <div className="flex items-baseline">
              <span className="text-[10px] font-mono text-slate-400 font-bold tracking-wider mr-1">{todayNameUpper}:</span>
              <span className="font-mono font-bold text-[11px] text-slate-700 leading-none">{scheduleStr}</span>
            </div>
          </div>

          <div className="w-px h-4 bg-slate-200/80" />

          {/* Registro Status */}
          <div className="flex items-center shrink-0">
            <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border leading-none ${statusBg}`}>
              {regStatus}
            </span>
          </div>

        </div>

      </div>
    );
  }, [loggedInAgent, loggedInAgentMetrics]);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'roster' | 'request_backlog' | 'admin_backlog' | 'workspace' | 'daily_admin_use' | 'evaluation' | 'leaderboard' | 'admin_leaderboard' | 'profiles' | 'certifications' | 'config' | 'operations' | 'operations_admin' | 'kpi_guide' | 'action_plan' | 'contractors'>(() => {
    return 'action_plan';
  });
  const [evalSubTab, setEvalSubTab] = useState<'dashboard' | 'directory' | 'evaluations'>('dashboard');
  const [requestBacklogSubTab, setRequestBacklogSubTab] = useState<string>('general');
  const [targetTaskIdToOpen, setTargetTaskIdToOpen] = useState<string | null>(null);

  // Escuchar evento de navegación a tareas en Request Backlog
  useEffect(() => {
    const handleNavigateToTask = (e: CustomEvent) => {
      const { taskId } = e.detail || {};
      if (taskId) {
        setActiveTab('request_backlog');
        setRequestBacklogSubTab('reports');
        setTargetTaskIdToOpen(taskId);
      }
    };
    window.addEventListener('navigate_to_task', handleNavigateToTask as EventListener);
    return () => {
      window.removeEventListener('navigate_to_task', handleNavigateToTask as EventListener);
    };
  }, []);

  // Configuración de secciones Coming Soon (gestionado desde el panel de control)
  const [comingSoonConfig, setComingSoonConfig] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('tm_coming_soon_config');
      const defaultVal = {
        request_backlog_status_cycle: true,
        request_backlog_reports: true,
        operations_externo: true
      };
      return saved ? { ...defaultVal, ...JSON.parse(saved) } : defaultVal;
    } catch {
      return {
        request_backlog_status_cycle: true,
        request_backlog_reports: true,
        operations_externo: true
      };
    }
  });

  useEffect(() => {
    const unsubscribe = subscribeToComingSoonConfig((config) => {
      setComingSoonConfig(config);
      safeLocalStorageSet('tm_coming_soon_config', JSON.stringify(config));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'contractors' || activeTab === 'workspace') {
      try {
        const saved = localStorage.getItem('tm_crm_data');
        if (saved) {
          setCrmData(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Error updating crmData from localStorage in App.tsx:", e);
      }
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentUser?.role?.toLowerCase() === 'user') {
      const allowedTabs = ['action_plan', 'request_backlog', 'workspace', 'leaderboard', 'profiles', 'operations', 'kpi_guide', 'certifications', 'contractors'];
      if (!allowedTabs.includes(activeTab)) {
        setActiveTab('action_plan');
      }
    }
  }, [currentUser, activeTab]);
  
  // Selected agent for prepopulating evaluation tab
  const [selectedAgentIdForEval, setSelectedAgentIdForEval] = useState<string>('');

  // Mobile drawer sidebar state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Toast Promotion banners
  const [promotionToast, setPromotionToast] = useState<{ agentName: string; oldTier: string; newTier: string } | null>(null);

  // 1. Selector trigger from Roster -> Eval Tab
  const handleSelectAgentForEval = (agentId: string) => {
    setSelectedAgentIdForEval(agentId);
    setActiveTab('evaluation');
  };

  // 2. Register Daily Scrum Log to an Agent
  const handleUpdateScrumTask = (agentId: string, task: ScrumTask) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        // Unshift task to logs (newest first)
        return {
          ...agent,
          scrumLogs: [task, ...agent.scrumLogs.slice(0, 19)] // keep last 20 logs
        };
      }
      return agent;
    }));
  };

  // 3. Submit Evaluation, increment XP, evaluate Tier promotion
  const handleSubmitEvaluation = (
    agentId: string, 
    scores: DimensionScores, 
    log: { suceso: string; accion: string; conclusion: string }, 
    xpYield: number,
    evaluationsCount?: number,
    mimoObj?: { mantener: string; iniciar: string; mejorar: string; omitir: string },
    subScoresObj?: Record<string, Record<string, number>>,
    criterionFeedbacksObj?: Record<string, string>,
    auditedCasesList?: Array<{ id: string; title?: string; source?: string }>,
    flowTypeVal?: 'flow' | 'specific',
    criticalData?: {
      criticalFaultsApplied?: string[];
      criticalFaultsNotes?: string;
      isCriticalFail?: boolean;
      criticalPenaltyPct?: number;
      finalScoreOverride?: number;
    }
  ) => {
    setAgents(prevAgents => prevAgents.map(agent => {
      if (agent.id === agentId) {
        const newXp = Math.max(0, agent.currentXp + xpYield);
        const newEvalsCount = evaluationsCount ?? ((agent.evaluationsCount || 0) + 1);
        
        // Find current tier
        const currentTierIndex = tiers.findIndex(t => t.id === agent.tierId);
        const currentTier = tiers[currentTierIndex] || tiers[0];
        
        let targetTierId = agent.tierId;
        let promoted = false;

        // Check if new XP crosses the max threshhold of current Tier, triggering ascension!
        if (newXp >= currentTier.maxXp && currentTierIndex + 1 < tiers.length) {
          const nextTier = tiers[currentTierIndex + 1];
          targetTierId = nextTier.id;
          promoted = true;
          
          setPromotionToast({
            agentName: agent.name,
            oldTier: currentTier.name,
            newTier: nextTier.name
          });
          setTimeout(() => setPromotionToast(null), 5000);
        }

        const nowIso = new Date().toISOString();
        const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

        const parsedMimo = mimoObj || {
          mantener: log.suceso.replace(/^\[MANTENER\]:\s*/, '').split('| [INICIAR]:')[0]?.trim() || log.suceso,
          iniciar: log.suceso.includes('[INICIAR]:') ? log.suceso.split('[INICIAR]:')[1]?.trim() || '' : '',
          mejorar: log.accion.replace(/^\[MEJORAR\]:\s*/, '').trim() || log.accion,
          omitir: log.conclusion.replace(/^\[OMITIR\]:\s*/, '').trim() || log.conclusion
        };

        const newEvaluationRecord: AgentEvaluation = {
          id: `EVAL-${agent.id}-${newEvalsCount}`,
          agentId: agent.id,
          evalNumber: newEvalsCount,
          date: dateStr,
          timestamp: nowIso,
          scores,
          subScores: subScoresObj,
          criterionFeedbacks: criterionFeedbacksObj,
          auditedCases: auditedCasesList,
          flowType: flowTypeVal || 'flow',
          mimo: parsedMimo,
          xpYield,
          evaluator: 'Admin / Calibrador Senior',
          title: `Evaluación Formal #${newEvalsCount}`,
          criticalFaultsApplied: criticalData?.criticalFaultsApplied || [],
          criticalFaultsNotes: criticalData?.criticalFaultsNotes || '',
          isCriticalFail: criticalData?.isCriticalFail || false,
          criticalPenaltyPct: criticalData?.criticalPenaltyPct || 0,
          finalScoreOverride: criticalData?.finalScoreOverride
        };

        // Create formal XpEvent
        const newEvent: XpEvent = {
          id: `ev_${Date.now()}`,
          agentId: agent.id,
          title: `Evaluación Formal #${newEvalsCount}${criticalData?.isCriticalFail ? ' (PENALIZACIÓN CRÍTICA)' : ''}`,
          description: criticalData?.isCriticalFail 
            ? `⚠️ INFRACCIÓN CRÍTICA DEL NEGOCIO: ${criticalData.criticalFaultsApplied?.join(', ')}. Deducción: -${criticalData.criticalPenaltyPct}%. Puntaje final: ${criticalData.finalScoreOverride}%.`
            : `Valoraciones: Ejecución (${scores.execution}%), Servicio (${scores.relational}%), Softs (${scores.collaborative}%). MIMO: [M]: ${parsedMimo.mantener.substring(0, 45)}...`,
          xpYield,
          date: dateStr,
          type: 'eval',
          evalData: newEvaluationRecord
        };

        const updatedHistory = [newEvaluationRecord, ...(agent.evaluationsHistory || [])];

        const updatedAgent: Agent = {
          ...agent,
          currentXp: newXp,
          tierId: targetTierId,
          evaluationsCount: newEvalsCount,
          dimensionScores: scores,
          xpEvents: [newEvent, ...agent.xpEvents],
          evaluationsHistory: updatedHistory
        };

        // Save evaluation directly to Firebase evaluations collection and update agent
        saveEvaluations([newEvaluationRecord]).catch(err => console.error('Cloud save eval:', err));
        saveSingleAgent(updatedAgent).catch(err => console.error('Cloud save agent:', err));

        return updatedAgent;
      }
      return agent;
    }));
  };

  // 4. Add new Certification to Backlog
  const handleAddCertification = (newCert: Certification) => {
    setCertifications(prev => [newCert, ...prev]);
  };

  const handleUpdateCertification = (updatedCert: Certification) => {
    setCertifications(prev => prev.map(cert => cert.id === updatedCert.id ? updatedCert : cert));
  };

  const handleDeleteCertification = (certId: string) => {
    // 1. Set cert status to 'archived'
    setCertifications(prev => prev.map(cert => 
      cert.id === certId ? { ...cert, status: 'archived' } : cert
    ));
    
    // 2. Remove this certification and its evaluations from all agents
    setAgents(prevAgents => prevAgents.map(agent => {
      let updated = false;
      let newCertifications = agent.certifications ? [...agent.certifications] : [];
      let newCertProgress = agent.certProgress ? { ...agent.certProgress } : {};
      
      if (newCertifications.includes(certId)) {
        newCertifications = newCertifications.filter(id => id !== certId);
        updated = true;
      }
      
      if (newCertProgress[certId]) {
        delete newCertProgress[certId];
        updated = true;
      }
      
      if (updated) {
        return {
          ...agent,
          certifications: newCertifications,
          certProgress: newCertProgress
        };
      }
      return agent;
    }));
  };

  // 5. Update direct target tier coupling under course syllabus

  const handleEnrollAgent = (agentId: string, id: string, type: 'certification' | 'achievement') => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        if (type === 'certification') {
          const currentCerts = agent.certifications || [];
          if (!currentCerts.includes(id)) {
            const newCertProgress = { ...(agent.certProgress || {}) };
            if (!newCertProgress[id]) {
              newCertProgress[id] = {
                certId: id,
                completed: false,
                testPassed: false,
                appliedInWork: false,
                expositionScheduled: false,
                expositionStatus: 'pending'
              };
            }
            return { ...agent, certifications: [...currentCerts, id], certProgress: newCertProgress };
          }
        } else if (type === 'achievement') {
          const currentAchs = agent.achievements || [];
          if (!currentAchs.includes(id)) {
            return { ...agent, achievements: [...currentAchs, id] };
          }
        }
      }
      return agent;
    }));
  };

  const handleUnenrollAgent = (agentId: string, id: string, type: 'certification' | 'achievement') => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        if (type === 'certification') {
          const currentCerts = agent.certifications || [];
          return { ...agent, certifications: currentCerts.filter(cId => cId !== id) };
        } else if (type === 'achievement') {
          const currentAchs = agent.achievements || [];
          return { ...agent, achievements: currentAchs.filter(aId => aId !== id) };
        }
      }
      return agent;
    }));
  };

  const handleUpdateCertificationTier = (certId: string, tierId: string) => {

    setCertifications(prev => prev.map(cert => {
      if (cert.id === certId) {
        return { ...cert, targetTiers: [tierId] };
      }
      return cert;
    }));
  };

  // 5.5. Achievements (Logros) CRUD
  const handleAddAchievement = (newAch: Achievement) => {
    setCatalogAchievements(prev => [newAch, ...prev]);
  };

  const handleUpdateAchievement = (updatedAch: Achievement) => {
    setCatalogAchievements(prev => prev.map(ach => ach.id === updatedAch.id ? updatedAch : ach));
  };

  const handleDeleteAchievement = (achId: string) => {
    setCatalogAchievements(prev => prev.filter(ach => ach.id !== achId));
    // Clean up agents that held this achievement
    setAgents(prev => prev.map(agent => ({
      ...agent,
      achievements: agent.achievements ? agent.achievements.filter(id => id !== achId) : []
    })));
  };

  // 6. Award collectible badge manually
  const handleAwardAchievement = (agentId: string, achievementId: string) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        if (agent.achievements.includes(achievementId)) return agent; // satisfy duplicates
        return {
          ...agent,
          achievements: [...agent.achievements, achievementId]
        };
      }
      return agent;
    }));
  };

  // 7. Revoke collectible badge manually
  const handleRevokeAchievement = (agentId: string, achievementId: string) => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        return {
          ...agent,
          achievements: agent.achievements.filter(id => id !== achievementId)
        };
      }
      return agent;
    }));
  };

  // 8. Update Hierarchies from Config panel
  const handleUpdateTiers = (newTiers: TierConfig[]) => {
    setTiers(newTiers);
  };

  // 9. Agent Custom CRUD Operations for High-Fidelity Management
  const handleAddAgent = (newAgent: Agent) => {
    setAgents(prev => [...prev, newAgent]);
    setNotifications(prev => [
      {
        id: Date.now(),
        text: `Nuevo técnico registrado: ${newAgent.name} (${newAgent.role})`,
        type: 'promo',
        time: 'Ahora',
        isRead: false
      },
      ...prev
    ]);
  };

  const handleUpdateAgent = async (updatedAgent: Agent) => {
    setAgents(prev => prev.map(a => a.id === updatedAgent.id ? updatedAgent : a));
    try {
      await saveSingleAgent(updatedAgent);
    } catch (err) {
      console.error("Error al guardar el agente actualizado en Firestore:", err);
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    const agentName = agents.find(a => a.id === agentId)?.name || agentId;
    setAgents(prev => prev.filter(a => a.id !== agentId));
    setNotifications(prev => [
      {
        id: Date.now(),
        text: `Técnico desvinculado del roster: ${agentName}`,
        type: 'blocker',
        time: 'Ahora',
        isRead: false
      },
      ...prev
    ]);
  };

  // 10. Database administrative handlers
  const handleResetTiersToDefault = () => {
    if (window.confirm('¿Está seguro de que desea restablecer únicamente el escalafón jerárquico de Tiers a los valores por defecto de fábrica (L1, L1.5, L2, L3, S1, S2, A1)? No afectará su roster de técnicos.')) {
      setTiers(INITIAL_TIERS);
      safeLocalStorageSet('tm_tiers', JSON.stringify(INITIAL_TIERS));
      setNotifications(prev => [
        {
          id: Date.now(),
          text: 'Escalafón jerárquico restablecido a valores iniciales (L1 a A1)',
          type: 'bonus',
          time: 'Ahora',
          isRead: false
        },
        ...prev
      ]);
    }
  };

  const handleResetDatabase = () => {
    if (window.confirm('¿Está seguro de que desea restablecer toda la base de datos a los valores predeterminados de fábrica? Se perderán todos los datos personalizados.')) {
      localStorage.removeItem('tm_agents');
      localStorage.removeItem('tm_tiers');
      localStorage.removeItem('tm_certifications');
      localStorage.removeItem('tm_achievements');
      localStorage.removeItem('tm_notifications');
      
      setAgents(INITIAL_AGENTS);
      setTiers(INITIAL_TIERS);
      setCertifications(INITIAL_CERTIFICATIONS);
      setCatalogAchievements(INITIAL_ACHIEVEMENTS);
      setNotifications([
        { id: Date.now(), text: 'Base de datos restablecida a valores iniciales por el administrador', type: 'blocker', time: 'Ahora', isRead: false }
      ]);
    }
  };

  const handleImportDatabase = (importedAgents: any[], importedTiers: any[], importedCertifications: any[]) => {
    setAgents(importedAgents);
    setTiers(importedTiers);
    setCertifications(importedCertifications);
    setNotifications(prev => [
      {
        id: Date.now(),
        text: 'Copia de seguridad de la base de datos restaurada con éxito',
        type: 'cert',
        time: 'Ahora',
        isRead: false
      },
      ...prev
    ]);
  };

  const handleUpdateComingSoonConfig = async (newConfig: Record<string, boolean>) => {
    setComingSoonConfig(newConfig);
    safeLocalStorageSet('tm_coming_soon_config', JSON.stringify(newConfig));
    try {
      await saveComingSoonConfig(newConfig);
    } catch (err) {
      console.error('Error al guardar configuración de Coming Soon en la nube:', err);
    }
  };

  // Live counters for statistics overview header bar
  const totalAgents = useMemo(() => agents.length, [agents]);
  const scrumActiveToday = useMemo(() => agents.filter(a => a.scrumLogs && a.scrumLogs.length > 0).length, [agents]);
  const avgLevelXP = useMemo(() => {
    if (totalAgents === 0) return 0;
    return Math.round(agents.reduce((acc, a) => acc + a.currentXp, 0) / totalAgents);
  }, [agents, totalAgents]);
  const totalAchievementsAwarded = useMemo(() => agents.reduce((acc, a) => acc + a.achievements.length, 0), [agents]);

  if (!currentUser) {
    return (
      <Login 
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          safeLocalStorageSet('fhons_current_user', JSON.stringify(user));
        }} 
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-[#080c14] text-slate-100 overflow-hidden relative" id="tier-master-viewport">
      <FirebaseQuotaAlert currentUser={currentUser} />
      {/* Modern dark gradient background lights */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none cosmic-dust-glow" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none cosmic-dust-glow" />
      
      {/* Promotion Promotion Toast / Banner popup overlay */}
      {promotionToast && (
        <div className="fixed top-6 right-6 bg-gradient-to-r from-amber-500 to-yellow-600 text-white p-5 rounded-2xl shadow-2xl border border-white/20 z-50 flex items-center gap-4 max-w-sm animate-bounce">
          <span className="material-symbols-outlined text-4xl text-white font-extrabold select-none">
            military_tech
          </span>
          <div>
            <h4 className="font-display font-black text-sm tracking-tight uppercase">¡PROMOCIÓN DE TIER ADQUIRIDA!</h4>
            <p className="font-sans text-xs mt-1">
              <strong>{promotionToast.agentName}</strong> ha subido de nivel de rango! De <strong>{promotionToast.oldTier}</strong> a la madurez experta del <strong>{promotionToast.newTier}</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Sidebar - responsive collapsible on smaller screens */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-[#0c101d] border-r border-[#1e293b]/70 text-slate-200 w-64 z-30 md:z-10 transform ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } transition-transform duration-300 md:static md:translate-x-0 flex flex-col`}
        style={mobileMenuOpen ? { display: 'flex' } : {}}
        id="side-navigator"
      >
        {/* Brand Banner Header */}
        <div className="p-6 border-b border-[#1e293b]/70 flex items-center justify-between bg-[#070a12]/50">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 text-3xl font-extrabold select-none">
              trophy
            </span>
            <div>
              <h1 className="font-display font-extrabold text-base tracking-wide text-white uppercase bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">Tier Master</h1>
              <p className="font-mono text-[9px] text-[#818cf8] tracking-widest font-semibold uppercase">FHONS METRICS</p>
            </div>
          </div>
          
          {/* Close button for mobile drawer mode */}
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-slate-400 hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Dynamic navigation button items */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto no-scrollbar" id="nav-scroller">
          
          <p className="font-mono text-[9px] text-[#818cf8] font-black uppercase px-3 tracking-wider mb-2">ESTRATEGIA KAIZEN</p>
          
          <button
            onClick={() => { setActiveTab('action_plan'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'action_plan' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-action-plan"
          >
            <span className="material-symbols-outlined text-lg">route</span>
            Plan de Acción
          </button>

          {currentUser?.role?.toLowerCase() !== 'user' && (
            <>
              <p className="font-mono text-[9px] text-[#4f5e7c] font-black uppercase px-3 tracking-wider mt-5 mb-2.5">OPERATIVO DIARIO</p>

              <button
                onClick={() => { setActiveTab('roster'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
                  activeTab === 'roster' 
                    ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                    : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
                }`}
                id="nav-tab-roster"
              >
                <span className="material-symbols-outlined text-lg">group</span>
                Roster del Equipo
              </button>

              <button
                onClick={() => { setSelectedAgentIdForEval(''); setEvalSubTab('dashboard'); setActiveTab('evaluation'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
                  activeTab === 'evaluation' 
                    ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                    : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
                }`}
                id="nav-tab-evaluation"
              >
                <span className="material-symbols-outlined text-lg">speed</span>
                Panel de Evaluación
              </button>
            </>
          )}

          <p className="font-mono text-[9px] text-[#4f5e7c] font-black uppercase px-3 tracking-wider mt-6 mb-2.5">MONITOREO & LOGROS</p>

          <button
            onClick={() => { setActiveTab('request_backlog'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'request_backlog' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-request-backlog"
          >
            <span className="material-symbols-outlined text-lg">inventory_2</span>
            Request Backlog
          </button>

          {currentUser?.role?.toLowerCase() !== 'user' && (
            <div className="pl-4.5 mt-1.5 mb-2.5 border-l-2 border-indigo-500/20 ml-5.5 space-y-1">
              <button
                onClick={() => { setActiveTab('admin_backlog'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-sans text-[11px] font-bold cursor-pointer transition-all duration-200 border ${
                  activeTab === 'admin_backlog' 
                    ? 'bg-indigo-600/20 text-white border-indigo-500/35 shadow-sm shadow-indigo-500/10' 
                    : 'text-slate-500 hover:bg-[#1e293b]/30 hover:text-slate-350 border-transparent'
                }`}
                id="nav-tab-admin-backlog"
              >
                <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                Admin Backlog
              </button>
            </div>
          )}

          <button
            onClick={() => { setActiveTab('contractors'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'contractors' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-contractors"
          >
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-lg">handshake</span>
              <div className="flex flex-col items-start leading-none">
                <span>Contratistas</span>
                <span className={`text-[8px] font-extrabold uppercase tracking-widest mt-0.5 ${activeTab === 'contractors' ? 'text-indigo-200' : 'text-emerald-400'}`}>Gestión</span>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setActiveTab('workspace'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'workspace' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-workspace"
          >
            <span className="material-symbols-outlined text-lg">developer_board</span>
            Daily Workspace
          </button>

          {currentUser?.role?.toLowerCase() !== 'user' && (
            <div className="pl-4.5 mt-1.5 mb-2.5 border-l-2 border-indigo-500/20 ml-5.5 space-y-1">
              <button
                onClick={() => { setActiveTab('daily_admin_use'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-sans text-[11px] font-bold cursor-pointer transition-all duration-200 border ${
                  activeTab === 'daily_admin_use' 
                    ? 'bg-indigo-600/20 text-white border-indigo-500/35 shadow-sm shadow-indigo-500/10' 
                    : 'text-slate-500 hover:bg-[#1e293b]/30 hover:text-slate-350 border-transparent'
                }`}
                id="nav-tab-daily-admin-use"
              >
                <span className="material-symbols-outlined text-base">admin_panel_settings</span>
                Daily Admin Use
              </button>
            </div>
          )}

          <button
            onClick={() => { setActiveTab('operations'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'operations' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-operations"
          >
            <span className="material-symbols-outlined text-lg">calendar_month</span>
            Gestión Operativa
          </button>

          {currentUser?.role?.toLowerCase() !== 'user' && (
            <div className="pl-4.5 mt-1.5 mb-2.5 border-l-2 border-indigo-500/20 ml-5.5 space-y-1">
              <button
                onClick={() => { setActiveTab('operations_admin'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-sans text-[11px] font-bold cursor-pointer transition-all duration-200 border ${
                  activeTab === 'operations_admin' 
                    ? 'bg-indigo-600/20 text-white border-indigo-500/35 shadow-sm shadow-indigo-500/10' 
                    : 'text-slate-500 hover:bg-[#1e293b]/30 hover:text-slate-350 border-transparent'
                }`}
                id="nav-tab-operations-admin"
              >
                <span className="material-symbols-outlined text-base">settings_accessibility</span>
                Administración Operativa
              </button>
            </div>
          )}

          <button
            onClick={() => { setActiveTab('leaderboard'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'leaderboard' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-leaderboard"
          >
            <span className="material-symbols-outlined text-lg">leaderboard</span>
            LeaderBoard
          </button>

          {currentUser?.role?.toLowerCase() !== 'user' && (
            <div className="pl-4.5 mt-1.5 mb-2.5 border-l-2 border-indigo-500/20 ml-5.5 space-y-1">
              <button
                onClick={() => { setActiveTab('admin_leaderboard'); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-sans text-[11px] font-bold cursor-pointer transition-all duration-200 border ${
                  activeTab === 'admin_leaderboard' 
                    ? 'bg-indigo-600/20 text-white border-indigo-500/35 shadow-sm shadow-indigo-500/10' 
                    : 'text-slate-500 hover:bg-[#1e293b]/30 hover:text-slate-350 border-transparent'
                }`}
                id="nav-tab-admin-leaderboard"
              >
                <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                <span>Admin Leaderboard</span>
              </button>
            </div>
          )}

          <button
            onClick={() => { setActiveTab('profiles'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'profiles' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-profiles"
          >
            <span className="material-symbols-outlined text-lg">account_circle</span>
            {currentUser?.role?.toLowerCase() === 'user' ? 'Mi Perfil' : 'Ver Perfiles Individuales'}
          </button>

          <p className="font-mono text-[9px] text-[#4f5e7c] font-black uppercase px-3 tracking-wider mt-6 mb-2.5">BIBLIOTECAS & METODOLOGÍA</p>

          <button
            onClick={() => { setActiveTab('kpi_guide'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'kpi_guide' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-kpi-guide"
          >
            <span className="material-symbols-outlined text-lg">menu_book</span>
            Guía de KPIs
          </button>

          <button
            onClick={() => { setActiveTab('certifications'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
              activeTab === 'certifications' 
                ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
            }`}
            id="nav-tab-certifications"
          >
            <span className="material-symbols-outlined text-lg">school</span>
            Librería Backlog
          </button>

          {currentUser?.role?.toLowerCase() !== 'user' && (
            <button
              onClick={() => { setActiveTab('config'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-sans text-xs font-semibold cursor-pointer transition-all duration-200 border ${
                activeTab === 'config' 
                  ? 'bg-gradient-to-r from-violet-600/90 to-indigo-600/90 text-white shadow-lg shadow-indigo-500/20 border-indigo-400/20' 
                  : 'text-slate-400 hover:bg-[#1e293b]/50 hover:text-slate-200 border-transparent'
              }`}
              id="nav-tab-config"
            >
              <span className="material-symbols-outlined text-lg font-bold">tune</span>
              Configurar Jerarquía Tiers
            </button>
          )}

        </nav>

        {/* Sidebar Footer credential */}
        <div className="p-4 border-t border-[#1e293b]/50 bg-[#070a13] text-center text-[10px] font-mono text-slate-500">
          FHONS Corp &bull; v2.2.1
        </div>

      </aside>

      {/* Main Workspace Frame */}
      <div className="flex-1 flex flex-col min-w-0 bg-transparent z-10 md:z-20" id="workspace-viewport">
        
        {/* Main top header with Stats counters and Premium Director Accessories */}
        <header className="bg-slate-50 border-b border-slate-200 py-3.5 px-6 flex flex-col md:flex-row justify-between items-center gap-3 shrink-0 relative" id="header-bar">
          
          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <div className="flex items-center gap-3">
              {/* Mobile Sidebar toggler burger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 rounded-lg hover:bg-slate-200 text-slate-750 cursor-pointer"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>
              
              <div>
                <span className="font-mono text-[9px] text-blue-800 font-bold tracking-widest uppercase">Gala de Desempeño</span>
                <h2 className="font-display font-extrabold text-base text-slate-900 tracking-tight">Suite de Control Técnico</h2>
              </div>
            </div>

            {/* Micro counters in mobile header */}
            <div className="md:hidden flex items-center gap-2">
              <span className="text-[11.5px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-black">
                {scrumActiveToday}/{totalAgents} Scrum
              </span>
            </div>
          </div>

          {/* Core Deck - Quick Metrics, Notifications Desk & Director Profile */}
          <div className="flex flex-wrap items-center justify-between md:justify-end gap-3 w-full md:w-auto" id="header-tools-deck">
            
            {/* Realtime Agent Status and KPI summarizes */}
            {headerAgentSection}

            {/* Notifications Trigger */}
            <div className="relative">
              <button
                onClick={() => {
                  setNotificationsOpen(!notificationsOpen);
                  setProfileDropdownOpen(false);
                }}
                className="h-10 w-10 rounded-xl bg-white hover:bg-slate-50 text-slate-600 border border-slate-200/80 shadow-sm transition-all duration-200 cursor-pointer flex items-center justify-center relative hover:border-slate-300"
                title="Historial de Notificaciones de Tier"
              >
                <span className="material-symbols-outlined text-[20px] leading-none">notifications</span>
                {notifications.some(n => !n.isRead) && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center font-black shadow-sm ring-2 ring-white">
                    {notifications.filter(n => !n.isRead).length}
                  </span>
                )}
              </button>

              {/* Advanced Notification Dropdown list */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 animate-fadeIn">
                  <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 mb-2">
                    <span className="font-display font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-blue-800">campaign</span>
                      Bitácora de Sucesos
                    </span>
                    <button 
                      onClick={() => {
                        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                      }}
                      className="text-[10px] text-blue-700 hover:underline font-bold"
                    >
                      Marcar leídos
                    </button>
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto no-scrollbar">
                    {notifications.map(n => (
                      <div 
                        key={n.id} 
                        className={`p-2.5 rounded-xl border transition-all text-xs ${
                          n.isRead ? 'bg-slate-50 border-slate-100 text-slate-500' : 'bg-blue-50/75 border-blue-100 text-slate-800 font-medium'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-1">
                          <p className="line-clamp-2">{n.text}</p>
                          <span className="text-[8px] text-slate-400 shrink-0">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile accessories showing Director dynamically based on Google Sheet */}
            <div className="relative">
              <button
                onClick={() => {
                  setProfileDropdownOpen(!profileDropdownOpen);
                  setNotificationsOpen(false);
                }}
                className="h-10 flex items-center gap-2.5 pl-2 pr-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 shadow-sm transition-all duration-200 text-left cursor-pointer hover:border-slate-300"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-[11px] font-display font-black shadow-sm shadow-indigo-500/10 border border-indigo-400/20">
                  {getInitials(currentUser.name)}
                </div>
                <div className="hidden xs:block max-w-[130px]">
                  <p className="font-display font-black text-[11.5px] text-slate-800 leading-none truncate">{currentUser.name}</p>
                  <p className="font-mono text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 truncate leading-none">
                    {currentUser.username === 'admin' ? 'Administrador' : 'Director Técnico'}
                  </p>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-sm">keyboard_arrow_down</span>
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2.5 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4">
                  <div className="pb-3 border-b border-slate-100 mb-2.5">
                    <p className="font-mono text-[9px] text-slate-400 font-bold uppercase">Sesión de Mando</p>
                    <p className="font-display font-black text-xs text-slate-800 truncate mt-0.5" title={currentUser.name}>
                      {currentUser.name}
                    </p>
                    <p className="font-sans text-[11px] text-slate-500 truncate" title={currentUser.email}>
                      {currentUser.email}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <button 
                      onClick={() => { setActiveTab('config'); setProfileDropdownOpen(false); }}
                      className="w-full text-left px-2.5 py-2 hover:bg-slate-100 rounded-lg text-xs text-slate-700 flex items-center gap-2 cursor-pointer font-medium"
                    >
                      <span className="material-symbols-outlined text-sm text-slate-500">settings</span>
                      Parámetros de Tiers
                    </button>
                    <div className="h-px bg-slate-100 my-1" />
                    <button 
                      onClick={handleLogout}
                      className="w-full text-left px-2.5 py-2 hover:bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2 cursor-pointer font-bold transition-all"
                    >
                      <span className="material-symbols-outlined text-sm text-red-500">logout</span>
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* Dynamic Inner Tab container */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">

          <Suspense fallback={<div className="flex items-center justify-center p-12 text-slate-500 font-medium"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>Cargando módulo...</div>}>
            {activeTab !== 'config' && comingSoonConfig[activeTab] ? (
              <div className="bg-[#111827]/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 md:p-16 text-center shadow-2xl max-w-2xl mx-auto space-y-6 animate-fadeIn" id="global-section-coming-soon">
                <div className="inline-flex p-5 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 shadow-lg animate-pulse">
                  <span className="material-symbols-outlined text-3xl font-bold">hourglass_empty</span>
                </div>
                
                <div className="space-y-3">
                  <span className="px-3 py-1 text-[9px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 rounded-full border border-indigo-500/30">
                    Próximamente / Coming Soon
                  </span>
                  <h3 className="font-display font-black text-2xl md:text-3xl text-white tracking-tight pt-1">
                    {activeTab === 'action_plan' && 'Plan de Acción'}
                    {activeTab === 'roster' && 'Roster del Equipo'}
                    {activeTab === 'evaluation' && 'Panel de Evaluación'}
                    {activeTab === 'request_backlog' && 'Request Backlog'}
                    {activeTab === 'admin_backlog' && 'Admin Backlog'}
                    {activeTab === 'contractors' && 'Contratistas'}
                    {activeTab === 'workspace' && 'Daily Workspace'}
                    {activeTab === 'daily_admin_use' && 'Daily Admin Use'}
                    {activeTab === 'operations' && 'Gestión Operativa'}
                    {activeTab === 'operations_admin' && 'Administración Operativa'}
                    {activeTab === 'leaderboard' && 'LeaderBoard'}
                    {activeTab === 'admin_leaderboard' && 'Admin Leaderboard'}
                    {activeTab === 'profiles' && 'Perfiles / Mi Perfil'}
                    {activeTab === 'kpi_guide' && 'Guía de KPIs'}
                    {activeTab === 'certifications' && 'Librería Backlog'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
                    Esta sección se encuentra temporalmente en fase de desarrollo y optimización. Pronto estará disponible con todas las funcionalidades de control técnico y gestión avanzada FHONS Corp.
                  </p>
                </div>

                <div className="h-px bg-slate-800 max-w-md mx-auto" />

                <div className="pt-2">
                  <div className="w-full bg-slate-900 rounded-full h-1.5 max-w-xs mx-auto overflow-hidden">
                    <div className="bg-indigo-500 h-1.5 rounded-full w-2/3 animate-pulse" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono font-semibold mt-2.5 uppercase tracking-wider">
                    Sincronización Kaizen: En Desarrollo (80%)
                  </p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'action_plan' && (
                  <ActionPlanTab />
                )}
                
                {activeTab === 'roster' && (
                  <RosterTab 
                    agents={agents}
                    tiers={tiers}
                    onSelectAgentForEval={handleSelectAgentForEval}
                    onAddAgent={handleAddAgent}
                    onUpdateAgent={handleUpdateAgent}
                    onDeleteAgent={handleDeleteAgent}
                  />
                )}

                {activeTab === 'request_backlog' && (
                  <RequestBacklogTab 
                    agents={agents}
                    currentUser={currentUser}
                    tiers={tiers}
                    localStorageKey="tm_crm_data"
                    title="Backlog de Requerimientos CRM"
                    subtitle="Gestión de incidencias, solicitudes comerciales e integraciones directas con trazabilidad y asignación técnica."
                    key="request_backlog"
                    mode="request_backlog"
                    initialSubTab={requestBacklogSubTab}
                    initialTaskId={targetTaskIdToOpen}
                  
                    internalTasks={internalTasks}
                    setInternalTasks={setInternalTasks}
                    contractorTasks={contractorTasks}
                    setContractorTasks={setContractorTasks}
                    onUpdateAgent={handleUpdateAgent}
                    isolatedEvents={isolatedEvents}
                    setIsolatedEvents={setIsolatedEvents}
                    comingSoonConfig={comingSoonConfig}
                    onPushTareasToSheet={handleSaveOperativoTareas}
                  />
                )}

                {activeTab === 'admin_backlog' && (
                  <RequestBacklogTab 
                    agents={agents}
                    currentUser={currentUser}
                    tiers={tiers}
                    localStorageKey="tm_crm_data"
                    title="Admin Backlog"
                    subtitle="Gestión y control de requerimientos administrativos con trazabilidad y asignación técnica especializada."
                    key="admin_backlog"
                    mode="admin_backlog"
                  
                    internalTasks={internalTasks}
                    setInternalTasks={setInternalTasks}
                    contractorTasks={contractorTasks}
                    setContractorTasks={setContractorTasks}
                    onUpdateAgent={handleUpdateAgent}
                    isolatedEvents={isolatedEvents}
                    setIsolatedEvents={setIsolatedEvents}
                    comingSoonConfig={comingSoonConfig}
                    onPushTareasToSheet={handleSaveOperativoTareas}
                  />
                )}

                {activeTab === 'contractors' && (
                  <ContractorManagementTab 
                    agents={agents}
                    crmData={crmData}
                    currentUser={currentUser}
                    internalTasks={internalTasks}
                    setInternalTasks={setInternalTasks}
                    contractorTasks={contractorTasks}
                    setContractorTasks={setContractorTasks}
                  />
                )}

                {activeTab === 'workspace' && (
                  <DailyWorkspaceTab 
                    agents={agents}
                    currentUsername={currentUser?.username}
                    internalTasks={internalTasks}
                    contractorTasks={contractorTasks}
                    crmData={crmData}
                    key={currentUser?.username || 'anonymous'}
                    comingSoonConfig={comingSoonConfig}
                  />
                )}

                {activeTab === 'daily_admin_use' && (
                  <DailyAdminUseTab 
                    agents={agents}
                  />
                )}

                {activeTab === 'evaluation' && (
                  <EvaluationTab 
                    agents={agents}
                    initialSelectedAgentId={selectedAgentIdForEval}
                    initialSubTab={evalSubTab}
                    onSubmitEvaluation={handleSubmitEvaluation}
                    certifications={certifications}
                    onUpdateAgent={handleUpdateAgent}
                    currentWeekRange={currentWeekRange}
                  />
                )}

                {activeTab === 'leaderboard' && (
                  <LeaderboardTab 
                    agents={agents}
                    tiers={tiers}
                    currentUser={currentUser}
                    onNavigateTab={(tab, subTab) => {
                      setActiveTab(tab as any);
                      if (subTab) {
                        setRequestBacklogSubTab(subTab);
                      }
                    }}
                  />
                )}

                {activeTab === 'admin_leaderboard' && (
                  <LeaderboardAdminSettings 
                    agents={agents}
                  />
                )}

                {activeTab === 'profiles' && (
                  <ProfilesTab 
                    agents={agents}
                    tiers={tiers}
                    certifications={certifications}
                    catalogAchievements={catalogAchievements}
                    onAwardAchievement={handleAwardAchievement}
                    onRevokeAchievement={handleRevokeAchievement}
                    onEnrollAgent={handleEnrollAgent}
                    onUnenrollAgent={handleUnenrollAgent}
                    currentUser={currentUser}
                    onTabChange={setActiveTab}
                    comingSoonConfig={comingSoonConfig}
                    internalTasks={internalTasks}
                    contractorTasks={contractorTasks}
                  />
                )}

                {activeTab === 'kpi_guide' && (
                  <KpiGuideTab />
                )}

                {activeTab === 'certifications' && (
                  <CertificationsTab 
                    certifications={certifications}
                    currentUser={currentUser || undefined}
                    agents={agents}
                    tiers={tiers}
                    onAddCertification={handleAddCertification}
                    onUpdateCertification={handleUpdateCertification}
                    onDeleteCertification={handleDeleteCertification}
                    onUpdateCertificationTier={handleUpdateCertificationTier}
                    achievements={catalogAchievements}
                    onAddAchievement={handleAddAchievement}
                    onUpdateAchievement={handleUpdateAchievement}
                    onDeleteAchievement={handleDeleteAchievement}
                    onEnrollAgent={handleEnrollAgent}
                    onUnenrollAgent={handleUnenrollAgent}
                    onFetchFromFirebase={() => handleFetchFromFirebase()}
                    syncStatus={syncStatus}
                    syncMessage={syncMessage}
                  />
                )}

                {activeTab === 'config' && (
                  <ConfigurationTab 
                    tiers={tiers}
                    onUpdateTiers={handleUpdateTiers}
                    agents={agents}
                    certifications={certifications}
                    onResetDatabase={handleResetDatabase}
                    onResetTiersToDefault={handleResetTiersToDefault}
                    onImportDatabase={handleImportDatabase}
                    comingSoonConfig={comingSoonConfig}
                    onUpdateComingSoonConfig={handleUpdateComingSoonConfig}
                  />
                )}

                {activeTab === 'operations' && (
                  <OperationsTab 
                    agents={agents}
                    currentUser={currentUser}
                    initialSubTab="dashboard"
                    onUpdateAgent={handleUpdateAgent}
                    internalTasks={internalTasks}
                    setInternalTasks={setInternalTasks}
                    contractorTasks={contractorTasks}
                    setContractorTasks={setContractorTasks}
                    isolatedEvents={isolatedEvents}
                    setIsolatedEvents={setIsolatedEvents}
                    comingSoonConfig={comingSoonConfig}
                  />
                )}

                {activeTab === 'operations_admin' && (
                  <OperationsTab 
                    agents={agents}
                    currentUser={currentUser}
                    initialSubTab="administracion"
                    onUpdateAgent={handleUpdateAgent}
                    internalTasks={internalTasks}
                    setInternalTasks={setInternalTasks}
                    contractorTasks={contractorTasks}
                    setContractorTasks={setContractorTasks}
                    isolatedEvents={isolatedEvents}
                    setIsolatedEvents={setIsolatedEvents}
                    comingSoonConfig={comingSoonConfig}
                  />
                )}
              </>
            )}
          </Suspense>

        </main>

      </div>

    </div>
  );
}
