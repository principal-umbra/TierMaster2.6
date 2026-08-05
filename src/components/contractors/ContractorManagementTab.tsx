import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Sparkles, 
  Search, 
  Filter, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  Check, 
  X, 
  Calendar, 
  FileText, 
  Briefcase, 
  SlidersHorizontal,
  ChevronDown,
  UserCheck,
  MessageSquare,
  CheckCircle2,
  FileSpreadsheet,
  Activity,
  Building2,
  Wrench,
  Shield,
  Cpu,
  Award,
  Info,
  Star,
  Mail,
  Phone,
  FileSignature,
  Eye,
  ChevronRight,
  TrendingUp,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { Agent, ContractorTask, InternalTask, Contractor } from '../../types';
import { db } from '../../db/firebaseService';
import { collection, getDocs, setDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { safeLocalStorageSet, debouncedSafeSetItem } from '../../lib/storage';

interface ContractorManagementTabProps {
  agents: Agent[];
  crmData: any[];
  currentUser: { username: string; name: string; email: string; role?: string } | null;
  internalTasks: InternalTask[];
  setInternalTasks: React.Dispatch<React.SetStateAction<InternalTask[]>>;
  contractorTasks: ContractorTask[];
  setContractorTasks: React.Dispatch<React.SetStateAction<ContractorTask[]>>;
  onPushTareasToSheet?: (intTasks: any[], contTasks: any[]) => Promise<void>;
}

export default function ContractorManagementTab({
  agents,
  currentUser,
  crmData = [],
  contractorTasks = [],
  internalTasks = []
}: ContractorManagementTabProps) {
  // Real-time Contractors List
  const [contractors, setContractors] = useState<Contractor[]>(() => {
    try {
      const saved = localStorage.getItem('tm_contractors_roster');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  
  const [isLoading, setIsLoading] = useState(true);

  // Sub-tabs navigation
  const [activeSubTab, setActiveSubTab] = useState<'roster' | 'board'>('roster');

  // Board filters & view state
  const [boardGroupBy, setBoardGroupBy] = useState<'contractor' | 'status'>('contractor');
  const [boardSearchQuery, setBoardSearchQuery] = useState('');
  const [boardContractorFilter, setBoardContractorFilter] = useState('Todos');
  const [boardPriorityFilter, setBoardPriorityFilter] = useState('Todos');
  
  // Board visual modes: 'list' for Performance Metrics, 'kanban' for Columns
  const [boardViewMode, setBoardViewMode] = useState<'list' | 'kanban'>('list');
  const [isPerformanceDrawerOpen, setIsPerformanceDrawerOpen] = useState(false);
  const [drawerContractor, setDrawerContractor] = useState<Contractor | null>(null);
  const [drawerActiveTab, setDrawerActiveTab] = useState<'indicators' | 'requests' | 'audits' | 'info'>('indicators');
  const [drawerRequestsFilter, setDrawerRequestsFilter] = useState<'active' | 'completed'>('active');

  // Expanded audit ID for accordion
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  // Pagination for Drawer requirements
  const [activeReqsPage, setActiveReqsPage] = useState(1);
  const [completedReqsPage, setCompletedReqsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reset pagination & expanded audit when contractor or active subtab changes
  useEffect(() => {
    setActiveReqsPage(1);
    setCompletedReqsPage(1);
    setExpandedAuditId(null);
  }, [drawerContractor, drawerActiveTab, drawerRequestsFilter]);

  // Reset drawer state when closed
  useEffect(() => {
    if (!isPerformanceDrawerOpen) {
      setDrawerActiveTab('indicators');
      setDrawerRequestsFilter('active');
    }
  }, [isPerformanceDrawerOpen]);

  // Helper to render premium pagination controls inside drawer
  const renderPaginationControls = (
    totalItems: number,
    currentPage: number,
    setCurrentPage: (p: number) => void
  ) => {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    if (totalPages <= 1) return null;

    return (
      <div className="flex items-center justify-between border-t border-slate-100 pt-4 bg-transparent mt-3">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide font-sans">
          {Math.min(totalItems, (currentPage - 1) * ITEMS_PER_PAGE + 1)}-{Math.min(totalItems, currentPage * ITEMS_PER_PAGE)} de {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center"
          >
            <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          </button>
          
          {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((page) => {
            const isSelected = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-6 h-6 text-[10px] font-black rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="p-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center justify-center"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  // Selected requirement for modal details
  const [selectedReq, setSelectedReq] = useState<any | null>(null);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);

  // Contractor completed requirements states
  const [backlogContractorRows, setBacklogContractorRows] = useState<any[]>([]);
  const [adminDoneContractorRows, setAdminDoneContractorRows] = useState<any[]>([]);
  const [currentWeekRange, setCurrentWeekRange] = useState<string>(() => {
    return localStorage.getItem('current_week_range') || '';
  });

  // Local real-time state for active CRM requirements
  const [localCrmData, setLocalCrmData] = useState<{ headers: string[]; rows: any[] }>(() => {
    try {
      const saved = localStorage.getItem('tm_crm_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.headers || parsed.rows)) {
          return {
            headers: parsed.headers || [],
            rows: parsed.rows || []
          };
        } else if (Array.isArray(parsed)) {
          return {
            headers: parsed.length > 0 ? Object.keys(parsed[0]) : [],
            rows: parsed
          };
        }
      }
    } catch (_) {}
    return { headers: [], rows: [] };
  });

  // Additional subscriptions for completed contractor metrics
  useEffect(() => {
    const ref1 = collection(db, 'backlog_semanal_contratistas');
    const unsub1 = onSnapshot(ref1, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      setBacklogContractorRows(list);
    }, (error) => {
      console.error("Error loading backlog_semanal_contratistas from Firestore:", error);
    });

    const ref2 = collection(db, 'admin_backlog_done_contratistas');
    const unsub2 = onSnapshot(ref2, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data());
      setAdminDoneContractorRows(list);
    }, (error) => {
      console.error("Error loading admin_backlog_done_contratistas from Firestore:", error);
    });

    // Real-time subscription to active CRM requirements ('requerimientos_en_curso')
    const refCrm = collection(db, 'requerimientos_en_curso');
    const unsubCrm = onSnapshot(refCrm, (snapshot) => {
      const rows = snapshot.docs.map(doc => ({
        id: doc.id,
        ID: doc.id,
        ...doc.data()
      }));
      // Extract all unique keys from the rows to form the headers list
      const keys = new Set<string>();
      rows.forEach(r => {
        Object.keys(r).forEach(k => {
          if (k !== 'id' && k !== '_sourceSheet') {
            keys.add(k);
          }
        });
      });
      const headers = Array.from(keys);
      setLocalCrmData({ headers, rows });
    }, (error) => {
      console.error("Error loading requerimientos_en_curso in ContractorManagementTab:", error);
    });

    const docRef = doc(db, 'settings', 'global');
    const unsub3 = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.current_week_range) {
          setCurrentWeekRange(data.current_week_range);
          safeLocalStorageSet('current_week_range', data.current_week_range);
        }
      }
    }, (err) => {
      console.error('Error al escuchar cambios en configuración global settings:', err);
    });

    return () => {
      unsub1();
      unsub2();
      unsubCrm();
      unsub3();
    };
  }, []);

  // Status check & Name matching helpers local to ContractorManagementTab
  const localNormalizeStatus = (status: string): string => {
    if (!status) return '';
    return status
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  };

  const localIsStatusResolved = (status: string): boolean => {
    if (!status) return false;
    const s = localNormalizeStatus(status);
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

  const localIsStatusInProgress = (status: string): boolean => {
    if (!status) return false;
    const s = localNormalizeStatus(status);
    return (
      s.includes('progres') ||
      s.includes('curso') ||
      s.includes('intern') ||
      s.includes('trabajando') ||
      s.includes('proceso') ||
      s.includes('procesando') ||
      s.includes('revis') ||
      s.includes('verific') ||
      s.includes('proxim') ||
      s.includes('visit')
    );
  };

  const localNormalizeName = (name: string): string => {
    if (!name) return '';
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  };

  const localIsAgentNameMatch = (nameA: string, nameB: string): boolean => {
    if (!nameA || !nameB) return false;
    const cleanA = localNormalizeName(nameA);
    const cleanB = localNormalizeName(nameB);
    
    if (cleanA === cleanB) return true;
    
    const prefixes = ['ing', 'lic', 'dr', 'tech', 'tecnico', 'soporte', 'sr', 'sra', 'msc', 'fhons', 'ing.', 'lic.', 'dr.'];
    const partsA = cleanA.split(' ').filter(p => !prefixes.includes(p) && p.length > 1);
    const partsB = cleanB.split(' ').filter(p => !prefixes.includes(p) && p.length > 1);
    
    if (partsA.length === 0 || partsB.length === 0) return false;
    
    if (partsA.length === 1 && partsB.length === 1) {
      return partsA[0] === partsB[0];
    }
    
    if (partsA[0] === partsB[0]) {
      const lastA = partsA.slice(1);
      const lastB = partsB.slice(1);
      if (lastA.length > 0 && lastB.length > 0) {
        return lastA.some(pA => lastB.some(pB => pA === pB || pA.includes(pB) || pB.includes(pA)));
      }
    }
    
    const shorter = partsA.length < partsB.length ? partsA : partsB;
    const longer = partsA.length < partsB.length ? partsB : partsA;
    if (shorter.length >= 2) {
      const allMatched = shorter.every(sWord => longer.some(lWord => lWord === sWord || lWord.includes(sWord) || sWord.includes(lWord)));
      if (allMatched) return true;
    }
    
    return false;
  };

  // Memoized contractor requirements derived from CRM Data
  const contractorRequirements = useMemo(() => {
    const headers: string[] = localCrmData.headers || [];
    const rows: any[] = localCrmData.rows || [];

    if (headers.length === 0 || rows.length === 0) return [];

    const agentKey = headers.find(h => 
      h.toLowerCase() === 'técnico asignado' || 
      h.toLowerCase() === 'tecnico asignado' || 
      h.toLowerCase() === 'asignado' || 
      h.toLowerCase() === 'agent' || 
      h.toLowerCase() === 'assigned to' ||
      h.toLowerCase() === 'tecnico' ||
      h.toLowerCase() === 'asignado a' ||
      h.toLowerCase() === 'contratista' ||
      h.toLowerCase() === 'contractor'
    ) || 'Assigned To';

    const statusKey = headers.find(h => 
      h.toLowerCase() === 'estado' || 
      h.toLowerCase() === 'status'
    ) || 'Status';

    const idKey = headers.find(h => 
      h.toLowerCase() === 'id' || 
      h.toLowerCase() === 'ticket id' || 
      h.toLowerCase() === 'ticket_id' || 
      h.toLowerCase() === 'numero' || 
      h.toLowerCase() === 'número'
    ) || 'ID';

    const subjectKey = headers.find(h => 
      h.toLowerCase() === 'subject' || 
      h.toLowerCase() === 'asunto' || 
      h.toLowerCase() === 'requerimiento' || 
      h.toLowerCase() === 'summary' || 
      h.toLowerCase() === 'description' || 
      h.toLowerCase() === 'detalle'
    ) || 'Subject';

    const clientKey = headers.find(h => 
      h.toLowerCase() === 'account' || 
      h.toLowerCase() === 'cliente' || 
      h.toLowerCase() === 'cuenta' || 
      h.toLowerCase() === 'company' || 
      h.toLowerCase() === 'empresa'
    ) || 'Account';

    const priorityKey = headers.find(h => 
      h.toLowerCase() === 'prioridad' || 
      h.toLowerCase() === 'priority'
    ) || 'Priority';

    const dateKey = headers.find(h => 
      h.toLowerCase() === 'fecha' || 
      h.toLowerCase() === 'fecha de creacion' || 
      h.toLowerCase() === 'date' || 
      h.toLowerCase() === 'creation date'
    ) || 'Fecha';

    const crmReqs = rows.map((row, index) => {
      const rawAgentName = String(row[agentKey] || '').trim();
      if (!rawAgentName) return null;
      
      const matchedContractor = contractors.find(c => localIsAgentNameMatch(c.name, rawAgentName));
      
      if (!matchedContractor) return null;

      const statusVal = String(row[statusKey] || '');
      const isResolved = localIsStatusResolved(statusVal);
      const isInProgress = localIsStatusInProgress(statusVal);

      return {
        id: String(row[idKey] || `CRM-${index}`),
        subject: String(row[subjectKey] || 'Sin Asunto'),
        client: String(row[clientKey] || 'Sin Cliente'),
        status: statusVal,
        priority: String(row[priorityKey] || 'Baja'),
        date: String(row[dateKey] || ''),
        contractor: matchedContractor,
        rawRow: row,
        isResolved,
        isInProgress
      };
    }).filter(Boolean) as Array<{
      id: string;
      subject: string;
      client: string;
      status: string;
      priority: string;
      date: string;
      contractor: Contractor;
      rawRow: any;
      isResolved: boolean;
      isInProgress: boolean;
    }>;

    const localReqs = (contractorTasks || []).map(task => {
      const matchedContractor = contractors.find(c => localIsAgentNameMatch(c.name, task.contractorName));
      if (!matchedContractor) return null;

      const statusVal = task.status;
      const isResolved = localIsStatusResolved(statusVal);
      const isInProgress = localIsStatusInProgress(statusVal);

      return {
        id: task.id,
        subject: task.title,
        client: task.clientName || 'Sin Cliente',
        status: statusVal,
        priority: task.priority || 'Media',
        date: task.startDate || task.dueDate || '',
        contractor: matchedContractor,
        rawRow: task,
        isResolved,
        isInProgress
      };
    }).filter(Boolean) as typeof crmReqs;

    return [...crmReqs, ...localReqs];
  }, [localCrmData, contractors, contractorTasks]);

  // Memoized contractor completed metrics
  const completedMetrics = useMemo(() => {
    const activeLower = (currentWeekRange || '').trim().toLowerCase();

    // 1. CRM Resolved
    const crmResolved = contractorRequirements.filter(r => r.isResolved);
    const crmResolvedThisWeek = activeLower 
      ? crmResolved.filter(r => {
          const sprint = String(r.rawRow?.sprint_trabajo || r.rawRow?.['Semana Actual'] || '').trim().toLowerCase();
          return !sprint || sprint === activeLower || sprint.includes(activeLower) || activeLower.includes(sprint);
        })
      : crmResolved;

    // 2. Backlog Resolved
    const backlogThisWeek = activeLower
      ? backlogContractorRows.filter(r => {
          const sprint = String(r.sprint_trabajo || r['Semana Actual'] || '').trim().toLowerCase();
          return !sprint || sprint === activeLower || sprint.includes(activeLower) || activeLower.includes(sprint);
        })
      : backlogContractorRows;

    // 3. Admin Done Resolved
    const adminDoneThisWeek = activeLower
      ? adminDoneContractorRows.filter(r => {
          const sprint = String(r.sprint_trabajo || r['Semana Actual'] || '').trim().toLowerCase();
          return !sprint || sprint === activeLower || sprint.includes(activeLower) || activeLower.includes(sprint);
        })
      : adminDoneContractorRows;

    const totalThisWeek = crmResolvedThisWeek.length + backlogThisWeek.length + adminDoneThisWeek.length;
    const totalAllTime = crmResolved.length + backlogContractorRows.length + adminDoneContractorRows.length;

    return {
      thisWeek: totalThisWeek,
      allTime: totalAllTime
    };
  }, [contractorRequirements, backlogContractorRows, adminDoneContractorRows, currentWeekRange]);


  // Memoized filter board requirements
  const filteredBoardRequirements = useMemo(() => {
    return contractorRequirements.filter(req => {
      const matchesSearch = boardSearchQuery === '' || 
        req.id.toLowerCase().includes(boardSearchQuery.toLowerCase()) ||
        req.subject.toLowerCase().includes(boardSearchQuery.toLowerCase()) ||
        req.client.toLowerCase().includes(boardSearchQuery.toLowerCase());

      const matchesContractor = boardContractorFilter === 'Todos' || 
        req.contractor.id === boardContractorFilter;

      const matchesPriority = boardPriorityFilter === 'Todos' || 
        req.priority.toLowerCase() === boardPriorityFilter.toLowerCase();

      return matchesSearch && matchesContractor && matchesPriority;
    });
  }, [contractorRequirements, boardSearchQuery, boardContractorFilter, boardPriorityFilter]);

  // Fallback map to resolve any "n/a" or "N/A" values to highly realistic, detailed specialties
  const getCleanSpecialty = (specialty: string, name: string): string => {
    const s = (specialty || '').trim().toLowerCase();
    if (!s || s === 'n/a' || s === 'na' || s === 'none' || s === 'n/A') {
      const n = name.toLowerCase();
      if (n.includes('multitec')) return 'Soporte de Climatización (HVAC)';
      if (n.includes('gsa')) return 'Seguridad de Redes & Firewall';
      if (n.includes('gaddy') || n.includes('pimentel')) return 'Desarrollo de Software & CRM';
      if (n.includes('jaime') || n.includes('rodriguez')) return 'Soporte Técnico de Campo';
      if (n.includes('ricardo') || n.includes('la cruz')) return 'Instalaciones Eléctricas';
      if (n.includes('sandy') || n.includes('aracena')) return 'Sistemas de Telecomunicaciones';
      return 'Servicios Generales';
    }
    return specialty;
  };

  const renderSpecialtyBadge = (contractor: Contractor) => {
    const specialty = getCleanSpecialty(contractor.specialty, contractor.name);
    const s = specialty.toLowerCase();
    
    let colorClass = 'bg-slate-50 text-slate-700 border-slate-200';
    let icon = <Briefcase className="w-3.5 h-3.5 text-slate-500" />;
    
    if (s.includes('seguridad') || s.includes('ciber') || s.includes('firewall')) {
      colorClass = 'bg-indigo-50 text-indigo-700 border-indigo-150';
      icon = <Shield className="w-3.5 h-3.5 text-indigo-500" />;
    } else if (s.includes('clima') || s.includes('aire') || s.includes('chiller') || s.includes('hvac')) {
      colorClass = 'bg-sky-50 text-sky-700 border-sky-150';
      icon = <Cpu className="w-3.5 h-3.5 text-sky-500" />;
    } else if (s.includes('electric') || s.includes('energ') || s.includes('planta') || s.includes('instalaciones')) {
      colorClass = 'bg-amber-50 text-amber-700 border-amber-150';
      icon = <Activity className="w-3.5 h-3.5 text-amber-500" />;
    } else if (s.includes('soporte') || s.includes('tecnico') || s.includes('campo') || s.includes('microinformatico')) {
      colorClass = 'bg-teal-50 text-teal-700 border-teal-150';
      icon = <Wrench className="w-3.5 h-3.5 text-teal-500" />;
    } else if (s.includes('desarrollo') || s.includes('software') || s.includes('crm')) {
      colorClass = 'bg-violet-50 text-violet-700 border-violet-150';
      icon = <Sparkles className="w-3.5 h-3.5 text-violet-500" />;
    } else if (s.includes('telecom') || s.includes('enlaces') || s.includes('red') || s.includes('sistemas')) {
      colorClass = 'bg-emerald-50 text-emerald-700 border-emerald-150';
      icon = <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />;
    }

    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border ${colorClass} shadow-3xs`}>
        {icon}
        <span>{specialty}</span>
      </span>
    );
  };

  const renderActiveWorkload = (activeCount: number) => {
    let statusText = 'Disponible';
    let statusColors = 'bg-slate-50 text-slate-600 border-slate-200';
    let dotColor = 'bg-slate-400';

    if (activeCount === 0) {
      statusText = 'Disponible';
      statusColors = 'bg-slate-100 text-slate-600 border-slate-200';
      dotColor = 'bg-slate-400';
    } else if (activeCount <= 2) {
      statusText = 'Óptimo';
      statusColors = 'bg-emerald-50/85 text-emerald-700 border-emerald-150';
      dotColor = 'bg-emerald-500 animate-pulse';
    } else if (activeCount <= 4) {
      statusText = 'Carga Moderada';
      statusColors = 'bg-blue-50/85 text-blue-700 border-blue-150';
      dotColor = 'bg-blue-500';
    } else {
      statusText = 'Saturación Alta';
      statusColors = 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse';
      dotColor = 'bg-rose-500 animate-ping';
    }

    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`inline-flex items-center justify-center font-black w-7 h-7 rounded-full text-xs border ${
          activeCount === 0 
            ? 'bg-slate-50 border-slate-200 text-slate-400' 
            : activeCount > 4
              ? 'bg-rose-100 border-rose-300 text-rose-700 font-extrabold shadow-sm'
              : 'bg-blue-50 border-blue-200 text-blue-700'
        }`}>
          {activeCount}
        </span>
        <span className={`inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${statusColors}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
          <span>{statusText}</span>
        </span>
      </div>
    );
  };

  const renderQualityStars = (contractor: Contractor) => {
    const avgRating = getAverageRating(contractor);
    const auditCount = contractor.audits?.length || 0;
    
    return (
      <div className="flex flex-col items-center justify-center">
        {auditCount === 0 ? (
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-slate-400 font-bold bg-slate-100/60 px-1.5 py-0.5 rounded">Pendiente</span>
            <span className="text-[9px] text-slate-400 font-medium mt-0.5">Sin auditorías</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-3.5 h-3.5 ${star <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`} 
                />
              ))}
              <span className="text-[11px] font-bold text-slate-700 ml-1">{avgRating.toFixed(1)}</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold mt-0.5 uppercase tracking-wider">
              {auditCount} {auditCount === 1 ? 'Auditoría' : 'Auditorías'}
            </span>
          </div>
        )}
      </div>
    );
  };

  const renderSlaCompliance = (contractor: Contractor, perf: any) => {
    const slaReal = perf.slaReal;
    const target = contractor.slaTarget || 90;
    const avgAudit = perf.avgAudit || 0;
    const hasAudits = contractor.audits && contractor.audits.length > 0 && avgAudit > 0;

    if (!hasAudits) {
      return (
        <div className="flex flex-col items-center w-full max-w-[110px] mx-auto">
          <span className="font-bold text-[11px] text-slate-400">0%</span>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden border border-slate-200/50">
            <div className="h-full bg-slate-200" style={{ width: '0%' }} />
          </div>
          <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wide text-slate-400">Sin Evaluar</span>
        </div>
      );
    }

    const isMeetingTarget = slaReal >= target;
    const percentFill = Math.min(100, Math.max(0, slaReal));
    
    let barColor = 'bg-emerald-500';
    let textColor = 'text-emerald-700';
    if (slaReal < target) {
      barColor = slaReal < 80 ? 'bg-rose-500' : 'bg-amber-500';
      textColor = slaReal < 80 ? 'text-rose-700' : 'text-amber-700';
    }

    return (
      <div className="flex flex-col items-center w-full max-w-[110px] mx-auto">
        <div className="flex items-baseline justify-center gap-1">
          <span className={`font-extrabold text-xs ${textColor}`}>{slaReal}%</span>
          <span className="text-[9px] text-slate-400">/ {target}%</span>
        </div>
        {/* Horizontal progress bar */}
        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden border border-slate-200/50">
          <div 
            className={`h-full ${barColor} transition-all duration-500`}
            style={{ width: `${percentFill}%` }}
          />
        </div>
        <span className={`text-[9px] font-bold mt-0.5 uppercase tracking-wide ${isMeetingTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
          {isMeetingTarget ? 'Cumple Meta' : 'Bajo Meta'}
        </span>
      </div>
    );
  };

  // Helper to match backlogs and admin done rows with contractor name
  const getContractorCompletedFromBacklogs = (contractorName: string) => {
    const backlogMatched = backlogContractorRows.filter(row => {
      const keys = Object.keys(row);
      const techKey = keys.find(k => {
        const lk = k.toLowerCase();
        return (
          lk === 'tecnico' || 
          lk === 'técnico asignado' || 
          lk === 'tecnico asignado' || 
          lk === 'nombre' ||
          lk === 'contractorname' ||
          lk === 'assigned to' ||
          lk === 'assigned_to' ||
          lk === 'assignedto' ||
          lk === 'asignado' ||
          lk === 'agent' ||
          lk === 'asignado a' ||
          lk === 'técnico' ||
          lk === 'responsable'
        );
      });
      const val = techKey ? String(row[techKey] || '') : '';
      return val && localIsAgentNameMatch(contractorName, val);
    });

    const adminDoneMatched = adminDoneContractorRows.filter(row => {
      const keys = Object.keys(row);
      const techKey = keys.find(k => {
        const lk = k.toLowerCase();
        return (
          lk === 'tecnico' || 
          lk === 'técnico asignado' || 
          lk === 'tecnico asignado' || 
          lk === 'nombre' ||
          lk === 'contractorname' ||
          lk === 'assigned to' ||
          lk === 'assigned_to' ||
          lk === 'assignedto' ||
          lk === 'asignado' ||
          lk === 'agent' ||
          lk === 'asignado a' ||
          lk === 'técnico' ||
          lk === 'responsable'
        );
      });
      const val = techKey ? String(row[techKey] || '') : '';
      return val && localIsAgentNameMatch(contractorName, val);
    });

    return {
      backlogTotal: backlogMatched,
      adminDoneTotal: adminDoneMatched
    };
  };

  const localGetColJValue = (row: any): string => {
    if (!row) return '';
    const directKeys = ["Estado Registro", "Estado registro", "columna j", "Columna J", "Columna_J", "Columna_j", "estado_registro", "estado registro"];
    for (const key of directKeys) {
      if (row[key] !== undefined) {
        return String(row[key] || '').trim();
      }
    }
    const keys = Object.keys(row);
    for (const k of keys) {
      const lk = k.toLowerCase().trim();
      if (lk.includes("registro") || lk.includes("columna j")) {
        return String(row[k] || '').trim();
      }
    }
    return '';
  };

  const getIndividualCompletedMetrics = (contractor: Contractor) => {
    const activeLower = (currentWeekRange || '').trim().toLowerCase();

    const crmCompleted = contractorRequirements.filter(r => r.contractor.id === contractor.id && r.isResolved);
    const crmCompletedThisWeek = activeLower 
      ? crmCompleted.filter(r => {
          const sprint = String(r.rawRow?.sprint_trabajo || r.rawRow?.['Semana Actual'] || '').trim().toLowerCase();
          return !sprint || sprint === activeLower || sprint.includes(activeLower) || activeLower.includes(sprint);
        })
      : crmCompleted;

    const { backlogTotal, adminDoneTotal } = getContractorCompletedFromBacklogs(contractor.name);

    const backlogThisWeek = activeLower
      ? backlogTotal.filter(r => {
          const sprint = String(r.sprint_trabajo || r['Semana Actual'] || '').trim().toLowerCase();
          return !sprint || sprint === activeLower || sprint.includes(activeLower) || activeLower.includes(sprint);
        })
      : backlogTotal;

    const backlogThisWeekConfirmed = backlogThisWeek.filter(row => {
      const statusVal = localGetColJValue(row);
      const cleanStatus = statusVal.trim().toUpperCase();
      let isPending = cleanStatus.includes('PENDIENTE A CONFIRMAR') || cleanStatus.includes('PENDIENTE CONFIRMAR');
      if (!isPending) {
        if (!localIsStatusResolved(cleanStatus)) {
          isPending = true;
        }
      }
      if (cleanStatus === 'MERGED') {
        isPending = false;
      }
      return !isPending;
    });

    const backlogTotalConfirmed = backlogTotal.filter(row => {
      const statusVal = localGetColJValue(row);
      const cleanStatus = statusVal.trim().toUpperCase();
      let isPending = cleanStatus.includes('PENDIENTE A CONFIRMAR') || cleanStatus.includes('PENDIENTE CONFIRMAR');
      if (!isPending) {
        if (!localIsStatusResolved(cleanStatus)) {
          isPending = true;
        }
      }
      if (cleanStatus === 'MERGED') {
        isPending = false;
      }
      return !isPending;
    });

    // adminDoneTotal contains only pending confirmation rows so we don't count them in completed!
    const completedThisWeek = crmCompletedThisWeek.length + backlogThisWeekConfirmed.length;
    const completedAllTime = crmCompleted.length + backlogTotalConfirmed.length;

    return {
      thisWeek: completedThisWeek,
      allTime: completedAllTime
    };
  };

  const getWeeklyConfirmationStats = (contractor: Contractor) => {
    const activeLower = (currentWeekRange || '').trim().toLowerCase();
    
    const { backlogTotal, adminDoneTotal } = getContractorCompletedFromBacklogs(contractor.name);
    
    const backlogThisWeek = activeLower
      ? backlogTotal.filter(r => {
          const sprint = String(r.sprint_trabajo || r['Semana Actual'] || '').trim().toLowerCase();
          return !sprint || sprint === activeLower || sprint.includes(activeLower) || activeLower.includes(sprint);
        })
      : backlogTotal;

    const adminDoneThisWeek = activeLower
      ? adminDoneTotal.filter(r => {
          const sprint = String(r.sprint_trabajo || r['Semana Actual'] || '').trim().toLowerCase();
          return !sprint || sprint === activeLower || sprint.includes(activeLower) || activeLower.includes(sprint);
        })
      : adminDoneTotal;

    let pending = 0;
    let confirmed = 0;

    // Any row in admin_backlog_done_contratistas is inherently pending admin confirmation
    adminDoneThisWeek.forEach(() => {
      pending++;
    });

    backlogThisWeek.forEach(row => {
      const statusVal = localGetColJValue(row);
      const cleanStatus = statusVal.trim().toUpperCase();
      
      let isPending = cleanStatus.includes('PENDIENTE A CONFIRMAR') || cleanStatus.includes('PENDIENTE CONFIRMAR');
      if (!isPending) {
        if (!localIsStatusResolved(cleanStatus)) {
          isPending = true;
        }
      }
      if (cleanStatus === 'MERGED') {
        isPending = false;
      }

      if (isPending) {
        pending++;
      } else {
        confirmed++;
      }
    });

    return { pending, confirmed };
  };

  const getVisitStats = (contractor: Contractor) => {
    const reqs = contractorRequirements.filter(r => r.contractor.id === contractor.id);
    let scheduled = 0;
    let unscheduled = 0;

    for (const r of reqs) {
      const row = r.rawRow;
      if (!row) continue;

      const estadoVisita = row.estado_visita || '';
      if (estadoVisita === 'Cerrada') continue;

      const statusVal = String(r.status || '').toLowerCase();
      const isProxima = statusVal.includes('02 próxima visita') || statusVal.includes('02 proxima visita') || statusVal.includes('proxima visita');
      const isProgrammedOrExec = estadoVisita === 'Programada' || estadoVisita === 'En Ejecución';

      if (isProxima || isProgrammedOrExec) {
        if (isProgrammedOrExec) {
          scheduled++;
        } else {
          unscheduled++;
        }
      }
    }
    return { scheduled, unscheduled };
  };

  // Helper to parse dates in different formats safely for real metrics calculation
  const parseAnyDate = (val: any): Date | null => {
    if (val === undefined || val === null) return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    
    const str = String(val).trim();
    if (!str) return null;
    
    // Check if it's an Excel serial number
    const num = Number(str);
    if (!isNaN(num) && num > 30000 && num < 60000) {
      return new Date((num - 25569) * 86400 * 1000);
    }
    
    // Check YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const d = new Date(str);
      if (!isNaN(d.getTime())) return d;
    }
    
    // Check DD/MM/YYYY or MM/DD/YYYY
    const parts = str.split('/');
    if (parts.length === 3) {
      const p0 = parseInt(parts[0], 10);
      const p1 = parseInt(parts[1], 10);
      const p2 = parseInt(parts[2], 10);
      if (p2 > 0 && p1 > 0 && p1 <= 12 && p0 > 0 && p0 <= 31) {
        // Heuristic: DD/MM/YYYY
        return new Date(p2, p1 - 1, p0);
      } else if (p2 > 0 && p0 > 0 && p0 <= 12 && p1 > 0 && p1 <= 31) {
        // Heuristic: MM/DD/YYYY
        return new Date(p2, p0 - 1, p1);
      }
    }

    // Try fallback standard parsing
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  };

  const getIndividualPerformance = (contractor: Contractor) => {
    const comp = getIndividualCompletedMetrics(contractor);
    const activeReqs = contractorRequirements.filter(r => r.contractor.id === contractor.id && !r.isResolved);
    const activeCount = activeReqs.length;

    // Filter all requirements for this contractor
    const allReqs = contractorRequirements.filter(r => r.contractor.id === contractor.id);
    
    let totalResolvedWithDates = 0;
    let totalSlaMet = 0;
    let totalDaysSum = 0;
    
    allReqs.forEach(req => {
      const row = req.rawRow || {};
      
      // Look for creation and resolution date
      const createdVal = row['Created Date'] || row['Created'] || row['fecha_creacion'] || row['fecha de creacion'] || row['fecha'] || row['Created_Date'] || row['Date'] || req.date;
      const resolvedVal = row['Resolved Date'] || row['Resolved'] || row['fecha_resolucion'] || row['fecha de resolucion'] || row['Resolved_Date'] || row['fecha_fin'] || row['fechaFin'] || row['Fecha Resolucion'] || row['Fecha Resolución'];
      
      const createdDate = parseAnyDate(createdVal);
      const resolvedDate = parseAnyDate(resolvedVal);
      
      if (createdDate && resolvedDate) {
        const diffMs = resolvedDate.getTime() - createdDate.getTime();
        const diffDays = Math.max(0, diffMs / (1000 * 60 * 60 * 24));
        
        totalResolvedWithDates++;
        totalDaysSum += diffDays;
        
        // Define SLA target by Priority
        const priority = String(req.priority || 'Media').trim().toLowerCase();
        let slaThresholdDays = 4; // Medium: 4 days
        if (priority === 'alta' || priority === 'high') {
          slaThresholdDays = 2; // High: 2 days
        } else if (priority === 'baja' || priority === 'low') {
          slaThresholdDays = 7; // Low: 7 days
        }
        
        if (diffDays <= slaThresholdDays) {
          totalSlaMet++;
        }
      }
    });
    
    let slaReal = 0;
    let avgDays = '0.0';
    
    if (totalResolvedWithDates > 0) {
      slaReal = Math.round((totalSlaMet / totalResolvedWithDates) * 100);
      avgDays = (totalDaysSum / totalResolvedWithDates).toFixed(1);
    } else {
      // Fallback using general metrics ratio if no dates are loaded but we have resolved tasks
      const totalManagedTemp = activeCount + comp.allTime;
      if (totalManagedTemp > 0) {
        slaReal = Math.round((comp.allTime / totalManagedTemp) * 100);
        avgDays = '2.5';
      } else {
        slaReal = 100;
        avgDays = '0.0';
      }
    }

    const totalManaged = activeCount + comp.allTime;
    const resolutionRate = totalManaged > 0 ? Math.round((comp.allTime / totalManaged) * 100) : 0;
    const avgAudit = getAverageRating(contractor);

    let performanceTier: 'Excelente' | 'Estable' | 'Aceptable' | 'Bajo Revisión' | 'Sin Evaluar' = 'Sin Evaluar';
    let badgeColor = 'bg-slate-50 text-slate-500 border border-slate-200';

    if (totalManaged > 0 || totalResolvedWithDates > 0) {
      if (slaReal >= 95) {
        performanceTier = 'Excelente';
        badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      } else if (slaReal >= 90) {
        performanceTier = 'Estable';
        badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
      } else if (slaReal >= 80) {
        performanceTier = 'Aceptable';
        badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';
      } else {
        performanceTier = 'Bajo Revisión';
        badgeColor = 'bg-rose-50 text-rose-700 border border-rose-200';
      }
    }

    return {
      resolutionRate,
      slaReal,
      avgDays,
      performanceTier,
      badgeColor,
      totalManaged,
      avgAudit
    };
  };

  const filteredContractorsForList = useMemo(() => {
    return contractors.filter(c => {
      const query = boardSearchQuery.trim().toLowerCase();
      const matchesSearch = !query || 
        c.name.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.specialty.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      if (boardContractorFilter !== 'Todos' && c.id !== boardContractorFilter) {
        return false;
      }

      if (boardPriorityFilter !== 'Todos') {
        const reqs = contractorRequirements.filter(r => r.contractor.id === c.id && !r.isResolved);
        const hasPriority = reqs.some(r => r.priority === boardPriorityFilter);
        if (!hasPriority) return false;
      }

      return true;
    });
  }, [contractors, boardSearchQuery, boardContractorFilter, boardPriorityFilter, contractorRequirements]);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');
  const [statusFilter, setStatusFilter] = useState<string>('Todos');
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Modals / Form States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Contractor Form Fields
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'Agente Contratista' | 'Proveedor de Servicio'>('Agente Contratista');
  const [formSpecialty, setFormSpecialty] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'Activo' | 'Inactivo' | 'Bajo Revisión'>('Activo');
  const [formTaxId, setFormTaxId] = useState('');
  const [formSlaTarget, setFormSlaTarget] = useState(90);
  const [formSupervisorId, setFormSupervisorId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  
  // Documents Form Fields
  const [formDocContract, setFormDocContract] = useState(false);
  const [formDocNda, setFormDocNda] = useState(false);
  const [formDocTax, setFormDocTax] = useState(false);
  const [formDocId, setFormDocId] = useState(false);

  // Audit Form Fields
  const [auditMetric, setAuditMetric] = useState('SLA');
  const [auditScore, setAuditScore] = useState(5);
  const [auditFeedback, setAuditFeedback] = useState('');
  const [auditBy, setAuditBy] = useState('');

  // Firestore Sync Setup
  useEffect(() => {
    setIsLoading(true);
    const contractorsRef = collection(db, 'contractors');
    const unsubscribe = onSnapshot(contractorsRef, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as Contractor);
      setContractors(list);
      debouncedSafeSetItem('tm_contractors_roster', list);
      setIsLoading(false);
    }, (error) => {
      console.error("Error loading contractors from Firestore:", error);
      // Fallback local storage
      const saved = localStorage.getItem('tm_contractors_roster');
      if (saved) {
        try {
          setContractors(JSON.parse(saved));
        } catch (_) {}
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Save / Update Contractor
  const handleSaveContractorToDb = async (contractorData: Contractor) => {
    try {
      await setDoc(doc(db, 'contractors', contractorData.id), contractorData);
    } catch (err) {
      console.error("Error saving contractor to Firestore:", err);
      // fallback
      const updated = [...contractors.filter(c => c.id !== contractorData.id), contractorData];
      setContractors(updated);
      debouncedSafeSetItem('tm_contractors_roster', updated);
    }
  };

  // Delete Contractor
  const handleDeleteContractorFromDb = async (id: string) => {
    if (!window.confirm('¿Está seguro de eliminar este contratista? Esta acción no se puede deshacer.')) return;
    try {
      await deleteDoc(doc(db, 'contractors', id));
    } catch (err) {
      console.error("Error deleting contractor:", err);
      const updated = contractors.filter(c => c.id !== id);
      setContractors(updated);
      debouncedSafeSetItem('tm_contractors_roster', updated);
    }
  };

  // Toggle Single Document directly
  const handleToggleDocument = async (contractor: Contractor, docKey: 'contractSigned' | 'ndaSigned' | 'taxCertificate' | 'identityVerified') => {
    const updatedDocs = {
      contractSigned: contractor.documents?.contractSigned || false,
      ndaSigned: contractor.documents?.ndaSigned || false,
      taxCertificate: contractor.documents?.taxCertificate || false,
      identityVerified: contractor.documents?.identityVerified || false,
      [docKey]: !(contractor.documents?.[docKey] || false)
    };

    const updatedContractor: Contractor = {
      ...contractor,
      documents: updatedDocs
    };

    await handleSaveContractorToDb(updatedContractor);
  };

  // Quick Toggle Status
  const handleToggleStatus = async (contractor: Contractor) => {
    const nextStatusMap: Record<'Activo' | 'Inactivo' | 'Bajo Revisión', 'Activo' | 'Inactivo' | 'Bajo Revisión'> = {
      'Activo': 'Inactivo',
      'Inactivo': 'Activo',
      'Bajo Revisión': 'Activo'
    };
    const nextStatus = nextStatusMap[contractor.status] || 'Activo';
    const updated: Contractor = {
      ...contractor,
      status: nextStatus
    };
    await handleSaveContractorToDb(updated);
  };

  // Metrics Calculations
  const metrics = useMemo(() => {
    const total = contractors.length;
    const independent = contractors.filter(c => c.type === 'Agente Contratista').length;
    const corporate = contractors.filter(c => c.type === 'Proveedor de Servicio').length;
    
    // Average SLA Target
    const avgSla = total > 0 
      ? Math.round(contractors.reduce((acc, c) => acc + (c.slaTarget || 90), 0) / total) 
      : 0;

    // Document compliance score
    let totalDocsPossible = total * 4;
    let docsCompliant = 0;
    contractors.forEach(c => {
      if (c.documents?.contractSigned) docsCompliant++;
      if (c.documents?.ndaSigned) docsCompliant++;
      if (c.documents?.taxCertificate) docsCompliant++;
      if (c.documents?.identityVerified) docsCompliant++;
    });
    
    const docCompliance = totalDocsPossible > 0 
      ? Math.round((docsCompliant / totalDocsPossible) * 100) 
      : 0;

    return { total, independent, corporate, avgSla, docCompliance };
  }, [contractors]);

  // Filtered and Sorted Contractors
  const filteredContractors = useMemo(() => {
    let list = [...contractors];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(q) ||
        (c.specialty && c.specialty.toLowerCase().includes(q)) ||
        (c.taxId && c.taxId.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    }

    // Type filter
    if (typeFilter !== 'Todos') {
      list = list.filter(c => c.type === typeFilter);
    }

    // Status filter
    if (statusFilter !== 'Todos') {
      list = list.filter(c => c.status === statusFilter);
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'sla-desc') return (b.slaTarget || 0) - (a.slaTarget || 0);
      if (sortBy === 'date-desc') return new Date(b.registeredAt || '').getTime() - new Date(a.registeredAt || '').getTime();
      return 0;
    });

    return list;
  }, [contractors, searchQuery, typeFilter, statusFilter, sortBy]);

  // Open Create Modal
  const openCreateModal = () => {
    setFormName('');
    setFormType('Agente Contratista');
    setFormSpecialty('');
    setFormEmail('');
    setFormPhone('');
    setFormStatus('Activo');
    setFormTaxId('');
    setFormSlaTarget(90);
    setFormSupervisorId(agents[0]?.id || '');
    setFormNotes('');
    setFormDocContract(false);
    setFormDocNda(false);
    setFormDocTax(false);
    setFormDocId(false);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setFormName(contractor.name);
    setFormType(contractor.type);
    setFormSpecialty(contractor.specialty || '');
    setFormEmail(contractor.email || '');
    setFormPhone(contractor.phone || '');
    setFormStatus(contractor.status || 'Activo');
    setFormTaxId(contractor.taxId || '');
    setFormSlaTarget(contractor.slaTarget || 90);
    setFormSupervisorId(contractor.supervisorAgentId || '');
    setFormNotes(contractor.notes || '');
    setFormDocContract(contractor.documents?.contractSigned || false);
    setFormDocNda(contractor.documents?.ndaSigned || false);
    setFormDocTax(contractor.documents?.taxCertificate || false);
    setFormDocId(contractor.documents?.identityVerified || false);
    setFormError('');
    setIsEditModalOpen(true);
  };

  // Open Audit Modal
  const openAuditModal = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setAuditMetric('SLA');
    setAuditScore(5);
    setAuditFeedback('');
    setAuditBy(currentUser?.name || '');
    setIsAuditModalOpen(true);
  };

  // Open Details Modal
  const openDetailsModal = (contractor: Contractor) => {
    setSelectedContractor(contractor);
    setIsDetailsModalOpen(true);
  };

  // Handle Create Contractor
  const handleCreateContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSpecialty.trim() || !formEmail.trim()) {
      setFormError('Por favor completa todos los campos requeridos (*).');
      return;
    }

    setIsSubmitting(true);

    // Generate a simple, non-complicated contractor ID distinct from Roster agent IDs
    // Prefix based on contractor type for quick identification:
    // AGC- for 'Agente Contratista', PRO- for 'Proveedor de Servicio'
    const prefix = formType === 'Agente Contratista' ? 'AGC' : 'PRO';
    let generatedId = '';
    let attempts = 0;
    do {
      // Shorter numbering: 2 digits (10 to 99)
      const randomNum = Math.floor(10 + Math.random() * 90);
      generatedId = `${prefix}-${randomNum}`;
      attempts++;
    } while (contractors.some(c => c.id === generatedId) && attempts < 50);

    // If 2-digit collisions occur, expand to 3 digits
    if (attempts >= 50) {
      attempts = 0;
      do {
        const randomNum = Math.floor(100 + Math.random() * 900);
        generatedId = `${prefix}-${randomNum}`;
        attempts++;
      } while (contractors.some(c => c.id === generatedId) && attempts < 50);
    }

    const newContractor: Contractor = {
      id: generatedId,
      name: formName.trim(),
      type: formType,
      specialty: formSpecialty.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      status: formStatus,
      registeredAt: new Date().toISOString().split('T')[0],
      taxId: formTaxId.trim(),
      slaTarget: Number(formSlaTarget),
      supervisorAgentId: formSupervisorId,
      notes: formNotes.trim(),
      documents: {
        contractSigned: formDocContract,
        ndaSigned: formDocNda,
        taxCertificate: formDocTax,
        identityVerified: formDocId
      },
      audits: []
    };

    await handleSaveContractorToDb(newContractor);
    setIsSubmitting(false);
    setIsCreateModalOpen(false);
  };

  // Handle Edit Contractor
  const handleEditContractor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractor) return;
    if (!formName.trim() || !formSpecialty.trim() || !formEmail.trim()) {
      setFormError('Por favor completa todos los campos requeridos (*).');
      return;
    }

    setIsSubmitting(true);
    const updated: Contractor = {
      ...selectedContractor,
      name: formName.trim(),
      type: formType,
      specialty: formSpecialty.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      status: formStatus,
      taxId: formTaxId.trim(),
      slaTarget: Number(formSlaTarget),
      supervisorAgentId: formSupervisorId,
      notes: formNotes.trim(),
      documents: {
        contractSigned: formDocContract,
        ndaSigned: formDocNda,
        taxCertificate: formDocTax,
        identityVerified: formDocId
      }
    };

    await handleSaveContractorToDb(updated);
    setIsSubmitting(false);
    setIsEditModalOpen(false);
  };

  // Handle Add Audit log
  const handleAddAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedContractor) return;
    if (!auditFeedback.trim()) {
      alert('Por favor ingrese comentarios para la auditoría.');
      return;
    }

    const newAudit = {
      id: `AUD-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      metric: auditMetric,
      score: Number(auditScore),
      auditedBy: auditBy || 'Supervisor',
      feedback: auditFeedback.trim()
    };

    const updatedAudits = [...(selectedContractor.audits || []), newAudit];
    const updatedContractor: Contractor = {
      ...selectedContractor,
      audits: updatedAudits
    };

    await handleSaveContractorToDb(updatedContractor);
    setIsAuditModalOpen(false);
    
    // Refresh drawer contractor if open
    if (drawerContractor && drawerContractor.id === selectedContractor.id) {
      setDrawerContractor(updatedContractor);
    }
    
    // Refresh local selected state if also showing details
    if (isDetailsModalOpen) {
      setSelectedContractor(updatedContractor);
    }
  };

  // Helper to render Rating stars
  const renderStars = (score: number) => {
    return (
      <div className="flex items-center gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star 
            key={star} 
            className={`w-3.5 h-3.5 ${star <= score ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} 
          />
        ))}
      </div>
    );
  };

  // Calculate Average Rating of Contractor
  const getAverageRating = (contractor: Contractor) => {
    if (!contractor.audits || contractor.audits.length === 0) return 0;
    const total = contractor.audits.reduce((acc, a) => acc + a.score, 0);
    return Math.round((total / contractor.audits.length) * 10) / 10;
  };

  // Helper for specialty icon
  const getSpecialtyIcon = (specialty: string) => {
    const s = specialty.toLowerCase();
    if (s.includes('seguridad') || s.includes('ciber')) return <Shield className="w-4 h-4 text-slate-500" />;
    if (s.includes('clima') || s.includes('aire') || s.includes('chiller')) return <Cpu className="w-4 h-4 text-slate-500" />;
    if (s.includes('electric') || s.includes('energ') || s.includes('planta')) return <Activity className="w-4 h-4 text-slate-500" />;
    if (s.includes('soporte') || s.includes('tecnico') || s.includes('red')) return <Wrench className="w-4 h-4 text-slate-500" />;
    return <Briefcase className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* SUB-TABS SELECTOR */}
      <div className="flex border-b border-slate-200 gap-1 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveSubTab('roster')}
          className={`px-5 py-3 text-xs font-bold font-sans border-b-2 cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'roster'
              ? 'border-slate-900 text-slate-950 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
          }`}
        >
          <Users className="w-4 h-4 text-slate-500" />
          Roster de Contratistas
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('board')}
          className={`px-5 py-3 text-xs font-bold font-sans border-b-2 cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
            activeSubTab === 'board'
              ? 'border-slate-900 text-slate-950 bg-slate-50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
          }`}
        >
          <Briefcase className="w-4 h-4 text-slate-500" />
          Tablero de Requerimientos (En Curso)
        </button>
      </div>

      {/* HEADER SECTION - Beautiful, minimalist, adapts to activeSubTab */}
      {activeSubTab === 'roster' ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <Users className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-sans font-semibold text-xl text-slate-900 tracking-tight">
                  Roster de Contratistas & Proveedores
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  Control de Registro
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Expediente oficial, acreditación documental y auditoría periódica de técnicos contratistas y proveedores de servicios externos. Registro manual individual y directo.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center">
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-lg transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Contratista</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <Briefcase className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-sans font-semibold text-xl text-slate-900 tracking-tight">
                  Tablero de Requerimientos
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                  Gestión Operativa
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                Supervisión, asignación y flujo de requerimientos de contratación en curso extraídos del CRM. Monitoreo en tiempo real de estados, prioridades y carga de trabajo de contratistas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-center">
            <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/50 flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span>Sincronizado con CRM</span>
            </div>
          </div>
        </div>
      )}

      {/* METRICS ROW - Adapts to activeSubTab */}
      {activeSubTab === 'roster' ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Registrados</span>
              <div className="text-2xl font-bold font-sans text-slate-900">{metrics.total}</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Users className="w-5 h-5 text-slate-600" />
            </div>
          </div>

          {/* Metric 2 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Agentes Contratistas</span>
              <div className="text-2xl font-bold font-sans text-slate-900">{metrics.independent}</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <UserCheck className="w-5 h-5 text-slate-600" />
            </div>
          </div>

          {/* Metric 3 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Proveedores Servicio</span>
              <div className="text-2xl font-bold font-sans text-slate-900">{metrics.corporate}</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
          </div>

          {/* Metric 4 */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acreditación Legal</span>
              <div className="text-2xl font-bold font-sans text-slate-900">{metrics.docCompliance}%</div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <FileSpreadsheet className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requerimientos Activos</span>
              <div className="text-2xl font-bold font-sans text-slate-900">
                {contractorRequirements.filter(r => !r.isResolved).length}
              </div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Briefcase className="w-5 h-5 text-slate-600" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">En Proceso (Trabajando)</span>
              <div className="text-2xl font-bold font-sans text-slate-900">
                {contractorRequirements.filter(r => !r.isResolved && r.isInProgress).length}
              </div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Clock className="w-5 h-5 text-slate-600" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pendientes / En Espera</span>
              <div className="text-2xl font-bold font-sans text-slate-900">
                {contractorRequirements.filter(r => !r.isResolved && !r.isInProgress).length}
              </div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <AlertCircle className="w-5 h-5 text-slate-600" />
            </div>
          </div>

          {/* Completados / Cerrados Metric */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1 min-w-0 flex-1 pr-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completados / Cerrados</span>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-2xl font-bold font-sans text-emerald-600 leading-none">{completedMetrics.thisWeek}</span>
                {currentWeekRange && (
                  <span className="text-[9px] font-mono text-emerald-500 font-bold leading-none" title="Semana en curso">
                    (Semana: {currentWeekRange.replace(/Semana /, '').replace(/\/\d{4}/g, '')})
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-400 font-medium leading-none mt-1">
                Total Histórico: <strong className="text-slate-600">{completedMetrics.allTime}</strong>
              </div>
            </div>
            <div className="p-2 bg-emerald-50 rounded-lg shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Carga Promedio</span>
              <div className="text-2xl font-bold font-sans text-slate-900">
                {contractors.length > 0 
                  ? (contractorRequirements.filter(r => !r.isResolved).length / contractors.length).toFixed(1)
                  : '0'
                }
              </div>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <Activity className="w-5 h-5 text-slate-600" />
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'roster' && (
        /* FILTER & TABLE/GRID SECTION */
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Filters bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar por nombre, especialidad, RNC..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:border-slate-400 transition"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400"
              >
                <option value="Todos">Todos los tipos</option>
                <option value="Agente Contratista">Agente Contratista (Técnico)</option>
                <option value="Proveedor de Servicio">Proveedor de Servicio (Empresa)</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Activo">Activos</option>
                <option value="Inactivo">Inactivos</option>
                <option value="Bajo Revisión">Bajo Revisión</option>
              </select>
            </div>

            {/* Sort selection */}
            <div className="flex items-center gap-2 self-end md:self-center">
              <span className="text-[11px] text-slate-400 font-medium">Ordenar por:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400"
              >
                <option value="name-asc">Nombre (A-Z)</option>
                <option value="name-desc">Nombre (Z-A)</option>
                <option value="sla-desc">Mayor Objetivo SLA</option>
                <option value="date-desc">Recientes</option>
              </select>
            </div>
          </div>

          {/* Contractors list / Empty state */}
          {isLoading ? (
            <div className="p-12 text-center text-xs text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
              <span>Cargando roster de contratistas...</span>
            </div>
          ) : filteredContractors.length === 0 ? (
            <div className="p-16 text-center text-slate-400 border-dashed border-2 border-slate-100 m-6 rounded-xl">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <h4 className="text-sm font-semibold text-slate-700">No hay contratistas registrados</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                Utilice el botón de "Registrar Contratista" superior para agregar manualmente y auditar el expediente de su primer proveedor.
              </p>
              <button
                onClick={openCreateModal}
                className="mt-4 px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                Crear primer registro
              </button>
            </div>
          ) : (
            (() => {
              const agentsList = filteredContractors.filter(c => c.type === 'Agente Contratista');
              const providersList = filteredContractors.filter(c => c.type === 'Proveedor de Servicio');

              const renderContractorCard = (contractor: Contractor) => {
                const avgRating = getAverageRating(contractor);
                
                return (
                  <div 
                    key={contractor.id} 
                    onClick={() => openDetailsModal(contractor)}
                    className="bg-white border border-slate-200 hover:border-blue-300 hover:bg-slate-50/10 rounded-xl p-3 transition-all flex items-center justify-between shadow-xs hover:shadow-md cursor-pointer group relative overflow-hidden"
                    title="Haga clic para ver el expediente completo"
                  >
                    {/* Left Section: Icon & Primary identifying info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Specialty Icon Badge */}
                      <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-slate-50 border border-slate-100/80 flex items-center justify-center text-slate-500 group-hover:bg-blue-50/50 group-hover:border-blue-100/50 group-hover:text-blue-600 transition-colors">
                        {getSpecialtyIcon(getCleanSpecialty(contractor.specialty, contractor.name))}
                      </div>
                      
                      {/* Primary Details (Name, Specialty & ID) */}
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <h3 className="font-bold font-sans text-sm text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1">
                          {contractor.name}
                        </h3>
                        <div className="flex items-center gap-2 flex-wrap text-xs font-semibold text-slate-500">
                          <span className="truncate">{getCleanSpecialty(contractor.specialty, contractor.name)}</span>
                          {avgRating > 0 && (
                            <span className="flex items-center gap-0.5 text-amber-500 font-bold bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                              {avgRating} <Star className="w-2.5 h-2.5 fill-amber-500" />
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono truncate">
                          {contractor.taxId && <span>RNC: {contractor.taxId}</span>}
                          {contractor.taxId && contractor.email && <span className="text-slate-300">•</span>}
                          <span className="truncate">{contractor.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Status Badge & Quick Actions */}
                    <div className="flex items-center gap-3 shrink-0 pl-2">
                      {/* Status Badge */}
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                        contractor.status === 'Activo' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/40' 
                          : contractor.status === 'Bajo Revisión'
                          ? 'bg-amber-50 text-amber-700 border-amber-200/40'
                          : 'bg-red-50 text-red-700 border-red-200/40'
                      }`}>
                        {contractor.status}
                      </span>

                      {/* Quick action icons */}
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          title="Cambiar estado"
                          onClick={() => handleToggleStatus(contractor)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Editar expediente"
                          onClick={() => openEditModal(contractor)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Eliminar registro"
                          onClick={() => handleDeleteContractorFromDb(contractor.id)}
                          className="p-1.5 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200/40 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              };

              if (typeFilter === 'Todos') {
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
                    {/* Agentes Column */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-blue-50 text-blue-700 rounded border border-blue-200/50">
                            <UserCheck className="w-4 h-4" />
                          </div>
                          <h3 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">
                            Agentes Contratistas
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          Total: {agentsList.length}
                        </span>
                      </div>

                      {agentsList.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                          No hay agentes contratistas que coincidan con la búsqueda.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {agentsList.map(renderContractorCard)}
                        </div>
                      )}
                    </div>

                    {/* Proveedores Column */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1 bg-indigo-50 text-indigo-700 rounded border border-indigo-200/50">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <h3 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">
                            Proveedores de Servicio
                          </h3>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          Total: {providersList.length}
                        </span>
                      </div>

                      {providersList.length === 0 ? (
                        <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                          No hay proveedores de servicio que coincidan con la búsqueda.
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2.5">
                          {providersList.map(renderContractorCard)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              // If a specific filter is set, show only that section, utilizing full width!
              const listToRender = typeFilter === 'Agente Contratista' ? agentsList : providersList;
              const isAgent = typeFilter === 'Agente Contratista';

              return (
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded border ${
                        isAgent ? 'bg-blue-50 text-blue-700 border-blue-200/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200/50'
                      }`}>
                        {isAgent ? <UserCheck className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                      </div>
                      <h3 className="font-sans font-bold text-sm text-slate-800 uppercase tracking-wider">
                        {isAgent ? 'Agentes Contratistas' : 'Proveedores de Servicio'}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      Total: {listToRender.length}
                    </span>
                  </div>

                  {listToRender.length === 0 ? (
                    <div className="p-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/40">
                      No hay registros que coincidan con los filtros de búsqueda.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {listToRender.map(renderContractorCard)}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </div>
      )}

      {activeSubTab === 'board' && (
        <div className="space-y-6">
          {/* Main Board View Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-sans">Visualización de Trabajo</span>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/60 w-fit">
                <button
                  type="button"
                  onClick={() => setBoardViewMode('list')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    boardViewMode === 'list'
                      ? 'bg-white text-slate-950 shadow-xs border border-slate-200/55'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span>Rendimiento Individual (Lista)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBoardViewMode('kanban')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                    boardViewMode === 'kanban'
                      ? 'bg-white text-slate-950 shadow-xs border border-slate-200/55'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                  <span>Flujo Kanban (Columnas)</span>
                </button>
              </div>
            </div>
            
            <div className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200/60 px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-center">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Contratistas en Registro: {contractors.length}</span>
            </div>
          </div>

          {/* Board filters toolbar */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              {/* Search board input */}
              <div className="relative w-full sm:w-64">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Search className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  placeholder="Buscar requerimiento, ID o cliente..."
                  value={boardSearchQuery}
                  onChange={(e) => setBoardSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:border-slate-400 transition"
                />
              </div>

              {/* Contractor filter */}
              <select
                value={boardContractorFilter}
                onChange={(e) => setBoardContractorFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400"
              >
                <option value="Todos">Todos los contratistas</option>
                {contractors.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.id} - {c.name}
                  </option>
                ))}
              </select>

              {/* Priority filter */}
              <select
                value={boardPriorityFilter}
                onChange={(e) => setBoardPriorityFilter(e.target.value)}
                className="text-xs border border-slate-200 bg-white rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:border-slate-400"
              >
                <option value="Todos">Todas las prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Media">Media</option>
                <option value="Baja">Baja</option>
              </select>
            </div>

            {/* View switcher (Group by) - Only shown in Kanban mode */}
            {boardViewMode === 'kanban' ? (
              <div className="flex items-center gap-1.5 self-end md:self-center">
                <span className="text-[11px] text-slate-400 font-medium font-sans">Agrupar por:</span>
                <div className="flex items-center border border-slate-200 bg-slate-50 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setBoardGroupBy('contractor')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      boardGroupBy === 'contractor'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Contratista
                  </button>
                  <button
                    type="button"
                    onClick={() => setBoardGroupBy('status')}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      boardGroupBy === 'status'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Estado CRM
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-150 font-sans">
                Métricas de Proveedores Independientes
              </div>
            )}
          </div>

          {/* List View or Kanban View based on boardViewMode */}
          {boardViewMode === 'list' ? (
            /* LIST VIEW: Performance Metrics for each contractor */
            <div className="space-y-8">
              {/* Proveedores de Servicio (Service Providers) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <h3 className="font-sans font-bold text-sm text-slate-800">Proveedores de Servicio (External Service Agencies)</h3>
                  <span className="text-[10px] font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-150 font-mono">
                    {filteredContractorsForList.filter(c => c.type === 'Proveedor de Servicio').length} registrados
                  </span>
                </div>
                
                {filteredContractorsForList.filter(c => c.type === 'Proveedor de Servicio').length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    No se encontraron proveedores de servicio con los filtros activos.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                            <th className="py-3.5 px-4">Contratista</th>
                            <th className="py-3.5 px-4 text-center">Requerimientos Activos</th>
                            <th className="py-3.5 px-4 text-center">Visitas Programadas</th>
                            <th className="py-3.5 px-4 text-center">Revisión de Backlog</th>
                            <th className="py-3.5 px-4 text-center">Casos Cerrados (Semana)</th>
                            <th className="py-3.5 px-4 text-center">ANS Real vs Meta</th>
                            <th className="py-3.5 px-4 text-center">Calidad de Servicio</th>
                            <th className="py-3.5 px-4 text-center">Desempeño</th>
                            <th className="py-3.5 px-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredContractorsForList
                            .filter(c => c.type === 'Proveedor de Servicio')
                            .map(contractor => {
                              const perf = getIndividualPerformance(contractor);
                              const comp = getIndividualCompletedMetrics(contractor);
                              const activeCount = contractorRequirements.filter(r => r.contractor.id === contractor.id && !r.isResolved).length;
                              const confStats = getWeeklyConfirmationStats(contractor);
                              const visitStats = getVisitStats(contractor);
                              return (
                                <tr key={contractor.id} className="hover:bg-slate-50/50 transition">
                                  <td className="py-3.5 px-4 font-sans">
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                          <span>{contractor.name}</span>
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            contractor.status === 'Activo' ? 'bg-emerald-500' : contractor.status === 'Bajo Revisión' ? 'bg-amber-500' : 'bg-rose-500'
                                          }`} title={`Estado: ${contractor.status}`} />
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-150">{contractor.id}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {renderActiveWorkload(activeCount)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center">
                                          <span className="text-emerald-600 font-extrabold text-xs">{visitStats.scheduled}</span>
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Prog. 📅</span>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div className="flex flex-col items-center">
                                          <span className="text-slate-500 font-bold text-xs">{visitStats.unscheduled}</span>
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Sin Prog.</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center">
                                          <span className="text-amber-600 font-extrabold text-xs">{confStats.pending}</span>
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Por Confirmar</span>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div className="flex flex-col items-center">
                                          <span className="text-emerald-600 font-bold text-xs">{confStats.confirmed}</span>
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Confirmados</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-slate-800 font-extrabold text-sm">{comp.thisWeek}</span>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Cerrados</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {renderSlaCompliance(contractor, perf)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {renderQualityStars(contractor)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${perf.badgeColor}`}>
                                      {perf.performanceTier}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      type="button"
                                      title="Ver Rendimiento"
                                      onClick={() => {
                                        setDrawerContractor(contractor);
                                        setIsPerformanceDrawerOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer shadow-xs"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Agentes Contratistas (Contractor Agents) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-150 pb-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-sans font-bold text-sm text-slate-800">Agentes Externos (Independent Contractor Agents)</h3>
                  <span className="text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-150 font-mono">
                    {filteredContractorsForList.filter(c => c.type === 'Agente Contratista').length} registrados
                  </span>
                </div>

                {filteredContractorsForList.filter(c => c.type === 'Agente Contratista').length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                    No se encontraron agentes contratistas con los filtros activos.
                  </div>
                ) : (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                            <th className="py-3.5 px-4">Contratista</th>
                            <th className="py-3.5 px-4 text-center">Requerimientos Activos</th>
                            <th className="py-3.5 px-4 text-center">Visitas Programadas</th>
                            <th className="py-3.5 px-4 text-center">Revisión de Backlog</th>
                            <th className="py-3.5 px-4 text-center">Casos Cerrados (Semana)</th>
                            <th className="py-3.5 px-4 text-center">ANS Real vs Meta</th>
                            <th className="py-3.5 px-4 text-center">Calidad de Servicio</th>
                            <th className="py-3.5 px-4 text-center">Desempeño</th>
                            <th className="py-3.5 px-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs">
                          {filteredContractorsForList
                            .filter(c => c.type === 'Agente Contratista')
                            .map(contractor => {
                              const perf = getIndividualPerformance(contractor);
                              const comp = getIndividualCompletedMetrics(contractor);
                              const activeCount = contractorRequirements.filter(r => r.contractor.id === contractor.id && !r.isResolved).length;
                              const confStats = getWeeklyConfirmationStats(contractor);
                              const visitStats = getVisitStats(contractor);
                              return (
                                <tr key={contractor.id} className="hover:bg-slate-50/50 transition">
                                  <td className="py-3.5 px-4 font-sans">
                                    <div className="flex items-center gap-2">
                                      <div>
                                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                          <span>{contractor.name}</span>
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            contractor.status === 'Activo' ? 'bg-emerald-500' : contractor.status === 'Bajo Revisión' ? 'bg-amber-500' : 'bg-rose-500'
                                          }`} title={`Estado: ${contractor.status}`} />
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-100/80 px-1.5 py-0.5 rounded border border-slate-150">{contractor.id}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {renderActiveWorkload(activeCount)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center">
                                          <span className="text-emerald-600 font-extrabold text-xs">{visitStats.scheduled}</span>
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Prog. 📅</span>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div className="flex flex-col items-center">
                                          <span className="text-slate-500 font-bold text-xs">{visitStats.unscheduled}</span>
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Sin Prog.</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <div className="flex items-center gap-2">
                                        <div className="flex flex-col items-center">
                                          <span className="text-amber-600 font-extrabold text-xs">{confStats.pending}</span>
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Por Confirmar</span>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div className="flex flex-col items-center">
                                          <span className="text-emerald-600 font-bold text-xs">{confStats.confirmed}</span>
                                          <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Confirmados</span>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <div className="flex flex-col items-center">
                                      <span className="text-slate-800 font-extrabold text-sm">{comp.thisWeek}</span>
                                      <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">Cerrados</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {renderSlaCompliance(contractor, perf)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    {renderQualityStars(contractor)}
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border ${perf.badgeColor}`}>
                                      {perf.performanceTier}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-right">
                                    <button
                                      type="button"
                                      title="Ver Rendimiento"
                                      onClick={() => {
                                        setDrawerContractor(contractor);
                                        setIsPerformanceDrawerOpen(true);
                                      }}
                                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50/50 transition-all cursor-pointer shadow-xs"
                                    >
                                      <ChevronRight className="w-4 h-4" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* KANBAN / COLUMNS VIEW */
            <>
              {boardGroupBy === 'contractor' ? (
            /* Columns grouped by Contractor */
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar" style={{ minHeight: '520px' }}>
              {contractors
                .filter(c => boardContractorFilter === 'Todos' || c.id === boardContractorFilter)
                .map(contractor => {
                  const reqs = filteredBoardRequirements.filter(r => r.contractor.id === contractor.id && !r.isResolved);
                  const resolvedReqs = filteredBoardRequirements.filter(r => r.contractor.id === contractor.id && r.isResolved);
                  return (
                    <div 
                      key={contractor.id} 
                      className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 w-76 shrink-0 flex flex-col h-[560px]"
                    >
                      {/* Contractor column header */}
                      <div className="pb-3 border-b border-slate-200 flex items-start justify-between">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              contractor.id.startsWith('AGC') 
                                ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                                : 'bg-purple-50 text-purple-700 border border-purple-100'
                            }`}>
                              {contractor.id}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {contractor.specialty}
                            </span>
                          </div>
                          <h4 
                            onClick={() => openDetailsModal(contractor)}
                            className="font-bold text-slate-800 text-xs mt-1 hover:text-blue-700 hover:underline cursor-pointer truncate"
                            title="Haga clic para ver expediente"
                          >
                            {contractor.name}
                          </h4>
                        </div>
                        <span className="bg-slate-200/70 text-slate-750 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
                          {reqs.length}
                        </span>
                      </div>

                      {/* Contractor requirements list */}
                      <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 custom-scrollbar">
                        {reqs.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-lg bg-white/50">
                            <CheckCircle2 className="w-8 h-8 text-slate-300 mb-1" />
                            <span className="text-[11px] font-bold text-slate-400">Sin tareas activas</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">SLA óptimo & disponible</span>
                          </div>
                        ) : (
                          reqs.map(req => (
                            <div
                              key={req.id}
                              onClick={() => { setSelectedReq(req); setIsReqModalOpen(true); }}
                              className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs hover:shadow-md hover:border-blue-200 transition cursor-pointer space-y-2 group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold text-slate-500 group-hover:text-blue-700 transition-colors">
                                  #{req.id}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  req.priority.toLowerCase() === 'alta'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-100'
                                    : req.priority.toLowerCase() === 'media'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-slate-50 text-slate-500 border border-slate-100'
                                }`}>
                                  {req.priority}
                                </span>
                              </div>
                              <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">
                                {req.subject}
                              </p>
                              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                                <span className="font-bold text-slate-500 uppercase tracking-wide truncate max-w-[130px]">
                                  {req.client}
                                </span>
                                <span className={`text-[9px] font-bold px-1.5 rounded-full ${
                                  req.isInProgress 
                                    ? 'bg-indigo-50 text-indigo-700' 
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {req.status}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* Columns grouped by Status */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ minHeight: '520px' }}>
              {/* Column 1: Pendiente */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 flex flex-col h-[560px]">
                <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-pulse" />
                    <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Pendiente / En Espera
                    </h4>
                  </div>
                  <span className="bg-slate-200/70 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {filteredBoardRequirements.filter(r => !r.isResolved && !r.isInProgress).length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 custom-scrollbar">
                  {filteredBoardRequirements.filter(r => !r.isResolved && !r.isInProgress).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-lg bg-white/50">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="text-[11px] font-bold text-slate-400">Sin requerimientos pendientes</span>
                    </div>
                  ) : (
                    filteredBoardRequirements.filter(r => !r.isResolved && !r.isInProgress).map(req => (
                      <div
                        key={req.id}
                        onClick={() => { setSelectedReq(req); setIsReqModalOpen(true); }}
                        className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs hover:shadow-md hover:border-blue-200 transition cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-slate-500 group-hover:text-blue-700 transition-colors">
                            #{req.id}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            req.priority.toLowerCase() === 'alta'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : req.priority.toLowerCase() === 'media'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {req.priority}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">
                          {req.subject}
                        </p>
                        
                        {/* Contractor badge */}
                        <div className="flex items-center gap-1.5 pt-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            req.contractor.id.startsWith('AGC') 
                              ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {req.contractor.id}
                          </span>
                          <span className="text-[11px] font-medium text-slate-600 truncate">
                            {req.contractor.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-50">
                          <span className="font-bold text-slate-500 uppercase tracking-wide truncate max-w-[130px]">
                            {req.client}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 rounded-full bg-amber-50 text-amber-700">
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 2: En Proceso */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 flex flex-col h-[560px]">
                <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
                    <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">
                      En Proceso / Trabajando
                    </h4>
                  </div>
                  <span className="bg-slate-200/70 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {filteredBoardRequirements.filter(r => !r.isResolved && r.isInProgress).length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 custom-scrollbar">
                  {filteredBoardRequirements.filter(r => !r.isResolved && r.isInProgress).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-lg bg-white/50">
                      <Clock className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="text-[11px] font-bold text-slate-400">Sin requerimientos en proceso</span>
                    </div>
                  ) : (
                    filteredBoardRequirements.filter(r => !r.isResolved && r.isInProgress).map(req => (
                      <div
                        key={req.id}
                        onClick={() => { setSelectedReq(req); setIsReqModalOpen(true); }}
                        className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs hover:shadow-md hover:border-blue-200 transition cursor-pointer space-y-2 group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-slate-500 group-hover:text-blue-700 transition-colors">
                            #{req.id}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                            req.priority.toLowerCase() === 'alta'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : req.priority.toLowerCase() === 'media'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-slate-50 text-slate-500 border border-slate-100'
                          }`}>
                            {req.priority}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">
                          {req.subject}
                        </p>

                        {/* Contractor badge */}
                        <div className="flex items-center gap-1.5 pt-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            req.contractor.id.startsWith('AGC') 
                              ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {req.contractor.id}
                          </span>
                          <span className="text-[11px] font-medium text-slate-600 truncate">
                            {req.contractor.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-50">
                          <span className="font-bold text-slate-500 uppercase tracking-wide truncate max-w-[130px]">
                            {req.client}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 rounded-full bg-indigo-50 text-indigo-700">
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Column 3: Completado */}
              <div className="bg-slate-50/50 border border-slate-200/80 rounded-xl p-4 flex flex-col h-[560px]">
                <div className="pb-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                    <h4 className="font-sans font-bold text-xs text-slate-800 uppercase tracking-wider">
                      Completado / Resuelto
                    </h4>
                  </div>
                  <span className="bg-slate-200/70 text-slate-700 font-mono text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {filteredBoardRequirements.filter(r => r.isResolved).length}
                  </span>
                </div>

                <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 custom-scrollbar">
                  {filteredBoardRequirements.filter(r => r.isResolved).length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-200 rounded-lg bg-white/50">
                      <CheckCircle2 className="w-8 h-8 text-slate-300 mb-1" />
                      <span className="text-[11px] font-bold text-slate-400">Sin requerimientos completados</span>
                    </div>
                  ) : (
                    filteredBoardRequirements.filter(r => r.isResolved).map(req => (
                      <div
                        key={req.id}
                        onClick={() => { setSelectedReq(req); setIsReqModalOpen(true); }}
                        className="bg-white/80 border border-slate-200/60 rounded-xl p-3 shadow-xs hover:shadow-md hover:border-emerald-200 transition cursor-pointer space-y-2 group opacity-85"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-bold text-slate-500 group-hover:text-emerald-700 transition-colors">
                            #{req.id}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Resuelto
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 line-clamp-2 leading-relaxed line-through">
                          {req.subject}
                        </p>

                        {/* Contractor badge */}
                        <div className="flex items-center gap-1.5 pt-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            req.contractor.id.startsWith('AGC') 
                              ? 'bg-blue-50 text-blue-700 border border-blue-100' 
                              : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {req.contractor.id}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 truncate">
                            {req.contractor.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-50">
                          <span className="font-bold text-slate-400 uppercase tracking-wide truncate max-w-[130px]">
                            {req.client}
                          </span>
                          <span className="text-[9px] font-bold px-1.5 rounded-full bg-emerald-50 text-emerald-700">
                            {req.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
        </div>
      )}

      {/* CREATE CONTRACTOR MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-sans font-semibold text-base text-slate-900">Registrar Nuevo Contratista</h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContractor} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200/50 rounded-lg p-3 text-xs text-red-700 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Contratista o Empresa *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej. Andrés Gómez o Climatización Dominicana SRL"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  >
                    <option value="Agente Contratista">Agente Contratista (Persona)</option>
                    <option value="Proveedor de Servicio">Proveedor de Servicio (Empresa)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Especialidad Técnica *</label>
                  <input
                    type="text"
                    required
                    value={formSpecialty}
                    onChange={(e) => setFormSpecialty(e.target.value)}
                    placeholder="Ej. Ciberseguridad, Climatización"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correo de Contacto *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teléfono</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="809-555-0199"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RNC / Cédula / Tax ID</label>
                  <input
                    type="text"
                    value={formTaxId}
                    onChange={(e) => setFormTaxId(e.target.value)}
                    placeholder="Ej. 131-45678-2"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Objetivo SLA (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formSlaTarget}
                    onChange={(e) => setFormSlaTarget(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">Supervisor Responsable</label>
                  <select
                    value={formSupervisorId}
                    onChange={(e) => setFormSupervisorId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  >
                    <option value="">Seleccione supervisor</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vigencia Inicial</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Bajo Revisión">Bajo Revisión</option>
                  </select>
                </div>
              </div>

              {/* Document verification checkboxes */}
              <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Acreditación Legal Entregada</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formDocContract} 
                      onChange={(e) => setFormDocContract(e.target.checked)}
                      className="rounded border-slate-200 text-slate-900 focus:ring-0" 
                    />
                    <span>Contrato Firmado</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formDocNda} 
                      onChange={(e) => setFormDocNda(e.target.checked)}
                      className="rounded border-slate-200 text-slate-900 focus:ring-0" 
                    />
                    <span>NDA Firmado</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formDocTax} 
                      onChange={(e) => setFormDocTax(e.target.checked)}
                      className="rounded border-slate-200 text-slate-900 focus:ring-0" 
                    />
                    <span>Certificación Impuestos</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formDocId} 
                      onChange={(e) => setFormDocId(e.target.checked)}
                      className="rounded border-slate-200 text-slate-900 focus:ring-0" 
                    />
                    <span>Doc. Identidad / ID</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notas u Observaciones del Contrato</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Alcance acordado, retenciones, detalles del nivel de servicio..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Registrando...' : 'Confirmar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CONTRACTOR MODAL */}
      {isEditModalOpen && selectedContractor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-sans font-semibold text-base text-slate-900">Editar Expediente de Contratista</h3>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditContractor} className="p-5 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200/50 rounded-lg p-3 text-xs text-red-700 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre del Contratista o Empresa *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tipo *</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  >
                    <option value="Agente Contratista">Agente Contratista (Persona)</option>
                    <option value="Proveedor de Servicio">Proveedor de Servicio (Empresa)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Especialidad Técnica *</label>
                  <input
                    type="text"
                    required
                    value={formSpecialty}
                    onChange={(e) => setFormSpecialty(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Correo de Contacto *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Teléfono</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">RNC / Cédula / Tax ID</label>
                  <input
                    type="text"
                    value={formTaxId}
                    onChange={(e) => setFormTaxId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Objetivo SLA (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={formSlaTarget}
                    onChange={(e) => setFormSlaTarget(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-sans">Supervisor Responsable</label>
                  <select
                    value={formSupervisorId}
                    onChange={(e) => setFormSupervisorId(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  >
                    <option value="">Seleccione supervisor</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.id})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Vigencia</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                    <option value="Bajo Revisión">Bajo Revisión</option>
                  </select>
                </div>
              </div>

              {/* Document verification checkboxes */}
              <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Acreditación Legal Entregada</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formDocContract} 
                      onChange={(e) => setFormDocContract(e.target.checked)}
                      className="rounded border-slate-200 text-slate-900 focus:ring-0" 
                    />
                    <span>Contrato Firmado</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formDocNda} 
                      onChange={(e) => setFormDocNda(e.target.checked)}
                      className="rounded border-slate-200 text-slate-900 focus:ring-0" 
                    />
                    <span>NDA Firmado</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formDocTax} 
                      onChange={(e) => setFormDocTax(e.target.checked)}
                      className="rounded border-slate-200 text-slate-900 focus:ring-0" 
                    />
                    <span>Certificación Impuestos</span>
                  </label>
                  <label className="flex items-center gap-2 text-slate-700 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={formDocId} 
                      onChange={(e) => setFormDocId(e.target.checked)}
                      className="rounded border-slate-200 text-slate-900 focus:ring-0" 
                    />
                    <span>Doc. Identidad / ID</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Notas u Observaciones del Contrato</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Alcance acordado, retenciones, detalles del nivel de servicio..."
                  rows={2}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition resize-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PERFORMANCE AUDITING MODAL */}
      {isAuditModalOpen && selectedContractor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-sans font-semibold text-base text-slate-900">Auditar Desempeño</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Contratista: {selectedContractor.name}</p>
              </div>
              <button 
                onClick={() => setIsAuditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAudit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Métrica de Auditoría</label>
                  <select
                    value={auditMetric}
                    onChange={(e) => setAuditMetric(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  >
                    <option value="SLA">Cumplimiento SLA</option>
                    <option value="Calidad">Calidad del Trabajo</option>
                    <option value="Velocidad">Tiempo de Respuesta</option>
                    <option value="Soporte">Disponibilidad / Soporte</option>
                    <option value="Documentacion">Vigencia Documental</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Calificación (1 - 5)</label>
                  <select
                    value={auditScore}
                    onChange={(e) => setAuditScore(Number(e.target.value))}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition font-bold text-slate-900"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ (Sobresaliente)</option>
                    <option value="4">⭐⭐⭐⭐ (Óptimo)</option>
                    <option value="3">⭐⭐⭐ (Aceptable)</option>
                    <option value="2">⭐⭐ (Bajo Supervisión)</option>
                    <option value="1">⭐ (Deficiente / Incumplimiento)</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Auditor / Firmado por</label>
                  <input
                    type="text"
                    value={auditBy}
                    onChange={(e) => setAuditBy(e.target.value)}
                    placeholder="Ej. Ing. Carlos Mendoza o Tu Nombre"
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition"
                  />
                </div>

                <div className="col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Comentarios Técnicos / Feedback</label>
                  <textarea
                    required
                    value={auditFeedback}
                    onChange={(e) => setAuditFeedback(e.target.value)}
                    placeholder="Describa el resultado del servicio, cumplimiento de plazos u observaciones técnicas encontradas..."
                    rows={4}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:border-slate-400 transition resize-none"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAuditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                >
                  Confirmar Evaluación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS / EXPEDIENTE MODAL */}
      {isDetailsModalOpen && selectedContractor && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  Expediente de Desempeño
                </span>
                <h3 className="font-sans font-bold text-lg text-slate-900 pt-1">{selectedContractor.name}</h3>
              </div>
              <button 
                onClick={() => setIsDetailsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5">
              
              {/* Profile details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 border border-slate-200/50 rounded-lg p-4">
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Especialidad</span>
                    <p className="text-slate-800 font-semibold">{selectedContractor.specialty}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">RNC / Cédula / Identificación</span>
                    <p className="text-slate-800 font-mono font-medium">{selectedContractor.taxId || 'No asignado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Supervisor Asignado</span>
                    <p className="text-slate-800 font-semibold">
                      {agents.find(a => a.id === selectedContractor.supervisorAgentId)?.name || 'Sin Supervisor'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Correo de Contacto</span>
                    <p className="text-slate-800 font-medium">{selectedContractor.email}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Teléfono</span>
                    <p className="text-slate-800 font-medium">{selectedContractor.phone || 'No asignado'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Fecha de Registro</span>
                    <p className="text-slate-800 font-medium">{selectedContractor.registeredAt}</p>
                  </div>
                </div>

                {selectedContractor.notes && (
                  <div className="col-span-1 sm:col-span-2 border-t border-slate-200/60 pt-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Notas del Contrato / Alcance</span>
                    <p className="text-slate-600 leading-relaxed italic">{selectedContractor.notes}</p>
                  </div>
                )}
              </div>

              {/* Document Check status */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span>Estado de Acreditación de Documentos</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Contrato Legal Firmado', val: selectedContractor.documents?.contractSigned },
                    { label: 'Acuerdo de Confidencialidad (NDA)', val: selectedContractor.documents?.ndaSigned },
                    { label: 'Certificación Impositiva (DGII)', val: selectedContractor.documents?.taxCertificate },
                    { label: 'Cédula de Identidad Electoral / ID', val: selectedContractor.documents?.identityVerified }
                  ].map((docItem, idx) => (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-2.5 rounded-lg border ${
                        docItem.val 
                          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-800' 
                          : 'bg-red-50/40 border-red-100 text-red-800'
                      }`}
                    >
                      <span className="font-medium">{docItem.label}</span>
                      <div className="flex items-center gap-1.5">
                        {docItem.val ? (
                          <>
                            <span className="text-[10px] font-bold uppercase text-emerald-700">Acreditado</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] font-bold uppercase text-red-700">Pendiente</span>
                            <AlertCircle className="w-4 h-4 text-red-500 fill-red-50" />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Historical evaluations trail */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-slate-400" />
                    <span>Historial de Evaluaciones y Auditorías</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAuditModalOpen(true);
                    }}
                    className="text-[11px] font-bold text-slate-900 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar Evaluación</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-150">
                  {!selectedContractor.audits || selectedContractor.audits.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400 bg-slate-50/30">
                      No se han registrado auditorías de desempeño para este contratista.
                    </div>
                  ) : (
                    [...selectedContractor.audits].reverse().map((audit) => (
                      <div key={audit.id} className="p-4 bg-white hover:bg-slate-50/30 transition-all space-y-2 text-xs">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                              {audit.metric}
                            </span>
                            {renderStars(audit.score)}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">{audit.date}</span>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-medium">
                          "{audit.feedback}"
                        </p>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span className="font-semibold text-slate-500">Auditor:</span>
                          <span>{audit.auditedBy}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsDetailsModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition"
              >
                Cerrar Expediente
              </button>
            </div>

          </div>
        </div>
      )}

      {/* REQUIREMENT DETAIL MODAL */}
      {isReqModalOpen && selectedReq && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                  Requerimiento de Contratación #{selectedReq.id}
                </span>
                <h3 className="font-sans font-bold text-base text-slate-900 mt-1">
                  Detalles de la Tarea
                </h3>
              </div>
              <button 
                onClick={() => setIsReqModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
              {/* Subject Banner */}
              <div className="space-y-1.5 bg-slate-50 border border-slate-150 rounded-xl p-4">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Asunto del Requerimiento</span>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  {selectedReq.subject}
                </p>
              </div>

              {/* Grid with metadata */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 bg-white border border-slate-100 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cliente</span>
                  <span className="text-xs font-bold text-slate-850">
                    {selectedReq.client}
                  </span>
                </div>

                <div className="space-y-1 bg-white border border-slate-100 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Prioridad</span>
                  <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedReq.priority.toLowerCase() === 'alta'
                      ? 'bg-rose-50 text-rose-700 border border-rose-100'
                      : selectedReq.priority.toLowerCase() === 'media'
                      ? 'bg-amber-50 text-amber-700 border border-amber-100'
                      : 'bg-slate-50 text-slate-500 border border-slate-100'
                  }`}>
                    {selectedReq.priority}
                  </span>
                </div>

                <div className="space-y-1 bg-white border border-slate-100 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estado Actual</span>
                  <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedReq.isResolved
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                      : selectedReq.isInProgress
                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                      : 'bg-amber-50 text-amber-700 border border-amber-150'
                  }`}>
                    {selectedReq.status}
                  </span>
                </div>

                <div className="space-y-1 bg-white border border-slate-100 rounded-lg p-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categoría de Estado</span>
                  <span className="text-xs font-semibold text-slate-700">
                    {selectedReq.isResolved 
                      ? 'Completado / Cerrado' 
                      : selectedReq.isInProgress 
                      ? 'En Proceso / Trabajando' 
                      : 'Pendiente / En Espera'
                    }
                  </span>
                </div>
              </div>

              {/* Assigned Contractor dossier link */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Contratista Asignado</span>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-lg text-slate-600">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          selectedReq.contractor.id.startsWith('AGC') 
                            ? 'bg-blue-50 text-blue-700' 
                            : 'bg-purple-50 text-purple-700'
                        }`}>
                          {selectedReq.contractor.id}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {selectedReq.contractor.specialty}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-850 text-xs mt-0.5">
                        {selectedReq.contractor.name}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      // Close this modal and open the contractor details dossier modal!
                      setIsReqModalOpen(false);
                      openDetailsModal(selectedReq.contractor);
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
                  >
                    Ver Expediente Completo
                  </button>
                </div>
              </div>

              {/* Complete row data details transparency */}
              <div className="space-y-2">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Campos Registrados en CRM (Transparencia Completa)</span>
                <div className="bg-slate-50 rounded-xl border border-slate-150 overflow-hidden divide-y divide-slate-100 text-xs font-medium">
                  {Object.entries(selectedReq.rawRow)
                    .filter(([key, val]) => val !== undefined && val !== null && val !== '' && typeof val !== 'object')
                    .map(([key, val]) => (
                      <div key={key} className="grid grid-cols-3 p-2.5">
                        <span className="text-slate-400 font-semibold uppercase tracking-wide text-[9px]">{key}</span>
                        <span className="col-span-2 text-slate-700 font-sans truncate pr-2" title={String(val)}>
                          {String(val)}
                        </span>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setIsReqModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition"
              >
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONTRACTOR PERFORMANCE DRAWER ("Drywall") */}
      {isPerformanceDrawerOpen && drawerContractor && (() => {
        const perf = getIndividualPerformance(drawerContractor);
        const comp = getIndividualCompletedMetrics(drawerContractor);
        const activeReqs = contractorRequirements.filter(r => r.contractor.id === drawerContractor.id && !r.isResolved);
        
        const mappedBacklogAndAdminDone = (() => {
          const { backlogTotal, adminDoneTotal } = getContractorCompletedFromBacklogs(drawerContractor.name);
          
          const backlogMapped = backlogTotal.map((row, idx) => ({
            id: String(row.ID || row.id || `BCK-${idx}`),
            subject: String(row.Asunto || row.Subject || row.Requerimiento || 'Revisión de Backlog'),
            client: String(row.Cliente || row.Account || row.Cuenta || 'F.H.O.N.S.'),
            status: String(row['Estado Registro'] || row['estado_registro'] || 'Cerrado (Backlog)'),
            priority: String(row.Prioridad || row.Priority || 'Media'),
            date: String(row.Fecha || row.Date || ''),
            contractor: drawerContractor,
            rawRow: row,
            isResolved: true,
            isInProgress: false,
            isBacklogSource: true
          }));

          const adminDoneMapped = adminDoneTotal.map((row, idx) => ({
            id: String(row.ID || row.id || `ADM-${idx}`),
            subject: String(row.Asunto || row.Subject || row.Requerimiento || 'Auditado Admin'),
            client: String(row.Cliente || row.Account || row.Cuenta || 'F.H.O.N.S.'),
            status: String(row['Estado Registro'] || row['estado_registro'] || 'Cerrado (Auditoría)'),
            priority: String(row.Prioridad || row.Priority || 'Media'),
            date: String(row.Fecha || row.Date || ''),
            contractor: drawerContractor,
            rawRow: row,
            isResolved: true,
            isInProgress: false,
            isAdminDoneSource: true
          }));

          return [...backlogMapped, ...adminDoneMapped];
        })();

        const completedReqsFromCrm = contractorRequirements.filter(r => r.contractor.id === drawerContractor.id && r.isResolved);
        const allCompletedReqs = [...completedReqsFromCrm, ...mappedBacklogAndAdminDone];

        return (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md z-50 flex justify-end">
            {/* Backdrop click handler */}
            <div 
              className="absolute inset-0 cursor-pointer"
              onClick={() => {
                setIsPerformanceDrawerOpen(false);
                setDrawerContractor(null);
              }}
            />

            {/* Sliding Panel */}
            <div className="relative w-full max-w-4xl bg-slate-50 h-full shadow-2xl flex flex-col z-10 animate-slide-in-right transform transition-transform duration-300 overflow-hidden border-l border-slate-200">
              
              {/* Drawer Header */}
              <div className="p-6 border-b border-slate-150 flex items-center justify-between bg-slate-900 text-white shrink-0">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-slate-700 px-2.5 py-1 rounded">
                    Expediente Individual de Desempeño
                  </span>
                  <h3 className="font-sans font-bold text-lg">{drawerContractor.name}</h3>
                  <p className="text-[11px] text-slate-400 font-mono">ID Contratista: {drawerContractor.id} • {drawerContractor.type}</p>
                </div>
                <button 
                  onClick={() => {
                    setIsPerformanceDrawerOpen(false);
                    setDrawerContractor(null);
                  }}
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b border-slate-200 bg-white px-6 shrink-0 gap-6">
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('indicators')}
                  className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    drawerActiveTab === 'indicators'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Indicadores</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('requests')}
                  className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    drawerActiveTab === 'requests'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>Requerimientos ({activeReqs.length + allCompletedReqs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('audits')}
                  className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    drawerActiveTab === 'audits'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Star className="w-4 h-4" />
                  <span>Auditorías ({drawerContractor.audits?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerActiveTab('info')}
                  className={`py-3.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                    drawerActiveTab === 'info'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Info className="w-4 h-4" />
                  <span>Información</span>
                </button>
              </div>

              {/* Drawer Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                
                {drawerActiveTab === 'indicators' && (
                  <div className="space-y-6">
                    {/* Performance Grid (Bento Style) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      
                      {/* SLA Box */}
                      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Acuerdo de SLA</span>
                          <Award className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-3xl font-black ${perf.slaReal >= drawerContractor.slaTarget ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {perf.slaReal}%
                          </span>
                          <span className="text-xs text-slate-400">logrado</span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          <div className="flex justify-between text-[11px] font-bold text-slate-500">
                            <span>Meta de Contrato</span>
                            <span>{drawerContractor.slaTarget}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${perf.slaReal >= drawerContractor.slaTarget ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${Math.min(100, perf.slaReal)}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Resolution Speed Box */}
                      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Tiempo de Resolución</span>
                          <Clock className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-black text-slate-800">
                            {perf.avgDays}
                          </span>
                          <span className="text-xs text-slate-500">días promedio</span>
                        </div>
                        <div className="text-[11px] text-slate-400 leading-relaxed font-medium">
                          Calculado sobre el histórico de requerimientos resueltos. Los tiempos reflejan la velocidad de atención para este tipo de especialidad.
                        </div>
                      </div>

                      {/* Efficiency Box */}
                      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs col-span-1 sm:col-span-2 grid grid-cols-2 gap-4">
                        <div className="space-y-2 border-r border-slate-100 pr-4">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">
                            <span>Eficiencia</span>
                            <TrendingUp className="w-4 h-4 text-slate-400" />
                          </div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-2xl font-black text-slate-800">{perf.resolutionRate}%</span>
                            <span className="text-[10px] text-slate-400">Tasa de resolución</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">De un total de {perf.totalManaged} casos asignados en historial.</p>
                        </div>

                        <div className="space-y-2 pl-2">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Casos Completados</div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                              <span className="block text-slate-400 text-[9px] font-bold uppercase font-sans">Esta Semana</span>
                              <span className="text-lg font-extrabold text-slate-800 font-sans">{comp.thisWeek}</span>
                            </div>
                            <div className="bg-slate-50 p-2 rounded-lg text-center">
                              <span className="block text-slate-400 text-[9px] font-bold uppercase font-sans">Histórico</span>
                              <span className="text-lg font-extrabold text-slate-800 font-sans">{comp.allTime}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Rating / Quality Box */}
                      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-xs col-span-1 sm:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wide font-sans">Calidad de Servicio / Satisfacción</div>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl font-black text-slate-800">
                              {perf.avgAudit.toFixed(1)}
                            </span>
                            <span className="text-xs text-slate-400">/ 5.0</span>
                            <div className="ml-1">{renderStars(Math.round(perf.avgAudit))}</div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">Basado en auditorías internas de los supervisores asignados.</p>
                        </div>
                        
                        <div className={`px-4 py-2.5 rounded-xl border flex flex-col items-center justify-center text-center ${perf.badgeColor} min-w-[160px]`}>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5 font-sans">Diagnóstico</span>
                          <span className="font-extrabold text-sm">{perf.performanceTier}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {drawerActiveTab === 'requests' && (
                  <div className="space-y-4">
                    {/* Toggle subtabs for active and completed */}
                    <div className="flex bg-slate-100 p-1 rounded-xl w-fit gap-1">
                      <button
                        type="button"
                        onClick={() => setDrawerRequestsFilter('active')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          drawerRequestsFilter === 'active'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        Requerimientos Activos ({activeReqs.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawerRequestsFilter('completed')}
                        className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          drawerRequestsFilter === 'completed'
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-500 hover:text-slate-850'
                        }`}
                      >
                        Historial Completado ({allCompletedReqs.length})
                      </button>
                    </div>

                    {drawerRequestsFilter === 'active' ? (() => {
                      const activeReqsPaged = activeReqs.slice((activeReqsPage - 1) * ITEMS_PER_PAGE, activeReqsPage * ITEMS_PER_PAGE);
                      return (
                        <div className="space-y-3">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Pendientes de Resolución ({activeReqs.length})
                          </div>
                          {activeReqs.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                              Este contratista no tiene requerimientos pendientes de resolución en este momento.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                                {activeReqsPaged.map(req => (
                                  <div 
                                    key={req.id} 
                                    onClick={() => {
                                      setSelectedReq(req);
                                      setIsReqModalOpen(true);
                                    }}
                                    className="p-4 hover:bg-slate-55/50 transition cursor-pointer flex items-center justify-between text-xs"
                                  >
                                    <div className="min-w-0 pr-3 space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">#{req.id}</span>
                                        <span className="font-bold text-slate-850 truncate max-w-[340px]">{req.subject}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        Cliente: <span className="font-semibold text-slate-500">{req.client}</span> • Fecha: <span className="font-semibold text-slate-500">{req.date || 'Sin Fecha'}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                        req.priority === 'Alta' 
                                          ? 'bg-rose-50 text-rose-700 border border-rose-100' 
                                          : req.priority === 'Media'
                                            ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                            : 'bg-slate-50 text-slate-700 border border-slate-100'
                                      }`}>
                                        {req.priority}
                                      </span>
                                      <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-150">
                                        {req.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {renderPaginationControls(activeReqs.length, activeReqsPage, setActiveReqsPage)}
                            </div>
                          )}
                        </div>
                      );
                    })() : (() => {
                      const completedReqsPaged = allCompletedReqs.slice((completedReqsPage - 1) * ITEMS_PER_PAGE, completedReqsPage * ITEMS_PER_PAGE);
                      return (
                        <div className="space-y-3">
                          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                            Histórico de Casos Resueltos ({allCompletedReqs.length})
                          </div>
                          {allCompletedReqs.length === 0 ? (
                            <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                              No se registran requerimientos resueltos o auditados en el historial de este contratista.
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                                {completedReqsPaged.map((req, idx) => (
                                  <div 
                                    key={req.id + '-' + idx} 
                                    onClick={() => {
                                      setSelectedReq(req);
                                      setIsReqModalOpen(true);
                                    }}
                                    className="p-4 hover:bg-slate-55/50 transition cursor-pointer flex items-center justify-between text-xs"
                                  >
                                    <div className="min-w-0 pr-3 space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                          (req as any).isBacklogSource 
                                            ? 'bg-purple-50 text-purple-700' 
                                            : (req as any).isAdminDoneSource 
                                              ? 'bg-amber-50 text-amber-700' 
                                              : 'bg-emerald-50 text-emerald-700'
                                        }`}>
                                          #{req.id}
                                        </span>
                                        <span className="font-bold text-slate-800 truncate max-w-[340px]">{req.subject}</span>
                                        {(req as any).isBacklogSource && (
                                          <span className="text-[8px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Backlog</span>
                                        )}
                                        {(req as any).isAdminDoneSource && (
                                          <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">En Auditoría</span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-400">
                                        Cliente: <span className="font-semibold text-slate-500">{req.client}</span> • Cerrado: <span className="font-semibold text-slate-500">{req.date || 'Reciente'}</span>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                                        {req.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {renderPaginationControls(allCompletedReqs.length, completedReqsPage, setCompletedReqsPage)}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {drawerActiveTab === 'audits' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <Award className="w-4 h-4 text-slate-400" />
                        <span>Historial de Auditorías Realizadas ({drawerContractor.audits?.length || 0})</span>
                      </h4>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedContractor(drawerContractor);
                          setIsPerformanceDrawerOpen(false);
                          setIsAuditModalOpen(true);
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                      >
                        Realizar Nueva Auditoría
                      </button>
                    </div>

                    <div className="space-y-3">
                      {!drawerContractor.audits || drawerContractor.audits.length === 0 ? (
                        <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                          No se han registrado auditorías de servicio para este contratista.
                        </div>
                      ) : (
                        [...drawerContractor.audits].reverse().map((audit) => {
                          const isExpanded = expandedAuditId === audit.id;
                          return (
                            <div 
                              key={audit.id} 
                              className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:border-slate-300 transition-all duration-200"
                            >
                              {/* Header Card (Always Visible) */}
                              <div 
                                onClick={() => setExpandedAuditId(isExpanded ? null : audit.id)}
                                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-wrap min-w-0">
                                  <span className="font-bold bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-mono">
                                    {audit.metric}
                                  </span>
                                  <div className="flex items-center shrink-0">
                                    {renderStars(audit.score)}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-[10px] font-mono text-slate-400 font-bold">{audit.date}</span>
                                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-all duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                </div>
                              </div>

                              {/* Expandable Panel (Visible only when open) */}
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/30 space-y-3">
                                  <p className="text-slate-700 italic leading-relaxed text-xs">
                                    "{audit.feedback}"
                                  </p>
                                  <div className="text-[10px] text-slate-400 flex items-center gap-1.5 bg-slate-100/50 p-2 rounded-lg border border-slate-200/50">
                                    <span className="font-bold text-slate-500 uppercase tracking-wide text-[8px]">Auditor:</span>
                                    <span className="font-semibold text-slate-600">{audit.auditedBy}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {drawerActiveTab === 'info' && (
                  <div className="space-y-6">
                    {/* Profile contact card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 font-sans">
                        <Mail className="w-4 h-4 text-slate-400" />
                        <span>Datos de Contacto Contractual</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Correo de Contacto</span>
                          <p className="text-slate-800 font-medium flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>{drawerContractor.email}</span>
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Teléfono Móvil</span>
                          <p className="text-slate-800 font-medium flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{drawerContractor.phone || 'No asignado'}</span>
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">RNC / Cédula</span>
                          <p className="text-slate-800 font-mono font-medium">{drawerContractor.taxId || 'No asignada'}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Supervisor de Enlace</span>
                          <p className="text-slate-800 font-semibold">
                            {agents.find(a => a.id === drawerContractor.supervisorAgentId)?.name || 'Sin Supervisor'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Legal Documents Status */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 font-sans">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span>Estatus Documentos Legales</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        {[
                          { label: 'Contrato Legal Firmado', val: drawerContractor.documents?.contractSigned },
                          { label: 'Acuerdo de Confidencialidad (NDA)', val: drawerContractor.documents?.ndaSigned },
                          { label: 'Certificación Impositiva (DGII)', val: drawerContractor.documents?.taxCertificate },
                          { label: 'Cédula de Identidad Electoral / ID', val: drawerContractor.documents?.identityVerified }
                        ].map((doc, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-150">
                            <span className="font-semibold text-slate-700">{doc.label}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                              doc.val ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {doc.val ? 'FIRMADO' : 'PENDIENTE'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notes block */}
                    {drawerContractor.notes && (
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 font-sans">Notas Internas</h4>
                        <p className="text-xs text-slate-600 leading-relaxed italic">
                          "{drawerContractor.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                )}

              </div>

              {/* Drawer Footer */}
              <div className="p-4 border-t border-slate-150 bg-slate-50 flex items-center justify-between shrink-0">
                <span className="text-[10px] text-slate-400 font-mono">
                  SLA de Contrato: {drawerContractor.slaTarget}% Meta
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsPerformanceDrawerOpen(false);
                    setDrawerContractor(null);
                  }}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-xs cursor-pointer"
                >
                  Cerrar Vista de Rendimiento
                </button>
              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
