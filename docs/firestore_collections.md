# Estructura de Colecciones en Cloud Firestore

Este documento sirve como constancia y referencia técnica detallada sobre la función, comportamiento y ciclo de vida de cada una de las colecciones de **Cloud Firestore** utilizadas por el sistema de gestión, gamificación y soporte de técnicos.

---

## 1. Módulo Core: Gestión de Backlog y Solicitudes de Servicio

Este grupo de colecciones es el núcleo de la bandeja operativa de requerimientos. Coordina la distribución de tickets diarios y su archivo al final de cada sprint (semana).

### `/requerimientos_en_curso`
* **Función**: Almacena todos los tickets que actualmente están activos, asignados o en desarrollo ("en curso") provenientes del CRM.
* **Origen de Datos**: Se actualiza mediante la carga y sincronización de archivos Excel o conexiones CRM.
* **Comportamiento**: Es la bandeja activa diaria visible para los técnicos en su panel de trabajo. Un ticket permanece aquí hasta que el técnico lo completa o se descarta de las operaciones activas.

### `/backlog_semanal`
* **Función**: Almacena el backlog de requerimientos trabajados y completados durante el ciclo de trabajo de la semana en curso (sprint activo) por los agentes del roster principal.
* **Origen de Datos**: Se alimenta de los tickets que los técnicos finalizan en su día a día o de las cargas de datos cerrados de la semana (pestaña "done").
* **Comportamiento**: Actúa como un área de preparación intermedia (staging area). Los registros se retienen aquí temporalmente hasta que un administrador realiza el **Cierre de Ciclo Semanal**.

### `/backlog_semanal_contratistas`
* **Función**: Almacena el backlog de requerimientos trabajados y completados durante la semana en curso de forma exclusiva por los contratistas externos y soporte tercerizado.
* **Origen de Datos**: Se alimenta del registro de tickets finalizados por contratistas.
* **Comportamiento**: Funciona en paralelo a `/backlog_semanal`, aislando por completo los registros de contratistas para auditorías más específicas. Al cerrarse la semana, sus tickets fluyen al histórico unificado o a la antesala de contratistas.

### `/admin_backlog_done`
* **Función**: Cola de excepción para tickets completados por los agentes del roster principal que requieren una auditoría humana antes de ser archivados.
* **Origen de Datos**: Durante el proceso de **Cierre Semanal (Archivo Histórico)**, cualquier ticket en `/backlog_semanal` que se encuentre con el estado específico `"PENDIENTE A CONFIRMAR"` es desviado a `/admin_backlog_done` en lugar de enviarse al histórico.
* **Ciclo de Vida**: Los administradores revisan y verifican estas solicitudes. Una vez aprobadas, se aprueba su paso al histórico definitivo.

### `/admin_backlog_done_contratistas`
* **Función**: Cola de excepción específica para los requerimientos de contratistas marcados como `"PENDIENTE A CONFIRMAR"`.
* **Origen de Datos**: Durante el **Cierre Semanal**, cualquier registro en `/backlog_semanal_contratistas` que requiera validación manual es enviado a esta antesala.
* **Ciclo de Vida**: Los administradores auditan estas entradas en la pestaña "Confirmar Completados" mediante el filtro de Contratistas. Al aprobarse, se unen al histórico unificado.

### `/historico_completados`
* **Función**: El almacén histórico definitivo a largo plazo. Contiene todos los tickets que han sido resueltos de forma exitosa y validados en semanas previas, tanto por agentes del roster como por contratistas.
* **Origen de Datos**: Poblado durante el proceso de **Cierre Semanal** con los tickets validados de `/backlog_semanal` y `/backlog_semanal_contratistas`, o tras la confirmación de las antesalas de administración.
* **Comportamiento**: Es un archivo de solo lectura para la operación diaria, utilizado únicamente para generar reportes acumulados, KPIs históricos y consultas retrospectivas.

---

## 2. Colecciones Deprecadas / De Limpieza Temporal

### `/crm_print` y `/admin_backlog_done_print`
* **Función Antigua**: Capturas de pantalla o tablas de contraste temporal (comparativas "print") en base de datos. Se usaban para comparar cambios directos en subidas masivas previas.
* **Estado Operativo**: **DEPRECADO**. Con la implementación del cargador directo unificado y la comparación inteligente del lado del cliente/servidor, estas colecciones ya no son necesarias para la lógica transaccional activa de la aplicación.
* **Recomendación**: Se han limpiado por completo a cero documentos (0 docs) para evitar ruidos de datos, optimizar recursos y mantener una base de datos limpia de pruebas residuales.

