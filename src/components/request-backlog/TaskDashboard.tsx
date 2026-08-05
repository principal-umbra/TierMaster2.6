import React, { useState, useMemo, useRef, useEffect } from 'react';
import { InternalTask, ContractorTask, CRMData, Agent, RecurrenceConfig } from '../../types';
import { saveSingleInternalTask, deleteSingleInternalTask } from '../../db/firebaseService';
import { 
  Briefcase, 
  User, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Plus, 
  Calendar, 
  Trash2, 
  Edit2, 
  Play, 
  Check, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  Layers, 
  Tag, 
  FileText,
  ListTodo,
  CheckSquare,
  Square,
  Link,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Flame,
  ArrowUpRight,
  TrendingUp,
  BarChart2,
  Pin,
  MoreVertical,
  History,
  BookOpen,
  Zap,
  Sparkles,
  BadgeDollarSign,
  Receipt,
  Copy,
  Send,
  Handshake,
  FileCheck,
  Scale,
  Building,
  Cpu,
  ShieldAlert
} from 'lucide-react';

import { ChecklistItemView } from './ChecklistItemView';

interface TaskDashboardProps {
  tasks: InternalTask[];
  setInternalTasks?: React.Dispatch<React.SetStateAction<InternalTask[]>>;
  onPushTareasToSheet?: (intTasks: InternalTask[], contTasks: ContractorTask[]) => Promise<void>;
  contractorTasks?: ContractorTask[];
  crmData?: CRMData;
  currentUser?: { username: string; name: string; email: string; role?: string } | null;
  agents: Agent[];
  initialTaskId?: string | null;
}

