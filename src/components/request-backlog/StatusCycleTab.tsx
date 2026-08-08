import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Target, 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Users, 
  Search, 
  Filter, 
  ChevronRight, 
  Zap, 
  Award, 
  ShieldAlert, 
  Activity, 
  BarChart3, 
  AlertCircle, 
  X,
  Layers,
  PieChart,
  UserX,
  AlertOctagon,
  TrendingDown,
  RefreshCw,
  FileText,
  ThumbsDown,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Agent {
  id: string;
  name: string;
  role?: string;
  avatar?: string;
  team?: string;
}

interface StatusCycleTabProps {
  crmData: any[];
  agents?: Agent[];
}

// Helper to normalize strings for robust comparison
const normalizeStr = (str: any) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
};

// Helper to parse multiple CRM date string formats into standard JavaScript Date objects
function parseDateString(dateStr: any): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Try standard Date constructor first (e.g., "Oct 15, 2024 12:01 PM")
  const d1 = new Date(trimmed);
  if (!isNaN(d1.getTime())) return d1;

  // Try parsing DD/MM/YYYY or DD/MM/YYYY HH:mm
  const parts = trimmed.split(' ');
  const dateParts = parts[0].split('/');
  if (dateParts.length === 3) {
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    const timeParts = parts[1] ? parts[1].split(':') : ['0', '0'];
    const hour = parseInt(timeParts[0] || '0', 10);
    const min = parseInt(timeParts[1] || '0', 10);
    const d2 = new Date(year, month, day, hour, min);
    if (!isNaN(d2.getTime())) return d2;
  }

  return null;
}

// Check if a row represents a resolved/closed request
function isTicketResolved(row: any): boolean {
  if (!row) return false;
  if (row._sourceSheet === 'historico_completados' || row._sourceSheet === 'admin_backlog_done') return true;

  const statStr = normalizeStr(String(row.Status || row.Estado || row.status || row.estado || ''));
  const colJVal = normalizeStr(String(row['Estado Registro'] || row['Estado registro'] || row['Columna J'] || ''));

  if (statStr.includes('abierto y pendiente') || statStr === 'abierto' || statStr === 'pendiente') {
    return false;
  }

  return (
    statStr.includes('cerrad') ||
    statStr.includes('close') ||
    statStr.includes('resuelt') ||
    statStr.includes('completad') ||
    statStr.includes('realizad') ||
    statStr.includes('solucion') ||
    statStr.includes('finaliz') ||
    statStr.includes('anulad') ||
    statStr.includes('rechazad') ||
    statStr.includes('done') ||
    statStr.includes('historico') ||
    colJVal.includes('completado') ||
    colJVal.includes('confirmar')
  );
}

// Check if a row represents an in-progress request
function isTicketInProgress(row: any): boolean {
  if (!row || isTicketResolved(row)) return false;
  const statStr = normalizeStr(String(row.Status || row.Estado || row.status || row.estado || ''));
  
  if (statStr.includes('abierto y pendiente') || statStr === 'abierto' || statStr === 'pendiente') {
    return false;
  }

  return (
    statStr.includes('progres') ||
    statStr.includes('curso') ||
    statStr.includes('intern') ||
    statStr.includes('espera') ||
    statStr.includes('trabajando') ||
    statStr.includes('proceso') ||
    statStr.includes('procesando') ||
    statStr.includes('waiting') ||
    statStr.includes('doing') ||
    statStr.includes('active') ||
    statStr.includes('mantenimiento') ||
    statStr.includes('visita') ||
    statStr.includes('agendado') ||
    statStr.includes('prueba') ||
    statStr.includes('escalado') ||
    statStr.includes('proyecto')
  );
}

