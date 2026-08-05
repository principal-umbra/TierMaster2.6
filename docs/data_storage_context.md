# Contexto de Almacenamiento de Datos y Flujo de Información

Este documento define la arquitectura de datos, el control de acceso basado en roles (RBAC) y los mapeos detallados de las pestañas de Google Sheets que actúan como base de datos provisional para el sistema de gestión y gamificación de técnicos.

---

## 1. Matriz de Control de Acceso por Roles (RBAC)

El sistema distingue estrictamente entre dos roles de usuario: **User** (Técnicos de Soporte/Operaciones) y **Admin** (Supervisores y Directivos). A continuación se detalla el acceso y nivel de interacción en cada sección (pestaña) de la aplicación:

| Sección en Sistema (Tab) | Identificador Técnico | Permiso **User** | Permiso **Admin** | Descripción de Interacción |
| :--- | :--- | :---: | :---: | :--- |
| **Roster de Técnicos** | `roster` | 🚫 Sin Acceso | 👁️ Visualización / ✍️ Escritura | Gestión general de técnicos (Altas, bajas, modificación de equipos y sincronización con Sheets). |
| **Request Backlog** | `request_backlog` | 👁️ Solo propio | 👁️ Ver Todo | Bandeja de solicitudes de servicio. El técnico interactúa con su propio backlog, los administradores supervisan todo. |
| **Admin Backlog** | `admin_backlog` | 🚫 Sin Acceso | 👁️ Visualización / ✍️ Escritura | Vista administrativa para asignar tickets a técnicos de forma masiva y ajustar prioridades globales. |
| **Daily Workspace** | `workspace` | ✍️ Interactivo (Propio) | 🚫 Sin Acceso | Panel de trabajo diario para el técnico logueado. Sincroniza su jornada diaria y permite actualizar estado de tickets. |
| **Daily Admin Use** | `daily_admin_use` | 🚫 Sin Acceso | 👁️ Visualización / ✍️ Escritura | Tablero de control de asistencia, retrasos y logs del Scrum diario de todo el equipo de soporte. |
| **Evaluación de Desempeño** | `evaluation` | 🚫 Sin Acceso | 👁️ Visualización / ✍️ Escritura | Calificación de técnicos en las 5 dimensiones clave, registro de fortalezas, áreas de mejora y planes de acción. |
| **Gestión Operativa** | `operations` | ✍️ Interactivo (Propio) | 👁️ Visualización | Visualización de turnos de la semana y envío de solicitudes de ausencia/vacaciones personales. |
| **Gestión Operativa Admin** | `operations_admin` | 🚫 Sin Acceso | 👁️ Visualización / ✍️ Escritura | Panel para planificar turnos (jornadas), aprobar solicitudes de ausencias e incidentes imprevistos de todo el personal. |
| **Gamified Leaderboard** | `leaderboard` | 👁️ Visualización | 👁️ Visualización | Tabla de posiciones global del equipo basada en puntos de experiencia (XP) acumulados. Promueve la motivación. |
| **Perfil del Técnico** | `profiles` | 👁️ Solo Propio | 👁️ Ver Todo / ✍️ Edición | Perfil detallado del técnico. El rol *User* ve sus logros, habilidades, historial de XP e inicia sus planes de acción. El *Admin* puede auditar todos. |
| **Librería Backlog** | `certifications` | 👁️ Visualización / ✍️ Inscribir | 👁️ Visualización / ✍️ Crear | Catálogo de certificaciones disponibles. El *User* puede inscribirse. El *Admin* gestiona contenidos y evalúa progresos. |
| **Guía de KPIs** | `kpi_guide` | 👁️ Visualización | 👁️ Visualización | Documento de referencia que detalla las fórmulas de cálculo y criterios de evaluación de desempeño. |
| **Configuración** | `config` | 🚫 Sin Acceso | 👁️ Visualización / ✍️ Escritura | Vinculación del Spreadsheet ID de Google, token OAuth, URL del Webhook y herramientas de diagnóstico y backup. |

---

## 2. Vistas Especiales Interactivas por Sesión (Filtro de Seguridad de Cliente)

Para preservar la integridad de los datos y asegurar una experiencia enfocada, ciertas secciones se comportan de manera restrictiva basándose en el **técnico activo que ha iniciado sesión**:

