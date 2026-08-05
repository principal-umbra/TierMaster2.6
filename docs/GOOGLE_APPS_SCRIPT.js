/**
 * TIER MASTER & FHONS METRICS - GOOGLE APPS SCRIPT UNIVERSAL DE CONEXIÓN
 * 
 * Este script actúa como un puente de automatización (Webhook) universal.
 * Permite leer y escribir libremente en cualquier pestaña de su Google Sheet,
 * en cualquier fila, columna o celda, sin importar el esquema o cantidad de datos.
 * 
 * INSTRUCCIONES DE INSTALACIÓN:
 * 1. En su Google Sheet, vaya al menú superior "Extensiones" -> "Apps Script".
 * 2. Borre el código que aparezca por defecto en el editor.
 * 3. Pegue este código completo.
 * 4. Haga clic en el ícono de disco (Guardar proyecto) arriba.
 * 5. Haga clic en el botón azul "Implementar" (arriba a la derecha) -> "Nueva implementación".
 * 6. Seleccione tipo de implementación: "Aplicación web" (ícono de engranaje).
 * 7. Configure:
 *    - Descripción: "Tier Master API v3"
 *    - Ejecutar como: "Yo" (rquintana@fhons.com.do o su cuenta)
 *    - Quién tiene acceso: "Cualquier persona" (IMPORTANTE para que la app pueda conectar sin tokens OAuth).
 * 8. Haga clic en "Implementar".
 * 9. Copie la "URL de la aplicación web" generada (debe terminar en "/exec").
 * 10. Pegue esa URL en la pestaña de Configuración de la aplicación en "Webhook URL".
 */

function doGet(e) {
  var action = e.parameter.action;
  var spreadsheetId = e.parameter.spreadsheetId;
  var sheetTabName = e.parameter.sheetTabName || e.parameter.sheetName || "CRM";

  if (!spreadsheetId) {
    return createResponse({ status: "error", message: "El ID de la planilla 'spreadsheetId' es requerido." });
  }

  try {
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var sheet = getOrCreateSheet(ss, sheetTabName);
    
    var range = sheet.getDataRange();
    var values = range.getValues();

    return createResponse({
      status: "success",
      sheetName: sheet.getName(),
      values: values
    });

  } catch (err) {
    return createResponse({ status: "error", message: "Error al leer hoja: " + err.toString() });
  }
}

function doPost(e) {
  try {
    var postData;
    if (e.postData.type === "application/json" || !e.postData.type) {
      postData = JSON.parse(e.postData.contents);
    } else {
      // Soporte para envío como text/plain para evitar bloqueos CORS preflight de navegadores
      postData = JSON.parse(e.postData.contents);
    }
    
    var action = postData.action;
    var spreadsheetId = postData.spreadsheetId;
    
    if (!spreadsheetId) {
      return createResponse({ status: "error", message: "El ID de la planilla 'spreadsheetId' es requerido." });
    }
    
    var ss = SpreadsheetApp.openById(spreadsheetId);
    var responseData;
    
    if (action === "updateRoster") {
      responseData = handleUpdateRoster(ss, postData.agents);
    } else if (action === "updateTiers") {
      responseData = handleUpdateTiers(ss, postData.tiers);
    } else if (action === "updateCRM") {
      var tabName = postData.sheetTabName || postData.sheetName || "CRM";
      responseData = handleUpdateCRM(ss, tabName, postData.crmRows);
    } else if (action === "writeGeneric") {
      var tabName = postData.sheetTabName || postData.sheetName;
      responseData = handleWriteGeneric(ss, tabName, postData.headers, postData.rows);
    } else if (action === "updateCell") {
      responseData = handleUpdateCell(ss, postData.sheetTabName, postData.row, postData.col, postData.value);
    } else {
      return createResponse({ status: "error", message: "La acción '" + action + "' no es reconocida." });
    }
    
    return createResponse(responseData);
    
  } catch (err) {
    return createResponse({ status: "error", message: "Error en doPost: " + err.toString() });
  }
}

/**
 * Retorna la pestaña correspondiente o la crea si no existe
 */
function getOrCreateSheet(ss, tabName) {
  var sheet = ss.getSheetByName(tabName);
  if (sheet) return sheet;
  
  // Coincidencia insensible a mayúsculas
  var sheets = ss.getSheets();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().trim() === tabName.toLowerCase().trim()) {
      return sheets[i];
    }
  }
  
  // Si no existe, crearla dinámicamente
  return ss.insertSheet(tabName);
}

/**
 * Guarda los agentes del Roster de forma consistente
 */
