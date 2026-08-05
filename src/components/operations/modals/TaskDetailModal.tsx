// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { saveSingleInternalTask } from '../../../db/firebaseService';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Search, 
  Filter, 
  Plus, 
  Calendar as CalendarIcon, 
  MapPin, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Play, 
  Square, 
  Pause, 
  ExternalLink, 
  MessageSquare, 
  ShieldAlert, 
  Phone, 
  HelpCircle, 
  X, 
  Save, 
  Edit3, 
  Trash2, 
  Camera, 
  MoreVertical, 
  FileText, 
  Download, 
  Briefcase, 
  FileSignature, 
  Coffee, 
  UserX, 
  Loader2, 
  ArrowRight, 
  UserCheck, 
  AlertTriangle, 
  Building2, 
  HardHat, 
  FileCheck, 
  CheckSquare, 
  Settings, 
  Activity, 
  Upload, 
  Image as ImageIcon, 
  Map, 
  FileCode2, 
  Zap, 
  MonitorPlay, 
  CheckCircle,
  LayoutGrid,
  Wallet,
  Users,
  Info,
  Trash,
  ShoppingCart,
  Percent,
  ChevronDown
} from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, parseISO, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, formatDistanceToNow, parse } from 'date-fns';
import { es } from 'date-fns/locale';
import { useOperations } from '../OperationsContext';
import { getRecurrenceDescription } from '../utils/helpers';