### A. Daily Workspace (`workspace`)
Esta sección es el centro neurálgico del técnico en su día a día. Está diseñada con las siguientes reglas:
- **Exclusividad**: El técnico de soporte **únicamente** visualiza sus propios tickets del CRM asignados y su jornada de trabajo (Lunes a Domingo) correspondiente a la semana actual.
- **Scrum Diario**: Al iniciar el día, el técnico selecciona sus tareas clave, registra notas, reporta impedimentos o bloqueos, y actualiza el estado de sus compromisos ("Por Hacer", "En Progreso", "Completada"). Al reportar progreso, los datos se escriben directamente con su firma y se registran en el historial de Scrum de la hoja de cálculo.
- **Jornada de Turno**: Muestra la distribución horaria del usuario logueado para hoy y los próximos días de la semana, además de indicarle si le corresponde realizar teletrabajo ("Día Remoto").

### B. Mi Perfil (`profiles` - Vista de Usuario)
Cuando un usuario con rol `User` ingresa a la sección de perfiles, el sistema omite el selector de técnicos y se bloquea directamente en **su propia identidad**:
- **Estadísticas de Desempeño**: Permite examinar la puntuación radial propia en las 5 dimensiones críticas (Conocimiento, Ejecución, Relacional, Colaboración, Control).
- **Progresión y Recompensas**: Visualiza su nivel actual en el escalafón (Tier), los puntos de XP que le restan para ascender al siguiente nivel y su historial completo de eventos de experiencia.
- **Logros y Medallas**: Muestra las insignias obtenidas a lo largo de su carrera dentro de la organización de manera interactiva.
- **Plan de Acción Personal**: Permite consultar el plan de mejora establecido por su supervisor, pudiendo marcar el avance de sus metas asignadas.

### C. Gestión Operativa (`operations` - Vista de Usuario)
- **Turnos**: Consulta interactiva de su calendario de guardias semanales.
- **Ausencias y Vacaciones**: Permite rellenar y enviar de forma autónoma solicitudes de días libres (vacaciones, licencias médicas, días personales). El remitente de la solicitud se auto-completa con el ID y nombre del técnico logueado, garantizando que no se puedan enviar solicitudes a nombre de terceros. El estado inicial se guarda automáticamente como `"Pendiente"`.

---

## 3. Especificación de Pestañas de Google Sheets y Mapeo de Campos

Para garantizar el correcto flujo de información y evitar la corrupción de datos, el sistema implementa un **Mapeo Inteligente Dinámico**. 
> 💡 *Nota de Diseño Importante (Evitación de Columnas Innecesarias)*: El sistema no asume ni crea columnas fijas ni asume estructuras rígidas a ciegas. Al escribir en una hoja, el sistema primero consulta los títulos actuales del Sheet para identificar qué columnas existen. Posteriormente, mapea campo por campo la información del técnico a su respectivo título existente. Si un administrador decide eliminar columnas innecesarias de la hoja de cálculo, el sistema continuará escribiendo sin errores y omitirá de forma segura los datos de las columnas borradas, respetando el diseño del usuario.

### 1. Pestaña: Roster (`Roster`)
* **Uso en Sistema**: Almacena el roster de técnicos oficiales, su información laboral y sus métricas de juego (Gamificación).
* **Mapeo de Campos**:

| Cabecera en Google Sheet (Título) | Propiedad del Sistema (`Agent`) | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID** | `id` | `string` | Identificador único del técnico (ej. `AG-FR-765`). |
| **Nombre** | `name` | `string` | Nombre completo del técnico. |
| **Siglas** | `initials` | `string` | Iniciales o siglas de visualización rápida (ej. `FR`). |
| **Fondo de Avatar (HEX)** | `avatarBg` | `string` | Color en formato Hexadecimal para la interfaz (ej. `#2563EB`). |
| **Rol/Cargo** | `role` | `string` | Puesto o cargo asignado en la organización. |
| **Equipo** | `team` | `string` | Nombre del equipo operativo asignado. |
| **Tier ID** | `tierId` | `string` | Identificador de su rango actual en la jerarquía (ej. `l1`, `l2`, `l3`). |
| **Puntos XP** | `currentXp` | `number` | Puntos de Experiencia acumulados (controla el nivel del técnico). |
| **Email** | `email` | `string` | Correo electrónico institucional utilizado para enlazar la sesión activa. |

