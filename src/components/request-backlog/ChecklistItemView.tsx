import React, { useState, useRef, useEffect } from 'react';
import { User, Calendar, Check, X, FileText, Users } from 'lucide-react';
import { Agent } from '../../types';
import { formatFlexibleDate, parseFlexibleDateToDateTimeLocal } from '../../utils/date-helpers';

interface ChecklistItemViewProps {
  item: any;
  agents: Agent[];
  defaultAssigneeId?: string;
  onUpdate: (updates: any) => void;
  onRemove: () => void;
  onToggle: () => void;
}

export const ChecklistItemView: React.FC<ChecklistItemViewProps> = ({ item, agents, defaultAssigneeId, onUpdate, onRemove, onToggle }) => {
  const [showDescription, setShowDescription] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(item.description || '');
  const [showAssigneeDropdown, setShowAssigneeDropdown] = useState(false);
  const [editingStartDate, setEditingStartDate] = useState(false);
  const [editingDueDate, setEditingDueDate] = useState(false);
  
  const currentAssignees = item.assigneeIds || (item.assigneeId ? [item.assigneeId] : (defaultAssigneeId ? [defaultAssigneeId] : []));

  const toggleAssignee = (agentId: string) => {
    const newAssignees = currentAssignees.includes(agentId)
      ? currentAssignees.filter((id: string) => id !== agentId)
      : [...currentAssignees, agentId];
    onUpdate({ assigneeIds: newAssignees });
  };

  const handleSaveDescription = () => {
    onUpdate({ description: descriptionDraft });
    setIsEditingDescription(false);
  };

  return (
    <div className={`relative flex flex-col gap-2 pl-4 pr-3 py-3 rounded-xl border-y border-r border-l-4 transition-all duration-300 group ${item.completed ? 'bg-slate-50/50 border-slate-200 border-l-slate-300 opacity-70 hover:opacity-100' : 'bg-white border-slate-200 border-l-indigo-400 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-indigo-200 hover:border-l-indigo-500 hover:-translate-y-0.5'} ${showAssigneeDropdown || showDescription ? 'z-50' : 'z-10'}`}>
      <div className="flex items-start gap-3 w-full">
        <div onClick={onToggle} className="flex items-start gap-3 cursor-pointer flex-1 min-w-0 mt-0.5">
          <div className={`mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-white shrink-0 transition-all duration-300 shadow-sm ${item.completed ? 'bg-indigo-500 scale-110 shadow-indigo-200 ring-2 ring-indigo-100' : 'bg-slate-50 group-hover:bg-white group-hover:border-indigo-400 border-[1.5px] border-slate-300 text-transparent'}`}>
            <Check className={`w-3.5 h-3.5 transition-opacity duration-300 ${item.completed ? 'opacity-100' : 'opacity-0'}`} />
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className={`text-sm font-semibold break-words leading-snug transition-colors duration-300 ${item.completed ? 'line-through text-slate-400 font-medium' : 'text-slate-800'}`}>
              {item.title}
            </span>
            
            {/* Functional Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
              
              {/* Assignee Selection */}
              <div className="relative">
                <button 
                  onClick={() => setShowAssigneeDropdown(!showAssigneeDropdown)}
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded-full transition-all cursor-pointer border ${currentAssignees.length > 0 ? 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50'}`}
                >
                  {(() => {
                    const primaryId = currentAssignees[0];
                    const primaryAgent = agents.find(a => a.id === primaryId);
                    const collabIds = currentAssignees.slice(1);
                    const collabs = collabIds.map(id => agents.find(a => a.id === id)).filter(Boolean) as Agent[];

                    if (!primaryAgent) {
                      return (
                        <div className="flex items-center gap-1.5 px-1">
                          <div className="w-3.5 h-3.5 rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
                            <User className="w-2.5 h-2.5" />
                          </div>
                          <span className="text-[10px] font-bold text-slate-500">Asignar</span>
                        </div>
                      );
                    }
                    
                    return (
                      <div className="flex items-center pr-1 divide-x divide-indigo-200/60">
                        <div className="flex items-center gap-1.5 pr-2">
                          {primaryAgent.avatar ? (
                            <img src={primaryAgent.avatar} alt={primaryAgent.name} className="w-4 h-4 rounded-full bg-indigo-100 object-cover ring-2 ring-white" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-[8px] font-bold ring-2 ring-white">
                              {primaryAgent.initials || primaryAgent.name.charAt(0)}
                            </div>
                          )}
                          <span className="text-[10px] font-bold text-indigo-700 leading-none">{primaryAgent.name.split(' ')[0]}</span>
                        </div>
                        
                        {collabs.length > 0 && (
                          <div className="flex items-center pl-2">
                            <div className="flex -space-x-1.5 mr-1">
                              {collabs.slice(0, 3).map((agent, i) => (
                                agent.avatar ? (
                                  <img key={agent.id} src={agent.avatar} alt={agent.name} className="w-4 h-4 rounded-full bg-indigo-100 ring-2 ring-white object-cover" style={{ zIndex: 10 - i }} title={agent.name} />
                                ) : (
                                  <div key={agent.id} className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-[8px] font-bold ring-2 ring-white" style={{ zIndex: 10 - i }} title={agent.name}>
                                    {agent.initials || agent.name.charAt(0)}
                                  </div>
                                )
                              ))}
                            </div>
                            {collabs.length > 3 && (
                              <span className="text-[9px] font-bold text-indigo-500">+{collabs.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </button>
                
                {showAssigneeDropdown && (
                  <div className="absolute top-full left-0 mt-1.5 w-60 bg-white border border-slate-200 shadow-xl rounded-xl p-2 z-50 flex flex-col gap-2 cursor-default" onClick={e => e.stopPropagation()}>
                    {/* Selected */}
                    {currentAssignees.length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">Seleccionados</div>
                        <div className="flex flex-col gap-0.5">
                          {currentAssignees.map(id => {
                            const agent = agents.find(a => a.id === id);
                            if (!agent) return null;
                            const isPrimary = id === currentAssignees[0];
                            return (
                              <div key={id} className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-50 rounded-lg group">
                                <div className="flex items-center gap-2">
                                  {agent.avatar ? (
                                    <img src={agent.avatar} alt={agent.name} className="w-5 h-5 rounded-full bg-indigo-100 object-cover" />
                                  ) : (
                                    <div className="w-5 h-5 rounded-full bg-indigo-200 flex items-center justify-center text-indigo-700 text-[9px] font-bold">
                                      {agent.initials || agent.name.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex flex-col">
                                    <span className="text-xs text-slate-700 font-medium leading-none">{agent.name}</span>
                                    <span className="text-[9px] text-slate-400">{isPrimary ? 'Responsable' : 'Colaborador'}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); toggleAssignee(id); }}
                                  className="text-slate-300 hover:text-rose-500 hover:bg-rose-50 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Divider if both exist */}
                    {currentAssignees.length > 0 && agents.filter(a => !currentAssignees.includes(a.id)).length > 0 && (
                      <div className="h-px bg-slate-100 mx-1 my-0.5"></div>
                    )}

                    {/* Available */}
                    {agents.filter(a => !currentAssignees.includes(a.id)).length > 0 && (
                      <div className="flex flex-col gap-1">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-1">Disponibles</div>
                        <div className="max-h-40 overflow-y-auto pr-1 flex flex-col gap-0.5 custom-scrollbar">
                          {agents.filter(a => !currentAssignees.includes(a.id)).map(agent => (
                            <label key={agent.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-lg cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={false}
                                onChange={() => toggleAssignee(agent.id)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                              />
                              <div className="flex items-center gap-2">
                                {agent.avatar ? (
                                  <img src={agent.avatar} alt={agent.name} className="w-5 h-5 rounded-full bg-slate-100 object-cover" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-[9px] font-bold">
                                    {agent.initials || agent.name.charAt(0)}
                                  </div>
                                )}
                                <span className="text-xs text-slate-600 font-medium">{agent.name}</span>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Start Date */}
              <div className="relative">
                {editingStartDate ? (
                  <input
                    type="datetime-local"
                    autoFocus
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-400 text-emerald-800 bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm"
                    value={parseFlexibleDateToDateTimeLocal(item.startDate)}
                    onChange={e => onUpdate({ startDate: e.target.value })}
                    onBlur={() => setEditingStartDate(false)}
                  />
                ) : (
                  <button 
                    onClick={() => setEditingStartDate(true)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer border ${item.startDate ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-300 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                  >
                    <Calendar className="w-3 h-3" />
                    {item.startDate ? `Inicio: ${formatFlexibleDate(item.startDate)}` : 'Inicio'}
                  </button>
                )}
              </div>
              
              {/* Due Date */}
              <div className="relative">
                {editingDueDate ? (
                  <input
                    type="datetime-local"
                    autoFocus
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400 text-amber-800 bg-amber-50 focus:outline-none focus:ring-2 focus:ring-amber-500/30 shadow-sm"
                    value={parseFlexibleDateToDateTimeLocal(item.dueDate)}
                    onChange={e => onUpdate({ dueDate: e.target.value })}
                    onBlur={() => setEditingDueDate(false)}
                  />
                ) : (
                  <button 
                    onClick={() => setEditingDueDate(true)}
                    className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer border ${item.dueDate ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 hover:border-amber-300 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 text-slate-500 hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50'}`}
                  >
                    <Calendar className="w-3 h-3" />
                    {item.dueDate ? `Fin: ${formatFlexibleDate(item.dueDate)}` : 'Fin'}
                  </button>
                )}
              </div>

              {/* Description Button */}
              <button 
                onClick={() => {
                  setShowDescription(!showDescription);
                  if (!item.description) setIsEditingDescription(true);
                }}
                className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer border ${item.description ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:border-blue-300 shadow-sm' : 'bg-slate-50 border-dashed border-slate-300 text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'}`}
              >
                <FileText className="w-3 h-3" />
                {item.description ? 'Ver Detalle' : 'Añadir Detalle'}
              </button>

            </div>
          </div>
        </div>
        <button onClick={onRemove} className="text-slate-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 cursor-pointer transition-all mt-0.5">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Description Tooltip / Box */}
      {showDescription && (
        <div className="mt-2 pl-8 pr-2 pb-1 relative z-10 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50/30 border border-blue-100/60 rounded-xl p-3.5 relative shadow-sm ring-1 ring-white/50">
            <button 
              onClick={() => setShowDescription(false)} 
              className="absolute top-2.5 right-2.5 p-1 text-blue-400 hover:text-rose-500 bg-white/60 hover:bg-white rounded-md transition-all cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
            
            {isEditingDescription ? (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Agregar / Editar Detalle
                </span>
                <textarea 
                  value={descriptionDraft}
                  onChange={e => setDescriptionDraft(e.target.value)}
                  placeholder="Añadir descripción, notas o requerimientos de este ítem..."
                  className="w-full text-xs p-2.5 rounded-lg border border-indigo-200/60 bg-white/80 text-slate-700 min-h-[70px] focus:outline-none focus:ring-2 focus:ring-indigo-400/30 placeholder:text-slate-400 resize-y"
                  autoFocus
                />
                <div className="flex justify-end gap-2 mt-1">
                  <button onClick={() => {
                      setIsEditingDescription(false);
                      setDescriptionDraft(item.description || '');
                      if (!item.description) setShowDescription(false);
                    }} 
                    className="text-[10px] font-bold text-slate-500 px-3 py-1.5 rounded-md bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button onClick={handleSaveDescription} className="text-[10px] font-bold text-white px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-sm shadow-indigo-200 transition-colors">
                    Guardar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5 pr-8">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wide flex items-center gap-1.5 cursor-pointer w-fit hover:text-indigo-600 transition-colors" onClick={() => setIsEditingDescription(true)}>
                  <FileText className="w-3.5 h-3.5" /> Detalle del Ítem
                </span>
                <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed bg-white/50 p-2.5 rounded-lg border border-white/60">{item.description}</p>
                <div className="mt-0.5">
                  <span 
                    onClick={() => setIsEditingDescription(true)}
                    className="text-[10px] font-bold text-indigo-500 cursor-pointer hover:text-indigo-700 transition-colors underline decoration-indigo-200 hover:decoration-indigo-400 underline-offset-2"
                  >
                    Editar detalle
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