---

## 3. Módulo de Gamificación, Perfiles y Jerarquías

Controla la progresión de los técnicos, la obtención de puntos de experiencia (XP), niveles y planes de acción individuales.

### `/roster_agentes`
* **Función**: Registro maestro de técnicos activos. Almacena nombres, siglas, equipos, correos institucionales, y las métricas de gamificación en tiempo real (Puntos de XP, Tiers y niveles).
* **Comportamiento**: Centraliza la identidad de cada usuario para la autenticación y vinculación de tableros de control.

### `/tiers`
* **Función**: Configuración de rangos jerárquicos de la organización (ej. L1, L2, L3).
* **Campos Clave**: Puntos de XP requeridos para ascenso, nombres y diseños de insignias, colores estéticos de UI y pesos ponderados por dimensión de KPI.

### `/eventos`
* **Función**: Bitácora de incidentes y reconocimientos operativos. Guarda registro de felicitaciones de clientes, amonestaciones, retrasos u horas extras que restan o suman puntos de XP de forma directa.

### `/profiles`
* **Función**: Almacena los perfiles extendidos de cada agente, incluyendo detalles como habilidades técnicas declaradas, especialidades, áreas de dolor y planes de acción específicos asignados por sus supervisores directos.

---

## 4. Módulo de Capacitación y Biblioteca Técnica

### `/certifications`
* **Función**: Catálogo interactivo de certificaciones y cursos disponibles en la biblioteca del sistema.
* **Campos Clave**: Dimensión de KPI que fortalece (ej. Conocimiento, Ejecución), requerimientos prácticos de aprobación y puntos de XP que otorga de recompensa.

### `/evaluations`
* **Función**: Registro del progreso individual de los técnicos inscritos en las certificaciones.
* **Campos Clave**: Notas de exámenes teóricos, estado de exposiciones prácticas y feedback cualitativo otorgado por los supervisores evaluadores.

---

## 5. Módulo de Gestión Operativa Diaria y Asistencia

### `/jornadas`
* **Función**: Horarios laborables asignados a los técnicos para cada día de la semana (Lunes a Domingo), especificando además los días asignados de teletrabajo ("Día Remoto").

### `/asistencia`
* **Función**: Bitácora de asistencia y control de puntualidad. Registra horas exactas de inicio de jornada, retrasos y estados del Scrum de entrada de cada agente.

### `/ausencias`
* **Función**: Gestión y flujo de aprobación de solicitudes de ausencias, licencias médicas, días personales y vacaciones.

### `/dailyScrumBoards` y `/dailyScrumHistory`
* **Función**: Tableros dinámicos diarios donde los técnicos planifican y actualizan sus compromisos de tickets de soporte ("Por Hacer", "En Progreso", "Completado"), y la bitácora histórica permanente que guarda constancia de sus avances reportados.

### `/designations`
* **Función**: Asignaciones especiales, guardias extraordinarias en días feriados, o proyectos técnicos ad-hoc asignados a técnicos.

### `/visitas_programadas`
* **Función**: Control de visitas técnicas físicas programadas en campo para técnicos de soporte.

### `/collaborations`
* **Función**: Solicitudes de soporte colaborativo o asignación conjunta de requerimientos del CRM entre técnicos.

---

## 6. Módulo de Control de Proveedores, Contratistas e Infraestructura

### `/contractors`
* **Función**: Directorio maestro de contratistas, proveedores externos e ingenieros de soporte tercerizados.

### `/internalTasks` y `/contractorTasks`
* **Función**: Planeación y desglose de tareas operativas internas o asignaciones específicas encomendadas a contratistas con fechas límite de cumplimiento.

### `/calendarioOperativo`
* **Función**: Eventos del calendario global del equipo de soporte para hitos técnicos, migraciones programadas o ventanas de mantenimiento.

### `/personalReminders`
* **Función**: Almacenamiento localizable de recordatorios, notas rápidas y tareas pendientes creadas de forma autónoma por técnicos o supervisores.

### `/credentials`
* **Función**: Almacena las claves secretas cifradas, tokens OAuth de la API de Google y configuraciones del Webhook en segundo plano para la sincronización con Google Sheets.