*Campos adicionales compatibles dinámicamente en Roster*:
- `Puntuación Conocimiento`, `Puntuación Ejecución`, `Puntuación Relacional`, `Puntuación Colaboración`, `Puntuación Control` -> Mapeados a las calificaciones de desempeño (0-100).
- `Logros (IDs)`, `Habilidades`, `Especialidades`, `Áreas de Mejora`, `Puntos de Dolor` -> Listas de texto separadas por comas.
- `Plan de Acción (JSON)`, `Historial de XP (JSON)`, `Historial Scrum (JSON)` -> Estructuras serializadas en formato JSON string para persistencia avanzada sin requerir múltiples hojas.

---

### 2. Pestaña: Jerarquía (`Jerarquia`)
* **Uso en Sistema**: Configura los rangos de escalafón, los niveles de XP requeridos para ascensos y los pesos de las evaluaciones de KPI.
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema (`TierConfig`) | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID** | `id` | `string` | Identificador único del Tier (ej. `l1`, `l2`, `l3`). |
| **Nombre** | `name` | `string` | Nombre comercial/profesional del rango. |
| **XP Mínimo** | `minXp` | `number` | XP necesaria para alcanzar este rango. |
| **XP Máximo** | `maxXp` | `number` | Límite superior de XP para este rango. |
| **Nombre de Insignia** | `badgeName` | `string` | Nombre de la insignia que se le concede al técnico. |
| **Color (HEX)** | `color` | `string` | Código de color hexadecimal asignado al rango. |
| **Descripción** | `description` | `string` | Resumen de responsabilidades o alcances del nivel. |
| **Promedio KPI Requerido** | `requiredKpi` | `number` | Promedio mínimo de KPIs para aplicar al ascenso. |
| **KPIs Elegibles** | `eligibleKpis` | `string` | Lista de KPIs considerados para este rango (separados por coma). |
| **Pesos (JSON)** | `weights` | `string (JSON)` | Pesos específicos por dimensión para las evaluaciones globales. |

---

### 3. Pestaña: Librería - Certificaciones (`Libreria - Certificaciones`)
* **Uso en Sistema**: Almacena el catálogo de capacitaciones y estándares de certificación técnica en la organización.
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema (`Certification`) | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID** | `id` | `string` | ID único de la certificación (ej. `cert-itil-f`). |
| **Título** | `title` | `string` | Nombre oficial de la certificación. |
| **Descripción** | `description` | `string` | Detalle del temario u objetivos. |
| **Icono** | `icon` | `string` | Nombre del icono de Lucide a renderizar (ej. `Award`, `Shield`). |
| **Dimensión** | `dimension` | `string` | Dimensión de KPI que fortalece (ej. `Conocimiento`). |
| **Tier Destino** | `targetTier` | `string` | Nivel para el cual es recomendada u opcional (ej. `l2`). |
| **Estado** | `status` | `string` | Estado del curso (`Active`, `Archived`). |
| **Importancia** | `importance` | `string` | Criticidad (`Básica`, `Importante`, `Mandatoria`). |
| **Puntos** | `points` | `number` | Recompensa en XP otorgada al aprobar la certificación. |
| **Agentes Inscritos (IDs)** | `enrolledAgents` | `string` | Comma-separated list de IDs de técnicos inscritos. |
| **Agentes Completados (IDs)** | `completedAgents` | `string` | Comma-separated list de IDs de técnicos certificados. |
| **Req. Suceso** | `reqEvent` | `string` | Evento práctico requerido para completar. |
| **Req. Acción** | `reqAction` | `string` | Acción técnica que debe demostrar. |
| **Req. Conclusión** | `reqConclusion` | `string` | Evidencia final solicitada para el cierre. |

---

