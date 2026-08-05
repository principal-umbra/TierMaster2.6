import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ComingSoonSubTab } from '../ui/ComingSoonSubTab';
import { Agent, InternalTask, ContractorTask } from '../../types';
import { fetchCRMData, fetchDailyScrumHistory, saveDailyScrumHistory, saveCRMData, fetchDailyScrumBoard, saveDailyScrumBoard, subscribeToDailyScrumBoard, clearAllDailyScrumBoards } from '../../db/firebaseService';
import { motion, AnimatePresence } from 'motion/react';
import { safeLocalStorageSet, debouncedSafeSetItem } from '../../lib/storage';
import { safeDispatchEvent } from '../../lib/events';
import {
  Play, 
  Pause, 
  RotateCcw, 
  Trash2, 
  AlertCircle, 
  Calendar, 
  Bell, 
  BellRing,
  Plus, 
  CheckCircle2, 
  Timer, 
  FileText, 
  Layers,
  Layout,
  MessageSquare,
  Eraser,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ClipboardList,
  RotateCw,
  Clock,
  ArrowUpRight,
  Info,
  Target,
  AlertTriangle,
  ChevronRight,
  History,
  Search,
  X,
  User,
  Users,
  ExternalLink
} from 'lucide-react';

interface DailyWorkspaceTabProps {
  agents: Agent[];
  currentUsername?: string;
  internalTasks?: InternalTask[];
  contractorTasks?: ContractorTask[];
  crmData?: any[];
  key?: any;
  webhookUrl?: string;
  spreadsheetId?: string;
  googleToken?: string | null;
  comingSoonConfig?: Record<string, boolean>;
}

interface WorkspaceItem {
  id: string;
  ticketNo: string; // e.g. #INC-2342 or #RFC-901
  title: string;
  category: 'Incidente' | 'Requerimiento' | 'Cambio' | 'Otro';
  column: 'yesterday' | 'today' | 'blocked';
  priority: 'Baja' | 'Media' | 'Alta';
  followUpDate?: string;
  hasReminder?: boolean;
  delayDays?: number; // Contador de días de retraso si no se trabaja
}

interface CompletedWorkspaceItem {
  id: string;
  ticketNo: string;
  title: string;
  category: string;
  priority: string;
  completedAt: string;
  notes?: string;
  completedInDate?: string; // Tracks the workspaceDate when it was finished
}

interface DeletedWorkspaceItem {
  id: string;
  ticketNo: string;
  title: string;
  category: string;
  priority: string;
  deletedAt: string;
  reason: string;
  notes?: string;
}

