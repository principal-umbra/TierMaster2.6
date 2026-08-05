import React, { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import { Agent } from '../../types';
import { AsistenciaRow } from '../../types';
import { pushAsistencia } from '../../db/asistenciaService';

interface Props {
  agent: Agent;
  asistencia: AsistenciaRow[];
  selectedDate: string;
  expectedCheckIn: string | null;
  expectedCheckOut: string | null;
  onChange: (row: AsistenciaRow) => void;
  webhookUrl?: string;
  spreadsheetId?: string;
  googleToken?: string | null;
  activeAbsence?: { type: string; startDate: string; endDate: string } | null;
  activeVisit?: any;
  hadVisit?: boolean;
}

export const AsistenciaRowComponent: React.FC<Props> = ({ 
  agent, 
  asistencia, 
  selectedDate, 
  expectedCheckIn, 
  expectedCheckOut, 
  onChange, 
  webhookUrl, 
  spreadsheetId, 
  googleToken, 
  activeAbsence,
  activeVisit,
  hadVisit
}) => {
    const existing = asistencia.find(a => a.idAgente === agent.id && a.fecha === selectedDate);
    
    // Default values if not existing
    const [isManualEdit, setIsManualEdit] = useState(false);
    const checkIn = existing?.checkIn || '';
    const checkOut = existing?.checkOut || '';
    
    const [localCheckIn, setLocalCheckIn] = useState(checkIn);
    const [localCheckOut, setLocalCheckOut] = useState(checkOut);

    useEffect(() => {
        setLocalCheckIn(checkIn);
    }, [checkIn]);

    useEffect(() => {
        setLocalCheckOut(checkOut);
    }, [checkOut]);

    const absenceDetail = activeAbsence
        ? (activeAbsence.horaInicio && activeAbsence.horaFin 
            ? `${activeAbsence.type} (${activeAbsence.horaInicio} - ${activeAbsence.horaFin})`
            : activeAbsence.duracionTipo && activeAbsence.duracionTipo !== 'Día Completo'
            ? `${activeAbsence.type} (${activeAbsence.duracionTipo})`
            : (activeAbsence.type === 'Vacaciones' ? 'Vacaciones' : activeAbsence.type || 'Permiso'))
        : '';

    const scheduledTimeStr = activeAbsence
        ? absenceDetail
        : (expectedCheckIn && expectedCheckOut ? `${expectedCheckIn} - ${expectedCheckOut}` : 'Libre');
    
    // El estado por defecto será vacío o calculado si no hay justificación manual
    let estado = existing?.estado || '';
    
    // If the database has 'Visita' but there is no active visit (or the visit is closed), treat it as empty
    if (estado === 'Visita' && (!activeVisit || activeVisit.estado_visita === 'Cerrada')) {
        estado = '';
    }
    
    // If they have an active visit and no manual override (other than previous 'Home Office' workaround) is selected, default to 'Visita'
    if (activeVisit && activeVisit.estado_visita !== 'Cerrada' && (!estado || estado === 'Home Office')) {
        estado = 'Visita';
    }
    
    const manualStates = ['Presente', 'Inasistencia', 'Ausente', 'Tardanza', 'Permiso', 'Vacaciones', 'Licencia Médica', 'Suspensión', 'Feriado', 'Libre', 'Home Office', 'Visita'];
    
    // Determine displayEstado cleanly and consistently for all agents under the same exact criteria
    let displayEstado = 'Sin registro';
    
    if (activeAbsence) {
        displayEstado = absenceDetail;
    } else if (estado && estado !== 'Visita') {
        displayEstado = estado;
    } else if (checkIn) {
        if (hadVisit || activeVisit || existing?.estado === 'Visita' || existing?.esJustificacion) {
            displayEstado = 'Presente';
        } else if (expectedCheckIn) {
            const [cHour, cMin] = checkIn.split(':').map(Number);
            const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
            const diff = (cHour * 60 + cMin) - (eHour * 60 + eMin);
            
            if (diff > 15) {
                displayEstado = 'Tardanza'; // Over 15 mins late
            } else if (diff > 0) {
                displayEstado = 'Gracia'; // Within 15 min grace period
            } else {
                displayEstado = 'Presente'; // On time or early is Presente
            }
        } else {
            displayEstado = 'Presente';
        }
    } else {
        // No check-in time logged, and no manual status/absence
        if (expectedCheckIn) {
            const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
            if (selectedDate < todayStr) {
                displayEstado = 'Inasistencia'; // Past days are automatically marked Inasistencia if no check-in
            } else if (selectedDate === todayStr) {
                const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
                const now = new Date();
                const nowMin = now.getHours() * 60 + now.getMinutes();
                const startMin = eHour * 60 + eMin;
                if (nowMin > startMin + 15) {
                    displayEstado = 'Inasistencia'; // Past start time without check-in
                } else {
                    displayEstado = 'Sin registro';
                }
            } else {
                displayEstado = 'Sin registro';
            }
        } else {
            displayEstado = 'Libre';
        }
    }

    const handleUpdate = (field: keyof AsistenciaRow, value: string) => {
        const baseRow: AsistenciaRow = existing || {
            id: `${selectedDate}_${agent.id}`,
            fecha: selectedDate,
            idAgente: agent.id,
            nombreAgente: agent.name,
            checkIn: '',
            checkOut: '',
            estado: '',
            ultimaActualizacion: new Date().toISOString()
        };
        const payload: AsistenciaRow = {
            ...baseRow,
            fecha: selectedDate,
            ultimaActualizacion: new Date().toISOString(),
            [field]: value
        };

        if (field === 'checkIn' || field === 'checkOut') {
            const isJustificationLocal = manualStates.includes(payload.estado);
            if (!isJustificationLocal) {
                payload.estado = ''; // clear out manual state so display logic recalculates
            }
        }
        
        onChange(payload);
    };

    return (
        <tr className="hover:bg-slate-50 transition-colors">
            <td className="px-4 py-3">
                <div className="font-semibold text-slate-800">{agent.name}</div>
                {activeVisit && (
                    <div className="text-[10px] text-indigo-600 font-bold mt-1 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        💼 Visita: {activeVisit.cliente_visita || activeVisit.cliente || activeVisit.cuenta || 'Ver detalles'} ({activeVisit.estado_visita})
                    </div>
                )}
            </td>
            <td className="px-4 py-3">
                <span className="font-mono text-[11px] font-bold text-slate-500 whitespace-nowrap bg-slate-100 px-2 py-1 rounded">
                    {scheduledTimeStr}
                </span>
            </td>
            <td className="px-4 py-3">
                <input 
                  type="time" 
                  className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 w-full disabled:bg-slate-50 disabled:text-slate-400"
                  value={activeAbsence ? '' : localCheckIn}
                  disabled={!!activeAbsence}
                  onChange={(e) => {
                      const val = e.target.value;
                      setLocalCheckIn(val);
                      if (val === '' || val.length === 5) {
                          handleUpdate('checkIn', val);
                      }
                  }}
                  onBlur={() => handleUpdate('checkIn', localCheckIn)}
                />
            </td>
            <td className="px-4 py-3">
                <input 
                  type="time" 
                  className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 w-full disabled:bg-slate-50 disabled:text-slate-400"
                  value={activeAbsence ? '' : localCheckOut}
                  disabled={!!activeAbsence}
                  onChange={(e) => {
                      const val = e.target.value;
                      setLocalCheckOut(val);
                      if (val === '' || val.length === 5) {
                          handleUpdate('checkOut', val);
                      }
                  }}
                  onBlur={() => handleUpdate('checkOut', localCheckOut)}
                />
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                {activeAbsence ? (
                    <span className="text-xs flex-1 px-2 min-w-[120px] font-bold text-indigo-600 bg-indigo-50/50 py-1 rounded text-center border border-indigo-150">
                        🏖️ {displayEstado}
                    </span>
                ) : isManualEdit ? (
                    <select 
                      className="border border-slate-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 w-full"
                      value={estado}
                      onChange={(e) => handleUpdate('estado', e.target.value)}
                    >
                        <option value="">Seleccionar Justificación...</option>
                        <option value="Presente">Presente</option>
                        <option value="Inasistencia">Inasistencia (Sin Check-in)</option>
                        <option value="Ausente">Ausente</option>
                        <option value="Tardanza">Tardanza</option>
                        <option value="Permiso">Permiso</option>
                        <option value="Vacaciones">Vacaciones</option>
                        <option value="Licencia Médica">Licencia Médica</option>
                        <option value="Suspensión">Suspensión</option>
                        <option value="Feriado">Feriado</option>
                        <option value="Libre">Libre</option>
                        <option value="Home Office">Home Office</option>
                        <option value="Visita">Visita Técnica</option>
                    </select>
                ) : (
                    <span className={`text-xs flex-1 px-2 min-w-[120px] font-bold ${
                        displayEstado === 'Presente' ? 'text-emerald-700 bg-emerald-50 border border-emerald-200 py-1 rounded text-center' :
                        (displayEstado === 'Inasistencia' || displayEstado === 'Ausente' || displayEstado === 'Falta') ? 'text-rose-700 bg-rose-50 border border-rose-200 py-1 rounded text-center font-bold' :
                        (displayEstado === 'Tardanza' || displayEstado === 'En Falta' || displayEstado === 'Gracia') ? 'text-amber-700 bg-amber-50 border border-amber-200 py-1 rounded text-center' :
                        displayEstado === 'Requiere justificación' ? 'text-red-700 bg-red-50 border border-red-200 py-1 rounded text-center' :
                        displayEstado === 'Permiso' ? 'text-blue-700 bg-blue-50 border border-blue-200 py-1 rounded text-center' :
                        displayEstado === 'Vacaciones' ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 py-1 rounded text-center' :
                        displayEstado === 'Licencia Médica' ? 'text-purple-700 bg-purple-50 border border-purple-200 py-1 rounded text-center' :
                        displayEstado === 'Suspensión' ? 'text-red-700 bg-red-50 border border-red-200 py-1 rounded text-center' :
                        displayEstado === 'Feriado' ? 'text-fuchsia-700 bg-fuchsia-50 border border-fuchsia-200 py-1 rounded text-center' :
                        displayEstado === 'Libre' ? 'text-teal-700 bg-teal-50 border border-teal-200 py-1 rounded text-center' :
                        displayEstado === 'Home Office' ? 'text-cyan-700 bg-cyan-50 border border-cyan-200 py-1 rounded text-center' :
                        displayEstado === 'Visita' ? 'text-indigo-700 bg-indigo-50 border border-indigo-200 py-1 rounded text-center font-bold' :
                        'text-slate-500 bg-slate-50 border border-slate-200 py-1 rounded text-center'
                    }`}>{displayEstado}</span>
                )}
                
                {!activeAbsence && (
                    <button 
                       type="button"
                       onClick={() => setIsManualEdit(!isManualEdit)}
                       className={`transition-colors ${isManualEdit ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                       title="Justificar Manualmente"
                    >
                       <Edit2 className="w-3 h-3" />
                    </button>
                )}
                </div>
            </td>
        </tr>
    );
};