function handleUpdateRoster(ss, agents) {
  var sheet = getOrCreateSheet(ss, "Roster");
  sheet.clear();
  
  var headers = [
    "ID", "Nombre", "Siglas", "Fondo de Avatar (HEX)", "Rol/Cargo", "Equipo", "Tier ID", "Puntos XP",
    "Puntuación Conocimiento", "Puntuación Ejecución", "Puntuación Relacional", "Puntuación Colaboración", "Puntuación Control",
    "Logros (IDs)", "Certificaciones (IDs)", "Progreso Certs (JSON)", "Habilidades", "Especialidades", "Áreas de Mejora", "Puntos de Dolor", "Plan de Acción (JSON)",
    "Historial de XP (JSON)", "Historial Scrum (JSON)", "Email"
  ];
  
  var values = [headers];
  if (agents && agents.length > 0) {
    agents.forEach(function(agent) {
      values.push([
        agent.id || "",
        agent.name || "",
        agent.initials || "",
        agent.avatarBg || "#2563EB",
        agent.role || "",
        agent.team || "",
        agent.tierId || "l1",
        agent.currentXp ?? 0,
        agent.dimensionScores?.knowledge ?? 50,
        agent.dimensionScores?.execution ?? 50,
        agent.dimensionScores?.relational ?? 50,
        agent.dimensionScores?.collaborative ?? 50,
        agent.dimensionScores?.control ?? 50,
        (agent.achievements || []).join(", "),
        (agent.certifications || []).join(", "),
        JSON.stringify(agent.certProgress || {}),
        (agent.skills || []).join(", "),
        (agent.specialties || []).join(", "),
        (agent.improvementAreas || []).join(", "),
        (agent.painPoints || []).join(", "),
        JSON.stringify(agent.actionPlan || []),
        JSON.stringify(agent.xpEvents || []),
        JSON.stringify(agent.scrumLogs || []),
        agent.email || ""
      ]);
    });
  }
  
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  return { status: "success", message: "Roster actualizado correctamente con " + (values.length - 1) + " técnicos." };
}

/**
 * Guarda las configuraciones de Tiers (Jerarquía)
 */
function handleUpdateTiers(ss, tiers) {
  var sheet = getOrCreateSheet(ss, "Jerarquia");
  sheet.clear();
  
  var headers = [
    "ID", "Nombre", "XP Mínimo", "XP Máximo", "Nombre de Insignia", "Color (HEX)", "Descripción", "Promedio KPI Requerido", "KPIs Elegibles", "Pesos (JSON)"
  ];
  
  var values = [headers];
  if (tiers && tiers.length > 0) {
    tiers.forEach(function(tier) {
      values.push([
        tier.id || "",
        tier.name || "",
        tier.minXp ?? 0,
        tier.maxXp ?? 1000,
        tier.badgeName || "",
        tier.colorHex || "#3B82F6",
        tier.desc || "",
        tier.requiredKpiAvg ?? 60,
        (tier.eligibleKpis || []).join(", "),
        JSON.stringify(tier.weights || {})
      ]);
    });
  }
  
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  return { status: "success", message: "Escalafón de Tiers actualizado con " + (values.length - 1) + " niveles." };
}

/**
 * Escribe las filas del CRM / Backlog de forma universal y estructurada
 */
function handleUpdateCRM(ss, tabName, crmRows) {
  var sheet = getOrCreateSheet(ss, tabName);
  sheet.clear();
  
  if (!crmRows || crmRows.length === 0) {
    // Si no hay filas, escribir encabezados estándar mínimos
    var defaultHeaders = ["ID", "Assigned To", "Status", "Priority", "Request Type", "Created Date", "Account", "Contact", "Subject"];
    sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
    return { status: "success", message: "Pestaña " + tabName + " vaciada y configurada con encabezados estándar." };
  }
  
  // Detectar todas las claves únicas para usarlas como encabezados
  var headersMap = {};
  crmRows.forEach(function(row) {
    Object.keys(row).forEach(function(key) {
      if (!key.startsWith("_")) { // Excluir campos internos temporales
        headersMap[key] = true;
      }
    });
  });
  
  var headers = Object.keys(headersMap);
  
  // Ordenar encabezados con prioridad estándar para CRM si existen
  var stdOrder = ["ID", "Assigned To", "Status", "Priority", "Request Type", "Created Date", "Account", "Contact", "Subject"];
  headers.sort(function(a, b) {
    var idxA = stdOrder.indexOf(a);
    var idxB = stdOrder.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
  
  var values = [headers];
  crmRows.forEach(function(row) {
    var line = headers.map(function(h) {
      return row[h] !== undefined && row[h] !== null ? String(row[h]) : "";
    });
    values.push(line);
  });
  
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  return { status: "success", message: "Pestaña '" + tabName + "' actualizada correctamente con " + (values.length - 1) + " filas." };
}

/**
 * Escritura genérica libre para cualquier conjunto de datos tabulares (cabeceras y renglones)
 */
function handleWriteGeneric(ss, tabName, headers, rows) {
  if (!tabName) return { status: "error", message: "Nombre de pestaña 'sheetTabName' es requerido." };
  var sheet = getOrCreateSheet(ss, tabName);
  sheet.clear();
  
  if (!headers || headers.length === 0) {
    return { status: "error", message: "Las cabeceras de columnas son requeridas." };
  }
  
  var values = [headers];
  if (rows && rows.length > 0) {
    rows.forEach(function(row) {
      var line = headers.map(function(h) {
        return row[h] !== undefined && row[h] !== null ? String(row[h]) : "";
      });
      values.push(line);
    });
  }
  
  sheet.getRange(1, 1, values.length, headers.length).setValues(values);
  return { status: "success", message: "Pestaña '" + tabName + "' escrita exitosamente (" + (values.length - 1) + " renglones)." };
}

/**
 * Escribe un valor en una celda específica de cualquier pestaña (ej: Fila 4, Columna 10)
 */
function handleUpdateCell(ss, tabName, row, col, value) {
  if (!tabName) return { status: "error", message: "El nombre de pestaña es requerido." };
  if (!row || !col) return { status: "error", message: "Fila y columna son requeridas (1-indexed)." };
  
  var sheet = getOrCreateSheet(ss, tabName);
  sheet.getRange(row, col).setValue(value);
  
  return { status: "success", message: "Celda en pestaña '" + tabName + "' modificada correctamente (R" + row + "C" + col + ")." };
}

/**
 * Utilidad para formatear la respuesta JSON de forma segura con cabeceras CORS
 */
function createResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