export const TaskDetailModal = () => {
  const {
    agents,
    internalTasks,
    contractorTasks,
    selectedTaskForModal,
    setSelectedTaskForModal,
    isChangingAssignee,
    setIsChangingAssignee,
    isReprogrammingDate,
    setIsReprogrammingDate,
    setInternalTasks,
    setContractorTasks,
    showToast,
    modalFollowUpInput,
    setModalFollowUpInput,
    modalReportInput,
    setModalReportInput,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleDeleteInternalTask,
    handleDeleteContractorTask,
    handleUpdateInternalTaskStatus,
    tempType,
    setTempType,
    tempFrequency,
    setTempFrequency,
    tempScheduledDate,
    setTempScheduledDate,
    tempHasNoDate,
    setTempHasNoDate,
    tempHasEndDate,
    setTempHasEndDate,
    tempRecurrenceEndDate,
    setTempRecurrenceEndDate,
    tempRecurrenceDayOfWeek,
    setTempRecurrenceDayOfWeek,
    tempRecurrenceDayOfMonth,
    setTempRecurrenceDayOfMonth,
    tempRecurrenceMonthOfYear,
    setTempRecurrenceMonthOfYear,
    tempStartDate,
    setTempStartDate,
    tempDueDate,
    setTempDueDate,
    agentsExceptA1
  } = useOperations();

  // Navigation Sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'cliente' | 'finanzas'>('details');

  // Items / Services State
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editingItemsList, setEditingItemsList] = useState<any[]>([]);

  // Toggles for inline actions
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Parse task
  const isInternal = selectedTaskForModal?.type === 'internal';
  const task = selectedTaskForModal
    ? (isInternal
        ? internalTasks.find(t => t.id === selectedTaskForModal.id)
        : contractorTasks.find(t => t.id === selectedTaskForModal.id))
    : null;

  // Initialize editing items list and default values when task changes
  useEffect(() => {
    if (task) {
      if (task.items && task.items.length > 0) {
        setEditingItemsList(task.items);
      } else {
        // Fallback to high fidelity mock items from user's screenshot
        const defaultItems = [
          { name: 'Full Installation', qty: 1, price: 450.00, tag: 'INV-1002' },
          { name: 'Serum Vitamina C Radiance', qty: 5, price: 45.00, tag: 'INV-1002' },
          { name: 'Supreme Hydrating Lipstick', qty: 1, price: 20.00, tag: 'INV-1002' }
        ];
        setEditingItemsList(defaultItems);
        
        // Save these defaults back into the task so they are persisted
        const updatedTask = { ...task, items: defaultItems };
        if (isInternal) {
          setInternalTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
        } else {
          setContractorTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
        }
      }
    }
    // Reset editing view on task swap
    setIsEditingItems(false);
  }, [selectedTaskForModal?.id, selectedTaskForModal?.type]);

  if (!task) return null;

  // Assigned Agent info
  const assignedAgentId = isInternal 
    ? (task as any).assignedToId 
    : (task as any).supervisorAgentId;
  const assignedAgent = agents.find(a => a.id === assignedAgentId);
  const assignedInitials = assignedAgent 
    ? assignedAgent.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() 
    : 'EG';

  // Format date helper in Spanish
  const formatScheduledDateSpanish = (dateStr: string, timeStr?: string) => {
    if (!dateStr) return 'Sin fecha programada';
    try {
      const parsedDate = parseISO(dateStr);
      const dayName = format(parsedDate, 'EEEE', { locale: es });
      const capitalizedDay = dayName.charAt(0).toUpperCase() + dayName.slice(1);
      const dayNum = format(parsedDate, 'd', { locale: es });
      const monthName = format(parsedDate, 'MMMM', { locale: es });
      const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
      
      const timePart = timeStr ? ` | ${timeStr}` : ' | 12:30 PM';
      return `${capitalizedDay}, ${dayNum} De ${capitalizedMonth}${timePart}`;
    } catch (e) {
      return `${dateStr} | 12:30 PM`;
    }
  };

  // Prices calculations
  const currentItems = task.items || editingItemsList;
  const totalPrice = currentItems.reduce((sum, item) => sum + (item.price * (item.qty || 1)), 0);
  const taxValue = totalPrice * 0.16;
  const grandTotal = totalPrice + taxValue;

  // Save modified items list back
  const handleSaveItems = () => {
    const updatedTask = { ...task, items: editingItemsList };
    if (isInternal) {
      setInternalTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    } else {
      setContractorTasks(prev => prev.map(t => t.id === task.id ? updatedTask : t));
    }
    setIsEditingItems(false);
    showToast('Lista de servicios/productos consolidada con éxito.', 'success');
  };

  // Edit fields inside items list
  const updateItemField = (index: number, field: string, value: any) => {
    const copy = [...editingItemsList];
    copy[index] = { ...copy[index], [field]: value };
    setEditingItemsList(copy);
  };

  const deleteItem = (index: number) => {
    const copy = editingItemsList.filter((_, idx) => idx !== index);
    setEditingItemsList(copy);
  };

  const addNewItem = () => {
    setEditingItemsList([
      ...editingItemsList,
      { name: 'Nuevo Servicio/Producto', qty: 1, price: 0.00, tag: 'INV-1002' }
    ]);
  };

  return (
    <AnimatePresence>
      <div key="unified-task-modal-container" className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4">
        {/* Overlay with subtle blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
          onClick={() => {
            setSelectedTaskForModal(null);
            setIsChangingAssignee(false);
            setShowStatusDropdown(false);
            setModalFollowUpInput('');
            setModalReportInput('');
            setShowDeleteConfirm(false);
          }}
        />

        {/* High-Fidelity Custom Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-50 rounded-[32px] border border-slate-200 shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[82vh] relative z-10"
        >
          {/* Top Edge Vibrant Accent Bar (exact style) */}
          <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-600 to-indigo-700 shrink-0 w-full" />

          {/* Header Block */}
          <div className="bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              {/* Calendar blue-square icon */}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-2xl text-blue-600 shrink-0">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-sans font-black text-xl text-slate-800 tracking-tight leading-none">
                    {task.ticketId || `APT-${task.id.substring(0, 4).toUpperCase()}`}
                  </h3>
                  <span className="font-mono text-[9px] text-slate-400 font-extrabold px-1.5 py-0.5 rounded border border-slate-200 bg-slate-50 tracking-wider">
                    Ver. 1.0
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-slate-400 mt-1.5 block">
                  Creada el: {task.createdDate || '3/15/2026'}
                </span>
              </div>
            </div>

            {/* Close "✕" Button */}
            <button
              onClick={() => {
                setSelectedTaskForModal(null);
                setIsChangingAssignee(false);
                setShowStatusDropdown(false);
                setModalFollowUpInput('');
                setModalReportInput('');
                setShowDeleteConfirm(false);
              }}
              className="p-2.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Core Body Container */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-8 flex-1 overflow-y-auto pb-8">
            
            {/* Left Column (8/12 Span) */}
            <div className="lg:col-span-8 space-y-5">
              
              {/* Row 1: CLIENTE & ASIGNADO A */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* CLIENTE Card */}
                <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs flex flex-col justify-between min-h-[110px]">
                  <div className="flex justify-between items-start w-full">
                    <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase">
                      CLIENTE
                    </span>
                    <button
                      onClick={() => setActiveSubTab('cliente')}
                      className="text-[10px] font-mono font-black text-indigo-600 hover:text-indigo-800 tracking-wider hover:underline transition-all"
                    >
                      VER PERFIL
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3.5 mt-2">
                    <img
                      src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120"
                      alt="Cliente Avatar"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 rounded-full object-cover border border-slate-200"
                    />
                    <div>
                      <h4 className="font-sans font-black text-slate-800 text-[14px]">
                        {task.clientName || 'Sarah Jenkins'}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                        {task.clientRole || 'Cliente Registrado'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ASIGNADO A Card */}
                <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs flex flex-col justify-between min-h-[110px]">
                  <div className="flex justify-between items-start w-full">
                    <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase">
                      ASIGNADO A
                    </span>
                    <button
                      onClick={() => setIsChangingAssignee(!isChangingAssignee)}
                      className="text-[10px] font-mono font-black text-indigo-600 hover:text-indigo-800 tracking-wider hover:underline transition-all"
                    >
                      {isChangingAssignee ? 'CERRAR' : 'CAMBIAR'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3.5 mt-2">
                    <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-sm font-mono font-black text-purple-600 uppercase shrink-0">
                      {assignedInitials}
                    </div>
                    <div>
                      <h4 className="font-sans font-black text-slate-800 text-[14px]">
                        {assignedAgent?.name || 'Elena G.'}
                      </h4>
                      <span className="text-[11px] text-slate-400 font-medium block mt-0.5">
                        {task.assignedRole || 'Lead Specialist'}
                      </span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Inline Assignee Selector Dropdown */}
              {isChangingAssignee && (
                <div className="bg-white border border-slate-200 rounded-[24px] p-5 space-y-3 shadow-md animate-slideDown">
                  <span className="text-[10px] block text-slate-400 font-mono font-black uppercase">
                    Seleccionar nuevo colaborador:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {agentsExceptA1.map(ag => (
                      <button
                        key={ag.id}
                        type="button"
                        onClick={() => {
                          if (isInternal) {
                            setInternalTasks(prev => prev.map(t => t.id === task.id ? { ...t, assignedToId: ag.id } : t));
                          } else {
                            setContractorTasks(prev => prev.map(t => t.id === task.id ? { ...t, supervisorAgentId: ag.id } : t));
                          }
                          setIsChangingAssignee(false);
                          showToast(`Asignación transferida a: ${ag.name}`, 'success');
                        }}
                        className={`p-3 rounded-xl border text-left text-xs font-black flex items-center gap-2.5 cursor-pointer transition-all ${
                          ag.id === assignedAgentId 
                            ? 'bg-indigo-600 border-indigo-700 text-white' 
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-indigo-50'
                        }`}
                      >
                        <span className="w-6 h-6 rounded-full bg-white/20 text-slate-700 text-[10px] font-mono font-black flex items-center justify-center border">
                          {ag.name.substring(0, 2).toUpperCase()}
                        </span>
                        <span className="truncate">{ag.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Row 2: FECHA Y HORA Card */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs flex items-center gap-4">
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-blue-600 shrink-0">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    FECHA Y HORA
                  </span>
                  <span className="text-sm font-black text-slate-800 block mt-1">
                    {formatScheduledDateSpanish(task.scheduledDate || (task as any).startDate, (task as any).scheduledTime)}
                  </span>
                </div>
              </div>

              {/* Reprogramming Panel */}
              {isReprogrammingDate && (
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-[24px] p-5 space-y-4 shadow-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-indigo-100">
                    <span className="text-[10px] text-indigo-700 font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <span>📅</span> Reprogramar Tarea / Editar Recurrencia
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsReprogrammingDate(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold font-mono"
                    >
                      ✕
                    </button>
                  </div>

                  {isInternal ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Tipo de Tarea</label>
                          <select
                            value={tempType}
                            onChange={(e) => setTempType(e.target.value as any)}
                            className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none cursor-pointer"
                          >
                            <option value="Interna">Única / Interna</option>
                            <option value="Programada">Programada (Fecha Específica)</option>
                            <option value="Recurrente">Recurrente / Periódica</option>
                          </select>
                        </div>

                        {tempType === 'Recurrente' ? (
                          <div className="space-y-1">
                            <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Frecuencia</label>
                            <select
                              value={tempFrequency}
                              onChange={(e) => setTempFrequency(e.target.value as any)}
                              className="w-full text-xs font-bold p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none cursor-pointer"
                            >
                              <option value="Diario">Diario</option>
                              <option value="Semanal">Semanal</option>
                              <option value="Mensual">Mensual</option>
                              <option value="Anual">Anual</option>
                            </select>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Frecuencia</label>
                            <input
                              type="text"
                              disabled
                              value="Única"
                              className="w-full text-xs p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 outline-none"
                            />
                          </div>
                        )}
                      </div>

                      {tempType === 'Interna' && (
                        <div className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="edit_tempHasNoDate"
                            checked={tempHasNoDate}
                            onChange={(e) => setTempHasNoDate(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                          />
                          <label htmlFor="edit_tempHasNoDate" className="text-xs text-slate-700 font-semibold cursor-pointer select-none">
                            ⚠️ No tiene fecha para hacerse (Sin fecha programada)
                          </label>
                        </div>
                      )}

                      {tempType === 'Programada' && (
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Fecha Programada *</label>
                          <input
                            type="date"
                            value={tempScheduledDate}
                            onChange={(e) => setTempScheduledDate(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none"
                          />
                        </div>
                      )}

                      {tempType === 'Interna' && !tempHasNoDate && (
                        <div className="space-y-1">
                          <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Nueva Fecha Programada</label>
                          <input
                            type="date"
                            value={tempScheduledDate}
                            onChange={(e) => setTempScheduledDate(e.target.value)}
                            className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                          />
                        </div>
                      )}

                      {tempType === 'Recurrente' && (
                        <div className="bg-white border border-indigo-100 rounded-xl p-3.5 space-y-3">
                          {tempFrequency === 'Semanal' && (
                            <div className="space-y-1">
                              <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Día específico de la semana</label>
                              <select
                                value={tempRecurrenceDayOfWeek}
                                onChange={(e) => setTempRecurrenceDayOfWeek(e.target.value)}
                                className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                              >
                                <option value="Lunes">Todos los Lunes</option>
                                <option value="Martes">Todos los Martes</option>
                                <option value="Miércoles">Todos los Miércoles</option>
                                <option value="Jueves">Todos los Jueves</option>
                                <option value="Viernes">Todos los Viernes</option>
                                <option value="Sábado">Todos los Sábados</option>
                                <option value="Domingo">Todos los Domingos</option>
                              </select>
                            </div>
                          )}

                          {tempFrequency === 'Mensual' && (
                            <div className="space-y-1">
                              <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Día específico del mes (1 al 31)</label>
                              <select
                                value={tempRecurrenceDayOfMonth}
                                onChange={(e) => setTempRecurrenceDayOfMonth(parseInt(e.target.value, 10))}
                                className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                              >
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                  <option key={day} value={day}>El día {day} de cada mes</option>
                                ))}
                              </select>
                            </div>
                          )}

                          {tempFrequency === 'Anual' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Día del mes</label>
                                <select
                                  value={tempRecurrenceDayOfMonth}
                                  onChange={(e) => setTempRecurrenceDayOfMonth(parseInt(e.target.value, 10))}
                                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                                >
                                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>Día {day}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="space-y-1">
                                <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Mes del año</label>
                                <select
                                  value={tempRecurrenceMonthOfYear}
                                  onChange={(e) => setTempRecurrenceMonthOfYear(parseInt(e.target.value, 10))}
                                  className="w-full text-xs font-semibold p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                                >
                                  <option value={1}>Enero</option>
                                  <option value={2}>Febrero</option>
                                  <option value={3}>Marzo</option>
                                  <option value={4}>Abril</option>
                                  <option value={5}>Mayo</option>
                                  <option value={6}>Junio</option>
                                  <option value={7}>Julio</option>
                                  <option value={8}>Agosto</option>
                                  <option value={9}>Septiembre</option>
                                  <option value={10}>Octubre</option>
                                  <option value={11}>Noviembre</option>
                                  <option value={12}>Diciembre</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Fecha de Inicio</label>
                        <input
                          type="date"
                          value={tempStartDate}
                          onChange={(e) => setTempStartDate(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-mono text-[9px] text-slate-500 font-bold uppercase">Fecha de Vencimiento</label>
                        <input
                          type="date"
                          value={tempDueDate}
                          onChange={(e) => setTempDueDate(e.target.value)}
                          className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsReprogrammingDate(false)}
                      className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-black rounded-xl transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (isInternal) {
                          setInternalTasks(prev => prev.map(t => {
                            if (t.id === task.id) {
                              return {
                                ...t,
                                type: tempType,
                                scheduledDate: tempType === 'Recurrente' ? '' : (tempType === 'Interna' && tempHasNoDate ? '' : tempScheduledDate),
                                frequency: tempType === 'Recurrente' ? tempFrequency : undefined,
                                recurrenceDayOfWeek: tempType === 'Recurrente' ? tempRecurrenceDayOfWeek : undefined,
                                recurrenceDayOfMonth: tempType === 'Recurrente' ? tempRecurrenceDayOfMonth : undefined,
                                recurrenceMonthOfYear: tempType === 'Recurrente' ? tempRecurrenceMonthOfYear : undefined,
                                hasNoDate: tempType === 'Interna' ? tempHasNoDate : undefined,
                                hasEndDate: tempType === 'Recurrente' ? tempHasEndDate : undefined,
                                recurrenceEndDate: (tempType === 'Recurrente' && tempHasEndDate) ? tempRecurrenceEndDate : undefined,
                              };
                            }
                            return t;
                          }));
                          showToast('¡Tarea reprogramada exitosamente!', 'success');
                        } else {
                          setContractorTasks(prev => prev.map(t => {
                            if (t.id === task.id) {
                              return {
                                ...t,
                                startDate: tempStartDate,
                                dueDate: tempDueDate
                              };
                            }
                            return t;
                          }));
                          showToast('¡Plazos de contratista reprogramados exitosamente!', 'success');
                        }
                        setIsReprogrammingDate(false);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl transition-all cursor-pointer"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Sub-tab renderer */}
              <AnimatePresence mode="wait">
                {activeSubTab === 'details' && (
                  <motion.div
                    key="tab-details"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-5"
                  >
                    {/* SERVICIOS / PRODUCTOS (CONSOLIDADO) block */}
                    <div className="bg-white border border-slate-100 rounded-[24px] overflow-hidden shadow-xs">
                      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase">
                          SERVICIOS / PRODUCTOS (CONSOLIDADO)
                        </span>
                        <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-full">
                          {currentItems.length} ITEMS
                        </span>
                      </div>

                      {isEditingItems ? (
                        /* Items Inline Modifier Mode */
                        <div className="p-6 space-y-4">
                          <div className="space-y-3">
                            {editingItemsList.map((itm, idx) => (
                              <div key={idx} className="flex flex-col sm:flex-row gap-3 items-center border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                                <div className="flex-1 w-full space-y-1">
                                  <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Descripción del Servicio</label>
                                  <input
                                    type="text"
                                    value={itm.name}
                                    onChange={(e) => updateItemField(idx, 'name', e.target.value)}
                                    className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                                    placeholder="Nombre del servicio o producto"
                                  />
                                </div>
                                <div className="w-20 space-y-1 shrink-0">
                                  <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Cant.</label>
                                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1">
                                    <button
                                      type="button"
                                      onClick={() => updateItemField(idx, 'qty', Math.max(1, (itm.qty || 1) - 1))}
                                      className="w-5 h-5 bg-white border rounded-md font-bold text-xs flex items-center justify-center text-slate-500 hover:bg-slate-100"
                                    >
                                      -
                                    </button>
                                    <span className="text-xs font-bold w-4 text-center">{itm.qty || 1}</span>
                                    <button
                                      type="button"
                                      onClick={() => updateItemField(idx, 'qty', (itm.qty || 1) + 1)}
                                      className="w-5 h-5 bg-white border rounded-md font-bold text-xs flex items-center justify-center text-slate-500 hover:bg-slate-100"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                                <div className="w-24 space-y-1 shrink-0">
                                  <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Precio Unit.</label>
                                  <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                                    <input
                                      type="number"
                                      value={itm.price}
                                      onChange={(e) => updateItemField(idx, 'price', parseFloat(e.target.value) || 0)}
                                      className="w-full text-xs font-bold pl-5 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                                      placeholder="0.00"
                                    />
                                  </div>
                                </div>
                                <div className="w-24 space-y-1 shrink-0">
                                  <label className="text-[9px] font-mono text-slate-400 font-bold uppercase">Ref Factura</label>
                                  <input
                                    type="text"
                                    value={itm.tag || 'INV-1002'}
                                    onChange={(e) => updateItemField(idx, 'tag', e.target.value)}
                                    className="w-full text-xs font-bold p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => deleteItem(idx)}
                                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl self-end shrink-0"
                                  title="Eliminar ítem"
                                >
                                  <Trash className="w-4 h-4" />
                                </button>
                              </div>
                            ))}
                          </div>

                          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={addNewItem}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all"
                            >
                              <Plus className="w-4 h-4 text-slate-500" /> Añadir Concepto
                            </button>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemsList(task.items || []);
                                  setIsEditingItems(false);
                                }}
                                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-black text-xs transition-all"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveItems}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs transition-all"
                              >
                                Guardar Lista
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Items Display Mode */
                        <div className="divide-y divide-slate-100">
                          {currentItems.map((itm, idx) => {
                            const isQtyMoreThanOne = itm.qty && itm.qty > 1;
                            const totalVal = itm.price * (itm.qty || 1);
                            return (
                              <div key={idx} className="px-6 py-4.5 flex justify-between items-center hover:bg-slate-50/40 transition-colors">
                                <div className="flex items-center gap-3.5">
                                  {/* Beautiful shopping tag icon */}
                                  <div className="p-2.5 bg-indigo-50/60 border border-indigo-100 text-indigo-600 rounded-xl shrink-0">
                                    <ShoppingCart className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-sans font-black text-slate-800 text-[13px]">
                                        {itm.name}
                                      </span>
                                      {isQtyMoreThanOne && (
                                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider">
                                          x{itm.qty}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] font-mono font-black text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded block w-fit mt-1 border border-slate-200/50">
                                      {itm.tag || 'INV-1002'}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-sans font-black text-slate-800 text-[14px]">
                                    ${totalVal.toFixed(2)}
                                  </span>
                                  {isQtyMoreThanOne && (
                                    <span className="text-[10px] text-slate-400 block mt-0.5 font-medium">
                                      ${itm.price.toFixed(2)} c/u
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {/* Total Consolidated Row */}
                          <div className="px-6 py-5 bg-slate-50/50 flex justify-between items-center border-t border-slate-100">
                            <div>
                              <span className="text-[11px] font-sans font-black text-slate-400 tracking-wider block uppercase">
                                TOTAL GLOBAL
                              </span>
                              <span className="text-[10px] font-mono font-extrabold text-slate-400 block mt-0.5">
                                (SUMA DE FACTURAS)
                              </span>
                            </div>
                            <span className="text-2xl font-sans font-black text-emerald-700 tracking-tight">
                              ${totalPrice.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Original Instructions / Specifications */}
                    <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-2">
                      <span className="text-[10px] block text-slate-400 font-mono font-black tracking-wider uppercase">
                        INSTRUCCIONES / ESPECIFICACIONES
                      </span>
                      <p className="text-slate-600 text-xs leading-relaxed bg-slate-50 border border-slate-100/60 rounded-2xl p-4 whitespace-pre-wrap">
                        {task.notes || 'No se registraron especificaciones adicionales para esta actividad de servicio.'}
                      </p>
                    </div>

                    {/* Follow up log comments */}
                    <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-3">
                      <span className="text-[10px] block text-slate-400 font-mono font-black tracking-wider uppercase">
                        HISTORIAL DE BITÁCORA Y SEGUIMIENTO
                      </span>
                      
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        <div className="border-l-2 border-emerald-500 pl-3.5 py-0.5">
                          <span className="text-[9px] font-mono font-bold text-slate-400 block">CREACIÓN</span>
                          <p className="text-slate-700 text-xs font-semibold">Registro técnico iniciado en el CRM y asignado.</p>
                        </div>

                        {!isInternal && (task as any).followUpNotes && (
                          <div className="border-l-2 border-indigo-500 pl-3.5 py-1">
                            <span className="text-[9px] font-mono font-bold text-indigo-400 block">ACTUALIZACIÓN DE CAMPO</span>
                            <p className="text-slate-600 text-xs whitespace-pre-wrap mt-0.5">
                              {(task as any).followUpNotes}
                            </p>
                          </div>
                        )}

                        {isInternal && (task as any).completionReport && (
                          <div className="border-l-2 border-indigo-500 pl-3.5 py-1">
                            <span className="text-[9px] font-mono font-bold text-indigo-400 block">REPORTE DE CONCLUSIÓN</span>
                            <p className="text-slate-600 text-xs whitespace-pre-wrap mt-0.5">
                              {(task as any).completionReport}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Add comment input */}
                      <div className="pt-2 border-t border-slate-100 space-y-2">
                        <textarea
                          value={modalFollowUpInput}
                          onChange={(e) => setModalFollowUpInput(e.target.value)}
                          placeholder="Añade un comentario rápido al historial de seguimiento..."
                          className="w-full text-xs p-3 bg-slate-50 border border-slate-150 rounded-xl text-slate-800 outline-none focus:bg-white focus:border-indigo-400 resize-none min-h-[50px] transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!modalFollowUpInput.trim()) {
                              showToast('Por favor, ingresa una nota válida.', 'error');
                              return;
                            }
                            if (isInternal) {
                              setInternalTasks(prev => prev.map(t => t.id === task.id ? { 
                                ...t, 
                                notes: t.notes ? t.notes + '\n• Actualización: ' + modalFollowUpInput.trim() : '• Actualización: ' + modalFollowUpInput.trim() 
                              } : t));
                            } else {
                              setContractorTasks(prev => prev.map(t => t.id === task.id ? { 
                                ...t, 
                                followUpNotes: t.followUpNotes ? t.followUpNotes + '\n• ' + modalFollowUpInput.trim() : '• ' + modalFollowUpInput.trim() 
                              } : t));
                            }
                            setModalFollowUpInput('');
                            showToast('Historial de bitácora actualizado con éxito.', 'success');
                          }}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" /> Registrar en Bitácora
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'cliente' && (
                  <motion.div
                    key="tab-cliente"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Detailed Client Information Profile */}
                    <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-xs space-y-5">
                      <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
                        <img
                          src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120"
                          alt="Sarah Jenkins"
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-[20px] object-cover border border-slate-200"
                        />
                        <div>
                          <h4 className="font-sans font-black text-lg text-slate-800">
                            {task.clientName || 'Sarah Jenkins'}
                          </h4>
                          <span className="bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg text-[10px] font-black tracking-wider uppercase block w-fit mt-1">
                            Categoría: VIP Priority
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">Correo Electrónico</span>
                          <span className="text-xs font-bold text-slate-700">sarah.jenkins@example.com</span>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">Número Celular</span>
                          <span className="text-xs font-bold text-slate-700">+1 (555) 019-2834</span>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">Segmento de Cuenta</span>
                          <span className="text-xs font-bold text-slate-700">Tier 1 Corporativo</span>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">Miembro Desde</span>
                          <span className="text-xs font-bold text-slate-700">Octubre 12, 2025</span>
                        </div>
                      </div>

                      <div className="space-y-1 bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl">
                        <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">Notas y Preferencias del Cliente</span>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                          Prefiere visitas programadas en horarios de la mañana. Requiere una inspección técnica antes de cualquier instalación completa de productos dermatológicos.
                        </p>
                      </div>

                      <div className="space-y-2 pt-2">
                        <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase block">
                          Historial de Solicitudes Recientes
                        </span>
                        <div className="divide-y divide-slate-100 bg-slate-50 border border-slate-100 rounded-xl overflow-hidden text-xs">
                          <div className="p-3 flex justify-between items-center font-medium">
                            <span>APT-2629 - Full Installation & Serum</span>
                            <span className="text-purple-600 font-bold">Activo</span>
                          </div>
                          <div className="p-3 flex justify-between items-center font-medium text-slate-500">
                            <span>APT-2415 - Skin Diagnosis Consultation</span>
                            <span className="text-emerald-600 font-bold">Completada</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSubTab === 'finanzas' && (
                  <motion.div
                    key="tab-finanzas"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {/* Financial Summary card */}
                    <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-xs space-y-5">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div>
                          <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest block">
                            ESTADO DE FACTURACIÓN
                          </span>
                          <span className="text-slate-800 text-lg font-black mt-1 block">
                            Ref: INV-1002 (Consolidada)
                          </span>
                        </div>
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase">
                          Pagada
                        </span>
                      </div>

                      <div className="space-y-3.5 bg-slate-50/50 border border-slate-100 p-4.5 rounded-2xl">
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                          <span>Suma de Conceptos (Subtotal)</span>
                          <span className="text-slate-800 font-bold">${totalPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                          <span>Impuesto de Consumo / IVA (16%)</span>
                          <span className="text-slate-800 font-bold">${taxValue.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs font-semibold text-slate-600">
                          <span>Descuentos Aplicados</span>
                          <span className="text-emerald-600 font-bold">-$0.00</span>
                        </div>
                        <div className="h-px bg-slate-200 my-1" />
                        <div className="flex justify-between items-center text-sm font-black text-slate-800">
                          <span>Total Neto (Con Impuestos)</span>
                          <span className="text-emerald-700 text-base">${grandTotal.toFixed(2)}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">Método de Pago</span>
                          <span className="text-xs font-bold text-slate-700">Tarjeta de Crédito (*4242)</span>
                        </div>
                        <div className="bg-slate-50/50 border border-slate-100 p-3.5 rounded-xl space-y-1">
                          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase block">Fecha de Transacción</span>
                          <span className="text-xs font-bold text-slate-700">3/15/2026 | 10:45 AM</span>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => showToast('Descargando comprobante de factura INV-1002 (Simulado)', 'info')}
                          className="flex-1 py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs text-center transition-all cursor-pointer"
                        >
                          Descargar PDF de Factura
                        </button>
                        <button
                          type="button"
                          onClick={() => showToast('Enlace de pago manual enviado por correo.', 'success')}
                          className="flex-1 py-3 bg-white hover:bg-slate-100 border border-slate-250 text-slate-700 rounded-xl font-bold text-xs text-center transition-all cursor-pointer"
                        >
                          Enviar Comprobante
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Right Column (4/12 Span) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* ESTADO ACTUAL Box */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-3 relative">
                <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase block">
                  ESTADO ACTUAL
                </span>

                <button
                  onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                  className="w-full py-3.5 px-4 bg-purple-50/60 hover:bg-purple-100/50 border border-purple-200/60 rounded-2xl flex items-center justify-center gap-2.5 text-purple-700 font-bold transition-all text-sm cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    {task.status === 'Completado' ? 'Finalizada' : (task.status === 'En proceso' || task.status === 'En proceso por Contratista' ? 'En Proceso' : 'Pendiente')}
                  </span>
                  <ChevronDown className="w-4 h-4 text-purple-400 shrink-0 ml-1" />
                </button>

                {/* Status Options Dropdown Popup */}
                {showStatusDropdown && (
                  <div className="absolute top-[85px] left-5 right-5 bg-white border border-slate-200 rounded-[20px] p-2 shadow-lg z-30 animate-scaleIn space-y-1">
                    {isInternal ? (
                      <>
                        <button
                          onClick={() => {
                            handleUpdateInternalTaskStatus(task.id, 'Pendiente');
                            setShowStatusDropdown(false);
                            showToast('Estado cambiado a: Pendiente', 'info');
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-slate-400" /> PENDIENTE
                        </button>
                        <button
                          onClick={() => {
                            handleUpdateInternalTaskStatus(task.id, 'En proceso');
                            setShowStatusDropdown(false);
                            showToast('Estado cambiado a: En Proceso', 'info');
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-amber-500" /> EN PROCESO
                        </button>
                        <button
                          onClick={() => {
                            handleUpdateInternalTaskStatus(task.id, 'Completado');
                            setShowStatusDropdown(false);
                            showToast('Estado cambiado a: Completado', 'success');
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-500" /> COMPLETADO
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setContractorTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Asignado a Contratista' } : t));
                            setShowStatusDropdown(false);
                            showToast('Estado cambiado a: Asignado a Contratista', 'info');
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-slate-400" /> ASIGNADO A CONTRATISTA
                        </button>
                        <button
                          onClick={() => {
                            setContractorTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'En proceso por Contratista' } : t));
                            setShowStatusDropdown(false);
                            showToast('Estado cambiado a: En Proceso', 'info');
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-amber-500" /> EN PROCESO
                        </button>
                        <button
                          onClick={() => {
                            setContractorTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Completado' } : t));
                            setShowStatusDropdown(false);
                            showToast('Estado cambiado a: Completado', 'success');
                          }}
                          className="w-full text-left p-2.5 hover:bg-slate-50 text-slate-700 font-semibold text-xs rounded-lg flex items-center gap-2"
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-500" /> COMPLETADO
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* ACCIONES DISPONIBLES Box */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-3">
                <span className="text-[10px] font-mono font-black text-slate-400 tracking-wider uppercase block">
                  ACCIONES DISPONIBLES
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  {/* Reprogramar Button */}
                  <button
                    onClick={() => setIsReprogrammingDate(!isReprogrammingDate)}
                    className={`p-4 border text-[11px] font-black rounded-[20px] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                      isReprogrammingDate
                        ? 'bg-indigo-600 border-indigo-700 text-white'
                        : 'bg-slate-50 hover:bg-indigo-50/50 border-slate-100 hover:border-indigo-150 text-slate-700 hover:text-indigo-600'
                    }`}
                  >
                    <CalendarIcon className={`w-5 h-5 ${isReprogrammingDate ? 'text-white' : 'text-indigo-500'}`} />
                    <span>Reprogramar</span>
                  </button>

                  {/* Modificar Button (Toggle Services Modifier) */}
                  <button
                    onClick={() => {
                      if (activeSubTab !== 'details') {
                        setActiveSubTab('details');
                      }
                      setIsEditingItems(!isEditingItems);
                    }}
                    className={`p-4 border text-[11px] font-black rounded-[20px] flex flex-col items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${
                      isEditingItems
                        ? 'bg-purple-600 border-purple-700 text-white'
                        : 'bg-slate-50 hover:bg-purple-50/50 border-slate-100 hover:border-purple-150 text-slate-700 hover:text-purple-600'
                    }`}
                  >
                    <Edit3 className={`w-5 h-5 ${isEditingItems ? 'text-white' : 'text-purple-500'}`} />
                    <span>Modificar</span>
                  </button>
                </div>
              </div>

              {/* Elegant Note Box (exact quote) */}
              <div className="bg-indigo-50/35 border border-indigo-100/60 p-4.5 rounded-[24px] flex items-start gap-2.5">
                <Info className="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-500 italic leading-relaxed font-sans font-medium">
                  "Asegúrate de verificar la disponibilidad antes de reprogramar para evitar conflictos en la agenda."
                </p>
              </div>

              {/* Technical Conclusion Closure Card / Final Action */}
              <div className="bg-slate-900 rounded-[24px] p-5 text-white shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[9px] block text-indigo-300 font-mono font-black uppercase tracking-widest">CIERRE DE TICKET</span>
                    <h4 className="font-sans font-black text-[13px] uppercase tracking-wide">Conclusión Técnica</h4>
                  </div>
                  <CheckCircle className={`w-5 h-5 ${task.status === 'Completado' ? 'text-emerald-400' : 'text-slate-600'}`} />
                </div>

                {task.status !== 'Completado' ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[9px] text-indigo-300 font-mono font-bold uppercase block">
                        COMENTARIOS FINALES O REPORTE DE CONCLUSIÓN
                      </label>
                      <textarea
                        value={modalReportInput}
                        onChange={(e) => setModalReportInput(e.target.value)}
                        placeholder="Escribe aquí las observaciones del trabajo concluido..."
                        className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-indigo-100 placeholder-slate-600 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 min-h-[70px] resize-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const nowIso = new Date().toISOString();
                        if (isInternal) {
                          const completedTask = { 
                            ...task, 
                            status: 'Completado', 
                            completionReport: modalReportInput.trim() || 'Completado con éxito.',
                            completedDate: nowIso,
                            CompletedDate: nowIso
                          };
                          setInternalTasks(prev => prev.map(t => t.id === task.id ? completedTask : t));
                          saveSingleInternalTask(completedTask);
                        } else {
                          setContractorTasks(prev => prev.map(t => t.id === task.id ? { 
                            ...t, 
                            status: 'Completado', 
                            completedDate: nowIso,
                            CompletedDate: nowIso,
                            followUpNotes: (t.followUpNotes ? t.followUpNotes + '\n• ' : '') + 'Trabajo Completado. Conclusión: ' + (modalReportInput.trim() || 'Servicio entregado con éxito.')
                          } : t));
                        }
                        setSelectedTaskForModal(null);
                        setModalReportInput('');
                        showToast('¡Caso técnico cerrado exitosamente!', 'success');
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer text-center font-bold"
                    >
                      Finalizar Tarea y Cerrar Ticket
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-3 rounded-xl text-xs space-y-1">
                      <span className="font-mono font-bold block">ESTADO: COMPLETADO</span>
                      <p className="font-medium">
                        El ticket de trabajo está cerrado. Las observaciones finales han sido archivadas correctamente.
                      </p>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (isInternal) {
                          const reopenedTask = { ...task, status: 'En proceso', completionReport: undefined };
                          setInternalTasks(prev => prev.map(t => t.id === task.id ? reopenedTask : t));
                          saveSingleInternalTask(reopenedTask);
                        } else {
                          setContractorTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'Asignado a Contratista' } : t));
                        }
                        showToast('Trabajo re-abierto para modificaciones.', 'info');
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer text-center"
                    >
                      Reabrir Tarea
                    </button>
                  </div>
                )}
              </div>

              {/* Administrative Actions */}
              <div className="bg-white border border-slate-100 rounded-[24px] p-5 shadow-xs space-y-3">
                <span className="text-[10px] block text-slate-400 font-mono font-bold uppercase tracking-wider">
                  ACCIONES ADMINISTRATIVAS
                </span>

                {showDeleteConfirm ? (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 space-y-3">
                    <p className="text-[11px] text-rose-700 font-bold leading-normal text-center">
                      ⚠️ ¿Está seguro de que desea eliminar permanentemente este registro de tarea?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (isInternal) {
                            handleDeleteInternalTask(task.id);
                          } else {
                            handleDeleteContractorTask(task.id);
                          }
                          setSelectedTaskForModal(null);
                          setShowDeleteConfirm(false);
                        }}
                        className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer text-center shadow-xs"
                      >
                        Sí, Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full py-2.5 bg-rose-50 hover:bg-rose-100/50 text-rose-600 font-black text-xs rounded-xl flex items-center justify-center gap-2 border border-rose-200/50 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 text-rose-500" />
                    <span>Eliminar Registro</span>
                  </button>
                )}
              </div>

            </div>
          </div>

        </motion.div>

        {/* Floating Pill-Shaped Bottom Footer Tab Navigation Bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="bg-white/95 backdrop-blur-md rounded-full px-2.5 py-2 shadow-xl border border-slate-200/50 flex gap-1 z-20 items-center justify-center mt-5 shrink-0"
        >
          {/* Tab: DETALLES */}
          <button
            onClick={() => {
              setActiveSubTab('details');
              setIsEditingItems(false);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs transition-all cursor-pointer ${
              activeSubTab === 'details' 
                ? 'bg-[#0d5236] text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>DETALLES</span>
          </button>

          {/* Tab: CLIENTE */}
          <button
            onClick={() => {
              setActiveSubTab('cliente');
              setIsEditingItems(false);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs transition-all cursor-pointer ${
              activeSubTab === 'cliente' 
                ? 'bg-[#0d5236] text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <User className="w-4 h-4" />
            <span>CLIENTE</span>
          </button>

          {/* Tab: FINANZAS */}
          <button
            onClick={() => {
              setActiveSubTab('finanzas');
              setIsEditingItems(false);
            }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-black text-xs transition-all cursor-pointer ${
              activeSubTab === 'finanzas' 
                ? 'bg-[#0d5236] text-white shadow-md' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>FINANZAS</span>
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
