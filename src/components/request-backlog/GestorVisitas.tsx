import React, { useState, useEffect } from 'react';
import { getProgrammedVisits, deleteProgrammedVisit, syncProgrammedVisits, db } from '../../db/firebaseService';
import { doc, setDoc } from 'firebase/firestore';
import { 
  Calendar, 
  CheckCircle2, 
  ChevronRight, 
  Activity, 
  MapPin, 
  Copy, 
  Inbox, 
  User, 
  CheckSquare, 
  ChevronsRight,
  RefreshCw
} from 'lucide-react';
import { CRMData } from '../../types';

interface GestorVisitasProps {
  crmData: CRMData;
  setCrmData: React.Dispatch<React.SetStateAction<CRMData>>;
  handlePush: (updatedRows: Record<string, string>[]) => void;
  searchTerm: string;
  setSchedulingVisitRow: (row: Record<string, string> | null) => void;
  setClosingVisitRow: (row: Record<string, string> | null) => void;
  handleStartVisit: (rowToStart: Record<string, string>) => void;
}

export default function GestorVisitas({
  crmData,
  setCrmData,
  handlePush,
  searchTerm,
  setSchedulingVisitRow,
  setClosingVisitRow,
  handleStartVisit
}: GestorVisitasProps) {
  // Key extraction
  const statusKey = crmData.headers.find(h => h.toLowerCase() === 'estado' || h.toLowerCase() === 'status') || 'Status';
  const assignedKey = crmData.headers.find(h => h.toLowerCase() === 'assigned to' || h.toLowerCase() === 'tecnico' || h.toLowerCase() === 'asignado a') || 'Assigned To';
  const clientKey = crmData.headers.find(h => h.toLowerCase() === 'account' || h.toLowerCase() === 'cliente' || h.toLowerCase() === 'cuenta') || 'Account';
  const contactKey = crmData.headers.find(h => h.toLowerCase() === 'contact' || h.toLowerCase() === 'contacto') || 'Contact';
  const subjectKey = crmData.headers.find(h => h.toLowerCase() === 'subject' || h.toLowerCase() === 'asunto' || h.toLowerCase() === 'requerimiento') || 'Subject';
  const priorityKey = crmData.headers.find(h => h.toLowerCase() === 'priority' || h.toLowerCase() === 'prioridad') || 'Priority';

  // Internal states for local UX control
  const [visitViewTab, setVisitViewTab] = useState<'list' | 'agenda' | 'history'>('list');
  const [visitStatusFilter, setVisitStatusFilter] = useState<'all' | 'pendiente' | 'programada' | 'ejecucion'>('all');
  const [visitTechnicianFilter, setVisitTechnicianFilter] = useState<string>('');
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(null);
  const [copiedDay, setCopiedDay] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // States for programmed visits
  const [visitasProgramadas, setVisitasProgramadas] = useState<any[]>([]);

  const fetchVisits = async () => {
    const visits = await getProgrammedVisits();
    setVisitasProgramadas(visits);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      await syncProgrammedVisits();
      await fetchVisits();
    } catch (err) {
      console.error('Error syncing visits:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Sync visits on mount to clean up any closed/historical items
    syncProgrammedVisits().then(() => fetchVisits()).catch(() => fetchVisits());
  }, []);

  useEffect(() => {
    fetchVisits();
  }, [crmData, visitViewTab]);

  // Helper to determine if a ticket/visit is closed or resolved
  const isTicketResolved = (row: any): boolean => {
    if (!row) return false;
    if (row.estado_visita === 'Cerrada') return true;
    if (row._sourceSheet === 'historico_completados' || row._sourceSheet === 'admin_backlog_done') return true;

    const statStr = String(row[statusKey] || row.Status || row.Estado || row.status || row.estado || '')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const colJVal = String(row['Estado Registro'] || row['Estado registro'] || row['Columna J'] || '')
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

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
      statStr.includes('confirmar') ||
      colJVal.includes('completado') ||
      colJVal.includes('confirmar')
    );
  };

  // Build a set of closed ticket IDs
  const closedTicketIds = new Set<string>();
  visitasProgramadas.forEach(v => {
    const vId = String(v.id || v.ID || v.id_registro_visita || v.requerimiento_id || '').trim().toUpperCase();
    if (vId && (v.estado_visita === 'Cerrada' || isTicketResolved(v))) {
      closedTicketIds.add(vId);
    }
  });
  crmData.rows.forEach(r => {
    const rId = String(r.ID || r.id || '').trim().toUpperCase();
    if (rId && isTicketResolved(r)) {
      closedTicketIds.add(rId);
    }
  });

  // Active tickets set
  const activeTicketIds = new Set(crmData.rows.map(r => String(r.ID || r.id || '').trim().toUpperCase()).filter(Boolean));

  // 1. Filter active visits with deduplication
  const activeVisitsMap = new Map<string, any>();
  crmData.rows.forEach(row => {
    const rId = String(row.ID || row.id || '').trim().toUpperCase();
    if (!rId) return;
    if (row.estado_visita === 'Cerrada') return;
    if (isTicketResolved(row)) return;
    if (closedTicketIds.has(rId)) return;

    const statusVal = String(row[statusKey] || '').toLowerCase();
    const isProxima = statusVal.includes('02 próxima visita') || statusVal.includes('02 proxima visita') || statusVal.includes('proxima visita');
    const estadoVisita = row.estado_visita || '';
    const isProgrammedOrExec = estadoVisita === 'Programada' || estadoVisita === 'En Ejecución';

    if (isProxima || isProgrammedOrExec) {
      if (!activeVisitsMap.has(rId) || (activeVisitsMap.get(rId)._retenida && !row._retenida)) {
        activeVisitsMap.set(rId, row);
      }
    }
  });

  const allActiveVisits = Array.from(activeVisitsMap.values());

  // 2. Filter history visits with deduplication
  const historyMap = new Map<string, any>();

  visitasProgramadas.forEach(v => {
    const vId = String(v.id || v.ID || v.id_registro_visita || v.requerimiento_id || '').trim().toUpperCase();
    if (!vId) return;
    const isClosed = v.estado_visita === 'Cerrada' || closedTicketIds.has(vId) || isTicketResolved(v) || !activeTicketIds.has(vId);
    if (isClosed) {
      const r: any = { ...v, ID: vId, id: vId, estado_visita: 'Cerrada' };
      r[assignedKey] = v.tecnico_visita || v.tecnico || v[assignedKey] || '';
      r[clientKey] = v.cliente || v[clientKey] || '';
      r[subjectKey] = v.asunto || v[subjectKey] || '';
      historyMap.set(vId, r);
    }
  });

  crmData.rows.forEach(row => {
    const rId = String(row.ID || row.id || '').trim().toUpperCase();
    if (!rId) return;
    if (row.estado_visita === 'Cerrada' || isTicketResolved(row)) {
      if (!historyMap.has(rId)) {
        const r = { ...row, ID: rId, id: rId, estado_visita: 'Cerrada' };
        historyMap.set(rId, r);
      }
    }
  });

  const historyWithForced = Array.from(historyMap.values());

  // Extract list of technicians with visits for dropdown
  const uniqueTechnicians = Array.from(new Set([
    ...allActiveVisits.map(r => String(r[assignedKey] || 'Sin Asignar').trim()),
    ...historyWithForced.map(r => String(r[assignedKey] || 'Sin Asignar').trim())
  ])).filter(Boolean).sort();

  // 3. Filter by visitStatusFilter first
  const filteredByStatusVisits = allActiveVisits.filter(row => {
    const stateVal = row.estado_visita || 'Pendiente de Programar';
    if (visitStatusFilter === 'all') return true;
    if (visitStatusFilter === 'pendiente') return stateVal === 'Pendiente de Programar';
    if (visitStatusFilter === 'programada') return stateVal === 'Programada';
    if (visitStatusFilter === 'ejecucion') return stateVal === 'En Ejecución';
    return true;
  });

  // Filter active visits based on technician filter and global search
  const filteredActiveVisits = filteredByStatusVisits.filter(row => {
    if (visitTechnicianFilter && String(row[assignedKey] || 'Sin Asignar').trim() !== visitTechnicianFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const idVal = String(row.ID || row.id || '').toLowerCase();
      const clientVal = String(row[clientKey] || '').toLowerCase();
      const assignedVal = String(row[assignedKey] || '').toLowerCase();
      const subjectVal = String(row[subjectKey] || '').toLowerCase();
      return idVal.includes(term) || clientVal.includes(term) || assignedVal.includes(term) || subjectVal.includes(term);
    }
    return true;
  });

  // Filter history based on technician filter and global search
  const filteredHistoryVisits = historyWithForced.filter(row => {
    if (visitTechnicianFilter && String(row[assignedKey] || 'Sin Asignar').trim() !== visitTechnicianFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const idVal = String(row.ID || row.id || '').toLowerCase();
      const clientVal = String(row[clientKey] || '').toLowerCase();
      const assignedVal = String(row[assignedKey] || '').toLowerCase();
      const subjectVal = String(row[subjectKey] || '').toLowerCase();
      return idVal.includes(term) || clientVal.includes(term) || assignedVal.includes(term) || subjectVal.includes(term);
    }
    return true;
  });

  // 4. Compute counts for metrics cards
  const totalActivesCount = allActiveVisits.length;
  const pendingCount = allActiveVisits.filter(v => !v.estado_visita || v.estado_visita === 'Pendiente de Programar').length;
  const scheduledCount = allActiveVisits.filter(v => v.estado_visita === 'Programada').length;
  const inExecutionCount = allActiveVisits.filter(v => v.estado_visita === 'En Ejecución').length;
  const closedCount = historyWithForced.length;

  // 5. Group for Weekly Agenda view
  const getDayOfWeek = (dateStr: string) => {
    if (!dateStr) return 'Sin Fecha / Pendiente';
    try {
      const cleanStr = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
      const d = new Date(cleanStr);
      if (isNaN(d.getTime())) return 'Sin Fecha / Pendiente';
      const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      return days[d.getDay()];
    } catch {
      return 'Sin Fecha / Pendiente';
    }
  };

  const daysOfWeekList = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo', 'Sin Fecha / Pendiente'];
  const groupedVisitsByDay: Record<string, typeof filteredActiveVisits> = {};
  daysOfWeekList.forEach(day => { groupedVisitsByDay[day] = []; });

  filteredActiveVisits.forEach(v => {
    if (v.estado_visita === 'Programada' || v.estado_visita === 'En Ejecución') {
      const day = getDayOfWeek(v.fecha_visita || '');
      if (groupedVisitsByDay[day]) {
        groupedVisitsByDay[day].push(v);
      } else {
        groupedVisitsByDay['Sin Fecha / Pendiente'].push(v);
      }
    } else {
      groupedVisitsByDay['Sin Fecha / Pendiente'].push(v);
    }
  });

  // Helper to open Google Maps search or exact coordinates
  const handleOpenMap = (row: Record<string, string>) => {
    const lat = row.latitud_visita;
    const lng = row.longitud_visita;
    const address = row.direccion_visita;
    const client = row[clientKey] || '';
    const contact = row[contactKey] || '';

    if (lat && lng) {
      // Open exact GPS coordinates on Google Maps
      window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
    } else if (address) {
      // Open exact address
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank');
    } else {
      // Fallback search query
      const query = `${client} ${contact}`.trim();
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
    }
  };

  // Helper to copy itinerary
  const handleCopyItinerary = (dayName: string, dayVisits: typeof filteredActiveVisits) => {
    if (dayVisits.length === 0) return;
    
    let text = `📅 ITINERARIO DE VISITAS - ${dayName.toUpperCase()}\n`;
    text += `-------------------------------------------\n\n`;
    dayVisits.forEach((v, idx) => {
      const time = v.fecha_visita ? v.fecha_visita.split(' ')[1] || 'Todo el día' : 'Sin Hora';
      const client = v[clientKey] || 'Cliente Desconocido';
      const contact = v[contactKey] || 'Sin Contacto';
      const subject = v[subjectKey] || 'Sin Asunto';
      const tech = v[assignedKey] || 'Sin Técnico asignado';
      const priority = v.prioridad_visita || 'Media';
      const duration = v.duracion_estimada_visita || '2 horas';
      
      text += `${idx + 1}. [⏱️ ${time}] - 🏢 ${client}\n`;
      text += `   👤 Contacto: ${contact}\n`;
      text += `   🛠️ Trabajo: ${subject}\n`;
      text += `   🔧 Técnico: ${tech}\n`;
      text += `   ⚡ Prioridad: ${priority} | ⏳ Estimado: ${duration}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedDay(dayName);
    setTimeout(() => {
      setCopiedDay(null);
    }, 2000);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header info */}
      <div className="bg-slate-50 border border-slate-200 p-5 rounded-3xl flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-700 shrink-0 border border-blue-100">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-display font-black text-sm text-slate-800 tracking-tight">Gestión Integrada de Visitas Clientes</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Planifique, ejecute y consulte el historial de visitas a clientes en tiempo real. Coordine agendas semanales y audite acuerdos.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            title="Sincronizar el estado de las visitas con el histórico de requerimientos completados"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Cierres'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Grid - Interactive Filter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => { setVisitViewTab('list'); setVisitStatusFilter('all'); setVisitTechnicianFilter(''); }}
          className={`bg-white border hover:border-blue-300 rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md cursor-pointer group ${
            visitViewTab === 'list' && visitStatusFilter === 'all' ? 'ring-2 ring-blue-500/20 border-blue-400 bg-blue-50/10' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Activas en CRM</span>
            <span className="p-1 rounded bg-blue-50 text-blue-600 font-bold text-xs font-mono">{totalActivesCount}</span>
          </div>
          <div className="text-xl font-display font-black text-slate-800 mt-2">{totalActivesCount}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1 group-hover:text-blue-600 flex items-center gap-1">
            Ver todas <ChevronRight className="w-3 h-3" />
          </div>
        </button>

        <button
          onClick={() => { setVisitViewTab('list'); setVisitStatusFilter('pendiente'); }}
          className={`bg-white border hover:border-slate-350 rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md cursor-pointer group ${
            visitViewTab === 'list' && visitStatusFilter === 'pendiente' ? 'ring-2 ring-slate-500/20 border-slate-400 bg-slate-50' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Por Programar</span>
            <span className="p-1 rounded bg-slate-100 text-slate-600 font-bold text-xs font-mono">📅</span>
          </div>
          <div className="text-xl font-display font-black text-slate-800 mt-2">{pendingCount}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1 group-hover:text-slate-700 flex items-center gap-1">
            Ver pendientes <ChevronRight className="w-3 h-3" />
          </div>
        </button>

        <button
          onClick={() => { setVisitViewTab('list'); setVisitStatusFilter('programada'); }}
          className={`bg-white border hover:border-amber-300 rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md cursor-pointer group ${
            visitViewTab === 'list' && visitStatusFilter === 'programada' ? 'ring-2 ring-amber-500/20 border-amber-400 bg-amber-50/10' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Programadas</span>
            <span className="p-1 rounded bg-amber-50 text-amber-600 font-bold text-xs font-mono">⏱️</span>
          </div>
          <div className="text-xl font-display font-black text-amber-700 mt-2">{scheduledCount}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1 group-hover:text-amber-700 flex items-center gap-1">
            Ver programadas <ChevronRight className="w-3 h-3" />
          </div>
        </button>

        <button
          onClick={() => { setVisitViewTab('list'); setVisitStatusFilter('ejecucion'); }}
          className={`bg-white border hover:border-emerald-300 rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md cursor-pointer group ${
            visitViewTab === 'list' && visitStatusFilter === 'ejecucion' ? 'ring-2 ring-emerald-500/20 border-emerald-400 bg-emerald-50/10' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">En Ejecución</span>
            <span className="p-1 rounded bg-emerald-50 text-emerald-600 font-bold text-xs font-mono">🟢</span>
          </div>
          <div className="text-xl font-display font-black text-emerald-700 mt-2">{inExecutionCount}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1 group-hover:text-emerald-700 flex items-center gap-1">
            Ver en ruta <ChevronRight className="w-3 h-3" />
          </div>
        </button>

        <button
          onClick={() => { setVisitViewTab('history'); }}
          className={`bg-white border hover:border-indigo-300 rounded-2xl p-4 shadow-sm text-left transition-all hover:shadow-md cursor-pointer group ${
            visitViewTab === 'history' ? 'ring-2 ring-indigo-500/20 border-indigo-400 bg-indigo-50/10' : 'border-slate-200'
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Auditadas Historial</span>
            <span className="p-1 rounded bg-indigo-50 text-indigo-600 font-bold text-xs font-mono">✅</span>
          </div>
          <div className="text-xl font-display font-black text-indigo-800 mt-2">{closedCount}</div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1 group-hover:text-indigo-600 flex items-center gap-1">
            Ver bitácora <ChevronRight className="w-3 h-3" />
          </div>
        </button>
      </div>

      {/* Dashboard Control Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Inner Tabs Selector */}
        <div className="flex bg-slate-100 p-1 rounded-xl self-start flex-wrap gap-1 md:gap-0">
          <button
            onClick={() => { setVisitViewTab('list'); setVisitStatusFilter('all'); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              visitViewTab === 'list'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Listado y Programación ({filteredActiveVisits.length})
          </button>
          <button
            onClick={() => setVisitViewTab('agenda')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              visitViewTab === 'agenda'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Agenda Semanal Planner
          </button>
          <button
            onClick={() => setVisitViewTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              visitViewTab === 'history'
                ? 'bg-white text-indigo-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Historial de Cierres ({filteredHistoryVisits.length})
          </button>
        </div>

        {/* Technician and Search filter toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          {visitViewTab === 'list' && visitStatusFilter !== 'all' && (
            <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
              Filtro: {visitStatusFilter.toUpperCase()}
              <button onClick={() => setVisitStatusFilter('all')} className="hover:text-blue-950 font-bold ml-1 text-xs font-sans">×</button>
            </span>
          )}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shrink-0">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={visitTechnicianFilter}
              onChange={(e) => setVisitTechnicianFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer max-w-[160px]"
            >
              <option value="">Todos los Técnicos</option>
              {uniqueTechnicians.map((tech, i) => (
                <option key={i} value={tech}>{tech}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TAB 1: LIST VIEW */}
      {visitViewTab === 'list' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-bold font-mono">
              Registros en este listado: {filteredActiveVisits.length}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              * Haga clic en el botón de expansión para ver la línea de tiempo completa del requerimiento.
            </span>
          </div>

          <div className="overflow-x-auto custom-scrollbar relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0 bg-slate-50/95 backdrop-blur-sm z-30 shadow-sm">
                  <th className="px-5 py-3 w-[50px] text-center">Info</th>
                  <th className="px-5 py-3 w-[80px]">ID</th>
                  <th className="px-5 py-3 w-[155px]">Técnico Asignado</th>
                  <th className="px-5 py-3 w-[160px]">Cliente / Contacto</th>
                  <th className="px-5 py-3">Asunto / Requerimiento</th>
                  <th className="px-5 py-3 w-[180px]">Fecha Programada</th>
                  <th className="px-5 py-3 w-[130px]">Estado Visita</th>
                  <th className="px-5 py-3 w-[120px]">Parámetros</th>
                  <th className="px-5 py-3 w-[220px] text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 font-sans">
                {filteredActiveVisits.map((row, idx) => {
                  const idVal = row.ID || row.id || '';
                  const assignedVal = row[assignedKey] || 'Sin Asignar';
                  const clientVal = row[clientKey] || 'F.H.O.N.S.';
                  const contactVal = row[contactKey] || '';
                  const subjectVal = row[subjectKey] || 'Sin Asunto';
                  const visitDate = row.fecha_visita || '';
                  const visitState = row.estado_visita || 'Pendiente de Programar';
                  const visitPriority = row.prioridad_visita || '';
                  const visitDuration = row.duracion_estimada_visita || '';
                  const isExpanded = expandedVisitId === idVal;

                  return (
                    <React.Fragment key={idx}>
                      <tr className={`hover:bg-slate-50/60 transition-colors ${isExpanded ? 'bg-blue-50/20' : ''}`}>
                        <td className="px-5 py-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => setExpandedVisitId(isExpanded ? null : idVal)}
                            className="p-1 rounded bg-slate-100 hover:bg-blue-100 text-slate-500 hover:text-blue-700 cursor-pointer transition-all shrink-0"
                            title="Ver Línea de Tiempo del Requerimiento"
                          >
                            <ChevronRight className={`w-3.5 h-3.5 transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-blue-600' : ''}`} />
                          </button>
                        </td>
                        <td className="px-5 py-3.5 font-mono font-bold text-blue-700">{idVal}</td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600">{assignedVal}</td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-700">{clientVal}</div>
                          {contactVal && <div className="text-[10px] text-slate-400 font-medium">{contactVal}</div>}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-medium max-w-xs truncate" title={subjectVal}>
                          {subjectVal}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600">
                          {visitDate ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="flex items-center gap-1.5 text-indigo-700 font-mono text-[11px]">
                                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                {visitDate.split(' ')[0]}
                              </span>
                              {visitDate.split(' ')[1] && (
                                <span className="text-[10px] text-slate-400 font-mono ml-5">⏱️ {visitDate.split(' ')[1]}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px] font-normal">Sin programar 📅</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {visitState === 'Pendiente de Programar' && (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-bold">
                              Pendiente
                            </span>
                          )}
                          {visitState === 'Programada' && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              Programada
                            </span>
                          )}
                          {visitState === 'En Ejecución' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold inline-flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                              En Ejecución
                            </span>
                          )}
                          {visitState === 'Cerrada' && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                              Cerrada ✅
                            </span>
                          )}
                          {row._retenida && (
                            <div className="mt-1">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase tracking-widest border border-indigo-200" title="Este requerimiento no está en el CRM actual pero se retiene por tener una visita activa">
                                Protegida (Activa)
                              </span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {visitPriority || visitDuration ? (
                            <div className="flex flex-col gap-1">
                              {visitPriority === 'Alta' && (
                                <span className="px-1.5 py-0.5 bg-red-50 text-red-700 border border-red-150 rounded text-[9px] font-bold text-center">🔴 Alta</span>
                              )}
                              {visitPriority === 'Media' && (
                                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-150 rounded text-[9px] font-bold text-center">🟡 Media</span>
                              )}
                              {visitPriority === 'Baja' && (
                                <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded text-[9px] font-bold text-center">🟢 Baja</span>
                              )}
                              {visitDuration && (
                                <span className="text-[10px] text-slate-500 font-mono font-medium">⏱️ {visitDuration}</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 italic text-[10px]">-</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Open map location */}
                            <button
                              type="button"
                              onClick={() => handleOpenMap(row)}
                              className="px-2 py-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg cursor-pointer transition-all shrink-0"
                              title="Ver ubicación en Google Maps"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>

                            {visitState === 'Pendiente de Programar' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSchedulingVisitRow(row);
                                }}
                                className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-lg cursor-pointer shadow-sm transition-all flex items-center gap-1"
                              >
                                <Calendar className="w-3 h-3" />
                                Programar
                              </button>
                            )}
                            {visitState === 'Programada' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleStartVisit(row)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg cursor-pointer shadow-sm transition-all flex items-center gap-1"
                                >
                                  <Activity className="w-3 h-3" />
                                  Iniciar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSchedulingVisitRow(row);
                                  }}
                                  className="px-2 py-1.5 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-850 border border-slate-200 text-[10px] font-bold rounded-lg cursor-pointer shadow-sm transition-all"
                                >
                                  Reprogramar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setClosingVisitRow(row);
                                  }}
                                  className="px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold rounded-lg cursor-pointer shadow-sm transition-all flex items-center gap-1"
                                  title="Cerrar esta visita directamente"
                                >
                                  <CheckSquare className="w-3 h-3" />
                                  Cerrar
                                </button>
                              </>
                            )}
                            {visitState === 'En Ejecución' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setClosingVisitRow(row);
                                }}
                                className="px-2.5 py-1.5 bg-blue-800 hover:bg-blue-900 text-white text-[10px] font-bold rounded-lg cursor-pointer shadow-sm transition-all flex items-center gap-1"
                              >
                                <CheckSquare className="w-3 h-3" />
                                Cerrar Visita
                              </button>
                            )}
                            {visitState === 'Cerrada' && (
                              <span className="px-2.5 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 text-[10px] font-bold rounded-lg cursor-not-allowed">
                                Cerrada
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* EXPANSIBLE ROW WITH TIMELINE */}
                      {isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td colSpan={9} className="px-5 py-4 border-t border-b border-slate-150 animate-fadeIn">
                            <div className="max-w-4xl mx-auto space-y-4">
                              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                                <h4 className="font-display font-black text-xs text-slate-700 tracking-tight uppercase flex items-center gap-1.5">
                                  <Activity className="w-4 h-4 text-blue-600 animate-pulse" />
                                  Trazabilidad y Línea de Tiempo del Requerimiento ({idVal})
                                </h4>
                                <span className="text-[10px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                                  Filtro: {visitState.toUpperCase()}
                                </span>
                              </div>
                              
                              <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 ml-3">
                                {/* Step 1: CRM Request */}
                                <div className="relative">
                                  <span className="absolute -left-[32px] top-0.5 w-5 h-5 rounded-full bg-blue-600 border-2 border-white shadow flex items-center justify-center text-[10px] font-black text-white">1</span>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">Requerimiento Recibido en CRM</p>
                                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">Trabajo/Asunto: <strong className="text-slate-700">"{subjectVal}"</strong></p>
                                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Cliente: <strong className="text-slate-600">{clientVal}</strong> {contactVal && `• Contacto: ${contactVal}`} • Prioridad: {row[priorityKey] || 'Normal'}</p>
                                  </div>
                                </div>

                                {/* Step 2: Scheduling */}
                                <div className="relative">
                                  <span className={`absolute -left-[32px] top-0.5 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] font-black text-white ${visitDate ? 'bg-indigo-600' : 'bg-slate-300'}`}>2</span>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">Planificación y Coordinación de Agenda</p>
                                    {visitDate ? (
                                      <div className="space-y-1 mt-1.5 bg-indigo-50/50 border border-indigo-100 p-2.5 rounded-xl max-w-md">
                                        <p className="text-[11px] text-indigo-700 font-mono font-bold flex items-center gap-1.5">
                                          <Calendar className="w-3.5 h-3.5" />
                                          Fecha Programada: {visitDate}
                                        </p>
                                        <p className="text-[10px] text-slate-600">
                                          Prioridad de Visita: <strong className={`${visitPriority === 'Alta' ? 'text-red-600' : 'text-slate-700'} font-bold`}>{visitPriority || 'Media'}</strong> • Duración Estimada: <strong className="text-slate-700 font-bold">{visitDuration || '2 horas'}</strong>
                                        </p>
                                        <p className="text-[10px] text-slate-500">Técnico Asignado de Guardia: <strong className="text-slate-700 font-semibold">{assignedVal}</strong></p>
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 italic mt-0.5">Pendiente de programar fecha, prioridad y rango estimado.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Step 3: Execution */}
                                <div className="relative">
                                  <span className={`absolute -left-[32px] top-0.5 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] font-black text-white ${visitState === 'En Ejecución' || visitState === 'Cerrada' ? 'bg-emerald-500' : 'bg-slate-300'}`}>3</span>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      Inicio de Ruta y Arribo en Sitio
                                      {visitState === 'En Ejecución' && (
                                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-bold animate-pulse flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Técnico en Sitio
                                        </span>
                                      )}
                                    </p>
                                    {visitState === 'En Ejecución' ? (
                                      <p className="text-[11px] text-emerald-600 font-medium mt-1">El técnico <strong className="font-bold">{assignedVal}</strong> ha iniciado la ruta y se encuentra resolviendo la incidencia con el cliente.</p>
                                    ) : visitState === 'Cerrada' ? (
                                      <p className="text-[11px] text-slate-500 mt-1">Trabajo de campo finalizado e inspección completada por <strong className="font-semibold">{assignedVal}</strong>.</p>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 italic mt-0.5">Pendiente de iniciar labores de ruta y soporte en terreno.</p>
                                    )}
                                  </div>
                                </div>

                                {/* Step 4: Auditoria / Closure */}
                                <div className="relative">
                                  <span className={`absolute -left-[32px] top-0.5 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-[10px] font-black text-white ${visitState === 'Cerrada' ? 'bg-blue-700' : 'bg-slate-300'}`}>4</span>
                                  <div>
                                    <p className="text-xs font-bold text-slate-800">Cierre de Visita y Firma de Minuta de Acuerdos</p>
                                    {visitState === 'Cerrada' ? (
                                      <div className="space-y-2 mt-1.5 bg-slate-50 border border-slate-200 p-3 rounded-xl max-w-xl">
                                        <p className="text-[11px] text-slate-700 italic leading-relaxed">
                                          Minuta: "{row.comentario_visita || 'Sin acuerdos o comentarios redactados.'}"
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                                          Estado Actualizado en CRM: <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 font-mono text-[9px] font-bold">{row[statusKey]}</span>
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-[11px] text-slate-400 italic mt-0.5">Pendiente de registrar minuta técnica y confirmar el nuevo estado del ticket principal.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
                {filteredActiveVisits.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-12 text-center text-slate-400 italic">
                      No se encontraron requerimientos que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: WEEKLY AGENDA CALENDAR VIEW */}
      {visitViewTab === 'agenda' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs text-slate-600 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>
              Planificador semanal agrupado según el día de la semana configurado en la <strong>Fecha Programada</strong>. Puede filtrar por técnico en el panel superior.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {daysOfWeekList.map((dayName, dayIdx) => {
              const dayVisits = groupedVisitsByDay[dayName] || [];
              const isCopied = copiedDay === dayName;

              return (
                <div key={dayIdx} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col min-h-[300px]">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-display font-black text-xs text-slate-700 tracking-tight">{dayName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${dayVisits.length > 0 ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-200 text-slate-500'}`}>
                        {dayVisits.length}
                      </span>
                    </div>

                    {/* Clipboard route copying button */}
                    {dayVisits.length > 0 && (
                      <button
                        type="button"
                        onClick={() => handleCopyItinerary(dayName, dayVisits)}
                        className={`p-1 rounded-lg border text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
                          isCopied 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-250' 
                            : 'bg-white hover:bg-slate-100 text-slate-500 border-slate-200 hover:text-slate-800'
                        }`}
                        title="Copiar ruta de visitas del día para WhatsApp/GPS"
                      >
                        <Copy className="w-3 h-3" />
                        <span className="text-[9px]">{isCopied ? '¡Copiado!' : 'Ruta'}</span>
                      </button>
                    )}
                  </div>

                  <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar max-h-[400px]">
                    {dayVisits.map((visit, vIdx) => {
                      const visitTime = visit.fecha_visita ? visit.fecha_visita.split(' ')[1] || 'Todo el día' : '';
                      const clientVal = visit[clientKey] || 'F.H.O.N.S.';
                      const techVal = visit[assignedKey] || 'Sin Asignar';
                      const subjectVal = visit[subjectKey] || 'Sin Asunto';
                      const stateVal = visit.estado_visita || 'Pendiente';
                      const priorityVal = visit.prioridad_visita || 'Media';
                      const durationVal = visit.duracion_estimada_visita || '';

                      return (
                        <div
                          key={vIdx}
                          className={`p-3 rounded-xl border bg-white shadow-sm hover:shadow-md transition-all space-y-2 relative group overflow-hidden ${
                            stateVal === 'En Ejecución'
                              ? 'border-emerald-300 ring-2 ring-emerald-500/20'
                              : 'border-slate-200 hover:border-slate-350'
                          }`}
                        >
                          {stateVal === 'En Ejecución' && (
                            <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500 animate-pulse" />
                          )}

                          <div className="flex justify-between items-start gap-1">
                            <span className="font-mono font-bold text-[10px] text-blue-700">{visit.ID || visit.id}</span>
                            {visitTime && (
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-mono font-bold">
                                ⏰ {visitTime}
                              </span>
                            )}
                          </div>

                          <div>
                            <div className="font-sans font-bold text-slate-800 text-xs truncate" title={clientVal}>
                              {clientVal}
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-2 mt-0.5" title={subjectVal}>
                              {subjectVal}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[9px] text-slate-500 font-semibold font-sans">
                              <span className="flex items-center gap-1">👤 {techVal}</span>
                              {priorityVal && (
                                <span className={`px-1.5 py-0.5 rounded ${
                                  priorityVal === 'Alta' ? 'bg-red-50 text-red-700 font-bold' :
                                  priorityVal === 'Baja' ? 'bg-emerald-50 text-emerald-700' :
                                  'bg-amber-50 text-amber-700'
                                }`}>
                                  {priorityVal}
                                </span>
                              )}
                            </div>
                            {durationVal && (
                              <div className="text-[9px] text-slate-400 font-mono italic">⏳ Estimado: {durationVal}</div>
                            )}
                          </div>

                          {/* Hover action toolbox */}
                          <div className="pt-2 flex items-center justify-end gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenMap(visit)}
                              className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-50 border border-slate-150 rounded-md cursor-pointer shrink-0"
                              title="Ver ubicación en mapa"
                            >
                              <MapPin className="w-3 h-3" />
                            </button>

                            {stateVal === 'Pendiente de Programar' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSchedulingVisitRow(visit);
                                }}
                                className="px-1.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-bold rounded-md cursor-pointer"
                              >
                                Agendar
                              </button>
                            )}

                            {stateVal === 'Programada' && (
                              <button
                                type="button"
                                onClick={() => handleStartVisit(visit)}
                                className="px-1.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold rounded-md cursor-pointer"
                              >
                                Iniciar
                              </button>
                            )}

                            {stateVal === 'En Ejecución' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setClosingVisitRow(visit);
                                }}
                                className="px-1.5 py-1 bg-blue-850 hover:bg-blue-900 text-white text-[9px] font-bold rounded-md cursor-pointer"
                              >
                                Cerrar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {dayVisits.length === 0 && (
                      <div className="flex-1 flex flex-col items-center justify-center py-8 text-center text-slate-350 italic text-[11px]">
                        <span>Sin visitas</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: VISITS AUDIT LOG HISTORY */}
      {visitViewTab === 'history' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fadeIn">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-indigo-50 text-indigo-700 font-bold text-xs">📜</span>
              <span className="text-xs font-black text-slate-700 font-sans uppercase tracking-tight">
                Bitácora Permanente de Visitas Cerradas
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchVisits}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-[10px] font-bold transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Actualizar Bitácora
              </button>
              <span className="text-[11px] text-slate-500 font-semibold font-mono">
                Registros auditados: {filteredHistoryVisits.length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-mono text-[10px] font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="px-5 py-3 w-[80px]">ID</th>
                  <th className="px-5 py-3 w-[150px]">Técnico Atendido</th>
                  <th className="px-5 py-3 w-[180px]">Cliente / Cuenta</th>
                  <th className="px-5 py-3">Asunto / Trabajo Realizado</th>
                  <th className="px-5 py-3 w-[150px]">Fecha de Visita</th>
                  <th className="px-5 py-3 w-[220px]">Minuta / Acuerdos de Cierre</th>
                  <th className="px-5 py-3 w-[130px] text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 text-slate-700 font-sans">
                {filteredHistoryVisits.map((row, idx) => {
                  const idVal = row.ID || row.id || '';
                  const assignedVal = row[assignedKey] || 'Sin Asignar';
                  const clientVal = row[clientKey] || 'F.H.O.N.S.';
                  const subjectVal = row[subjectKey] || 'Sin Asunto';
                  const visitDate = row.fecha_visita || '';
                  const visitComment = row.comentario_visita || '';
                  const ticketStatus = row[statusKey] || 'Cerrado';

                  return (
                    <tr key={idx} className="hover:bg-slate-50/30 transition-all">
                      <td className="px-5 py-3.5 font-mono font-bold text-indigo-700">{idVal}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600">{assignedVal}</td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">{clientVal}</td>
                      <td className="px-5 py-3.5 text-slate-600 font-medium max-w-xs truncate" title={subjectVal}>
                        {subjectVal}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        📅 {visitDate || 'Sin fecha'}
                      </td>
                      <td className="px-5 py-3.5">
                        {visitComment ? (
                          <div className="text-slate-650 bg-slate-50 border border-slate-150 p-2.5 rounded-xl text-[11px] italic leading-relaxed max-w-sm whitespace-pre-wrap">
                            "{visitComment}"
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sin comentarios</span>
                        )}
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-indigo-600">
                          <span>Ticket Status:</span>
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-mono border border-indigo-100">
                            {ticketStatus}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {ticketStatus !== 'Cerrado' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSchedulingVisitRow(row);
                            }}
                            className="px-2.5 py-1.5 bg-white text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 text-[10px] font-bold rounded-lg cursor-pointer transition-all inline-flex items-center gap-1"
                          >
                            Re-programar Visita
                          </button>
                        ) : (
                          <span className="px-2.5 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 text-[10px] font-bold rounded-lg cursor-not-allowed">
                            Cerrada
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredHistoryVisits.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-slate-400 italic">
                      No se registran visitas cerradas en la bitácora histórica.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