export function StatusCycleTab({ crmData, agents = [] }: StatusCycleTabProps) {
  // State for Filters & Controls
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedAgingFilter, setSelectedAgingFilter] = useState('ALL');
  const [timeUnit, setTimeUnit] = useState<'days' | 'hours'>('days');
  const [activeTabSubView, setActiveTabSubView] = useState<'matrix' | 'anomalies' | 'funnel'>('matrix');
  
  // Selected Agent for Deep Audit Drawer
  const [inspectAgentName, setInspectAgentName] = useState<string | null>(null);

  // 1. Process Raw Data & Compute Rich Lifecycle Fields
  const processedData = useMemo(() => {
    const now = new Date();

    return crmData.map(row => {
      const id = String(row.ID || row.id || row['ID Requerimiento'] || 'N/A').trim();
      const subject = String(row.Subject || row.Título || row.Title || 'Sin Asunto').trim();
      const client = String(row.Account || row.Cliente || 'Sin Cliente').trim();
      const assignedTo = String(row['Assigned To'] || row['Técnico Asignado'] || row['Asignado'] || 'Sin Asignar').trim();
      const priority = String(row.Priority || row.Prioridad || 'Normal').trim();
      const requestType = String(row['Request Type'] || row.Tipo || 'General').trim();
      const statusRaw = String(row.Status || row.Estado || 'Sin Status').trim();

      const createdDate = parseDateString(row['Created Date'] || row['Fecha creación']);
      const resolvedDate = parseDateString(row['Resolved Date'] || row['Fecha completado']);
      const slaDate = parseDateString(row.SLA);

      const resolved = isTicketResolved(row);
      const inProgress = !resolved && isTicketInProgress(row);
      const pending = !resolved && !inProgress;

      // Calculate resolution time if resolved
      let resolutionTimeDays: number | null = null;
      let resolutionTimeHours: number | null = null;

      if (resolved && createdDate && resolvedDate) {
        const diffMs = resolvedDate.getTime() - createdDate.getTime();
        if (diffMs >= 0) {
          resolutionTimeHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
          resolutionTimeDays = Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;
        }
      }

      // Calculate active open age if not resolved
      let activeAgeDays = 0;
      let activeAgeHours = 0;
      if (!resolved && createdDate) {
        const diffMs = now.getTime() - createdDate.getTime();
        if (diffMs >= 0) {
          activeAgeHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
          activeAgeDays = Math.round((diffMs / (1000 * 60 * 60 * 24)) * 10) / 10;
        }
      }

      // SLA Status check
      let slaStatus: 'MET' | 'BREACHED' | 'NO_SLA' | 'AT_RISK' = 'NO_SLA';
      if (slaDate) {
        if (resolved && resolvedDate) {
          slaStatus = resolvedDate <= slaDate ? 'MET' : 'BREACHED';
        } else if (!resolved) {
          if (now > slaDate) {
            slaStatus = 'BREACHED';
          } else {
            const remainingHours = (slaDate.getTime() - now.getTime()) / (1000 * 60 * 60);
            slaStatus = remainingHours <= 24 ? 'AT_RISK' : 'MET';
          }
        }
      }

      // Aging Bucket Categorization
      let agingBucket: 'OPTIMAL' | 'NORMAL' | 'WARNING' | 'CRITICAL' | 'COMPLETED' = 'COMPLETED';
      if (!resolved) {
        if (activeAgeDays <= 3) agingBucket = 'OPTIMAL';
        else if (activeAgeDays <= 7) agingBucket = 'NORMAL';
        else if (activeAgeDays <= 14) agingBucket = 'WARNING';
        else agingBucket = 'CRITICAL';
      }

      // Stagnant condition
      const isStagnant = !resolved && (activeAgeDays > 14 || slaStatus === 'BREACHED');

      // Unassigned risk
      const isUnassigned = normalizeStr(assignedTo) === 'sin asignar' || normalizeStr(assignedTo) === '' || assignedTo === '-';

      return {
        raw: row,
        id,
        subject,
        client,
        assignedTo,
        priority,
        requestType,
        statusRaw,
        createdDate,
        resolvedDate,
        slaDate,
        resolved,
        inProgress,
        pending,
        resolutionTimeDays,
        resolutionTimeHours,
        activeAgeDays,
        activeAgeHours,
        slaStatus,
        agingBucket,
        isStagnant,
        isUnassigned
      };
    });
  }, [crmData]);

  // 2. Filter Processed Data based on User Controls
  const filteredData = useMemo(() => {
    return processedData.filter(item => {
      // Search query
      if (searchQuery.trim()) {
        const q = normalizeStr(searchQuery);
        const matchId = normalizeStr(item.id).includes(q);
        const matchSubject = normalizeStr(item.subject).includes(q);
        const matchClient = normalizeStr(item.client).includes(q);
        const matchAgent = normalizeStr(item.assignedTo).includes(q);
        if (!matchId && !matchSubject && !matchClient && !matchAgent) return false;
      }

      // Agent filter
      if (selectedAgentFilter !== 'ALL') {
        if (normalizeStr(item.assignedTo) !== normalizeStr(selectedAgentFilter)) return false;
      }

      // Priority filter
      if (selectedPriorityFilter !== 'ALL') {
        const normPri = normalizeStr(item.priority);
        const normSel = normalizeStr(selectedPriorityFilter);
        if (normSel === 'alta_urgente') {
          if (!normPri.includes('alt') && !normPri.includes('urg') && !normPri.includes('crit') && !normPri.includes('high')) return false;
        } else if (normSel === 'normal') {
          if (!normPri.includes('norm') && !normPri.includes('med')) return false;
        } else if (normSel === 'baja_mant') {
          if (!normPri.includes('baj') && !normPri.includes('mant')) return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (selectedStatusFilter === 'RESOLVED' && !item.resolved) return false;
        if (selectedStatusFilter === 'IN_PROGRESS' && !item.inProgress) return false;
        if (selectedStatusFilter === 'PENDING' && !item.pending) return false;
        if (selectedStatusFilter === 'STAGNANT' && !item.isStagnant) return false;
        if (selectedStatusFilter === 'UNASSIGNED' && !item.isUnassigned) return false;
      }

      // Aging filter
      if (selectedAgingFilter !== 'ALL') {
        if (selectedAgingFilter === 'OPTIMAL' && item.agingBucket !== 'OPTIMAL') return false;
        if (selectedAgingFilter === 'NORMAL' && item.agingBucket !== 'NORMAL') return false;
        if (selectedAgingFilter === 'WARNING' && item.agingBucket !== 'WARNING') return false;
        if (selectedAgingFilter === 'CRITICAL' && item.agingBucket !== 'CRITICAL') return false;
      }

      return true;
    });
  }, [processedData, searchQuery, selectedAgentFilter, selectedPriorityFilter, selectedStatusFilter, selectedAgingFilter]);

  // 3. Global Lifecycle & Effectiveness Aggregations
  const globalMetrics = useMemo(() => {
    const totalCount = filteredData.length;
    const resolvedItems = filteredData.filter(d => d.resolved);
    const activeItems = filteredData.filter(d => !d.resolved);
    const stagnantItems = filteredData.filter(d => d.isStagnant);
    const unassignedItems = filteredData.filter(d => d.isUnassigned && !d.resolved);

    const resolvedCount = resolvedItems.length;
    const activeCount = activeItems.length;

    // Velocity
    const validResDays = resolvedItems
      .map(d => d.resolutionTimeDays)
      .filter((v): v is number => v !== null && v >= 0);

    const avgResolutionDays = validResDays.length > 0 
      ? Math.round((validResDays.reduce((a, b) => a + b, 0) / validResDays.length) * 10) / 10 
      : 0;

    const avgResolutionHours = Math.round(avgResolutionDays * 24 * 10) / 10;

    // Active Age
    const activeAges = activeItems.map(d => d.activeAgeDays);
    const avgActiveAgeDays = activeAges.length > 0
      ? Math.round((activeAges.reduce((a, b) => a + b, 0) / activeAges.length) * 10) / 10
      : 0;

    // SLA Compliance
    const itemsWithSLA = filteredData.filter(d => d.slaStatus !== 'NO_SLA');
    const slaMet = itemsWithSLA.filter(d => d.slaStatus === 'MET').length;
    const slaBreached = itemsWithSLA.filter(d => d.slaStatus === 'BREACHED').length;
    const slaCompliancePct = itemsWithSLA.length > 0 
      ? Math.round((slaMet / itemsWithSLA.length) * 100) 
      : 100;

    // Closure Rate
    const closureRatePct = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

    // Aging Buckets
    const agingCounts = {
      optimal: filteredData.filter(d => d.agingBucket === 'OPTIMAL').length,
      normal: filteredData.filter(d => d.agingBucket === 'NORMAL').length,
      warning: filteredData.filter(d => d.agingBucket === 'WARNING').length,
      critical: filteredData.filter(d => d.agingBucket === 'CRITICAL').length,
    };

    // Effective Cycle Score (0 - 100)
    // Formula: 40% SLA Compliance + 35% Closure Rate + 25% Speed & Health Bonus - Stagnation Penalty
    const speedBonus = avgResolutionDays > 0 ? Math.max(0, 100 - (avgResolutionDays * 4)) : 80;
    const stagnantPenalty = totalCount > 0 ? (stagnantItems.length / totalCount) * 40 : 0;
    let cycleHealthIndex = Math.round(
      (slaCompliancePct * 0.40) + (closureRatePct * 0.35) + (speedBonus * 0.25) - stagnantPenalty
    );
    cycleHealthIndex = Math.max(0, Math.min(100, cycleHealthIndex));

    return {
      totalCount,
      resolvedCount,
      activeCount,
      stagnantCount: stagnantItems.length,
      unassignedCount: unassignedItems.length,
      avgResolutionDays,
      avgResolutionHours,
      avgActiveAgeDays,
      slaCompliancePct,
      slaBreached,
      closureRatePct,
      agingCounts,
      cycleHealthIndex
    };
  }, [filteredData]);

  // 4. Agent Performance, Audit & Fault Diagnostics
  const agentPerformanceList = useMemo(() => {
    const agentMap: Record<string, {
      name: string;
      totalAssigned: number;
      resolvedCount: number;
      inProgressCount: number;
      pendingCount: number;
      stagnantCount: number;
      resolutionDaysList: number[];
      activeAgesDaysList: number[];
      slaMetCount: number;
      slaBreachCount: number;
      slaTotalCount: number;
      highPriorityTotal: number;
      highPriorityBreached: number;
    }> = {};

    // Initialize map with known agents
    if (agents && agents.length > 0) {
      agents.forEach(a => {
        const normName = a.name.trim();
        agentMap[normName] = {
          name: normName,
          totalAssigned: 0,
          resolvedCount: 0,
          inProgressCount: 0,
          pendingCount: 0,
          stagnantCount: 0,
          resolutionDaysList: [],
          activeAgesDaysList: [],
          slaMetCount: 0,
          slaBreachCount: 0,
          slaTotalCount: 0,
          highPriorityTotal: 0,
          highPriorityBreached: 0
        };
      });
    }

    // Process CRM rows
    crmData.forEach(row => {
      const assigned = String(row['Assigned To'] || row['Técnico Asignado'] || row['Asignado'] || 'Sin Asignar').trim();
      if (!assigned || assigned === '-' || assigned.toLowerCase() === 'sin asignar') return;

      let agentKey = Object.keys(agentMap).find(k => normalizeStr(k) === normalizeStr(assigned)) || assigned;

      if (!agentMap[agentKey]) {
        agentMap[agentKey] = {
          name: agentKey,
          totalAssigned: 0,
          resolvedCount: 0,
          inProgressCount: 0,
          pendingCount: 0,
          stagnantCount: 0,
          resolutionDaysList: [],
          activeAgesDaysList: [],
          slaMetCount: 0,
          slaBreachCount: 0,
          slaTotalCount: 0,
          highPriorityTotal: 0,
          highPriorityBreached: 0
        };
      }

      const entry = agentMap[agentKey];
      entry.totalAssigned++;

      const resolved = isTicketResolved(row);
      const inProgress = !resolved && isTicketInProgress(row);
      const pending = !resolved && !inProgress;

      const createdDate = parseDateString(row['Created Date'] || row['Fecha creación']);
      const resolvedDate = parseDateString(row['Resolved Date'] || row['Fecha completado']);
      const slaDate = parseDateString(row.SLA);

      const priority = normalizeStr(String(row.Priority || row.Prioridad || ''));
      const isHighPriority = priority.includes('alt') || priority.includes('urg') || priority.includes('crit') || priority.includes('high');

      if (isHighPriority) {
        entry.highPriorityTotal++;
      }

      if (resolved) {
        entry.resolvedCount++;
        if (createdDate && resolvedDate) {
          const diffMs = resolvedDate.getTime() - createdDate.getTime();
          if (diffMs >= 0) {
            entry.resolutionDaysList.push(diffMs / (1000 * 60 * 60 * 24));
          }
        }
        if (slaDate && resolvedDate) {
          entry.slaTotalCount++;
          if (resolvedDate <= slaDate) {
            entry.slaMetCount++;
          } else {
            entry.slaBreachCount++;
            if (isHighPriority) entry.highPriorityBreached++;
          }
        }
      } else {
        if (inProgress) entry.inProgressCount++;
        if (pending) entry.pendingCount++;

        let activeDays = 0;
        if (createdDate) {
          const diffMs = Date.now() - createdDate.getTime();
          if (diffMs >= 0) {
            activeDays = diffMs / (1000 * 60 * 60 * 24);
            entry.activeAgesDaysList.push(activeDays);
          }
        }

        const isBreachedNow = slaDate && Date.now() > slaDate.getTime();
        if (activeDays > 14 || isBreachedNow) {
          entry.stagnantCount++;
        }

        if (slaDate) {
          entry.slaTotalCount++;
          if (isBreachedNow) {
            entry.slaBreachCount++;
            if (isHighPriority) entry.highPriorityBreached++;
          } else {
            entry.slaMetCount++;
          }
        }
      }
    });

    // Compute detailed metrics and detect specific agent faults
    return Object.values(agentMap)
      .filter(a => a.totalAssigned > 0)
      .map(a => {
        const closureRate = Math.round((a.resolvedCount / a.totalAssigned) * 100);

        const avgResDays = a.resolutionDaysList.length > 0
          ? Math.round((a.resolutionDaysList.reduce((x, y) => x + y, 0) / a.resolutionDaysList.length) * 10) / 10
          : 0;

        const avgActiveAge = a.activeAgesDaysList.length > 0
          ? Math.round((a.activeAgesDaysList.reduce((x, y) => x + y, 0) / a.activeAgesDaysList.length) * 10) / 10
          : 0;

        const slaRate = a.slaTotalCount > 0 
          ? Math.round((a.slaMetCount / a.slaTotalCount) * 100)
          : 100;

        // Mathematical Performance Score (0 - 100)
        const speedBonus = avgResDays > 0 ? Math.max(0, 100 - (avgResDays * 3.5)) : 80;
        const faultPenalty = (a.slaBreachCount * 10) + (a.stagnantCount * 8);

        let performanceScore = Math.round(
          (closureRate * 0.40) + (slaRate * 0.40) + (speedBonus * 0.20) - faultPenalty
        );
        performanceScore = Math.max(0, Math.min(100, performanceScore));

        // Detect Agent Faults
        const detectedFaults: { type: 'CRITICAL' | 'WARNING' | 'INFO'; title: string; desc: string }[] = [];

        if (a.slaBreachCount > 0) {
          detectedFaults.push({
            type: 'CRITICAL',
            title: `Incumplimiento de SLA (${a.slaBreachCount} casos)`,
            desc: `${a.slaBreachCount} requerimientos asignados han superado la fecha límite compromiso.`
          });
        }

        if (a.stagnantCount > 0) {
          detectedFaults.push({
            type: 'WARNING',
            title: `Casos Estancados / Inactivos (${a.stagnantCount})`,
            desc: `Posee ${a.stagnantCount} casos con más de 14 días abiertos o fuera de tiempo.`
          });
        }

        if (avgResDays > 10) {
          detectedFaults.push({
            type: 'WARNING',
            title: `Lentitud en Resolución (${avgResDays}d prom)`,
            desc: `El tiempo promedio de solución excede la meta sugerida de 7 días.`
          });
        }

        if (a.totalAssigned > 10 && closureRate < 35) {
          detectedFaults.push({
            type: 'WARNING',
            title: `Sobrecarga / Baja Conversión`,
            desc: `Suma ${a.totalAssigned} casos asignados pero solo ha completado el ${closureRate}%.`
          });
        }

        if (a.highPriorityBreached > 0) {
          detectedFaults.push({
            type: 'CRITICAL',
            title: `Falta en Atención Alta Prioridad (${a.highPriorityBreached})`,
            desc: `Falló en resolver a tiempo requerimientos marcados como Alta / Crítica.`
          });
        }

        // Assign Evaluation Level
        let evaluationLevel: 'EXCELLENT' | 'HEALTHY' | 'ATTENTION' | 'CRITICAL' = 'HEALTHY';
        if (performanceScore >= 85 && a.stagnantCount === 0 && a.slaBreachCount === 0) {
          evaluationLevel = 'EXCELLENT';
        } else if (performanceScore >= 70 && a.stagnantCount <= 1 && a.slaBreachCount <= 1) {
          evaluationLevel = 'HEALTHY';
        } else if (performanceScore >= 50 || a.stagnantCount <= 3) {
          evaluationLevel = 'ATTENTION';
        } else {
          evaluationLevel = 'CRITICAL';
        }

        return {
          ...a,
          closureRate,
          avgResDays,
          avgActiveAge,
          slaRate,
          performanceScore,
          detectedFaults,
          evaluationLevel
        };
      })
      .sort((a, b) => b.performanceScore - a.performanceScore);
  }, [crmData, agents]);

  // 5. Global Operational Faults & Anomaly Detector Alerts
  const globalAnomalies = useMemo(() => {
    const list: { id: string; title: string; desc: string; severity: 'HIGH' | 'MEDIUM' | 'LOW'; action: string }[] = [];

    // Check SLA breaches
    if (globalMetrics.slaBreached > 0) {
      list.push({
        id: 'anom_sla',
        title: `${globalMetrics.slaBreached} Requerimientos con SLA Vencido`,
        desc: `Existen ${globalMetrics.slaBreached} casos que sobrepasaron la fecha de cumplimiento SLA sin ser resueltos a tiempo.`,
        severity: 'HIGH',
        action: 'Revisar casos estancados'
      });
    }

    // Check Stagnant Cases
    if (globalMetrics.stagnantCount > 0) {
      list.push({
        id: 'anom_stagnant',
        title: `${globalMetrics.stagnantCount} Casos en Cuello de Botella (>14 Días)`,
        desc: `Requerimientos con inactividad alta que representan riesgo directo en la satisfacción del cliente.`,
        severity: 'HIGH',
        action: 'Reasignar o escalar'
      });
    }

    // Check Unassigned Cases
    if (globalMetrics.unassignedCount > 0) {
      list.push({
        id: 'anom_unassigned',
        title: `${globalMetrics.unassignedCount} Requerimientos Sin Técnico Asignado`,
        desc: `Casos abiertos que no han sido adjudicados a ningún miembro del roster.`,
        severity: 'MEDIUM',
        action: 'Asignar técnico'
      });
    }

    // Check Agents with Critical Status
    const criticalAgents = agentPerformanceList.filter(a => a.evaluationLevel === 'CRITICAL' || a.evaluationLevel === 'ATTENTION');
    if (criticalAgents.length > 0) {
      list.push({
        id: 'anom_agents',
        title: `${criticalAgents.length} Técnicos con Faltas / Bajo Rendimiento`,
        desc: `Integrantes del roster presentan retrasos reiterados o acumulación excesiva de tickets activos.`,
        severity: 'MEDIUM',
        action: 'Auditar técnicos'
      });
    }

    return list;
  }, [globalMetrics, agentPerformanceList]);

  // 6. Velocity Breakdown by Priority
  const priorityVelocity = useMemo(() => {
    const map: Record<string, { name: string; resolvedCount: number; totalDays: number; count: number }> = {
      'Alta / Urgente': { name: 'Alta / Urgente', resolvedCount: 0, totalDays: 0, count: 0 },
      'Normal / Media': { name: 'Normal / Media', resolvedCount: 0, totalDays: 0, count: 0 },
      'Baja / Mantenimiento': { name: 'Baja / Mantenimiento', resolvedCount: 0, totalDays: 0, count: 0 },
    };

    crmData.forEach(row => {
      const pNorm = normalizeStr(String(row.Priority || row.Prioridad || ''));
      let cat = 'Normal / Media';
      if (pNorm.includes('alt') || pNorm.includes('urg') || pNorm.includes('crit') || pNorm.includes('high')) {
        cat = 'Alta / Urgente';
      } else if (pNorm.includes('baj') || pNorm.includes('mant')) {
        cat = 'Baja / Mantenimiento';
      }

      map[cat].count++;

      const resolved = isTicketResolved(row);
      if (resolved) {
        map[cat].resolvedCount++;
        const createdDate = parseDateString(row['Created Date'] || row['Fecha creación']);
        const resolvedDate = parseDateString(row['Resolved Date'] || row['Fecha completado']);
        if (createdDate && resolvedDate) {
          const diffMs = resolvedDate.getTime() - createdDate.getTime();
          if (diffMs >= 0) {
            map[cat].totalDays += diffMs / (1000 * 60 * 60 * 24);
          }
        }
      }
    });

    return Object.values(map).map(item => ({
      ...item,
      avgDays: item.resolvedCount > 0 ? Math.round((item.totalDays / item.resolvedCount) * 10) / 10 : 0
    }));
  }, [crmData]);

  // 7. Top Stagnant / Bottleneck Cases List
  const stagnantCases = useMemo(() => {
    return filteredData
      .filter(d => d.isStagnant || (!d.resolved && d.activeAgeDays > 7))
      .sort((a, b) => b.activeAgeDays - a.activeAgeDays)
      .slice(0, 10);
  }, [filteredData]);

  // Inspecting agent's tickets for audit drawer
  const inspectAgentTickets = useMemo(() => {
    if (!inspectAgentName) return [];
    const norm = normalizeStr(inspectAgentName);
    return processedData.filter(d => normalizeStr(d.assignedTo) === norm);
  }, [inspectAgentName, processedData]);

  const inspectAgentStats = useMemo(() => {
    if (!inspectAgentName) return null;
    return agentPerformanceList.find(a => normalizeStr(a.name) === normalizeStr(inspectAgentName)) || null;
  }, [inspectAgentName, agentPerformanceList]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12" id="status-cycle-module">
      
      {/* --- Executive Header Banner --- */}
      <div className="keep-dark-bg text-white-keep bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl text-white relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start md:items-center gap-5 z-10">
          <div className="p-4 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-inner shrink-0">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h3 className="font-display font-black text-xl tracking-tight text-white">Ciclo de Vida y Auditoría de Faltas del Roster</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                KPIs Operativos
              </span>
            </div>
            <p className="text-xs text-slate-200 mt-1.5 max-w-2xl leading-relaxed">
              Diagnóstico integral de la velocidad del flujo, detección de cuellos de botella, cumplimiento de SLA y evaluación objetiva de faltas o demoras en la atención por técnico.
            </p>
          </div>
        </div>

        {/* Global Cycle Health Score Widget */}
        <div className="flex items-center gap-4 keep-dark-bg bg-slate-900/90 backdrop-blur-md border border-slate-700/80 p-4 rounded-2xl z-10 shrink-0 shadow-md">
          <div className="text-right">
            <p className="text-[10px] font-mono font-bold uppercase text-slate-300">Índice de Efectividad Global</p>
            <div className="flex items-center justify-end gap-1.5 mt-0.5">
              <p className={`text-xl font-black font-mono ${
                globalMetrics.cycleHealthIndex >= 80 ? 'text-emerald-400' :
                globalMetrics.cycleHealthIndex >= 60 ? 'text-indigo-300' : 'text-rose-400'
              }`}>
                {globalMetrics.cycleHealthIndex}/100
              </p>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">{globalMetrics.slaCompliancePct}% Cumplimiento SLA</p>
          </div>
          <div className={`p-3 rounded-xl border ${
            globalMetrics.cycleHealthIndex >= 80 ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' :
            globalMetrics.cycleHealthIndex >= 60 ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' :
            'bg-rose-500/20 border-rose-500/30 text-rose-400'
          }`}>
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* --- Filter & Controls Bar --- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, Cliente, Asunto o Técnico..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Agent Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedAgentFilter}
              onChange={(e) => setSelectedAgentFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs font-bold text-slate-800 cursor-pointer"
            >
              <option value="ALL">Todos los Técnicos ({agentPerformanceList.length})</option>
              {agentPerformanceList.map(a => (
                <option key={a.name} value={a.name}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedPriorityFilter}
              onChange={(e) => setSelectedPriorityFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs font-bold text-slate-800 cursor-pointer"
            >
              <option value="ALL">Todas las Prioridades</option>
              <option value="alta_urgente">Alta / Urgente / Crítica</option>
              <option value="normal">Normal / Media</option>
              <option value="baja_mant">Baja / Mantenimiento</option>
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs font-bold text-slate-800 cursor-pointer"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="IN_PROGRESS">En Progreso / Trabajando</option>
              <option value="PENDING">Pendientes de Iniciar</option>
              <option value="RESOLVED">Completados / Resueltos</option>
              <option value="STAGNANT">⚠️ Casos Estancados (&gt;14d)</option>
              <option value="UNASSIGNED">👤 Sin Técnico Asignado</option>
            </select>
          </div>

          {/* Aging Bucket Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedAgingFilter}
              onChange={(e) => setSelectedAgingFilter(e.target.value)}
              className="bg-transparent border-none focus:outline-none text-xs font-bold text-slate-800 cursor-pointer"
            >
              <option value="ALL">Todas las Antigüedades</option>
              <option value="OPTIMAL">0-3 Días (Saludable)</option>
              <option value="NORMAL">4-7 Días (Normal)</option>
              <option value="WARNING">8-14 Días (Demora)</option>
              <option value="CRITICAL">&gt;14 Días (Crítico)</option>
            </select>
          </div>

          {/* Time Unit Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
            <button
              onClick={() => setTimeUnit('days')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeUnit === 'days' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Días
            </button>
            <button
              onClick={() => setTimeUnit('hours')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeUnit === 'hours' ? 'bg-white text-indigo-700 shadow-sm font-black' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Horas
            </button>
          </div>
        </div>
      </div>

      {/* --- Executive KPI Cards Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Lead Time / Resolution Speed */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Velocidad Promedio (Lead Time)</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Zap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-800 font-display">
              {timeUnit === 'days' ? `${globalMetrics.avgResolutionDays} días` : `${globalMetrics.avgResolutionHours} hrs`}
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 inline shrink-0" />
              Tiempo medio desde ingreso hasta solución
            </p>
          </div>
        </div>

        {/* Card 2: SLA Compliance & Breaches */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Cumplimiento SLA</span>
            <div className={`p-2.5 rounded-xl border ${globalMetrics.slaBreached > 0 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline justify-between">
              <h4 className="text-2xl font-black text-slate-800 font-display">
                {globalMetrics.slaCompliancePct}%
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${globalMetrics.slaBreached > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                {globalMetrics.slaBreached} Vencidos
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Garantía de respuesta en la fecha pautada
            </p>
          </div>
        </div>

        {/* Card 3: Active Aging & Bottlenecks */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Antigüedad Casos En Curso</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-800 font-display">
              {globalMetrics.avgActiveAgeDays} días
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              Promedio de estancia de {globalMetrics.activeCount} casos activos
            </p>
          </div>
        </div>

        {/* Card 4: Stagnant & Unassigned Faults */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Casos Críticos / Estancados</span>
            <div className={`p-2.5 rounded-xl border ${globalMetrics.stagnantCount > 0 ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <h4 className="text-2xl font-black text-slate-800 font-display">
              {globalMetrics.stagnantCount} <span className="text-xs text-slate-400 font-normal">casos</span>
            </h4>
            <p className="text-[11px] text-slate-500 mt-1 font-medium">
              {globalMetrics.unassignedCount > 0 ? `${globalMetrics.unassignedCount} sin asignar · ` : ''}Más de 14 días en el ciclo
            </p>
          </div>
        </div>
      </div>

      {/* --- Section Sub-Navigation Tabs --- */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTabSubView('matrix')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTabSubView === 'matrix' 
              ? 'bg-indigo-600 text-white shadow-sm font-black' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          Matriz de Evaluación de Técnicos ({agentPerformanceList.length})
        </button>

        <button
          onClick={() => setActiveTabSubView('anomalies')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTabSubView === 'anomalies' 
              ? 'bg-indigo-600 text-white shadow-sm font-black' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          Detector de Anomalías y Faltas ({globalAnomalies.length})
        </button>

        <button
          onClick={() => setActiveTabSubView('funnel')}
          className={`px-4 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
            activeTabSubView === 'funnel' 
              ? 'bg-indigo-600 text-white shadow-sm font-black' 
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Distribución por Antigüedad
        </button>
      </div>

      {/* --- SUBVIEW 1: Roster Performance & Fault Evaluation Matrix --- */}
      {activeTabSubView === 'matrix' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm font-display">Matriz Diagnóstica de Productividad y Faltas del Roster</h4>
                <p className="text-xs text-slate-500 mt-0.5">Evaluación objetiva de tasa de cierre, velocidad, vencimientos de SLA y detección de retrasos injustificados.</p>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full font-extrabold uppercase tracking-wide border border-indigo-100 self-start sm:self-center">
              {agentPerformanceList.length} Técnicos Auditados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="roster-productivity-table">
              <thead>
                <tr className="bg-slate-50 text-slate-400 font-mono text-[10px] font-bold uppercase border-b border-slate-200">
                  <th className="px-5 py-3.5">Técnico del Roster</th>
                  <th className="px-4 py-3.5 text-center">Asignados</th>
                  <th className="px-4 py-3.5 text-center">Completados</th>
                  <th className="px-4 py-3.5 text-center">Tasa Cierre</th>
                  <th className="px-4 py-3.5 text-center">Velocidad Prom.</th>
                  <th className="px-4 py-3.5 text-center">Cumplimiento SLA</th>
                  <th className="px-4 py-3.5 text-center">Casos Vencidos / Estancados</th>
                  <th className="px-4 py-3.5 text-center">Diagnóstico / Faltas</th>
                  <th className="px-5 py-3.5 text-right">Auditar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {agentPerformanceList.map((agent, idx) => {
                  // Evaluation Level Badging
                  const evalBadge = 
                    agent.evaluationLevel === 'EXCELLENT' ? { label: '🌟 Sobresaliente', class: 'bg-emerald-50 text-emerald-800 border-emerald-200 font-black' } :
                    agent.evaluationLevel === 'HEALTHY' ? { label: '✅ Saludable', class: 'bg-blue-50 text-blue-800 border-blue-200 font-bold' } :
                    agent.evaluationLevel === 'ATTENTION' ? { label: '⚠️ Atención Req.', class: 'bg-amber-50 text-amber-800 border-amber-200 font-bold' } :
                    { label: '🚨 Crítico', class: 'bg-rose-100 text-rose-900 border-rose-300 font-black' };

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      {/* Agent Name & Score */}
                      <td className="px-5 py-4 font-bold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 flex items-center justify-center font-mono text-xs font-black text-indigo-700 shrink-0 shadow-xs">
                            {agent.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-xs">{agent.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">Puntaje Operativo: <span className="font-bold text-slate-700">{agent.performanceScore}/100</span></p>
                          </div>
                        </div>
                      </td>

                      {/* Total Assigned */}
                      <td className="px-4 py-4 text-center font-mono font-bold text-slate-800">
                        {agent.totalAssigned}
                      </td>

                      {/* Completed */}
                      <td className="px-4 py-4 text-center font-mono font-bold text-emerald-600">
                        {agent.resolvedCount}
                      </td>

                      {/* Closure Rate */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-mono font-extrabold text-slate-800">{agent.closureRate}%</span>
                          <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                              className={`h-full rounded-full ${agent.closureRate >= 80 ? 'bg-emerald-500' : agent.closureRate >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                              style={{ width: `${agent.closureRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Avg Resolution Speed */}
                      <td className="px-4 py-4 text-center font-mono text-slate-700 font-semibold">
                        {timeUnit === 'days' ? `${agent.avgResDays}d` : `${Math.round(agent.avgResDays * 24)}h`}
                      </td>

                      {/* SLA Rate */}
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold ${
                          agent.slaRate >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {agent.slaRate}%
                        </span>
                      </td>

                      {/* SLA Breaches & Stagnant Count */}
                      <td className="px-4 py-4 text-center font-mono">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${agent.slaBreachCount > 0 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-100 text-slate-600'}`}>
                            {agent.slaBreachCount} Venc.
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${agent.stagnantCount > 0 ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-600'}`}>
                            {agent.stagnantCount} Estan.
                          </span>
                        </div>
                      </td>

                      {/* Detected Faults & Diagnostic Badging */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] border tracking-tight ${evalBadge.class}`}>
                            {evalBadge.label}
                          </span>
                          {agent.detectedFaults.length > 0 ? (
                            <span className="text-[10px] text-rose-600 font-medium">
                              {agent.detectedFaults.length} alerta(s) de falta
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-600 font-medium">Sin faltas</span>
                          )}
                        </div>
                      </td>

                      {/* Audit Button */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setInspectAgentName(agent.name)}
                          className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-[11px] transition-colors border border-indigo-100 inline-flex items-center gap-1 cursor-pointer"
                        >
                          Auditar <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {agentPerformanceList.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-8 text-center text-xs text-slate-400">
                      No se encontraron técnicos registrados en el roster con requerimientos activos o cerrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- SUBVIEW 2: Operational Anomaly Detector & Fault Alerts --- */}
      {activeTabSubView === 'anomalies' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-800 text-sm font-display flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-rose-600" />
                  Monitor Automático de Anomalías y Faltas Operativas
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Algoritmo continuo que identifica desviaciones de SLA, retrasos por inactividad y sobrecarga en técnicos.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-rose-50 text-rose-700 border border-rose-100">
                {globalAnomalies.length} Diagnósticos
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {globalAnomalies.map((anom) => (
                <div 
                  key={anom.id}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 shadow-xs ${
                    anom.severity === 'HIGH' ? 'bg-rose-50/70 border-rose-200 text-rose-900' : 'bg-amber-50/70 border-amber-200 text-amber-900'
                  }`}
                >
                  <AlertOctagon className={`w-5 h-5 shrink-0 mt-0.5 ${anom.severity === 'HIGH' ? 'text-rose-600' : 'text-amber-600'}`} />
                  <div className="flex-1 space-y-1">
                    <h5 className="font-bold text-xs">{anom.title}</h5>
                    <p className="text-[11px] opacity-90 leading-relaxed">{anom.desc}</p>
                    <div className="pt-2 flex justify-end">
                      <span className="text-[10px] font-bold underline cursor-pointer hover:opacity-80">
                        {anom.action} &rarr;
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {globalAnomalies.length === 0 && (
                <div className="col-span-2 py-12 text-center bg-emerald-50/50 border border-emerald-200/60 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-emerald-900">¡Salud del Ciclo Óptima!</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">No se detectaron faltas graves, incumplimientos de SLA ni cuellos de botella estancados.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- SUBVIEW 3: Lifecycle Aging Buckets & Funnel --- */}
      {activeTabSubView === 'funnel' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
          <div>
            <h4 className="font-bold text-slate-800 text-sm font-display flex items-center gap-2">
              <PieChart className="w-5 h-5 text-indigo-600" />
              Distribución por Rangos de Antigüedad (Aging Buckets)
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Desglose de los casos activos según su permanencia total en el sistema.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Bucket 1 */}
            <div className="bg-emerald-50/60 border border-emerald-200 p-4 rounded-xl">
              <span className="text-[10px] font-mono font-bold uppercase text-emerald-700">0 - 3 Días (Saludable)</span>
              <p className="text-2xl font-black text-emerald-900 mt-1 font-mono">{globalMetrics.agingCounts.optimal}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Requerimientos en tiempo normal</p>
            </div>

            {/* Bucket 2 */}
            <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-xl">
              <span className="text-[10px] font-mono font-bold uppercase text-blue-700">4 - 7 Días (Atención)</span>
              <p className="text-2xl font-black text-blue-900 mt-1 font-mono">{globalMetrics.agingCounts.normal}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">Dentro del margen operativo</p>
            </div>

            {/* Bucket 3 */}
            <div className="bg-amber-50/60 border border-amber-200 p-4 rounded-xl">
              <span className="text-[10px] font-mono font-bold uppercase text-amber-700">8 - 14 Días (Demora)</span>
              <p className="text-2xl font-black text-amber-900 mt-1 font-mono">{globalMetrics.agingCounts.warning}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Riesgo potencial de SLA</p>
            </div>

            {/* Bucket 4 */}
            <div className="bg-rose-50/60 border border-rose-200 p-4 rounded-xl">
              <span className="text-[10px] font-mono font-bold uppercase text-rose-700">&gt;14 Días (Estancado / Crítico)</span>
              <p className="text-2xl font-black text-rose-900 mt-1 font-mono">{globalMetrics.agingCounts.critical}</p>
              <p className="text-[11px] text-rose-700 mt-0.5">Requieren acción inmediata</p>
            </div>
          </div>
        </div>
      )}

      {/* --- Charts Grid: Priority Velocity & Cycle Health Summary --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card: Resolution Speed by Priority */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-slate-800 text-sm font-display">Velocidad de Cierre por Nivel de Prioridad</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Tiempo promedio de resolución según el nivel de urgencia asignado</p>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                Análisis Tiempos
              </span>
            </div>

            <div className="space-y-4">
              {priorityVelocity.map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{item.name}</span>
                    <span className="font-mono text-slate-600 font-bold">
                      {item.avgDays} días res. ({item.resolvedCount} cerrados)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        item.name.includes('Alta') ? 'bg-rose-500' :
                        item.name.includes('Normal') ? 'bg-indigo-500' : 'bg-slate-400'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(15, (item.avgDays / 15) * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>Fuente: Histórico CRM Integrado</span>
            <span>Estándar Kaizen</span>
          </div>
        </div>

        {/* Card: Cycle Health Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800 text-sm font-display">Distribución del Flujo de Requerimientos</h4>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-bold">
                Total: {globalMetrics.totalCount}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 my-4">
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                <p className="text-[10px] font-mono font-bold uppercase text-slate-400">Completados</p>
                <p className="text-xl font-black text-emerald-600 mt-1 font-mono">{globalMetrics.resolvedCount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{globalMetrics.closureRatePct}% conversión global</p>
              </div>

              <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl">
                <p className="text-[10px] font-mono font-bold uppercase text-slate-400">En Curso / Activos</p>
                <p className="text-xl font-black text-indigo-600 mt-1 font-mono">{globalMetrics.activeCount}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">En gestión operativa</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Recomendación de Gestión:</span> Priorizar la atención de los <span className="font-bold underline">{globalMetrics.stagnantCount} casos estancados</span> con más de 14 días para liberar carga técnica acumulada.
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>Cálculo Automático</span>
            <span>Tier Master 2.0</span>
          </div>
        </div>

      </div>

      {/* --- Top Stagnant Cases Table --- */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-rose-600" />
            <h4 className="font-bold text-slate-800 text-sm font-display">Monitor de Casos Críticos con Mayor Envejecimiento (&gt;7 Días)</h4>
          </div>
          <span className="text-[10px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide border border-rose-100">
            Cuellos de Botella ({stagnantCases.length})
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-mono text-[10px] font-bold uppercase border-b border-slate-200">
                <th className="px-5 py-3">ID Ticket</th>
                <th className="px-5 py-3">Cliente / Requerimiento</th>
                <th className="px-5 py-3">Técnico Asignado</th>
                <th className="px-5 py-3">Prioridad</th>
                <th className="px-5 py-3">Estado Ciclo</th>
                <th className="px-5 py-3 text-right">Antigüedad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {stagnantCases.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-mono font-bold text-slate-900">#{item.id}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-800 truncate max-w-xs">{item.subject}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{item.client}</p>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-700">{item.assignedTo}</td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                      item.priority.toLowerCase().includes('crit') || item.priority.toLowerCase().includes('alt') ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-medium text-slate-600 truncate max-w-[140px]">
                    {item.statusRaw}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                      item.activeAgeDays > 14 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {item.activeAgeDays} días
                    </span>
                  </td>
                </tr>
              ))}

              {stagnantCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-xs text-slate-400">
                    ¡Excelente! No hay casos estancados ni cuellos de botella con más de 7 días.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- Agent Cases Inspection & Audit Drawer --- */}
      <AnimatePresence>
        {inspectAgentName && inspectAgentStats && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end animate-fadeIn">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col justify-between"
            >
              {/* Drawer Header */}
              <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-mono font-black text-sm">
                    {inspectAgentName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-base text-white">{inspectAgentName}</h3>
                      <span className="text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full">
                        Score: {inspectAgentStats.performanceScore}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">Auditoría Operativa de Ciclo de Vida y Evaluación de Faltas</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectAgentName(null)}
                  className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
                
                {/* Agent Performance Summary Cards */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400">Total Asignados</span>
                    <p className="text-lg font-black text-slate-800 mt-0.5 font-mono">{inspectAgentStats.totalAssigned}</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400">Tasa Cierre</span>
                    <p className="text-lg font-black text-emerald-600 mt-0.5 font-mono">{inspectAgentStats.closureRate}%</p>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-xl text-center">
                    <span className="text-[9px] font-mono font-bold uppercase text-slate-400">Cumplimiento SLA</span>
                    <p className="text-lg font-black text-indigo-600 mt-0.5 font-mono">{inspectAgentStats.slaRate}%</p>
                  </div>
                </div>

                {/* Agent Faults Diagnostic Section */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs font-display flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Diagnóstico de Faltas y Anomalias Operativas
                  </h4>

                  {inspectAgentStats.detectedFaults.length > 0 ? (
                    <div className="space-y-2">
                      {inspectAgentStats.detectedFaults.map((f, i) => (
                        <div 
                          key={i} 
                          className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                            f.type === 'CRITICAL' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'
                          }`}
                        >
                          <AlertOctagon className="w-4 h-4 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold">{f.title}</p>
                            <p className="text-[11px] opacity-90 mt-0.5">{f.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Excelente cumplimiento. No se han registrado faltas en los requerimientos asignados.</span>
                    </div>
                  )}
                </div>

                {/* Individual Ticket List */}
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-800 text-xs font-display">
                    Requerimientos Asignados ({inspectAgentTickets.length})
                  </h4>

                  {inspectAgentTickets.map((t, idx) => (
                    <div key={idx} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-slate-900">#{t.id}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                          t.resolved ? 'bg-emerald-100 text-emerald-800' :
                          t.inProgress ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {t.resolved ? 'Completado' : t.inProgress ? 'En Progreso' : 'Pendiente'}
                        </span>
                      </div>

                      <p className="font-bold text-slate-800 text-xs">{t.subject}</p>
                      <p className="text-[11px] text-slate-500">Cliente: <span className="font-semibold text-slate-700">{t.client}</span></p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-500">
                        <span>Prioridad: {t.priority}</span>
                        <span>
                          {t.resolved 
                            ? `Duración: ${t.resolutionTimeDays !== null ? t.resolutionTimeDays + ' días' : 'N/A'}` 
                            : `Antigüedad: ${t.activeAgeDays} días`}
                        </span>
                      </div>
                    </div>
                  ))}

                  {inspectAgentTickets.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">No hay casos registrados para este técnico.</p>
                  )}
                </div>
              </div>

              {/* Drawer Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex justify-end shrink-0">
                <button
                  onClick={() => setInspectAgentName(null)}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cerrar Auditoría
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
