import React, { useMemo } from 'react';
import { Clock, Target, AlertTriangle, TrendingUp, Calendar, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface StatusCycleTabProps {
  crmData: any[];
}

export function StatusCycleTab({ crmData }: StatusCycleTabProps) {
  // 1. Process data for Status Distribution
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    crmData.forEach(row => {
      const status = row.Status || 'Sin Status';
      counts[status] = (counts[status] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: crmData.length > 0 ? (count / crmData.length) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [crmData]);

  // 2. Process data for Priority Distribution
  const priorityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    crmData.forEach(row => {
      const priority = row.Priority || 'Normal';
      counts[priority] = (counts[priority] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({
        name,
        count,
        percentage: crmData.length > 0 ? (count / crmData.length) * 100 : 0
      }))
      .sort((a, b) => {
        const order: Record<string, number> = { 'Crítica': 4, 'Critica': 4, 'Alta': 3, 'Media': 2, 'Normal': 1, 'Baja': 0 };
        return (order[b.name] || 0) - (order[a.name] || 0);
      });
  }, [crmData]);

  // 3. Process SLA & Aging Metrics
  const metrics = useMemo(() => {
    let totalOpenDays = 0;
    let openCount = 0;
    let criticalCount = 0;
    const agingList: any[] = [];

    crmData.forEach(row => {
      const statusLower = (row.Status || '').toLowerCase();
      // Considered open if it does not contain 'completado', 'resuelto', 'cerrado'
      const isClosed = statusLower.includes('completado') || statusLower.includes('resuelto') || statusLower.includes('cerrado') || statusLower.includes('finalizado');
      
      if (!isClosed) {
        openCount++;
        const createdStr = row["Created Date"];
        let ageInDays = 0;
        
        if (createdStr) {
          const parts = createdStr.split(' ');
          const dateParts = parts[0].split('/');
          if (dateParts.length === 3) {
            const createdDate = new Date(Number(dateParts[2]), Number(dateParts[1]) - 1, Number(dateParts[0]));
            ageInDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
            ageInDays = isNaN(ageInDays) || ageInDays < 0 ? 0 : Math.floor(ageInDays);
          }
        }
        
        if (ageInDays > 15) {
          criticalCount++;
        }
        
        totalOpenDays += ageInDays;
        agingList.push({
          id: row.ID || 'N/A',
          subject: row.Subject || 'Sin Asunto',
          assignedTo: row["Assigned To"] || 'No Asignado',
          status: row.Status || 'Abierto',
          priority: row.Priority || 'Normal',
          createdDate: createdStr || 'No Registrada',
          ageInDays
        });
      }
    });

    const averageAge = openCount > 0 ? Math.round(totalOpenDays / openCount) : 0;
    const sortedAging = agingList.sort((a, b) => b.ageInDays - a.ageInDays).slice(0, 5);
    
    // SLA compliance rate: percentage of open cases that are NOT critical (>15 days)
    const slaCompliance = crmData.length > 0 
      ? Math.round(((crmData.length - criticalCount) / crmData.length) * 100) 
      : 100;

    return {
      averageAge,
      openCount,
      criticalCount,
      slaCompliance,
      oldestCases: sortedAging
    };
  }, [crmData]);

  return (
    <div className="space-y-6 animate-fadeIn" id="status-cycle-module">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 to-slate-900 border border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl text-white">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30 shadow-inner">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-display font-black text-lg tracking-tight">Trazabilidad de Status y Ciclos de Vida</h3>
            <p className="text-xs text-slate-350 mt-1 max-w-xl">
              Análisis matemático en tiempo real del flujo de requerimientos, cumplimiento de SLA y tiempo promedio de envejecimiento de casos técnicos activos.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-2xl">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-300">
            Fórmulas de SLA Sincronizadas
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Avg open age */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Edad Promedio Abierto</p>
            <h4 className="text-2xl font-black text-slate-800 font-display mt-1">{metrics.averageAge} días</h4>
            <p className="text-[10px] text-slate-500 mt-1">Tiempo medio de resolución abierta</p>
          </div>
        </div>

        {/* Card 2: SLA Compliance */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Cumplimiento de SLA</p>
            <h4 className="text-2xl font-black text-slate-800 font-display mt-1">{metrics.slaCompliance}%</h4>
            <p className="text-[10px] text-slate-500 mt-1">Porcentaje de casos dentro de límite</p>
          </div>
        </div>

        {/* Card 3: Critical cases */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
          <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Casos Críticos (&gt;15 días)</p>
            <h4 className="text-2xl font-black text-slate-800 font-display mt-1">{metrics.criticalCount} / {metrics.openCount}</h4>
            <p className="text-[10px] text-slate-500 mt-1">Casos con SLA de resolución excedido</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-slate-800 text-sm">Distribución de Requerimientos por Status</h4>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-bold">
                {statusCounts.length} Statuses
              </span>
            </div>
            
            <div className="space-y-4">
              {statusCounts.slice(0, 6).map((item, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate max-w-xs">{item.name}</span>
                    <span className="font-mono text-slate-500 font-bold">{item.count} ({Math.round(item.percentage)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-1000"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
              {statusCounts.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">No hay datos de status disponibles</p>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>Sincronizado</span>
            <span>Total: {crmData.length} registros</span>
          </div>
        </div>

        {/* Chart Priority */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-slate-800 text-sm">Severidad e Impacto por Prioridad</h4>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                Categorías Activas
              </span>
            </div>
            
            <div className="space-y-4">
              {priorityCounts.map((item, idx) => {
                const priorityColor = 
                  item.name.toLowerCase().includes('crit') ? 'bg-rose-500' :
                  item.name.toLowerCase().includes('alt') ? 'bg-amber-500' :
                  item.name.toLowerCase().includes('med') || item.name.toLowerCase().includes('norm') ? 'bg-indigo-500' :
                  'bg-slate-400';

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 truncate max-w-xs">{item.name}</span>
                      <span className="font-mono text-slate-500 font-bold">{item.count} ({Math.round(item.percentage)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/50">
                      <div 
                        className={`${priorityColor} h-full rounded-full transition-all duration-1000`}
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {priorityCounts.length === 0 && (
                <p className="text-xs text-slate-400 text-center py-8">No hay datos de prioridad disponibles</p>
              )}
            </div>
          </div>
          <div className="pt-4 border-t border-slate-100 mt-6 flex justify-between items-center text-[10px] text-slate-400 font-mono">
            <span>Métrica de Ponderación</span>
            <span>Cumplimiento Kaizen</span>
          </div>
        </div>
      </div>

      {/* Oldest Pending Cases Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-150 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h4 className="font-bold text-slate-800 text-sm">Casos con Mayor Envejecimiento (Top 5 en Espera)</h4>
          </div>
          <span className="text-[10px] bg-rose-50 text-rose-700 px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wide border border-rose-100">
            SLA Alerta Roja
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="status-cycle-aging-table">
            <thead>
              <tr className="bg-slate-50 text-slate-400 font-mono text-[10px] font-bold uppercase border-b border-slate-200">
                <th className="px-5 py-3">ID Ticket</th>
                <th className="px-5 py-3">Asunto / Requerimiento</th>
                <th className="px-5 py-3">Asignado A</th>
                <th className="px-5 py-3">Prioridad</th>
                <th className="px-5 py-3 text-right">Tiempo Abierto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {metrics.oldestCases.map((item, idx) => {
                const ageBadgeColor = 
                  item.ageInDays > 15 ? 'bg-rose-50 text-rose-700 border-rose-100' :
                  item.ageInDays > 7 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                  'bg-indigo-50 text-indigo-700 border-indigo-100';

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors text-xs">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">#{item.id}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 truncate max-w-xs">{item.subject}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-medium">{item.assignedTo}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md ${
                        item.priority.toLowerCase().includes('crit') ? 'bg-red-100 text-red-800 border border-red-200' :
                        item.priority.toLowerCase().includes('alt') ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item.priority}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${ageBadgeColor}`}>
                        {item.ageInDays} días open
                      </span>
                    </td>
                  </tr>
                );
              })}
              {metrics.oldestCases.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-slate-400">
                    No hay casos abiertos actualmente. ¡SLA al 100%!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