### 4. Pestaña: Evaluaciones - Certificaciones (`Evaluaciones - Certificaciones`)
* **Uso en Sistema**: Almacena las calificaciones detalladas y el progreso de los técnicos para cada una de las certificaciones en las que se han inscrito.
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID Evaluacion** | `idEvaluation` | `string` | Identificador único del registro de evaluación. |
| **ID Agente** | `agentId` | `string` | ID del técnico evaluado. |
| **Nombre Agente** | `agentName` | `string` | Nombre del técnico evaluado. |
| **ID Certificación** | `certId` | `string` | ID del catálogo de certificación. |
| **Título Certificación** | `certTitle` | `string` | Título del catálogo de certificación. |
| **Completada Totalmente** | `completed` | `string` | Indica si se aprobó completamente (`SÍ` / `NO`). |
| **Nota Examen** | `examGrade` | `number` | Calificación obtenida en el examen teórico (0 a 100). |
| **Examen Aprobado** | `examPassed` | `string` | Si superó el umbral teórico mínimo (`SÍ` / `NO`). |
| **Tema Exposición** | `presentationTopic` | `string` | Título de la presentación técnica oral. |
| **Estado Exposición** | `presentationStatus` | `string` | Estado de la defensa oral (`Pendiente`, `Aprobado`, `Reprobado`). |
| **Evaluador Exposición** | `presentationEvaluator` | `string` | Nombre del supervisor o administrador evaluador. |
| **Fecha Exposición** | `presentationDate` | `string` | Fecha en que se defendió el examen práctico. |
| **Feedback Exposición** | `presentationFeedback` | `string` | Comentarios del comité evaluador sobre la exposición. |
| **Evidencia Operativa** | `operationalEvidence` | `string` | Enlace a tickets, repositorios o grabación de la prueba. |
| **Validación Operativa** | `operationalValidated` | `string` | Confirmación de destreza técnica en el puesto (`SÍ` / `NO`). |
| **Feedback final** | `finalFeedback` | `string` | Cierre y comentarios integrales de la certificación. |

---

### 5. Pestaña: Gestión Operativa - Tareas (`Gestion Operativa - Tareas`)
* **Uso en Sistema**: Centraliza la planificación de asignaciones recurrentes y puntuales para todo el equipo de ingeniería de soporte.
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID** | `id` | `string` | Identificador único de la tarea asignada (ej. `TASK-102`). |
| **Categoría** | `category` | `string` | Categoría vertical (ej. `Mantenimiento`, `Soporte`, `Guardia`). |
| **Título** | `title` | `string` | Título de la actividad operativa. |
| **Ticket ID** | `ticketId` | `string` | Ticket CRM de referencia (opcional). |
| **Estado** | `status` | `string` | Estado actual (`Pendiente`, `En Proceso`, `Completada`, `Vencida`). |
| **Notas** | `notes` | `string` | Instrucciones de ejecución. |
| **Técnico/Supervisor (ID)** | `agentId` | `string` | ID del técnico que debe ejecutar la tarea. |
| **Técnico/Supervisor (Nombre)**| `agentName` | `string` | Nombre de visualización del técnico asignado. |
| **Tipo de Tarea** | `type` | `string` | Identifica si es tarea `Interna` o de `Contratista`. |
| **Frecuencia** | `frequency` | `string` | Regla de recurrencia (`Única`, `Diaria`, `Semanal`, `Mensual`, `Anual`). |
| **Fecha Programada** | `scheduledDate` | `string` | Fecha asignada de ejecución (formato `YYYY-MM-DD`). |
| **Día Recurrencia Semana** | `recurrenceWeekDay` | `number` | Día específico de la semana (0: Domingo, 1: Lunes, etc.). |
| **Día Recurrencia Mes** | `recurrenceMonthDay` | `number` | Día del mes para recurrencias mensuales (1 a 31). |
| **Sin Fecha** | `noDate` | `string` | Si la tarea flota sin fecha límite definida (`SÍ` / `NO`). |
| **Tiene Fecha Fin** | `hasEndDate` | `string` | Si la regla de recurrencia tiene fecha límite (`SÍ` / `NO`). |
| **Fecha Fin Recurrencia** | `endDate` | `string` | Límite final de recurrencia (formato `YYYY-MM-DD`). |
| **Reporte de Finalización** | `completionReport` | `string` | Breve reporte escrito por el técnico al marcarla como completada. |
| **Nombre del Contratista** | `contractorName` | `string` | Nombre del proveedor/contratista externo (si aplica). |
| **Fecha de Inicio** | `startDate` | `string` | Fecha de inicio real de la tarea por contratista. |
| **Fecha de Vencimiento** | `dueDate` | `string` | Fecha límite para el contratista externo. |
| **Notas de Seguimiento** | `followUpNotes` | `string` | Notas de control del supervisor de la operación. |
| **Notas de Finalización** | `completionNotes` | `string` | Comentarios finales del contratista o supervisor. |
| **Última Actualización** | `lastUpdated` | `string` | Timestamp del último cambio. |

---

