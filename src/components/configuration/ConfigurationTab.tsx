import React, { useState, useEffect } from 'react';
import { TierConfig, DimensionType } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { INITIAL_AGENTS } from '../../mockData';
import { overrideSeedDatabase, fetchCRMData, saveCRMData, subscribeToGoogleMapsUsage, resetGoogleMapsUsage, saveGoogleMapsKey, getFirebaseLocalUsage } from '../../db/firebaseService';
import { ManageEngineConfigCard } from './ManageEngineConfigCard';

const APPS_SCRIPT_CODE = `/**
 * ====================================================================================
 * SCRIPT DE CONEXIÓN UNIVERSAL DE BASE DE DATOS (LECTURA Y ESCRITURA EN TIEMPO REAL)
 * ====================================================================================
 * Este script convierte tu Google Sheet en una base de datos segura y de acceso rápido.
 * Permite a la aplicación web leer y escribir en CUALQUIER pestaña/hoja del documento
 * de forma completamente transparente y automática, sin que los usuarios tengan que loguearse.
 * 
 * INSTRUCCIONES DE INSTALACIÓN Y DESPLIEGUE:
 * ------------------------------------------------------------------------------------
 * 1. Abre tu hoja de cálculo de Google.
 * 2. Ve al menú superior y selecciona "Extensiones" > "Apps Script".
 * 3. Si hay código en el editor, bórralo por completo.
 * 4. Pega exactamente todo este código en el editor.
 * 5. Haz clic en el icono del disquete ("Guardar proyecto") en la parte superior.
 * 6. Haz clic en el botón azul "Implementar" > "Nueva implementación" (arriba a la derecha).
 * 7. En el panel de "Nueva implementación", haz clic en el icono del engranaje y selecciona "Aplicación web".
 * 8. Configura los siguientes campos obligatorios:
 *    - Descripción: Base de Datos Universal para Gestor de Agentes
 *    - Ejecutar como: "Yo" (Tu cuenta de Google, dueño del archivo)
 *    - Quién tiene acceso: "Cualquiera" (Esto es CRUCIAL para que funcione como DB segura sin login)
 * 9. Haz clic en "Implementar".
 * 10. Si es la primera vez, Google te pedirá "Autorizar acceso". Haz clic en "Autorizar acceso", selecciona tu cuenta, 
 *     ve a "Avanzado" (abajo a la izquierda en letra gris pequeña) y luego a "Ir a Proyecto sin título (no seguro)" o similar, 
 *     y por último haz clic en "Permitir".
 * 11. Copia la "URL de la aplicación web" generada (termina en /exec) y pégala en el campo "Webhook de Automatización (Apps Script URL)" 
 *     de la pestaña Configuración de la aplicación. ¡Listo!
 */

function doGet(e) {
  try {
    var action = e.parameter.action;
    var spreadsheetId = e.parameter.spreadsheetId;
    var sheetTabName = e.parameter.sheetTabName || e.parameter.sheetName || "CRM";
    
    // Conectar con la hoja de cálculo activa o abrir por ID si se especifica
    var ss = SpreadsheetApp.getActiveSpreadsheet() || (spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : null);
    if (!ss) {
      throw new Error("No se pudo conectar a la hoja de cálculo. Asegúrate de vincular este script al archivo o pasar un ID válido.");
    }
    
    // Determinar la pestaña objetivo según la acción
    var targetSheetName = "";
    if (action === "readRoster") {
      targetSheetName = sheetTabName && sheetTabName !== "CRM" ? sheetTabName : "Roster";
    } else if (action === "readTiers") {
      targetSheetName = e.parameter.sheetTiersTab || e.parameter.sheetTiersTabName || "Jerarquia";
    } else if (action === "readCertifications") {
      targetSheetName = e.parameter.sheetCertsTab || e.parameter.sheetCertsTabName || "Libreria - Certificaciones";
    } else {
      targetSheetName = sheetTabName;
    }
    
    // Buscar la pestaña de forma insensible a mayúsculas/minúsculas
    var sheet = getSheetCaseInsensitive(ss, targetSheetName);
    if (!sheet) {
      if (action === "readRoster") {
        sheet = ss.insertSheet(targetSheetName);
        var defaultHeaders = ["ID", "Nombre", "Siglas", "Fondo de Avatar (HEX)", "Rol/Cargo", "Equipo", "Tier ID", "Puntos XP", "Email"];
        sheet.getRange(1, 1, 1, defaultHeaders.length).setValues([defaultHeaders]);
        var headerRange = sheet.getRange(1, 1, 1, defaultHeaders.length);
        headerRange.setBackground("#2563eb");
        headerRange.setFontColor("#ffffff");
        headerRange.setFontWeight("bold");
        headerRange.setHorizontalAlignment("center");
        
        var initialAgentsData = [
          ["AG-FR-765", "Francisco Ramirez", "FR", "#2563EB", "Soporte Técnico", "Inbound Tech Team", "l1", "0", "framirez@fhons.com"],
          ["AG-HH-691", "Hendel Herrera", "HH", "#059669", "Soporte Técnico", "Inbound Tech Team", "l1", "0", "hherrera@fhons.com"],
          ["AG-RB-101", "Rafael Bello", "RB", "#D97706", "Soporte Técnico", "Inbound Tech Team", "l1", "0", "rbello@fhons.co"],
          ["AG-RP-509", "Robert Pichardo", "RP", "#7C3AED", "Asesor Especialista", "Tier 2 Cloud Team", "l2", "0", "rpichardo@fhons.com"],
          ["AG-AD-712", "Andri Dominguez", "AD", "#DC2626", "Soporte Técnico", "Inbound Tech Team", "l1.5", "0", "adominguez@fhons.com"],
          ["AG-RQ-371", "Raymond Quintana", "RQ", "#4B5563", "Coordinador de", "DBA & Core Business", "s1", "0", "rquintana@fhons.com"],
          ["AG-RR-943", "Ramon Reinoso", "RR", "#2563EB", "Lider Tecnico", "DBA & Core Business", "s2", "0", "rreinoso@fhons.com"],
          ["AG-CF-409", "Christian Fernandez", "CF", "#2563EB", "CEO", "DBA & Core Business", "a1", "0", "cfenandez@fhons.com"],
          ["AG-AF-145", "Angel Fernandez", "AF", "#2563EB", "OWNER", "DBA & Core Business", "a1", "0", "afenandez@fhons.com"]
        ];
        sheet.getRange(2, 1, initialAgentsData.length, initialAgentsData[0].length).setValues(initialAgentsData);
      } else {
        throw new Error("No se encontró la pestaña '" + targetSheetName + "' en la hoja de cálculo. Por favor créala con las cabeceras requeridas.");
      }
    }
    
    var values = [];
    if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
      values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
    }
    
    return jsonResponse({
      status: "success",
      sheetName: sheet.getName(),
      values: values
    });
    
  } catch (error) {
    return jsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var spreadsheetId = data.spreadsheetId;
    
    var ss = SpreadsheetApp.getActiveSpreadsheet() || (spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : null);
    if (!ss) {
      throw new Error("No se pudo conectar a la hoja de cálculo. Asegúrate de pasar un spreadsheetId válido.");
    }

    if (data.action === "updateRoster") {
      var targetTabName = data.sheetTabName || "Roster";
      var sheet = ss.getSheetByName(targetTabName);
      if (!sheet) {
        sheet = ss.insertSheet(targetTabName);
      } else {
        sheet.clearContents();
      }
      
      var headers = data.headers || [
        "ID", "Nombre", "Siglas", "Fondo de Avatar (HEX)", "Rol/Cargo", "Equipo", "Tier ID", "Puntos XP", "Email"
      ];
      
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#2563eb");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");

      var agents = data.agents || [];
      var rows = [];
      
      for (var i = 0; i < agents.length; i++) {
        var agent = agents[i];
        
        // Determinar si recibimos un array de objetos o array de arrays
        if (Array.isArray(agent)) {
           rows.push(agent);
        } else if (typeof agent === 'object' && agent !== null) {
           var row = [];
           for (var h = 0; h < headers.length; h++) {
               var header = headers[h];
               row.push(agent[header] !== undefined ? agent[header] : "");
           }
           rows.push(row);
        }
      }
      
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      
      return jsonResponse({ status: "success", message: "Roster de técnicos actualizado correctamente." });
      
    } else if (data.action === "updateTiers") {
      var targetTabName = data.sheetTabName || data.sheetTiersTab || "Jerarquia";
      var sheet = ss.getSheetByName(targetTabName);
      if (!sheet) {
        sheet = ss.insertSheet(targetTabName);
      }
      
      var headers = [
        "ID", "Nombre", "XP Mínimo", "XP Máximo", "Nombre de Insignia", "Color (HEX)", "Descripción", "Promedio KPI Requerido", "KPIs Elegibles", "Pesos (JSON)"
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#4f46e5");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");

      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
      
      var tiers = data.tiers || [];
      var rows = [];
      
      for (var i = 0; i < tiers.length; i++) {
        var tier = tiers[i];
        rows.push([
          tier.id || "",
          tier.name || "",
          tier.minXp || 0,
          tier.maxXp || 1000,
          tier.badgeName || "",
          tier.colorHex || "#3B82F6",
          tier.desc || "",
          tier.requiredKpiAvg || 60,
          (tier.eligibleKpis || []).join(","),
          JSON.stringify(tier.weights || {})
        ]);
      }
      
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      
      return jsonResponse({ status: "success", message: "Escalafón (Jerarquías) actualizado correctamente." });
      
    } else if (data.action === "updateCRM" || data.action === "updateSheet") {
      var sheetTabName = data.sheetTabName || data.sheetName || "CRM";
      var sheet = ss.getSheetByName(sheetTabName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetTabName);
      }
      
      var crmRows = data.crmRows || data.rows || [];
      if (crmRows.length === 0) {
        if (data.headers && data.headers.length > 0) {
          sheet.getRange(1, 1, 1, data.headers.length).setValues([data.headers]);
          var hr = sheet.getRange(1, 1, 1, data.headers.length);
          hr.setBackground("#059669"); hr.setFontColor("#ffffff"); hr.setFontWeight("bold"); hr.setHorizontalAlignment("center");
          return jsonResponse({ status: "success", message: "Cabeceras inicializadas correctamente en '" + sheetTabName + "'." });
        }
        return jsonResponse({ status: "success", message: "No había filas para registrar en '" + sheetTabName + "'." });
      }
      
      var headers = data.headers && data.headers.length > 0 ? data.headers : Object.keys(crmRows[0]);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      
      var headerRange = sheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground("#059669");
      headerRange.setFontColor("#ffffff");
      headerRange.setFontWeight("bold");
      headerRange.setHorizontalAlignment("center");

      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
      
      var rows = [];
      for (var i = 0; i < crmRows.length; i++) {
        var rowObj = crmRows[i];
        if (Array.isArray(rowObj)) {
            rows.push(rowObj.map(function(val) { return val !== undefined && val !== null ? String(val) : ""; }));
        } else {
            var rowValues = [];
            for (var j = 0; j < headers.length; j++) {
              rowValues.push(rowObj[headers[j]] !== undefined && rowObj[headers[j]] !== null ? String(rowObj[headers[j]]) : "");
            }
            rows.push(rowValues);
        }
      }
      
      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }
      
      return jsonResponse({ status: "success", message: "Pestaña '" + sheetTabName + "' actualizada correctamente." });
    } else if (data.action === "writeCertifications") {
      var sheetTabName = data.sheetTabName || "Libreria - Certificaciones";
      var sheet = ss.getSheetByName(sheetTabName);
      if (!sheet) {
        sheet = ss.insertSheet(sheetTabName);
      }

      var headers = data.expectedHeaders || [
        "ID", "Agentes Inscritos (IDs)", "Agentes Completados (IDs)", "Título", "Descripción", "Icono", "Dimensión", "Tier Destino", "Estado", "Importancia", "Puntos", "Req. Suceso", "Req. Acción", "Req. Conclusión"
      ];
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      var hr = sheet.getRange(1, 1, 1, headers.length);
      hr.setBackground("#0ea5e9"); hr.setFontColor("#ffffff"); hr.setFontWeight("bold"); hr.setHorizontalAlignment("center");

      if (sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }

      var certs = data.certifications || [];
      var agentsContext = data.agentsContext || [];
      var rows = [];

      for (var i = 0; i < certs.length; i++) {
        var cert = certs[i];
        
        var enrolledAgents = [];
        var completedAgents = [];
        for (var j = 0; j < agentsContext.length; j++) {
            var a = agentsContext[j];
            if (a.certifications && a.certifications.indexOf(cert.id) !== -1) {
                enrolledAgents.push(a.id);
            }
            if (a.certProgress && a.certProgress[cert.id] && a.certProgress[cert.id].completed) {
                completedAgents.push(a.id);
            }
        }
        
        rows.push([
          cert.id || "",
          enrolledAgents.join(", "),
          completedAgents.join(", "),
          cert.title || "",
          cert.description || "",
          cert.iconName || "",
          cert.dimension || "",
          (cert.targetTiers || []).join(", ") || "",
          cert.status || "",
          cert.importance || "",
          cert.points !== undefined && cert.points !== null ? String(cert.points) : "",
          (cert.requirementDoc && cert.requirementDoc.suceso) || "",
          (cert.requirementDoc && cert.requirementDoc.accion) || "",
          (cert.requirementDoc && cert.requirementDoc.conclusion) || ""
        ]);
      }

      if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
      }

      return jsonResponse({ status: "success", message: "Certificaciones actualizadas correctamente." });
    } else {
      throw new Error("Acción de escritura no soportada: " + data.action);
    }
  } catch(error) {
    return jsonResponse({
      status: "error",
      message: error.toString()
    });
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetCaseInsensitive(ss, targetName) {
  var sheets = ss.getSheets();
  var targetLower = targetName.toLowerCase().trim();
  
  // Coincidencia exacta primero
  var exact = ss.getSheetByName(targetName);
  if (exact) return exact;
  
  // Coincidencia insensible
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().trim() === targetLower) {
      return sheets[i];
    }
  }
  return null;
}
`;

