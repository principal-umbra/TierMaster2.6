      {/* Hero Welcome banner - Clean, highly accessible, light-themed matching the rest of the sub-tabs */}
      {!hideGestionOperativa && activeSubTab !== 'administracion' && (
        <div className="bg-gradient-to-r from-slate-50 via-white to-slate-50 p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col xl:flex-row justify-between items-center gap-4 mb-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.03),transparent_60%)] pointer-events-none" />
          
          {/* Left Column: Title & Section identifier */}
          <div className="z-10 shrink-0 text-center xl:text-left">
            <p className="text-[10px] font-mono font-black text-indigo-600 uppercase tracking-widest">
              Centro de Mando
            </p>
            <h1 className="font-display font-black text-2xl text-slate-900 tracking-tight flex items-center justify-center xl:justify-start gap-2">
              Gestión Operativa
            </h1>
          </div>

          {/* Middle Column: Status Swapper */}
          <div className="z-10 flex-1 flex flex-col items-center justify-center w-full max-w-2xl">
            {loggedInAgent && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col items-center w-full shadow-sm">
                {/* Status Switcher Header */}
                <div className="flex items-center justify-between w-full mb-2 px-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Mi Estado</span>
                    <div className="flex gap-1">
                      {loggedInAgent.id === specialDuties.guardiaId && (
                         <span className="text-[9px] bg-blue-50 border border-blue-200/80 text-blue-700 px-1.5 py-0.5 rounded font-black flex items-center gap-1">🛡️ Guardia</span>
                      )}
                      {loggedInAgent.id === specialDuties.chatId && (
                         <span className="text-[9px] bg-emerald-50 border border-emerald-200/80 text-emerald-700 px-1.5 py-0.5 rounded font-black flex items-center gap-1">💬 Chat</span>
                      )}
                      {loggedInAgent.id === specialDuties.alertasId && (
                         <span className="text-[9px] bg-rose-50 border border-rose-200/80 text-rose-700 px-1.5 py-0.5 rounded font-black flex items-center gap-1">🚨 Alertas</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full bg-indigo-50 border border-indigo-200/80 flex items-center justify-center text-[8px] font-black text-indigo-600">
                      {loggedInAgent.name.substring(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs text-slate-700 font-black">{loggedInAgent.name}</span>
                  </div>
                </div>
                
                {/* Switcher Buttons Grid - Solid high-contrast colors with perfect accessibility */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 w-full">
                  {(() => {
                    const myState = dutyStates.find(s => s.agentId === loggedInAgent.id);
                    const currentStatus = myState?.status || 'Disponible';
                    
                    const statuses: { 
                      key: AgentDutyState['status']; 
                      activeClass: string; 
                      inactiveClass: string; 
                      label: string; 
                      icon: React.ReactNode 
                    }[] = [
                      { 
                        key: 'Disponible', 
                        activeClass: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm', 
                        inactiveClass: 'bg-white hover:bg-emerald-50/50 text-slate-600 hover:text-emerald-700 border-slate-200 hover:border-emerald-300',
                        label: 'Disponible', 
                        icon: <CheckCircle className="w-3.5 h-3.5 shrink-0" /> 
                      },
                      { 
                        key: 'En llamada', 
                        activeClass: 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-600 shadow-sm', 
                        inactiveClass: 'bg-white hover:bg-indigo-50/50 text-slate-600 hover:text-indigo-700 border-slate-200 hover:border-indigo-300',
                        label: 'En llamada', 
                        icon: <Phone className="w-3.5 h-3.5 shrink-0" /> 
                      },
                      { 
                        key: 'Ocupado', 
                        activeClass: 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-sm', 
                        inactiveClass: 'bg-white hover:bg-rose-50/50 text-slate-600 hover:text-rose-700 border-slate-200 hover:border-rose-300',
                        label: 'Ocupado', 
                        icon: <MinusCircle className="w-3.5 h-3.5 shrink-0" /> 
                      },
                      { 
                        key: 'En almuerzo', 
                        activeClass: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600 shadow-sm', 
                        inactiveClass: 'bg-white hover:bg-amber-50/50 text-slate-600 hover:text-amber-700 border-slate-200 hover:border-amber-300',
                        label: 'Almuerzo', 
                        icon: <Coffee className="w-3.5 h-3.5 shrink-0" /> 
                      },
                      { 
                        key: 'En reunión', 
                        activeClass: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 shadow-sm', 
                        inactiveClass: 'bg-white hover:bg-blue-50/50 text-slate-600 hover:text-blue-700 border-slate-200 hover:border-blue-300',
                        label: 'Reunión', 
                        icon: <Users className="w-3.5 h-3.5 shrink-0" /> 
                      },
                      { 
                        key: 'En capacitación', 
                        activeClass: 'bg-purple-600 hover:bg-purple-700 text-white border-purple-600 shadow-sm', 
                        inactiveClass: 'bg-white hover:bg-purple-50/50 text-slate-600 hover:text-purple-700 border-slate-200 hover:border-purple-300',
                        label: 'Capacitación', 
                        icon: <Briefcase className="w-3.5 h-3.5 shrink-0" /> 
                      },
                    ];

                    return statuses.map(st => {
                      const isActive = currentStatus === st.key;
                      return (
                        <button
                          key={st.key}
                          onClick={() => handleUpdateMyStatus(st.key)}
                          className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold border transition-all cursor-pointer active:scale-95 ${
                            isActive ? st.activeClass : st.inactiveClass
                          }`}
                        >
                          {st.icon}
                          <span>{st.label}</span>
                        </button>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Server Clock */}
          <div className="shrink-0 flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-xl text-slate-700 font-mono text-xs shadow-sm z-10">
            <Clock className="w-4 h-4 text-indigo-600 animate-pulse shrink-0" />
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Servidor</p>
              <p className="font-extrabold text-slate-800 text-xs">
                {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} UTC-7
              </p>
            </div>
          </div>
        </div>
      )}