export default function DailyWorkspaceTab({ 
  agents, 
  currentUsername,
  internalTasks = [],
  contractorTasks = [],
  crmData = [],
  webhookUrl,
  spreadsheetId,
  googleToken,
  comingSoonConfig = {}
}: DailyWorkspaceTabProps) {
  const suffix = currentUsername ? `_${currentUsername}` : '';
  const keyActiveDate = `fhons_workspace_active_date${suffix}`;
  const keyKanbanItems = `fhons_workspace_kanban_items${suffix}`;
  const keyCompletedItems = `fhons_workspace_completed_items${suffix}`;
  const keyDeletedItems = `fhons_workspace_deleted_items${suffix}`;
  const keyScratchText = `fhons_workspace_scratch_text${suffix}`;

  const [activeSubTab, setActiveSubTab] = useState<'board' | 'pomodoro' | 'scratchpad' | 'completed' | 'deleted'>('board');

  // --- DRAWER STATE ---
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<'today' | 'blocked'>('today');
  const [drawerActiveTab, setDrawerActiveTab] = useState<'assigned' | 'tasks' | 'contractors' | 'manual'>('assigned');
  const [drawerSearch, setDrawerSearch] = useState('');

  // --- TOAST STATE ---
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // =========================================================================
  // STATE & LOGIC: WORKSPACE BOARD
  // =========================================================================
  
  const getAgentId = () => {
    if (!currentUsername) return 'anonymous';
    const matchedAgent = agents.find(
      a => a.id.toLowerCase().trim() === currentUsername.toLowerCase().trim() ||
           a.name.toLowerCase().trim() === currentUsername.toLowerCase().trim() ||
           (a.email && a.email.toLowerCase().trim().startsWith(currentUsername.toLowerCase().trim()))
    );
    return matchedAgent?.id || currentUsername;
  };

  const getRealTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [workspaceDate, setWorkspaceDate] = useState<string>(getYesterdayString());
  const agentId = getAgentId();
  const [initialized, setInitialized] = useState(false);
  const isLocalChange = useRef(false);

  // Restoring missing state variables
  const [backlogTickets, setBacklogTickets] = useState<any[]>([]);
  const [items, setItems] = useState<WorkspaceItem[]>([]);
  const [completedItems, setCompletedItems] = useState<CompletedWorkspaceItem[]>([]);
  const [deletedItems, setDeletedItems] = useState<DeletedWorkspaceItem[]>([]);
  
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [isOutOfSync, setIsOutOfSync] = useState(false);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [ticketNo, setTicketNo] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<'Incidente' | 'Requerimiento' | 'Cambio' | 'Otro'>('Incidente');
  const [priority, setPriority] = useState<'Baja' | 'Media' | 'Alta'>('Media');
  const [column, setColumn] = useState<'today' | 'blocked'>('today');
  const [followUpDate, setFollowUpDate] = useState('');
  const [hasReminder, setHasReminder] = useState(false);
  
  const [showNewDayModal, setShowNewDayModal] = useState(false);
  const [showClearBoardModal, setShowClearBoardModal] = useState(false);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  
  const [newDayStep, setNewDayStep] = useState<1 | 2 | 3 | 4>(1);
  const [workedTodayIds, setWorkedTodayIds] = useState<string[]>([]);
  const [incompleteWorkedIds, setIncompleteWorkedIds] = useState<string[]>([]);
  const [newBacklogTasks, setNewBacklogTasks] = useState<WorkspaceItem[]>([]);
  
  const [blockerInfos, setBlockerInfos] = useState<Record<string, { reason: string, followUp: string }>>({});
  const [deletingItem, setDeletingItem] = useState<WorkspaceItem | null>(null);
  const [deleteReason, setDeleteReason] = useState('Prioridad de negocio cambiada');
  const [deleteNotes, setDeleteNotes] = useState('');
  const [completingItem, setCompletingItem] = useState<WorkspaceItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [viewingItem, setViewingItem] = useState<WorkspaceItem | null>(null);

  const formatWorkspaceDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return dateObj.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  
  useEffect(() => {
    const isFirstTimeCalculated = items.length === 0 && !localStorage.getItem(`fhons_workspace_welcome_shown${suffix}`);
    setIsFirstTime(initialized && isFirstTimeCalculated);
    setIsOutOfSync(!isFirstTimeCalculated && workspaceDate !== getRealTodayString());
  }, [items, initialized, workspaceDate, suffix]);

  useEffect(() => {
    fetchCRMData('backlog_tickets').then(data => setBacklogTickets(data.map(t => ({ ...t, isBacklog: true }))));
  }, []);

  useEffect(() => {
    let unsubscribe: () => void;
    
    if (agentId && agentId !== 'anonymous') {
      unsubscribe = subscribeToDailyScrumBoard(agentId, (data) => {
        isLocalChange.current = false; // Flag that this is a remote update
        if (data) {
          setItems(data.items || []);
          setCompletedItems(data.completedItems || []);
          setDeletedItems(data.deletedItems || []);
          setWorkspaceDate(data.workspaceDate || getYesterdayString());
        } else {
          setItems([]);
          setCompletedItems([]);
          setDeletedItems([]);
        }
        setInitialized(true);
      });
    } else {
       setInitialized(true);
    }
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [agentId]);

  useEffect(() => {
    if (!initialized) return;
    if (isLocalChange.current) {
        const agentId = getAgentId();
        saveDailyScrumBoard(agentId, { items, completedItems, deletedItems, workspaceDate });
        isLocalChange.current = false; // Reset after saving
    }
  }, [items, completedItems, deletedItems, workspaceDate, initialized]);

  // Sync to localStorage (for backward compatibility if needed, but Firestore is now truth)
  useEffect(() => {
    safeLocalStorageSet(keyKanbanItems, JSON.stringify(items));
    safeLocalStorageSet(keyCompletedItems, JSON.stringify(completedItems));
    safeLocalStorageSet(keyDeletedItems, JSON.stringify(deletedItems));
    safeLocalStorageSet(keyActiveDate, workspaceDate);
  }, [items, completedItems, deletedItems, workspaceDate]);

  const keyUserAlerts = `fhons_user_alerts_${(currentUsername || 'anonymous').toLowerCase().trim()}`;
  const [userAlerts, setUserAlerts] = useState<any[]>(() => {
    const cached = localStorage.getItem(keyUserAlerts);
    if (cached) {
      try { return JSON.parse(cached); } catch (e) {}
    }
    return [];
  });

  // Listen for workspaceCleared event
  useEffect(() => {
    const handleWorkspaceCleared = () => {
      setItems([]);
      setCompletedItems([]);
      setDeletedItems([]);
      localStorage.removeItem(`fhons_workspace_welcome_shown${suffix}`);
    };
    window.addEventListener('workspaceCleared', handleWorkspaceCleared);
    return () => window.removeEventListener('workspaceCleared', handleWorkspaceCleared);
  }, [suffix]);

  // Welcome Modal Logic
  useEffect(() => {
    if (isFirstTime) {
      setShowWelcomeModal(true);
    }
  }, [isFirstTime, workspaceDate, suffix]);

  // Listen to storage changes to update UI if admin sends alerts
  useEffect(() => {
    const handleCheckAlerts = (e?: StorageEvent) => {
      if (e && e.key !== keyUserAlerts) return;
      
      const cached = localStorage.getItem(keyUserAlerts);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setUserAlerts(prev => {
            if (JSON.stringify(parsed) !== JSON.stringify(prev)) {
              return parsed;
            }
            return prev;
          });
        } catch (e) {}
      }
    };

    // Load initial alerts on mount
    handleCheckAlerts();

    window.addEventListener('storage', handleCheckAlerts);
    return () => {
      window.removeEventListener('storage', handleCheckAlerts);
    };
  }, [keyUserAlerts]);

  // Triggers and confirmations
  const handleTriggerDelete = (item: WorkspaceItem) => {
    setDeletingItem(item);
    setDeleteReason('Prioridad de negocio cambiada');
    setDeleteNotes('');
  };

  const logAction = async (action: string, ticketNo: string, title: string) => {
    if (!currentUsername) {
      console.warn("logAction called but currentUsername is missing");
      return;
    }
    const matchedAgent = agents.find(
      a => a.id.toLowerCase().trim() === currentUsername.toLowerCase().trim() ||
           a.name.toLowerCase().trim() === currentUsername.toLowerCase().trim() ||
           (a.email && a.email.toLowerCase().trim().startsWith(currentUsername.toLowerCase().trim()))
    );
    const agentId = matchedAgent?.id || currentUsername;
    console.log(`logAction: action=${action}, ticketNo=${ticketNo}, title=${title}, agentId=${agentId}, currentUsername=${currentUsername}`);
    try {
      await saveDailyScrumHistory(agentId, {
        id: `log_${Date.now()}`,
        ticketId: ticketNo,
        title: title,
        action: action,
        timestamp: new Date().toLocaleString()
      } as any);
      console.log(`Successfully saved log for ${agentId}`);
    } catch (e) {
      console.error("Failed to log action to Firestore", e);
    }
  };

  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    
    const newDeleted: DeletedWorkspaceItem = {
      id: `del_${Date.now()}`,
      ticketNo: deletingItem.ticketNo,
      title: deletingItem.title,
      category: deletingItem.category,
      priority: deletingItem.priority,
      deletedAt: new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      reason: deleteReason,
      notes: deleteNotes.trim() || undefined
    };

    isLocalChange.current = true;
    setDeletedItems(prev => [newDeleted, ...prev]);
    isLocalChange.current = true;
    setItems(prev => prev.filter(i => i.id !== deletingItem.id));
    logAction('delete', deletingItem.ticketNo, deletingItem.title);
    setDeletingItem(null);
    showToast(`Requerimiento ${deletingItem.ticketNo} registrado como eliminado.`);
  };

  const handleTriggerComplete = (item: WorkspaceItem) => {
    setCompletingItem(item);
    setCompletionNotes('');
  };

  const handleConfirmComplete = () => {
    if (!completingItem) return;

    const newCompleted: CompletedWorkspaceItem = {
      id: `comp_${Date.now()}`,
      ticketNo: completingItem.ticketNo,
      title: completingItem.title,
      category: completingItem.category,
      priority: completingItem.priority,
      completedAt: new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: completionNotes.trim() || undefined,
      completedInDate: workspaceDate
    };

    isLocalChange.current = true;
    setCompletedItems(prev => [newCompleted, ...prev]);
    isLocalChange.current = true;
    setItems(prev => prev.filter(i => i.id !== completingItem.id));
    logAction('complete', completingItem.ticketNo, completingItem.title);
    setCompletingItem(null);
    showToast(`¡Excelente! ${completingItem.ticketNo} marcado como Completado. 🎉`);
  };

  const handleRestoreCompleted = (compItem: CompletedWorkspaceItem) => {
    const restoredItem: WorkspaceItem = {
      id: `item_${Date.now()}`,
      ticketNo: compItem.ticketNo,
      title: compItem.title,
      category: compItem.category as any,
      priority: compItem.priority as any,
      column: 'today',
      delayDays: 0
    };

    isLocalChange.current = true;
    setItems(prev => [...prev, restoredItem]);
    isLocalChange.current = true;
    setCompletedItems(prev => prev.filter(i => i.id !== compItem.id));
    showToast(`Tique ${compItem.ticketNo} devuelto al tablero de hoy.`);
  };

  const handleRestoreDeleted = (delItem: DeletedWorkspaceItem) => {
    const restoredItem: WorkspaceItem = {
      id: `item_${Date.now()}`,
      ticketNo: delItem.ticketNo,
      title: delItem.title,
      category: delItem.category as any,
      priority: delItem.priority as any,
      column: 'today',
      delayDays: 0
    };

    isLocalChange.current = true;
    setItems(prev => [...prev, restoredItem]);
    isLocalChange.current = true;
    setDeletedItems(prev => prev.filter(i => i.id !== delItem.id));
    showToast(`Tique ${delItem.ticketNo} restaurado al tablero de hoy.`);
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Por favor escribe la descripción de la tarea.');
      return;
    }

    const newItem: WorkspaceItem = {
      id: `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      ticketNo: ticketNo.trim().toUpperCase() || `#TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title.trim(),
      category,
      column,
      priority,
      followUpDate: column === 'blocked' ? (followUpDate || new Date().toISOString().split('T')[0]) : undefined,
      hasReminder: column === 'blocked' ? hasReminder : undefined
    };

    isLocalChange.current = true;
    setItems(prev => [...prev, newItem]);
    logAction('add', newItem.ticketNo, newItem.title);
    showToast('Requerimiento añadido a tu jornada.');
    
    // Reset form
    setTicketNo('');
    setTitle('');
    setFollowUpDate('');
    setHasReminder(false);
    setShowAddForm(false);
  };

  // Only allowed to move between Today and Blocked!
  const handleMoveBetweenTodayAndBlocked = (id: string, targetCol: 'today' | 'blocked') => {
    let movedItem: WorkspaceItem | undefined;
    isLocalChange.current = true;
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        if (item.column === 'yesterday') return item; // Yesterday is locked!
        movedItem = { 
          ...item, 
          column: targetCol,
          followUpDate: targetCol === 'blocked' ? (item.followUpDate || new Date().toISOString().split('T')[0]) : undefined,
          hasReminder: targetCol === 'blocked' ? (item.hasReminder ?? true) : undefined
        };
        return movedItem;
      }
      return item;
    }));
    if (movedItem) {
        logAction('move', movedItem.ticketNo, movedItem.title);
    }
    showToast(targetCol === 'blocked' ? 'Item marcado como Bloqueado.' : 'Item retornado a Hoy.');
  };

  const handleDeleteItem = (id: string) => {
    isLocalChange.current = true;
    setItems(prev => prev.filter(item => item.id !== id));
    showToast('Elemento removido.');
  };

  const handleToggleReminder = (id: string) => {
    isLocalChange.current = true;
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, hasReminder: !item.hasReminder };
      }
      return item;
    }));
  };

  const handleUpdateFollowUp = (id: string, date: string) => {
    isLocalChange.current = true;
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, followUpDate: date };
      }
      return item;
    }));
  };

  // --- "NUEVO DÍA" DIALOG WORKFLOWS ---
  const handleOpenNewDayModal = async () => {
    // Current "today" items from the board will be our "yesterday" base
    setWorkedTodayIds([]);
    setIncompleteWorkedIds([]);
    setNewBacklogTasks([]);
    setBlockerInfos({});
    
    // Check if it's Day Zero
    const history = await fetchDailyScrumHistory();
    const userHistory = history.filter(log => log.agentId === currentUsername);
    
    if (userHistory.length === 0) {
      setNewDayStep(3); // Skip to "What will you do today?"
    } else {
      setNewDayStep(1);
    }
    
    setShowNewDayModal(true);
  };

  const handleExecuteNewDay = () => {
    // Check if it's Day Zero
    const todayStr = getRealTodayString();
    if (items.length === 0) {
      isLocalChange.current = true;
      setWorkspaceDate(todayStr);
      safeLocalStorageSet(keyActiveDate, todayStr);
    }
    
    // 0. ARCHIVE OLD "AYER" COLUMN TO COMPLETED TAB
    const oldYesterdayItems = items.filter(i => i.column === 'yesterday');
    if (oldYesterdayItems.length > 0) {
      const archived: CompletedWorkspaceItem[] = oldYesterdayItems.map(item => ({
        id: `comp_arch_${Date.now()}_${item.id}`,
        ticketNo: item.ticketNo,
        title: item.title,
        category: item.category,
        priority: item.priority,
        completedAt: new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        notes: 'Archivado automáticamente al iniciar nueva jornada',
        completedInDate: workspaceDate
      }));
      isLocalChange.current = true;
    setCompletedItems(prev => [...archived, ...prev]);
    }

    // 1. Get all items that were in 'today' or 'blocked' (active items)
    const activeItems = items.filter(i => i.column === 'today' || i.column === 'blocked');
    
    // 2. Identify Finished items from WIZARD (Worked and NOT incomplete)
    const finishedIds = workedTodayIds.filter(id => !incompleteWorkedIds.includes(id));
    const finishedItemsFromWizard = activeItems.filter(i => finishedIds.includes(i.id));

    // Move finished items from wizard to 'Terminados' tab
    const wizardCompleted: CompletedWorkspaceItem[] = finishedItemsFromWizard.map(item => ({
      id: `comp_${Date.now()}_${item.id}`,
      ticketNo: item.ticketNo,
      title: item.title,
      category: item.category,
      priority: item.priority,
      completedAt: new Date().toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      notes: 'Finalizado durante planificación de Nueva Jornada',
      completedInDate: workspaceDate
    }));
    isLocalChange.current = true;
    setCompletedItems(prev => [...wizardCompleted, ...prev]);

    // 3. Construct the NEW items list for the board
    const nextList: WorkspaceItem[] = [];

    // COLUMN 1: AYER (Reporte de Ayer)
    // - Includes items worked in wizard (snapshot)
    const workedItemsFromWizard = activeItems.filter(i => workedTodayIds.includes(i.id));
    workedItemsFromWizard.forEach(item => {
      nextList.push({
        ...item,
        id: `hist_${Date.now()}_${item.id}`,
        column: 'yesterday',
        delayDays: 0
      });
    });

    // - ALSO includes items marked as completed DURING the day (before clicking New Day)
    // They are in completedItems with completedInDate === workspaceDate
    const completedDuringDay = completedItems.filter(ci => ci.completedInDate === workspaceDate);
    completedDuringDay.forEach(ci => {
      // Avoid duplicates if ticketNo already in nextList (snapshot)
      if (!nextList.find(n => n.ticketNo === ci.ticketNo)) {
        nextList.push({
          id: `hist_ci_${Date.now()}_${ci.id}`,
          ticketNo: ci.ticketNo,
          title: ci.title,
          category: ci.category as any,
          priority: ci.priority as any,
          column: 'yesterday',
          delayDays: 0
        });
      }
    });

    // COLUMN 2: HOY (Compromiso)
    // - Items that were NOT finished (whether they were worked or not)
    const unfinishedItems = activeItems.filter(i => !finishedIds.includes(i.id));
    unfinishedItems.forEach(item => {
      const wasWorked = workedTodayIds.includes(item.id);
      nextList.push({
        ...item,
        column: 'today',
        delayDays: (item.delayDays || 0) + (wasWorked ? 0 : 1)
      });
    });

    // - New tasks from backlog
    newBacklogTasks.forEach(task => {
      nextList.push({
        ...task,
        column: 'today',
        delayDays: 0
      });
    });

    // COLUMN 3: BLOQUEANTES
    // Apply blocker information from Step 4
    const finalItems = nextList.map(item => {
      const blocker = blockerInfos[item.id] || blockerInfos[item.ticketNo];
      if (blocker && item.column !== 'yesterday') {
        return {
          ...item,
          column: 'blocked' as const,
          followUpDate: blocker.followUp,
          notes: blocker.reason 
        };
      }
      return item;
    });

    isLocalChange.current = true;
    setItems(finalItems);
    isLocalChange.current = true;
    setWorkspaceDate(todayStr);
    safeLocalStorageSet(keyActiveDate, todayStr);
    setShowNewDayModal(false);
    showToast('☀️ ¡Jornada iniciada! Tu tablero ha sido organizado según tu planificación.');
  };

  const handleClearBoards = async () => {
    showToast('⏳ Registrando tableros en Google Sheets...');
    
    // 1. Recopilar items de TODOS los agentes desde localStorage
    let allItems: any[] = [];
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fhons_workspace_kanban_items_')) {
        let username = key.replace('fhons_workspace_kanban_items_', '');
        if (username.startsWith('_')) {
          username = username.substring(1);
        }
        if (!username) username = 'admin';
        
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              // Filtrar posibles seed_tasks (datos de prueba que no queremos en el historial)
              const realTasks = parsed.filter(t => !t.id || !t.id.toString().startsWith('seed_task_'));
              
              const matchedAgent = agents.find(
                a => a.id.toLowerCase().trim() === username.toLowerCase().trim() ||
                     a.name.toLowerCase().trim() === username.toLowerCase().trim() ||
                     (a.email && a.email.toLowerCase().trim().startsWith(username.toLowerCase().trim()))
              );
              
              realTasks.forEach(task => {
                allItems.push({
                  ...task,
                  agentId: matchedAgent?.id || username,
                  agentName: matchedAgent?.name || username,
                  status: task.column
                });
              });
            }
          }
        } catch(e) {
          console.error(e);
        }
      }
      
      // Marcar para borrar también completed y deleted
      if (key && (
        key.startsWith('fhons_workspace_kanban_items_') ||
        key.startsWith('fhons_workspace_completed_items_') ||
        key.startsWith('fhons_workspace_deleted_items_')
      )) {
        keysToRemove.push(key);
      }
    }
    
    // 2. Fetch data existente en Historial (para no borrarlo) y concatenar
    try {
        let existingHistory: any[] = [];
        try {
          existingHistory = await fetchCRMData('scrum_history');
        } catch (e) {
          console.warn('Historial en firestore no existe o error, se creará nuevo:', e);
        }
        
        const combinedHistory = [...existingHistory, ...allItems.map(item => ({
          "ID Tarea": item.id || "",
          "Técnico ID": item.agentId || "",
          "Técnico Nombre": item.agentName || "",
          "Ticket CRM": item.ticketNo || "",
          "Título": item.title || "",
          "Categoría": item.category || "",
          "Prioridad": item.priority || "",
          "Estado": item.status || "",
          "Días de Retraso": item.delayDays ? String(item.delayDays) : "0",
          "Notas Adicionales": item.notes || "",
          "Fecha de Actualización": new Date().toISOString()
        }))];
        
        await saveCRMData('scrum_history', combinedHistory);
    } catch(err) {
      console.error('Error sincronizando historial con firestore:', err);
    }
    
    // 3. Limpiar local storage globalmente para simular un wipe de base de datos de todos los tableros
    keysToRemove.forEach(k => localStorage.removeItem(k));
    
    try {
      await clearAllDailyScrumBoards();
    } catch (e) {
      console.error('Error limpiando tableros absolutos en Firestore:', e);
    }

    // Despachar evento para que DailyAdminUse se entere
    safeDispatchEvent('workspaceCleared');

    // 4. Limpiar todos los tableros locales del usuario actual
    setItems([]);
    setCompletedItems([]);
    setDeletedItems([]);
    
    setShowClearBoardModal(false);
    showToast('🧹 Tableros limpiados y almacenados en Firestore exitosamente.');
  };

  // =========================================================================
  // STATE & LOGIC: POMODORO TIMER
  // =========================================================================
  const [pomoMode, setPomoMode] = useState<'work' | 'break'>('work');
  const [pomoTimeLeft, setPomoTimeLeft] = useState(25 * 60);
  const [pomoRunning, setPomoRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (pomoRunning) {
      timerRef.current = setInterval(() => {
        setPomoTimeLeft(prev => {
          if (prev <= 1) {
            setPomoRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (pomoMode === 'work') {
              setCompletedSessions(c => c + 1);
              showToast('🎉 ¡Intervalo completado! Tómate un pequeño respiro.');
              setPomoMode('break');
              return 5 * 60;
            } else {
              showToast('🔋 Descanso concluido. ¡A enfocar de nuevo!');
              setPomoMode('work');
              return 25 * 60;
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [pomoRunning, pomoMode]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  // =========================================================================
  // STATE & LOGIC: COMPLETED AND DELETED FILTERS
  // =========================================================================
  const [completedSearch, setCompletedSearch] = useState('');
  const [deletedSearch, setDeletedSearch] = useState('');

  // =========================================================================
  // STATE & LOGIC: QUICK SCRATCHPAD
  // =========================================================================
  const [scratchpadText, setScratchpadText] = useState(() => {
    return localStorage.getItem(keyScratchText) || 
      `// BLOC DE NOTAS RÁPIDO PERSISTENTE 📝\n// Espacio offline para copiar temporalmente números de tiques, comandos de servidor o IPs...\n\n- IP Servidor DNS Secundario: 10.90.10.8\n- Comando reinicio de API Gateway: pm2 restart gateway\n- Cambios de guardia del fin de semana guardados en CRM`;
  });

  // --- DRAWER LOGIC ---
  const normalizeName = (name: string): string => {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };

  const isAgentMatch = (assignedName: string) => {
    if (!assignedName || !currentUsername) return false;
    
    const cleanAssigned = normalizeName(assignedName);
    
    // 1. Try to find the agent in the agents list to get their full name
    const agent = agents.find(a => 
      a.id.toLowerCase() === currentUsername.toLowerCase() || 
      (a.email && a.email.toLowerCase() === currentUsername.toLowerCase())
    );
    
    if (agent) {
      const cleanAgentName = normalizeName(agent.name);
      if (cleanAssigned.includes(cleanAgentName) || cleanAgentName.includes(cleanAssigned)) return true;
    }
    
    // 2. Fallback: if currentUsername itself matches assignedName parts
    const cleanUser = normalizeName(currentUsername);
    return cleanAssigned.includes(cleanUser) || cleanUser.includes(cleanAssigned);
  };

  const myAssignedRequests = useMemo(() => {
    return [
      ...(Array.isArray(crmData) ? crmData : []),
      ...backlogTickets
    ].filter(item => {
      if ((item as any).isBacklog) return true;
      const assigned = item["Assigned To"] || item["Responsable"];
      return isAgentMatch(assigned);
    });
  }, [crmData, backlogTickets, agents, currentUsername]);

  const todayAndBlockedItems = useMemo(() => {
    return items.filter(i => i.column === 'today' || i.column === 'blocked');
  }, [items]);

  const completedTodayItems = useMemo(() => {
    return completedItems.filter(i => i.completedAt.startsWith(workspaceDate));
  }, [completedItems, workspaceDate]);

  const displayItems = useMemo(() => {
    return todayAndBlockedItems.concat(completedTodayItems);
  }, [todayAndBlockedItems, completedTodayItems]);

  const filteredAssigned = useMemo(() => {
    const search = drawerSearch.toLowerCase();
    return myAssignedRequests.filter(item => {
      const title = (item["Subject"] || item["Título"] || "").toLowerCase();
      const id = (item["ID"] || "").toLowerCase();
      return title.includes(search) || id.includes(search);
    });
  }, [myAssignedRequests, drawerSearch]);

  const filteredInternalTasks = useMemo(() => {
    return Array.isArray(internalTasks) 
      ? internalTasks.filter(task => {
          const search = drawerSearch.toLowerCase();
          const title = (task.title || "").toLowerCase();
          const id = (task.ticketId || "").toLowerCase();
          return title.includes(search) || id.includes(search);
        })
      : [];
  }, [internalTasks, drawerSearch]);

  const filteredContractorTasks = useMemo(() => {
    return Array.isArray(contractorTasks) 
      ? contractorTasks.filter(task => {
          const search = drawerSearch.toLowerCase();
          const title = (task.title || "").toLowerCase();
          const contractor = (task.contractorName || "").toLowerCase();
          const id = (task.ticketId || "").toLowerCase();
          return title.includes(search) || contractor.includes(search) || id.includes(search);
        })
      : [];
  }, [contractorTasks, drawerSearch]);

  const handleSelectItemFromDrawer = (item: any, source: 'assigned' | 'internal' | 'contractor') => {
    let newTask: WorkspaceItem;
    
    if (source === 'contractor') {
      newTask = {
        id: `cont_${item.id || Date.now()}`,
        ticketNo: item.ticketId || `#CONT-${Math.floor(Math.random()*9000)+1000}`,
        title: `[Contratista] ${item.title || item.contractorName || 'Tarea de Contratista'}`,
        category: 'Cambio',
        priority: 'Media',
        column: 'blocked', // Contractor tasks usually start as blocked or special
        delayDays: 0
      };
    } else if (source === 'assigned') {
      newTask = {
        id: `crm_${item.ID || Date.now()}`,
        ticketNo: item.ID ? `#REQ-${item.ID}` : `#T-${Math.floor(Math.random()*9000)+1000}`,
        title: item.Subject || item.Título || 'Sin título',
        category: 'Requerimiento',
        priority: item.Priority === 'High' || item.Prioridad === 'Alta' ? 'Alta' : 'Media',
        column: 'today',
        delayDays: 0
      };
    } else {
      newTask = {
        id: `int_${item.id || Date.now()}`,
        ticketNo: item.ticketId || `#INT-${Math.floor(Math.random()*9000)+1000}`,
        title: item.title || 'Tarea Interna',
        category: 'Requerimiento',
        priority: 'Media',
        column: 'today',
        delayDays: 0
      };
    }

    if (drawerMode === 'today') {
      if (showNewDayModal) {
        setNewBacklogTasks(prev => [...prev, newTask]);
        // If it's a contractor task added during commitment, we might want to also add it to blockers logic
        if (source === 'contractor') {
           setBlockerInfos(prev => ({
            ...prev,
            [newTask.id]: {
              reason: `Bloqueado por contratista: ${item.contractorName || 'Externo'}`,
              category: 'Externo',
              followUp: new Date(Date.now() + 86400000).toISOString().split('T')[0]
            }
          }));
        }
      } else {
        // Direct add to items if not in wizard
        isLocalChange.current = true;
        setItems(prev => [...prev, newTask]);
      }
      showToast(`Tarea añadida: ${newTask.title}`);
    } else {
      // For explicit blocked mode (Step 4)
      if (showNewDayModal) {
        setNewBacklogTasks(prev => [...prev, newTask]);
        setBlockerInfos(prev => ({
          ...prev,
          [newTask.id]: {
            reason: `Bloqueado por tercero/externo: ${newTask.title}`,
            category: 'Externo',
            followUp: new Date(Date.now() + 86400000).toISOString().split('T')[0]
          }
        }));
      } else {
        isLocalChange.current = true;
        setItems(prev => [...prev, { ...newTask, column: 'blocked' as const }]);
      }
      showToast(`Ticket de contratista añadido y marcado como bloqueante`);
    }
    setIsDrawerOpen(false);
  };

  const handleScratchChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setScratchpadText(val);
    safeLocalStorageSet(keyScratchText, val);
  };

  const subKey = `workspace_${activeSubTab}`;
  const isSubBlocked = comingSoonConfig && !!comingSoonConfig[subKey];

  return (
    <div className="flex-grow flex flex-col gap-4 relative" id="personal-workspace-container">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-5 right-5 bg-slate-900 border border-slate-800 text-white px-3.5 py-2 rounded-xl shadow-xl z-[9999] flex items-center gap-2.5 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <p className="font-sans text-[11px] font-semibold text-slate-100">
              {toastMsg}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMPACT WORKSPACE HEADER */}
      <section className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 shadow-3xs">
            <ClipboardList className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-black text-slate-900 tracking-tight">
              Área de Trabajo Diaria
            </h2>
          </div>
        </div>

        {/* Subnavigation Tabs */}
        <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg overflow-x-auto shrink-0 w-full md:w-auto">
          <button
            onClick={() => setActiveSubTab('board')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-sans font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              (activeSubTab === 'board' || activeSubTab === 'completed' || activeSubTab === 'deleted')
                ? 'bg-white text-slate-900 shadow-3xs font-extrabold border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-500" />
            Tablero Scrum Diario
          </button>
          <button
            onClick={() => setActiveSubTab('pomodoro')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-sans font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'pomodoro' 
                ? 'bg-white text-slate-900 shadow-3xs font-extrabold border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Timer className="w-3.5 h-3.5 text-emerald-500" />
            Pomodoro Focus
          </button>
          <button
            onClick={() => setActiveSubTab('scratchpad')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-sans font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              activeSubTab === 'scratchpad' 
                ? 'bg-white text-slate-900 shadow-3xs font-extrabold border border-slate-200/50' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-500" />
            Scratchpad Notas
          </button>
        </div>
      </section>

      {/* SECCIÓN DE ALERTAS DEL ADMINISTRADOR / SCRUM MASTER */}
      {userAlerts.some(alert => !alert.read) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col gap-2.5 shadow-2xs"
          id="admin-alerts-banner"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <BellRing className="w-4 h-4 text-amber-700 shrink-0" />
              <h3 className="font-display font-extrabold text-xs text-amber-900 uppercase tracking-tight">
                Instrucciones / Alertas de Coaching del Administrador
              </h3>
            </div>
            <button
              onClick={() => {
                setUserAlerts(prev => prev.map(a => ({ ...a, read: true })));
                showToast("Todas las alertas han sido marcadas como leídas.");
              }}
              className="text-[10px] font-mono text-amber-700 hover:underline bg-transparent border-none cursor-pointer"
            >
              Marcar todas como leídas
            </button>
          </div>
          
          <div className="space-y-2">
            {userAlerts.filter(a => !a.read).map(alert => (
              <div key={alert.id} className="bg-white border border-amber-100 p-3 rounded-lg text-xs font-sans text-slate-800 shadow-3xs flex justify-between items-start gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[9px] font-bold bg-amber-50 text-amber-850 border border-amber-200/50 px-1.5 py-0.5 rounded">
                      {alert.ticketNo}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{alert.date}</span>
                  </div>
                  <p className="text-slate-700 leading-relaxed font-medium">{alert.message}</p>
                </div>
                
                <button
                  onClick={() => {
                    setUserAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, read: true } : a));
                    showToast("Alerta marcada como leída.");
                  }}
                  className="text-[10px] font-mono font-bold text-slate-400 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 px-2.5 py-1 rounded border border-slate-200/50 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  Entendido ✓
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* RENDER ACTIVE WORKSPACE SECTION */}
      <div className="flex-grow">
        {isSubBlocked ? (
          <ComingSoonSubTab
            title={
              activeSubTab === 'board' ? 'Tablero Diario' :
              activeSubTab === 'pomodoro' ? 'Temporizador Pomodoro' :
              activeSubTab === 'scratchpad' ? 'Block de Notas' :
              activeSubTab === 'completed' ? 'Historial de Completados' :
              activeSubTab === 'deleted' ? 'Papelera de Eliminados' :
              activeSubTab
            }
          />
        ) : (
          <AnimatePresence mode="wait">
          
          {/* TAB 1: WORKSPACE TABULAR ROW LIST (NOT CARDS) */}
          {(activeSubTab === 'board' || activeSubTab === 'completed' || activeSubTab === 'deleted') && (
            <motion.div
              key="workspace-board-rows-unified"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-3.5"
            >
              {/* Header Row with Actions & View Switchers */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white p-3 rounded-xl border border-slate-200 shadow-3xs gap-3">
                {/* View Switch Subtabs (Actuales, Terminados, Eliminados) */}
                <div className="flex items-center p-0.5 bg-slate-100 border border-slate-200 rounded-lg overflow-x-auto shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveSubTab('board')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-sans font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      activeSubTab === 'board' 
                        ? 'bg-white text-slate-900 shadow-3xs font-extrabold border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-500" />
                    Requerimientos Actuales
                  </button>
                  <button
                    onClick={() => setActiveSubTab('completed')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-sans font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      activeSubTab === 'completed' 
                        ? 'bg-white text-slate-900 shadow-3xs font-extrabold border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Terminados ({completedItems.length})
                  </button>
                  <button
                    onClick={() => setActiveSubTab('deleted')}
                    className={`px-3 py-1.5 rounded-md text-[10px] font-sans font-bold transition-all flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      activeSubTab === 'deleted' 
                        ? 'bg-white text-slate-900 shadow-3xs font-extrabold border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    Eliminados ({deletedItems.length})
                  </button>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                  {/* Label de la Fecha de Jornada */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg shadow-3xs">
                    <Calendar className={`w-3.5 h-3.5 ${isOutOfSync ? 'text-amber-500 animate-pulse' : 'text-slate-500'}`} />
                    <div className="text-left leading-none">
                      <span className="block text-[7px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                        {isOutOfSync ? '⚠️ DESACTUALIZADO' : '📅 FECHA TABLERO'}
                      </span>
                      <span className={`text-[10px] font-extrabold font-sans ${isOutOfSync ? 'text-amber-600' : 'text-slate-700'}`}>
                        {formatWorkspaceDate(workspaceDate)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenNewDayModal}
                    className={`font-sans text-[11px] font-bold py-1.5 px-3 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs ${
                      isOutOfSync 
                        ? 'bg-amber-600 hover:bg-amber-700 text-white animate-pulse ring-2 ring-amber-500/50 font-extrabold' 
                        : 'bg-amber-600 hover:bg-amber-700 text-white'
                    }`}
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    Nuevo Día
                  </button>
                  <button
                    disabled={isOutOfSync}
                    onClick={() => {
                      if (isOutOfSync) return;
                      setDrawerMode('today');
                      setDrawerActiveTab('assigned');
                      setIsDrawerOpen(true);
                    }}
                    className={`font-sans text-[11px] font-bold py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 shadow-2xs ${
                      isOutOfSync 
                        ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed opacity-65' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Nuevo Requerimiento
                  </button>
                </div>
              </div>

              {/* THREE COLUMN GRID - REFACTORED TO MODERN KANBAN CARDS */}
              {activeSubTab === 'board' && (
                <div className="relative">
                  <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-all duration-300 ${isOutOfSync ? 'blur-[3px] pointer-events-none opacity-50 select-none' : ''}`}>
                
                    {/* COLUMN 1: AYER (HISTORICO RECIENTE) */}
                    <div className="flex flex-col h-full min-h-[500px]">
                      <div className="flex items-center justify-between px-1 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 border border-slate-200 shadow-sm">
                            <History className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-display font-black text-[13px] text-slate-800 tracking-tight">Reporte de Ayer</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Lo que se trabajó</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg border border-slate-200 font-mono">
                          {items.filter(i => i.column === 'yesterday').length}
                        </span>
                      </div>

                      <div className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-3 space-y-3 flex-1 overflow-hidden flex flex-col">
                        <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
                          {items.filter(i => i.column === 'yesterday').map(item => {
                            const catColor = item.category === 'Incidente' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                             item.category === 'Requerimiento' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                             item.category === 'Cambio' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                             'bg-slate-100 text-slate-600 border-slate-200';
                            return (
                              <button 
                                key={item.id}
                                onClick={() => setViewingItem(item)}
                                className="w-full text-left bg-white border border-slate-200 rounded-xl p-3 shadow-3xs group transition-all opacity-85 hover:opacity-100 grayscale-[0.2] hover:grayscale-0 cursor-pointer"
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <span className="font-mono text-[9px] font-black text-slate-400 tracking-tighter uppercase">{item.ticketNo}</span>
                                  <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase border ${catColor}`}>
                                    {item.category}
                                  </span>
                                </div>
                                <h4 className="font-sans text-[11px] text-slate-500 leading-snug font-bold truncate">
                                  {item.title}
                                </h4>
                                <div className="mt-2 pt-1 border-t border-slate-50 flex items-center justify-between">
                                  <span className="text-[8px] font-bold text-slate-400 italic">Ver detalle</span>
                                </div>
                              </button>
                            );
                          })}

                          {items.filter(i => i.column === 'yesterday').length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mb-3 border border-slate-200/50">
                                <History className="w-6 h-6" />
                              </div>
                              <p className="text-[10px] text-slate-400 font-bold max-w-[140px]">No hay registros de ayer disponibles.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 2: HOY (EN ENFOQUE ACTIVO) */}
                    <div className="flex flex-col h-full min-h-[500px]">
                      <div className="flex items-center justify-between px-1 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 border border-indigo-100">
                            <Target className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-display font-black text-[13px] text-slate-800 tracking-tight">Hoy</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Objetivos para esta jornada</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 bg-indigo-600 text-white rounded-lg border border-indigo-700 font-mono shadow-md shadow-indigo-100">
                          {items.filter(i => i.column === 'today').length}
                        </span>
                      </div>

                      <div className="bg-indigo-50/20 border border-indigo-100/60 rounded-2xl p-3 space-y-3 flex-1 overflow-hidden flex flex-col shadow-inner">
                        <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
                          {items.filter(i => i.column === 'today').map(item => {
                            const isDelayed = item.delayDays && item.delayDays > 0;
                            const priorityColor = item.priority === 'Alta' ? 'border-rose-200' : 
                                                 item.priority === 'Media' ? 'border-amber-200' : 
                                                 'border-white';
                            const catColor = item.category === 'Incidente' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                             item.category === 'Requerimiento' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                             item.category === 'Cambio' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                                             'bg-slate-100 text-slate-600 border-slate-200';
                            return (
                              <button 
                                key={item.id}
                                onClick={() => setViewingItem(item)}
                                className={`w-full text-left rounded-xl p-3 shadow-sm group transition-all hover:shadow-md border-2 cursor-pointer ${
                                  isDelayed 
                                    ? 'bg-rose-50/40 border-rose-300' 
                                    : `bg-white ${priorityColor} hover:border-indigo-400`
                                }`}
                              >
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex flex-col">
                                    <span className={`font-mono text-[9px] font-black tracking-tighter uppercase ${isDelayed ? 'text-rose-600' : 'text-indigo-600'}`}>
                                      {item.ticketNo}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase border ${catColor}`}>
                                      {item.category}
                                    </span>
                                  </div>
                                </div>
                                <h4 className={`font-sans text-[11px] leading-snug font-black truncate ${isDelayed ? 'text-rose-950' : 'text-slate-850'}`}>
                                  {item.title}
                                </h4>

                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-100/50">
                                  <div className="flex items-center gap-2">
                                     {isDelayed && (
                                      <div className="flex items-center gap-1 text-[8px] font-black text-rose-700 uppercase bg-rose-100/50 px-1.5 py-0.5 rounded-full border border-rose-200">
                                        <Clock className="w-2.5 h-2.5" />
                                        {item.delayDays}d
                                      </div>
                                    )}
                                    <span className="text-[8px] font-bold text-slate-400 italic">Pulsar para detalles</span>
                                  </div>
                                  <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                </div>
                              </button>
                            );
                          })}

                          {items.filter(i => i.column === 'today').length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-indigo-200 mb-3 border border-indigo-100/50">
                                <Target className="w-6 h-6" />
                              </div>
                              <p className="text-[10px] text-indigo-400 font-bold max-w-[140px]">Tablero despejado. ¡Buen trabajo!</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* COLUMN 3: BLOQUEADOS (CON SEGUIMIENTO DE FOLLOW-UP) */}
                    <div className="flex flex-col h-full min-h-[500px]">
                      <div className="flex items-center justify-between px-1 mb-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
                            <AlertTriangle className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="font-display font-black text-[13px] text-slate-800 tracking-tight">Bloqueados</h3>
                            <p className="text-[10px] text-slate-400 font-medium">Impedimentos externos</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-black px-2.5 py-1 bg-amber-500 text-white rounded-lg border border-amber-600 font-mono shadow-md shadow-amber-100">
                          {items.filter(i => i.column === 'blocked').length}
                        </span>
                      </div>

                      <div className="bg-amber-50/20 border border-amber-100/60 rounded-2xl p-3 space-y-3 flex-1 overflow-hidden flex flex-col shadow-inner">
                        <div className="space-y-3 overflow-y-auto pr-1 custom-scrollbar flex-1">
                          {items.filter(i => i.column === 'blocked').map(item => (
                            <button 
                              key={item.id}
                              onClick={() => setViewingItem(item)}
                              className="w-full text-left bg-white border-2 border-amber-100 rounded-xl p-3 shadow-sm group transition-all hover:shadow-md hover:border-amber-300 cursor-pointer"
                            >
                              <div className="flex justify-between items-center mb-1">
                                <span className="font-mono text-[9px] font-black text-amber-600 tracking-tighter uppercase">{item.ticketNo}</span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[7px] font-black px-1.5 py-0.5 rounded uppercase border bg-rose-50 text-rose-600 border-rose-100">
                                    DETENIDO
                                  </span>
                                </div>
                              </div>
                              <h4 className="font-sans text-[11px] text-slate-800 leading-snug font-bold truncate">
                                {item.title}
                              </h4>

                              <div className="flex items-center justify-between mt-3 pt-2 border-t border-amber-50">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-3 h-3 text-amber-400" />
                                  <span className="text-[8px] font-bold text-amber-600">{item.followUpDate || 'Pendiente'}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[8px] font-bold text-slate-400 italic">Ver detalle</span>
                                  <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-amber-500 transition-colors" />
                                </div>
                              </div>
                            </button>
                          ))}

                          {items.filter(i => i.column === 'blocked').length === 0 && (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                              <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-amber-200 mb-3 border border-amber-100/50">
                                <AlertTriangle className="w-6 h-6" />
                              </div>
                              <p className="text-[10px] text-amber-400 font-bold max-w-[140px]">No hay impedimentos registrados.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                {/* OVERLAY FOR DATE OUT OF SYNC */}
                {isOutOfSync && (
                  <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center p-6 text-center z-40 border border-slate-200 shadow-inner min-h-[300px]">
                    <div className="bg-white border border-slate-200/85 p-6 rounded-2xl shadow-lg max-w-md space-y-4">
                      <div className="w-12 h-12 bg-amber-50 border border-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
                        <Clock className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-display font-extrabold text-sm text-slate-900">Sincronización de Fecha Requerida</h4>
                        <p className="font-sans text-[11px] text-slate-500 leading-relaxed">
                          Tu tablero actual registra la jornada del <span className="font-extrabold text-slate-800">{formatWorkspaceDate(workspaceDate)}</span>. Para realizar más acciones, debes sincronizarlo con la fecha de hoy: <span className="font-extrabold text-emerald-600">{formatWorkspaceDate(getRealTodayString())}</span>.
                        </p>
                      </div>
                      <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl text-[10px] text-slate-650 text-left space-y-1.5 leading-normal font-sans">
                        <p className="font-bold text-slate-800 flex items-center gap-1">
                          💡 ¿Qué ocurre al iniciar un "Nuevo Día"?
                        </p>
                        <ul className="list-disc list-inside space-y-1 pl-1 text-slate-500">
                          <li>Se descartan/archivan los registros del turno anterior (<span className="font-semibold text-slate-700 font-mono">Ayer</span>).</li>
                          <li>Las tareas de <span className="font-semibold text-slate-700">Hoy</span> que decidas continuar generarán un duplicado activo.</li>
                          <li>Las tareas pendientes incrementarán su indicador de <span className="font-semibold text-red-600">retraso diario</span>.</li>
                          <li>La fecha del tablero se actualizará al día actual.</li>
                        </ul>
                      </div>
                      <button
                        onClick={handleOpenNewDayModal}
                        className="w-full bg-amber-650 hover:bg-amber-700 text-white font-sans text-[11px] font-bold py-2.5 px-4 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm animate-pulse"
                      >
                        <RotateCw className="w-4 h-4" />
                        Iniciar Nuevo Día • {formatWorkspaceDate(getRealTodayString())}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              )}

              {/* TAB 4: COMPLETED ITEMS INLINE */}
              {activeSubTab === 'completed' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-extrabold text-sm text-slate-800">Historial de Requerimientos Terminados</h3>
                      <p className="font-sans text-[11px] text-slate-500">Registro de tareas completadas exitosamente en tu jornada.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Buscar tique o título..."
                        value={completedSearch}
                        onChange={(e) => setCompletedSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:bg-white focus:border-emerald-500 w-44"
                      />
                      {completedItems.length > 0 && (
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de que deseas vaciar todo el historial de tiques completados? Esta acción es irreversible.')) {
                              isLocalChange.current = true;
                              setCompletedItems([]);
                              showToast('Historial de completados vaciado.');
                            }
                          }}
                          className="text-[10px] text-red-600 hover:text-red-700 font-bold bg-red-50 border border-red-150 rounded-lg px-2.5 py-1.5 hover:bg-red-100 cursor-pointer"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {completedItems
                      .filter(item => 
                        item.ticketNo.toLowerCase().includes(completedSearch.toLowerCase()) ||
                        item.title.toLowerCase().includes(completedSearch.toLowerCase())
                      )
                      .map(item => (
                        <div 
                          key={item.id}
                          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-emerald-350 transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-black text-emerald-700">{item.ticketNo}</span>
                                <span className="text-[8px] font-bold px-1.5 py-0.2 bg-emerald-50 text-emerald-800 rounded border border-emerald-100">
                                  {item.category}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-450 font-mono font-semibold">
                                {item.completedAt}
                              </span>
                            </div>

                            <h4 className="font-sans text-xs font-bold text-slate-800 leading-snug">
                              {item.title}
                            </h4>

                            {item.notes && (
                              <div className="bg-slate-50 border border-slate-150 rounded-lg p-2.5 text-[10px] text-slate-650 font-sans leading-relaxed mt-1">
                                <span className="font-extrabold text-slate-700 block mb-0.5">Notas de resolución:</span>
                                {item.notes}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1 text-[9px]">
                            <span className="text-slate-400 font-medium">Prioridad: {item.priority}</span>
                            <button
                              onClick={() => handleRestoreCompleted(item)}
                              className="text-blue-650 hover:text-blue-700 hover:underline font-extrabold cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Reabrir e ir a Hoy
                            </button>
                          </div>
                        </div>
                      ))
                    }

                    {completedItems.filter(item => 
                      item.ticketNo.toLowerCase().includes(completedSearch.toLowerCase()) ||
                      item.title.toLowerCase().includes(completedSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="col-span-full bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                        <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs font-bold">No se encontraron tiques completados</p>
                        <p className="text-[10px] text-slate-400">Completa tareas desde tu tablero Scrum para verlas aquí.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: DELETED ITEMS INLINE */}
              {activeSubTab === 'deleted' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-3xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display font-extrabold text-sm text-slate-800">Bitácora de Eliminaciones Justificadas</h3>
                      <p className="font-sans text-[11px] text-slate-500">Historial con explicaciones de por qué se removieron ciertos requerimientos.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Buscar tique o título..."
                        value={deletedSearch}
                        onChange={(e) => setDeletedSearch(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-800 focus:outline-none focus:bg-white focus:border-red-500 w-44"
                      />
                      {deletedItems.length > 0 && (
                        <button
                          onClick={() => {
                            if (confirm('¿Estás seguro de que deseas vaciar toda la bitácora de justificaciones de tiques eliminados? Esta acción es irreversible.')) {
                              isLocalChange.current = true;
                              setDeletedItems([]);
                              showToast('Bitácora de eliminados vaciada.');
                            }
                          }}
                          className="text-[10px] text-red-600 hover:text-red-700 font-bold bg-red-50 border border-red-150 rounded-lg px-2.5 py-1.5 hover:bg-red-100 cursor-pointer"
                        >
                          Vaciar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {deletedItems
                      .filter(item => 
                        item.ticketNo.toLowerCase().includes(deletedSearch.toLowerCase()) ||
                        item.title.toLowerCase().includes(deletedSearch.toLowerCase())
                      )
                      .map(item => (
                        <div 
                          key={item.id}
                          className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs hover:border-red-200 transition-all flex flex-col justify-between gap-3 relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 right-0 h-[3px] bg-red-500" />
                          
                          <div className="space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-black text-red-700">{item.ticketNo}</span>
                                <span className="text-[8px] font-bold px-1.5 py-0.2 bg-red-50 text-red-800 rounded border border-red-100">
                                  {item.category}
                                </span>
                              </div>
                              <span className="text-[9px] text-slate-450 font-mono font-semibold">
                                {item.deletedAt}
                              </span>
                            </div>

                            <h4 className="font-sans text-xs font-bold text-slate-800 leading-snug">
                              {item.title}
                            </h4>

                            <div className="bg-amber-50/50 border border-amber-200/60 rounded-lg p-2.5 mt-1.5 space-y-1 text-[10px]">
                              <p className="text-amber-900 font-extrabold flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                Motivo: {item.reason}
                              </p>
                              {item.notes && (
                                <p className="text-slate-650 leading-relaxed font-sans pt-1 border-t border-amber-100/50">
                                  <span className="font-bold text-slate-700 block mb-0.5">Notas / Comentarios:</span>
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-1 text-[9px]">
                            <span className="text-slate-400 font-medium">Prioridad: {item.priority}</span>
                            <button
                              onClick={() => handleRestoreDeleted(item)}
                              className="text-blue-650 hover:text-blue-700 hover:underline font-extrabold cursor-pointer flex items-center gap-1"
                            >
                              <RotateCcw className="w-3 h-3" /> Restaurar e ir a Hoy
                            </button>
                          </div>
                        </div>
                      ))
                    }

                    {deletedItems.filter(item => 
                      item.ticketNo.toLowerCase().includes(deletedSearch.toLowerCase()) ||
                      item.title.toLowerCase().includes(deletedSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="col-span-full bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400">
                        <Trash2 className="w-8 h-8 text-slate-350 mx-auto mb-2" />
                        <p className="text-xs font-bold">No se encontraron tiques eliminados</p>
                        <p className="text-[10px] text-slate-400">Cuando justifiques la eliminación de un requerimiento, aparecerá registrado aquí.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: POMODORO TIMER & INTEGRATED TICKET FOCUS */}
          {activeSubTab === 'pomodoro' && (
            <motion.div
              key="workspace-pomo"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-5"
            >
              {/* Left Column: The Timer Visual Widget */}
              <div className="md:col-span-5 bg-white border border-slate-200 p-5.5 rounded-2xl shadow-2xs flex flex-col items-center justify-between gap-4.5 min-h-[380px]">
                <div className="text-center w-full">
                  <span className="font-mono text-[9px] font-bold text-blue-650 uppercase tracking-widest block">SISTEMA DE GUARDIA ACTIVA</span>
                  <h3 className="font-display font-black text-xs text-slate-800">Sprint de Enfoque Ininterrumpido</h3>
                  <p className="font-sans text-[10px] text-slate-500 mt-0.5">Utiliza bloques de 25 minutos para resolver incidentes sin distracciones.</p>
                </div>

                {/* Mode Selection */}
                <div className="flex items-center bg-slate-100/80 p-0.5 border border-slate-200/50 rounded-lg text-[10px]">
                  <button
                    onClick={() => {
                      setPomoRunning(false);
                      setPomoMode('work');
                      setPomoTimeLeft(25 * 60);
                    }}
                    className={`px-3 py-1 rounded font-bold cursor-pointer transition-all ${
                      pomoMode === 'work' ? 'bg-white text-blue-700 shadow-3xs' : 'text-slate-500 hover:text-slate-750'
                    }`}
                  >
                    Trabajo (25m)
                  </button>
                  <button
                    onClick={() => {
                      setPomoRunning(false);
                      setPomoMode('break');
                      setPomoTimeLeft(5 * 60);
                    }}
                    className={`px-3 py-1 rounded font-bold cursor-pointer transition-all ${
                      pomoMode === 'break' ? 'bg-white text-emerald-700 shadow-3xs' : 'text-slate-500 hover:text-slate-750'
                    }`}
                  >
                    Descanso (5m)
                  </button>
                </div>

                {/* Countdown Board */}
                <div className="relative w-full bg-slate-950 text-slate-100 py-6 px-4 rounded-2xl text-center space-y-1.5 shadow-md overflow-hidden border border-slate-800">
                  {/* Subtle pulsing ambient background light */}
                  <div className={`absolute inset-0 opacity-15 pointer-events-none transition-all duration-1000 ${
                    pomoRunning 
                      ? pomoMode === 'work' ? 'bg-blue-500 animate-pulse' : 'bg-emerald-500 animate-pulse' 
                      : 'bg-transparent'
                  }`} />
                  
                  <span className="relative z-10 block font-mono text-4xl font-black text-white tracking-tight">
                    {formatTime(pomoTimeLeft)}
                  </span>
                  
                  <span className={`relative z-10 text-[9px] font-black font-mono uppercase px-2 py-0.5 rounded-full inline-block border ${
                    pomoMode === 'work' 
                      ? 'bg-blue-900/40 text-blue-300 border-blue-800/50' 
                      : 'bg-emerald-900/40 text-emerald-300 border-emerald-800/50'
                  }`}>
                    {pomoMode === 'work' ? '🎯 MODO ENFOQUE' : '🔋 MODO RECARGA'}
                  </span>

                  {/* Horizontal progress meter */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                    <div 
                      className={`h-full transition-all duration-1000 ${pomoMode === 'work' ? 'bg-blue-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(pomoTimeLeft / (pomoMode === 'work' ? 25 * 60 : 5 * 60)) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Action bar */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => {
                      setPomoRunning(false);
                      setPomoTimeLeft(pomoMode === 'work' ? 25 * 60 : 5 * 60);
                      showToast('Reloj reiniciado.');
                    }}
                    className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors"
                    title="Reiniciar"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPomoRunning(!pomoRunning)}
                    className={`px-6 py-2 rounded-lg font-sans text-xs font-bold text-white transition-all cursor-pointer shadow-3xs ${
                      pomoRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {pomoRunning ? 'Pausar' : 'Iniciar Reloj'}
                  </button>
                  <button
                    onClick={() => {
                      setPomoTimeLeft(0);
                      setPomoRunning(true);
                    }}
                    className="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 cursor-pointer transition-colors"
                    title="Saltar a finalizado"
                  >
                    <Play className="w-4 h-4 text-emerald-600" />
                  </button>
                </div>

                <div className="w-full flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-100 pt-3">
                  <span>Ciclos completados hoy:</span>
                  <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {completedSessions} Pomodoros
                  </span>
                </div>
              </div>

              {/* Right Column: Active focus ticket context */}
              <div className="md:col-span-7 bg-slate-50/50 border border-slate-200 p-5 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-display font-black text-xs text-slate-700 flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-blue-600" />
                    Selección de Enfoque Activo
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">TIQUES DISPONIBLES</span>
                </div>

                {/* ACTIVE FOCUS DISPLAY */}
                {focusItemId ? (
                  (() => {
                    const activeItem = items.find(i => i.id === focusItemId);
                    if (!activeItem) {
                      setFocusItemId(null);
                      return null;
                    }
                    return (
                      <div className="bg-white border-2 border-blue-500 rounded-xl p-4 space-y-3 shadow-xs relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full translate-x-8 -translate-y-8" />
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-xs font-black text-blue-600">{activeItem.ticketNo}</span>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                            {activeItem.category} • {activeItem.priority}
                          </span>
                        </div>
                        <h4 className="font-sans text-xs font-bold text-slate-800 leading-snug">
                          {activeItem.title}
                        </h4>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => {
                              handleTriggerComplete(activeItem);
                              setFocusItemId(null);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-lg flex items-center gap-1 shadow-3xs cursor-pointer transition-all"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Marcar como Terminado</span>
                          </button>
                          
                          <button
                            onClick={() => setFocusItemId(null)}
                            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-[10px] px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-all"
                          >
                            Quitar Enfoque
                          </button>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-blue-50/50 border border-dashed border-blue-200 rounded-xl p-4.5 text-center text-slate-500 space-y-1">
                    <Target className="w-7 h-7 text-blue-400 mx-auto animate-pulse" />
                    <p className="text-xs font-bold text-slate-700">Sin tique de enfoque seleccionado</p>
                    <p className="text-[9.5px] text-slate-450 max-w-xs mx-auto leading-normal">
                      Selecciona un requerimiento de la lista de abajo para asignarle prioridad mental. Podrás cerrarlo directamente desde este panel.
                    </p>
                  </div>
                )}

                {/* SCROLLABLE LIST OF TODAY'S REQUIREMENTS */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-[190px] pr-1 mt-1">
                  {items.filter(i => i.column === 'today').map(item => (
                    <button
                      key={item.id}
                      onClick={() => setFocusItemId(item.id)}
                      className={`w-full text-left bg-white border rounded-xl p-2.5 flex items-center justify-between gap-3 transition-all cursor-pointer ${
                        focusItemId === item.id 
                          ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/10' 
                          : 'border-slate-200 hover:border-slate-350 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] font-bold text-slate-500">{item.ticketNo}</span>
                          <span className="text-[8px] px-1 py-0.1 bg-slate-100 text-slate-600 rounded">
                            {item.category}
                          </span>
                        </div>
                        <p className="font-sans text-[10.5px] text-slate-700 font-bold truncate leading-snug">
                          {item.title}
                        </p>
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md shrink-0 border ${
                        item.priority === 'Alta' 
                          ? 'bg-rose-50 text-rose-700 border-rose-100' 
                          : item.priority === 'Media' 
                          ? 'bg-amber-50 text-amber-700 border-amber-100' 
                          : 'bg-slate-50 text-slate-500 border-slate-100'
                      }`}>
                        {item.priority}
                      </span>
                    </button>
                  ))}

                  {items.filter(i => i.column === 'today').length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center py-6">No hay tiques planificados para hoy en tu pizarra.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: NOTES SCRATCHPAD */}
          {activeSubTab === 'scratchpad' && (
            <motion.div
              key="workspace-scratch"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="space-y-2.5"
            >
              <div className="bg-white border border-slate-200 p-3 rounded-xl shadow-3xs flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                  <span className="text-[11px] font-sans font-bold text-slate-700">Portapapeles Técnico (Autoguardado)</span>
                </div>
                <button
                  onClick={() => {
                    setScratchpadText('');
                    localStorage.removeItem(keyScratchText);
                    showToast('Bloc de notas libre limpio.');
                  }}
                  className="text-[10px] text-red-600 hover:underline font-bold cursor-pointer bg-transparent border-none"
                >
                  Limpiar bloc
                </button>
              </div>

              <textarea
                value={scratchpadText}
                onChange={handleScratchChange}
                rows={12}
                className="w-full bg-slate-900 text-slate-200 font-mono text-xs p-4 rounded-xl border border-slate-800 shadow-lg focus:outline-none focus:ring-1 focus:ring-purple-500 resize-y"
                placeholder="Escribe tus apuntes técnicos, números de tiques o bitácoras aquí..."
              />
            </motion.div>
          )}

        </AnimatePresence>
        )}
      </div>

      {/* =========================================================================
          MODAL: BIENVENIDA (FIRST TIME)
          ========================================================================= */}
      <AnimatePresence>
        {showWelcomeModal && (
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[10000]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full overflow-hidden flex flex-col"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-black text-slate-900 font-display">¡Bienvenido a tu Daily Workspace!</h2>
                <p className="text-sm text-slate-600 font-sans leading-relaxed">
                  Esta es tu herramienta de <strong>organización y compromiso diario</strong>.
                  Seguimos la metodología Scrum para asegurar el enfoque y la transparencia.
                </p>
                
                <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl text-xs text-slate-700 text-left space-y-3 font-sans mt-4">
                  <p className="font-bold text-blue-800">Cada día nos enfocamos en responder:</p>
                  <ul className="space-y-2 list-none text-slate-600">
                    <li className="flex items-start gap-2"><span className="font-bold text-blue-600">1.</span> ¿Qué hiciste ayer?</li>
                    <li className="flex items-start gap-2"><span className="font-bold text-blue-600">2.</span> ¿Qué harás hoy?</li>
                    <li className="flex items-start gap-2"><span className="font-bold text-blue-600">3.</span> ¿Tienes algún bloqueo?</li>
                  </ul>
                </div>
                
                <div className="pt-6">
                  <button
                    onClick={() => {
                        setShowWelcomeModal(false);
                        safeLocalStorageSet(`fhons_workspace_welcome_shown${suffix}`, 'true');
                        setWorkspaceDate(getRealTodayString());
                        safeLocalStorageSet(keyActiveDate, getRealTodayString());
                    }}
                    className="w-full px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md cursor-pointer"
                  >
                    Comenzar mi Jornada
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          WIZARD MODAL: NUEVO DÍA (NEW DAY TRANSITION WIZARD)
          ========================================================================= */}
      <AnimatePresence>
        {showClearBoardModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden flex flex-col"
            >
              <div className="p-6 text-center space-y-4">
                <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Eraser className="w-8 h-8 text-rose-600" />
                </div>
                <h2 className="text-xl font-black text-slate-800 font-display">Limpiar Tableros</h2>
                <p className="text-sm text-slate-500 font-sans leading-relaxed">
                  ¿Estás seguro que deseas limpiar todos los tableros del Daily Scrum? Esta acción preparará el espacio para un nuevo ciclo y registrará los datos en el historial.
                </p>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowClearBoardModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleClearBoards}
                    className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-colors text-sm shadow-md shadow-rose-200 cursor-pointer"
                  >
                    Limpiar Todo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showNewDayModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-250 shadow-2xl max-w-7xl w-full overflow-hidden flex flex-col max-h-[92vh]"
            >
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 shadow-3xs">
                    <RotateCw className="w-5 h-5 text-amber-500 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-sm text-slate-900 tracking-tight">
                      Planificación Diaria: Transición de Jornada
                    </h3>
                    <p className="font-sans text-[10.5px] text-slate-500 mt-0.5">
                      Cierra el ciclo anterior, planifica la guardia activa de hoy y supervisa impedimentos.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] bg-amber-150/40 text-amber-800 border border-amber-200/50 font-black px-2.5 py-1 rounded-lg font-mono">
                  Paso {newDayStep} de 4
                </span>
              </div>

              {/* Progress Timeline */}
              <div className="px-6 pt-4 pb-2 border-b border-slate-100 shrink-0 bg-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${newDayStep === 1 ? 'bg-indigo-600 text-white shadow-3xs' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>1</span>
                    <div>
                      <span className={`text-[11px] font-black block leading-none ${newDayStep === 1 ? 'text-slate-800' : 'text-slate-400'}`}>Paso 1</span>
                      <span className="text-[9px] text-slate-400 font-medium">Ayer</span>
                    </div>
                  </div>
                  <div className="flex-grow h-0.5 bg-slate-200 mx-3" />
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${newDayStep === 2 ? 'bg-indigo-600 text-white shadow-3xs' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>2</span>
                    <div>
                      <span className={`text-[11px] font-black block leading-none ${newDayStep === 2 ? 'text-slate-800' : 'text-slate-400'}`}>Paso 2</span>
                      <span className="text-[9px] text-slate-400 font-medium">Pendientes</span>
                    </div>
                  </div>
                  <div className="flex-grow h-0.5 bg-slate-200 mx-3" />
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${newDayStep === 3 ? 'bg-indigo-600 text-white shadow-3xs' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>3</span>
                    <div>
                      <span className={`text-[11px] font-black block leading-none ${newDayStep === 3 ? 'text-slate-800' : 'text-slate-400'}`}>Paso 3</span>
                      <span className="text-[9px] text-slate-400 font-medium">Hoy</span>
                    </div>
                  </div>
                  <div className="flex-grow h-0.5 bg-slate-200 mx-3" />
                  <div className="flex items-center gap-2.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black transition-all ${newDayStep === 4 ? 'bg-indigo-600 text-white shadow-3xs' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>4</span>
                    <div>
                      <span className={`text-[11px] font-black block leading-none ${newDayStep === 4 ? 'text-slate-800' : 'text-slate-400'}`}>Paso 4</span>
                      <span className="text-[9px] text-slate-400 font-medium">Bloqueos</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Step Content */}
              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                
                {/* STEP 1: ¿QUÉ HICISTE AYER? */}
                {newDayStep === 1 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fadeIn">
                    <div className="md:col-span-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
                      <div className="p-2 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600 w-fit">
                        <History className="w-5 h-5" />
                      </div>
                      <h4 className="font-display font-black text-xs text-slate-800 uppercase tracking-tight">1. ¿Qué hiciste ayer?</h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Selecciona los requerimientos en los que trabajaste durante tu jornada anterior.
                      </p>
                      <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-2 shadow-3xs">
                         <div className="flex justify-between text-[10px] font-bold text-slate-400">
                           <span>TOTAL PREVIO:</span>
                           <span className="text-slate-800">{items.filter(i => i.column === 'today' || i.column === 'blocked').length}</span>
                         </div>
                         <div className="flex justify-between text-[10px] font-black text-indigo-600">
                           <span>TRABAJADO:</span>
                           <span>{workedTodayIds.length}</span>
                         </div>
                      </div>
                    </div>

                    <div className="md:col-span-8 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                        {items.filter(i => i.column === 'today' || i.column === 'blocked')
                          .concat(completedItems.filter(i => i.completedAt.startsWith(workspaceDate)))
                          .map(item => (
                          <button
                            key={item.id}
                            onClick={() => setWorkedTodayIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                            className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                              workedTodayIds.includes(item.id) 
                                ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-100 shadow-3xs' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-mono text-[9px] font-black text-slate-400">{item.ticketNo}</span>
                              <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${workedTodayIds.includes(item.id) ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                {workedTodayIds.includes(item.id) && <CheckCircle2 className="w-3 h-3" />}
                              </div>
                            </div>
                            <p className="text-[11px] font-bold text-slate-800 line-clamp-2">{item.title}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: ¿QUÉ QUEDÓ INCOMPLETO? */}
                {newDayStep === 2 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fadeIn">
                    <div className="md:col-span-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
                      <div className="p-2 bg-amber-50 border border-amber-100 rounded-xl text-amber-600 w-fit">
                        <Clock className="w-5 h-5" />
                      </div>
                      <h4 className="font-display font-black text-xs text-slate-800 uppercase tracking-tight">2. ¿Qué quedó incompleto?</h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        De lo que trabajaste ayer, ¿cuáles tareas todavía no están terminadas? Estas pasarán a estado "En Progreso Retrasado".
                      </p>
                      <div className="bg-white border border-slate-150 rounded-xl p-3 space-y-2 shadow-3xs">
                         <div className="flex justify-between text-[10px] font-bold text-slate-400">
                           <span>TRABAJADO:</span>
                           <span className="text-slate-800">{workedTodayIds.length}</span>
                         </div>
                         <div className="flex justify-between text-[10px] font-black text-amber-600">
                           <span>INCOMPLETO:</span>
                           <span>{incompleteWorkedIds.length}</span>
                         </div>
                      </div>
                    </div>

                    <div className="md:col-span-8 space-y-3">
                      {workedTodayIds.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium">No marcaste ninguna tarea como trabajada ayer.</div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                          {items.filter(i => workedTodayIds.includes(i.id)).map(item => (
                            <button
                              key={item.id}
                              onClick={() => setIncompleteWorkedIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id])}
                              className={`flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                                incompleteWorkedIds.includes(item.id) 
                                  ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-100 shadow-3xs' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-[9px] font-black text-slate-400">{item.ticketNo}</span>
                                <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${incompleteWorkedIds.includes(item.id) ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300'}`}>
                                  {incompleteWorkedIds.includes(item.id) && <AlertCircle className="w-3 h-3" />}
                                </div>
                              </div>
                              <p className="text-[11px] font-bold text-slate-800 line-clamp-2">{item.title}</p>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* STEP 3: ¿QUÉ VAS A TRABAJAR HOY? */}
                {newDayStep === 3 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fadeIn">
                    <div className="md:col-span-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
                      <div className="p-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 w-fit">
                        <Target className="w-5 h-5" />
                      </div>
                      <h4 className="font-display font-black text-xs text-slate-800 uppercase tracking-tight">3. ¿Qué vas a trabajar hoy?</h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Confirma tus tareas prioritarias para hoy. Incluimos las que quedaron pendientes y puedes agregar nuevas.
                      </p>
                      
                      <div className="space-y-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Añadir Tarea Rápida</p>
                        <div className="flex flex-col gap-2">
                          <input 
                            type="text"
                            placeholder="Título de la tarea..."
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-100 outline-none"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const val = e.currentTarget.value;
                                if (val) {
                                  setNewBacklogTasks(prev => [...prev, {
                                    id: `new_${Date.now()}`,
                                    ticketNo: `T-${Math.floor(Math.random()*9000)+1000}`,
                                    title: val,
                                    category: 'Requerimiento',
                                    priority: 'Media',
                                    column: 'today',
                                    delayDays: 0
                                  }]);
                                  e.currentTarget.value = '';
                                }
                              }
                            }}
                          />
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                              <div className="w-full border-t border-slate-200"></div>
                            </div>
                            <div className="relative flex justify-center text-[8px] font-bold uppercase tracking-tighter">
                              <span className="bg-slate-50 px-2 text-slate-400">o también</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setDrawerMode('today');
                              setDrawerActiveTab('assigned');
                              setIsDrawerOpen(true);
                            }}
                            className="w-full py-2 px-3 rounded-lg bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5" />
                            Consultar Catálogo / Asignaciones
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-8 space-y-4">
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compromiso para Hoy</h5>
                        <div className="grid grid-cols-1 gap-2 max-h-[350px] overflow-y-auto pr-1">
                          {/* Delayed from yesterday */}
                          {items.filter(i => (i.column === 'today' || i.column === 'blocked') && !workedTodayIds.includes(i.id)).map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-rose-50/30 border border-rose-100 rounded-xl">
                              <div className="flex items-center gap-3">
                                <Clock className="w-3.5 h-3.5 text-rose-500" />
                                <div>
                                  <p className="text-[11px] font-bold text-slate-800">{item.title}</p>
                                  <span className="text-[9px] font-bold text-rose-600 uppercase">Retrasado • {item.delayDays || 0}d</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* Incomplete from yesterday */}
                          {items.filter(i => incompleteWorkedIds.includes(i.id)).map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-amber-50/30 border border-amber-100 rounded-xl">
                              <div className="flex items-center gap-3">
                                <History className="w-3.5 h-3.5 text-amber-500" />
                                <div>
                                  <p className="text-[11px] font-bold text-slate-800">{item.title}</p>
                                  <span className="text-[9px] font-bold text-amber-600 uppercase">Pendiente de ayer</span>
                                </div>
                              </div>
                            </div>
                          ))}
                          {/* New backlog tasks */}
                          {newBacklogTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl group">
                              <div className="flex items-center gap-3">
                                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                                <p className="text-[11px] font-bold text-slate-800">{task.title}</p>
                              </div>
                              <button 
                                onClick={() => setNewBacklogTasks(prev => prev.filter(t => t.id !== task.id))}
                                className="opacity-0 group-hover:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 4: ¿TIENES ALGÚN BLOQUEANTE? */}
                {newDayStep === 4 && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 animate-fadeIn">
                    <div className="md:col-span-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-4">
                      <div className="p-2 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 w-fit">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <h4 className="font-display font-black text-xs text-slate-800 uppercase tracking-tight">4. ¿Tienes algún bloqueante?</h4>
                      <p className="text-[10.5px] text-slate-500 leading-relaxed">
                        Si alguna de tus tareas para hoy depende de un tercero o está detenida, regístrala aquí.
                      </p>

                      <div className="pt-2">
                        <button
                          onClick={() => {
                            setDrawerMode('blocked');
                            setDrawerActiveTab('contractors');
                            setIsDrawerOpen(true);
                          }}
                          className="w-full py-2.5 px-3 rounded-lg bg-white border border-rose-200 text-rose-600 text-[10px] font-bold uppercase tracking-wider hover:bg-rose-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Vincular Ticket Contratista
                        </button>
                      </div>
                    </div>

                    <div className="md:col-span-8 space-y-4">
                      <div className="grid grid-cols-1 gap-3 max-h-[400px] overflow-y-auto pr-1">
                        {[
                          ...items.filter(i => (i.column === 'today' || i.column === 'blocked') && !workedTodayIds.includes(i.id)),
                          ...items.filter(i => incompleteWorkedIds.includes(i.id)),
                          ...newBacklogTasks
                        ].map(item => (
                          <div key={item.id} className={`p-4 rounded-xl border transition-all ${blockerInfos[item.id] ? 'bg-rose-50/50 border-rose-300 ring-2 ring-rose-100' : 'bg-white border-slate-200'}`}>
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-[11px] font-bold text-slate-800">{item.title}</p>
                                <span className="text-[9px] font-mono font-black text-slate-400">{item.ticketNo}</span>
                              </div>
                              <button
                                onClick={() => {
                                  if (blockerInfos[item.id]) {
                                    const next = { ...blockerInfos };
                                    delete next[item.id];
                                    setBlockerInfos(next);
                                  } else {
                                    setBlockerInfos({
                                      ...blockerInfos,
                                      [item.id]: { reason: '', followUp: new Date(Date.now() + 86400000).toISOString().split('T')[0] }
                                    });
                                  }
                                }}
                                className={`px-3 py-1 rounded-lg text-[10px] font-black border transition-all ${
                                  blockerInfos[item.id] 
                                    ? 'bg-rose-600 border-rose-600 text-white shadow-3xs' 
                                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                              >
                                {blockerInfos[item.id] ? 'BLOQUEADO' : 'MARCAR BLOQUEO'}
                              </button>
                            </div>

                            {blockerInfos[item.id] && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-rose-100">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-rose-800 uppercase">Motivo del Bloqueo</label>
                                  <input 
                                    type="text"
                                    value={blockerInfos[item.id].reason}
                                    onChange={(e) => setBlockerInfos({...blockerInfos, [item.id]: { ...blockerInfos[item.id], reason: e.target.value }})}
                                    placeholder="Ej: Esperando respuesta de cliente..."
                                    className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:ring-1 focus:ring-rose-400 outline-none"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-black text-rose-800 uppercase">Fecha de Seguimiento</label>
                                  <input 
                                    type="date"
                                    value={blockerInfos[item.id].followUp}
                                    onChange={(e) => setBlockerInfos({...blockerInfos, [item.id]: { ...blockerInfos[item.id], followUp: e.target.value }})}
                                    className="w-full bg-white border border-rose-200 rounded-lg px-2.5 py-1.5 text-[11px] focus:ring-1 focus:ring-rose-400 outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer buttons */}
              <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setShowNewDayModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer transition-all"
                >
                  Cancelar
                </button>

                <div className="flex gap-2">
                  {newDayStep > 1 && (
                    <button
                      type="button"
                      onClick={() => setNewDayStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)}
                      className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-250 hover:bg-slate-50 rounded-lg cursor-pointer transition-all"
                    >
                      Anterior
                    </button>
                  )}
                  
                  {newDayStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setNewDayStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)}
                      className="px-6 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer shadow-lg shadow-indigo-200 transition-all flex items-center gap-2"
                    >
                      Siguiente
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleExecuteNewDay}
                      className="px-8 py-2 text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
                    >
                      <RotateCw className="w-4 h-4" />
                      Iniciar Jornada
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: JUSTIFICAR ELIMINACIÓN */}
      <AnimatePresence>
        {deletingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center gap-2.5">
                <div className="p-1.5 bg-red-50 border border-red-100 rounded-lg text-red-500">
                  <Trash2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xs text-slate-900">
                    Justificar Eliminación de Requerimiento
                  </h3>
                  <p className="font-sans text-[10px] text-slate-500 leading-none mt-0.5">
                    Especifica el motivo de descarte para los reportes diarios
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p><span className="font-extrabold text-slate-700">Tique:</span> <span className="font-mono font-bold text-red-700">{deletingItem.ticketNo}</span></p>
                  <p className="line-clamp-2"><span className="font-extrabold text-slate-700">Título:</span> {deletingItem.title}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">
                    Motivo principal de descarte
                  </label>
                  <select
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="Prioridad de negocio cambiada">Prioridad de negocio cambiada</option>
                    <option value="Tique duplicado o inválido">Tique duplicado o inválido</option>
                    <option value="Requerimiento ya completado">Requerimiento ya completado / obsoleto</option>
                    <option value="Error de asignación o fuera de alcance">Error de asignación o fuera de alcance</option>
                    <option value="Otro motivo especificado en notas">Otro (especificar en notas)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">
                    Notas adicionales / Justificación (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={deleteNotes}
                    onChange={(e) => setDeleteNotes(e.target.value)}
                    placeholder="Escribe aquí notas sobre por qué se descarta el requerimiento..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-red-500 resize-none font-sans"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDeletingItem(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar con Justificación
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: COMPLETAR REQUERIMIENTO */}
      <AnimatePresence>
        {completingItem && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden flex flex-col"
            >
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 flex items-center gap-2.5">
                <div className="p-1.5 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-xs text-slate-900">
                    Completar Requerimiento
                  </h3>
                  <p className="font-sans text-[10px] text-slate-500 leading-none mt-0.5">
                    Registra la resolución exitosa del tique
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-[11px] text-slate-650 space-y-1">
                  <p><span className="font-extrabold text-slate-750">Tique:</span> <span className="font-mono font-bold text-emerald-700">{completingItem.ticketNo}</span></p>
                  <p className="line-clamp-2"><span className="font-extrabold text-slate-750">Título:</span> {completingItem.title}</p>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">
                    Notas de resolución / Detalles técnicos (Opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={completionNotes}
                    onChange={(e) => setCompletionNotes(e.target.value)}
                    placeholder="Escribe notas sobre la solución aplicada o número de cambio final..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 resize-none font-sans"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border-t border-slate-200 px-5 py-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCompletingItem(null)}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmComplete}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Marcar como Terminado
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DRAWER: CATÁLOGO Y ASIGNACIONES */}
      <AnimatePresence>
        {isDrawerOpen && (
          <div className="fixed inset-0 z-[9999] overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            
            {/* Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute right-0 top-0 bottom-0 w-full max-w-2xl bg-white shadow-2xl flex flex-col border-l border-slate-200"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
                        {drawerMode === 'today' ? 'Añadir Trabajo para Hoy' : 'Vincular Bloqueante Externo'}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {drawerMode === 'today' ? 'Catálogo de Pendientes y Asignaciones' : 'Consulta de Tickets de Contratistas'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    value={drawerSearch}
                    onChange={(e) => setDrawerSearch(e.target.value)}
                    placeholder="Buscar por título, ID o descripción..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-100 outline-none shadow-sm"
                  />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-slate-100 px-6 bg-white overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setDrawerActiveTab('assigned')}
                  className={`flex-1 py-3 px-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${drawerActiveTab === 'assigned' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Mis Asignaciones
                </button>
                <button
                  onClick={() => setDrawerActiveTab('tasks')}
                  className={`flex-1 py-3 px-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${drawerActiveTab === 'tasks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Tareas / Recurrentes
                </button>
                <button
                  onClick={() => setDrawerActiveTab('contractors')}
                  className={`flex-1 py-3 px-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${drawerActiveTab === 'contractors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Contratistas
                </button>
                <button
                  onClick={() => setDrawerActiveTab('manual')}
                  className={`flex-1 py-3 px-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${drawerActiveTab === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                >
                  Manual
                </button>
              </div>

              {/* List Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                {drawerActiveTab === 'assigned' && (
                  <div className="space-y-3">
                    {filteredAssigned.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                          <ClipboardList className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-400 font-medium">No se encontraron asignaciones activas.</p>
                      </div>
                    ) : (
                      filteredAssigned.map((item, idx) => (
                        <div 
                          key={idx}
                          onClick={() => handleSelectItemFromDrawer(item, 'assigned')}
                          className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-[10px] font-black text-indigo-600">#REQ-{item.ID}</span>
                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase border ${item.Priority === 'High' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                              {item.Priority || 'Media'}
                            </span>
                          </div>
                          <h4 className="text-[11.5px] font-bold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors">
                            {item.Subject || item.Título}
                          </h4>
                          <div className="flex items-center gap-2 mt-3 text-[9px] text-slate-400 font-medium">
                            <User className="w-3 h-3" />
                            <span>Asignado a ti</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {drawerActiveTab === 'tasks' && (
                  <div className="space-y-3">
                    {filteredInternalTasks.filter(t => isAgentMatch(t.assignedToId || '')).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                          <RotateCw className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-400 font-medium">No hay tareas internas asignadas a ti.</p>
                      </div>
                    ) : (
                      filteredInternalTasks.filter(t => isAgentMatch(t.assignedToId || '')).map((task) => (
                        <div 
                          key={task.id}
                          onClick={() => handleSelectItemFromDrawer(task, 'internal')}
                          className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-[10px] font-black text-emerald-600">{task.ticketId || '#INT-TASK'}</span>
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase border bg-emerald-50 text-emerald-600 border-emerald-100">
                              {task.type}
                            </span>
                          </div>
                          <h4 className="text-[11.5px] font-bold text-slate-800 leading-snug">
                            {task.title}
                          </h4>
                          {task.frequency && (
                            <div className="flex items-center gap-2 mt-3 text-[9px] text-emerald-600 font-black uppercase">
                              <RotateCw className="w-3 h-3" />
                              <span>{task.frequency}</span>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {drawerActiveTab === 'contractors' && (
                  <div className="space-y-3">
                    {filteredContractorTasks.filter(t => isAgentMatch(t.supervisorAgentId || '')).length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300">
                          <Users className="w-6 h-6" />
                        </div>
                        <p className="text-xs text-slate-400 font-medium">No tienes tickets de contratistas asignados.</p>
                      </div>
                    ) : (
                      filteredContractorTasks.filter(t => isAgentMatch(t.supervisorAgentId || '')).map((task) => (
                        <div 
                          key={task.id}
                          onClick={() => handleSelectItemFromDrawer(task, 'contractor')}
                          className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-amber-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-mono text-[10px] font-black text-amber-600">{task.ticketId || '#CONT-TICKET'}</span>
                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase border bg-amber-50 text-amber-600 border-amber-100">
                              CONTRATISTA
                            </span>
                          </div>
                          <h4 className="text-[11.5px] font-bold text-slate-800 leading-snug">
                            {task.title}
                          </h4>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-2 text-[9px] text-slate-400 font-medium">
                              <User className="w-3 h-3" />
                              <span>{task.contractorName}</span>
                            </div>
                            <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 uppercase">
                              {task.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {drawerActiveTab === 'manual' && (
                   <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Título de la Tarea</label>
                        <input 
                          id="manual-title"
                          type="text"
                          placeholder="Escribe el nombre de la tarea..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Prioridad</label>
                        <select 
                          id="manual-priority"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                        >
                          <option value="Media">Media</option>
                          <option value="Baja">Baja</option>
                          <option value="Alta">Alta</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          const titleInput = document.getElementById('manual-title') as HTMLInputElement;
                          const prioritySelect = document.getElementById('manual-priority') as HTMLSelectElement;
                          if (titleInput.value) {
                            handleSelectItemFromDrawer({
                              ID: null,
                              Subject: titleInput.value,
                              Priority: prioritySelect.value
                            }, 'assigned'); // Treat as manual
                          }
                        }}
                        className="w-full py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Agregar a Mi Jornada
                      </button>
                   </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
                 <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                   TIER MASTER WORKSPACE &bull; CONTROL TÉCNICO
                 </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL - REFINED PROPORTIONS */}
      <AnimatePresence>
        {viewingItem && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[9999]">
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden flex flex-col"
            >
              {/* Header with Ticket ID */}
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] font-black text-slate-400 uppercase tracking-wider">{viewingItem.ticketNo}</span>
                    <span className="block text-[9px] font-bold text-indigo-500 uppercase tracking-tight">Detalles del Requerimiento</span>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingItem(null)}
                  className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Title and Category */}
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                      viewingItem.category === 'Incidente' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                      viewingItem.category === 'Requerimiento' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                      viewingItem.category === 'Cambio' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {viewingItem.category}
                    </span>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${
                      viewingItem.priority === 'Alta' ? 'bg-rose-100 text-rose-700 border-rose-200' : 
                      viewingItem.priority === 'Media' ? 'bg-amber-100 text-amber-700 border-amber-200' : 
                      'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      Prioridad {viewingItem.priority}
                    </span>
                  </div>
                  <h3 className="font-display font-extrabold text-base text-slate-900 leading-tight">
                    {viewingItem.title}
                  </h3>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Layout className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estado</span>
                    </div>
                    <span className="text-[11px] font-black text-slate-700 uppercase">
                      {viewingItem.column === 'today' ? '📍 Para Hoy' : 
                       viewingItem.column === 'blocked' ? '🛑 Bloqueado' : 
                       '📅 Histórico'}
                    </span>
                  </div>
                  <div className="bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Antigüedad</span>
                    </div>
                    <span className={`text-[11px] font-black ${viewingItem.delayDays && viewingItem.delayDays > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {viewingItem.delayDays || 0} Días en curso
                    </span>
                  </div>
                </div>

                {/* Description / Notes area */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Observaciones / Notas</span>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 min-h-[80px]">
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {viewingItem.notes || "No se han registrado observaciones adicionales para este requerimiento."}
                    </p>
                  </div>
                </div>

                {/* Specialized Context: Blocked Section */}
                {viewingItem.column === 'blocked' && (
                  <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-800 font-bold text-[10px] uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4" />
                        Control de Seguimiento
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2.5">
                       <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Próximo Seguimiento</span>
                        <input 
                          type="date" 
                          value={viewingItem.followUpDate || ''}
                          onChange={(e) => handleUpdateFollowUp(viewingItem.id, e.target.value)}
                          className="bg-transparent text-[11px] font-black text-slate-700 outline-none cursor-pointer"
                        />
                      </div>
                      <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-amber-100">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Alertas Activas</span>
                        <button
                          onClick={() => handleToggleReminder(viewingItem.id)}
                          className={`px-3 py-1 rounded-md transition-all flex items-center gap-1.5 text-[10px] font-black ${
                            viewingItem.hasReminder 
                              ? 'bg-blue-600 text-white' 
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <Bell className={`w-3 h-3 ${viewingItem.hasReminder ? 'animate-bounce' : ''}`} />
                          {viewingItem.hasReminder ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Refined Action Footer */}
              <div className="px-5 py-4 bg-slate-50/80 border-t border-slate-100 flex gap-2">
                {viewingItem.column === 'today' && (
                  <>
                    <button 
                      onClick={() => {
                        handleTriggerComplete(viewingItem);
                        setViewingItem(null);
                      }}
                      className="flex-[2] bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      MARCAR COMPLETADO
                    </button>
                    <button
                      onClick={() => {
                        handleMoveBetweenTodayAndBlocked(viewingItem.id, 'blocked');
                        setViewingItem(null);
                      }}
                      className="flex-1 bg-white border border-slate-200 hover:bg-amber-50 text-slate-600 hover:text-amber-700 text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <Pause className="w-3.5 h-3.5" />
                      BLOQUEAR
                    </button>
                  </>
                )}
                {viewingItem.column === 'blocked' && (
                  <button
                    onClick={() => {
                      handleMoveBetweenTodayAndBlocked(viewingItem.id, 'today');
                      setViewingItem(null);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4" />
                    REANUDAR TAREA
                  </button>
                )}
                <button
                  onClick={() => {
                    handleTriggerDelete(viewingItem);
                    setViewingItem(null);
                  }}
                  className="px-3 bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 text-slate-400 hover:text-rose-600 rounded-xl transition-all cursor-pointer"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