### 6. Pestaña: Gestión Operativa - Eventos (`Gestion Operativa - Eventos`)
* **Uso en Sistema**: Bitácora de incidencias, méritos imprevistos, fallos críticos de infraestructura o reconocimientos recibidos por el personal técnico.
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema (`IsolatedEvent`) | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID** | `id` | `string` | Identificador correlativo del evento registrado. |
| **Técnico ID** | `agentId` | `string` | ID del técnico involucrado en el evento. |
| **Título** | `title` | `string` | Nombre abreviado del suceso. |
| **Fecha** | `date` | `string` | Fecha del incidente (formato `YYYY-MM-DD`). |
| **Tipo** | `type` | `string` | Tipo de evento (ej. `Incidente`, `Felicitación`, `Ausencia`). |
| **Notas** | `notes` | `string` | Contexto, causas o detalles adicionales de lo ocurrido. |
| **Intensidad** | `intensity` | `number` | Impacto en XP (rango entre `-10` y `+10`). |
| **Última Actualización** | `lastUpdated` | `string` | Timestamp de registro en el sistema. |

---

### 7. Pestaña: Gestión Operativa - Jornada (`Gestion Operativa - Jornada`)
* **Uso en Sistema**: Define el horario laboral estándar de cada técnico de soporte durante los siete días de la semana y su modalidad híbrida (teletrabajo).
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID Agente** | `idAgente` | `string` | ID único del técnico. |
| **Nombre Agente** | `nombreAgente` | `string` | Nombre completo del técnico para facilidades de lectura humana. |
| **Lunes** ... **Domingo** | `lunes` ... `domingo` | `string` | Rango de turno asignado para ese día (ej. `08:00 - 17:00` o `Libre`). |
| **Día Remoto** | `diaRemoto` | `string` | Día asignado de teletrabajo (ej. `Miércoles`, `Ninguno`). |
| **Turno Asignado** | `turnoAsignado` | `string` | Nombre identificador del turno (ej. `Mañana - Grupo A`). |
| **Última Actualización** | `lastUpdated` | `string` | Fecha y hora de publicación del turno semanal. |

---

### 8. Pestaña: Gestión Operativa - Ausencias (`Gestion Operativa - Ausencias y Vacaciones`)
* **Uso en Sistema**: Flujo de solicitud, revisión y autorización de ausencias, licencias médicas o vacaciones del personal técnico.
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID Solicitud** | `idSolicitud` | `string` | ID de rastreo de la solicitud (ej. `SOL-005`). |
| **ID Técnico** | `idAgente` | `string` | ID del técnico solicitante. |
| **Nombre Técnico** | `nombreAgente` | `string` | Nombre del técnico solicitante. |
| **Tipo** | `tipo` | `string` | Motivo de la ausencia (`Vacaciones`, `Médico`, `Personal`, `Compensatorio`). |
| **Fecha Inicio** | `fechaInicio` | `string` | Primer día de ausencia programada (formato `YYYY-MM-DD`). |
| **Fecha Fin** | `fechaFin` | `string` | Último día de ausencia (formato `YYYY-MM-DD`). |
| **Motivo** | `motivo` | `string` | Justificación detallada provista por el solicitante. |
| **Estado** | `estado` | `string` | Estado del trámite (`Pendiente`, `Aprobado`, `Rechazado`). |
| **Fecha Solicitud** | `fechaSolicitud` | `string` | Fecha de creación de la solicitud. |
| **Solicitado Por** | `solicitadoPor` | `string` | Firma/Correo del usuario que inició la solicitud. |
| **Revisado Por** | `revisadoPor` | `string` | Nombre del administrador que procesó la solicitud. |
| **Fecha Revisión** | `fechaRevision` | `string` | Timestamp de aprobación o rechazo. |
| **Notas** | `notas` | `string` | Comentarios de retroalimentación provistos por el aprobador. |

---