const SYSTEM_SECTIONS = [
  { key: 'action_plan', label: 'Plan de Acción', subsections: [] },
  { key: 'roster', label: 'Roster del Equipo', subsections: [] },
  { key: 'evaluation', label: 'Panel de Evaluación', subsections: [] },
  { 
    key: 'request_backlog', 
    label: 'Request Backlog', 
    subsections: [
      { key: 'general', label: 'En Curso' },
      { key: 'roster_analysis', label: 'Análisis por Roster' },
      { key: 'colaborar', label: 'Escalaciones / Asistencia' },
      { key: 'visitas', label: 'Gestión de Visitas' },
      { key: 'reports', label: 'Tareas' }
    ] 
  },
  { 
    key: 'admin_backlog', 
    label: 'Admin Backlog', 
    subsections: [
      { key: 'compare_print', label: 'Comparar CRM Print' },
      { key: 'confirm_completed', label: 'Confirmar Completados' },
      { key: 'completed_history', label: 'Historial de Completados' },
      { key: 'status_cycle', label: 'Ciclo de Vida' }
    ] 
  },
  { key: 'contractors', label: 'Contratistas', subsections: [] },
  { 
    key: 'workspace', 
    label: 'Daily Workspace', 
    subsections: [
      { key: 'board', label: 'Tablero Diario' },
      { key: 'pomodoro', label: 'Temporizador Pomodoro' },
      { key: 'scratchpad', label: 'Block de Notas' },
      { key: 'completed', label: 'Historial de Completados' },
      { key: 'deleted', label: 'Papelera de Eliminados' }
    ] 
  },
  { key: 'daily_admin_use', label: 'Daily Admin Use', subsections: [] },
  { 
    key: 'operations', 
    label: 'Gestión Operativa', 
    subsections: [
      { key: 'dashboard', label: 'Dashboard Operativo' },
      { key: 'ausencias', label: 'Ausencias & Vacaciones' },
      { key: 'externo', label: 'Reporte Histórico' },
      { key: 'calendario', label: 'Calendario Operativo' }
    ] 
  },
  { 
    key: 'operations_admin', 
    label: 'Administración Operativa', 
    subsections: [
      { key: 'dashboard', label: 'Dashboard Operativo' },
      { key: 'ausencias', label: 'Ausencias & Vacaciones' },
      { key: 'externo', label: 'Reporte Histórico' },
      { key: 'calendario', label: 'Calendario Operativo' }
    ] 
  },
  { key: 'leaderboard', label: 'LeaderBoard', subsections: [] },
  { key: 'admin_leaderboard', label: 'Admin Leaderboard', subsections: [] },
  { 
    key: 'profiles', 
    label: 'Perfiles / Mi Perfil', 
    subsections: [
      { key: 'resumen', label: 'Resumen' },
      { key: 'competencias', label: 'Competencias' },
      { key: 'plan', label: 'Plan de Desarrollo' },
      { key: 'historial', label: 'Historial de Habilidades' }
    ] 
  },
  { key: 'kpi_guide', label: 'Guía de KPIs', subsections: [] },
  { key: 'certifications', label: 'Librería Backlog', subsections: [] }
];

interface ConfigurationTabProps {
  tiers: TierConfig[];
  onUpdateTiers: (newTiers: TierConfig[]) => void;
  agents?: any[];
  certifications?: any[];
  onResetDatabase?: () => void;
  onResetTiersToDefault?: () => void;
  onImportDatabase?: (agents: any[], tiers: any[], certifications: any[]) => void;
  comingSoonConfig?: Record<string, boolean>;
  onUpdateComingSoonConfig?: (config: Record<string, boolean>) => void;
}

