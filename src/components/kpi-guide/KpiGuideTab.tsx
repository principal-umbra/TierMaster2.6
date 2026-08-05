import React, { useState } from 'react';
import { 
  BookOpen, 
  Award, 
  Search, 
  Info,
  ChevronRight,
  ArrowRight,
  Zap,
  UserCheck,
  Compass,
  ShieldCheck
} from 'lucide-react';

interface KpiGuideTabProps {}

export default function KpiGuideTab({}: KpiGuideTabProps) {
  const [selectedCriterion, setSelectedCriterion] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const criteria = [
    {
      id: 1,
      number: "Criterio 1",
      title: "Certificaciones",
      shortTitle: "Certificaciones",
      icon: Award,
      color: "from-blue-600 to-cyan-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50/50",
      borderColor: "border-blue-150",
      purpose: "Este criterio valida que el agente posee el conocimiento formal y técnico requerido para subir al siguiente Tier y, más importante, que ese conocimiento se internaliza y se aplicará consistentemente en la operación diaria. No mide solo la obtención de un diploma o badge, sino que el agente realmente domina el contenido y lo traduce en mejor desempeño.",
      phrase: "Certificaciones mide si el agente ha adquirido, comprendido y aplicado el conocimiento formal requerido para avanzar de Tier, asegurando que su desempeño técnico tenga una base sólida y actualizada.",
      difference: "Aquí se mide específicamente la base de conocimiento formal, su retención y su aplicación sostenida. Es el fundamento técnico que soporta el resto de los criterios de desempeño.",
      axes: [
        { name: "Ruta de certificaciones requerida", desc: "Mide si el agente completa la ruta de formación y certificaciones definida para avanzar al próximo nivel o Tier." },
        { name: "Comprensión del contenido", desc: "Mide la profundidad real de entendimiento del material. No basta con finalizar el curso; se evalúa si comprende los conceptos, flujos, buenas prácticas y excepciones clave." },
        { name: "Aplicación real del conocimiento", desc: "Mide si el agente aplica efectivamente lo aprendido en el trabajo diario. Se busca evidencia de que el conocimiento se refleja en la resolución de requerimientos y toma de decisiones." },
        { name: "Capacidad de explicar o exponer el conocimiento", desc: "Mide la habilidad del agente para comunicar claramente lo aprendido, tanto a compañeros como a clientes, cuando sea necesario." }
      ],
      cycleTitle: "Ejes Claves",
      cycle: [
        { label: "1. Completar Ruta", desc: "Cumplimiento de los cursos y certificaciones correspondientes al Tier objetivo." },
        { label: "2. Comprender", desc: "Profundidad real de entendimiento; comprender conceptos, flujos y excepciones." },
        { label: "3. Aplicar", desc: "Evidencia práctica en la resolución diaria de requerimientos y calidad técnica." },
        { label: "4. Exponer", desc: "Habilidad para comunicar y transferir claramente lo aprendido al equipo y clientes." }
      ]
    },
    {
      id: 2,
      number: "Criterio 2",
      title: "Troubleshooting",
      shortTitle: "Troubleshooting",
      icon: Zap,
      color: "from-indigo-600 to-blue-500",
      textColor: "text-indigo-600",
      bgColor: "bg-indigo-50/50",
      borderColor: "border-indigo-150",
      purpose: "Este criterio mide la capacidad técnica real del agente para entender un problema, seguir el proceso correcto de diagnóstico y llegar a una solución adecuada o a una escalación oportuna. No evalúa solo si el agente “hace algo”, sino si aplica un método ordenado y efectivo para resolver incidencias técnicas, identificando correctamente la causa del problema y actuando con criterio.",
      phrase: "Troubleshooting mide la capacidad técnica real del agente para diagnosticar correctamente un requerimiento, seguir los procesos establecidos, usar las herramientas adecuadas y resolver o escalar de forma efectiva, manteniendo continuidad técnica cuando el caso lo exige.",
      difference: "Aquí se mide específicamente la capacidad técnica de diagnóstico y resolución del agente, es decir, su habilidad para solucionar requerimientos reales de forma correcta, ordenada y eficiente.",
      axes: [
        { name: "Uso correcto de procesos", desc: "Sigue el flujo técnico establecido para cada tipo de requerimiento, sin improvisar incorrectamente o saltarse pasos esenciales. Respeta el orden lógico del diagnóstico." },
        { name: "Dominio de herramientas internas", desc: "Conocimiento y uso eficiente de las herramientas de diagnóstico y resolución disponibles para acelerar y mejorar el diagnóstico." },
        { name: "Diagnóstico técnico", desc: "Capacidad del agente para identificar correctamente la causa raíz del problema antes de aplicar una solución, distinguiendo entre causa real y efecto visible." },
        { name: "Resolución, continuidad o escalación", desc: "Resuelve el problema cuando tiene la capacidad, o escala de forma adecuada y oportuna dejando información técnica detallada del análisis previo." }
      ],
      cycleTitle: "Ciclo Ideal de Troubleshooting",
      cycle: [
        { label: "A. Recepción y Entendimiento", desc: "Revisa la información inicial del requerimiento, identifica el síntoma principal y comprende el contexto." },
        { label: "B. Diagnóstico", desc: "Utiliza las herramientas correctas, sigue el flujo técnico establecido e identifica la causa raíz con precisión." },
        { label: "C. Ejecución", desc: "Aplica la solución adecuada cuando puede resolverlo y documenta los pasos realizados y el resultado." },
        { label: "D. Resolución o Escalada", desc: "Cierra el caso o escala con documentación técnica detallada (diagnóstico, pruebas, descartes) para evitar reiniciar análisis." }
      ]
    },
    {
      id: 3,
      number: "Criterio 3",
      title: "Servicio al Cliente",
      shortTitle: "Servicio Cliente",
      icon: UserCheck,
      color: "from-emerald-600 to-teal-500",
      textColor: "text-emerald-700",
      bgColor: "bg-emerald-50/50",
      borderColor: "border-emerald-150",
      purpose: "Este criterio mide la calidad de la relación que el agente construye con el cliente y cómo representa a FHONS en toda la comunicación externa. No se trata solo de ser “amable”, sino de generar confianza, claridad y profesionalismo en cada interacción, asegurando que el cliente se sienta bien atendido, comprendido e informado durante todo el proceso.",
      phrase: "Servicio al Cliente mide la capacidad del agente para construir una relación de confianza con el cliente mediante comunicación clara, profesional, oportuna y empática, manteniéndolo informado y acompañado hasta el cierre o correcto encaminamiento del caso.",
      difference: "Aquí se mide específicamente la calidad de la interacción y la representación de la empresa frente al cliente en toda la comunicación externa.",
      axes: [
        { name: "Tono profesional y empatía", desc: "Uso de un tono respetuoso, maduro y cercano, manteniendo firmeza cuando es necesario sin perder cortesía ni control de la conversación." },
        { name: "Claridad y redacción", desc: "Capacidad de explicar de forma clara, ordenada y comprensible, tanto en llamadas como en comunicaciones escritas, evitando confusión o mensajes redundantes." },
        { name: "Oportunidad y cumplimiento", desc: "Tiempo de respuesta razonable, cumplimiento de lo prometido y capacidad de informar de forma proactiva avances, bloqueos o retrasos." },
        { name: "Escucha activa", desc: "Capacidad de entender realmente la necesidad del cliente antes de responder, y confirmar comprensión." }
      ],
      cycleTitle: "Ciclo Ideal de Servicio al Cliente",
      cycle: [
        { label: "A. Recepción y Escucha", desc: "Lee o escucha con atención la consulta del cliente. Confirma comprensión y hace las preguntas necesarias." },
        { label: "B. Comunicación Clara", desc: "Responde con tono profesional y lenguaje claro. Explica avances o instrucciones de forma entendible." },
        { label: "C. Gestión de Expectativas", desc: "Da tiempos realistas (ETA). Cumple lo prometido o actualiza proactivamente si ocurren cambios o bloqueos." },
        { label: "D. Seguimiento y Cierre", desc: "Realiza seguimiento (FUP) cuando corresponde, verifica satisfacción con la solución y cierra el tema ordenadamente." }
      ]
    },
    {
      id: 4,
      number: "Criterio 4",
      title: "Habilidades Blandas",
      shortTitle: "Habilidades Blandas",
      icon: Compass,
      color: "from-amber-600 to-orange-500",
      textColor: "text-amber-700",
      bgColor: "bg-amber-50/50",
      borderColor: "border-amber-150",
      purpose: "Este criterio mide cómo trabaja el agente dentro del entorno interno y cómo se relaciona con el equipo, líderes y colaboradores. No evalúa sólo el “ser buena persona”, sino la capacidad de contribuir positivamente al funcionamiento del equipo, mantener una comunicación fluida, demostrar madurez profesional, actuar con criterio y sostener una conducta responsable y disciplinada en el día a día.",
      phrase: "Habilidades Blandas mide la capacidad del agente para desenvolverse de forma madura, colaborativa, responsable y disciplinada dentro del entorno interno, comunicándose con claridad, trabajando en equipo, aplicando criterio y manteniendo una conducta operativa confiable.",
      difference: "Aquí se mide específicamente el comportamiento interno, la madurez profesional, la capacidad de convivencia operativa dentro del equipo y la disciplina con la que el agente sostiene su rol en el día a día.",
      axes: [
        { name: "Comunicación interna", desc: "Claridad, profesionalismo y efectividad al comunicarse con compañeros y líderes. Comunica bloqueos, avances o necesidades de forma oportuna." },
        { name: "Escucha activa y colaboración", desc: "Capacidad de recibir indicaciones, feedback y contexto sin generar fricción, y de trabajar en equipo apoyando activamente cuando el flujo operativo lo requiere." },
        { name: "Pensamiento crítico y sentido de urgencia", desc: "Habilidad para analizar situaciones antes de actuar, identificar prioridades reales y tomar decisiones con criterio y madurez." },
        { name: "Responsabilidad y consistencia", desc: "Cumplimiento de compromisos, estabilidad en el comportamiento profesional y responsabilidad personal con las tareas y acuerdos." },
        { name: "Horario y disciplina operativa", desc: "Disciplina en el cumplimiento de su jornada, entendiendo el horario como una expresión concreta de orden, compromiso y confiabilidad operativa." }
      ],
      cycleTitle: "Ejes de Comportamiento Interno",
      cycle: [
        { label: "A. Comunicación", desc: "Expresa ideas de forma clara y mantiene informado a su equipo o líder cuando es necesario." },
        { label: "B. Colaboración", desc: "Escucha feedback con apertura y apoya a compañeros cuando surge una necesidad operativa." },
        { label: "C. Criterio", desc: "Identifica prioridades, aplica sentido de urgencia correctamente y analiza antes de actuar." },
        { label: "D. Responsabilidad", desc: "Cumple con lo asumido y mantiene una actitud consistente y confiable." },
        { label: "E. Disciplina", desc: "Respeta su horario y jornada operativa con orden, previsibilidad y compromiso." }
      ]
    },
    {
      id: 5,
      number: "Criterio 5",
      title: "Gestión del Requerimiento y Trazabilidad",
      shortTitle: "Gestión y Trazabilidad",
      icon: ShieldCheck,
      color: "from-rose-600 to-pink-500",
      textColor: "text-rose-700",
      bgColor: "bg-rose-50/50",
      borderColor: "border-rose-150",
      purpose: "Este criterio mide la capacidad del agente para administrar cada requerimiento de forma ordenada, visible y controlada durante todo su ciclo de vida operativo. No evalúa sólo si resuelve el caso, sino su habilidad para gestionar el volumen de trabajo, el tiempo invertido y mantener el control completo del requerimiento desde que lo recibe hasta que se cierra, garantizando visibilidad y orden en el CRM.",
      phrase: "Gestión del Requerimiento y Trazabilidad mide si el agente administra con orden y control el volumen, el tiempo y el registro completo de sus requerimientos mediante el proceso Ayer-Hoy-Bloqueos y documentación clara en el CRM.",
      difference: "Este criterio se centra exclusivamente en la administración operativa del requerimiento como unidad completa de trabajo: volumen, tiempo, avance diario y trazabilidad.",
      axes: [
        { name: "Gestión de Asignaciones, Carga y Cumplimiento", desc: "Manejo del volumen de trabajo versus completados, coherencia de tiempos estimados (ETA/ATS), uso del proceso diario Ayer-Hoy-Bloqueos, y FUP oportuno." },
        { name: "Trazabilidad y Documentación", desc: "Calidad del registro en CRM para que el requerimiento sea transparente (Suceso → Acción → Conclusión), reportando bloqueos y dependencias de forma limpia." }
      ],
      cycleTitle: "Flujo del Requerimiento",
      cycle: [
        { label: "A. Recepción", desc: "Revisa el requerimiento en el CRM y comprende el alcance de la estimación de tiempo (ETA)." },
        { label: "B. Ejecución", desc: "Trabaja el volumen asignado y responde diariamente las tres preguntas de Ayer-Hoy-Bloqueos." },
        { label: "C. Documentación", desc: "Registra en CRM con estructura clara: Suceso → Acción → Conclusión, detallando bloqueos." },
        { label: "D. Cierre", desc: "Verifica resolución definitiva, completa documentación y cierra el caso limpio en CRM." }
      ]
    }
  ];

  const filteredCriteria = criteria.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phrase.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="kpi-guide-viewport">
      {/* Banner de Bienvenida */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden keep-dark-bg">
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <span className="font-mono text-[10px] text-indigo-200 font-extrabold tracking-widest uppercase">Metodología FHONS</span>
            <h2 className="text-xl md:text-2xl font-extrabold font-display text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-200" />
              Guía de Evaluación y Criterios de Desempeño (KPIs)
            </h2>
            <p className="text-xs text-slate-50 max-w-2xl font-sans leading-relaxed">
              Esta sección interactiva expone los fundamentos metodológicos para medir el desempeño de los técnicos. Úsala para alinear tu trabajo diario, realizar autoevaluaciones estructuradas y dominar el ciclo operativo ideal.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar de Criterios */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar criterio o palabra clave..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="space-y-1.5 max-h-[480px] overflow-y-auto custom-scrollbar">
                {filteredCriteria.map((c, idx) => {
                  const Icon = c.icon;
                  const isSelected = selectedCriterion === idx;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCriterion(idx)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-600 bg-blue-50/40 text-blue-700 shadow-sm' 
                          : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${c.color} text-white shrink-0`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-center">
                          <span className="font-mono text-[9px] text-slate-400 font-extrabold">{c.number}</span>
                        </div>
                        <p className="font-bold text-slate-800 text-xs truncate leading-tight font-display">{c.title}</p>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 transition-transform shrink-0 ${isSelected ? 'text-blue-600 translate-x-0.5' : 'text-slate-400'}`} />
                    </button>
                  );
                })}
                {filteredCriteria.length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">No se encontraron resultados para la búsqueda.</p>
                )}
              </div>
            </div>

            {/* General Info Card */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-800 text-xs font-display">Propósito General</h4>
              </div>
              <p className="text-[11.5px] text-slate-600 leading-normal font-sans">
                Esta guía existe para medir si el agente ya tiene la madurez necesaria para asumir un Tier superior. No se evalúa una sola habilidad. Se evalúa un perfil completo compuesto por cinco dimensiones que se complementan entre sí.
              </p>
            </div>
          </div>

          {/* Panel de Detalle de Criterio */}
          <div className="lg:col-span-8">
            {criteria[selectedCriterion] ? (() => {
              const current = criteria[selectedCriterion];
              const Icon = current.icon;
              return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
                  {/* Criterio Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${current.color} text-white shadow-md`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">{current.number}</span>
                        <h3 className="text-base font-extrabold text-slate-950 font-display">{current.title}</h3>
                      </div>
                    </div>
                  </div>

                  {/* Propósito */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">1. Propósito</h4>
                    <p className="text-xs text-slate-700 leading-relaxed font-sans bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                      {current.purpose}
                    </p>
                  </div>

                  {/* Frase Resumen */}
                  <div className="bg-blue-50/30 border border-blue-100/50 rounded-xl p-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600"></div>
                    <span className="font-mono text-[9px] text-blue-600 font-extrabold uppercase block mb-1">En una sola frase</span>
                    <p className="text-xs font-bold text-blue-900 font-sans italic">
                      "{current.phrase}"
                    </p>
                  </div>

                  {/* Ejes de Evaluación */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">2. Qué evalúa este criterio</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {current.axes.map((axis, i) => (
                        <div key={i} className="border border-slate-100 hover:border-slate-200 rounded-xl p-3 bg-white hover:bg-slate-50/30 transition-all flex gap-2.5">
                          <span className="font-mono text-xs font-black text-blue-600 select-none bg-blue-50 w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0">
                            <h5 className="font-bold text-slate-800 text-[11.5px] font-display">{axis.name}</h5>
                            <p className="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed font-sans">{axis.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Ciclo Ideal / Diagrama de Flujo */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider font-mono">3. {current.cycleTitle}</h4>
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
                        {current.cycle.map((node, i) => (
                          <div key={i} className="bg-white p-3 rounded-lg border border-slate-150 shadow-sm relative flex flex-col justify-between h-full">
                            <div>
                              <span className="block font-mono text-[10px] text-blue-700 font-extrabold uppercase mb-1">{node.label.split('.')[0]}</span>
                              <h5 className="font-bold text-slate-800 text-[11px] leading-tight font-display">{node.label.substring(2)}</h5>
                              <p className="text-[10px] text-slate-500 mt-1 leading-normal font-sans">{node.desc}</p>
                            </div>
                            {i < current.cycle.length - 1 && (
                              <div className="hidden md:flex absolute top-1/2 -right-3.5 transform -translate-y-1/2 z-10 w-3 h-3 text-slate-300">
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Diferenciador */}
                  <div className="border border-slate-150 bg-slate-50/30 rounded-xl p-4">
                    <div className="flex gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <Info className="w-3 h-3" />
                      </div>
                      <div>
                        <span className="font-mono text-[9px] text-slate-400 font-bold uppercase">Qué diferencia este criterio de los demás</span>
                        <p className="text-xs text-slate-600 leading-normal font-sans mt-0.5">
                          {current.difference}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })() : (
              <p className="text-xs text-slate-400 italic text-center py-12">Por favor selecciona un criterio de la lista.</p>
            )}
          </div>
        </div>
      </div>
    );
}