### 9. Pestaña: Historial - Daily Scrum (`Historial - Daily Scrum`)
* **Uso en Sistema**: Registro histórico de los reportes diarios de Scrum de todos los técnicos, guardando constancia de sus avances e impedimentos diarios.
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID Tarea** | `id` | `string` | ID de la tarea del CRM que el técnico trabajó hoy. |
| **Técnico ID** | `agentId` | `string` | ID del técnico redactor del Scrum. |
| **Técnico Nombre** | `agentName` | `string` | Nombre del técnico redactor. |
| **Ticket CRM** | `ticketId` | `string` | Código del ticket CRM involucrado (ej. `CRM-4560`). |
| **Título** | `title` | `string` | Título del ticket de trabajo. |
| **Categoría** | `category` | `string` | Categoría técnica del ticket (ej. `Soporte Técnico`). |
| **Prioridad** | `priority` | `string` | Severidad del ticket (`Baja`, `Media`, `Alta`, `Crítica`). |
| **Estado** | `status` | `string` | Estado en el tablero diario (`Por Hacer`, `En Progreso`, `Completada`). |
| **Días de Retraso** | `delayDays` | `number` | Número de días que el ticket ha estado retrasado. |
| **Notas Adicionales** | `additionalNotes` | `string` | Comentarios del técnico de Scrum (lo que hizo hoy, qué hará, impedimentos). |
| **Fecha de Actualización** | `lastUpdated` | `string` | Fecha y hora en que se envió el commit de Scrum. |

---

### 10. Pestaña: Gestión Operativa - Designaciones (`Gestion Operativa - Designaciones`)
* **Uso en Sistema**: Asignaciones especiales del equipo, guardias extraordinarias de soporte en días feriados, o proyectos técnicos ad-hoc de corto plazo.
* **Mapeo de Campos**:

| Cabecera en Google Sheet | Propiedad del Sistema | Tipo de Datos | Descripción / Regla de Negocio |
| :--- | :--- | :--- | :--- |
| **ID Designacion** | `idDesignacion` | `string` | Identificador correlativo único para la asignación extraordinaria. |
| **Tipo** | `tipo` | `string` | Nombre del proyecto u operativo especial asignado. |
| **Fecha Inicio** | `fechaInicio` | `string` | Fecha de entrada en vigor del operativo (formato `YYYY-MM-DD`). |
| **Fecha Fin** | `fechaFin` | `string` | Fecha de conclusión de la asignación (formato `YYYY-MM-DD`). |
| **ID Agente** | `idAgente` | `string` | ID del técnico participante designado. |
| **Nombre Agente** | `nombreAgente` | `string` | Nombre del técnico participante. |
| **Asignado Por** | `asignadoPor` | `string` | Supervisor o administrador que autorizó la asignación. |
| **Ultima Actualizacion**| `lastUpdated` | `string` | Timestamp de registro de la designación especial. |

---

## 4. Flujo de Tráfico de Información y Mecanismo de Sincronización

El sistema está configurado para operar de forma robusta e híbrida utilizando dos métodos complementarios para leer y escribir datos, garantizando tolerancia a fallos de red o problemas de conexión:

```
[ Frontend del Sistema ]
       │
       ├─► (Con OAuth / Token Activo) ──► API REST Google Sheets v4 (Acceso Directo y Rápido)
       │
       └─► (Sin Token / Fallback) ──────► Webhook Integrado (Google Apps Script en segundo plano)
```

### Mecanismos de Sincronización:
1. **API REST de Google Sheets (Directo)**: 
   - Utilizado cuando el administrador se autentica con su cuenta de Google Workspace en la pestaña de configuración. 
   - Realiza consultas y escrituras HTTPS de baja latencia directo a los endpoints de Google v4.
   - Crea automáticamente las pestañas si faltan (`createSheetIfMissing`).

2. **Google Apps Script Webhook (Fallback/Public)**:
   - Proporciona acceso público simplificado para operaciones asíncronas y técnicos de nivel `User` sin requerir que cada técnico individual conceda accesos OAuth completos de Google a su cuenta de Gmail personal.
   - Procesa peticiones tipo `POST` para actualizar rosters, registrar Scrum, enviar ausencias y registrar eventos, y peticiones `GET` para recuperar información en tiempo real.

3. **Mecanismo de Recuperación de Cabeceras (Seguridad de Tráfico)**:
   - Al realizar una acción de empuje (`push`), el sistema ejecuta `fetchCurrentSheetHeaders` para inspeccionar la estructura de columnas actual de la pestaña activa en Google Sheets antes de enviar el payload.
   - Luego, el mapeador dinámico `mapAgentToHeaderValue` vincula los campos internos a las columnas existentes según su título en la hoja. Esto asegura que si el administrador eliminó u reorganizó las columnas en Google Sheets, la data no se desborde ni se corrompa, manteniendo la compatibilidad bidireccional perfecta.
