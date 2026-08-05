import re

file_path = 'src/components/request-backlog/TaskDashboard.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate start and end
start_marker = "                      {/* Navigation subtabs within Negotiation Tool */}"
end_marker = "                  );\n                })()}"

start_idx = content.find(start_marker)
if start_idx == -1:
    print("Start marker not found")
    exit(1)

end_idx = content.find(end_marker, start_idx)
if end_idx == -1:
    print("End marker not found")
    exit(1)

new_content = """                      {/* Unified Cockpit Layout: No tabs, direct access */}
                      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                          
                          {/* LEFT COLUMN: CONTROL DE ACUERDOS Y BITÁCORA RÁPIDA (Span 5) */}
                          <div className="lg:col-span-5 space-y-4">
                            {/* Ficha Rápida de Cliente */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-2.5">
                              <div className="flex justify-between items-center border-b border-slate-200/50 pb-1.5">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Ficha del Cliente</span>
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">Asignado a la tarea</span>
                              </div>
                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Cliente</span>
                                  <span className="font-bold text-slate-800">{quotes[0]?.clientName || activeTask.clientName || 'Sin asignar'}</span>
                                </div>
                                {activeTask.clientRole && (
                                  <div>
                                    <span className="text-[9px] text-slate-400 block font-bold uppercase">Cargo</span>
                                    <span className="font-bold text-slate-800">{activeTask.clientRole}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Condiciones Comerciales Express */}
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-4">
                              <div className="flex justify-between items-center border-b border-slate-200/50 pb-1.5">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <Scale className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>Condiciones del Acuerdo</span>
                                </span>
                                <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase font-mono">Acuerdos</span>
                              </div>

                              <div className="space-y-3">
                                {/* Payment Terms */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Esquema de Pago</label>
                                    <div className="flex gap-1">
                                      {["50/50", "Contado", "Net 30"].map(preset => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => setNegPayTerms(preset)}
                                          className={`px-1.5 py-0.5 text-[8px] font-bold rounded border transition-colors cursor-pointer ${
                                            negPayTerms === preset 
                                              ? 'bg-indigo-600 text-white border-indigo-600' 
                                              : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'
                                          }`}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={negPayTerms}
                                    onChange={e => setNegPayTerms(e.target.value)}
                                    placeholder="Ej. 50% anticipo, 50% entrega"
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>

                                {/* Delivery Time */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Plazo de Entrega</label>
                                    <div className="flex gap-1">
                                      {["7 días", "15 días", "30 días"].map(preset => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => setNegDelivery(preset)}
                                          className={`px-1.5 py-0.5 text-[8px] font-bold rounded border transition-colors cursor-pointer ${
                                            negDelivery === preset 
                                              ? 'bg-indigo-600 text-white border-indigo-600' 
                                              : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'
                                          }`}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={negDelivery}
                                    onChange={e => setNegDelivery(e.target.value)}
                                    placeholder="Ej. 15 días hábiles"
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>

                                {/* SLA / Support */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">SLA / Soporte</label>
                                    <div className="flex gap-1">
                                      {["8x5", "24/7", "N/A"].map(preset => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => setNegSLA(preset)}
                                          className={`px-1.5 py-0.5 text-[8px] font-bold rounded border transition-colors cursor-pointer ${
                                            negSLA === preset 
                                              ? 'bg-indigo-600 text-white border-indigo-600' 
                                              : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'
                                          }`}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={negSLA}
                                    onChange={e => setNegSLA(e.target.value)}
                                    placeholder="Ej. Soporte 8x5 con SLA"
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>

                                {/* Warranty */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Garantía</label>
                                    <div className="flex gap-1">
                                      {["3 meses", "12 meses", "Sin gtía"].map(preset => (
                                        <button
                                          key={preset}
                                          type="button"
                                          onClick={() => setNegWarranty(preset)}
                                          className={`px-1.5 py-0.5 text-[8px] font-bold rounded border transition-colors cursor-pointer ${
                                            negWarranty === preset 
                                              ? 'bg-indigo-600 text-white border-indigo-600' 
                                              : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'
                                          }`}
                                        >
                                          {preset}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                  <input
                                    type="text"
                                    value={negWarranty}
                                    onChange={e => setNegWarranty(e.target.value)}
                                    placeholder="Ej. 12 meses de garantía"
                                    className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-200/50 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleSaveCommercialTerms(activeTask.id)}
                                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] rounded-lg transition-all shadow-xs cursor-pointer hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-1"
                                >
                                  <Check className="w-3 h-3 stroke-[3]" />
                                  <span>Guardar Condiciones</span>
                                </button>
                              </div>
                            </div>

                            {/* Bitácora Express con disparador rápido */}
                            {(() => {
                              const triggerQuickLog = async (type: 'Llamada' | 'Correo' | 'Acuerdo' | 'Nota', customTitle?: string) => {
                                const defaultTitles = {
                                  Llamada: "📞 Llamada de seguimiento realizada",
                                  Correo: "✉️ Correo de propuesta técnica enviado",
                                  Acuerdo: "🤝 Acuerdo sobre términos comerciales",
                                  Nota: "📝 Nota de estatus"
                                };
                                const titleText = customTitle || defaultTitles[type];
                                const newEntry = {
                                  id: `LOG-${Date.now().toString().slice(-5)}`,
                                  date: new Date().toISOString().split('T')[0],
                                  type,
                                  title: titleText,
                                  notes: customTitle ? "Registrado manualmente" : `Punto de contacto rápido registrado en un clic durante la jornada diaria.`,
                                  author: currentUser?.name || 'Gestor'
                                };

                                const updatedTasks = tasks.map(t => {
                                  if (t.id === activeTask.id) {
                                    const currentLog = t.negotiationLog || [];
                                    const newEvent = {
                                      id: `EV-NEG-LOG-${Date.now()}`,
                                      timestamp: new Date().toISOString(),
                                      title: `📝 Registro Comercial (${type})`,
                                      note: `Se registró: "${titleText}"`,
                                      author: currentUser?.name || 'Gestor'
                                    };

                                    return {
                                      ...t,
                                      negotiationLog: [newEntry, ...currentLog],
                                      timeline: t.timeline ? [newEvent, ...t.timeline] : [newEvent]
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
                                triggerNotification(`Registro rápido guardado`, "success");
                              };

                              return (
                                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3.5">
                                  <div className="flex justify-between items-center border-b border-slate-200/50 pb-1.5">
                                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                      <span>Bitácora Express</span>
                                    </span>
                                    <span className="text-[8px] font-black text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 uppercase">1-Clic</span>
                                  </div>

                                  <div className="space-y-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Registrar evento inmediato:</span>
                                    <div className="grid grid-cols-3 gap-2">
                                      <button
                                        type="button"
                                        onClick={() => triggerQuickLog('Llamada')}
                                        className="py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 hover:border-blue-200 rounded-xl font-bold text-[9px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:-translate-y-0.5"
                                      >
                                        <span className="text-sm">📞</span>
                                        <span>Registrar Llamada</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => triggerQuickLog('Correo')}
                                        className="py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-100 hover:border-amber-200 rounded-xl font-bold text-[9px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:-translate-y-0.5"
                                      >
                                        <span className="text-sm">✉️</span>
                                        <span>Registrar Correo</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => triggerQuickLog('Acuerdo')}
                                        className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 hover:border-emerald-200 rounded-xl font-bold text-[9px] flex flex-col items-center justify-center gap-1 transition-all cursor-pointer hover:-translate-y-0.5"
                                      >
                                        <span className="text-sm">🤝</span>
                                        <span>Registrar Acuerdo</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5 pt-1">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Nota personalizada rápida:</span>
                                    <div className="flex gap-1.5">
                                      <input
                                        type="text"
                                        placeholder="Escribe algo rápido..."
                                        value={newLogTitle}
                                        onChange={e => setNewLogTitle(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter' && newLogTitle.trim()) {
                                            triggerQuickLog('Nota', newLogTitle.trim());
                                            setNewLogTitle('');
                                          }
                                        }}
                                        className="flex-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (newLogTitle.trim()) {
                                            triggerQuickLog('Nota', newLogTitle.trim());
                                            setNewLogTitle('');
                                          }
                                        }}
                                        className="px-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  <div className="space-y-1.5 pt-2 border-t border-slate-200/50">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">Actividad Reciente:</span>
                                    {!activeTask.negotiationLog || activeTask.negotiationLog.length === 0 ? (
                                      <p className="text-[9px] text-slate-400 italic font-semibold text-center py-2 bg-white rounded-lg border border-slate-100">Sin historial registrado aún.</p>
                                    ) : (
                                      <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-0.5">
                                        {activeTask.negotiationLog.slice(0, 3).map((item) => (
                                          <div key={item.id} className="bg-white rounded-lg border border-slate-150 p-2 flex items-start justify-between gap-1.5 text-[9px] font-semibold">
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-1">
                                                <span className={`px-1 rounded text-[7px] font-black uppercase ${
                                                  item.type === 'Reunión' ? 'bg-purple-50 text-purple-700' :
                                                  item.type === 'Llamada' ? 'bg-blue-50 text-blue-700' :
                                                  item.type === 'Correo' ? 'bg-amber-50 text-amber-700' :
                                                  item.type === 'Acuerdo' ? 'bg-emerald-50 text-emerald-700' :
                                                  'bg-slate-50 text-slate-600'
                                                }`}>
                                                  {item.type}
                                                </span>
                                                <span className="text-[8px] text-slate-400 font-mono">{item.date}</span>
                                              </div>
                                              <p className="text-slate-700 leading-tight truncate mt-0.5 font-bold" title={item.title}>{item.title}</p>
                                            </div>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteNegotiationLogEntry(activeTask.id, item.id)}
                                              className="text-slate-300 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                                            >
                                              ×
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* RIGHT COLUMN: PROPUESTAS Y COTIZACIONES (Span 7) */}
                          <div className="lg:col-span-7">
                            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3.5 flex flex-col h-full">
                              <div className="flex justify-between items-center border-b border-slate-200/50 pb-1.5 shrink-0">
                                <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <BadgeDollarSign className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{isCreatingQuote ? "Creador de Cotizaciones" : `Propuestas de Cotización (${quotes.length})`}</span>
                                </span>
                                
                                {!isCreatingQuote && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      clearQuoteForm();
                                      setQuoteClientName(activeTask.clientName || '');
                                      setQuoteClientEmail('');
                                      setQuoteValidUntil(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                                      setQuoteTaxRate(16);
                                      setQuoteItems([]);
                                      setQuoteNotes(`Esquema: ${negPayTerms || '50/50'}. Plazo de entrega: ${negDelivery || '15 días'}. SLA: ${negSLA || '8x5'}.`);
                                      setIsCreatingQuote(true);
                                      setEditingQuoteId(null);
                                    }}
                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9px] rounded-lg transition-all flex items-center gap-1 cursor-pointer hover:-translate-y-0.5 shadow-xs"
                                  >
                                    <Plus className="w-3 h-3 stroke-[3]" />
                                    <span>Nueva Cotización</span>
                                  </button>
                                )}
                              </div>

                              {isCreatingQuote ? (
                                <div className="space-y-3 animate-fadeIn">
                                  {/* Compact fields row */}
                                  <div className="grid grid-cols-2 gap-2.5">
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Nombre del Cliente *</label>
                                      <input
                                        type="text"
                                        placeholder="Ej. Juan Pérez"
                                        value={quoteClientName}
                                        onChange={e => setQuoteClientName(e.target.value)}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Email de Contacto</label>
                                      <input
                                        type="email"
                                        placeholder="ejemplo@correo.com"
                                        value={quoteClientEmail}
                                        onChange={e => setQuoteClientEmail(e.target.value)}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block">IVA (%)</label>
                                      <input
                                        type="number"
                                        value={quoteTaxRate}
                                        onChange={e => setQuoteTaxRate(Math.max(0, parseFloat(e.target.value) || 0))}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                    <div className="space-y-0.5">
                                      <label className="text-[9px] font-bold text-slate-500 uppercase block">Validez</label>
                                      <input
                                        type="date"
                                        value={quoteValidUntil}
                                        onChange={e => setQuoteValidUntil(e.target.value)}
                                        className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                      />
                                    </div>
                                  </div>

                                  {/* Catálogo Rápido integration */}
                                  <div className="bg-white rounded-xl border border-slate-200/50 p-2 space-y-1">
                                    <span className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider block flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                                      <span>Añadir del Catálogo de Precios:</span>
                                    </span>
                                    <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto pr-0.5">
                                      {pricingPresets.map((preset, index) => (
                                        <button
                                          key={index}
                                          type="button"
                                          onClick={() => {
                                            const exists = quoteItems.some(i => i.description === preset.description);
                                            if (exists) {
                                              triggerNotification("Concepto ya agregado", "info");
                                              return;
                                            }
                                            setQuoteItems(prev => [...prev, {
                                              description: preset.description,
                                              quantity: preset.qty,
                                              unitPrice: preset.price,
                                              discount: 0
                                            }]);
                                            triggerNotification("Concepto agregado de catálogo", "success");
                                          }}
                                          className="px-2 py-0.5 bg-slate-50 hover:bg-emerald-50 border border-slate-150 hover:border-emerald-200 text-slate-600 hover:text-emerald-700 font-bold text-[8px] rounded-md transition-all flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Plus className="w-2 h-2" />
                                          <span>{preset.description.split(' ').slice(1).join(' ')} (${preset.price})</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Line items Table */}
                                  <div className="bg-white rounded-xl border border-slate-200/50 overflow-hidden max-h-[140px] overflow-y-auto">
                                    <table className="w-full text-left text-[9.5px]">
                                      <thead className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold font-mono uppercase text-[7.5px]">
                                        <tr>
                                          <th className="px-2 py-1">Concepto</th>
                                          <th className="px-1 py-1 w-10 text-center">Cant</th>
                                          <th className="px-1.5 py-1 w-14 text-right">Precio</th>
                                          <th className="px-1 py-1 w-10 text-center">Desc%</th>
                                          <th className="px-1.5 py-1 w-16 text-right">Total</th>
                                          <th className="px-1.5 py-1 w-8 text-center"></th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {quoteItems.length === 0 ? (
                                          <tr>
                                            <td colSpan={6} className="px-2 py-3 text-center text-slate-400 italic text-[8.5px]">
                                              Sin conceptos aún. Elige uno arriba o añade uno manual.
                                            </td>
                                          </tr>
                                        ) : (
                                          quoteItems.map((item, idx) => {
                                            const totalItem = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);
                                            return (
                                              <tr key={idx} className="hover:bg-slate-50/30">
                                                <td className="px-2 py-0.5 text-slate-850 font-bold truncate max-w-[140px]" title={item.description}>{item.description}</td>
                                                <td className="px-1 py-0.5 text-center font-mono font-bold text-slate-600">{item.quantity}</td>
                                                <td className="px-1.5 py-0.5 text-right font-mono">${item.unitPrice}</td>
                                                <td className="px-1 py-0.5 text-center font-mono text-rose-500">{item.discount}%</td>
                                                <td className="px-1.5 py-0.5 text-right font-mono font-bold">${totalItem.toFixed(1)}</td>
                                                <td className="px-1.5 py-0.5 text-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => setQuoteItems(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-rose-500 hover:bg-rose-50 p-0.5 rounded cursor-pointer"
                                                  >
                                                    <Trash2 className="w-2.5 h-2.5" />
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })
                                        )}

                                        {/* Manual item inline row */}
                                        <tr className="bg-slate-50/50">
                                          <td className="px-1.5 py-0.5">
                                            <input
                                              type="text"
                                              placeholder="Concepto..."
                                              value={newQuoteItemDesc}
                                              onChange={e => setNewQuoteItemDesc(e.target.value)}
                                              className="w-full px-1 py-0.5 bg-white border border-slate-200 rounded text-[9px]"
                                            />
                                          </td>
                                          <td className="px-0.5 py-0.5">
                                            <input
                                              type="number"
                                              min={1}
                                              value={newQuoteItemQty}
                                              onChange={e => setNewQuoteItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                                              className="w-full px-0.5 py-0.5 bg-white border border-slate-200 rounded text-center text-[9px]"
                                            />
                                          </td>
                                          <td className="px-0.5 py-0.5">
                                            <input
                                              type="number"
                                              min={0}
                                              placeholder="0"
                                              value={newQuoteItemPrice || ''}
                                              onChange={e => setNewQuoteItemPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                                              className="w-full px-0.5 py-0.5 bg-white border border-slate-200 rounded text-right text-[9px]"
                                            />
                                          </td>
                                          <td className="px-0.5 py-0.5">
                                            <input
                                              type="number"
                                              min={0}
                                              max={100}
                                              placeholder="0"
                                              value={newQuoteItemDiscount || ''}
                                              onChange={e => setNewQuoteItemDiscount(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                                              className="w-full px-0.5 py-0.5 bg-white border border-slate-200 rounded text-center text-[9px]"
                                            />
                                          </td>
                                          <td className="px-1 py-0.5 text-right font-mono font-bold text-slate-400">
                                            ${((newQuoteItemQty * (newQuoteItemPrice || 0)) * (1 - (newQuoteItemDiscount || 0) / 100)).toFixed(1)}
                                          </td>
                                          <td className="px-1.5 py-0.5 text-center">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (!newQuoteItemDesc.trim()) {
                                                  triggerNotification("Ingresa concepto", "error");
                                                  return;
                                                }
                                                setQuoteItems(prev => [...prev, {
                                                  description: newQuoteItemDesc.trim(),
                                                  quantity: newQuoteItemQty,
                                                  unitPrice: newQuoteItemPrice,
                                                  discount: newQuoteItemDiscount
                                                }]);
                                                setNewQuoteItemDesc('');
                                                setNewQuoteItemQty(1);
                                                setNewQuoteItemPrice(0);
                                                setNewQuoteItemDiscount(0);
                                                triggerNotification("Añadido", "success");
                                              }}
                                              className="p-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded cursor-pointer"
                                            >
                                              <Plus className="w-2.5 h-2.5" />
                                            </button>
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Notes/Terms and Totals Row */}
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 text-[9.5px]">
                                    <div className="md:col-span-7 space-y-0.5">
                                      <label className="text-[8.5px] font-bold text-slate-500 uppercase block">Comentarios de Propuesta</label>
                                      <textarea
                                        placeholder="Términos comerciales..."
                                        value={quoteNotes}
                                        onChange={e => setQuoteNotes(e.target.value)}
                                        rows={1.5}
                                        className="w-full p-1.5 bg-white border border-slate-200 rounded-lg font-semibold leading-normal"
                                      />
                                    </div>
                                    <div className="md:col-span-5 bg-white border border-slate-200/60 rounded-xl p-2 flex flex-col justify-center space-y-0.5 font-semibold">
                                      {(() => {
                                        const sub = quoteItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100)), 0);
                                        const taxVal = sub * (quoteTaxRate / 100);
                                        const grandTotal = sub + taxVal;
                                        return (
                                          <>
                                            <div className="flex justify-between text-slate-400">
                                              <span>Subtotal:</span>
                                              <span className="font-mono">${sub.toFixed(1)}</span>
                                            </div>
                                            <div className="flex justify-between text-slate-400">
                                              <span>IVA ({quoteTaxRate}%):</span>
                                              <span className="font-mono">${taxVal.toFixed(1)}</span>
                                            </div>
                                            <div className="border-t border-slate-100 pt-0.5 flex justify-between text-slate-800 font-black text-[11px]">
                                              <span>Total Neto:</span>
                                              <span className="font-mono text-emerald-600">${grandTotal.toFixed(1)} USD</span>
                                            </div>
                                          </>
                                        );
                                      })()}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex justify-end gap-2 pt-1.5 border-t border-slate-200/50">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setIsCreatingQuote(false);
                                        setEditingQuoteId(null);
                                        clearQuoteForm();
                                      }}
                                      className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[9.5px] rounded-lg cursor-pointer"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSaveQuote(activeTask.id)}
                                      className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[9.5px] rounded-lg transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                    >
                                      <Check className="w-3 h-3" />
                                      <span>{editingQuoteId ? "Guardar" : "Guardar Cotización"}</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                /* Quotes list container (Right Side) */
                                <div className="space-y-3 max-h-[460px] overflow-y-auto pr-0.5">
                                  {quotes.length === 0 ? (
                                    <div className="bg-white rounded-xl border border-slate-150 p-8 text-center flex flex-col items-center justify-center space-y-2">
                                      <span className="text-2xl">💰</span>
                                      <div className="space-y-0.5">
                                        <h6 className="text-[10px] font-black text-slate-700 uppercase tracking-wider">Sin Cotizaciones</h6>
                                        <p className="text-[9px] text-slate-400 font-semibold max-w-xs leading-normal">
                                          Aún no se han formulado propuestas. Haz clic en "Nueva Cotización" arriba para crear una en segundos.
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    quotes.map((quote) => (
                                      <div key={quote.id} className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-slate-300 transition-all space-y-2">
                                        <div className="flex justify-between items-center">
                                          <div className="flex items-center gap-1.5">
                                            <span className="font-mono font-black text-[9px] text-slate-500 uppercase">{quote.id}</span>
                                            {/* Status Button Toggle (1-click status switcher right on the card!) */}
                                            <div className="flex gap-1">
                                              {['Borrador', 'Enviada', 'Aceptada', 'Rechazada'].map((statusOption) => {
                                                const isActive = quote.status === statusOption;
                                                return (
                                                  <button
                                                    key={statusOption}
                                                    type="button"
                                                    onClick={() => handleUpdateQuoteStatus(activeTask.id, quote.id, statusOption as any)}
                                                    className={`px-1.5 py-0.5 rounded text-[7.5px] font-bold border transition-all cursor-pointer ${
                                                      isActive
                                                        ? statusOption === 'Borrador' ? 'bg-slate-100 text-slate-700 border-slate-300 font-black' :
                                                          statusOption === 'Enviada' ? 'bg-blue-100 text-blue-800 border-blue-200 font-black' :
                                                          statusOption === 'Aceptada' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 font-black' :
                                                          'bg-rose-100 text-rose-800 border-rose-200 font-black'
                                                        : 'bg-white hover:bg-slate-50 text-slate-400 border-slate-150'
                                                    }`}
                                                  >
                                                    {statusOption}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          </div>
                                          
                                          {/* Total Price */}
                                          <span className="font-mono font-black text-xs text-emerald-600">
                                            ${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} USD
                                          </span>
                                        </div>

                                        {/* Brief client info & validation */}
                                        <div className="grid grid-cols-3 gap-2 text-[8.5px] text-slate-500 border-t border-b border-slate-100 py-1 font-semibold">
                                          <div className="truncate">Cliente: <strong className="text-slate-700">{quote.clientName}</strong></div>
                                          <div>F. Emisión: <strong className="text-slate-700">{quote.date}</strong></div>
                                          <div>Validez: <strong className="text-slate-700">{quote.validUntil}</strong></div>
                                        </div>

                                        {/* Concept summary block */}
                                        <div className="bg-slate-50/50 rounded-lg p-1.5 border border-slate-100 text-[9px]">
                                          <div className="space-y-0.5 font-semibold">
                                            {quote.items.map((item, idx) => (
                                              <div key={idx} className="flex justify-between">
                                                <span className="text-slate-600 truncate max-w-[190px]">• {item.description} (x{item.quantity})</span>
                                                <span className="font-mono text-slate-700 font-bold">${(item.quantity * item.unitPrice * (1 - (item.discount || 0)/100)).toFixed(1)}</span>
                                              </div>
                                            ))}
                                          </div>
                                          {quote.notes && <p className="text-[8px] text-slate-400 mt-1 border-t border-slate-200/40 pt-1 italic">Nota: {quote.notes}</p>}
                                        </div>

                                        {/* Row of card operations */}
                                        <div className="flex justify-between items-center pt-1 shrink-0 text-[10px]">
                                          <span className="text-[8px] text-slate-400 font-mono">Subtotal: ${quote.subtotal.toFixed(1)} + IVA</span>
                                          <div className="flex gap-1.5">
                                            {/* Edit capability */}
                                            {quote.status === 'Borrador' && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setEditingQuoteId(quote.id);
                                                  setQuoteClientName(quote.clientName);
                                                  setQuoteClientEmail(quote.clientEmail || '');
                                                  setQuoteValidUntil(quote.validUntil);
                                                  setQuoteNotes(quote.notes || '');
                                                  setQuoteTaxRate(quote.taxRate);
                                                  setQuoteItems(quote.items);
                                                  setIsCreatingQuote(true);
                                                }}
                                                className="px-2 py-0.5 text-[8px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 rounded-md cursor-pointer transition-colors"
                                              >
                                                Editar
                                              </button>
                                            )}
                                            {/* Send Button if Draft */}
                                            {quote.status === 'Borrador' && (
                                              <button
                                                type="button"
                                                onClick={() => handleSendQuote(activeTask.id, quote.id)}
                                                className="px-2 py-0.5 text-[8px] font-black bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-700 rounded-md flex items-center gap-0.5 cursor-pointer"
                                              >
                                                <Send className="w-2.5 h-2.5" />
                                                <span>Enviar</span>
                                              </button>
                                            )}
                                            {/* Copy Duplicate */}
                                            <button
                                              type="button"
                                              onClick={() => handleDuplicateQuote(activeTask.id, quote.id)}
                                              className="p-1 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer"
                                              title="Duplicar"
                                            >
                                              <Copy className="w-3 h-3 text-slate-400" />
                                            </button>
                                            {/* Delete */}
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteQuote(activeTask.id, quote.id)}
                                              className="p-1 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 text-rose-500 rounded-md cursor-pointer"
                                              title="Eliminar"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>"""

start_pos = start_idx
end_pos = end_idx

# We replace from start_pos to end_pos
replaced_content = content[:start_pos] + new_content + content[end_pos:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(replaced_content)

print("Replacement successful!")