export default function ConfigurationTab({ 
  tiers, 
  onUpdateTiers, 
  agents, 
  certifications, 
  onResetDatabase, 
  onResetTiersToDefault,
  onImportDatabase,
  comingSoonConfig = {},
  onUpdateComingSoonConfig
}: ConfigurationTabProps) {
  type ConfigTab = 'jerarquia' | 'bases_datos' | 'integraciones' | 'sistema';
  const [activeTab, setActiveTab] = useState<ConfigTab>('jerarquia');

  const [localTiers, setLocalTiers] = useState<TierConfig[]>(() => tiers.map(t => ({
    ...t,
    eligibleKpis: t.eligibleKpis ? [...t.eligibleKpis] : ['knowledge', 'execution', 'relational', 'collaborative', 'control']
  })));

  const [mapsUsage, setMapsUsage] = useState({
    currentMonth: new Date().toISOString().substring(0, 7),
    maps_js_api_loads: 0,
    geocoding_requests: 0,
    updatedAt: new Date().toISOString()
  });

  const [customMapsKey, setCustomMapsKey] = useState(() => localStorage.getItem('GOOGLE_MAPS_PLATFORM_KEY') || '');
  const [keyInput, setKeyInput] = useState(customMapsKey);
  const [isSavingKey, setIsSavingKey] = useState(false);

  // Firebase Quota Monitor States
  const [firebaseBaseline, setFirebaseBaseline] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('tm_firebase_baseline') || '{"reads":0,"writes":0,"deletes":0}');
    } catch (e) {
      return { reads: 0, writes: 0, deletes: 0 };
    }
  });
  
  const [firebaseLocalSession, setFirebaseLocalSession] = useState(() => {
    return getFirebaseLocalUsage();
  });

  useEffect(() => {
    const handleUsageUpdate = (e: any) => {
      if (e.detail) {
        setFirebaseLocalSession(e.detail);
      }
    };
    window.addEventListener('firebase_usage_update', handleUsageUpdate);
    return () => window.removeEventListener('firebase_usage_update', handleUsageUpdate);
  }, []);

  const handleUpdateFirebaseBaseline = (field: string, value: string) => {
    const numValue = parseInt(value.replace(/\D/g, '') || '0', 10);
    const updated = { ...firebaseBaseline, [field]: numValue };
    setFirebaseBaseline(updated);
    localStorage.setItem('tm_firebase_baseline', JSON.stringify(updated));
  };
  
  const handleResetSessionUsage = () => {
    const reset = { reads: 0, writes: 0, deletes: 0 };
    setFirebaseLocalSession(reset);
    localStorage.setItem('tm_firebase_local_usage', JSON.stringify(reset));
  };

  const MAPS_API_KEY =
    (typeof process !== 'undefined' ? process.env?.GOOGLE_MAPS_PLATFORM_KEY : '') ||
    (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
    (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
    customMapsKey ||
    '';
  const hasValidMapsKey = Boolean(MAPS_API_KEY) && MAPS_API_KEY !== 'YOUR_API_KEY' && MAPS_API_KEY.trim().length > 10;

  const handleSaveMapsKey = async () => {
    setIsSavingKey(true);
    try {
      const trimmed = keyInput.trim();
      await saveGoogleMapsKey(trimmed);
      localStorage.setItem('GOOGLE_MAPS_PLATFORM_KEY', trimmed);
      (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY = trimmed;
      setCustomMapsKey(trimmed);
      alert('Llave de API de Google Maps guardada correctamente en la nube. La aplicación se actualizará automáticamente.');
    } catch (err: any) {
      alert('Error al guardar la Llave de API: ' + err.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToGoogleMapsUsage((data) => {
      if (data) {
        setMapsUsage({
          currentMonth: data.currentMonth || new Date().toISOString().substring(0, 7),
          maps_js_api_loads: data.maps_js_api_loads || 0,
          geocoding_requests: data.geocoding_requests || 0,
          updatedAt: data.updatedAt || new Date().toISOString()
        });
      }
    });
    return () => unsubscribe();
  }, []);

  const handleResetMapsUsage = async () => {
    if (window.confirm('¿Está seguro de que desea reiniciar los contadores de consumo de Google Maps?')) {
      try {
        await resetGoogleMapsUsage();
        alert('Contadores de consumo reiniciados correctamente.');
      } catch (err: any) {
        alert('Error al reiniciar los contadores: ' + err.message);
      }
    }
  };

  const [firebaseSeedStatus, setFirebaseSeedStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [firebaseSeedMessage, setFirebaseSeedMessage] = useState<string>('');

  const [historicalText, setHistoricalText] = useState('');
  const [historicalImportStatus, setHistoricalImportStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [historicalImportMessage, setHistoricalImportMessage] = useState('');

  const handleImportHistoricalSpreadsheet = async () => {
    if (!historicalText || !historicalText.trim()) {
      setHistoricalImportStatus('error');
      setHistoricalImportMessage('Por favor, pegue los datos copiados del spreadsheet antes de continuar.');
      return;
    }

    setHistoricalImportStatus('loading');
    setHistoricalImportMessage('Procesando datos pegados...');

    try {
      // 1. Dividir líneas
      const lines = historicalText.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
      if (lines.length < 2) {
        throw new Error('El texto debe incluir al menos una fila de encabezados (columnas) y una fila de datos.');
      }

      // 2. Detectar delimitador (tabulador es el estándar para copiar de Excel o Google Sheets)
      const firstLine = lines[0];
      let delimiter = '\t';
      if (firstLine.includes('\t')) {
        delimiter = '\t';
      } else if (firstLine.includes(';')) {
        delimiter = ';';
      } else if (firstLine.includes(',')) {
        delimiter = ',';
      }

      // 3. Obtener headers
      const headers = firstLine.split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim()).filter(Boolean);
      if (headers.length === 0) {
        throw new Error('No se detectaron columnas/encabezados válidos en la primera línea.');
      }

      // Helper function to find column index case-insensitively and ignoring spaces/underscores/dashes
      const findHeaderIndex = (synonyms: string[]): number => {
        return headers.findIndex(h => {
          const normH = h.toLowerCase().replace(/[\s_-]/g, '');
          return synonyms.some(syn => syn.toLowerCase().replace(/[\s_-]/g, '') === normH);
        });
      };

      // Match indices
      const idIdx = findHeaderIndex(['id', 'key', 'ticket', 'tarea', 'clave', 'codigo', 'nro', 'numero']);
      const assignedToIdx = findHeaderIndex(['assignedto', 'assigned_to', 'assigned to', 'tecnico', 'asignado', 'agent', 'nombre', 'responsable']);
      const statusIdx = findHeaderIndex(['status', 'estado', 'state']);
      const priorityIdx = findHeaderIndex(['priority', 'prioridad', 'urgencia']);
      const requestTypeIdx = findHeaderIndex(['requesttype', 'request_type', 'request type', 'tipo', 'clasificacion', 'category', 'tag']);
      const createdDateIdx = findHeaderIndex(['createddate', 'created_date', 'created date', 'fecha', 'creacion', 'date']);
      const accountIdx = findHeaderIndex(['account', 'cuenta', 'cliente', 'empresa', 'proyecto']);
      const contactIdx = findHeaderIndex(['contact', 'contacto', 'user', 'usuario']);
      const subjectIdx = findHeaderIndex(['subject', 'asunto', 'requerimiento', 'descripcion', 'description', 'titulo', 'title', 'nombretarea']);
      const noteIdx = findHeaderIndex(['note', 'nota', 'notainterna', 'comentario', 'comment', 'internal_note', 'internal note']);

      // 4. Descargar Registro del backlog existente desde la colección historico_completados
      setHistoricalImportMessage('Descargando el "Histórico de Completados" existente...');
      let existingLogRows: any[] = [];
      try {
        existingLogRows = await fetchCRMData('historico_completados') || [];
      } catch (fetchErr) {
        console.warn('No se pudo descargar el histórico de completados existente, inicializando vacío.', fetchErr);
        existingLogRows = [];
      }

      const existingIds = new Set(existingLogRows.map(r => String(r.ID || r.id || '').trim().toUpperCase()).filter(Boolean));
      const rowsToAdd: Record<string, string>[] = [];
      const nowStr = new Date().toLocaleDateString('es-ES') + ' ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

      // 5. Parsear filas
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter).map(p => p.replace(/^["']|["']$/g, '').trim());
        if (parts.length === 0 || (parts.length === 1 && parts[0] === '')) continue;

        const getVal = (idx: number, fallback: string = ''): string => {
          if (idx !== -1 && parts[idx] !== undefined) {
            return parts[idx];
          }
          return fallback;
        };

        const rawId = getVal(idIdx);
        const idVal = rawId ? rawId : `HIST_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const idUpper = idVal.toUpperCase();

        // Evitar duplicados
        if (existingIds.has(idUpper)) continue;

        const assignedTo = getVal(assignedToIdx, 'Sin Asignar');
        const status = getVal(statusIdx, 'COMPLETADO');
        const priority = getVal(priorityIdx, 'Normal');
        const requestType = getVal(requestTypeIdx, 'General');
        const createdDate = getVal(createdDateIdx, nowStr);
        const account = getVal(accountIdx, 'F.H.O.N.S.');
        const contact = getVal(contactIdx, '');
        const subject = getVal(subjectIdx, 'Requerimiento Histórico Importado');
        const internalNote = getVal(noteIdx, 'Importación Histórica Manual');

        rowsToAdd.push({
          "ID": idVal,
          "Assigned To": assignedTo,
          "Status": status,
          "Priority": priority,
          "Request Type": requestType,
          "Created Date": createdDate,
          "Account": account,
          "Contact": contact,
          "Subject": subject,
          "Estado Registro": "COMPLETADO", // Directo al historial de completados
          "Nota Interna": internalNote,
          "Clasificación Log": requestType
        });

        existingIds.add(idUpper);
      }

      if (rowsToAdd.length === 0) {
        setHistoricalImportStatus('success');
        setHistoricalImportMessage('No se importaron nuevos requerimientos porque todos los IDs de las filas ya existen en el registro.');
        return;
      }

      // 6. Combinar y guardar en "historico_completados" de Firestore
      setHistoricalImportMessage(`Subiendo ${rowsToAdd.length} requerimientos históricos completados a Firestore...`);
      const finalLogRows = [...existingLogRows, ...rowsToAdd];
      await saveCRMData('historico_completados', finalLogRows);

      setHistoricalImportStatus('success');
      setHistoricalImportMessage(`¡Importación exitosa! Se agregaron ${rowsToAdd.length} requerimientos directamente al histórico de completados (historico_completados) en Firestore. Estos registros NO ingresaron a la hoja temporal y, por ende, no afectarán las métricas ni operaciones de la semana actual.`);
      setHistoricalText('');
    } catch (err: any) {
      console.error(err);
      setHistoricalImportStatus('error');
      setHistoricalImportMessage(`Error al importar: ${err.message || err}`);
    }
  };

  const handleFirebaseSeed = async () => {
    setFirebaseSeedStatus('loading');
    setFirebaseSeedMessage('Inicializando carga forzada de datos a Firestore...');
    try {
      await overrideSeedDatabase();
      setFirebaseSeedStatus('success');
      setFirebaseSeedMessage('¡Siembra completada con éxito! Todas las colecciones han sido subidas a Firestore. Actualiza tu consola de Firebase.');
    } catch (error: any) {
      console.error(error);
      setFirebaseSeedStatus('error');
      setFirebaseSeedMessage(`Error al conectar y sembrar: ${error?.message || error || 'Permiso denegado'}`);
    }
  };

  useEffect(() => {
    setLocalTiers(tiers.map(t => ({
      ...t,
      eligibleKpis: t.eligibleKpis ? [...t.eligibleKpis] : ['knowledge', 'execution', 'relational', 'collaborative', 'control']
    })));
  }, [tiers]);

  const handleAddTier = () => {
    const nextNum = localTiers.length + 1;
    const prevTier = localTiers[localTiers.length - 1];
    const baseMin = prevTier ? prevTier.maxXp : 0;
    const baseMax = prevTier ? prevTier.maxXp + 1000 : 1000;
    
    // Generar un ID único limpio
    const newId = `l${nextNum}`;
    
    const newTier: TierConfig = {
      id: newId,
      name: `Tier L${nextNum} (Especialista)`,
      badgeName: `L${nextNum}`,
      minXp: baseMin,
      maxXp: baseMax,
      colorHex: '#3B82F6', // Color por defecto
      desc: `Rango L${nextNum} para competencias avanzadas`,
      requiredKpiAvg: 60,
      weights: {
        knowledge: 20,
        execution: 20,
        relational: 20,
        collaborative: 20,
        control: 20
      },
      eligibleKpis: ['knowledge', 'execution', 'relational', 'collaborative', 'control']
    };
    
    setLocalTiers([...localTiers, newTier]);
    setStatusMessage('¡Nivel temporal agregado! Modifica sus campos y guarda para aplicarlo.');
    setTimeout(() => setStatusMessage(''), 4500);
  };

  const handleDeleteTier = (idToDelete: string) => {
    if (localTiers.length <= 1) {
      setErrorMessage('Debe existir al menos un Tier en el sistema para calificar a los técnicos.');
      setTimeout(() => setErrorMessage(''), 4500);
      return;
    }
    
    const updated = localTiers.filter(t => t.id !== idToDelete);
    setLocalTiers(updated);
    setStatusMessage('Tier removido. Guarda la configuración para reestructurar el escalafón.');
    setTimeout(() => setStatusMessage(''), 4500);
  };

  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [importancePoints, setImportancePoints] = useState<Record<string, number>>(() => {
    try {
      const stored = localStorage.getItem('tm_importance_points');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    return {
      critical: 40,
      high: 30,
      core: 20,
      medium: 20,
      low: 10,
      nice_to_have: 10
    };
  });

  const handleSaveImportancePoints = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('tm_importance_points', JSON.stringify(importancePoints));
    setStatusMessage("¡Configuración de puntos por nivel de importancia guardada exitosamente!");
    setTimeout(() => setStatusMessage(''), 4000);
  };



  const handleXpChange = (index: number, field: 'minXp' | 'maxXp', value: number) => {
    const updated = [...localTiers];
    updated[index] = {
      ...updated[index],
      [field]: Math.max(0, value)
    };
    setLocalTiers(updated);
  };

  const handleTextChange = (index: number, field: 'name' | 'badgeName', value: string) => {
    const updated = [...localTiers];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setLocalTiers(updated);
  };

  const handleKpiToggle = (tierIndex: number, kpi: DimensionType) => {
    const updated = [...localTiers];
    const currentKpis = [...(updated[tierIndex].eligibleKpis || ['knowledge', 'execution', 'relational', 'collaborative', 'control'])];
    if (currentKpis.includes(kpi)) {
      updated[tierIndex].eligibleKpis = currentKpis.filter(k => k !== kpi);
    } else {
      updated[tierIndex].eligibleKpis = [...currentKpis, kpi];
    }
    setLocalTiers(updated);
  };

  const handleSaveConfigs = (e: React.FormEvent) => {
    e.preventDefault();

    // Basic consistency validations
    for (let i = 0; i < localTiers.length; i++) {
      const tier = localTiers[i];
      if (tier.minXp >= tier.maxXp) {
        setErrorMessage(`Error en ${tier.name}: El XP Mínimo (${tier.minXp}) debe ser estrictamente menor que el XP Máximo (${tier.maxXp}).`);
        setTimeout(() => setErrorMessage(''), 5500);
        return;
      }
      if (i > 0) {
        const prevTier = localTiers[i - 1];
        if (tier.minXp < prevTier.maxXp) {
          setErrorMessage(`Inconsistencia en ${tier.name}: El XP Mínimo (${tier.minXp}) debe ser mayor o igual al XP Máximo de ${prevTier.name} (${prevTier.maxXp}). El sistema ajustará automáticamente para salvaguardar coherencia.`);
          tier.minXp = prevTier.maxXp;
          setTimeout(() => setErrorMessage(''), 5500);
        }
      }
    }

    onUpdateTiers(localTiers);
    setStatusMessage("¡Esquema de Tiers y Umbrales de XP guardados exitosamente!");
    setTimeout(() => setStatusMessage(''), 4000);
  };



  const handleExportBackup = () => {
    const backupData = {
      agents: agents || [],
      tiers: tiers || [],
      certifications: certifications || [],
      exportDate: new Date().toISOString()
    };
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `fhons_tiermaster_db_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    
    setStatusMessage('¡Base de datos exportada correctamente como archivo de copia de seguridad JSON!');
    setTimeout(() => setStatusMessage(''), 4500);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.agents || !parsed.tiers || !parsed.certifications) {
          setErrorMessage('El archivo seleccionado es inválido. Debe poseer colecciones de "agents", "tiers" y "certifications" válidas.');
          setTimeout(() => setErrorMessage(''), 5500);
          return;
        }
        
        if (onImportDatabase) {
          onImportDatabase(parsed.agents, parsed.tiers, parsed.certifications);
          setStatusMessage('¡Base de datos importada y restaurada con éxito!');
          setTimeout(() => setStatusMessage(''), 4500);
          
          // Re-sync local states in this view
          setLocalTiers(parsed.tiers.map((t: any) => ({
            ...t,
            eligibleKpis: t.eligibleKpis ? [...t.eligibleKpis] : ['knowledge', 'execution', 'relational', 'collaborative', 'control']
          })));
        }
      } catch (err) {
        setErrorMessage('Ocurrió un error al procesar el archivo JSON. Verifique la estructura del archivo.');
        setTimeout(() => setErrorMessage(''), 5500);
      }
    };
    fileReader.readAsText(files[0]);
    // Clear input to allow same file uploading
    e.target.value = '';
  };

  const getKpiLiteral = (kpi: string) => {
    switch (kpi) {
      case 'knowledge': return 'Syllabus & Certificaciones';
      case 'execution': return 'Diagnósticos & Troubleshooting';
      case 'relational': return 'Atención al Cliente (NPS/CRM)';
      case 'collaborative': return 'Habilidades Blandas & Foro';
      case 'control': return 'Logs de Trazabilidad & Scrum';
      default: return kpi;
    }
  };

  return (
    <div className="flex-grow flex flex-col gap-6" id="configurations-view-container">
      
      {/* Tabs Switcher */}
      <div className="flex flex-wrap gap-2 bg-[#111827]/80 backdrop-blur-md p-2 rounded-xl border border-white/5 w-fit shadow-lg shadow-black/20">
        <button
          type="button"
          onClick={() => setActiveTab('jerarquia')}
          className={`px-4 py-2 text-xs font-bold font-sans rounded-lg transition-all flex items-center gap-2 ${activeTab === 'jerarquia' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <span className="material-symbols-outlined text-sm">tune</span>
          Tiers & KPIs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('bases_datos')}
          className={`px-4 py-2 text-xs font-bold font-sans rounded-lg transition-all flex items-center gap-2 ${activeTab === 'bases_datos' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <span className="material-symbols-outlined text-sm">database</span>
          Bases de Datos
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('integraciones')}
          className={`px-4 py-2 text-xs font-bold font-sans rounded-lg transition-all flex items-center gap-2 ${activeTab === 'integraciones' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <span className="material-symbols-outlined text-sm">extension</span>
          Integraciones & APIs
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sistema')}
          className={`px-4 py-2 text-xs font-bold font-sans rounded-lg transition-all flex items-center gap-2 ${activeTab === 'sistema' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          <span className="material-symbols-outlined text-sm">settings</span>
          Sistema & Backups
        </button>
      </div>

      {/* Save Success / Warning Notifications */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 border border-emerald-500/20 text-white p-4 rounded-xl shadow-xl flex items-center gap-3 animate-fade-in"
          >
            <span className="material-symbols-outlined font-black">check_circle</span>
            <span className="text-sm font-sans font-semibold">{statusMessage}</span>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-gradient-to-r from-amber-600 to-rose-600 border border-rose-500/20 text-white p-4 rounded-xl shadow-xl flex items-center gap-3"
          >
            <span className="material-symbols-outlined font-black">warning</span>
            <span className="text-sm font-sans font-semibold">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro info box */}
      {activeTab === 'jerarquia' && (
        <div className="bg-[#111827]/60 backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-xl font-sans">
          <h2 className="font-display font-extrabold text-[#eceef0] text-lg mb-1.5 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">tune</span>
            Configuración Jerárquica de Tiers & Parámetros
          </h2>
          <p className="font-sans text-xs text-slate-400 leading-relaxed">
            Usted tiene control absoluto sobre los rangos de la barra de experiencia y los KPIs obligatorios. Personalice los umbrales de puntos de XP necesarios para que los técnicos asciendan de puesto, y asigne qué dimensiones específicas se ponderan o exigen dentro de cada Tier según las metas operativas FHONS.
          </p>
        </div>
      )}

      {activeTab === 'bases_datos' && (
        <>
          {/* Firestore Quota Monitor Panel */}
          <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-rose-500/10 shadow-xl font-sans flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-display font-extrabold text-[#eceef0] text-base mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-400">monitoring</span>
                  Monitoreo de Cuotas y Consumo (Firebase)
                </h3>
                <p className="font-sans text-xs text-slate-400 leading-relaxed max-w-3xl">
                  Las métricas de consumo exacto y <strong>cuota restante</strong> no pueden ser consultadas automáticamente desde la aplicación web por restricciones de seguridad de Firebase. 
                  Para revisar tu consumo actual y cuánto te resta del plan (Free Tier), debes verificarlo directamente en tu consola de Firebase.
                </p>
              </div>
              <a 
                href="https://console.firebase.google.com/project/_/usage" 
                target="_blank" 
                rel="noopener noreferrer"
                className="px-4 py-2 bg-rose-600/10 hover:bg-rose-600/20 border border-rose-500/20 text-rose-300 text-xs font-bold font-mono rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-sm">open_in_new</span>
                Ver Consumo Exacto
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              {[
                { key: 'reads', label: 'Lecturas', icon: 'chrome_reader_mode', color: 'sky', limit: 50000 },
                { key: 'writes', label: 'Escrituras', icon: 'edit_document', color: 'amber', limit: 20000 },
                { key: 'deletes', label: 'Borrados', icon: 'delete', color: 'rose', limit: 20000 }
              ].map(stat => {
                const totalEstimated = (firebaseBaseline[stat.key as keyof typeof firebaseBaseline] || 0) + (firebaseLocalSession[stat.key as keyof typeof firebaseLocalSession] || 0);
                const remaining = Math.max(0, stat.limit - totalEstimated);
                const percent = Math.min(100, (totalEstimated / stat.limit) * 100);
                
                return (
                  <div key={stat.key} className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-3">
                    <div className={`flex items-center gap-2 text-${stat.color}-400`}>
                      <span className="material-symbols-outlined text-lg">{stat.icon}</span>
                      <span className="text-xs font-bold">{stat.label} Diarias</span>
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-end mb-1">
                        <span className="text-[10px] text-slate-400">Consumo Base (Firebase Console)</span>
                        <input 
                          type="text" 
                          value={firebaseBaseline[stat.key as keyof typeof firebaseBaseline] || ''}
                          onChange={(e) => handleUpdateFirebaseBaseline(stat.key, e.target.value)}
                          placeholder="0"
                          className="w-20 bg-slate-950 border border-slate-700 text-xs text-right text-slate-200 px-2 py-1 rounded"
                        />
                      </div>
                      <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] text-slate-400">Sesión Local (Estimado)</span>
                        <span className="text-xs font-mono text-slate-300">+{firebaseLocalSession[stat.key as keyof typeof firebaseLocalSession] || 0}</span>
                      </div>
                      
                      <div className="w-full bg-slate-800 rounded-full h-1.5 mb-1 overflow-hidden">
                        <div className={`h-1.5 rounded-full bg-${stat.color}-500`} style={{ width: `${percent}%` }}></div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Restante</span>
                          <span className={`text-lg font-black font-mono ${remaining < stat.limit * 0.1 ? 'text-rose-500' : 'text-slate-200'}`}>
                            {remaining.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Límite</span>
                          <span className="text-xs font-mono text-slate-400">{stat.limit.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between bg-emerald-900/20 border border-emerald-500/20 rounded-xl p-3 mt-2">
              <div className="flex gap-3">
                <span className="material-symbols-outlined text-emerald-400">verified</span>
                <div>
                  <p className="text-xs font-bold text-emerald-300">Calculadora de Cuota & Optimización Activada</p>
                  <p className="text-[11px] text-emerald-200/70 mt-1">
                    Ingresa el consumo base que te muestra Firebase. La app sumará automáticamente las operaciones que realices localmente en esta sesión. Se ha implementado un algoritmo de "Smart Diffing" para reducir drásticamente el consumo de escrituras reales en la nube.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleResetSessionUsage}
                className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider flex items-center gap-1 transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">refresh</span>
                Reiniciar Local
              </button>
            </div>
          </div>

          {/* Firebase Real-Time Firestore Synchronization Panel */}
          <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl font-sans flex flex-col gap-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-display font-extrabold text-[#eceef0] text-base mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-400">database</span>
              Conexión de Base de Datos Cloud (Google Cloud / Firebase Firestore)
            </h3>
            <p className="font-sans text-xs text-slate-400 leading-relaxed">
              Persistencia real de datos operacionales, histórico de asistencia, scrum diarios, designaciones y backlog de tickets de soporte técnico.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold ${
              firebaseSeedStatus === 'loading' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
              firebaseSeedStatus === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
              firebaseSeedStatus === 'error' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
              'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                firebaseSeedStatus === 'loading' ? 'bg-amber-400 animate-pulse' :
                firebaseSeedStatus === 'success' ? 'bg-emerald-400' :
                firebaseSeedStatus === 'error' ? 'bg-rose-400' :
                'bg-indigo-400 animate-pulse'
              }`} />
              {firebaseSeedStatus === 'loading' ? 'Subiendo Datos...' :
               firebaseSeedStatus === 'success' ? 'Conectado y Sembrado' :
               firebaseSeedStatus === 'error' ? 'Error de Permisos' :
               'Listo para Sincronizar'}
            </span>
          </div>
        </div>

        {firebaseSeedMessage && (
          <div className={`p-3 rounded-xl border text-xs font-semibold ${
            firebaseSeedStatus === 'loading' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
            firebaseSeedStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' :
            firebaseSeedStatus === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
            'bg-slate-500/10 border-slate-500/20 text-slate-300'
          }`}>
            {firebaseSeedMessage}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase font-black tracking-wider text-slate-400">Identificador de Base de Datos</span>
            <div className="font-mono text-xs text-indigo-300 select-all bg-slate-950 px-2 py-1 rounded border border-indigo-900/30 break-all">
              ai-studio-remixtiermaster1-618b4905-ed1f-46c3-a607-4672e004094f
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Este identificador coincide con la base de datos de tu consola de Firebase que se muestra en tu captura.
            </p>
          </div>

          <div className="bg-slate-900/40 p-4 rounded-xl border border-white/5 flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase font-black tracking-wider text-slate-400">Paso Requerido: Configurar Reglas de Seguridad</span>
            <p className="text-[11px] text-slate-300">
              Para permitir que la aplicación y el script suban los datos iniciales, debes habilitar los permisos en la pestaña de <strong>Seguridad</strong> de tu Consola Firebase:
            </p>
            <pre className="font-mono text-[9px] text-amber-300 bg-slate-950 p-2 rounded border border-amber-900/30 overflow-x-auto select-all leading-tight">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}`}
            </pre>
            <p className="text-[10px] text-slate-500">
              Copia el bloque anterior, pégalo en la sección de <strong>Seguridad</strong> de Firestore y haz clic en <strong>Publicar</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-1">
          <button
            onClick={handleFirebaseSeed}
            disabled={firebaseSeedStatus === 'loading'}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-sans text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            {firebaseSeedStatus === 'loading' ? 'Subiendo todo a Firebase...' : 'Enviar todo a Firebase Ya Mismo'}
          </button>
        </div>
      </div>


        </>
      )}

      {activeTab === 'jerarquia' && (
        <>
      {/* Configuración de Puntos de Certificación por Importancia */}
      <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-5 font-sans">
        <div>
          <h3 className="font-display font-extrabold text-[#eceef0] text-base mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400">workspace_premium</span>
            Configuración de Puntos por Nivel de Importancia
          </h3>
          <p className="font-sans text-xs text-slate-400 leading-relaxed">
            Configure la cantidad de puntos de XP por defecto que otorga cada certificación según su nivel de impacto. Estos valores se aplicarán automáticamente a todas las certificaciones que no tengan puntos personalizados explícitos.
          </p>
        </div>

        <form onSubmit={handleSaveImportancePoints} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Crítico</label>
            <input
              type="number"
              min={1}
              required
              value={importancePoints.critical ?? 40}
              onChange={(e) => setImportancePoints({ ...importancePoints, critical: Number(e.target.value) })}
              className="w-full bg-[#111827]/60 border border-white/5 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Alto Impacto</label>
            <input
              type="number"
              min={1}
              required
              value={importancePoints.high ?? 30}
              onChange={(e) => setImportancePoints({ ...importancePoints, high: Number(e.target.value) })}
              className="w-full bg-[#111827]/60 border border-white/5 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Core</label>
            <input
              type="number"
              min={1}
              required
              value={importancePoints.core ?? 20}
              onChange={(e) => setImportancePoints({ ...importancePoints, core: Number(e.target.value) })}
              className="w-full bg-[#111827]/60 border border-white/5 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Impacto Medio</label>
            <input
              type="number"
              min={1}
              required
              value={importancePoints.medium ?? 20}
              onChange={(e) => setImportancePoints({ ...importancePoints, medium: Number(e.target.value) })}
              className="w-full bg-[#111827]/60 border border-white/5 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Impacto Bajo</label>
            <input
              type="number"
              min={1}
              required
              value={importancePoints.low ?? 10}
              onChange={(e) => setImportancePoints({ ...importancePoints, low: Number(e.target.value) })}
              className="w-full bg-[#111827]/60 border border-white/5 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nice to Have</label>
            <input
              type="number"
              min={1}
              required
              value={importancePoints.nice_to_have ?? 10}
              onChange={(e) => setImportancePoints({ ...importancePoints, nice_to_have: Number(e.target.value) })}
              className="w-full bg-[#111827]/60 border border-white/5 px-3.5 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 transition-all font-sans"
            />
          </div>

          <div className="col-span-full flex justify-end mt-2">
            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500/30 text-white font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 active:scale-95"
            >
              <span className="material-symbols-outlined text-xs">save</span>
              Guardar Puntos de Importancia
            </button>
          </div>
        </form>
      </div>
        </>
      )}

      {activeTab === 'integraciones' && (
        <>
      {/* Integración ManageEngine ServiceDesk Plus */}
      <ManageEngineConfigCard />

      {/* Sección de Monitoreo de Google Maps Platform */}
      <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-5 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display font-extrabold text-[#eceef0] text-base mb-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400">map</span>
              Control de Consumo de APIs de Google Maps Platform
            </h3>
            <p className="font-sans text-xs text-slate-400 leading-relaxed">
              Monitoree en tiempo real el consumo de las APIs de mapas satelitales y geocodificación para garantizar que permanezca dentro del nivel gratuito de la plataforma.
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono self-start sm:self-center flex items-center gap-1.5 ${
            hasValidMapsKey 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
            {hasValidMapsKey ? 'Google Maps Real (Activo)' : 'Modo Simulación (Sin costo)'}
          </span>
        </div>

        {/* API Key Configuration Form */}
        <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-mono text-[10px] uppercase font-black tracking-wider text-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-indigo-400 font-bold">vpn_key</span>
              Clave de API de Google Maps (GOOGLE_MAPS_PLATFORM_KEY)
            </span>
            {hasValidMapsKey && (
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                ✓ Configurada y Activa
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-grow">
              <input
                type="password"
                placeholder="Pega tu clave de API de Google Maps (comienza con AIzaSy...)"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 font-mono text-xs text-slate-200 focus:outline-none focus:border-indigo-500 placeholder-slate-600 tracking-wider"
              />
              {keyInput && (
                <button
                  type="button"
                  onClick={() => setKeyInput('')}
                  className="absolute right-3 top-2.5 p-1 text-slate-500 hover:text-slate-300 transition-all cursor-pointer bg-transparent border-none"
                  title="Limpiar"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={handleSaveMapsKey}
              disabled={isSavingKey}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 text-white font-mono text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/25 shrink-0 border-none active:scale-95"
            >
              <span className="material-symbols-outlined text-sm">{isSavingKey ? 'sync' : 'save'}</span>
              {isSavingKey ? 'Guardando...' : 'Guardar Clave'}
            </button>
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed font-sans">
            Al guardar esta clave, se almacenará de forma segura en Firestore para que todos los usuarios de la aplicación puedan visualizar el mapa interactivo y autocompletar direcciones automáticamente al programar visitas de técnicos.
          </p>
        </div>

        {/* Informative Stats & Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* API Key Status */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase font-black tracking-wider text-slate-400">API Key Configurada</span>
            <span className="text-xs font-mono font-bold text-slate-200 truncate mt-1">
              {hasValidMapsKey 
                ? `${MAPS_API_KEY.substring(0, 8)}...${MAPS_API_KEY.substring(MAPS_API_KEY.length - 4)}` 
                : 'Ninguna (Simulación)'}
            </span>
            <p className="text-[10px] text-slate-500 font-sans mt-2">
              {hasValidMapsKey 
                ? 'Conexión automática cargando el visor satelital real.' 
                : 'Usa una clave simulada para desarrollo local.'}
            </p>
          </div>

          {/* Periodo de Consumo */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase font-black tracking-wider text-slate-400">Mes de Facturación</span>
            <span className="text-sm font-bold text-slate-200 mt-1 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-indigo-400 text-sm">calendar_today</span>
              {mapsUsage.currentMonth}
            </span>
            <p className="text-[10px] text-slate-500 font-sans mt-2">
              Los contadores se reinician automáticamente al inicio de cada mes.
            </p>
          </div>

          {/* Costo Acumulado Estimado */}
          <div className="bg-slate-950/50 p-4 rounded-xl border border-white/5 flex flex-col gap-1">
            <span className="font-mono text-[9px] uppercase font-black tracking-wider text-slate-400">Costo Acumulado Mensual</span>
            <span className="text-base font-extrabold text-slate-200 mt-1 flex items-center gap-1 text-emerald-400">
              $0.00 USD
            </span>
            <p className="text-[10px] text-slate-500 font-sans mt-2">
              Completamente cubierto por el crédito gratuito mensual de $200 USD.
            </p>
          </div>
        </div>

        {/* Progress Bars for SKUs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2">
          {/* SKU 1: Maps JS API */}
          <div className="bg-slate-950/40 p-4.5 rounded-xl border border-white/5 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-blue-400 text-sm">visibility</span>
                  Cargas del Mapa (Maps JS API)
                </h4>
                <span className="text-[10px] text-slate-400">Coste de lista: $7.00 USD por cada 1,000 cargas</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-200">
                {mapsUsage.maps_js_api_loads.toLocaleString()} / 10,000
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (mapsUsage.maps_js_api_loads / 10000) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">verified</span>
                Llamadas sin costo en este SKU: {Math.max(0, 10000 - mapsUsage.maps_js_api_loads).toLocaleString()}
              </span>
              <span className="text-slate-400 font-mono">
                Consumo: {((mapsUsage.maps_js_api_loads / 10000) * 100).toFixed(1)}% de la cuota gratuita
              </span>
            </div>
          </div>

          {/* SKU 2: Geocoding API */}
          <div className="bg-slate-950/40 p-4.5 rounded-xl border border-white/5 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-xs text-slate-200 flex items-center gap-1">
                  <span className="material-symbols-outlined text-cyan-400 text-sm">search</span>
                  Búsquedas / Ubicar (Geocoding API)
                </h4>
                <span className="text-[10px] text-slate-400">Coste de lista: $5.00 USD por cada 1,000 solicitudes</span>
              </div>
              <span className="text-xs font-mono font-bold text-slate-200">
                {mapsUsage.geocoding_requests.toLocaleString()} / 10,000
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-white/5">
              <div 
                className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (mapsUsage.geocoding_requests / 10000) * 100)}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px]">
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">verified</span>
                Llamadas sin costo en este SKU: {Math.max(0, 10000 - mapsUsage.geocoding_requests).toLocaleString()}
              </span>
              <span className="text-slate-400 font-mono">
                Consumo: {((mapsUsage.geocoding_requests / 10000) * 100).toFixed(1)}% de la cuota gratuita
              </span>
            </div>
          </div>
        </div>

        {/* Alerts and Action Buttons */}
        <div className="p-4 bg-indigo-950/20 border border-indigo-900/30 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs mt-2">
          <div className="flex items-start gap-2 text-indigo-200">
            <span className="material-symbols-outlined text-indigo-400 mt-0.5">info</span>
            <div>
              <p className="font-bold">💡 Explicación de Límites y Facturación de Google Maps Platform</p>
              <p className="text-slate-400 text-[11px] leading-relaxed mt-0.5">
                Google otorga un crédito recurrente mensual de <strong>$200 USD sin costo</strong> (equivalente a unas 28,000 cargas de mapa o 40,000 búsquedas de dirección). Al tener menos de 10,000 llamadas por SKU al mes, su gasto será de exactamente <strong>$0.00 USD</strong> y no se le cobrará nada, incluso si tiene una tarjeta registrada.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetMapsUsage}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-mono text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center gap-1 self-end sm:self-center shrink-0 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            Reiniciar Consumo
          </button>
        </div>

        {/* Step-by-Step Configuration Tutorial Panel */}
        <div className="bg-slate-950/60 rounded-xl border border-slate-850 p-4">
          <h4 className="font-bold text-xs text-slate-200 flex items-center gap-2 mb-3 font-mono uppercase tracking-wide">
            <span className="material-symbols-outlined text-indigo-400">help</span>
            Guía Paso a Paso para Conectar Google Maps Platform (Interno y Automático)
          </h4>
          <div className="space-y-3 font-sans text-xs text-slate-400 leading-relaxed">
            <p>
              Para conectar la API de Google Maps de forma que el sistema gestione la carga del mapa satelital y la localización automática de forma interna y transparente, siga estas instrucciones:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                <span className="font-bold text-slate-200 flex items-center gap-1 font-mono">
                  <span className="w-5 h-5 rounded-full bg-indigo-900/50 text-indigo-300 flex items-center justify-center font-mono text-[11px]">1</span>
                  Obtener tu API Key de Google
                </span>
                <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-300">
                  <li>Ve a <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline font-bold">Google Cloud Console</a>.</li>
                  <li>Selecciona tu proyecto en la barra superior o crea uno nuevo.</li>
                  <li>Dirígete a <strong>APIs y Servicios &gt; Biblioteca</strong>.</li>
                  <li>Busca y habilita la API: <strong>"Maps JavaScript API"</strong>.</li>
                  <li>Busca y habilita la API: <strong>"Geocoding API"</strong>.</li>
                  <li>Ve a la pestaña de <strong>Credenciales</strong> y haz clic en <strong>Crear Credenciales &gt; Clave de API (API Key)</strong>.</li>
                </ol>
              </div>

              <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-850 flex flex-col gap-1.5">
                <span className="font-bold text-slate-200 flex items-center gap-1 font-mono">
                  <span className="w-5 h-5 rounded-full bg-indigo-900/50 text-indigo-300 flex items-center justify-center font-mono text-[11px]">2</span>
                  Configurar la clave y límites de seguridad
                </span>
                <ol className="list-decimal pl-5 space-y-1 text-[11px] text-slate-300">
                  <li>En la clave de API creada, haz clic en <strong>Editar clave</strong>.</li>
                  <li>En "Restricciones de API", selecciona <strong>Restringir clave</strong> y marca "Maps JavaScript API" y "Geocoding API". Esto previene el uso no autorizado.</li>
                  <li>En la barra lateral de Google Cloud, ve a <strong>Facturación &gt; Presupuestos y alertas</strong>. Crea un presupuesto de $1.00 USD con una alerta al 50% para que Google te notifique antes de cualquier cobro.</li>
                  <li>Inserta la clave copiada en la sección de <strong>Ajustes (⚙️ arriba a la derecha)</strong> → <strong>Secrets</strong> de este workspace con el nombre <strong>GOOGLE_MAPS_PLATFORM_KEY</strong>.</li>
                </ol>
              </div>
            </div>

            <div className="p-3 bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-200 rounded-lg">
              <p className="font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">shield</span>
                ¿Cómo agregar a tu cuenta de Google Cloud Console?
              </p>
              <p className="text-slate-400 mt-0.5">
                Por motivos de seguridad, los asistentes virtuales no tienen privilegios para editar la configuración de IAM o permisos en tu Consola de Google Cloud directamente. Para añadir tu cuenta de correo electrónico <strong>raymondquintana23@gmail.com</strong> como Propietario (Owner), haz lo siguiente:
              </p>
              <ul className="list-disc pl-5 space-y-0.5 text-slate-400 mt-1">
                <li>Abre la consola de Google Cloud y ve a <strong className="text-slate-200">IAM y Administración &gt; IAM</strong> en el menú de navegación izquierdo.</li>
                <li>Haz clic en el botón superior <strong className="text-slate-200">Otorgar acceso</strong> (Grant Access).</li>
                <li>En "Nuevos principios", ingresa <strong className="text-indigo-300">raymondquintana23@gmail.com</strong>.</li>
                <li>En "Selecciona un rol", busca <strong className="text-slate-200">Proyecto &gt; Propietario</strong> (Owner).</li>
                <li>Haz clic en <strong className="text-slate-200">Guardar</strong>.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
        </>
      )}

      {activeTab === 'jerarquia' && (
      <form onSubmit={handleSaveConfigs} className="flex flex-col gap-6 font-sans" id="configs-editor-form">
        
        {/* Render Tiers Grid list editable */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {localTiers.map((tier, index) => (
            <div 
              key={`tier-edit-${index}`}
              className="bg-[#111827]/60 backdrop-blur-md rounded-2xl p-5 flex flex-col gap-5 relative overflow-hidden shadow-xl border border-white/5"
            >
              {/* Colored tier tab indicator */}
              <div 
                className="absolute top-0 inset-x-0 h-1.5 transition-all"
                style={{ backgroundColor: tier.colorHex }}
              />

              {/* Delete Button (top right) */}
              <button
                type="button"
                onClick={() => handleDeleteTier(tier.id)}
                className="absolute top-2 right-2 p-1.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-slate-900/50 transition-all cursor-pointer border-none bg-transparent"
                title="Eliminar este Tier"
              >
                <span className="material-symbols-outlined text-sm font-bold">delete</span>
              </button>

              {/* Title & Badge editable rows */}
              <div className="flex gap-4">
                <div className="flex-grow flex flex-col gap-1.5">
                  <label className="font-mono text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Nombre Comercial del Nivel</label>
                  <input 
                    type="text"
                    value={tier.name}
                    onChange={(e) => handleTextChange(index, 'name', e.target.value)}
                    className="bg-slate-950/80 border border-slate-800 font-sans font-bold text-sm px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all w-full"
                  />
                </div>
                
                <div className="w-1/3 flex flex-col gap-1.5">
                  <label className="font-mono text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Insignia (Badge)</label>
                  <input 
                    type="text"
                    value={tier.badgeName}
                    onChange={(e) => handleTextChange(index, 'badgeName', e.target.value)}
                    className="bg-slate-950/80 border border-slate-800 font-mono text-xs font-black text-center px-2 py-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all w-full"
                  />
                </div>
              </div>

              {/* ID & Color HEX (CRUD dynamic fields) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Código Interno (ID)</label>
                  <input 
                    type="text"
                    value={tier.id}
                    onChange={(e) => {
                      const updated = [...localTiers];
                      updated[index] = { ...updated[index], id: e.target.value.toLowerCase().replace(/\s+/g, '') };
                      setLocalTiers(updated);
                    }}
                    className="bg-slate-950/80 border border-slate-800 font-mono text-xs px-3 py-2.5 rounded-xl text-white focus:outline-none focus:border-indigo-500 transition-all w-full"
                    placeholder="Ej: l1, custom_tier"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Color del Tier</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="color"
                      value={tier.colorHex || '#3B82F6'}
                      onChange={(e) => {
                        const updated = [...localTiers];
                        updated[index] = { ...updated[index], colorHex: e.target.value };
                        setLocalTiers(updated);
                      }}
                      className="w-8 h-8 rounded border border-slate-800 cursor-pointer bg-transparent shrink-0"
                    />
                    <input 
                      type="text"
                      value={tier.colorHex || '#3B82F6'}
                      onChange={(e) => {
                        const updated = [...localTiers];
                        updated[index] = { ...updated[index], colorHex: e.target.value };
                        setLocalTiers(updated);
                      }}
                      className="bg-[#111827] border border-slate-800 font-mono text-[11px] px-2 py-1.5 rounded-lg text-white focus:outline-none focus:border-indigo-500 w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Min XP & Max XP threshold dials */}
              <div className="grid grid-cols-2 gap-4 bg-slate-950/60 p-3.5 rounded-xl border border-slate-850/65">
                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[8.5px] font-black text-slate-400 uppercase tracking-wider">XP Mínimo (Entrada)</label>
                  <input 
                    type="number"
                    min="0"
                    value={tier.minXp}
                    onChange={(e) => handleXpChange(index, 'minXp', Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 font-mono text-xs font-black px-2.5 py-1.5 rounded-lg text-indigo-400 focus:outline-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-mono text-[8.5px] font-black text-slate-400 uppercase tracking-wider">XP Máximo (Ascenso)</label>
                  <input 
                    type="number"
                    min="1"
                    value={tier.maxXp}
                    onChange={(e) => handleXpChange(index, 'maxXp', Number(e.target.value))}
                    className="bg-slate-900 border border-slate-800 font-mono text-xs font-black px-2.5 py-1.5 rounded-lg text-cyan-400 focus:outline-none"
                  />
                </div>
              </div>

              {/* Core eligible KPIs and task assignments checklist (Roster level filtering constraint) */}
              <div className="space-y-2">
                <label className="font-mono text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">KPIs Activos y Dimensiones Evaluables</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(['knowledge', 'execution', 'relational', 'collaborative', 'control'] as DimensionType[]).map(kpi => {
                    const isChecked = (tier.eligibleKpis || ['knowledge', 'execution', 'relational', 'collaborative', 'control']).includes(kpi);
                    return (
                      <label 
                        key={kpi}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] cursor-pointer hover:bg-slate-900/30 transition-all ${
                          isChecked ? 'border-indigo-500 font-bold text-indigo-400 bg-[#1e1b4b]/40' : 'border-slate-800 text-slate-400'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleKpiToggle(index, kpi)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 bg-slate-950 border-slate-850 outline-none text-[10px]"
                        />
                        <span>{getKpiLiteral(kpi)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}

          {/* Add New Tier Dash Bento Card */}
          <button
            type="button"
            onClick={handleAddTier}
            className="bg-[#111827]/30 hover:bg-[#111827]/50 border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center gap-3.5 transition-all cursor-pointer text-slate-400 hover:text-indigo-400 min-h-[260px]"
          >
            <span className="material-symbols-outlined text-3xl font-black">add_circle</span>
            <div className="text-center">
              <span className="font-mono text-xs font-black uppercase tracking-wider block">Agregar Nuevo Rango / Tier</span>
              <p className="text-[10px] text-slate-500 mt-1 max-w-[200px] leading-relaxed">
                Agrega un nuevo escalón con ID único, color y parámetros de XP personalizados.
              </p>
            </div>
          </button>
        </div>

        {/* Global form submit trigger */}
        <div className="bg-[#111827]/60 backdrop-blur-md p-5 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xl">
          <p className="text-xs font-sans text-slate-400 leading-relaxed max-w-lg">
            <strong>Inmediato:</strong> Modificar los umbrales de XP recalcula el progreso de todos los técnicos asociados inmediatamente en tiempo real para reflejar cambios.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            {onResetTiersToDefault && (
              <button 
                type="button"
                onClick={onResetTiersToDefault}
                className="w-full sm:w-auto py-3 px-5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-rose-300 font-mono text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-sm font-black text-rose-400">restart_alt</span>
                Restablecer Jerarquía
              </button>
            )}
            <button 
              type="submit"
              className="w-full sm:w-auto py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/40 border-none"
            >
              <span className="material-symbols-outlined text-sm font-black">save_alt</span>
              Guardar Configuración
            </button>
          </div>
        </div>

      </form>
      )}

      {activeTab === 'sistema' && (
        <>
      {/* Importador de Requerimientos Históricos Completados en Hojas de Cálculo */}
      <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-5 font-sans" id="spreadsheet-historical-import-section">
        <div>
          <h3 className="font-display font-extrabold text-[#eceef0] text-base mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-500">upload_file</span>
            Importador de Requerimientos Históricos Completados (Copiar y Pegar)
          </h3>
          <p className="font-sans text-xs text-slate-400 leading-relaxed">
            Permite importar de forma masiva requerimientos ya completados copiando filas directamente desde Google Sheets (o Excel) y pegándolas en el campo de texto a continuación. Los registros se ingresarán de manera directa con estado <strong>COMPLETADO</strong> en el <strong>Histórico de Completados (colección /historico_completados)</strong> en Firestore. Estos registros no afectarán las métricas, cuotas o flujos de trabajo de la semana en curso.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-slate-400">content_paste</span>
              Pegue las filas copiadas de Google Sheets/Excel (incluyendo la fila de cabeceras):
            </label>
            <textarea
              value={historicalText}
              onChange={(e) => setHistoricalText(e.target.value)}
              placeholder={`ID\tAssigned To\tStatus\tPriority\tRequest Type\tCreated Date\tAccount\tContact\tSubject\tNota Interna
28140\tChristian Fernandez\tCOMPLETADO\tAlta\tSoporte Técnico\t01/07/2026 14:00\tF.H.O.N.S.\tChristian\tConfiguración de firewall\tImportado desde histórico`}
              className="w-full h-44 bg-slate-950/80 border border-slate-800/80 rounded-xl p-3.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/80 transition-all custom-scrollbar"
            />
          </div>

          <div className="bg-slate-950/50 border border-slate-800/50 p-4 rounded-xl text-slate-400">
            <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs text-indigo-400">info</span>
              Información de Columnas Reconocidas
            </h4>
            <p className="text-[11px] leading-relaxed mb-2">
              El analizador es flexible e inteligente. Mapeará automáticamente las columnas en español o inglés sin distinguir mayúsculas, espacios, guiones o guiones bajos (ej: <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">ID</code> / <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">ticket</code>, <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">Assigned To</code> / <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">técnico</code>, <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">Status</code> / <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">estado</code>, <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">Subject</code> / <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">asunto</code> / <code className="text-amber-400 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">requerimiento</code>). Las filas duplicadas en base a su ID o que ya existan en la base de datos se omitirán de manera automática.
            </p>
          </div>

          {historicalImportStatus !== 'idle' && (
            <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 animate-fadeIn ${
              historicalImportStatus === 'loading' ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-300' :
              historicalImportStatus === 'success' ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300' :
              'bg-rose-950/20 border-rose-500/30 text-rose-300'
            }`}>
              <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${
                historicalImportStatus === 'loading' ? 'animate-spin text-indigo-400' :
                historicalImportStatus === 'success' ? 'text-emerald-400 animate-bounce' :
                'text-rose-400'
              }`}>
                {historicalImportStatus === 'loading' ? 'sync' :
                 historicalImportStatus === 'success' ? 'check_circle' :
                 'error'}
              </span>
              <div>
                <span className="font-bold block mb-0.5">
                  {historicalImportStatus === 'loading' ? 'Procesando importación...' :
                   historicalImportStatus === 'success' ? 'Carga completada' :
                   'Ocurrió un inconveniente'}
                </span>
                <p className="text-[11px] opacity-90">{historicalImportMessage}</p>
              </div>
            </div>
          )}

          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={handleImportHistoricalSpreadsheet}
              disabled={historicalImportStatus === 'loading'}
              className="py-2.5 px-5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-mono text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-amber-950/20"
            >
              <span className="material-symbols-outlined text-sm font-black">upgrade</span>
              {historicalImportStatus === 'loading' ? 'Procesando...' : 'Importar Requerimientos Históricos'}
            </button>
          </div>
        </div>
      </div>

      {/* Sección de Gestión de Base de Datos */}
      <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-5 font-sans">
        <div>
          <h3 className="font-display font-extrabold text-[#eceef0] text-base mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-cyan-400">database</span>
            Gestión de Datos y Copias de Seguridad (Base de Datos)
          </h3>
          <p className="font-sans text-xs text-slate-400 leading-relaxed">
            Administre de forma segura el almacenamiento de Tier Master. Puede descargar una copia de seguridad completa del estado actual del sistema (técnicos, certificaciones y configuraciones de tiers) en un archivo local JSON, restaurar una copia guardada previamente o reiniciar los datos al estado de fábrica.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          {/* Export card */}
          <div className="bg-slate-950/65 border border-slate-800/80 p-4.5 rounded-xl flex flex-col justify-between gap-4">
            <div>
              <h4 className="font-sans font-bold text-xs text-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-400 text-sm">download</span>
                Copia de Seguridad (.JSON)
              </h4>
              <p className="text-[11px] text-slate-400 font-sans mt-1 leading-normal">
                Exporta y descarga un archivo local con todos tus técnicos, bitácoras, certificaciones y configuraciones.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-mono text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-xs">download</span>
              Exportar JSON
            </button>
          </div>

          {/* Import card */}
          <div className="bg-slate-950/65 border border-slate-800/80 p-4.5 rounded-xl flex flex-col justify-between gap-4">
            <div>
              <h4 className="font-sans font-bold text-xs text-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-400 text-sm">upload_file</span>
                Restaurar Copia (.JSON)
              </h4>
              <p className="text-[11px] text-slate-400 font-sans mt-1 leading-normal">
                Sube una copia de seguridad JSON previamente exportada para restaurar el roster de técnicos y configuraciones.
              </p>
            </div>
            <div>
              <label className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-white font-mono text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5">
                <span className="material-symbols-outlined text-xs">upload_file</span>
                Importar JSON
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Reset card */}
          <div className="bg-slate-950/65 border border-slate-800/80 p-4.5 rounded-xl flex flex-col justify-between gap-4">
            <div>
              <h4 className="font-sans font-bold text-xs text-slate-200 flex items-center gap-2">
                <span className="material-symbols-outlined text-rose-500 text-sm">restart_alt</span>
                Reinicio Operativo
              </h4>
              <p className="text-[11px] text-slate-400 font-sans mt-1 leading-normal">
                Restablece toda la base de datos de técnicos, historial de bitácoras y configuraciones a los valores de fábrica.
              </p>
            </div>
            {onResetDatabase && (
              <button
                type="button"
                onClick={onResetDatabase}
                className="w-full py-2 bg-rose-950/20 hover:bg-rose-950/40 border border-rose-900/50 text-rose-300 font-mono text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-xs">delete_forever</span>
                Restablecer Fábrica
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sección de Gestión de Coming Soon */}
      <div className="bg-[#111827]/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-xl flex flex-col gap-5 font-sans mt-5" id="coming-soon-configuration-section">
        <div>
          <h3 className="font-display font-extrabold text-[#eceef0] text-base mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#f43f5e]">schedule</span>
            Control de Acceso y Lanzamiento ("Coming Soon")
          </h3>
          <p className="font-sans text-xs text-slate-400 leading-relaxed">
            Habilite o deshabilite temporalmente cualquier sección del sistema mostrando un panel interactivo de "Próximamente / Coming Soon". La sección de <strong>Configuraciones</strong> está permanentemente protegida y no puede desactivarse para evitar el bloqueo del sistema.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
          {SYSTEM_SECTIONS.map((sec) => {
            const isSectionActive = comingSoonConfig && comingSoonConfig[sec.key];
            const hasSubs = sec.subsections && sec.subsections.length > 0;
            return (
              <div 
                key={sec.key} 
                className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                  isSectionActive 
                    ? 'bg-rose-950/20 border-rose-900/40 shadow-xs' 
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 shadow-sm'
                }`}
              >
                {/* Main Header Row */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-bold text-slate-200">{sec.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{sec.key}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateComingSoonConfig) {
                        const updated = {
                          ...(comingSoonConfig || {}),
                          [sec.key]: !isSectionActive,
                        };
                        onUpdateComingSoonConfig(updated);
                      }
                    }}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isSectionActive ? 'bg-rose-500' : 'bg-slate-800'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isSectionActive ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Nested Subsections */}
                {hasSubs && (
                  <div className="pl-3 py-2 border-l border-slate-800/80 flex flex-col gap-2 bg-slate-950/20 rounded-lg p-2.5 mt-1">
                    <div className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mb-1">
                      Pestañas / Sub-secciones:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {sec.subsections.map((sub) => {
                        const subKey = `${sec.key}_${sub.key}`;
                        const isSubActive = comingSoonConfig && comingSoonConfig[subKey];
                        return (
                          <div 
                            key={sub.key}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-[11px] transition-all ${
                              isSubActive
                                ? 'bg-rose-950/30 border-rose-900/30 text-rose-300'
                                : 'bg-slate-900/40 border-slate-800/60 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="font-bold truncate max-w-[70%]" title={sub.label}>
                              {sub.label}
                            </span>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (onUpdateComingSoonConfig) {
                                  const updated = {
                                    ...(comingSoonConfig || {}),
                                    [subKey]: !isSubActive,
                                  };
                                  onUpdateComingSoonConfig(updated);
                                }
                              }}
                              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                isSubActive ? 'bg-rose-500' : 'bg-slate-700'
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                                  isSubActive ? 'translate-x-3' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
        </>
      )}
    </div>
  );
}