export const TaskDashboard: React.FC<TaskDashboardProps> = ({ 
  tasks = [], 
  setInternalTasks, 
  onPushTareasToSheet,
  contractorTasks = [],
  crmData,
  currentUser, 
  agents = [],
  initialTaskId = null
}) => {
  const [view, setView] = useState<'global' | 'mine'>('global');
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'Puntual' | 'Programada' | 'Recurrente'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'Baja' | 'Media' | 'Alta' | 'Crítica'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Local notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modal State for scheduling/creating tasks
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBacklogRow, setSelectedBacklogRow] = useState<Record<string, string> | null>(null);
  const [editingTask, setEditingTask] = useState<InternalTask | null>(null);

  // Detailed view of a task (to see and interact with checklists easily)
  const [activeTaskDetailId, setActiveTaskDetailId] = useState<string | null>(initialTaskId);

  useEffect(() => {
    if (initialTaskId) {
      setActiveTaskDetailId(initialTaskId);
    }
  }, [initialTaskId]);
  const [deleteConfirmTaskId, setDeleteConfirmTaskId] = useState<string | null>(null);
  const [recurrenceConfirmTaskId, setRecurrenceConfirmTaskId] = useState<string | null>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<'details' | 'checklist' | 'timeline' | 'documentation' | 'recurrence'>('details');
  const [threeDotMenuOpen, setThreeDotMenuOpen] = useState(false);
  const [newTimelineText, setNewTimelineText] = useState('');
  const [isEditingDocs, setIsEditingDocs] = useState(false);
  const [documentationDraft, setDocumentationDraft] = useState('');

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formAssignedToId, setFormAssignedToId] = useState('');
  const [formType, setFormType] = useState<'Interna' | 'Programada' | 'Recurrente'>('Interna');
  const [formFrequency, setFormFrequency] = useState<'Única' | 'Diario' | 'Semanal' | 'Mensual' | 'Anual'>('Única');
  const [formScheduledDate, setFormScheduledDate] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formTicketId, setFormTicketId] = useState('');
  const [formPriority, setFormPriority] = useState<'Baja' | 'Media' | 'Alta' | 'Crítica'>('Media');
  const [formCategory, setFormCategory] = useState<string>('Soporte');
  const [formEffortEstimate, setFormEffortEstimate] = useState<string>('Medio (1h - 4h)');
  const [formScheduledTime, setFormScheduledTime] = useState('09:00');
  const [formHasEndDate, setFormHasEndDate] = useState(false);
  const [formRecurrenceEndDate, setFormRecurrenceEndDate] = useState('');
  const [formRecurrenceDays, setFormRecurrenceDays] = useState<string[]>([]);
  const [formSecondaryDates, setFormSecondaryDates] = useState<string[]>([]);
  const [newSecondaryDate, setNewSecondaryDate] = useState('');
  
  // Additional technical/client detail states
  const [formScope, setFormScope] = useState<'Cliente' | 'Interna'>('Cliente');
  const [formShowInBitacora, setFormShowInBitacora] = useState<boolean>(false);
  const [formClientName, setFormClientName] = useState('');
  const [formClientRole, setFormClientRole] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formAssignedRole, setFormAssignedRole] = useState('');
  const [formItems, setFormItems] = useState<Array<{ name: string; qty: number; price: number; tag: string }>>([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemPrice, setNewItemPrice] = useState(0);
  const [newItemTag, setNewItemTag] = useState('Hardware');
  
  // Interactive checklist during creation/editing
  const [formSubtasks, setFormSubtasks] = useState<Array<{ id: string; title: string; completed: boolean }>>([]);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  
  // Inline/card checklist input state
  const [inlineSubtaskText, setInlineSubtaskText] = useState<{ [taskId: string]: string }>({});
  
  // Checklist creation state (for modal)
  const [creatingChecklistFor, setCreatingChecklistFor] = useState<string | null>(null);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');

  // Rich Checklist extension states
  const [editingChecklistId, setEditingChecklistId] = useState<string | null>(null);
  const [editingChecklistTitle, setEditingChecklistTitle] = useState<string>('');
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState<boolean>(false);
  const [checklistFilterTab, setChecklistFilterTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [checklistSearchQuery, setChecklistSearchQuery] = useState<string>('');
  
  // Recurrence configuration form state
  const [recurrenceSubTab, setRecurrenceSubTab] = useState<'rules' | 'checklist' | 'wiki'>('rules');
  const [recurrenceCustomChecklists, setRecurrenceCustomChecklists] = useState<Array<{ id: string; title: string; items: string[] }>>([]);
  const [recurrenceCustomChecklistItems, setRecurrenceCustomChecklistItems] = useState<string[]>([]);
  const [newCustomChecklistItem, setNewCustomChecklistItem] = useState<string>('');
  const [recurrenceEditingChecklistId, setRecurrenceEditingChecklistId] = useState<string | null>(null);
  const [recurrenceEditingChecklistTitle, setRecurrenceEditingChecklistTitle] = useState<string>('');
  const [recurrenceNewChecklistTitle, setRecurrenceNewChecklistTitle] = useState<string>('');
  const [recurrenceCreatingChecklist, setRecurrenceCreatingChecklist] = useState<boolean>(false);
  const [recurrenceInlineItemText, setRecurrenceInlineItemText] = useState<Record<string, string>>({});
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceNextExecDate, setRecurrenceNextExecDate] = useState<string>('');
  const [recurrenceCreationDelay, setRecurrenceCreationDelay] = useState<number>(1);
  const [recurrenceInvolvedAgents, setRecurrenceInvolvedAgents] = useState<string[]>([]);
  const [recurrencePrebuiltChecklists, setRecurrencePrebuiltChecklists] = useState<string[]>([]);
  const [recurrencePrebuiltWiki, setRecurrencePrebuiltWiki] = useState<string>('');
  const [recurrenceKeepHistory, setRecurrenceKeepHistory] = useState<boolean>(true);

  // Ref for the scrollable left column of checklists
  const leftColumnRef = useRef<HTMLDivElement>(null);

  // Expandable checklist items on cards
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);

  // Synchronize Recurrence Power Tool state when task or tab changes
  useEffect(() => {
    if (activeTaskDetailId) {
      const activeTask = tasks.find(t => t.id === activeTaskDetailId);
      if (activeTask) {
        const config = activeTask.recurrenceConfig;
        setRecurrenceFrequency(config?.frequency || 'weekly');
        setRecurrenceInterval(config?.interval || 1);
        setRecurrenceNextExecDate(config?.nextExecutionDate || activeTask.scheduledDate || new Date().toISOString().split('T')[0]);
        setRecurrenceCreationDelay(config?.creationDelayDays ?? 1);
        setRecurrenceInvolvedAgents(config?.involvedAgentIds || (activeTask.assignedToId ? [activeTask.assignedToId] : []));
        setRecurrencePrebuiltChecklists(config?.includePrebuiltChecklists || []);
        setRecurrenceCustomChecklistItems(config?.customChecklistItems || []);
        if (config?.customChecklists) {
          setRecurrenceCustomChecklists(config.customChecklists);
        } else if (config?.customChecklistItems && config.customChecklistItems.length > 0) {
          setRecurrenceCustomChecklists([{
            id: 'CL-DEFAULT',
            title: '📋 Checklist de la Serie',
            items: config.customChecklistItems
          }]);
        } else {
          setRecurrenceCustomChecklists([]);
        }
        setRecurrencePrebuiltWiki(config?.includeWikiDocs?.[0] || activeTask.documentation || '');
        setRecurrenceKeepHistory(config?.keepHistoryInTimeline ?? true);
        setRecurrenceSubTab('rules');
      }
    }
  }, [activeTaskDetailId, activeDetailTab, tasks]);


  // Auto-hide notification helper
  const triggerNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Find current agent
  const currentAgent = useMemo(() => {
    if (!currentUser) return null;
    return agents.find(a => 
      a.email === currentUser.email || 
      a.name === currentUser.name || 
      a.username === currentUser.username
    );
  }, [currentUser, agents]);

  // Extract all available tickets from CRM data to allow easy linking in the dropdown
  const crmTicketsList = useMemo(() => {
    if (!crmData || !crmData.rows) return [];
    return crmData.rows.map(row => ({
      id: row["ID"] || '',
      subject: row["Subject"] || row["summary"] || 'Ticket sin asunto',
      account: row["Account"] || 'Sin Cuenta'
    })).filter(t => t.id);
  }, [crmData]);

  // Filter and process Active Tasks
  const filteredTasks = useMemo(() => {
    let list = tasks;

    // Filter by view ('mine' vs 'global')
    if (view === 'mine' && currentAgent) {
      list = list.filter(t => t.assignedToId === currentAgent.id);
    }

    // Filter by Task Type
    if (taskTypeFilter !== 'all') {
      if (taskTypeFilter === 'Puntual') {
        list = list.filter(t => t.type === 'Interna' || t.frequency === 'Única');
      } else if (taskTypeFilter === 'Programada') {
        list = list.filter(t => t.type === 'Programada');
      } else if (taskTypeFilter === 'Recurrente') {
        list = list.filter(t => t.type === 'Recurrente' || (t.frequency && t.frequency !== 'Única'));
      }
    }

    // Filter by Priority
    if (priorityFilter !== 'all') {
      list = list.filter(t => (t.priority || 'Media') === priorityFilter);
    }

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.notes || '').toLowerCase().includes(q) ||
        (t.ticketId || '').toLowerCase().includes(q) ||
        (t.subtasks || []).some(sub => sub.title.toLowerCase().includes(q))
      );
    }

    // Filter by scheduled creation date (only show once scheduled creation date has arrived)
    list = list.filter(t => {
      if (t.recurrenceConfig?.nextCreationDate) {
        const createDateStr = t.recurrenceConfig.nextCreationDate;
        const todayStr = new Date().toISOString().split('T')[0];
        return todayStr >= createDateStr;
      }
      return true;
    });

    return list;
  }, [tasks, view, currentAgent, taskTypeFilter, priorityFilter, searchQuery]);

  // Metrics summary
  const metrics = useMemo(() => {
    const pendingCount = tasks.filter(t => t.status === 'Pendiente').length;
    const inProgressCount = tasks.filter(t => t.status === 'En proceso').length;
    const completedCount = tasks.filter(t => t.status === 'Completado').length;
    const recurringCount = tasks.filter(t => t.type === 'Recurrente').length;

    // Percentage of subtasks completed overall
    let totalSubtasks = 0;
    let completedSubtasks = 0;
    tasks.forEach(t => {
      if (t.subtasks && t.subtasks.length > 0) {
        totalSubtasks += t.subtasks.length;
        completedSubtasks += t.subtasks.filter(s => s.completed).length;
      }
    });
    const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    return {
      pendingCount,
      inProgressCount,
      completedCount,
      recurringCount,
      totalSubtasks,
      completedSubtasks,
      subtaskProgress
    };
  }, [tasks]);

  // Open modal to create a task (can be pre-filled from backlog row)
  const openCreateModal = (backlogRow?: Record<string, string>) => {
    setEditingTask(null);
    setFormSubtasks([]);
    setNewSubtaskText('');
    setFormCategory('Soporte');
    setFormEffortEstimate('Medio (1h - 4h)');
    setFormScheduledTime('09:00');
    setFormHasEndDate(false);
    setFormRecurrenceEndDate('');
    setFormRecurrenceDays([]);
    setFormSecondaryDates([]);
    setNewSecondaryDate('');
    setFormCategory('Soporte');
    setFormEffortEstimate('Medio (1h - 4h)');
    
    // Clear and initialize our custom details states
    setFormScope('Cliente');
    setFormShowInBitacora(false);
    setFormClientName(backlogRow ? (backlogRow["Account"] || backlogRow["Client Name"] || '') : '');
    setFormClientRole(backlogRow ? (backlogRow["Client Role"] || '') : '');
    setFormVersion('');
    setFormAssignedRole('');
    setFormItems([]);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemTag('Hardware');
    
    if (backlogRow) {
      setSelectedBacklogRow(backlogRow);
      setFormTitle(backlogRow["Subject"] || backlogRow["summary"] || 'Tarea desde Backlog');
      setFormTicketId(backlogRow["ID"] || '');
      setFormNotes(backlogRow["Subject"] || '');
      
      const rowAssigned = backlogRow["Assigned To"] || backlogRow["Técnico Asignado"] || '';
      const matchedAgent = agents.find(a => 
        a.name.toLowerCase().includes(rowAssigned.toLowerCase()) || 
        a.email.toLowerCase().includes(rowAssigned.toLowerCase())
      );
      setFormAssignedToId(matchedAgent ? matchedAgent.id : (currentAgent ? currentAgent.id : ''));
      setFormPriority('Alta');
    } else {
      setSelectedBacklogRow(null);
      setFormTitle('');
      setFormTicketId('');
      setFormNotes('');
      setFormAssignedToId(currentAgent ? currentAgent.id : '');
      setFormPriority('Media');
    }
    setFormType('Interna');
    setFormFrequency('Única');
    setFormScheduledDate(new Date().toISOString().split('T')[0]);
    setIsModalOpen(true);
  };

  // Open modal to edit an existing task
  const openEditModal = (task: InternalTask, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTask(task);
    setSelectedBacklogRow(null);
    setFormTitle(task.title);
    setFormAssignedToId(task.assignedToId);
    setFormType(task.type);
    setFormFrequency(task.frequency || 'Única');
    setFormScheduledDate(task.scheduledDate || '');
    setFormNotes(task.notes || '');
    setFormTicketId(task.ticketId || '');
    setFormPriority(task.priority || 'Media');
    setFormCategory(task.category || 'Soporte');
    setFormEffortEstimate(task.effortEstimate || 'Medio (1h - 4h)');
    setFormScheduledTime(task.scheduledTime || '09:00');
    setFormHasEndDate(task.hasEndDate || false);
    setFormRecurrenceEndDate(task.recurrenceEndDate || '');
    setFormRecurrenceDays(task.recurrenceDays || []);
    setFormSecondaryDates(task.secondaryDates || []);
    setNewSecondaryDate('');
    setFormSubtasks(task.subtasks ? [...task.subtasks] : []);
    setNewSubtaskText('');
    
    // Load existing custom detail values
    setFormScope(task.scope || 'Cliente');
    setFormShowInBitacora(task.showInBitacora || false);
    setFormClientName(task.clientName || '');
    setFormClientRole(task.clientRole || '');
    setFormVersion(task.version || '');
    setFormAssignedRole(task.assignedRole || '');
    setFormItems(task.items ? [...task.items] : []);
    setNewItemName('');
    setNewItemQty(1);
    setNewItemPrice(0);
    setNewItemTag('Hardware');
    
    setIsModalOpen(true);
  };

  // Add subtask item in form
  const handleAddFormSubtask = () => {
    if (!newSubtaskText.trim()) return;
    const newItem = {
      id: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: newSubtaskText.trim(),
      completed: false
    };
    setFormSubtasks([...formSubtasks, newItem]);
    setNewSubtaskText('');
  };

  // Remove subtask item in form
  const handleRemoveFormSubtask = (id: string) => {
    setFormSubtasks(formSubtasks.filter(item => item.id !== id));
  };

  // Add a secondary date in the form
  const handleAddSecondaryDate = () => {
    if (!newSecondaryDate) return;
    if (formSecondaryDates.includes(newSecondaryDate)) {
      triggerNotification('Esta fecha ya ha sido agregada.', 'info');
      return;
    }
    setFormSecondaryDates([...formSecondaryDates, newSecondaryDate].sort());
    setNewSecondaryDate('');
  };

  // Remove a secondary date in the form
  const handleRemoveSecondaryDate = (dateStr: string) => {
    setFormSecondaryDates(formSecondaryDates.filter(d => d !== dateStr));
  };

  // Toggle a day of week for recurrence
  const handleToggleRecurrenceDay = (day: string) => {
    if (formRecurrenceDays.includes(day)) {
      setFormRecurrenceDays(formRecurrenceDays.filter(d => d !== day));
    } else {
      setFormRecurrenceDays([...formRecurrenceDays, day]);
    }
  };

  // Save Task (Create or Update)
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      triggerNotification('Por favor, ingresa un título para la tarea.', 'error');
      return;
    }

    let updatedTasks = [...tasks];

    if (editingTask) {
      // Update Task
      updatedTasks = updatedTasks.map(t => {
        if (t.id === editingTask.id) {
          return {
            ...t,
            title: formTitle,
            assignedToId: formAssignedToId,
            type: formType,
            frequency: formFrequency,
            scheduledDate: formScheduledDate,
            notes: formNotes,
            ticketId: formTicketId,
            priority: formPriority,
            category: formCategory,
            effortEstimate: formEffortEstimate,
            scheduledTime: formScheduledTime,
            hasEndDate: formHasEndDate,
            recurrenceEndDate: formRecurrenceEndDate,
            recurrenceDays: formRecurrenceDays,
            secondaryDates: formSecondaryDates,
            subtasks: formSubtasks,
            scope: formScope,
            showInBitacora: formShowInBitacora,
            clientName: formClientName,
            clientRole: formClientRole,
            version: formVersion,
            assignedRole: formAssignedRole,
            items: formItems
          };
        }
        return t;
      });
      triggerNotification('Tarea de procesos actualizada exitosamente.', 'success');
    } else {
      // Create new Task
      const newTask: InternalTask = {
        id: `TASK-${Date.now()}`,
        title: formTitle,
        assignedToId: formAssignedToId,
        type: formType,
        frequency: formFrequency,
        scheduledDate: formScheduledDate,
        ticketId: formTicketId,
        status: 'Pendiente',
        notes: formNotes,
        priority: formPriority,
        category: formCategory,
        effortEstimate: formEffortEstimate,
        scheduledTime: formScheduledTime,
        hasEndDate: formHasEndDate,
        recurrenceEndDate: formRecurrenceEndDate,
        recurrenceDays: formRecurrenceDays,
        secondaryDates: formSecondaryDates,
        subtasks: formSubtasks,
        scope: formScope,
        showInBitacora: formShowInBitacora,
        clientName: formClientName,
        clientRole: formClientRole,
        version: formVersion,
        assignedRole: formAssignedRole,
        items: formItems,
        createdDate: new Date().toISOString().split('T')[0],
        powerTools: formType === 'Recurrente' ? ['recurrence'] : []
      };
      updatedTasks.unshift(newTask);
      triggerNotification('Nueva tarea creada y guardada en el tablero.', 'success');
    }

    // Save to State and Firebase
    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
    setIsModalOpen(false);
  };

  // Helper to clone a completed task if it is part of a recurring series
  const cloneRecurringTask = (task: InternalTask): InternalTask => {
    const config = task.recurrenceConfig;
    if (!config) return task;

    // 1. Calculate the next execution date based on frequency and nextExecutionDate
    let currentExecution = new Date(config.nextExecutionDate || task.scheduledDate || new Date());
    if (isNaN(currentExecution.getTime())) {
      currentExecution = new Date();
    }

    const nextExecution = new Date(currentExecution);
    if (config.frequency === 'daily') {
      nextExecution.setDate(nextExecution.getDate() + (config.interval || 1));
    } else if (config.frequency === 'weekly') {
      nextExecution.setDate(nextExecution.getDate() + (config.interval || 1) * 7);
    } else if (config.frequency === 'monthly') {
      nextExecution.setMonth(nextExecution.getMonth() + (config.interval || 1));
    } else {
      nextExecution.setDate(nextExecution.getDate() + 7);
    }

    const nextExecutionStr = nextExecution.toISOString().split('T')[0];

    // 2. Calculate the next creation date based on creationDelayDays
    const nextCreation = new Date(nextExecution);
    const delayDays = config.creationDelayDays ?? 1;
    nextCreation.setDate(nextCreation.getDate() - delayDays);
    const nextCreationStr = nextCreation.toISOString().split('T')[0];

    // 3. Build past iterations history if keepHistoryInTimeline is enabled
    const currentIteration = config.iterationNumber ?? 1;
    const historyItem = {
      taskId: task.id,
      completedAt: new Date().toISOString(),
      completedBy: currentAgent?.name || currentUser?.name || 'Agente Roster',
      executionDate: config.nextExecutionDate || task.scheduledDate,
      iteration: currentIteration
    };

    const updatedPastHistory = [...(config.pastIterationsHistory || [])];
    if (config.keepHistoryInTimeline) {
      updatedPastHistory.push(historyItem);
    }

    // 4. Construct the cloned recurrenceConfig
    const nextRecConfig: RecurrenceConfig = {
      ...config,
      nextExecutionDate: nextExecutionStr,
      nextCreationDate: nextCreationStr,
      iterationNumber: currentIteration + 1,
      pastIterationsHistory: updatedPastHistory,
      parentTaskId: config.parentTaskId || task.id
    };

    // 5. Pre-built checklists
    let checklistsToInclude = task.checklists || [];
    
    // Add custom checklist items configured in the series
    if (config.customChecklists && config.customChecklists.length > 0) {
      config.customChecklists.forEach(cl => {
        checklistsToInclude = [
          ...checklistsToInclude.filter(existing => existing.title !== cl.title),
          {
            id: `CL-RECUR-${cl.id}-${Date.now()}`,
            title: cl.title,
            items: cl.items.map((it, idx) => ({
              id: `CLI-RECUR-${cl.id}-${idx}-${Date.now()}`,
              title: it,
              completed: false
            }))
          }
        ];
      });
    } else if (config.customChecklistItems && config.customChecklistItems.length > 0) {
      checklistsToInclude = [
        ...checklistsToInclude.filter(cl => cl.title !== "📋 Checklist de la Serie"),
        {
          id: `CL-CUSTOM-${Date.now()}`,
          title: "📋 Checklist de la Serie",
          items: config.customChecklistItems.map((it, idx) => ({
            id: `CLI-CUSTOM-${Date.now()}-${idx}`,
            title: it,
            completed: false
          }))
        }
      ];
    }

    if (config.includePrebuiltChecklists && config.includePrebuiltChecklists.length > 0) {
      const TEMPLATE_MAP: Record<string, string[]> = {
        "💻 Desarrollo de Feature": [
          "Diseño de arquitectura e interfaces",
          "Implementación de APIs y lógica de servidor",
          "Maquetado e integración de vistas frontend",
          "Escribir pruebas unitarias e de integración",
          "Realizar Code Review con el equipo",
          "Actualizar documentación técnica del proyecto"
        ],
        "🧪 QA y Control de Calidad": [
          "Ejecutar pruebas de regresión manuales",
          "Probar flujos en dispositivos móviles",
          "Validar tiempos de respuesta y carga",
          "Verificar control de errores en formularios",
          "Prueba de casos extremos (Edge Cases)"
        ],
        "🚀 Despliegue en Producción": [
          "Preparar notas de lanzamiento (Release Notes)",
          "Desplegar en entorno de Staging",
          "Ejecutar migraciones de base de datos",
          "Desplegar en producción (Cloud Run / Vercel)",
          "Validar estado post-despliegue (Smoke Tests)",
          "Notificar a los stakeholders"
        ]
      };

      config.includePrebuiltChecklists.forEach(title => {
        const items = TEMPLATE_MAP[title] || [];
        if (items.length > 0) {
          checklistsToInclude = [
            ...checklistsToInclude.filter(cl => cl.title !== title), // avoid duplicates
            {
              id: `CL-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              title: title,
              items: items.map((it, idx) => ({
                id: `CLI-${Date.now()}-${idx}`,
                title: it,
                completed: false
              }))
            }
          ];
        }
      });
    }

    // 6. Return the full cloned task
    return {
      id: `TASK-RECUR-${Date.now()}`,
      title: task.title,
      notes: task.notes,
      priority: task.priority,
      category: task.category,
      status: 'Pendiente',
      type: 'Recurrente',
      ticketId: task.ticketId || '',
      assignedToId: config.involvedAgentIds?.[0] || task.assignedToId,
      effortEstimate: task.effortEstimate,
      scheduledDate: nextExecutionStr,
      scheduledTime: task.scheduledTime || '09:00',
      documentation: config.includeWikiDocs?.[0] || task.documentation || '',
      powerTools: task.powerTools || ['recurrence'],
      recurrenceConfig: nextRecConfig,
      timeline: [
        {
          id: `EV-${Date.now()}-init`,
          timestamp: new Date().toISOString(),
          title: 'Serie Recurrente Clonada',
          note: `Esta es la iteración #${currentIteration + 1} de la serie recurrente original. Planificada para ejecución el ${nextExecutionStr} y visible el ${nextCreationStr}.`,
          author: 'Sistema'
        }
      ]
    };
  };

  // Update Status of a Task
  const handleUpdateStatus = async (taskId: string, newStatus: 'Pendiente' | 'En proceso' | 'Completado', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    let clonedTask: InternalTask | null = null;
    let modifiedTask: InternalTask | null = null;

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        if (newStatus === 'Completado' && t.recurrenceConfig) {
          clonedTask = cloneRecurringTask(t);
        }
        const nowIso = new Date().toISOString();
        modifiedTask = { 
          ...t, 
          status: newStatus,
          completionReport: newStatus === 'Completado' ? `Completada en plataforma por el roster el ${new Date().toLocaleDateString()}` : undefined,
          completedDate: newStatus === 'Completado' ? nowIso : undefined,
          CompletedDate: newStatus === 'Completado' ? nowIso : undefined
        };
        return modifiedTask;
      }
      return t;
    });

    const finalTasks = clonedTask ? [...updatedTasks, clonedTask] : updatedTasks;

    if (setInternalTasks) {
      setInternalTasks(finalTasks);
    }

    if (modifiedTask) {
      await saveSingleInternalTask(modifiedTask);
    }
    if (clonedTask) {
      await saveSingleInternalTask(clonedTask);
    }

    if (clonedTask) {
      triggerNotification(`Tarea completada. Próxima iteración #${clonedTask.recurrenceConfig?.iterationNumber} programada para el ${clonedTask.scheduledDate} (oculta hasta el ${clonedTask.recurrenceConfig?.nextCreationDate}).`, 'success');
    } else {
      triggerNotification(`Estado de la tarea movido a "${newStatus}"`, 'success');
    }
  };

  // Toggle checklist subtask completeness directly on card or in detailed view
  const handleUpdateLiveSubtask = async (taskId: string, subtaskId: string, updates: Partial<{ assigneeId: string; assigneeIds: string[]; dueDate: string; startDate: string; description: string }>) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubs = (t.subtasks || []).map(sub => {
          if (sub.id === subtaskId) {
            return { ...sub, ...updates };
          }
          return sub;
        });
        return {
          ...t,
          subtasks: updatedSubs
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const updatedSubs = (t.subtasks || []).map(sub => {
          if (sub.id === subtaskId) {
            return { ...sub, completed: !sub.completed };
          }
          return sub;
        });
        
        // Keep current status, but if it was 'Pendiente' and subtasks are worked on, move to 'En proceso'
        let status = t.status || 'Pendiente';
        if (status === 'Pendiente' && updatedSubs.some(s => s.completed)) {
          status = 'En proceso';
        }

        return {
          ...t,
          subtasks: updatedSubs,
          status
        };
      }
      return t;
    });

    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
  };

  // Add subtask directly on an existing task card
  const handleAddLiveSubtask = async (taskId: string, title: string) => {
    if (!title.trim()) return;
    const newItem = {
      id: `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: title.trim(),
      completed: false
    };

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [...(t.subtasks || []), newItem]
        };
      }
      return t;
    });

    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
    triggerNotification('Ítem de To-Do agregado.', 'success');
  };

  // Remove subtask directly from an existing task card
  const handleRemoveLiveSubtask = async (taskId: string, subtaskId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: (t.subtasks || []).filter(sub => sub.id !== subtaskId)
        };
      }
      return t;
    });

    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
    triggerNotification('Ítem de To-Do eliminado.', 'info');
  };

  // CHECKLIST LIST MANAGEMENT
  const handleAddChecklist = async (taskId: string, title: string) => {
    if (!title.trim()) return;
    const newChecklist = {
      id: `CL-${Date.now()}`,
      title: title.trim(),
      items: []
    };
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: [...(t.checklists || []), newChecklist]
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
    triggerNotification('Lista creada', 'success');
  };

  const handleRemoveChecklist = async (taskId: string, checklistId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: (t.checklists || []).filter(cl => cl.id !== checklistId)
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  const handleRenameChecklist = async (taskId: string, checklistId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: (t.checklists || []).map(cl => 
            cl.id === checklistId ? { ...cl, title: newTitle.trim() } : cl
          )
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  const handleAddRecurrenceChecklist = (title: string) => {
    if (!title.trim()) return;
    const isDuplicate = recurrenceCustomChecklists.some(c => c.title.toLowerCase() === title.trim().toLowerCase());
    if (isDuplicate) {
      triggerNotification("Ya existe una lista con este nombre", "error");
      return;
    }
    const newList = {
      id: `CL-REC-${Date.now()}`,
      title: title.trim(),
      items: []
    };
    setRecurrenceCustomChecklists(prev => [...prev, newList]);
    triggerNotification(`Lista "${title}" creada`, "success");
  };

  const handleLoadRecurrenceTemplate = (templateTitle: string, items: string[]) => {
    const isDuplicate = recurrenceCustomChecklists.some(c => c.title === templateTitle);
    if (isDuplicate) {
      triggerNotification(`Ya existe la lista "${templateTitle}"`, "error");
      return;
    }
    const newList = {
      id: `CL-REC-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      title: templateTitle,
      items: items
    };
    setRecurrenceCustomChecklists(prev => [...prev, newList]);
    triggerNotification(`Plantilla "${templateTitle}" cargada`, "success");
  };

  const handleAddRecurrenceChecklistItem = (checklistId: string, itemTitle: string) => {
    if (!itemTitle.trim()) return;
    setRecurrenceCustomChecklists(prev => prev.map(cl => {
      if (cl.id === checklistId) {
        return {
          ...cl,
          items: [...cl.items, itemTitle.trim()]
        };
      }
      return cl;
    }));
  };

  const handleRemoveRecurrenceChecklistItem = (checklistId: string, index: number) => {
    setRecurrenceCustomChecklists(prev => prev.map(cl => {
      if (cl.id === checklistId) {
        return {
          ...cl,
          items: cl.items.filter((_, idx) => idx !== index)
        };
      }
      return cl;
    }));
  };

  const handleRenameRecurrenceChecklist = (checklistId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setRecurrenceCustomChecklists(prev => prev.map(cl => {
      if (cl.id === checklistId) {
        return { ...cl, title: newTitle.trim() };
      }
      return cl;
    }));
  };

  const handleRemoveRecurrenceChecklist = (checklistId: string) => {
    setRecurrenceCustomChecklists(prev => prev.filter(cl => cl.id !== checklistId));
    triggerNotification("Lista de verificación eliminada", "info");
  };

  const handleToggleAllChecklistItems = async (taskId: string, checklistId: string, completed: boolean) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: (t.checklists || []).map(cl => {
            if (cl.id === checklistId) {
              return {
                ...cl,
                items: cl.items.map(item => ({ ...item, completed }))
              };
            }
            return cl;
          })
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  const handleClearCompletedChecklistItems = async (taskId: string, checklistId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: (t.checklists || []).map(cl => {
            if (cl.id === checklistId) {
              return {
                ...cl,
                items: cl.items.filter(item => !item.completed)
              };
            }
            return cl;
          })
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  const handleLoadChecklistTemplate = async (taskId: string, templateTitle: string, items: string[]) => {
    const newChecklist = {
      id: `CL-${Date.now()}`,
      title: templateTitle,
      items: items.map((title, index) => ({
        id: `CLI-${Date.now()}-${index}`,
        title,
        completed: false
      }))
    };
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: [...(t.checklists || []), newChecklist]
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
    triggerNotification(`Plantilla "${templateTitle}" cargada`, 'success');
  };

  const handleAddChecklistItem = async (taskId: string, checklistId: string, itemTitle: string) => {
    if (!itemTitle.trim()) return;
    const newItem = {
      id: `CLI-${Date.now()}`,
      title: itemTitle.trim(),
      completed: false,
    };
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: (t.checklists || []).map(cl => {
            if (cl.id === checklistId) {
              return { ...cl, items: [...cl.items, newItem] };
            }
            return cl;
          })
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  const handleUpdateChecklistItem = async (taskId: string, checklistId: string, itemId: string, updates: Partial<{ assigneeId: string; assigneeIds: string[]; dueDate: string; startDate: string; description: string }>) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: (t.checklists || []).map(cl => {
            if (cl.id === checklistId) {
              return {
                ...cl,
                items: cl.items.map(item => item.id === itemId ? { ...item, ...updates } : item)
              };
            }
            return cl;
          })
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  const handleToggleChecklistItem = async (taskId: string, checklistId: string, itemId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: (t.checklists || []).map(cl => {
            if (cl.id === checklistId) {
              return {
                ...cl,
                items: cl.items.map(item => item.id === itemId ? { ...item, completed: !item.completed } : item)
              };
            }
            return cl;
          })
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  const handleRemoveChecklistItem = async (taskId: string, checklistId: string, itemId: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          checklists: (t.checklists || []).map(cl => {
            if (cl.id === checklistId) {
              return { ...cl, items: cl.items.filter(item => item.id !== itemId) };
            }
            return cl;
          })
        };
      }
      return t;
    });
    if (setInternalTasks) setInternalTasks(updatedTasks);
    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
  };

  // Delete Task
  const handleDeleteTask = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeleteConfirmTaskId(taskId);
  };

  const handleExecuteDelete = async (taskId: string) => {
    const updatedTasks = tasks.filter(t => t.id !== taskId);

    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
    triggerNotification('Tarea eliminada con éxito.', 'info');
    setDeleteConfirmTaskId(null);
    if (activeTaskDetailId === taskId) {
      setActiveTaskDetailId(null);
    }
  };

  // Toggle power tool on/off for a task
  const handleTogglePowerTool = async (taskId: string, tool: 'checklist' | 'timeline' | 'documentation' | 'recurrence') => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        const currentTools = t.powerTools || [];
        const updatedTools = currentTools.includes(tool)
          ? currentTools.filter(item => item !== tool)
          : [...currentTools, tool];
        
        let extraUpdates = {};
        if (tool === 'recurrence' && !currentTools.includes(tool)) {
            extraUpdates = { type: 'Recurrente', frequency: t.frequency || 'Diario' };
        }
          
        return { ...t, powerTools: updatedTools, ...extraUpdates };
      }
      return t;
    });

    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
    
    const label = 
      tool === 'checklist' ? 'Checklist / To-Dos' : 
      tool === 'timeline' ? 'Bitácora (Timeline)' : 
      tool === 'documentation' ? 'Documentación (Wiki)' : 
      'Tarea Recurrente';
    triggerNotification(`Función "${label}" actualizada para esta tarea`, 'success');
  };

  const handleConfirmRecurrence = async (taskId: string) => {
    await handleTogglePowerTool(taskId, 'recurrence');
    setRecurrenceConfirmTaskId(null);
    setThreeDotMenuOpen(false);
    setActiveDetailTab('recurrence');
  };

  // Add custom manual event entry to timeline bitácora
  const handleAddTimelineEvent = async (taskId: string, noteText: string) => {
    if (!noteText.trim()) return;
    const newEvent = {
      id: `EV-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      title: 'Nota de Operación',
      note: noteText.trim(),
      author: currentAgent?.name || currentUser?.name || 'Agente Técnico'
    };

    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          timeline: [...(t.timeline || []), newEvent]
        };
      }
      return t;
    });

    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
    setNewTimelineText('');
    triggerNotification('Entrada agregada a la bitácora de ejecución', 'success');
  };

  // Save detailed documentation text
  const handleSaveDocumentation = async (taskId: string, docText: string) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          documentation: docText
        };
      }
      return t;
    });

    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
    setIsEditingDocs(false);
    triggerNotification('Procedimientos e información técnica de Wiki guardados', 'success');
  };

  // Save recurrence configuration parameters
  const handleSaveRecurrenceConfig = async (
    taskId: string, 
    frequency: 'daily' | 'weekly' | 'monthly', 
    interval: number, 
    nextExecDate: string, 
    creationDelayDays: number, 
    involvedAgentIds: string[], 
    includePrebuiltChecklists: string[], 
    includeWikiDocs: string[], 
    keepHistoryInTimeline: boolean,
    customChecklistItems?: string[],
    customChecklists?: Array<{ id: string; title: string; items: string[] }>
  ) => {
    const updatedTasks = tasks.map(t => {
      if (t.id === taskId) {
        // Calculate creation date
        const nextExec = new Date(nextExecDate);
        const nextCreation = new Date(nextExec);
        nextCreation.setDate(nextCreation.getDate() - creationDelayDays);
        const nextCreationStr = nextCreation.toISOString().split('T')[0];
 
        const prevConfig = t.recurrenceConfig;
        const newConfig: RecurrenceConfig = {
          frequency,
          interval,
          startDate: prevConfig?.startDate || new Date().toISOString().split('T')[0],
          creationDelayDays,
          nextExecutionDate: nextExecDate,
          nextCreationDate: nextCreationStr,
          involvedAgentIds,
          includePrebuiltChecklists,
          customChecklistItems: customChecklistItems || [],
          customChecklists: customChecklists || [],
          includeWikiDocs,
          keepHistoryInTimeline,
          parentTaskId: prevConfig?.parentTaskId || taskId,
          iterationNumber: prevConfig?.iterationNumber || 1,
          pastIterationsHistory: prevConfig?.pastIterationsHistory || []
        };

        return {
          ...t,
          type: 'Recurrente',
          scheduledDate: nextExecDate,
          recurrenceConfig: newConfig
        };
      }
      return t;
    });

    if (setInternalTasks) {
      setInternalTasks(updatedTasks);
    }
    if (onPushTareasToSheet) {
      await onPushTareasToSheet(updatedTasks, contractorTasks);
    }
    triggerNotification('Configuración de recurrencia y automatización guardada correctamente.', 'success');
  };

  // Open detailed view modal and reset tab to 'details'
  const handleOpenTaskDetail = (task: InternalTask) => {
    setActiveTaskDetailId(task.id);
    setActiveDetailTab('details');
    setDocumentationDraft(task.documentation || '');
    setIsEditingDocs(false);
    setThreeDotMenuOpen(false);
  };

  // Helper to determine priority color style
  const getPriorityStyle = (priority?: string) => {
    switch (priority) {
      case 'Crítica':
        return 'bg-rose-50 text-rose-700 border-rose-200/60';
      case 'Alta':
        return 'bg-amber-50 text-amber-700 border-amber-200/60';
      case 'Media':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
      case 'Baja':
        return 'bg-slate-50 text-slate-600 border-slate-200/60';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200/60';
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Notifications toast */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-3 transition-all animate-bounce ${
          notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
          notification.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
          'bg-slate-50 text-slate-800 border-slate-200'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <AlertCircle className="w-5 h-5 text-rose-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Advanced Filters & Search Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full lg:w-auto">
            {/* Global vs Personal Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 shrink-0">
              <button
                onClick={() => setView('global')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  view === 'global' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Todas las Tareas
              </button>
              <button
                onClick={() => setView('mine')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  view === 'mine' ? 'bg-white text-indigo-950 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                Solo mis Tareas
              </button>
            </div>

            {/* Create Task Button */}
            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 border border-indigo-500"
            >
              <Plus className="w-4 h-4" />
              Nueva Tarea
            </button>
          </div>

          {/* Quick Stats Summary */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Pendientes: <strong className="text-slate-900">{metrics.pendingCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <span>En Proceso: <strong className="text-slate-900">{metrics.inProgressCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Completadas: <strong className="text-slate-900">{metrics.completedCount}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-200 pl-4">
              <RefreshCw className="w-3.5 h-3.5 text-purple-500 animate-spin-slow" />
              <span>Recurrentes: <strong className="text-slate-900">{metrics.recurringCount}</strong></span>
            </div>
          </div>
        </div>

        {/* Filters and Search Row */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          
          {/* Search box */}
          <div className="relative md:col-span-6 lg:col-span-7">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar tareas por título, notas, ticket vinculado o To-Do's..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <div className="relative md:col-span-3 lg:col-span-2.5">
            <select
              value={taskTypeFilter}
              onChange={(e) => setTaskTypeFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Frecuencia: Todas</option>
              <option value="Puntual">Puntuales / Únicas</option>
              <option value="Programada">Programadas</option>
              <option value="Recurrente">Recurrentes</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="relative md:col-span-3 lg:col-span-2.5">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Prioridad: Todas</option>
              <option value="Baja">Baja</option>
              <option value="Media">Media</option>
              <option value="Alta">Alta</option>
              <option value="Crítica">Crítica</option>
            </select>
          </div>
        </div>

        {/* Global checklist stats bar */}
        {metrics.totalSubtasks > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <ListTodo className="w-3.5 h-3.5 text-indigo-600" />
              <span>Avance de To-Do's Global: <strong>{metrics.completedSubtasks}/{metrics.totalSubtasks}</strong> ítems listos ({metrics.subtaskProgress}%)</span>
            </div>
            <div className="w-full sm:w-48 bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" style={{ width: `${metrics.subtaskProgress}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* COLUMN 1: PENDIENTE */}
        <div className="bg-slate-50/70 border border-slate-200/50 rounded-2xl p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-slate-700">Por hacer (Pendientes)</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-slate-200/60 text-[10px] font-mono font-black text-slate-600">
              {filteredTasks.filter(t => !t.status || t.status === 'Pendiente' || t.status === 'Por hacer').length}
            </span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredTasks.filter(t => !t.status || t.status === 'Pendiente' || t.status === 'Por hacer').length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-slate-200">
                No hay tareas pendientes
              </div>
            ) : (
              filteredTasks.filter(t => !t.status || t.status === 'Pendiente' || t.status === 'Por hacer').map(task => renderTaskCard(task))
            )}
          </div>
        </div>

        {/* COLUMN 2: EN PROCESO / EN EJECUCIÓN */}
        <div className="bg-indigo-50/30 border border-indigo-100/50 rounded-2xl p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-indigo-800">En Ejecución</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-[10px] font-mono font-black text-indigo-700">
              {filteredTasks.filter(t => t.status === 'En proceso' || t.status === 'En Ejecución' || t.status === 'En Proceso' || t.status === 'En ejecución' || t.status === 'In Progress').length}
            </span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredTasks.filter(t => t.status === 'En proceso' || t.status === 'En Ejecución' || t.status === 'En Proceso' || t.status === 'En ejecución' || t.status === 'In Progress').length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-slate-200">
                No hay tareas en proceso
              </div>
            ) : (
              filteredTasks.filter(t => t.status === 'En proceso' || t.status === 'En Ejecución' || t.status === 'En Proceso' || t.status === 'En ejecución' || t.status === 'In Progress').map(task => renderTaskCard(task))
            )}
          </div>
        </div>

        {/* COLUMN 3: COMPLETADO / TERMINADAS */}
        <div className="bg-emerald-50/20 border border-emerald-100/40 rounded-2xl p-4 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h3 className="font-display font-black text-xs uppercase tracking-wider text-emerald-800">Terminadas</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-[10px] font-mono font-black text-emerald-700">
              {filteredTasks.filter(t => t.status === 'Completado' || t.status === 'Terminadas' || t.status === 'Terminado' || t.status === 'Completada').length}
            </span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredTasks.filter(t => t.status === 'Completado' || t.status === 'Terminadas' || t.status === 'Terminado' || t.status === 'Completada').length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs italic bg-white/50 rounded-xl border border-dashed border-slate-200">
                No hay tareas completadas
              </div>
            ) : (
              filteredTasks.filter(t => t.status === 'Completado' || t.status === 'Terminadas' || t.status === 'Terminado' || t.status === 'Completada').map(task => renderTaskCard(task))
            )}
          </div>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-scaleIn">
            
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-base text-slate-900">
                    {editingTask ? 'Editar Tarea Operativa' : 'Programar Nueva Tarea'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">Define los aspectos de ejecución técnica, tiempos y parámetros de control</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveTask} className="flex-1 overflow-hidden flex flex-col">
              
              {/* Inner content grid (Left: Basic Info, Right: Advanced Scheduling) */}
              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-h-[85vh]">
                
                {/* Left Column (Span 7): Basic Fields */}
                <div className="lg:col-span-7 space-y-3">
                  
                  {selectedBacklogRow && (
                    <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl flex gap-2 items-center">
                      <Link className="w-4 h-4 text-indigo-600 shrink-0 animate-pulse" />
                      <div className="text-xs text-indigo-900 leading-snug">
                        <span className="font-semibold text-[9px] uppercase tracking-wider text-indigo-600 mr-2">Vínculo CRM</span>
                        <strong className="font-bold">{selectedBacklogRow["ID"]}</strong> - {selectedBacklogRow["Subject"]}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Title */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Título de la Tarea *</label>
                      <input
                        type="text"
                        required
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="Ej: Backup..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium text-slate-800"
                      />
                    </div>
                    {/* CRM Ticket Search */}
                    <div className="space-y-1 relative">
                      <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Vincular a Ticket del CRM</label>
                      <input
                        type="text"
                        value={formTicketId}
                        onChange={(e) => setFormTicketId(e.target.value)}
                        placeholder="Ej: 34922..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 font-medium font-mono"
                      />
                      {formTicketId && (
                        <div className="text-[9px] text-slate-500 bg-slate-50 border border-slate-100 p-1.5 rounded-lg mt-1 max-h-12 overflow-y-auto leading-snug absolute z-10 w-full shadow-sm">
                          {crmTicketsList.find(t => t.id.toString() === formTicketId.trim()) ? (
                            <span className="text-emerald-600 font-semibold flex items-center gap-1">
                              <span>✓ Ticket:</span> 
                              <span className="truncate max-w-[200px] inline-block align-bottom">{crmTicketsList.find(t => t.id.toString() === formTicketId.trim())?.subject}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">ID manual</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Technical Staff & Priority */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Responsable *</label>
                      <select
                        required
                        value={formAssignedToId}
                        onChange={(e) => setFormAssignedToId(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 font-bold"
                      >
                        <option value="">Selecciona Responsable</option>
                        {agents.map(a => (
                          <option key={a.id} value={a.id}>{a.name} ({a.username})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Prioridad *</label>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 font-bold"
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                        <option value="Crítica">Crítica</option>
                      </select>
                    </div>
                  </div>

                  {/* Category & Effort */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Categoría *</label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 font-bold"
                      >
                        <option value="Soporte">Soporte Técnico</option>
                        <option value="Mantenimiento">Mantenimiento Preventivo</option>
                        <option value="Backup">Respaldo / Backup</option>
                        <option value="Instalación">Instalación / Configuración</option>
                        <option value="Monitoreo">Monitoreo / Guardia</option>
                        <option value="Auditoría">Auditoría / Control</option>
                        <option value="Capacitación">Capacitación / Inducción</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Esfuerzo *</label>
                      <select
                        value={formEffortEstimate}
                        onChange={(e) => setFormEffortEstimate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 font-bold"
                      >
                        <option value="Muy rápido (< 15m)">Muy rápido (&lt; 15m)</option>
                        <option value="Rápido (15m - 1h)">Rápido (15m - 1h)</option>
                        <option value="Medio (1h - 4h)">Medio (1h - 4h)</option>
                        <option value="Extenso (4h - 1d)">Extenso (4h - 1d)</option>
                        <option value="Complejo (Varios días)">Complejo (Varios días)</option>
                      </select>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Instrucciones</label>
                    <textarea
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Detalles técnicos, comandos a ejecutar..."
                      rows={2}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all text-slate-700 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    {/* SCOPE SELECTION */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Alcance *</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormScope('Cliente')}
                          className={`flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                            formScope === 'Cliente'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <User className="w-3.5 h-3.5" />
                          Cliente
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormScope('Interna')}
                          className={`flex-1 py-1.5 px-2 rounded-lg border text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                            formScope === 'Interna'
                              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                              : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <Building className="w-3.5 h-3.5" />
                          Interna
                        </button>
                      </div>
                    </div>

                    {/* BITACORA SELECTION */}
                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200/60 p-2 rounded-lg hover:bg-slate-100/50 transition-colors h-[34px]">
                      <input
                        type="checkbox"
                        checked={formShowInBitacora}
                        onChange={(e) => setFormShowInBitacora(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-[11px] font-bold text-slate-800 block truncate">Mostrar en Bitácora</span>
                    </label>
                  </div>

                  {/* TECHNICAL METADATA SECTION */}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 uppercase font-bold block">Versión / Sprint Objetivo</label>
                      <input
                        type="text"
                        value={formVersion}
                        onChange={(e) => setFormVersion(e.target.value)}
                        placeholder="Ej: v1.4.0, Sprint 4"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 uppercase font-bold block">Rol Técnico Requerido</label>
                      <select
                        value={formAssignedRole}
                        onChange={(e) => setFormAssignedRole(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-bold"
                      >
                        <option value="">Cualquier Rol</option>
                        <option value="Soporte N1">Soporte N1</option>
                        <option value="Soporte N2">Soporte N2</option>
                        <option value="Ingeniero DevOps">Ingeniero DevOps</option>
                        <option value="Administrador de Sistemas">Administrador de Sistemas</option>
                        <option value="Supervisor de Operaciones">Supervisor de Operaciones</option>
                      </select>
                    </div>
                  </div>

                  {/* CLIENT & METADATA SECTION */}
                  {formScope === 'Cliente' && (
                  <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/60 space-y-3.5 animate-fadeIn">
                    <span className="text-[10px] font-mono font-black text-indigo-950 uppercase tracking-widest block flex items-center gap-1.5">
                      <User className="w-4 h-4 text-indigo-600" />
                      Metadatos del Cliente
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block">Nombre del Cliente</label>
                        <input
                          type="text"
                          value={formClientName}
                          onChange={(e) => setFormClientName(e.target.value)}
                          placeholder="Ej: Sarah Jenkins, Inmobiliaria Norte"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block">Cargo / Rol del Cliente</label>
                        <input
                          type="text"
                          value={formClientRole}
                          onChange={(e) => setFormClientRole(e.target.value)}
                          placeholder="Ej: Gerente de TI"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-indigo-500 text-slate-800 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                  )}
                </div>

                {/* Right Column (Span 5): Advanced Scheduling */}
                <div className="lg:col-span-5 space-y-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
                  
                  <div className="space-y-4">
                    {/* Section Header */}
                    <h4 className="text-[10px] font-mono font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5 border-b border-indigo-100/60 pb-2">
                      <Calendar className="w-4 h-4 text-indigo-600" />
                      Planificación Temporal
                    </h4>

                    {/* Requirements Type Selection Grid */}
                    <div className="space-y-2">
                      <label className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest block">Tipo de Requerimiento *</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { value: 'Interna', icon: Pin, label: 'Puntual', desc: 'Única' },
                          { value: 'Programada', icon: Calendar, label: 'Progr.', desc: 'Varias' },
                          { value: 'Recurrente', icon: RefreshCw, label: 'Recurr.', desc: 'Fija' }
                        ].map(opt => {
                          const IconComp = opt.icon;
                          const isSelected = formType === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setFormType(opt.value as any);
                                if (opt.value !== 'Recurrente') setFormFrequency('Única');
                              }}
                              className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                                isSelected
                                   ? 'border-indigo-600 bg-white ring-1 ring-indigo-500/20 shadow-xs'
                                   : 'border-slate-200 bg-white/50 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <IconComp className={`w-3.5 h-3.5 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span className="text-[10px] font-extrabold text-slate-800">{opt.label}</span>
                              </div>
                              <span className="block text-[8px] text-slate-400 font-medium leading-tight">{opt.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Conditional Configuration Cards */}
                    
                    {/* PUNTUAL (Interna) */}
                    {formType === 'Interna' && (
                      <div className="space-y-3 bg-white p-3 rounded-xl border border-slate-200/60 animate-fadeIn">
                        <span className="text-[9px] font-mono font-extrabold text-indigo-950 uppercase tracking-wider block">Parámetros Puntuales</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Fecha</label>
                            <input
                              type="date"
                              required
                              value={formScheduledDate}
                              onChange={(e) => setFormScheduledDate(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Hora</label>
                            <input
                              type="time"
                              required
                              value={formScheduledTime}
                              onChange={(e) => setFormScheduledTime(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                    {/* PROGRAMADA (With secondary dates & end date option) */}
                    {formType === 'Programada' && (
                      <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/60 animate-fadeIn">
                        <span className="text-[10px] font-mono font-extrabold text-indigo-950 uppercase tracking-wider block">Fechas Programadas</span>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Fecha Principal *</label>
                            <input
                              type="date"
                              required
                              value={formScheduledDate}
                              onChange={(e) => setFormScheduledDate(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Hora de inicio *</label>
                            <input
                              type="time"
                              required
                              value={formScheduledTime}
                              onChange={(e) => setFormScheduledTime(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono"
                            />
                          </div>
                        </div>

                        {/* End Date Limit Switch */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formHasEndDate}
                              onChange={(e) => setFormHasEndDate(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                            />
                            <span className="text-[10px] text-slate-600 font-bold">¿Tiene fecha de vencimiento/fin?</span>
                          </label>
                          {formHasEndDate && (
                            <input
                              type="date"
                              required
                              value={formRecurrenceEndDate}
                              onChange={(e) => setFormRecurrenceEndDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono animate-fadeIn"
                            />
                          )}
                        </div>

                        {/* Additional Dates of Interest */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <label className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold block">Fechas de interés adicionales</label>
                          
                          <div className="flex gap-1.5">
                            <input
                              type="date"
                              value={newSecondaryDate}
                              onChange={(e) => setNewSecondaryDate(e.target.value)}
                              className="flex-1 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono"
                            />
                            <button
                              type="button"
                              onClick={handleAddSecondaryDate}
                              className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          {/* List of secondary dates */}
                          {formSecondaryDates.length > 0 && (
                            <div className="space-y-1 max-h-24 overflow-y-auto pt-1">
                              {formSecondaryDates.map(dateStr => (
                                <div key={dateStr} className="flex justify-between items-center bg-slate-50 px-2 py-1 rounded text-[10px] border border-slate-100 font-mono text-slate-700">
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    {dateStr}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSecondaryDate(dateStr)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* RECURRENTE (With recurrence settings) */}
                    {formType === 'Recurrente' && (
                      <div className="space-y-3 bg-white p-3.5 rounded-xl border border-slate-200/60 animate-fadeIn">
                        <span className="text-[10px] font-mono font-extrabold text-indigo-950 uppercase tracking-wider block">Frecuencia Recurrente</span>
                        
                        {/* Selector Frecuencia */}
                        <div className="flex flex-wrap gap-1 mt-1">
                          {[
                            { value: 'Diario', label: 'Diario' },
                            { value: 'Semanal', label: 'Semanal' },
                            { value: 'Mensual', label: 'Mensual' },
                            { value: 'Anual', label: 'Anual' }
                          ].map(freq => (
                            <button
                              key={freq.value}
                              type="button"
                              onClick={() => setFormFrequency(freq.value as any)}
                              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                                formFrequency === freq.value 
                                  ? 'bg-indigo-600 text-white border-indigo-600' 
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {freq.label}
                            </button>
                          ))}
                        </div>

                        {/* Recurrence Days for Semanal */}
                        {formFrequency === 'Semanal' && (
                          <div className="space-y-1 animate-fadeIn pt-1.5 border-t border-slate-100">
                            <label className="text-[9px] text-slate-400 uppercase font-black block">Días de Ejecución *</label>
                            <div className="flex gap-1">
                              {[
                                { key: 'Lunes', label: 'Lun' },
                                { key: 'Martes', label: 'Mar' },
                                { key: 'Miercoles', label: 'Mie' },
                                { key: 'Jueves', label: 'Jue' },
                                { key: 'Viernes', label: 'Vie' },
                                { key: 'Sabado', label: 'Sab' },
                                { key: 'Domingo', label: 'Dom' }
                              ].map(day => {
                                const isSelected = formRecurrenceDays.includes(day.key);
                                return (
                                  <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => handleToggleRecurrenceDay(day.key)}
                                    className={`flex-1 py-1 rounded text-[9px] font-bold text-center border transition-all cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                    }`}
                                  >
                                    {day.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-100">
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Comienza el</label>
                            <input
                              type="date"
                              required
                              value={formScheduledDate}
                              onChange={(e) => setFormScheduledDate(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-slate-400 uppercase font-bold">Hora de Ejecución</label>
                            <input
                              type="time"
                              required
                              value={formScheduledTime}
                              onChange={(e) => setFormScheduledTime(e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono"
                            />
                          </div>
                        </div>

                        {/* Recurrence End Date */}
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formHasEndDate}
                              onChange={(e) => setFormHasEndDate(e.target.checked)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                            />
                            <span className="text-[10px] text-slate-600 font-bold">¿Tiene fecha de finalización?</span>
                          </label>
                          {formHasEndDate && (
                            <input
                              type="date"
                              required
                              value={formRecurrenceEndDate}
                              onChange={(e) => setFormRecurrenceEndDate(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold font-mono animate-fadeIn"
                            />
                          )}
                        </div>

                      </div>
                    )}
                  </div>

                  {/* Save/Close Button Footer of Column */}
                  <div className="pt-4 border-t border-slate-200/60 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-colors shadow-md hover:shadow-indigo-500/20 cursor-pointer"
                    >
                      {editingTask ? 'Guardar Cambios' : 'Programar Tarea'}
                    </button>
                  </div>

                </div>

              </div>
              
            </form>
          </div>
        </div>
      )}

      {/* DETAILED VIEW POPUP MODAL */}
      {activeTaskDetailId && (() => {
        const activeTask = tasks.find(t => t.id === activeTaskDetailId);
        if (!activeTask) return null;

        const legacySubtaskTotal = activeTask.subtasks?.length || 0;
        const legacySubtaskCompleted = activeTask.subtasks?.filter(s => s.completed).length || 0;
        const checklistsTotal = activeTask.checklists?.reduce((acc, cl) => acc + cl.items.length, 0) || 0;
        const checklistsCompleted = activeTask.checklists?.reduce((acc, cl) => acc + cl.items.filter(i => i.completed).length, 0) || 0;
        const subtaskTotal = legacySubtaskTotal + checklistsTotal;
        const subtaskCompleted = legacySubtaskCompleted + checklistsCompleted;
        const progressPercent = subtaskTotal > 0 ? Math.round((subtaskCompleted / subtaskTotal) * 100) : 0;
        const priorityClass = getPriorityStyle(activeTask.priority);

        // Find linked ticket
        const linkedTicket = crmTicketsList.find(t => t.id.toString() === activeTask.ticketId?.trim());

        // Computed timeline events
        const computedEvents = [];
        // Extract creation timestamp from Task ID if possible
        const idTimeStr = activeTask.id.replace('TASK-', '');
        const idTimestamp = parseInt(idTimeStr);
        const creationTime = !isNaN(idTimestamp) ? new Date(idTimestamp).toISOString() : new Date().toISOString();
        
        computedEvents.push({
          id: 'creation-event',
          timestamp: creationTime,
          title: 'Creación de Tarea',
          note: 'La tarea fue ingresada al backlog operativo y planificada en el tablero.',
          author: 'Sistema'
        });

        if (activeTask.status === 'En proceso' || activeTask.status === 'Completado') {
          computedEvents.push({
            id: 'started-event',
            timestamp: new Date(new Date(creationTime).getTime() + 1800000).toISOString(), // 30 mins later
            title: 'Inicio de Ejecución',
            note: 'El estado de la tarea se movió a "En proceso". Ejecución activa en plataforma.',
            author: 'Agente Roster'
          });
        }

        if (activeTask.status === 'Completado') {
          computedEvents.push({
            id: 'completion-event',
            timestamp: new Date().toISOString(),
            title: 'Cierre de Tarea',
            note: activeTask.completionReport || 'La tarea fue marcada como Completada de forma exitosa.',
            author: 'Agente Roster'
          });
        }

        const manualEvents = activeTask.timeline || [];
        const allTimelineEvents = [...computedEvents, ...manualEvents].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        // Fallback tab if power tool is disabled
        const isChecklistEnabled = activeTask.powerTools?.includes('checklist');
        const isTimelineEnabled = activeTask.powerTools?.includes('timeline');
        const isDocsEnabled = activeTask.powerTools?.includes('documentation');
        const isRecurrenceEnabled = activeTask.powerTools?.includes('recurrence');

        const currentTab = 
          (activeDetailTab === 'checklist' && !isChecklistEnabled) ||
          (activeDetailTab === 'timeline' && !isTimelineEnabled) ||
          (activeDetailTab === 'documentation' && !isDocsEnabled) ||
          (activeDetailTab === 'recurrence' && !isRecurrenceEnabled)
            ? 'details'
            : activeDetailTab;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-[1100px] w-full min-h-[75vh] max-h-[85vh] overflow-hidden flex flex-col animate-scaleIn">
              
              {/* Modal Header */}
              <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-white ${
                    activeTask.priority === 'Crítica' ? 'bg-rose-500' :
                    activeTask.priority === 'Alta' ? 'bg-amber-500' :
                    activeTask.priority === 'Media' ? 'bg-indigo-500' :
                    'bg-slate-400'
                  }`}>
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2">
                      <h3 className="font-display font-black text-base text-slate-900 leading-tight">
                        {activeTask.title}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono font-bold">
                        #{activeTask.id.replace('TASK-', '')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${priorityClass}`}>
                        Prioridad {activeTask.priority || 'Media'}
                      </span>
                      {(() => {
                        const isTaskCompleted = activeTask.status === 'Completado' || activeTask.status === 'Terminadas' || activeTask.status === 'Terminado' || activeTask.status === 'Completada';
                        const isTaskInProgress = activeTask.status === 'En proceso' || activeTask.status === 'En Ejecución' || activeTask.status === 'En Proceso' || activeTask.status === 'En ejecución' || activeTask.status === 'In Progress';
                        
                        return (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isTaskCompleted ? 'bg-emerald-100 text-emerald-800' :
                            isTaskInProgress ? 'bg-indigo-100 text-indigo-800 animate-pulse' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            Estado: {activeTask.status || 'Pendiente'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  
                  {/* Execution Status Controls */}
                  {(() => {
                    const isTaskCompleted = activeTask.status === 'Completado' || activeTask.status === 'Terminadas' || activeTask.status === 'Terminado' || activeTask.status === 'Completada';
                    const isTaskInProgress = activeTask.status === 'En proceso' || activeTask.status === 'En Ejecución' || activeTask.status === 'En Proceso' || activeTask.status === 'En ejecución' || activeTask.status === 'In Progress';
                    
                    if (isTaskCompleted) {
                      return (
                        <button
                          onClick={(e) => handleUpdateStatus(activeTask.id, 'En proceso', e)}
                          className="px-4 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 text-xs font-black rounded-xl transition-all cursor-pointer border border-indigo-200"
                        >
                          Reabrir
                        </button>
                      );
                    }
                    if (isTaskInProgress) {
                      return (
                        <>
                          <button
                            onClick={(e) => handleUpdateStatus(activeTask.id, 'Pendiente', e)}
                            className="px-3.5 py-2 text-slate-600 hover:text-slate-800 text-xs font-black rounded-xl hover:bg-slate-200 transition-all cursor-pointer border border-slate-200"
                          >
                            Pausar
                          </button>
                          <button
                            onClick={(e) => handleUpdateStatus(activeTask.id, 'Completado', e)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm hover:shadow-emerald-500/15 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Completar
                          </button>
                        </>
                      );
                    }
                    return (
                      <button
                        onClick={(e) => handleUpdateStatus(activeTask.id, 'En proceso', e)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/15"
                      >
                        <Play className="w-3.5 h-3.5" />
                        Iniciar
                      </button>
                    );
                  })()}

                  {/* Save Recurrence Button (Only shown when active tab is 'recurrence') */}
                  {currentTab === 'recurrence' && (
                    <button
                      type="button"
                      onClick={() => handleSaveRecurrenceConfig(
                        activeTask.id,
                        recurrenceFrequency,
                        recurrenceInterval,
                        recurrenceNextExecDate,
                        recurrenceCreationDelay,
                        recurrenceInvolvedAgents,
                        recurrencePrebuiltChecklists,
                        recurrencePrebuiltWiki ? [recurrencePrebuiltWiki] : [],
                        recurrenceKeepHistory,
                        recurrenceCustomChecklistItems,
                        recurrenceCustomChecklists
                      )}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all shadow-sm hover:shadow-indigo-500/15 cursor-pointer mr-1 animate-scaleIn"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Guardar Automatización</span>
                    </button>
                  )}

                  {/* Create List Button (Only shown when active tab is 'checklist') */}
                  {currentTab === 'checklist' && (
                    <div className="flex items-center gap-1.5 mr-1">
                      {creatingChecklistFor === activeTask.id ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200/80 rounded-xl p-1 animate-scaleIn">
                          <input
                            type="text"
                            value={newChecklistTitle}
                            onChange={e => setNewChecklistTitle(e.target.value)}
                            placeholder="Nombre de la lista..."
                            autoFocus
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newChecklistTitle.trim()) {
                                handleAddChecklist(activeTask.id, newChecklistTitle);
                                setCreatingChecklistFor(null);
                                setNewChecklistTitle('');
                              } else if (e.key === 'Escape') {
                                setCreatingChecklistFor(null);
                                setNewChecklistTitle('');
                              }
                            }}
                            className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                          <button
                            onClick={() => {
                              if (newChecklistTitle.trim()) {
                                handleAddChecklist(activeTask.id, newChecklistTitle);
                                setCreatingChecklistFor(null);
                                setNewChecklistTitle('');
                              }
                            }}
                            className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-sm"
                            title="Confirmar"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setCreatingChecklistFor(null);
                              setNewChecklistTitle('');
                            }}
                            className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
                            title="Cancelar"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setCreatingChecklistFor(activeTask.id);
                            setNewChecklistTitle('');
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:shadow-indigo-500/15"
                          title="Solo visible en la pestaña de Checklist"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear Lista</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className="w-px h-6 bg-slate-200 mx-1" />

                  {/* Three Dot Action Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setThreeDotMenuOpen(!threeDotMenuOpen)}
                      className={`p-2 rounded-xl transition-colors cursor-pointer ${
                        threeDotMenuOpen ? 'bg-slate-200 text-slate-800' : 'hover:bg-slate-200 text-slate-500'
                      }`}
                      title="Opciones de Tarea"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {threeDotMenuOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-15 bg-transparent" 
                          onClick={() => setThreeDotMenuOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-xl z-20 py-2.5 animate-scaleIn text-left">
                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Acciones de Tarea
                          </div>
                          
                          <button
                            onClick={() => {
                              setThreeDotMenuOpen(false);
                              openEditModal(activeTask);
                              setActiveTaskDetailId(null);
                            }}
                            className="w-full px-4 py-2 hover:bg-slate-50 text-slate-700 hover:text-indigo-600 text-xs font-semibold flex items-center gap-2.5 transition-colors text-left"
                          >
                            <Edit2 className="w-4 h-4 text-slate-400" />
                            <span>Editar Parámetros</span>
                          </button>

                          <button
                            onClick={() => {
                              setThreeDotMenuOpen(false);
                              handleDeleteTask(activeTask.id);
                            }}
                            className="w-full px-4 py-2 hover:bg-rose-50 text-rose-600 text-xs font-semibold flex items-center gap-2.5 transition-colors text-left"
                          >
                            <Trash2 className="w-4 h-4 text-rose-400" />
                            <span>Eliminar Tarea</span>
                          </button>

                          <div className="my-2 border-t border-slate-100" />

                          <div className="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Power Tools (Funciones)</span>
                          </div>

                          {/* Toggle Checklist */}
                          <button
                            onClick={() => {
                              handleTogglePowerTool(activeTask.id, 'checklist');
                            }}
                            className="w-full px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between transition-colors text-left"
                          >
                            <div className="flex items-center gap-2.5 text-slate-700">
                              <ListTodo className="w-4 h-4 text-slate-400" />
                              <span>Checklist & To-Dos</span>
                            </div>
                            <div className={`w-8 h-4 rounded-full transition-colors relative ${
                              isChecklistEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                isChecklistEnabled ? 'left-4.5' : 'left-0.5'
                              }`} />
                            </div>
                          </button>

                          {/* Toggle Timeline */}
                          <button
                            onClick={() => {
                              handleTogglePowerTool(activeTask.id, 'timeline');
                            }}
                            className="w-full px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between transition-colors text-left"
                          >
                            <div className="flex items-center gap-2.5 text-slate-700">
                              <History className="w-4 h-4 text-slate-400" />
                              <span>Bitácora (Timeline)</span>
                            </div>
                            <div className={`w-8 h-4 rounded-full transition-colors relative ${
                              isTimelineEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                isTimelineEnabled ? 'left-4.5' : 'left-0.5'
                              }`} />
                            </div>
                          </button>

                          {/* Toggle Documentation */}
                          <button
                            onClick={() => {
                              handleTogglePowerTool(activeTask.id, 'documentation');
                            }}
                            className="w-full px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between transition-colors text-left"
                          >
                            <div className="flex items-center gap-2.5 text-slate-700">
                              <BookOpen className="w-4 h-4 text-slate-400" />
                              <span>Documentación (Wiki)</span>
                            </div>
                            <div className={`w-8 h-4 rounded-full transition-colors relative ${
                              isDocsEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                isDocsEnabled ? 'left-4.5' : 'left-0.5'
                              }`} />
                            </div>
                          </button>

                          {/* Toggle Recurrence */}
                          <button
                            onClick={() => {
                              if (isRecurrenceEnabled) {
                                handleTogglePowerTool(activeTask.id, 'recurrence');
                              } else {
                                setRecurrenceConfirmTaskId(activeTask.id);
                              }
                            }}
                            className="w-full px-4 py-2.5 hover:bg-slate-50 text-xs font-semibold flex items-center justify-between transition-colors text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 text-slate-700">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <span>Automatización (Recurrencia)</span>
                            </div>
                            <div className={`w-8 h-4 rounded-full transition-colors relative ${
                              isRecurrenceEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                            }`}>
                              <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                                isRecurrenceEnabled ? 'left-4.5' : 'left-0.5'
                              }`} />
                            </div>
                          </button>

                        </div>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => setActiveTaskDetailId(null)}
                    className="p-2 hover:bg-slate-200 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body: Render views based on selected floating tab */}
              <div className={`flex-1 p-6 grid grid-cols-1 md:grid-cols-12 gap-6 max-h-[64vh] ${(currentTab === 'checklist' || currentTab === 'recurrence') ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                
                {/* 1. DETALLES VIEW (Default) */}
                {currentTab === 'details' && (
                  <>
                    {/* Left Column (Span 7) */}
                    <div className="md:col-span-7 space-y-5">
                      
                      {/* Perfil del Solicitante / Cliente */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Perfil / Alcance</span>
                        {activeTask.scope === 'Interna' ? (
                          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/40 flex items-center gap-4 animate-fadeIn">
                            <div className="w-10 h-10 rounded-full bg-slate-200/50 text-slate-600 font-bold flex items-center justify-center shadow-xs">
                              <Building className="w-4 h-4" />
                            </div>
                            <div className="text-xs flex-1">
                              <div className="font-extrabold text-slate-900 text-sm">Tarea Interna de Compañía</div>
                              <div className="text-slate-500 font-medium mt-0.5">
                                Esta tarea no está vinculada a un cliente externo.
                              </div>
                            </div>
                          </div>
                        ) : activeTask.clientName ? (
                          <div className="p-4 bg-indigo-50/25 rounded-2xl border border-indigo-100/60 flex items-center gap-4 animate-fadeIn">
                            <div className="w-10 h-10 rounded-full bg-indigo-100/80 text-indigo-700 font-bold flex items-center justify-center shadow-xs">
                              {activeTask.clientName.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-xs flex-1">
                              <div className="font-extrabold text-indigo-950 text-sm">{activeTask.clientName}</div>
                              <div className="text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                                <Building className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                <span>{activeTask.clientRole || 'Representante / Cliente Directo'}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-200/40 text-xs text-slate-400 italic flex items-center gap-2">
                            <User className="w-4 h-4 text-slate-300" />
                            <span>No se ha registrado información de cliente específico para esta tarea.</span>
                          </div>
                        )}
                      </div>

                      {/* Notes / Description */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Descripción e Instrucciones de Ejecución</span>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 text-slate-700 text-xs leading-relaxed font-medium whitespace-pre-wrap min-h-[120px]">
                          {activeTask.notes ? activeTask.notes : (
                            <span className="text-slate-400 italic">No se especificaron instrucciones adicionales de ejecución para esta tarea.</span>
                          )}
                        </div>
                      </div>

                      {/* Checklist Completion Progress */}
                      {activeTask.subtasks && activeTask.subtasks.length > 0 && (
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200/60 space-y-2.5 animate-fadeIn">
                          <div className="flex justify-between items-center text-xs">
                            <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Progreso de Lista de Verificación</span>
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {activeTask.subtasks.filter(s => s.completed).length} de {activeTask.subtasks.length} completadas
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className="bg-indigo-600 h-2 rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${Math.round((activeTask.subtasks.filter(s => s.completed).length / activeTask.subtasks.length) * 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-500">
                              <span>0%</span>
                              <span>{Math.round((activeTask.subtasks.filter(s => s.completed).length / activeTask.subtasks.length) * 100)}% Completado</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Linked CRM Ticket Details */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">Vínculo con Requerimiento CRM</span>
                        {activeTask.ticketId ? (
                          <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 flex items-start gap-3">
                            <Link className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                            <div className="text-xs">
                              <div className="font-bold text-indigo-950 font-mono">Ticket ID: #{activeTask.ticketId}</div>
                              {linkedTicket ? (
                                <div className="mt-1 text-slate-700 space-y-1">
                                  <div><strong className="font-semibold text-indigo-900">Asunto:</strong> {linkedTicket.subject}</div>
                                  <div><strong className="font-semibold text-indigo-900">Cuenta / Empresa:</strong> {linkedTicket.account}</div>
                                </div>
                              ) : (
                                <div className="mt-1 text-slate-500 italic">
                                  Vinculado manualmente a ticket ID externo o de otra vista.
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/40 text-xs text-slate-400 italic">
                            Esta es una tarea operativa interna independiente, no está vinculada a ningún ticket específico del CRM.
                          </div>
                        )}
                      </div>

                      {/* Commercial Terms Summary if available */}
                      {activeTask.commercialTerms && (
                        <div className="p-4 bg-amber-50/45 rounded-2xl border border-amber-150/60 space-y-2.5 animate-fadeIn">
                          <span className="text-[10px] font-mono font-black text-amber-850 uppercase tracking-widest block">Términos Comerciales del Acuerdo</span>
                          <div className="grid grid-cols-2 gap-3 text-xs text-slate-700 font-medium">
                            {activeTask.commercialTerms.paymentTerms && (
                              <div><strong className="font-semibold text-amber-900">Pago:</strong> {activeTask.commercialTerms.paymentTerms}</div>
                            )}
                            {activeTask.commercialTerms.deliveryTime && (
                              <div><strong className="font-semibold text-amber-900">Entrega:</strong> {activeTask.commercialTerms.deliveryTime}</div>
                            )}
                            {activeTask.commercialTerms.sla && (
                              <div><strong className="font-semibold text-amber-900">SLA:</strong> {activeTask.commercialTerms.sla}</div>
                            )}
                            {activeTask.commercialTerms.warranty && (
                              <div><strong className="font-semibold text-amber-900">Garantía:</strong> {activeTask.commercialTerms.warranty}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Documentation Wiki Preview */}
                      {activeTask.documentation && activeTask.documentation.trim().length > 10 && (
                        <div className="p-4 bg-sky-50/30 rounded-2xl border border-sky-100/60 space-y-2 animate-fadeIn">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono font-black text-sky-850 uppercase tracking-widest block">Resumen de Documentación Asociada</span>
                            <button onClick={() => setActiveDetailTab('documentation')} className="text-[10px] font-bold text-sky-700 hover:underline">
                              Ver Wiki completa →
                            </button>
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed italic">
                            "{activeTask.documentation}"
                          </p>
                        </div>
                      )}

                      {/* Completion Report */}
                      {activeTask.completionReport && (
                        <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl flex gap-3 items-start animate-fadeIn">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-emerald-950">
                            <span className="font-bold block text-[10px] uppercase tracking-wider text-emerald-700 mb-0.5">Reporte de Cierre</span>
                            {activeTask.completionReport}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right Column (Span 5) */}
                    <div className="md:col-span-5 space-y-5">
                      {/* Task Control Parameters Box */}
                      <div className="bg-slate-50/70 p-4.5 rounded-2xl border border-slate-200/50 space-y-4">
                        <h4 className="text-[10px] font-mono font-black text-indigo-950 uppercase tracking-widest flex items-center gap-1.5 border-b border-indigo-100/60 pb-2">
                          <Calendar className="w-4 h-4 text-indigo-600" />
                          Parámetros de Control
                        </h4>

                        <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-xs border-b border-slate-200/50 pb-4">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Responsable</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {agents.find(a => a.id === activeTask.assignedToId)?.name || 'Sin Asignar'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Esfuerzo</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{activeTask.effortEstimate}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Planificación</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{activeTask.type === 'Recurrente' ? `Recurrente (${activeTask.frequency})` : activeTask.type}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Ejecución</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-800">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-mono truncate">{activeTask.scheduledDate} {activeTask.scheduledTime}</span>
                            </div>
                          </div>
                        </div>

                        {/* Extended parameters inside the parameters box */}
                        <div className="grid grid-cols-2 gap-y-4 gap-x-3 text-xs pt-1">
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Estado</span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {(() => {
                                const status = activeTask.status || 'Pendiente';
                                let dotColor = 'bg-slate-400';
                                let textColor = 'text-slate-800';
                                if (status === 'En proceso') {
                                  dotColor = 'bg-amber-500';
                                } else if (status === 'Completado') {
                                  dotColor = 'bg-emerald-500';
                                }
                                return (
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                                    <span className={textColor}>{status}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Prioridad</span>
                            <div className="flex items-center gap-1.5 pt-0.5">
                              {(() => {
                                const priority = activeTask.priority || 'Media';
                                let bg = 'bg-slate-100 text-slate-700 border-slate-200';
                                if (priority === 'Baja') bg = 'bg-slate-100 text-slate-600 border-slate-200';
                                else if (priority === 'Media') bg = 'bg-blue-50 text-blue-700 border-blue-100';
                                else if (priority === 'Alta') bg = 'bg-orange-50 text-orange-700 border-orange-100';
                                else if (priority === 'Crítica') bg = 'bg-rose-50 text-rose-700 border-rose-100 animate-pulse';
                                return (
                                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded-lg border ${bg}`}>
                                    {priority}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Categoría / Área</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-850">
                              <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{activeTask.category || 'Soporte'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Rol Técnico</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-850">
                              <ShieldAlert className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{activeTask.assignedRole || 'Cualquiera'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">Alcance</span>
                            <div className="flex items-center gap-1.5 font-bold text-slate-850">
                              {activeTask.scope === 'Interna' ? (
                                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              ) : (
                                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              )}
                              <span className="truncate">{activeTask.scope === 'Interna' ? 'Interna' : 'Para Cliente'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-0.5">F. de Registro</span>
                            <div className="flex items-center gap-1.5 font-mono text-slate-600">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{activeTask.createdDate || '2026-07-19'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Recurrence days display */}
                        {activeTask.type === 'Recurrente' && activeTask.recurrenceDays && activeTask.recurrenceDays.length > 0 && (
                          <div className="pt-3 border-t border-slate-200/50">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Días de repetición</span>
                            <div className="flex flex-wrap gap-1">
                              {activeTask.recurrenceDays.map(day => (
                                <span key={day} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-bold font-mono">
                                  {day}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Secondary Dates */}
                        {activeTask.secondaryDates && activeTask.secondaryDates.length > 0 && (
                          <div className="pt-3 border-t border-slate-200/50">
                            <span className="text-[9px] text-slate-400 uppercase font-bold block mb-1">Fechas adicionales</span>
                            <div className="space-y-1">
                              {activeTask.secondaryDates.map(dStr => (
                                <div key={dStr} className="flex items-center gap-1 text-[10px] text-slate-600 font-mono">
                                  <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>{dStr}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Power Tools Quick Overview Card */}
                      <div className="border border-indigo-150 rounded-2xl p-4 bg-indigo-50/20 space-y-2">
                        <span className="text-[10px] font-black text-indigo-950 uppercase tracking-widest block">Funciones Especiales Activas</span>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {isChecklistEnabled ? (
                            <button onClick={() => setActiveDetailTab('checklist')} className="px-2.5 py-1 bg-white border border-indigo-100 text-[10px] font-bold rounded-lg text-indigo-700 flex items-center gap-1 shadow-2xs hover:bg-indigo-50 transition-colors">
                              <ListTodo className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              Checklist
                            </button>
                          ) : null}

                          {isTimelineEnabled ? (
                            <button onClick={() => setActiveDetailTab('timeline')} className="px-2.5 py-1 bg-white border border-indigo-100 text-[10px] font-bold rounded-lg text-indigo-700 flex items-center gap-1 shadow-2xs hover:bg-indigo-50 transition-colors">
                              <History className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              Bitácora (Timeline)
                            </button>
                          ) : null}

                          {isDocsEnabled ? (
                            <button onClick={() => setActiveDetailTab('documentation')} className="px-2.5 py-1 bg-white border border-indigo-100 text-[10px] font-bold rounded-lg text-indigo-700 flex items-center gap-1 shadow-2xs hover:bg-indigo-50 transition-colors">
                              <BookOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                              Wiki Docs
                            </button>
                          ) : null}

                          {!isChecklistEnabled && !isTimelineEnabled && !isDocsEnabled && (
                            <div className="text-[10px] text-slate-400 italic">
                              Ninguna función especial activada para esta tarea. Actívalas con el botón de tres puntos arriba.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* 2. CHECKLIST FULL POWER TOOL VIEW */}
                {currentTab === 'checklist' && (() => {
                  // Predefined professional checklist templates
                  const CHECKLIST_TEMPLATES = [
                    {
                      title: "💻 Desarrollo de Feature",
                      color: "from-sky-500 to-indigo-600",
                      bg: "bg-sky-50/50 text-indigo-800 border-indigo-100",
                      iconColor: "text-indigo-600",
                      items: [
                        "Diseño de arquitectura e interfaces",
                        "Implementación de APIs y lógica de servidor",
                        "Maquetado e integración de vistas frontend",
                        "Escribir pruebas unitarias e de integración",
                        "Realizar Code Review con el equipo",
                        "Actualizar documentación técnica del proyecto"
                      ]
                    },
                    {
                      title: "🧪 QA y Control de Calidad",
                      color: "from-emerald-500 to-teal-600",
                      bg: "bg-emerald-50/50 text-teal-800 border-teal-100",
                      iconColor: "text-teal-600",
                      items: [
                        "Ejecutar pruebas de regresión manuales",
                        "Probar flujos en dispositivos móviles",
                        "Validar tiempos de respuesta y carga",
                        "Verificar control de errores en formularios",
                        "Prueba de casos extremos (Edge Cases)"
                      ]
                    },
                    {
                      title: "🚀 Despliegue en Producción",
                      color: "from-purple-500 to-pink-600",
                      bg: "bg-purple-50/50 text-purple-800 border-purple-100",
                      iconColor: "text-purple-600",
                      items: [
                        "Verificar y actualizar variables de entorno",
                        "Realizar respaldo de base de datos preventivo",
                        "Ejecutar migraciones y esquemas nuevos",
                        "Verificar compilación final sin errores",
                        "Pruebas rápidas post-lanzamiento (Smoke Tests)"
                      ]
                    },
                    {
                      title: "🎨 Revisión de UX y Diseño",
                      color: "from-rose-500 to-orange-600",
                      bg: "bg-rose-50/50 text-rose-800 border-rose-100",
                      iconColor: "text-rose-600",
                      items: [
                        "Validar contraste de color (Accesibilidad WCAG)",
                        "Revisar consistencia de tipografías y espaciados",
                        "Comprobar animaciones y transiciones de UI",
                        "Validar estados vacíos y loaders de carga",
                        "Probar interactividad fluida de botones"
                      ]
                    },
                    {
                      title: "🛠️ Corrección de Bug Crítico",
                      color: "from-amber-500 to-rose-600",
                      bg: "bg-amber-50/50 text-amber-800 border-amber-100",
                      iconColor: "text-amber-600",
                      items: [
                        "Reproducir y documentar pasos del error",
                        "Inspeccionar registros de logs de servidor",
                        "Escribir corrección de código enfocada",
                        "Validar que no altere dependencias clave",
                        "Ejecutar pruebas de confirmación cruzadas"
                      ]
                    }
                  ];

                  // Local helper functions for legacy subtasks within this active task context
                  const handleToggleAllLegacySubtasks = async (completed: boolean) => {
                    const updatedTasks = tasks.map(t => {
                      if (t.id === activeTask.id) {
                        return {
                          ...t,
                          subtasks: (t.subtasks || []).map(s => ({ ...s, completed }))
                        };
                      }
                      return t;
                    });
                    if (setInternalTasks) setInternalTasks(updatedTasks);
                    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
                    triggerNotification(completed ? 'Marcar todo completado' : 'Marcar todo pendiente', 'info');
                  };

                  const handleClearCompletedLegacySubtasks = async () => {
                    const updatedTasks = tasks.map(t => {
                      if (t.id === activeTask.id) {
                        return {
                          ...t,
                          subtasks: (t.subtasks || []).filter(s => !s.completed)
                        };
                      }
                      return t;
                    });
                    if (setInternalTasks) setInternalTasks(updatedTasks);
                    if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
                    triggerNotification('Limpiar completados', 'info');
                  };

                  const handleAddSuggestedItem = async (suggestionText: string) => {
                    if (activeTask.checklists && activeTask.checklists.length > 0) {
                      handleAddChecklistItem(activeTask.id, activeTask.checklists[0].id, suggestionText);
                      triggerNotification(`Agregado a "${activeTask.checklists[0].title}"`, 'success');
                    } else if (activeTask.subtasks && activeTask.subtasks.length > 0) {
                      handleAddLiveSubtask(activeTask.id, suggestionText);
                      triggerNotification(`Agregado a Checklist Principal`, 'success');
                    } else {
                      const firstChecklistName = "Verificaciones de Tarea";
                      const newChecklist = {
                        id: `CL-${Date.now()}`,
                        title: firstChecklistName,
                        items: [{
                          id: `CLI-${Date.now()}-0`,
                          title: suggestionText,
                          completed: false
                        }]
                      };
                      const updatedTasks = tasks.map(t => {
                        if (t.id === activeTask.id) {
                          return {
                            ...t,
                            checklists: [...(t.checklists || []), newChecklist]
                          };
                        }
                        return t;
                      });
                      if (setInternalTasks) setInternalTasks(updatedTasks);
                      if (onPushTareasToSheet) await onPushTareasToSheet(updatedTasks, contractorTasks);
                      triggerNotification(`Creada lista y agregada sugerencia`, 'success');
                    }
                  };

                  // Dynamic heuristics based on task title and description
                  const taskKeywords = (activeTask.title + " " + (activeTask.notes || "")).toLowerCase();
                  const dynamicSuggestions: string[] = [];

                  if (taskKeywords.includes("api") || taskKeywords.includes("backend") || taskKeywords.includes("db") || taskKeywords.includes("servidor") || taskKeywords.includes("integration") || taskKeywords.includes("endpoint")) {
                    dynamicSuggestions.push(
                      "Validar esquemas de datos entrantes",
                      "Probar manejo de excepciones y códigos de estado HTTP",
                      "Añadir logs de auditoría técnica",
                      "Verificar integridad referencial de base de datos"
                    );
                  } else if (taskKeywords.includes("css") || taskKeywords.includes("ui") || taskKeywords.includes("ux") || taskKeywords.includes("visual") || taskKeywords.includes("diseño") || taskKeywords.includes("componente") || taskKeywords.includes("pantalla") || taskKeywords.includes("vista")) {
                    dynamicSuggestions.push(
                      "Revisar comportamiento responsivo en móviles",
                      "Probar estados de hover y focus en elementos interactivos",
                      "Verificar contraste de color para accesibilidad WCAG",
                      "Añadir animaciones fluidas y micro-interacciones"
                    );
                  } else if (taskKeywords.includes("bug") || taskKeywords.includes("error") || taskKeywords.includes("fallo") || taskKeywords.includes("crash") || taskKeywords.includes("fix") || taskKeywords.includes("solución") || taskKeywords.includes("reparar")) {
                    dynamicSuggestions.push(
                      "Escribir caso de prueba que prevenga regresiones",
                      "Analizar logs detallados de consola en modo desarrollo",
                      "Confirmar corrección en navegadores móviles habituales"
                    );
                  } else {
                    dynamicSuggestions.push(
                      "Actualizar reporte de avance técnico",
                      "Hacer push de rama técnica limpia",
                      "Validar criterios de aceptación con cliente"
                    );
                  }

                  // Stats computations
                  const legacyTotal = activeTask.subtasks?.length || 0;
                  const legacyCompleted = activeTask.subtasks?.filter(s => s.completed).length || 0;
                  const checklistsTotal = activeTask.checklists?.reduce((acc, cl) => acc + cl.items.length, 0) || 0;
                  const checklistsCompleted = activeTask.checklists?.reduce((acc, cl) => acc + cl.items.filter(i => i.completed).length, 0) || 0;
                  const totalItems = legacyTotal + checklistsTotal;
                  const totalCompleted = legacyCompleted + checklistsCompleted;
                  const progressPercent = totalItems > 0 ? Math.round((totalCompleted / totalItems) * 100) : 0;
                  const totalLists = (activeTask.subtasks && activeTask.subtasks.length > 0 ? 1 : 0) + (activeTask.checklists?.length || 0);

                  // Progression-based motivational copy
                  let progressMessage = "📝 Define los primeros pasos de verificación para comenzar con la tarea.";
                  if (progressPercent > 0 && progressPercent < 50) {
                    progressMessage = "⚡ ¡Buen inicio! Sigue completando ítems para avanzar seguro.";
                  } else if (progressPercent >= 50 && progressPercent < 90) {
                    progressMessage = "🔥 ¡Excelente ritmo! Estás superando la mitad del trabajo de verificación.";
                  } else if (progressPercent >= 90 && progressPercent < 100) {
                    progressMessage = "🎯 ¡Falta muy poco! Revisa los últimos detalles para concluir con éxito.";
                  } else if (progressPercent === 100 && totalItems > 0) {
                    progressMessage = "🎉 ¡Espectacular! Se han verificado satisfactoriamente todos los criterios.";
                  }

                  return (
                    <div 
                      className="md:col-span-12 animate-fadeIn flex flex-col lg:flex-row gap-5 items-start h-full overflow-hidden"
                      onWheel={(e) => {
                        if (leftColumnRef.current) {
                          const isInsideLeftColumn = leftColumnRef.current.contains(e.target as Node);
                          if (!isInsideLeftColumn) {
                            leftColumnRef.current.scrollTop += e.deltaY;
                          }
                        }
                      }}
                    >
                      
                      {/* Left Column: Checklists (grouped one below another with scroll) */}
                      <div ref={leftColumnRef} className="flex-1 w-full max-h-[calc(64vh-3rem)] overflow-y-auto pr-1.5 space-y-4 scrollbar-thin">
                        <div className="flex flex-col gap-4 pb-4 overflow-visible">
                          
                          {/* Legacy subtasks as first checklist if any exist */}
                          {activeTask.subtasks && activeTask.subtasks.length > 0 && (
                            <div className="bg-white border border-slate-200/80 rounded-2xl shadow-3xs p-4 flex flex-col h-fit relative overflow-visible transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
                              {/* Left border indicator */}
                              <div className="absolute top-0 bottom-0 left-0 w-1 rounded-l-2xl bg-indigo-600" />
                              
                              <div className="flex items-center justify-between gap-2 mb-3.5 pl-1.5 group/header">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h5 className="font-extrabold text-slate-800 text-sm tracking-tight truncate">
                                    Checklist Principal
                                  </h5>
                                  <span className="text-[10px] font-black font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md shrink-0">
                                    {legacyCompleted}/{legacyTotal}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button 
                                    onClick={() => handleToggleAllLegacySubtasks(true)}
                                    className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                    title="Marcar todo completado"
                                  >
                                    Todo ✓
                                  </button>
                                  <button 
                                    onClick={handleClearCompletedLegacySubtasks}
                                    className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                    title="Limpiar completados"
                                  >
                                    Limpiar
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 pl-1.5 overflow-visible">
                                {activeTask.subtasks
                                  .filter(sub => {
                                    if (checklistSearchQuery && !sub.title.toLowerCase().includes(checklistSearchQuery.toLowerCase())) return false;
                                    if (checklistFilterTab === 'pending') return !sub.completed;
                                    if (checklistFilterTab === 'completed') return sub.completed;
                                    return true;
                                  })
                                  .map(sub => (
                                    <ChecklistItemView
                                      key={sub.id}
                                      item={sub}
                                      agents={agents}
                                      defaultAssigneeId={activeTask.assignedToId}
                                      onUpdate={(updates) => handleUpdateLiveSubtask(activeTask.id, sub.id, updates)}
                                      onRemove={() => handleRemoveLiveSubtask(activeTask.id, sub.id)}
                                      onToggle={() => handleToggleSubtask(activeTask.id, sub.id)}
                                    />
                                  ))}
                              </div>

                              {/* Input for legacy subtasks */}
                              <div className="mt-3.5 flex gap-1.5 pt-2 border-t border-slate-100 pl-1.5">
                                <input 
                                  type="text"
                                  placeholder="Añadir ítem a la lista principal..."
                                  value={inlineSubtaskText[`${activeTask.id}-main`] || ''}
                                  onChange={e => setInlineSubtaskText({...inlineSubtaskText, [`${activeTask.id}-main`]: e.target.value})}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      handleAddLiveSubtask(activeTask.id, inlineSubtaskText[`${activeTask.id}-main`]);
                                      setInlineSubtaskText({...inlineSubtaskText, [`${activeTask.id}-main`]: ''});
                                    }
                                  }}
                                  className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-150"
                                />
                                <button 
                                  onClick={() => {
                                    handleAddLiveSubtask(activeTask.id, inlineSubtaskText[`${activeTask.id}-main`]);
                                    setInlineSubtaskText({...inlineSubtaskText, [`${activeTask.id}-main`]: ''});
                                  }}
                                  className="px-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                >
                                  Agregar
                                </button>
                              </div>
                            </div>
                          )}

                          {/* New Checklists */}
                          {activeTask.checklists?.map((checklist, cIdx) => {
                            // Cycle visual themes
                            const themes = [
                              "bg-indigo-600",
                              "bg-emerald-600",
                              "bg-purple-600",
                              "bg-amber-600",
                              "bg-pink-600",
                              "bg-sky-600"
                            ];
                            const themeColor = themes[cIdx % themes.length];

                            return (
                              <div key={checklist.id} className="bg-white border border-slate-200/80 rounded-2xl shadow-3xs p-4 flex flex-col h-fit relative overflow-visible transition-all duration-300 hover:shadow-md hover:border-slate-300/80">
                                {/* Visual left indicator */}
                                <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-2xl ${themeColor}`} />
                                
                                <div className="flex items-center justify-between gap-2 mb-3.5 pl-1.5 group/header">
                                  <div className="flex-1 min-w-0">
                                    {editingChecklistId === checklist.id ? (
                                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                        <input
                                          type="text"
                                          value={editingChecklistTitle}
                                          onChange={e => setEditingChecklistTitle(e.target.value)}
                                          className="w-full text-xs font-black text-slate-800 px-2 py-1 rounded-lg border border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                          autoFocus
                                          onKeyDown={e => {
                                            if (e.key === 'Enter') {
                                              handleRenameChecklist(activeTask.id, checklist.id, editingChecklistTitle);
                                              setEditingChecklistId(null);
                                            } else if (e.key === 'Escape') {
                                              setEditingChecklistId(null);
                                            }
                                          }}
                                        />
                                        <button
                                          onClick={() => {
                                            handleRenameChecklist(activeTask.id, checklist.id, editingChecklistTitle);
                                            setEditingChecklistId(null);
                                          }}
                                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => setEditingChecklistId(null)}
                                          className="p-1 text-slate-400 hover:bg-slate-50 rounded cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1.5">
                                        <h5 className="font-extrabold text-slate-800 text-sm tracking-tight truncate" title={checklist.title}>
                                          {checklist.title}
                                        </h5>
                                        <span className="text-[10px] font-black font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md shrink-0">
                                          {checklist.items.filter(i => i.completed).length}/{checklist.items.length}
                                        </span>
                                        <button
                                          onClick={() => {
                                            setEditingChecklistId(checklist.id);
                                            setEditingChecklistTitle(checklist.title);
                                          }}
                                          className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors opacity-0 group-hover/header:opacity-100 cursor-pointer"
                                          title="Renombrar lista"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button 
                                      onClick={() => handleToggleAllChecklistItems(activeTask.id, checklist.id, true)}
                                      className="text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                      title="Marcar todo completado"
                                    >
                                      Todo ✓
                                    </button>
                                    <button 
                                      onClick={() => handleClearCompletedChecklistItems(activeTask.id, checklist.id)}
                                      className="text-[10px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                      title="Limpiar completados"
                                    >
                                      Limpiar
                                    </button>
                                    <button 
                                      onClick={() => handleRemoveChecklist(activeTask.id, checklist.id)} 
                                      className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-all cursor-pointer"
                                      title="Eliminar lista"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 pl-1.5 overflow-visible">
                                  {checklist.items.length === 0 ? (
                                    <div className="text-center py-8 text-slate-400 text-xs border border-dashed border-slate-100 rounded-2xl bg-slate-50/30">
                                      Lista vacía. Añade un ítem abajo.
                                    </div>
                                  ) : (
                                    checklist.items
                                      .filter(item => {
                                        if (checklistSearchQuery && !item.title.toLowerCase().includes(checklistSearchQuery.toLowerCase())) return false;
                                        if (checklistFilterTab === 'pending') return !item.completed;
                                        if (checklistFilterTab === 'completed') return item.completed;
                                        return true;
                                      })
                                      .map(item => (
                                        <ChecklistItemView
                                          key={item.id}
                                          item={item}
                                          agents={agents}
                                          defaultAssigneeId={activeTask.assignedToId}
                                          onUpdate={(updates) => handleUpdateChecklistItem(activeTask.id, checklist.id, item.id, updates)}
                                          onRemove={() => handleRemoveChecklistItem(activeTask.id, checklist.id, item.id)}
                                          onToggle={() => handleToggleChecklistItem(activeTask.id, checklist.id, item.id)}
                                        />
                                      ))
                                  )}
                                </div>

                                {/* Input for new items */}
                                <div className="mt-3.5 flex gap-1.5 pt-2 border-t border-slate-100 pl-1.5">
                                  <input 
                                    type="text"
                                    placeholder="Añadir ítem..."
                                    value={inlineSubtaskText[`${activeTask.id}-${checklist.id}`] || ''}
                                    onChange={e => setInlineSubtaskText({...inlineSubtaskText, [`${activeTask.id}-${checklist.id}`]: e.target.value})}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        handleAddChecklistItem(activeTask.id, checklist.id, inlineSubtaskText[`${activeTask.id}-${checklist.id}`]);
                                        setInlineSubtaskText({...inlineSubtaskText, [`${activeTask.id}-${checklist.id}`]: ''});
                                      }
                                    }}
                                    className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-150"
                                  />
                                  <button 
                                    onClick={() => {
                                      handleAddChecklistItem(activeTask.id, checklist.id, inlineSubtaskText[`${activeTask.id}-${checklist.id}`]);
                                      setInlineSubtaskText({...inlineSubtaskText, [`${activeTask.id}-${checklist.id}`]: ''});
                                    }}
                                    className="px-2.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Agregar
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Completely Empty State */}
                        {(!activeTask.checklists || activeTask.checklists.length === 0) && (!activeTask.subtasks || activeTask.subtasks.length === 0) && (
                          <div className="text-center py-16 text-slate-500 text-xs flex flex-col items-center justify-center space-y-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200/80 mt-2">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                              <ListTodo className="w-6 h-6" />
                            </div>
                            <div className="space-y-1.5 max-w-sm">
                              <p className="font-extrabold text-slate-800 text-sm">No hay listas de verificación activas</p>
                              <p className="text-slate-400 leading-relaxed text-[11px]">
                                Para optimizar tu flujo, puedes crear una lista desde cero o cargar una plantilla inteligente con verificación especializada en un clic.
                              </p>
                            </div>

                            {/* Intelligent Templates Quick Starter Grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-w-2xl w-full pt-4 px-4">
                              {CHECKLIST_TEMPLATES.map((tmpl, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => handleLoadChecklistTemplate(activeTask.id, tmpl.title, tmpl.items)}
                                  className="p-3 bg-white hover:bg-indigo-50/10 border border-slate-200/60 hover:border-indigo-200 rounded-xl transition-all text-left cursor-pointer group flex flex-col justify-between"
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5 text-xs font-black text-slate-800 group-hover:text-indigo-600 transition-colors">
                                      <Sparkles className={`w-3.5 h-3.5 ${tmpl.iconColor}`} />
                                      <span className="truncate">{tmpl.title.split(' ').slice(1).join(' ')}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">Sugerencias recomendadas para este tipo de requerimiento técnico.</p>
                                  </div>
                                  <span className="text-[9px] font-black text-indigo-600 mt-2.5 inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                                    Cargar plantilla →
                                  </span>
                                </button>
                              ))}
                            </div>

                            <div className="text-slate-300 font-bold text-[10px] uppercase tracking-widest pt-4">— O BIEN —</div>

                            {creatingChecklistFor === activeTask.id ? (
                              <div className="flex items-center gap-2 mt-2 bg-white p-1.5 border border-slate-200 rounded-xl shadow-3xs animate-scaleIn">
                                <input
                                  type="text"
                                  value={newChecklistTitle}
                                  onChange={e => setNewChecklistTitle(e.target.value)}
                                  placeholder="Nombre de la lista personalizada..."
                                  autoFocus
                                  onKeyDown={e => {
                                    if (e.key === 'Enter' && newChecklistTitle.trim()) {
                                      handleAddChecklist(activeTask.id, newChecklistTitle);
                                      setCreatingChecklistFor(null);
                                      setNewChecklistTitle('');
                                    } else if (e.key === 'Escape') {
                                      setCreatingChecklistFor(null);
                                      setNewChecklistTitle('');
                                    }
                                  }}
                                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                />
                                <button
                                  onClick={() => {
                                    if (newChecklistTitle.trim()) {
                                      handleAddChecklist(activeTask.id, newChecklistTitle);
                                      setCreatingChecklistFor(null);
                                      setNewChecklistTitle('');
                                    }
                                  }}
                                  className="p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors cursor-pointer shadow-sm"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setCreatingChecklistFor(null);
                                    setNewChecklistTitle('');
                                  }}
                                  className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-lg transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setCreatingChecklistFor(activeTask.id);
                                  setNewChecklistTitle('');
                                }}
                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
                              >
                                Crear Lista Personalizada
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right Column: Compact Static Dashboard & Search Filters */}
                      <div className="w-full lg:w-[320px] shrink-0 space-y-4 bg-slate-50/50 border border-slate-200/70 rounded-2xl p-4 lg:sticky lg:top-4 self-start max-h-[calc(64vh-3rem)] overflow-y-auto scrollbar-none">
                        {/* Progress and title */}
                        <div className="flex items-center gap-3 border-b border-slate-200/50 pb-3">
                          {/* Radial Gauge Visual Indicator */}
                          <div className="relative w-11 h-11 shrink-0 flex items-center justify-center bg-white rounded-full shadow-4xs border border-indigo-50">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle
                                cx="22"
                                cy="22"
                                r="18"
                                className="stroke-slate-100"
                                strokeWidth="3.5"
                                fill="transparent"
                              />
                              <circle
                                cx="22"
                                cy="22"
                                r="18"
                                className="stroke-indigo-600 transition-all duration-500"
                                strokeWidth="3.5"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 18}
                                strokeDashoffset={2 * Math.PI * 18 * (1 - progressPercent / 100)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-[9px] font-black text-slate-800 font-mono">
                              {progressPercent}%
                            </span>
                          </div>

                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-slate-900 flex items-center gap-1">
                              <ListTodo className="w-4 h-4 text-indigo-600 shrink-0" />
                              <span className="truncate">Checklists y Verificación</span>
                            </h4>
                            {totalItems > 0 && (
                              <div className="text-[9px] font-mono text-indigo-600 bg-indigo-50/80 px-1.5 py-0.5 rounded-md font-black inline-block mt-0.5">
                                {totalCompleted}/{totalItems} completados
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Motivational progress message */}
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium bg-white/75 border border-slate-100 p-2.5 rounded-xl">
                          {progressMessage}
                        </p>

                        {/* Summary Numbers Grid */}
                        <div className="grid grid-cols-3 gap-2 bg-white/50 border border-slate-200/40 rounded-xl p-2 text-center">
                          <div>
                            <div className="text-sm font-black text-slate-950 font-mono">{totalLists}</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Listas</div>
                          </div>
                          <div className="border-x border-slate-200/50">
                            <div className="text-sm font-black text-indigo-700 font-mono">{totalItems - totalCompleted}</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Pendientes</div>
                          </div>
                          <div>
                            <div className="text-sm font-black text-emerald-600 font-mono">{totalCompleted}</div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Hechos</div>
                          </div>
                        </div>

                        {/* Search and Filters Section */}
                        <div className="space-y-2 pt-2 border-t border-slate-200/50">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Buscar y Filtrar</label>
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={checklistSearchQuery}
                              onChange={e => setChecklistSearchQuery(e.target.value)}
                              placeholder="Buscar ítems..."
                              className="w-full bg-white border border-slate-200/80 focus:border-indigo-400 hover:border-slate-300 rounded-xl pl-8 pr-4 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400"
                            />
                            {checklistSearchQuery && (
                              <button 
                                onClick={() => setChecklistSearchQuery('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col gap-1 bg-white border border-slate-200/80 rounded-xl p-1">
                            {(['all', 'pending', 'completed'] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setChecklistFilterTab(tab)}
                                className={`w-full text-left px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-between ${
                                  checklistFilterTab === tab 
                                    ? 'bg-slate-950 text-white shadow-sm' 
                                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                              >
                                <span>{tab === 'all' ? 'Ver Todo' : tab === 'pending' ? 'Pendientes' : 'Completados'}</span>
                                {tab === 'all' && <span className="text-[9px] font-mono opacity-80">{totalItems}</span>}
                                {tab === 'pending' && <span className="text-[9px] font-mono opacity-80">{totalItems - totalCompleted}</span>}
                                {tab === 'completed' && <span className="text-[9px] font-mono opacity-80">{totalCompleted}</span>}
                              </button>
                            ))}
                          </div>
                        </div>

                      </div>

                    </div>
                  );
                })()}

                {/* 3. TIMELINE / BITÁCORA POWER TOOL VIEW */}
                {currentTab === 'timeline' && (
                  <div className="md:col-span-12 space-y-4 animate-fadeIn flex flex-col h-full">
                    <div className="border-b border-slate-100 pb-3 shrink-0">
                      <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                        <History className="w-5 h-5 text-indigo-600" />
                        <span>Bitácora de Eventos y Auditoría Operativa</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">Línea de tiempo cronológica con todas las notas, cambios de estado y comentarios técnicos.</p>
                    </div>

                    {/* Timeline Event Cards Wrapper */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-h-[160px] max-h-[28vh] p-2 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="relative pl-6 border-l-2 border-indigo-100 space-y-5 ml-4.5 mt-2 py-1">
                        {allTimelineEvents.map((evt, idx) => {
                          const dateObj = new Date(evt.timestamp);
                          const formattedTime = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                          return (
                            <div key={evt.id || idx} className="relative animate-fadeIn">
                              {/* Dot Icon */}
                              <div className="absolute -left-9 top-0.5 w-6 h-6 rounded-full bg-white border-2 border-indigo-500 flex items-center justify-center shadow-3xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                              </div>

                              {/* Timeline card content */}
                              <div className="bg-white rounded-xl border border-slate-200/60 p-3 shadow-3xs hover:border-slate-300 transition-all max-w-2xl">
                                <div className="flex items-center justify-between gap-4 mb-1">
                                  <span className="text-xs font-black text-slate-900 font-display">
                                    {evt.title}
                                  </span>
                                  <span className="text-[9px] font-mono font-bold text-slate-400">
                                    {formattedTime}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-600 leading-normal font-medium">
                                  {evt.note}
                                </p>
                                <div className="text-[9px] text-indigo-600/80 font-semibold font-mono mt-1.5 flex items-center gap-1">
                                  <User className="w-3 h-3 text-indigo-400" />
                                  <span>Por: {evt.author}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Add Custom Timeline entry Form */}
                    <div className="bg-white p-3 border border-slate-200/80 rounded-2xl space-y-2 max-w-xl shadow-2xs shrink-0">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Agregar comentario operativo</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTimelineText}
                          onChange={(e) => setNewTimelineText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddTimelineEvent(activeTask.id, newTimelineText);
                            }
                          }}
                          placeholder="Escribe un avance técnico o nota para el siguiente turno..."
                          className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddTimelineEvent(activeTask.id, newTimelineText)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-colors shrink-0 cursor-pointer"
                        >
                          Registrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. DOCUMENTATION / WIKI POWER TOOL VIEW */}
                {currentTab === 'documentation' && (
                  <div className="md:col-span-12 space-y-4 animate-fadeIn flex flex-col h-full">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3 shrink-0">
                      <div>
                        <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-indigo-600" />
                          <span>Wiki y Documentación de Ejecución</span>
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">Depósito técnico para guardar contraseñas, configuraciones, IPs y diagramas útiles para el roster.</p>
                      </div>

                      {!isEditingDocs && (
                        <button
                          type="button"
                          onClick={() => {
                            setDocumentationDraft(activeTask.documentation || '');
                            setIsEditingDocs(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1 cursor-pointer border border-indigo-100/60"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Editar Wiki</span>
                        </button>
                      )}
                    </div>

                    {/* Wiki content body */}
                    <div className="flex-1 flex flex-col min-h-[220px]">
                      {isEditingDocs ? (
                        <div className="space-y-3 flex flex-col flex-1">
                          <textarea
                            value={documentationDraft}
                            onChange={(e) => setDocumentationDraft(e.target.value)}
                            placeholder="Escribe las instrucciones técnicas aquí. Puedes incluir IPs, credenciales necesarias, links, comandos que ejecutar, etc..."
                            className="w-full flex-1 min-h-[180px] p-4 bg-slate-50 border border-slate-200 rounded-2xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 leading-relaxed resize-none"
                          />
                          <div className="flex justify-end gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setIsEditingDocs(false)}
                              className="px-4 py-2 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveDocumentation(activeTask.id, documentationDraft)}
                              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-colors shadow-md hover:shadow-indigo-500/10 cursor-pointer"
                            >
                              Guardar Wiki
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200/60 flex-1 overflow-y-auto max-h-[36vh]">
                          {activeTask.documentation ? (
                            <div className="text-slate-700 text-xs font-medium font-mono leading-relaxed whitespace-pre-wrap">
                              {activeTask.documentation}
                            </div>
                          ) : (
                            <div className="text-center py-10 space-y-3">
                              <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
                              <div className="text-xs text-slate-400 italic">No hay documentación guardada para esta tarea.</div>
                              <p className="text-[11px] text-slate-400 max-w-md mx-auto">Toda la información técnica ingresada aquí estará disponible para cualquier operador que asuma la ejecución de este ticket.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setDocumentationDraft('');
                                  setIsEditingDocs(true);
                                }}
                                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black rounded-lg transition-colors cursor-pointer"
                              >
                                Redactar Procedimiento
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. RECURRENCE POWER TOOL VIEW */}
                {currentTab === 'recurrence' && (() => {
                  const currentHistory = activeTask.recurrenceConfig?.pastIterationsHistory || [];
                  const iterationNumber = activeTask.recurrenceConfig?.iterationNumber || 1;

                  // Simple calendar generator for visual display of execution vs creation dates
                  const generateCalendarDays = () => {
                    const today = new Date();
                    const year = today.getFullYear();
                    const month = today.getMonth(); // 0-indexed
                    
                    const firstDayInstance = new Date(year, month, 1);
                    const startDayOfWeek = firstDayInstance.getDay();
                    const totalDays = new Date(year, month + 1, 0).getDate();
                    
                    const days = [];
                    for (let i = 0; i < startDayOfWeek; i++) {
                      days.push({ day: null, dateStr: null });
                    }
                    
                    for (let d = 1; d <= totalDays; d++) {
                      const dateObj = new Date(year, month, d);
                      const yyyy = dateObj.getFullYear();
                      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
                      const dd = String(dateObj.getDate()).padStart(2, '0');
                      const dateStr = `${yyyy}-${mm}-${dd}`;
                      days.push({ day: d, dateStr });
                    }
                    
                    return { days, monthName: today.toLocaleString('es-ES', { month: 'long' }) };
                  };
                  
                  const { days: calendarDays, monthName } = generateCalendarDays();

                  // Calculate creation date based on next execution date and creation delay
                  let calculatedCreationDate = '';
                  if (recurrenceNextExecDate) {
                    const nextExec = new Date(recurrenceNextExecDate);
                    const nextCreation = new Date(nextExec);
                    nextCreation.setDate(nextCreation.getDate() - recurrenceCreationDelay);
                    calculatedCreationDate = nextCreation.toISOString().split('T')[0];
                  }

                  const getProjectedDates = (startDateStr: string, freq: string, interval: number, count: number) => {
                    if (!startDateStr) return [];
                    const dates = [];
                    // Using UTC to avoid timezone shifting issues when adding days/months
                    let [y, m, d] = startDateStr.split('-');
                    let currDate = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d)));
                    
                    dates.push(new Date(currDate));
                    for (let i = 1; i < count; i++) {
                      if (freq === 'daily') {
                        currDate.setUTCDate(currDate.getUTCDate() + interval);
                      } else if (freq === 'weekly') {
                        currDate.setUTCDate(currDate.getUTCDate() + (interval * 7));
                      } else if (freq === 'monthly') {
                        currDate.setUTCMonth(currDate.getUTCMonth() + interval);
                      }
                      dates.push(new Date(currDate));
                    }
                    return dates;
                  };
                  
                  const projectedDates = getProjectedDates(recurrenceNextExecDate, recurrenceFrequency, recurrenceInterval, 3);

                  return (
                    <div className="md:col-span-12 space-y-4 animate-fadeIn flex flex-col h-[68vh] min-h-[500px] text-slate-800 pb-1">
                      {/* Sub-Header */}
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 shrink-0">
                        <div>
                          <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-600" />
                            <span>Power Tool: Automatización y Serie Recurrente</span>
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">Controla las reglas de repetición, checklists, wiki del proceso e historial de ejecuciones pasadas.</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-600">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span>Iteración Actual: #{iterationNumber}</span>
                        </div>
                      </div>

                      {/* Main Workspace split into Navigation (Left) and Content (Right) */}
                      <div className="flex-1 flex gap-5 overflow-hidden min-h-0">
                        
                        {/* Sidebar Sub-Navigation */}
                        <div className="w-52 shrink-0 bg-slate-50 rounded-2xl border border-slate-200/50 p-2 flex flex-col gap-1 justify-between">
                          <div className="space-y-1">
                            <button
                              type="button"
                              onClick={() => setRecurrenceSubTab('rules')}
                              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                                recurrenceSubTab === 'rules'
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                              }`}
                            >
                              <Calendar className="w-3.5 h-3.5" />
                              <span>⚙️ Reglas de Serie</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRecurrenceSubTab('checklist')}
                              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                                recurrenceSubTab === 'checklist'
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                              }`}
                            >
                              <ListTodo className="w-3.5 h-3.5" />
                              <span>📋 Checklist Serie</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRecurrenceSubTab('wiki')}
                              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                                recurrenceSubTab === 'wiki'
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                              }`}
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>📖 Documentación</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRecurrenceSubTab('history')}
                              className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center gap-2.5 cursor-pointer ${
                                recurrenceSubTab === 'history'
                                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10'
                                  : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                              }`}
                            >
                              <History className="w-3.5 h-3.5" />
                              <span>📜 Historial y Bitácora</span>
                            </button>
                          </div>
                        </div>

                        {/* Content Pane */}
                        <div className="flex-1 bg-white border border-slate-200/40 rounded-2xl p-4 overflow-y-auto min-h-0">
                          
                          {/* SUBTAB 1: RULES */}
                          {recurrenceSubTab === 'rules' && (
                            <div className="space-y-4 animate-fadeIn">
                              <div className="flex justify-between items-center">
                                <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">Reglas de Repetición y Cronograma</h5>
                                
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Rule Fields */}
                                <div className="space-y-3.5">
                                  <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Frecuencia</label>
                                      <select 
                                        value={recurrenceFrequency}
                                        onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                      >
                                        <option value="daily">Diario</option>
                                        <option value="weekly">Semanal</option>
                                        <option value="monthly">Mensual</option>
                                      </select>
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Intervalo</label>
                                      <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-800">
                                        <span>Cada</span>
                                        <input 
                                          type="number" 
                                          min="1"
                                          value={recurrenceInterval}
                                          onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                                          className="w-7 bg-transparent font-black text-center focus:outline-none"
                                        />
                                        <span>{recurrenceFrequency === 'daily' ? 'días' : recurrenceFrequency === 'weekly' ? 'sem.' : 'meses'}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Siguiente Fecha de Ejecución</label>
                                    <input 
                                      type="date"
                                      value={recurrenceNextExecDate}
                                      onChange={(e) => setRecurrenceNextExecDate(e.target.value)}
                                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                    />
                                  </div>

                                  <div className="space-y-1.5 pt-1">
                                    <div className="flex justify-between items-center">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                        <span>Anticipación de Creación</span>
                                        <HelpCircle className="w-3.5 h-3.5 text-slate-400" title="Controla cuántos días antes de la ejecución se creará la próxima iteración en el tablero" />
                                      </label>
                                      <span className="text-[10px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md">
                                        {recurrenceCreationDelay} {recurrenceCreationDelay === 1 ? 'día antes' : 'días antes'}
                                      </span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="0" 
                                      max="14" 
                                      value={recurrenceCreationDelay}
                                      onChange={(e) => setRecurrenceCreationDelay(parseInt(e.target.value))}
                                      className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                    />
                                    <p className="text-[9px] text-slate-400 leading-normal">
                                      La próxima iteración se planificará para el <strong className="text-slate-600 font-bold">{recurrenceNextExecDate}</strong> y aparecerá visible el <strong className="text-indigo-600 font-bold">{calculatedCreationDate}</strong>.
                                    </p>
                                  </div>

                                  {/* Proyecciones futuras */}
                                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
                                    <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <Sparkles className="w-3 h-3 text-amber-500" />
                                      Próximas Proyecciones
                                    </h6>
                                    <div className="space-y-1.5">
                                      {projectedDates.map((date, idx) => {
                                        const dateStr = date.toISOString().split('T')[0];
                                        return (
                                          <div key={idx} className="flex items-center justify-between text-xs bg-white border border-slate-100 p-2 rounded-lg shadow-2xs">
                                            <span className="font-semibold text-slate-700">Iteración #{idx + 1}</span>
                                            <span className="font-mono font-bold text-indigo-600">{dateStr}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                </div>

                                {/* Right Side: Compact Calendar & Assigned Agents */}
                                <div className="space-y-3.5 bg-slate-50 rounded-xl p-3 border border-slate-200/50">
                                  {/* Calendar */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Cronograma ({monthName})</span>
                                      <div className="flex gap-2 text-[8px] font-bold text-slate-500">
                                        <div className="flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                                          <span>Planificada</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                          <span>Visible</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] font-bold pt-1 border-t border-slate-100">
                                      {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, idx) => (
                                        <div key={idx} className="text-slate-400 py-0.5">{day}</div>
                                      ))}
                                      {calendarDays.map((cell, idx) => {
                                        const isExec = cell.dateStr === recurrenceNextExecDate;
                                        const isCreate = cell.dateStr === calculatedCreationDate;
                                        return (
                                          <div 
                                            key={idx} 
                                            className={`py-1 rounded relative flex items-center justify-center ${
                                              !cell.day ? 'opacity-0 pointer-events-none' : 'bg-white border border-slate-100/30 text-[8px]'
                                            } ${
                                              isExec ? 'bg-indigo-600 text-white font-black' : ''
                                            } ${
                                              isCreate && !isExec ? 'bg-sky-100 text-sky-800 font-bold border-sky-300' : ''
                                            }`}
                                          >
                                            <span>{cell.day}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>

                                  {/* Roster / Involved Agents */}
                                  <div className="space-y-1.5 pt-1 border-t border-slate-200/55">
                                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Asignatarios por Defecto del Roster</span>
                                    <div className="flex flex-wrap gap-1">
                                      {agents.map(agent => {
                                        const isChecked = recurrenceInvolvedAgents.includes(agent.id);
                                        return (
                                          <button
                                            key={agent.id}
                                            type="button"
                                            onClick={() => {
                                              setRecurrenceInvolvedAgents(prev => 
                                                prev.includes(agent.id) 
                                                  ? prev.filter(id => id !== agent.id) 
                                                  : [...prev, agent.id]
                                              );
                                            }}
                                            className={`px-2 py-1 rounded-lg text-left border flex items-center gap-1.5 transition-all cursor-pointer ${
                                              isChecked 
                                                ? 'bg-indigo-100 border-indigo-200 text-indigo-900 font-bold' 
                                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-100'
                                            }`}
                                          >
                                            <div className="w-4 h-4 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center font-bold text-[8px] text-slate-700">
                                              {agent.name.charAt(0)}
                                            </div>
                                            <span className="text-[9px] truncate max-w-[70px]">{agent.name}</span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* SUBTAB 2: CHECKLIST */}
                          {recurrenceSubTab === 'checklist' && (
                            <div className="space-y-3 animate-fadeIn h-full flex flex-col min-h-0">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="space-y-0.5">
                                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">📋 Checklist Personalizado de la Serie</h5>
                                  <p className="text-[10px] text-slate-500">Diseña y configura múltiples checklists que se generarán en cada nueva iteración.</p>
                                </div>
                                <div className="flex items-center shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => setRecurrenceCreatingChecklist(true)}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0"
                                  >
                                    <Plus className="w-4 h-4 stroke-[3]" />
                                    <span>Crear Checklist</span>
                                  </button>
                                </div>
                              </div>

                              {/* Form to Create New Checklist */}
                              {recurrenceCreatingChecklist && (
                                <div className="flex gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl p-2 animate-scaleIn shrink-0">
                                  <input
                                    type="text"
                                    placeholder="Nombre del nuevo checklist de la serie..."
                                    value={recurrenceNewChecklistTitle}
                                    onChange={(e) => setRecurrenceNewChecklistTitle(e.target.value)}
                                    className="flex-1 bg-white border border-slate-200 focus:border-indigo-400 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleAddRecurrenceChecklist(recurrenceNewChecklistTitle);
                                        setRecurrenceNewChecklistTitle('');
                                        setRecurrenceCreatingChecklist(false);
                                      } else if (e.key === 'Escape') {
                                        setRecurrenceCreatingChecklist(false);
                                      }
                                    }}
                                  />
                                  <button
                                    onClick={() => {
                                      handleAddRecurrenceChecklist(recurrenceNewChecklistTitle);
                                      setRecurrenceNewChecklistTitle('');
                                      setRecurrenceCreatingChecklist(false);
                                    }}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Crear
                                  </button>
                                  <button
                                    onClick={() => setRecurrenceCreatingChecklist(false)}
                                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              )}

                              {/* Checklists List Container */}
                              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50 space-y-3.5 max-h-[300px]">
                                {recurrenceCustomChecklists.length === 0 ? (
                                  <div className="py-12 text-center space-y-1.5 text-slate-400 italic text-[11px]">
                                    <ListTodo className="w-8 h-8 text-slate-300 mx-auto" />
                                    <span>No hay checklists configurados aún para la serie.</span>
                                    <span className="block text-[10px] text-slate-400">Crea uno personalizado o carga una plantilla preestablecida.</span>
                                  </div>
                                ) : (
                                  recurrenceCustomChecklists.map((checklist, cIdx) => {
                                    const themes = [
                                      "bg-indigo-600",
                                      "bg-emerald-600",
                                      "bg-purple-600",
                                      "bg-amber-600",
                                      "bg-pink-600",
                                      "bg-sky-600"
                                    ];
                                    const themeColor = themes[cIdx % themes.length];

                                    return (
                                      <div key={checklist.id} className="bg-white border border-slate-150 rounded-xl shadow-xs p-3 flex flex-col h-fit relative overflow-visible transition-all duration-200 hover:border-slate-300">
                                        {/* Visual left indicator */}
                                        <div className={`absolute top-0 bottom-0 left-0 w-1 rounded-l-xl ${themeColor}`} />
                                        
                                        <div className="flex items-center justify-between gap-2 mb-2 pl-1 group/header">
                                          <div className="flex-1 min-w-0">
                                            {recurrenceEditingChecklistId === checklist.id ? (
                                              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <input
                                                  type="text"
                                                  value={recurrenceEditingChecklistTitle}
                                                  onChange={e => setRecurrenceEditingChecklistTitle(e.target.value)}
                                                  className="w-full text-xs font-black text-slate-800 px-2 py-0.5 rounded-lg border border-indigo-400 focus:outline-none"
                                                  autoFocus
                                                  onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                      handleRenameRecurrenceChecklist(checklist.id, recurrenceEditingChecklistTitle);
                                                      setRecurrenceEditingChecklistId(null);
                                                    } else if (e.key === 'Escape') {
                                                      setRecurrenceEditingChecklistId(null);
                                                    }
                                                  }}
                                                />
                                                <button
                                                  onClick={() => {
                                                    handleRenameRecurrenceChecklist(checklist.id, recurrenceEditingChecklistTitle);
                                                    setRecurrenceEditingChecklistId(null);
                                                  }}
                                                  className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded cursor-pointer"
                                                >
                                                  <Check className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={() => setRecurrenceEditingChecklistId(null)}
                                                  className="p-0.5 text-slate-400 hover:bg-slate-50 rounded cursor-pointer"
                                                >
                                                  <X className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1.5">
                                                <h5 className="font-extrabold text-slate-800 text-[11px] tracking-tight truncate" title={checklist.title}>
                                                  {checklist.title}
                                                </h5>
                                                <span className="text-[9px] font-black font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded shrink-0">
                                                  {checklist.items.length} ítems
                                                </span>
                                                <button
                                                  onClick={() => {
                                                    setRecurrenceEditingChecklistId(checklist.id);
                                                    setRecurrenceEditingChecklistTitle(checklist.title);
                                                  }}
                                                  className="p-0.5 text-slate-400 hover:text-indigo-600 rounded transition-colors opacity-0 group-hover/header:opacity-100 cursor-pointer"
                                                  title="Renombrar lista"
                                                >
                                                  <Edit2 className="w-2.5 h-2.5" />
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1 shrink-0">
                                            <button 
                                              onClick={() => handleRemoveRecurrenceChecklist(checklist.id)}
                                              className="text-[9px] font-bold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-1.5 py-0.5 rounded transition-all cursor-pointer"
                                              title="Eliminar lista"
                                            >
                                              Eliminar
                                            </button>
                                          </div>
                                        </div>

                                        {/* Items vertical list */}
                                        <div className="space-y-1 pl-1 max-h-[140px] overflow-y-auto">
                                          {checklist.items.length === 0 ? (
                                            <div className="py-3 text-center text-slate-400 italic text-[9px]">
                                              No hay ítems en esta lista. Añade uno abajo.
                                            </div>
                                          ) : (
                                            checklist.items.map((item, idx) => (
                                              <div key={idx} className="flex items-center justify-between gap-1.5 p-1 bg-slate-50/50 rounded-lg border border-slate-100 text-[10px] font-semibold text-slate-700">
                                                <div className="flex items-center gap-1.5 truncate">
                                                  <span className="w-3.5 h-3.5 rounded-full bg-slate-100 flex items-center justify-center font-bold text-[8px] text-slate-500 shrink-0">
                                                    {idx + 1}
                                                  </span>
                                                  <span className="truncate">{item}</span>
                                                </div>
                                                <button
                                                  type="button"
                                                  onClick={() => handleRemoveRecurrenceChecklistItem(checklist.id, idx)}
                                                  className="p-0.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </button>
                                              </div>
                                            ))
                                          )}
                                        </div>

                                        {/* Inline add item input */}
                                        <div className="mt-2 pt-1.5 border-t border-slate-100 pl-1 flex gap-1">
                                          <input 
                                            type="text"
                                            placeholder="Añadir ítem a esta lista..."
                                            value={recurrenceInlineItemText[checklist.id] || ''}
                                            onChange={e => setRecurrenceInlineItemText({
                                              ...recurrenceInlineItemText,
                                              [checklist.id]: e.target.value
                                            })}
                                            onKeyDown={e => {
                                              if (e.key === 'Enter') {
                                                handleAddRecurrenceChecklistItem(checklist.id, recurrenceInlineItemText[checklist.id]);
                                                setRecurrenceInlineItemText({
                                                  ...recurrenceInlineItemText,
                                                  [checklist.id]: ''
                                                });
                                              }
                                            }}
                                            className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-lg px-2 py-1 text-[10px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                                          />
                                          <button 
                                            onClick={() => {
                                              handleAddRecurrenceChecklistItem(checklist.id, recurrenceInlineItemText[checklist.id]);
                                              setRecurrenceInlineItemText({
                                                ...recurrenceInlineItemText,
                                                [checklist.id]: ''
                                              });
                                            }}
                                            className="px-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })
                                )}
                              </div>

                              {recurrenceCustomChecklists.length > 0 && (
                                <div className="flex justify-between items-center shrink-0 pt-0.5 text-[9px] text-slate-400">
                                  <span>Total: {recurrenceCustomChecklists.length} checklists en la serie</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setRecurrenceCustomChecklists([]);
                                      triggerNotification("Checklists vaciados", "info");
                                    }}
                                    className="font-bold text-rose-600 hover:underline cursor-pointer"
                                  >
                                    Limpiar todos
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* SUBTAB 3: WIKI */}
                          {recurrenceSubTab === 'wiki' && (
                            <div className="space-y-3 animate-fadeIn h-full flex flex-col min-h-0">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="space-y-0.5">
                                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">📖 Documentación de la Serie</h5>
                                  <p className="text-[10px] text-slate-500">Documentación de Wiki técnica que heredará cada iteración.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRecurrencePrebuiltWiki(activeTask.documentation || '');
                                    triggerNotification("Documentación copiada de la tarea actual", "success");
                                  }}
                                  className="text-[10px] font-black text-indigo-600 hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  <span>Copiar de Wiki actual</span>
                                </button>
                              </div>

                              <div className="flex-1 flex flex-col min-h-0">
                                <textarea 
                                  value={recurrencePrebuiltWiki}
                                  onChange={(e) => setRecurrencePrebuiltWiki(e.target.value)}
                                  placeholder="Detalla aquí las instrucciones, procedimientos, accesos o wiki técnica de esta serie recurrente de forma específica..."
                                  className="flex-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[11px] focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed text-slate-800 resize-none h-[240px]"
                                />
                              </div>
                              <div className="flex justify-between items-center text-[9px] text-slate-400 shrink-0">
                                <span>{recurrencePrebuiltWiki ? `${recurrencePrebuiltWiki.length} caracteres` : 'Sin documentación guardada'}</span>
                                <span className="italic">Se heredará como manual de operación técnica</span>
                              </div>
                            </div>
                          )}

                          {/* SUBTAB 4: HISTORIAL Y BITACORA */}
                          {recurrenceSubTab === 'history' && (
                            <div className="space-y-3 animate-fadeIn h-full flex flex-col min-h-0">
                              <div className="flex justify-between items-center shrink-0">
                                <div className="space-y-0.5">
                                  <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">📜 Bitácora de Sucesos e Historial</h5>
                                  <p className="text-[10px] text-slate-500">Control de cronología e iteraciones de la serie.</p>
                                </div>
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
                                  <input 
                                    type="checkbox" 
                                    checked={recurrenceKeepHistory}
                                    onChange={(e) => setRecurrenceKeepHistory(e.target.checked)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                                  />
                                  <span>Registrar Sucesos</span>
                                </label>
                              </div>

                              <p className="text-[10px] text-slate-500 shrink-0 leading-normal">
                                Al habilitar el <strong>Registro de Sucesos</strong>, la bitácora de la serie guardará automáticamente el responsable, la iteración y la cronología de las ejecuciones anteriores de esta serie.
                              </p>

                              {/* History Items list */}
                              <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl p-2 bg-slate-50/50 space-y-2 max-h-[220px]">
                                {currentHistory.length === 0 ? (
                                  <div className="py-6 text-center text-slate-400 italic text-[10px] space-y-1">
                                    <History className="w-6 h-6 text-slate-300 mx-auto" />
                                    <span>No hay historial previo registrado aún. Las futuras iteraciones se guardarán aquí.</span>
                                  </div>
                                ) : (
                                  <div className="space-y-1.5">
                                    {currentHistory.map((item, idx) => (
                                      <div key={idx} className="p-2 bg-white rounded-xl border border-slate-150/60 flex items-start gap-2.5 text-[10px] font-semibold">
                                        <div className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[9px] flex-shrink-0">
                                          #{item.iteration}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="text-slate-800 flex justify-between items-center">
                                            <span>Completada por {item.completedBy}</span>
                                            <span className="text-[8px] text-indigo-600 font-bold bg-indigo-50 px-1.5 rounded">Guardado</span>
                                          </div>
                                          <div className="text-[8px] text-slate-400 flex justify-between items-center mt-0.5">
                                            <span>Planificada: {item.executionDate}</span>
                                            <span>Cierre: {new Date(item.completedAt).toLocaleDateString()}</span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>



            </div>

            {/* FLOATING NAVIGATION DOCK SELECTOR (Centered at the Bottom, outside the modal window) */}
            <div className="mt-5 shrink-0 animate-scaleIn">
              <div className="bg-slate-900/95 text-white backdrop-blur-md px-2.5 py-2 rounded-full shadow-2xl flex items-center gap-1.5 border border-slate-800 max-w-lg mx-auto z-20">
                {/* Tab: Detalles */}
                <button
                  onClick={() => {
                    setActiveDetailTab('details');
                    setIsEditingDocs(false);
                  }}
                  className={`px-4 py-2 rounded-full text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    currentTab === 'details'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Detalles</span>
                </button>

                {/* Tab: Checklist (if enabled) */}
                {isChecklistEnabled && (
                  <button
                    onClick={() => {
                      setActiveDetailTab('checklist');
                      setIsEditingDocs(false);
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentTab === 'checklist'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ListTodo className="w-3.5 h-3.5" />
                    <span>Checklist {subtaskTotal > 0 ? `(${subtaskCompleted}/${subtaskTotal})` : ''}</span>
                  </button>
                )}

                {/* Tab: Timeline (if enabled) */}
                {isTimelineEnabled && (
                  <button
                    onClick={() => {
                      setActiveDetailTab('timeline');
                      setIsEditingDocs(false);
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentTab === 'timeline'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Bitácora {allTimelineEvents.length > 1 ? `(${allTimelineEvents.length})` : ''}</span>
                  </button>
                )}

                {/* Tab: Documentation (if enabled) */}
                {isDocsEnabled && (
                  <button
                    onClick={() => {
                      setActiveDetailTab('documentation');
                      setDocumentationDraft(activeTask.documentation || '');
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentTab === 'documentation'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Wiki Docs</span>
                  </button>
                )}

                {/* Tab: Recurrence (if enabled) */}
                {isRecurrenceEnabled && (
                  <button
                    onClick={() => {
                      setActiveDetailTab('recurrence');
                      setIsEditingDocs(false);
                    }}
                    className={`px-4 py-2 rounded-full text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      currentTab === 'recurrence'
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Recurrencia</span>
                  </button>
                )}


              </div>
            </div>
          </div>
        );
      })()}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETING A TASK (iframe compliant) */}
      {deleteConfirmTaskId && (() => {
        const taskToDelete = tasks.find(t => t.id === deleteConfirmTaskId);
        if (!taskToDelete) return null;
        return (
          <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 animate-scaleIn space-y-4">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-base font-black font-display text-slate-900">¿Eliminar Tarea Técnica?</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Estás a punto de eliminar permanentemente la tarea <span className="font-extrabold text-slate-800">"{taskToDelete.title}"</span>. Esta acción no se puede deshacer y se sincronizará.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTaskId(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleExecuteDelete(taskToDelete.id)}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs rounded-xl transition-colors shadow-lg cursor-pointer text-center"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CUSTOM CONFIRMATION MODAL FOR ACTIVATING RECURRENCE */}
      {recurrenceConfirmTaskId && (() => {
        const taskToUpdate = tasks.find(t => t.id === recurrenceConfirmTaskId);
        if (!taskToUpdate) return null;
        return (
          <div className="fixed inset-0 bg-slate-955/60 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 animate-scaleIn space-y-4">
              <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto">
                <RefreshCw className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1.5">
                <h4 className="text-base font-black font-display text-slate-900">¿Activar Recurrencia?</h4>
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  Estás a punto de convertir la tarea <span className="font-extrabold text-slate-800">"{taskToUpdate.title}"</span> en una tarea recurrente. Esto modificará su tipo a "Recurrente" de forma inmediata y te permitirá configurar su automatización.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setRecurrenceConfirmTaskId(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmRecurrence(taskToUpdate.id)}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl transition-colors shadow-lg cursor-pointer text-center"
                >
                  Sí, Activar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );

  // Helper to render a card on the Trello board
  function renderTaskCard(task: InternalTask) {
    const legacySubtaskTotal = task.subtasks?.length || 0;
    const legacySubtaskCompleted = task.subtasks?.filter(s => s.completed).length || 0;
    const checklistsTotal = task.checklists?.reduce((acc, cl) => acc + cl.items.length, 0) || 0;
    const checklistsCompleted = task.checklists?.reduce((acc, cl) => acc + cl.items.filter(i => i.completed).length, 0) || 0;
    const subtaskTotal = legacySubtaskTotal + checklistsTotal;
    const subtaskCompleted = legacySubtaskCompleted + checklistsCompleted;
    const priorityClass = getPriorityStyle(task.priority);

    return (
      <div 
        key={task.id} 
        onClick={() => handleOpenTaskDetail(task)}
        className={`bg-white rounded-2xl border border-slate-200/70 p-3.5 shadow-3xs hover:shadow-sm hover:border-slate-300 transition-all relative overflow-hidden cursor-pointer group ${
          task.status === 'Completado' ? 'bg-slate-50/50 border-slate-200/40 opacity-75 hover:opacity-100' : ''
        }`}
      >
        {/* Left priority visual edge bar */}
        <div className={`absolute top-0 bottom-0 left-0 w-1 ${
          task.priority === 'Crítica' ? 'bg-rose-500' :
          task.priority === 'Alta' ? 'bg-amber-500' :
          task.priority === 'Media' ? 'bg-indigo-500' :
          'bg-slate-400'
        }`} />

        {/* Priority and Type badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${priorityClass}`}>
            {task.priority || 'Media'}
          </span>
          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
            task.type === 'Recurrente' ? 'bg-purple-50 text-purple-700 border-purple-100/60' :
            task.type === 'Programada' ? 'bg-blue-50 text-blue-700 border-blue-100/60' :
            'bg-slate-100 text-slate-700 border border-slate-200/40'
          }`}>
            {task.type === 'Recurrente' ? `Recurrente` : task.type}
          </span>
          <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded border ${
            task.scope === 'Interna' ? 'bg-slate-700 text-white border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
          }`}>
            {task.scope === 'Interna' ? <Building className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5 text-slate-400" />}
            {task.scope === 'Interna' ? 'Interna' : 'Cliente'}
          </span>
          {task.category && (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 bg-slate-50 text-slate-600 border border-slate-200/30 rounded">
              <Tag className="w-2.5 h-2.5 text-slate-400" />
              {task.category}
            </span>
          )}
        </div>

        {/* Title */}
        <h4 className={`font-bold text-xs text-slate-900 leading-snug break-words mb-2 ${
          task.status === 'Completado' ? 'line-through text-slate-400 font-medium' : ''
        }`}>
          {task.title}
        </h4>

        {/* Info row with date and subtask count */}
        <div className="flex items-center justify-between gap-2.5 text-[10px] text-slate-500 border-t border-slate-100/70 pt-2.5 mt-2">
          
          {/* Due date */}
          <div className="flex items-center gap-1 text-slate-400 font-mono">
            <Calendar className="w-3.5 h-3.5" />
            <span>{task.scheduledDate || 'Sin fecha'}</span>
          </div>

          {/* Subtasks summary */}
          {subtaskTotal > 0 && (
            <div className="flex items-center gap-1 bg-slate-100/70 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-bold">
              <ListTodo className="w-3 h-3 text-slate-400" />
              <span>{subtaskCompleted}/{subtaskTotal} To-Dos</span>
            </div>
          )}

          {/* Assignee Avatar */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold uppercase flex items-center justify-center text-[9px] shadow-3xs" title={agents.find(a => a.id === task.assignedToId)?.name || 'Sin Asignar'}>
              {agents.find(a => a.id === task.assignedToId)?.name.substring(0, 2) || 'S/A'}
            </div>
          </div>
        </div>

      </div>
    );
  }
};
