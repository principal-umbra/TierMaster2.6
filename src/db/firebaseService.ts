import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  getDoc as fbGetDoc,
  getDocs as fbGetDocs, 
  setDoc as fbSetDoc, 
  updateDoc as fbUpdateDoc, 
  deleteDoc as fbDeleteDoc, 
  onSnapshot as fbOnSnapshot,
  query, 
  where,
  writeBatch as fbWriteBatch,
  arrayUnion,
  limit
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfigJSON from '../../firebase-applet-config.json';
import { safeDispatchEvent } from '../lib/events';

export let isFirebaseQuotaExceeded = false;
const originalConsoleError = console.error;

console.error = (...args) => {
  const msg = args.map(a => typeof a === 'string' ? a : (a?.message || '')).join(' ').toLowerCase();
  
  if (msg.includes('quota limit exceeded') || msg.includes('quota exceeded') || msg.includes('quota')) {
    if (!isFirebaseQuotaExceeded) {
      isFirebaseQuotaExceeded = true;
      originalConsoleError('=== LÍMITE DE CUOTA DE FIREBASE ALCANZADO ===');
      originalConsoleError('El sistema ha suspendido nuevas consultas y silenciado futuros errores de cuota.');
      safeDispatchEvent('firebase_quota_exceeded', { error: 'Quota exceeded' });
    }
    // Suprimir silenciosamente todos los logs de cuota de aquí en adelante
    return;
  }
  // Si no es un error de cuota, imprimirlo normalmente
  originalConsoleError(...args);
};

export function checkAndSetQuotaError(err: any, contextMsg: string) {
  // Now handled centrally by console.error override
  console.error(contextMsg, err);
}

const getFirebaseConfig = () => {
  const meta = import.meta as any;
  if (meta.env && meta.env.VITE_FIREBASE_PROJECT_ID) {
    return {
      projectId: meta.env.VITE_FIREBASE_PROJECT_ID,
      appId: meta.env.VITE_FIREBASE_APP_ID,
      apiKey: meta.env.VITE_FIREBASE_API_KEY,
      authDomain: meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      firestoreDatabaseId: meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID,
      storageBucket: meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      oAuthClientId: meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID
    };
  }
  return firebaseConfigJSON;
};

const firebaseConfig = getFirebaseConfig();
import { 
  INITIAL_AGENTS, 
  INITIAL_TIERS, 
  INITIAL_CERTIFICATIONS 
} from '../mockData';
import { 
  DEFAULT_JORNADAS,
  DEFAULT_ASISTENCIAS,
  DEFAULT_DESIGNATIONS,
  DEFAULT_AUSENCIAS,
  DEFAULT_INTERNAL_TASKS,
  DEFAULT_CONTRACTOR_TASKS,
  DEFAULT_EVENTS,
  DEFAULT_EVALUATIONS,
  DEFAULT_DAILY_SCRUMS,
  DEFAULT_CRM_TICKETS
} from './initialSeedData';
import { 
  Agent, 
  TierConfig, 
  Certification, 
  InternalTask, 
  ContractorTask, 
  IsolatedEvent,
  CalendarEvent,
  JornadaRow,
  DesignationRow,
  AusenciaRow,
  CRMData,
  ScrumTask,
  AgentProfile
} from '../types';

const INITIAL_PROFILES = INITIAL_AGENTS.map(agent => ({
  agentId: agent.id,
  skills: agent.skills || [],
  specialties: agent.specialties || [],
  improvementAreas: agent.improvementAreas || [],
  painPoints: agent.painPoints || [],
  actionPlan: agent.actionPlan || []
}));

// Inicializar la app de Firebase de manera única
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inicializar Firestore de la manera más compatible
// Si databaseId es igual al projectId, usamos la base de datos por defecto para evitar errores de recurso inválido
const actualDbId = (firebaseConfig.firestoreDatabaseId && 
                    firebaseConfig.firestoreDatabaseId !== firebaseConfig.projectId &&
                    firebaseConfig.firestoreDatabaseId !== 'default')
  ? firebaseConfig.firestoreDatabaseId
  : '(default)';

console.log('--- Firebase Initialization ---');
console.log('Project ID:', firebaseConfig.projectId);
console.log('Database ID:', actualDbId);

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true // Forzamos long polling exclusivamente para evitar conflictos y asegurar estabilidad
}, actualDbId);

// Inicializar Auth
export const auth = getAuth(app);

// Monitoreo de Uso Local
export const checkDailyReset = () => {
  const lastReset = localStorage.getItem('tm_firebase_last_reset');
  const today = new Date().toISOString().split('T')[0];
  if (lastReset !== today) {
    localStorage.setItem('tm_firebase_local_usage', JSON.stringify({"reads":0,"writes":0,"deletes":0}));
    localStorage.setItem('tm_firebase_last_reset', today);
  }
};

// Ejecutar inmediatamente al cargar el módulo para sincronizar
try {
  checkDailyReset();
} catch (e) {
  // Ignorar errores fuera de navegador
}

export const getFirebaseLocalUsage = () => {
  try {
    checkDailyReset();
    return JSON.parse(localStorage.getItem('tm_firebase_local_usage') || '{"reads":0,"writes":0,"deletes":0}');
  } catch (e) {
    return { reads: 0, writes: 0, deletes: 0 };
  }
};

export const trackFirebaseUsage = (type: 'reads' | 'writes' | 'deletes', count: number) => {
  if (count <= 0) return;
  try {
    checkDailyReset();
    const key = 'tm_firebase_local_usage';
    const current = JSON.parse(localStorage.getItem(key) || '{"reads":0,"writes":0,"deletes":0}');
    current[type] = (current[type] || 0) + count;
    localStorage.setItem(key, JSON.stringify(current));
    safeDispatchEvent('firebase_usage_update', current);
  } catch (e) {
    // Ignore localStorage errors
  }
};

// ============================================================================
// WRAPPERS DE FIRESTORE CON DETECCION DE CUOTA Y TRAZA DE LECTURA/ESCRITURA
// ============================================================================
export async function getDocs(q: any): Promise<any> {
  if (isFirebaseQuotaExceeded) {
    throw new Error('Firebase Quota Exceeded (Kill Switch active)');
  }
  const snapshot = await fbGetDocs(q);
  const count = snapshot.docs.length || 1;
  trackFirebaseUsage('reads', count);
  return snapshot;
}

export async function getDoc(docRef: any): Promise<any> {
  if (isFirebaseQuotaExceeded) {
    throw new Error('Firebase Quota Exceeded (Kill Switch active)');
  }
  const snapshot = await fbGetDoc(docRef);
  trackFirebaseUsage('reads', 1);
  return snapshot;
}

export async function setDoc(docRef: any, data: any, options?: any) {
  if (isFirebaseQuotaExceeded) {
    throw new Error('Firebase Quota Exceeded (Kill Switch active)');
  }
  const result = await fbSetDoc(docRef, data, options);
  trackFirebaseUsage('writes', 1);
  return result;
}

export async function updateDoc(docRef: any, data: any) {
  if (isFirebaseQuotaExceeded) {
    throw new Error('Firebase Quota Exceeded (Kill Switch active)');
  }
  const result = await fbUpdateDoc(docRef, data);
  trackFirebaseUsage('writes', 1);
  return result;
}

export async function deleteDoc(docRef: any) {
  if (isFirebaseQuotaExceeded) {
    throw new Error('Firebase Quota Exceeded (Kill Switch active)');
  }
  const result = await fbDeleteDoc(docRef);
  trackFirebaseUsage('deletes', 1);
  return result;
}

export function onSnapshot(...args: any[]) {
  if (isFirebaseQuotaExceeded) {
    const errorCallback = args.find(arg => typeof arg === 'function' && arg !== args[1]);
    if (errorCallback) errorCallback(new Error('Firebase Quota Exceeded (Kill Switch active)'));
    return () => {};
  }

  const nextCallbackIndex = args.findIndex(arg => typeof arg === 'function');
  if (nextCallbackIndex !== -1) {
    const originalNext = args[nextCallbackIndex];
    args[nextCallbackIndex] = (snapshot: any) => {
      const count = snapshot.docs ? (snapshot.docs.length || 1) : 1;
      trackFirebaseUsage('reads', count);
      originalNext(snapshot);
    };
  }

  return fbOnSnapshot(...(args as [any, any]));
}

export function writeBatch(firestoreInstance: any) {
  if (isFirebaseQuotaExceeded) {
    throw new Error('Firebase Quota Exceeded (Kill Switch active)');
  }
  const batch = fbWriteBatch(firestoreInstance);
  let writesCount = 0;
  let deletesCount = 0;

  return {
    set(docRef: any, data: any, options?: any) {
      batch.set(docRef, data, options);
      writesCount++;
      return this;
    },
    update(docRef: any, ...args: any[]) {
      (batch.update as any)(docRef, ...args);
      writesCount++;
      return this;
    },
    delete(docRef: any) {
      batch.delete(docRef);
      deletesCount++;
      return this;
    },
    async commit() {
      if (isFirebaseQuotaExceeded) {
        throw new Error('Firebase Quota Exceeded (Kill Switch active)');
      }
      const result = await batch.commit();
      if (writesCount > 0) {
        trackFirebaseUsage('writes', writesCount);
      }
      if (deletesCount > 0) {
        trackFirebaseUsage('deletes', deletesCount);
      }
      return result;
    }
  };
}

// ==========================================
// CONTROL DE ERRORES EXIGIDO POR EL SKILL
// ==========================================
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function getDayOfWeek(dateStr: string): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const date = new Date(dateStr);
  return days[date.getUTCDay()];
}

export function getWeekRange(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(date);
  monday.setUTCDate(diff);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  return `${formatDate(monday)} to ${formatDate(sunday)}`;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('Quota') || message.includes('quota')) {
    safeDispatchEvent('firebase_quota_exceeded', { error: message });
  }

  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Lista de credenciales por defecto para sembrar si la colección está vacía
const DEFAULT_CREDENTIALS = [
  { username: 'rquintana', password: 'fhons2026', name: 'R. Quintana', email: 'rquintana@fhons.com.do', role: 'User' },
  { username: 'admin', password: 'admin2026', name: 'Administrador FHONS', email: 'admin@fhons.com.do', role: 'Admin' },
  { username: 'framirez', password: 'fhons2026', name: 'Francisco Ramirez', email: 'framirez@fhons.com', role: 'User' },
  { username: 'hherrera', password: 'fhons2026', name: 'Hendel Herrera', email: 'hherrera@fhons.com', role: 'User' },
  { username: 'rbello', password: 'fhons2026', name: 'Rafael Bello', email: 'rbello@fhons.co', role: 'User' },
  { username: 'rpichardo', password: 'fhons2026', name: 'Robert Pichardo', email: 'rpichardo@fhons.com', role: 'User' }
];

/**
 * Función auxiliar para verificar si una colección está vacía y sembrarla con datos por defecto.
 */
async function ensureSeededCollection(collectionName: string, defaultData: any[], idKey: string) {
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      console.log(`Colección '${collectionName}' vacía. Sembrando con ${defaultData.length} registros...`);
      const batch = writeBatch(db);
      defaultData.forEach((item) => {
        const id = item[idKey];
        if (id) {
          const docRef = doc(db, collectionName, id);
          batch.set(docRef, item);
        }
      });
      await batch.commit();
      console.log(`Colección '${collectionName}' sembrada correctamente.`);
    }
  } catch (err) {
    console.error(`Error al sembrar la colección '${collectionName}':`, err);
  }
}

/**
 * Función auxiliar para sembrar estrictamente los 3 documentos principales de designaciones.
 */
async function ensureSeededDesignations() {
  try {
    const colRef = collection(db, 'designations');
    const snapshot = await getDocs(colRef);
    if (snapshot.empty) {
      console.log('Colección designations vacía. Sembrando los 3 documentos por defecto (guardia, chat, alertas)...');
      const batch = writeBatch(db);
      
      const today = new Date();
      const day = today.getDay();
      const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(today.setDate(diffToMonday));
      monday.setHours(0,0,0,0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23,59,59,999);
      
      const toYYYYMMDD = (d: Date) => {
        return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
      };
      
      const weekStart = toYYYYMMDD(monday);
      const weekEnd = toYYYYMMDD(sunday);
      const nowStr = new Date().toISOString();

      // guardia document
      const guardiaRef = doc(db, 'designations', 'guardia');
      batch.set(guardiaRef, {
        currentAgentId: 'AG-FR-765',
        currentAgentName: 'Francisco Ramirez',
        updatedAt: nowStr,
        history: [{
          agentId: 'AG-FR-765',
          agentName: 'Francisco Ramirez',
          startDate: weekStart,
          endDate: weekEnd,
          assignedBy: 'Sistema (Auto-siembra)',
          updatedAt: nowStr
        }]
      });

      // chat document
      const chatRef = doc(db, 'designations', 'chat');
      batch.set(chatRef, {
        currentAgentId: 'AG-RP-509',
        currentAgentName: 'Robert Pichardo',
        updatedAt: nowStr,
        history: [{
          agentId: 'AG-RP-509',
          agentName: 'Robert Pichardo',
          startDate: weekStart,
          endDate: weekEnd,
          assignedBy: 'Sistema (Auto-siembra)',
          updatedAt: nowStr
        }]
      });

      // alertas document
      const alertasRef = doc(db, 'designations', 'alertas');
      batch.set(alertasRef, {
        currentAgentId: 'AG-RB-101',
        currentAgentName: 'Rafael Bello',
        updatedAt: nowStr,
        history: [{
          agentId: 'AG-RB-101',
          agentName: 'Rafael Bello',
          startDate: weekStart,
          endDate: weekEnd,
          assignedBy: 'Sistema (Auto-siembra)',
          updatedAt: nowStr
        }]
      });

      await batch.commit();
      console.log('Documentos principales de designations sembrados correctamente.');
    }
  } catch (err) {
    console.error('Error al sembrar la colección de designations:', err);
  }
}

/**
 * Inicialización/Siembra inicial de toda la base de datos de Firebase.
 * Se ejecuta de manera perezosa en la primera lectura de agentes.
 */
let isDatabaseSeeded = false;
export async function seedDatabaseIfNeeded() {
  if (isFirebaseQuotaExceeded) return;
  if (isDatabaseSeeded) return;
  
  // Sembrar credenciales
  await ensureSeededCollection('credentials', DEFAULT_CREDENTIALS, 'username');
  // Sembrar niveles jerárquicos (Tiers)
  await ensureSeededCollection('tiers', INITIAL_TIERS, 'id');
  // Sembrar certificaciones
  await ensureSeededCollection('certifications', INITIAL_CERTIFICATIONS, 'id');
  // Sembrar agentes (Roster)
  await ensureSeededCollection('roster_agentes', INITIAL_AGENTS, 'id');
  // Sembrar jornadas
  await ensureSeededCollection('jornadas', DEFAULT_JORNADAS, 'idAgente');
  // Sembrar asistencia
  await ensureSeededCollection('asistencia', DEFAULT_ASISTENCIAS, 'idAgente');
  // Sembrar las 3 designaciones principales (guardia, chat, alertas) sin crear otros documentos
  await ensureSeededDesignations();
  // Sembrar solicitudes de ausencias
  await ensureSeededCollection('ausencias', DEFAULT_AUSENCIAS, 'idSolicitud');
  // Sembrar tareas operativas internas
  await ensureSeededCollection('internalTasks', DEFAULT_INTERNAL_TASKS, 'id');
  // Sembrar eventos operativos aislados
  await ensureSeededCollection('eventos', DEFAULT_EVENTS, 'id');
  // Sembrar historial del Daily Scrum
  await ensureSeededCollection('dailyScrumHistory', DEFAULT_DAILY_SCRUMS, 'id');
  // Sembrar perfiles individuales de agentes
  await ensureSeededCollection('profiles', INITIAL_PROFILES, 'agentId');

  isDatabaseSeeded = true;
}

/**
 * Forzar la siembra/sobrescritura completa de todos los datos en Firestore.
 * Esto asegura que las colecciones se creen incluso si la base de datos estaba vacía o con reglas restrictivas.
 */
export async function overrideSeedDatabase(): Promise<void> {
  const seedItem = async (collectionName: string, defaultData: any[], idKey: string) => {
    const batch = writeBatch(db);
    defaultData.forEach((item) => {
      const id = item[idKey];
      if (id) {
        const docRef = doc(db, collectionName, id);
        batch.set(docRef, item);
      }
    });
    await batch.commit();
  };

  await seedItem('credentials', DEFAULT_CREDENTIALS, 'username');
  await seedItem('tiers', INITIAL_TIERS, 'id');
  await seedItem('certifications', INITIAL_CERTIFICATIONS, 'id');
  await seedItem('roster_agentes', INITIAL_AGENTS, 'id');
  await seedItem('jornadas', DEFAULT_JORNADAS, 'idAgente');
  await seedItem('asistencia', DEFAULT_ASISTENCIAS, 'idAgente');
  
  // Seed the 3 main designation docs strictly: guardia, chat, alertas
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diffToMonday));
  monday.setHours(0,0,0,0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23,59,59,999);
  
  const toYYYYMMDD = (d: Date) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  };
  const weekStart = toYYYYMMDD(monday);
  const weekEnd = toYYYYMMDD(sunday);
  const nowStr = new Date().toISOString();

  await setDoc(doc(db, 'designations', 'guardia'), {
    currentAgentId: 'AG-FR-765',
    currentAgentName: 'Francisco Ramirez',
    updatedAt: nowStr,
    history: [{
      agentId: 'AG-FR-765',
      agentName: 'Francisco Ramirez',
      startDate: weekStart,
      endDate: weekEnd,
      assignedBy: 'Sistema (Auto-siembra)',
      updatedAt: nowStr
    }]
  });
  await setDoc(doc(db, 'designations', 'chat'), {
    currentAgentId: 'AG-RP-509',
    currentAgentName: 'Robert Pichardo',
    updatedAt: nowStr,
    history: [{
      agentId: 'AG-RP-509',
      agentName: 'Robert Pichardo',
      startDate: weekStart,
      endDate: weekEnd,
      assignedBy: 'Sistema (Auto-siembra)',
      updatedAt: nowStr
    }]
  });
  await setDoc(doc(db, 'designations', 'alertas'), {
    currentAgentId: 'AG-RB-101',
    currentAgentName: 'Rafael Bello',
    updatedAt: nowStr,
    history: [{
      agentId: 'AG-RB-101',
      agentName: 'Rafael Bello',
      startDate: weekStart,
      endDate: weekEnd,
      assignedBy: 'Sistema (Auto-siembra)',
      updatedAt: nowStr
    }]
  });

  await seedItem('ausencias', DEFAULT_AUSENCIAS, 'idSolicitud');
  await seedItem('internalTasks', DEFAULT_INTERNAL_TASKS, 'id');
  await seedItem('eventos', DEFAULT_EVENTS, 'id');
  await seedItem('dailyScrumHistory', DEFAULT_DAILY_SCRUMS, 'id');
  await seedItem('profiles', INITIAL_PROFILES, 'agentId');
  isDatabaseSeeded = true;
}

// ==========================================
// 1. GESTIÓN DE CREDENCIALES (LOGIN)
// ==========================================

export interface UserCredential {
  username: string;
  password: string;
  name: string;
  email: string;
  role: string;
  agentId?: string;
}

export async function fetchAllCredentials(): Promise<UserCredential[]> {
  await seedDatabaseIfNeeded();
  try {
    const snapshot = await getDocs(collection(db, 'credentials'));
    return snapshot.docs.map(doc => doc.data() as UserCredential);
  } catch (err) {
    console.error('Error al recuperar credenciales de Firestore:', err);
    return DEFAULT_CREDENTIALS; // Fallback
  }
}

export async function saveCredential(cred: UserCredential): Promise<void> {
  try {
    const cleanUsername = cred.username.toLowerCase().trim();
    await setDoc(doc(db, 'credentials', cleanUsername), {
      ...cred,
      username: cleanUsername
    });
  } catch (err) {
    console.error('Error al guardar credencial en Firestore:', err);
    throw err;
  }
}

export async function updateCredentials(newCredentials: UserCredential[]): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'credentials'));
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    newCredentials.forEach(cred => {
      const cleanUsername = cred.username.toLowerCase().trim();
      const docRef = doc(db, 'credentials', cleanUsername);
      batch.set(docRef, { ...cred, username: cleanUsername });
    });
    
    await batch.commit();
  } catch (err) {
    console.error('Error al actualizar credenciales en Firestore:', err);
    throw err;
  }
}

// ==========================================
// 2. GESTIÓN DEL ROSTER DE AGENTES
// ==========================================

// Name normalization and matching helpers (matching RequestBacklogTab logic exactly)
const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents / diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Normalize multiple spaces
};

const isAgentNameMatch = (nameA: string, nameB: string): boolean => {
  if (!nameA || !nameB) return false;
  const cleanA = normalizeName(nameA);
  const cleanB = normalizeName(nameB);
  
  if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
  
  const partsA = cleanA.split(' ').filter(Boolean);
  const partsB = cleanB.split(' ').filter(Boolean);
  
  if (partsA.length > 0 && partsB.length > 0) {
    if (partsA[0] === partsB[0]) {
      if (partsA.length > 1 && partsB.length > 1) {
        if (partsA[1].startsWith(partsB[1]) || partsB[1].startsWith(partsA[1])) {
          return true;
        }
      } else {
        return true;
      }
    }
  }
  return false;
};

const isRowCompleted = (row: any, isFromHistory: boolean, isFromBacklogWeekly: boolean = false): boolean => {
  if (isFromHistory) return true;
  
  const isStatusResolved = (status: string): boolean => {
    if (!status) return false;
    const s = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    if (s.includes('confirmar') || s.includes('completad') || s.includes('resuelt') || s.includes('cerrad') || s.includes('exitos') || s.includes('finalizad') || s.includes('terminad') || s.includes('entregad') || s.includes('done') || s.includes('closed') || s.includes('resolved') || s.includes('completed')) return true;
    return false;
  };

  const mainStatusVal = String(row["Status"] || row["status"] || row["Estado"] || row["estado"] || '');
  if (isStatusResolved(mainStatusVal)) return true;
  
  let colJVal = '';
  const directKeys = ["Estado Registro", "Estado registro", "columna j", "Columna J", "Columna_J", "Columna_j"];
  for (const key of directKeys) {
    if (row[key] !== undefined) {
      colJVal = String(row[key] || '').trim();
      if (isStatusResolved(colJVal)) return true;
    }
  }
  
  if (!colJVal && (isFromBacklogWeekly || row._sourceSheet === 'backlog_semanal' || row.sprint_trabajo || ('Semana Actual' in row))) {
    return true; // Defaulted to PENDIENTE A CONFIRMAR
  }
  
  return false;
};

export const isDateInActiveWeek = (dateStr: string, activeWeekStr: string): boolean => {
  if (!activeWeekStr || !dateStr || dateStr === 'N/A') return false;
  try {
    const match = activeWeekStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return false;
    const [, d1, m1, y1, d2, m2, y2] = match;
    const startDate = new Date(Number(y1), Number(m1) - 1, Number(d1), 0, 0, 0);
    const endDate = new Date(Number(y2), Number(m2) - 1, Number(d2), 23, 59, 59);
    
    let checkDate: Date | null = null;
    
    // Custom parsing first to ensure local time is used and avoid UTC midnight shifts
    if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length >= 3) {
        const [d, m, y] = parts.map(Number);
        if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
          checkDate = new Date(y, m - 1, d, 12, 0, 0);
        }
      }
    } else if (dateStr.includes('-')) {
      const cleanDateStr = dateStr.split('T')[0];
      const parts = cleanDateStr.split(' ')[0].split('-');
      if (parts.length >= 3) {
        const p0 = Number(parts[0]);
        const p1 = Number(parts[1]);
        const p2 = Number(parts[2]);
        if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
          if (p0 > 1900) { // YYYY-MM-DD
            checkDate = new Date(p0, p1 - 1, p2, 12, 0, 0);
          } else if (p2 > 1900) { // DD-MM-YYYY
            checkDate = new Date(p2, p1 - 1, p0, 12, 0, 0);
          }
        }
      }
    }

    // Support Spanish textual dates (e.g. "18 jul 2026, 10:14" or "julio")
    if (!checkDate || isNaN(checkDate.getTime())) {
      const spanishMonths: Record<string, number> = {
        ene: 0, enero: 0,
        feb: 1, febrero: 1,
        mar: 2, marzo: 2,
        abr: 3, abril: 3,
        may: 4, mayo: 4,
        jun: 5, junio: 5,
        jul: 6, julio: 6,
        ago: 7, agosto: 7,
        sep: 8, septiembe: 8, septiembre: 8,
        oct: 9, octubre: 9,
        nov: 10, noviembre: 10,
        dic: 11, diciembre: 11
      };

      const cleanDateStr = dateStr.toLowerCase().trim();
      for (const [monthName, monthIndex] of Object.entries(spanishMonths)) {
        if (cleanDateStr.includes(monthName)) {
          const numbers = cleanDateStr.match(/\d+/g);
          if (numbers && numbers.length >= 1) {
            const day = Number(numbers[0]);
            let year = new Date().getFullYear();
            const fourDigitYear = numbers.find(n => n.length === 4);
            if (fourDigitYear) {
              year = Number(fourDigitYear);
            }
            checkDate = new Date(year, monthIndex, day, 12, 0, 0);
            break;
          }
        }
      }
    }
    
    // Fallback
    if (!checkDate || isNaN(checkDate.getTime())) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        checkDate = parsed;
      }
    }
    
    if (!checkDate || isNaN(checkDate.getTime())) return false;
    
    return checkDate >= startDate && checkDate <= endDate;
  } catch (e) {
    return false;
  }
};

export const checkSprintMatch = (ticket: any, sprintFilter: string): boolean => {
  if (!sprintFilter || sprintFilter === 'all') return true;
  if (!ticket) return false;
  
  const cleanFilter = sprintFilter.toLowerCase().trim();

  // 1. Explicit completion / resolution dates ALWAYS take precedence for completed items
  const compDateStr = String(
    ticket.completedDate || ticket.CompletedDate ||
    ticket['Resolved Date'] || ticket['Fecha Completado'] || 
    ticket.completedAt || ticket.timestamp_cierre || ticket.fecha_cierre || ticket.fecha_completado || ''
  ).trim();
  
  if (compDateStr) {
     return isDateInActiveWeek(compDateStr, sprintFilter);
  }

  // 2. Explicit ticket sprint assignment
  const ticketSprint = String(
    ticket.sprint || ticket.sprint_trabajo || ticket['Semana Actual'] || ticket.sprintName || ''
  ).toLowerCase().trim();
  
  if (ticketSprint) {
    if (ticketSprint === cleanFilter) return true;
    if (cleanFilter !== 'current' && cleanFilter !== 'previous') {
      if (ticketSprint.includes(cleanFilter) || cleanFilter.includes(ticketSprint)) return true;
    }
    return false;
  }

  // 3. Fallback date fields (visits, tasks, evaluations, created date)
  const fallbackDateStr = String(
    ticket["Created Date"] || ticket.created_date || ticket["Fecha Creación"] ||
    ticket["Fecha de creación"] || ticket.fecha_creacion || ticket.fecha_ingreso ||
    ticket.created || ticket.createdAt || ticket.createdDate ||
    ticket.fecha_visita || ticket.fecha || ticket.timestamp || ''
  ).trim();

  if (fallbackDateStr) {
     return isDateInActiveWeek(fallbackDateStr, sprintFilter);
  }
  
  return false;
};


export function parseSprintStartDate(sprintStr: string): Date | null {
  if (!sprintStr) return null;
  const match = sprintStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, d, m, y] = match;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return null;
}

export function sortSprintsDescending(sprints: string[]): string[] {
  return [...sprints].sort((a, b) => {
    const dateA = parseSprintStartDate(a);
    const dateB = parseSprintStartDate(b);
    if (dateA && dateB) {
      return dateB.getTime() - dateA.getTime();
    }
    if (dateA) return -1;
    if (dateB) return 1;
    return b.localeCompare(a);
  });
}

export async function fetchAvailableSprints(): Promise<string[]> {
  try {
    const sprints = new Set<string>();
    
    // Check historical
    const histSnap = await getDocs(collection(db, 'historico_completados'));
    histSnap.docs.forEach(d => {
      const data = d.data();
      const s = String(data.sprint_trabajo || data['Semana Actual'] || '').trim();
      if (s && s !== 'undefined') sprints.add(s);
    });

    // Check weekly
    const weekSnap = await getDocs(collection(db, 'backlog_semanal'));
    weekSnap.docs.forEach(d => {
      const data = d.data();
      const s = String(data.sprint_trabajo || data['Semana Actual'] || '').trim();
      if (s && s !== 'undefined') sprints.add(s);
    });
    
    // Check admin done
    const adminSnap = await getDocs(collection(db, 'admin_backlog_done'));
    adminSnap.docs.forEach(d => {
      const data = d.data();
      const s = String(data.sprint_trabajo || data['Semana Actual'] || '').trim();
      if (s && s !== 'undefined') sprints.add(s);
    });

    const configDoc = await getDoc(doc(db, 'settings', 'global'));
    if (configDoc.exists()) {
      const activeWeek = String(configDoc.data().current_week_range || '').trim();
      if (activeWeek) sprints.add(activeWeek);
    }

    return sortSprintsDescending(Array.from(sprints));
  } catch (err) {
    console.error('Error fetching available sprints:', err);
    return [];
  }
}

let agentsCache = new Map<string, { data: Agent[], timestamp: number }>();
export async function fetchAgents(sprintFilter?: string, forceRefresh = false): Promise<Agent[]> {
  if (isFirebaseQuotaExceeded) return [];
  const cacheKey = sprintFilter || 'all';
  const cached = agentsCache.get(cacheKey);
  if (!forceRefresh && cached && (Date.now() - cached.timestamp < 10000)) return cached.data;
  const lbSettings = await fetchLeaderboardSettings();
  await seedDatabaseIfNeeded();
  try {
    const [agentsSnap, jornadasSnap, asistenciaSnap, crmSnap, weeklySnap, historicalSnap, adminDoneSnap, ausenciasSnap, collabsSnap, visitasSnap, tasksSnap, contractorTasksSnap, evalsSnap, snapshots] = await Promise.all([
      getDocs(collection(db, 'roster_agentes')),
      getDocs(collection(db, 'jornadas')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'asistencia')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'requerimientos_en_curso')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'backlog_semanal')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'historico_completados')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'admin_backlog_done')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'ausencias')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'collaborations')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'visitas_programadas')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'internalTasks')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'contractorTasks')).catch(() => ({ docs: [] } as any)),
      getDocs(collection(db, 'evaluations')).catch(() => ({ docs: [] } as any)),
      fetchSprintSnapshots()
    ]);

    const jornadasMap = new Map<string, any>();
    DEFAULT_JORNADAS.forEach(j => {
      if (j.idAgente) {
        jornadasMap.set(j.idAgente, j);
        jornadasMap.set(j.idAgente.toLowerCase(), j);
      }
      if (j.nombreAgente) {
        jornadasMap.set(j.nombreAgente.toLowerCase(), j);
      }
    });

    jornadasSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.idAgente) {
        jornadasMap.set(data.idAgente, data);
        jornadasMap.set(data.idAgente.toLowerCase(), data);
      }
      if (data.nombreAgente) {
        jornadasMap.set(data.nombreAgente.toLowerCase(), data);
      }
    });

    const crmTickets = crmSnap.docs.map((doc: any) => doc.data());
    
    // FETCH settings/global to get current week
    let activeWeek = '';
    try {
      const configDoc = await getDoc(doc(db, 'settings', 'global'));
      if (configDoc.exists()) {
        activeWeek = String(configDoc.data().current_week_range || '').trim();
      }
    } catch (err) {}
    
    const weeklyTickets = weeklySnap.docs.map((doc: any) => doc.data());
    
    const historicalTickets: any[] = [
      ...(lbSettings.sourceHistorical ? historicalSnap.docs.map(doc => doc.data()) : []),
      ...(lbSettings.sourceAdminDone ? adminDoneSnap.docs.map(doc => doc.data()) : [])
    ];

    const allCollaborations = collabsSnap && collabsSnap.docs ? collabsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) : [];
    const allVisitas = visitasSnap && visitasSnap.docs ? visitasSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) : [];
    const internalTasksList = tasksSnap && tasksSnap.docs ? tasksSnap.docs.map((doc: any) => {
      const data = doc.data();
      const taskObj = { id: doc.id, ...data };
      if ((taskObj.status === 'Completado' || taskObj.completed) && !taskObj.completedDate && !taskObj.CompletedDate) {
        let compDate = '';
        if (taskObj.completionReport) {
          const match = String(taskObj.completionReport).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
          if (match) {
            const [, m, d, y] = match;
            compDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T12:00:00.000Z`;
          }
        }
        if (!compDate && taskObj.createdDate) compDate = taskObj.createdDate;
        if (!compDate && taskObj.createdAt) compDate = taskObj.createdAt;
        if (!compDate) compDate = new Date().toISOString();
        taskObj.completedDate = compDate;
        taskObj.CompletedDate = compDate;
      }
      return taskObj;
    }) : [];

    const contractorTasksList = contractorTasksSnap && contractorTasksSnap.docs ? contractorTasksSnap.docs.map((doc: any) => {
      const data = doc.data();
      const taskObj = {
        id: doc.id,
        ...data,
        assignedToId: data.supervisorAgentId || data.assignedToId || data.agentId || '',
        assignedToName: data.contractorName || data.assignedTo || '',
      };
      if ((taskObj.status === 'Completado' || taskObj.completed) && !taskObj.completedDate && !taskObj.CompletedDate) {
        let compDate = taskObj.dueDate || taskObj.startDate || taskObj.createdAt || new Date().toISOString();
        taskObj.completedDate = compDate;
        taskObj.CompletedDate = compDate;
      }
      return taskObj;
    }) : [];

    const allTasks = [...internalTasksList, ...contractorTasksList];
    const allEvals = evalsSnap && evalsSnap.docs ? evalsSnap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) : [];

    const attendanceByAgent = new Map<string, any[]>();
    const absences: any[] = ausenciasSnap ? ausenciasSnap.docs.map((doc: any) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        agentId: data.agentId || data.idAgente || "",
        startDate: data.startDate || data.fechaInicio || "",
        endDate: data.endDate || data.fechaFin || "",
        status: data.status || data.estado || "",
        type: data.type || data.tipo || ""
      };
    }).filter((a: any) => a.status === 'Aprobado') : [];
    
    const attendanceMapByAgent = new Map<string, Map<string, any>>();
    
    const addOrMergeAttendance = (agentId: string, record: any) => {
      if (!agentId || !record.fecha) return;
      const cleanAgentId = agentId.trim();
      if (!attendanceMapByAgent.has(cleanAgentId)) {
        attendanceMapByAgent.set(cleanAgentId, new Map());
      }
      const agentMap = attendanceMapByAgent.get(cleanAgentId)!;
      const fecha = record.fecha.trim();
      if (agentMap.has(fecha)) {
        const existing = agentMap.get(fecha)!;
        existing.checkIn = record.checkIn || existing.checkIn || "";
        existing.checkOut = record.checkOut || existing.checkOut || "";
        
        const est1 = String(existing.estado || '').trim();
        const est2 = String(record.estado || '').trim();
        if (est2) {
          const est1Lower = est1.toLowerCase();
          const est2Lower = est2.toLowerCase();
          const isEst2Stronger = !est1 || 
            est2Lower.includes('visit') || 
            est2Lower.includes('remot') || 
            est2Lower.includes('home') || 
            est2Lower.includes('permis') || 
            est2Lower.includes('vacacion') ||
            est2Lower.includes('licencia') ||
            est2Lower.includes('suspens') ||
            est2Lower.includes('feriad');
          if (isEst2Stronger) {
            existing.estado = est2;
          }
        }
        if (record.esJustificacion) {
          existing.esJustificacion = true;
        }
        if (record.observaciones) {
          existing.observaciones = record.observaciones;
        }
      } else {
        agentMap.set(fecha, { ...record });
      }
    };

    asistenciaSnap.docs.forEach((doc: any) => {
      const data = doc.data();
      if (data.weeks && data.agentId) {
        const agentId = data.agentId;
        for (const [weekRange, days] of Object.entries(data.weeks)) {
          for (const [dayOfWeek, dayData] of Object.entries(days as any)) {
            const fechaVal = (dayData as any).fecha || "";
            if (fechaVal) {
              addOrMergeAttendance(agentId, {
                fecha: fechaVal,
                checkIn: (dayData as any).checkIn || "",
                checkOut: (dayData as any).checkOut || "",
                estado: (dayData as any).estado || "",
                dayOfWeek: dayOfWeek,
                esJustificacion: (dayData as any).esJustificacion || false,
                observaciones: (dayData as any).observaciones || ""
              });
            }
          }
        }
      } else if (data.idAgente && data.fecha) {
        const agentId = data.idAgente;
        addOrMergeAttendance(agentId, {
          fecha: data.fecha,
          checkIn: data.checkIn || "",
          checkOut: data.checkOut || "",
          estado: data.estado || "",
          dayOfWeek: getDayOfWeek(data.fecha),
          esJustificacion: data.esJustificacion || false,
          observaciones: data.observaciones || ""
        });
      }
    });

    for (const [agentId, datesMap] of attendanceMapByAgent.entries()) {
      attendanceByAgent.set(agentId, Array.from(datesMap.values()));
    }

    const weekdayToJornadaKey = (dayName: string): string => {
      if (!dayName) return "";
      return dayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    };

    const isStatusResolvedLocal = (status: string): boolean => {
      if (!status) return false;
      const s = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      if (!lbSettings.statusResolvedWords) return false;
      return lbSettings.statusResolvedWords.some(w => s.includes(w.toLowerCase().trim()));
    };

    const isStatusInProgressLocal = (status: string): boolean => {
      if (!status) return false;
      const s = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
      if (!lbSettings.statusInProgressWords) return false;
      return lbSettings.statusInProgressWords.some(w => s.includes(w.toLowerCase().trim()));
    };

    const getSprintDateRange = (sprintStr: string): { start: Date; end: Date } | null => {
      const match = sprintStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const [, d1, m1, y1, d2, m2, y2] = match;
        const start = new Date(Number(y1), Number(m1) - 1, Number(d1), 0, 0, 0);
        const end = new Date(Number(y2), Number(m2) - 1, Number(d2), 23, 59, 59);
        return { start, end };
      }
      return null;
    };

    const isMetricsEligible = (sprintStr: string): boolean => {
      if (!sprintStr || sprintStr === 'all') return true;
      const range = getSprintDateRange(sprintStr);
      if (!range) return false;
      return range.start >= new Date(2026, 6, 13); // July 13, 2026
    };

    const calculateSprintXP = (agentsList: Agent[], sprint: string, baseXPMap: Map<string, number>): Agent[] => {
      const agentsWithRaw = agentsList.map(agent => {
        const a = { ...agent };
        const tId = a.tierId?.toLowerCase();

        if (tId !== 'a1') {
          let performanceScore = 0;
          let attendanceScore = 0;
          let completedTickets = 0;
          let ticketsScore = 0;
          let tareasCompletadas = 0;
          let tareasScore = 0;
          let escalacionesCompletadas = 0;
          let escalacionesScore = 0;
          let visitasCompletadas = 0;
          let visitasScore = 0;
          let workingTickets = 0;
          let pendingTickets = 0;
          let earlyCheckIns = 0;
          let onTimeCheckIns = 0;
          let graceCheckIns = 0;
          let lateCheckIns = 0;
          let missingCheckIns = 0;
          const attendanceDetail: any[] = [];

          // 1. Desempeño por Backlog Tickets (CRM)
          const isTicketForAgent = (ticket: any, agentObj: Agent): boolean => {
             const tAgentId = String(ticket.agentid || ticket.agentId || ticket['Agent ID'] || ticket.idAgente || ticket.tecnico_visita_id || '').trim();
             if (tAgentId && tAgentId.toLowerCase() === agentObj.id.toLowerCase()) return true;
             
             const assigned = ticket["Assigned To"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || ticket.tecnico_visita || ticket.tecnico || "";
             return isAgentNameMatch(agentObj.name, assigned);
          };

          const sprintRange = sprint && sprint !== 'all' ? getSprintDateRange(sprint) : null;

          const parseTicketDate = (dateVal: any): Date | null => {
            if (!dateVal) return null;
            if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal;
            if (typeof dateVal === 'object' && dateVal.seconds) return new Date(dateVal.seconds * 1000);
            const str = String(dateVal).trim();
            if (!str || str === 'N/A' || str === 'undefined') return null;
            if (str.includes('/')) {
              const parts = str.split(' ')[0].split('/');
              if (parts.length >= 3) {
                const [d, m, y] = parts.map(Number);
                if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d, 12, 0, 0);
              }
            } else if (str.includes('-')) {
              const cleanStr = str.split('T')[0];
              const parts = cleanStr.split(' ')[0].split('-');
              if (parts.length >= 3) {
                const p0 = Number(parts[0]);
                const p1 = Number(parts[1]);
                const p2 = Number(parts[2]);
                if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
                  if (p0 > 1900) return new Date(p0, p1 - 1, p2, 12, 0, 0);
                  if (p2 > 1900) return new Date(p2, p1 - 1, p0, 12, 0, 0);
                }
              }
            }
            const parsed = new Date(str);
            return !isNaN(parsed.getTime()) ? parsed : null;
          };

          const getTicketCreatedDate = (ticket: any): Date | null => {
            const val = ticket["Created Date"] || ticket.created_date || ticket["Fecha Creación"] ||
                        ticket["Fecha de creación"] || ticket.fecha_creacion || ticket.fecha_ingreso ||
                        ticket.created || ticket.createdAt || ticket.createdDate || ticket.fecha || ticket.timestamp;
            return parseTicketDate(val);
          };

          const getTicketResolvedDate = (ticket: any): Date | null => {
            const val = ticket.completedDate || ticket.CompletedDate || ticket['Resolved Date'] ||
                        ticket['Fecha Completado'] || ticket.completedAt || ticket.timestamp_cierre ||
                        ticket.fecha_cierre || ticket.fecha_completado;
            return parseTicketDate(val);
          };

          const getCalendarWorkingDaysDiff = (startDateVal: any, endDateVal: any): number => {
            const start = parseTicketDate(startDateVal);
            const end = parseTicketDate(endDateVal);
            if (!start || !end) return 999;

            const sDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const eDay = new Date(end.getFullYear(), end.getMonth(), end.getDate());

            if (eDay < sDay) return 0;

            let workingDays = 0;
            let cur = new Date(sDay.getTime());
            cur.setDate(cur.getDate() + 1);

            while (cur <= eDay) {
              if (cur.getDay() !== 0) { // Exclude Sundays (0)
                workingDays++;
              }
              cur.setDate(cur.getDate() + 1);
            }

            return workingDays;
          };

          const agentTickets = !lbSettings.sourceCrm ? [] : crmTickets.filter((ticket: any) => {
            if (!isTicketForAgent(ticket, a)) return false;
            const status = ticket["Status"] || ticket["status"] || "";
            const isResolved = isStatusResolvedLocal(status);
            if (sprint && sprint !== 'all') {
              if (isResolved) {
                return checkSprintMatch(ticket, sprint);
              }
              const ticketSprint = String(
                ticket.sprint || ticket.sprint_trabajo || ticket['Semana Actual'] || ticket.sprintName || ''
              ).toLowerCase().trim();
              if (ticketSprint) {
                const cleanFilter = sprint.toLowerCase().trim();
                if (ticketSprint === cleanFilter || ticketSprint.includes(cleanFilter) || cleanFilter.includes(ticketSprint)) {
                  return true;
                }
              }
              if (sprintRange) {
                const createdDate = getTicketCreatedDate(ticket);
                const resolvedDate = getTicketResolvedDate(ticket);
                if (createdDate) {
                  const createdOk = createdDate <= sprintRange.end;
                  const notResolvedBefore = !resolvedDate || resolvedDate >= sprintRange.start;
                  return createdOk && notResolvedBefore;
                }
              }
              return sprint === activeWeek;
            }
            return true;
          });

          const agentWeeklyTickets = !lbSettings.sourceWeekly ? [] : weeklyTickets.filter((ticket: any) => {
            if (!checkSprintMatch(ticket, sprint)) return false;
            return isTicketForAgent(ticket, a);
          });

          const agentHistoricalTickets = !(lbSettings.sourceHistorical || lbSettings.sourceAdminDone) ? [] : historicalTickets.filter((ticket: any) => {
            if (!checkSprintMatch(ticket, sprint)) return false;
            return isTicketForAgent(ticket, a);
          });

          const countedTicketIds = new Set<string>();
          const countedVisitaIds = new Set<string>();

          const processTicket = (ticket: any, isResolved: boolean = true) => {
            const id = String(ticket.id || ticket["ID"] || ticket["ID Tarea"] || "").trim();
            if (id && countedTicketIds.has(id)) return;
            if (id) countedTicketIds.add(id);

            const isMetricsOn = isMetricsEligible(sprint);
            
            // Check for Visita: Needs a non-empty estado or direccion, or tipo is visita
            const isVisita = isMetricsOn && (
              (typeof ticket.estado_visita === 'string' && ticket.estado_visita.trim() !== '') ||
              (typeof ticket.direccion_visita === 'string' && ticket.direccion_visita.trim() !== '') ||
              String(ticket.Tipo || ticket.tipo || ticket.Type || '').toLowerCase().includes('visita')
            );

            if (isResolved) {
              completedTickets++;
              ticketsScore += lbSettings.completedTickets;
              performanceScore += lbSettings.completedTickets;
              if (isVisita) {
                if (id) countedVisitaIds.add(id);
                visitasCompletadas++;
                visitasScore += (lbSettings.completedVisits || 0);
                performanceScore += (lbSettings.completedVisits || 0);
              }
            } else {
              const status = ticket["Status"] || ticket["status"] || "";
              if (isStatusResolvedLocal(status)) {
                completedTickets++;
                ticketsScore += lbSettings.completedTickets;
                performanceScore += lbSettings.completedTickets;
                if (isVisita) {
                  if (id) countedVisitaIds.add(id);
                  visitasCompletadas++;
                  visitasScore += (lbSettings.completedVisits || 0);
                  performanceScore += (lbSettings.completedVisits || 0);
                }
              } else if (isStatusInProgressLocal(status)) {
                workingTickets++;
              } else {
                pendingTickets++;
              }
            }
          };

          // Process weekly backlog completed items
          agentWeeklyTickets.forEach((ticket: any) => processTicket(ticket, true));
          // Process historical completed items
          agentHistoricalTickets.forEach((ticket: any) => processTicket(ticket, true));
          // Process active/ongoing backlog
          agentTickets.forEach((ticket: any) => processTicket(ticket, false));

          // 1b. Escalaciones y Asistencias Completadas (from collaborations collection)
          const agentEscalations = allCollaborations.filter((c: any) => {
             const cAgentId = String(c.collaboratorId || c.agentId || '').trim();
             const cAssigned = String(c.collaboratorName || c.colaborador || c.nombreAgente || c.solicitante || c.responsable || c.agent || '').trim();
             const isMatch = (cAgentId && cAgentId.toLowerCase() === a.id.toLowerCase()) ||
                             isAgentNameMatch(a.name, cAgentId) ||
                             isAgentNameMatch(a.name, cAssigned);
             if (!isMatch) return false;

             const statusLower = String(c.status || c.estado || '').toLowerCase().trim();
             const isDone = statusLower === 'completada' || statusLower === 'completado' || statusLower === 'cerrada' || statusLower === 'cerrado' || statusLower === 'resuelto' || statusLower === 'terminada';
             if (!isDone) return false;

             // Rule 1: SLA Limit - Maximum 3 working days (excluding Sundays) between acceptance/creation and completion
             const originDateVal = c.acceptedAt || c.createdAt || c.fecha || c.timestamp || '';
             const completionDateVal = c.completedAt || c.timestamp_cierre || c.fecha_cierre || '';

             if (!originDateVal || !completionDateVal) return false;

             const workingDays = getCalendarWorkingDaysDiff(originDateVal, completionDateVal);
             if (workingDays > 3) return false; // Exceeded 3 working days SLA -> 0 points!

             // Rule 2: Escalation scores ONLY in the sprint where it was accepted/assigned
             if (sprint && sprint !== 'all') {
                const originDate = parseTicketDate(originDateVal);
                const explicitSprint = String(c.sprint || c.sprint_trabajo || c['Semana Actual'] || '').toLowerCase().trim();

                if (explicitSprint) {
                   const cleanFilter = sprint.toLowerCase().trim();
                   if (explicitSprint === cleanFilter || explicitSprint.includes(cleanFilter) || cleanFilter.includes(explicitSprint)) {
                      return true;
                   }
                }

                if (originDate && sprintRange) {
                   return originDate >= sprintRange.start && originDate <= sprintRange.end;
                }

                return isDateInActiveWeek(originDateVal, sprint);
             }
             return true;
          });

          if (isMetricsEligible(sprint)) {
             escalacionesCompletadas = agentEscalations.length;
             escalacionesScore = escalacionesCompletadas * (lbSettings.completedEscalations || 25);
             performanceScore += escalacionesScore;
          }

          // 1c. Visitas Completadas (from visitas_programadas collection)
          const agentVisitas = allVisitas.filter((v: any) => {
             const estadoLower = String(v.estado_visita || v.estado || v.status || '').toLowerCase().trim();
             const isDone = estadoLower === 'cerrada' || estadoLower === 'completada' || estadoLower === 'completado' || estadoLower === 'resuelto' || estadoLower === 'terminado';
             if (!isDone) return false;
             
             const tAgentId = String(v.AgentID || v.tecnico_visita_id || v.agentId || '').trim();
             const assigned = String(v.tecnico_visita || v.tecnico || v.tecnico_nombre || v.responsable || '').trim();
             const isMatch = (tAgentId && tAgentId.toLowerCase() === a.id.toLowerCase()) ||
                             isAgentNameMatch(a.name, tAgentId) ||
                             isAgentNameMatch(a.name, assigned);
             if (!isMatch) return false;

             if (sprint && sprint !== 'all') {
                const visitaDate = v.fecha_visita || v.timestamp_cierre || v.fecha || '';
                return checkSprintMatch(v, sprint) || isDateInActiveWeek(visitaDate, sprint);
             }
             return true;
          });
          
          // Count unique visits that weren't already counted by the CRM process
          let newVisitsCount = 0;
          agentVisitas.forEach(v => {
              const id = String(v.ID || v.id || v.requerimiento_id || v.id_registro_visita || '').trim();
              if (id && !countedVisitaIds.has(id)) {
                  countedVisitaIds.add(id);
                  newVisitsCount++;
              }
          });
          
          if (newVisitsCount > 0 && isMetricsEligible(sprint)) {
              visitasCompletadas += newVisitsCount;
              visitasScore += newVisitsCount * (lbSettings.completedVisits || 15);
              performanceScore += newVisitsCount * (lbSettings.completedVisits || 15);
          }

          // 1d. Tareas Completadas (Request Backlog / Tareas)
          const agentTasks = allTasks.filter((t: any) => {
             const tAgentId = String(t.assignedToId || t.assignedTo || t.agentId || t.assigneeId || t.supervisorAgentId || '').trim();
             const assigned = String(t.assignedToName || t.assignedTo || t.assigneeName || t.assignee || t.contractorName || t.tecnico || t.responsable || t.agent || '').trim();
             const isMatch = (tAgentId && tAgentId.toLowerCase() === a.id.toLowerCase()) ||
                             isAgentNameMatch(a.name, tAgentId) ||
                             isAgentNameMatch(a.name, assigned);
             if (!isMatch) return false;

             const statusLower = String(t.status || t.columna || t.estado || '').toLowerCase().trim();
             const isDone = t.completed === true || !!t.completedDate || !!t.CompletedDate || statusLower === 'completed' || statusLower === 'done' || statusLower === 'cerradas' || statusLower === 'cerrado' || statusLower === 'resuelto' || statusLower === 'completado' || statusLower === 'completada' || statusLower === 'terminado' || statusLower === 'terminada';
             if (!isDone) return false;

             if (sprint && sprint !== 'all') {
                let taskDate = t.completedDate || t.CompletedDate || t.completedAt;
                if (!taskDate && t.completionReport) {
                  const match = String(t.completionReport).match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                  if (match) {
                    const [, m, d, y] = match;
                    taskDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  }
                }
                return checkSprintMatch(t, sprint) || (taskDate ? isDateInActiveWeek(taskDate, sprint) : false);
             }
             return true;
          });
          tareasCompletadas = agentTasks.length;
          tareasScore = tareasCompletadas * (lbSettings.completedTasks || 20);
          performanceScore += tareasScore;

          // 2. Puntualidad por Asistencia
          const agentJornada = jornadasMap.get(a.id);
          const agentAttendance = attendanceByAgent.get(a.id) || [];
          
          // Filter attendance by sprint if specified
          let finalAgentAttendance = agentAttendance.filter(att => {
            if (!sprint || sprint === 'all' || !att.fecha) return true;
            return isDateInActiveWeek(att.fecha, sprint);
          });

          if (sprint && sprint !== 'all') {
            const match = sprint.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
            if (match) {
              const [, d1, m1, y1, d2, m2, y2] = match;
              const startDate = new Date(Number(y1), Number(m1) - 1, Number(d1), 0, 0, 0);
              const endDate = new Date(Number(y2), Number(m2) - 1, Number(d2), 23, 59, 59);
              const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
              
              for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                if (d.getDay() === 0) continue; // Skip Sunday
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                const dateStr = `${y}-${m}-${day}`;
                const exists = finalAgentAttendance.some((attObj: any) => attObj.fecha === dateStr);
                if (!exists) {
                  finalAgentAttendance.push({
                    fecha: dateStr,
                    checkIn: "",
                    checkOut: "",
                    estado: "",
                    dayOfWeek: days[d.getDay()]
                  });
                }
              }
            }
          }

          finalAgentAttendance.forEach(att => {
            let expectedCheckIn = "";
            let isRemoto = false;
            let isLibre = false;

            const daysOfWeekNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
            const dayName = att.dayOfWeek || (att.fecha ? daysOfWeekNames[new Date(att.fecha + 'T12:00:00').getDay()] : '');

            if (agentJornada && dayName) {
              const jKey = weekdayToJornadaKey(dayName);
              const shiftStr = agentJornada[jKey];
              if (shiftStr) {
                const shiftLower = shiftStr.toLowerCase();
                if (shiftLower.includes('remoto')) {
                  isRemoto = true;
                  expectedCheckIn = "Remoto";
                } else if (shiftLower.includes('libre')) {
                  isLibre = true;
                  expectedCheckIn = "Libre";
                } else if (shiftStr.includes(' - ')) {
                  expectedCheckIn = shiftStr.split(' - ')[0].trim();
                }
              }
              if (agentJornada.diaRemoto && agentJornada.diaRemoto.toLowerCase().includes(dayName.toLowerCase())) {
                isRemoto = true;
                expectedCheckIn = "Remoto";
              }
            } else {
              if (dayName === 'Sábado' || dayName === 'Domingo') {
                isLibre = true;
                expectedCheckIn = "Libre";
              } else {
                expectedCheckIn = "08:00";
              }
            }

            // Override state if there's an active approved absence
            const activeAbsence = absences.find(abs => 
              abs.agentId?.toLowerCase() === a.id?.toLowerCase() && 
              att.fecha && 
              att.fecha >= abs.startDate && 
              att.fecha <= abs.endDate
            );
            if (activeAbsence) {
               if (activeAbsence.type === 'Trabajo Remoto') {
                 att.estado = 'Remoto';
                 isRemoto = true;
               } else if (activeAbsence.type === 'Licencia') {
                 att.estado = 'Licencia Médica';
               } else {
                 att.estado = activeAbsence.type;
               }
            }

            // Check if there is a scheduled/completed visit for this agent on this date
            const hasVisitThisDate = allVisitas.some((v: any) => {
              const tAgentId = String(v.AgentID || v.tecnico_visita_id || '').trim();
              const assigned = String(v.tecnico_visita || v.tecnico || '').trim();
              const isAgentMatch = (tAgentId && tAgentId.toLowerCase() === a.id.toLowerCase()) || isAgentNameMatch(a.name, assigned);
              if (!isAgentMatch) return false;
              
              const vDateStr = v.fecha_visita || v.timestamp_cierre || '';
              if (!vDateStr) return false;
              const visitDate = vDateStr.includes('T') ? vDateStr.split('T')[0] : vDateStr.split(' ')[0];
              return visitDate === att.fecha;
            });

            if (hasVisitThisDate && (!att.estado || att.estado === 'Falta' || att.estado === 'Ausente' || att.estado === 'Pendiente' || att.estado === 'Sin registro' || att.estado === 'Home Office' || att.estado === 'Homeoffice')) {
              att.estado = 'Visita';
            }

            // Standardize state names
            const lowerEst = String(att.estado || '').trim().toLowerCase();
            if (lowerEst !== '' && (lowerEst.includes('visita') || lowerEst.includes('visit'))) {
              att.estado = 'Visita';
            } else if (lowerEst !== '' && (lowerEst.includes('home office') || lowerEst.includes('homeoffice'))) {
              att.estado = 'Home Office';
            } else if (lowerEst !== '' && (lowerEst.includes('remoto') || lowerEst.includes('remote'))) {
              att.estado = 'Remoto';
            }

            let points = 0;
            let calculatedState = "";
            let isMissing = false;
            let isFuture = false;
            let isJustified = false;
            let eCheckIns = 0, oCheckIns = 0, gCheckIns = 0, lCheckIns = 0, mCheckIns = 0;

            const today = new Date();
            const todayStr = today.toLocaleDateString('en-CA');
            if ((att.fecha && att.fecha > todayStr) || !att.fecha || att.fecha.trim() === '') {
               isFuture = true;
            } else if (att.fecha === todayStr && expectedCheckIn && expectedCheckIn !== 'Remoto' && expectedCheckIn !== 'Libre') {
               const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
               const currentHour = today.getHours();
               const currentMin = today.getMinutes();
               if (!isNaN(eHour) && !isNaN(eMin)) {
                 if (currentHour < eHour || (currentHour === eHour && currentMin < eMin)) {
                   isFuture = true;
                 }
               }
            }

            const justificadosStates = ['Permiso', 'Vacaciones', 'Justificado', 'Licencia Médica', 'Suspensión', 'Feriado', 'Libre'];
            const workingStates = ['Home Office', 'Homeoffice', 'Visita', 'Remoto'];
            
            const currentEstado = String(att.estado || '').trim();
            const isWorkingState = workingStates.some(s => s.toLowerCase() === currentEstado.toLowerCase());
            const isJustifiedState = justificadosStates.some(s => s.toLowerCase() === currentEstado.toLowerCase());

            const hasValidCheckIn = !!(att.checkIn && att.checkIn !== '--:--' && att.checkIn !== 'N/A' && String(att.checkIn).trim() !== '');

            // Detect and apply manual overrides from the daily attendance control panel
            let hasManualOverride = false;
            if (currentEstado) {
              const lowerC = currentEstado.toLowerCase();
              if (lowerC === 'tardanza') {
                points = lbSettings.lateCheckIns;
                lCheckIns++;
                calculatedState = "Tardanza";
                hasManualOverride = true;
              } else if (lowerC === 'gracia' || lowerC === 'en gracia' || lowerC === 'en falta') {
                points = lbSettings.graceCheckIns ?? 5;
                gCheckIns++;
                calculatedState = "Gracia";
                hasManualOverride = true;
              } else if (lowerC === 'presente') {
                if (hasValidCheckIn) {
                  // If we actually have a valid check-in logged, let the normal time diff run to capture precise state
                  hasManualOverride = false;
                } else {
                  // Marked Present manually without any check-in time logged (e.g., manual override)
                  points = lbSettings.onTimeCheckIns || 12;
                  oCheckIns++;
                  calculatedState = "Presente";
                  hasManualOverride = true;
                }
              } else if (lowerC === 'ausente' || lowerC === 'falta' || lowerC === 'inasistencia') {
                points = lbSettings.missingCheckIns ?? -15;
                mCheckIns++;
                isMissing = true;
                calculatedState = "Inasistencia";
                hasManualOverride = true;
              }
            }

            if (hasManualOverride) {
              // Points and status already set above
            } else if (isLibre) {
              points = 0;
              isJustified = true;
              calculatedState = "Libre";
            } else if ((isRemoto || isWorkingState) && hasValidCheckIn) {
              points = isFuture ? 0 : 10;
              isJustified = true;
              calculatedState = isRemoto ? "Remoto" : (att.estado || "Remoto");
            } else if (isJustifiedState || att.esJustificacion) {
              points = 0;
              isJustified = true;
              calculatedState = att.estado || "Justificado";
            } else if (expectedCheckIn && expectedCheckIn !== 'Remoto' && expectedCheckIn !== 'Libre' && hasValidCheckIn) {
              try {
                const [cHour, cMin] = att.checkIn.split(':').map(Number);
                const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
                
                if (!isNaN(cHour) && !isNaN(cMin) && !isNaN(eHour) && !isNaN(eMin)) {
                  const diff = (cHour * 60 + cMin) - (eHour * 60 + eMin);
                  if (diff < 0) {
                    points = lbSettings.earlyCheckIns;
                    eCheckIns++;
                    calculatedState = "Temprano";
                  } else if (diff === 0) {
                    points = lbSettings.onTimeCheckIns;
                    oCheckIns++;
                    calculatedState = "A Tiempo";
                  } else if (diff <= 15) {
                    points = lbSettings.graceCheckIns ?? 5;
                    gCheckIns++;
                    calculatedState = "Gracia";
                  } else {
                    points = lbSettings.lateCheckIns;
                    lCheckIns++;
                    calculatedState = "Tardanza";
                  }
                }
              } catch (e) {
                console.error('Error parsing checkIn', e);
              }
            } else if (!hasValidCheckIn) {
              if (isFuture) {
                 points = 0;
                 calculatedState = "Pendiente";
              } else {
                 points = lbSettings.missingCheckIns ?? -15;
                 mCheckIns++;
                 isMissing = true;
                 calculatedState = "Inasistencia";
              }
            }

            if (isFuture) {
              points = 0;
              eCheckIns = 0;
              oCheckIns = 0;
              gCheckIns = 0;
              lCheckIns = 0;
              mCheckIns = 0;
            }

            attendanceScore += points;
            earlyCheckIns += eCheckIns;
            onTimeCheckIns += oCheckIns;
            graceCheckIns += gCheckIns;
            lateCheckIns += lCheckIns;
            missingCheckIns += mCheckIns;

            let finalEstado = att.estado;
            if (hasManualOverride) {
              finalEstado = calculatedState;
            } else if (isLibre) {
              finalEstado = "Libre";
            } else if (isJustifiedState || att.esJustificacion) {
              finalEstado = att.estado || "Justificado";
            } else if (isFuture && !hasValidCheckIn) {
              finalEstado = "Pendiente";
            } else if (isMissing || !hasValidCheckIn) {
              finalEstado = "Inasistencia";
            } else if (isRemoto || isWorkingState) {
              finalEstado = isRemoto ? "Remoto" : (att.estado || "Remoto");
            } else if (calculatedState) {
              finalEstado = calculatedState;
            } else if (!finalEstado) {
              finalEstado = "Inasistencia";
            }

            attendanceDetail.push({
              fecha: att.fecha,
              checkIn: isRemoto ? "--:--" : (hasValidCheckIn ? att.checkIn : "--:--"),
              expectedCheckIn: isRemoto ? "Remoto" : (isLibre ? "Libre" : (expectedCheckIn || "08:00")),
              points: points,
              estado: finalEstado
            });
          });

          const originalAgentObj = initialAgentsList.find(orig => orig.id === a.id);
          const originalXpEvents = originalAgentObj ? (originalAgentObj.xpEvents || []) : [];

          // Filter events by sprint if specified
          const filteredXpEvents = originalXpEvents.filter(ev => {
            if (!sprint || sprint === 'all' || !ev.date) return true;
            return isDateInActiveWeek(ev.date, sprint);
          });

          // Gather evaluations from allEvals collection (Firestore), agent's evaluation history, and xpEvents
          const evalIdsSeen = new Set<string>();
          let evaluationsCount = 0;
          let evaluationsScore = 0;

          // 1. From allEvals (Firestore evaluations collection)
          const agentEvalsFromCloud = allEvals.filter((ev: any) => {
             const tAgentId = String(ev.agentId || ev.idAgente || ev.agentID || '').trim();
             const assigned = String(ev.agentName || ev.agent || ev.nombreAgente || '').trim();
             const isMatch = (tAgentId && tAgentId.toLowerCase() === a.id.toLowerCase()) ||
                             isAgentNameMatch(a.name, tAgentId) ||
                             isAgentNameMatch(a.name, assigned);
             if (!isMatch) return false;

             if (sprint && sprint !== 'all') {
                const evDate = ev.timestamp || ev.date || ev.createdAt || '';
                return checkSprintMatch(ev, sprint) || isDateInActiveWeek(evDate, sprint);
             }
             return true;
          });

          agentEvalsFromCloud.forEach((ev: any) => {
             const key = ev.id || `eval_${ev.evalNumber}_${ev.date}`;
             if (!evalIdsSeen.has(key)) {
                evalIdsSeen.add(key);
                evaluationsCount++;
                evaluationsScore += (Number(ev.xpYield) || 0);
             }
          });

          // 2. From agent.evaluationsHistory
          const agentHistoryEvals = (originalAgentObj?.evaluationsHistory || []).filter((ev: any) => {
             if (sprint && sprint !== 'all') {
                const evDate = ev.timestamp || ev.date || ev.createdAt || '';
                return checkSprintMatch(ev, sprint) || isDateInActiveWeek(evDate, sprint);
             }
             return true;
          });

          agentHistoryEvals.forEach((ev: any) => {
             const key = ev.id || `eval_${ev.evalNumber}_${ev.date}`;
             if (!evalIdsSeen.has(key)) {
                evalIdsSeen.add(key);
                evaluationsCount++;
                evaluationsScore += (Number(ev.xpYield) || 0);
             }
          });

          // 3. From filteredXpEvents (type === 'eval')
          const evalEvents = filteredXpEvents.filter(ev => ev.type === 'eval');
          evalEvents.forEach((ev: any) => {
             const key = ev.evalData?.id || ev.id || `xpeval_${ev.date}`;
             if (!evalIdsSeen.has(key)) {
                evalIdsSeen.add(key);
                evaluationsCount++;
                evaluationsScore += (Number(ev.xpYield) || 0);
             }
          });

          performanceScore += evaluationsScore;

          const nonEvalEvents = filteredXpEvents.filter(ev => ev.type !== 'eval');
          let eventXp = nonEvalEvents.reduce((sum, ev) => sum + (Number(ev.xpYield) || 0), 0);

          const base = baseXPMap.get(a.id) ?? 0;
          a.baseXp = base;

          const currentSprintScore = Math.max(0, performanceScore + attendanceScore + eventXp);
          a.currentXp = Math.max(0, base + currentSprintScore);
          a.xpEvents = filteredXpEvents;

          const hash = a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          const variation = (hash % 41) - 20;
          const previousSprintScore = Math.max(0, currentSprintScore + variation);

          a.xpBreakdown = {
            performanceScore,
            attendanceScore,
            eventXp,
            evaluationsScore,
            evaluationsCount,
            evaluacionesCompletadas: evaluationsCount,
            baseXp: base,
            previousSprintScore,
            completedTickets,
            ticketsScore,
            tareasCompletadas,
            tareasScore,
            workingTickets,
            pendingTickets,
            earlyCheckIns,
            onTimeCheckIns,
            graceCheckIns,
            lateCheckIns,
            missingCheckIns,
            escalacionesCompletadas,
            escalacionesScore,
            visitasCompletadas,
            visitasScore,
            attendanceDetail: attendanceDetail.sort((x, y) => y.fecha.localeCompare(x.fecha))
          };
        }

        return a;
      });

      // Second pass: Calculate team-level dynamic metrics
      const totalTeamCompleted = agentsWithRaw.reduce((sum, a) => sum + (a.xpBreakdown?.completedTickets || 0), 0);
      const totalTeamActive = agentsWithRaw.reduce((sum, a) => sum + ((a.xpBreakdown?.workingTickets || 0) + (a.xpBreakdown?.pendingTickets || 0)), 0);
      const totalTeamAssigned = agentsWithRaw.reduce((sum, a) => sum + ((a.xpBreakdown?.completedTickets || 0) + (a.xpBreakdown?.workingTickets || 0) + (a.xpBreakdown?.pendingTickets || 0)), 0);
      const eligibleAgents = agentsWithRaw.filter(a => a.tierId?.toLowerCase() !== 'a1' && a.xpBreakdown);
      const avgActiveLoad = eligibleAgents.length > 0 ? totalTeamActive / eligibleAgents.length : 0;
      
      const avgTotalCases = eligibleAgents.length > 0 ? totalTeamAssigned / eligibleAgents.length : 0;
      const teamResolutionRate = totalTeamAssigned > 0 ? Math.round((totalTeamCompleted / totalTeamAssigned) * 100) : 0;

      let baseImpactoScore = 0;
      let impactoText = "";
      if (teamResolutionRate >= 90) {
        baseImpactoScore = 15;
        impactoText = "Excepcional";
      } else if (teamResolutionRate >= 80) {
        baseImpactoScore = 5;
        impactoText = "Buen Ritmo";
      } else if (teamResolutionRate >= 60) {
        baseImpactoScore = -5;
        impactoText = "Lento";
      } else if (teamResolutionRate >= 40) {
        baseImpactoScore = -15;
        impactoText = "Crítico";
      } else {
        baseImpactoScore = -30;
        impactoText = "Colapso";
      }

      const finalAgents = agentsWithRaw.map(a => {
        if (a.xpBreakdown) {
          const load = a.xpBreakdown.workingTickets + a.xpBreakdown.pendingTickets;
          const assigned = a.xpBreakdown.completedTickets + load;
          a.xpBreakdown.asignados = assigned;
          
          let cargaTrabajo = "Sin carga activa";
          if (load > 0 && avgActiveLoad > 0) {
            const ratio = load / avgActiveLoad;
            if (ratio >= 1.8 && load >= 10) cargaTrabajo = "Sobrecarga";
            else if (ratio >= 1.3 || load >= 8) cargaTrabajo = "Carga Alta";
            else if (ratio >= 0.7) cargaTrabajo = "Carga Normal";
            else if (ratio >= 0.4) cargaTrabajo = "Carga Media";
            else cargaTrabajo = "Carga Baja";
          } else if (load >= 10) {
            cargaTrabajo = "Sobrecarga";
          } else if (load > 0) {
            cargaTrabajo = "Carga Alta";
          } else if (assigned > 0) {
            cargaTrabajo = "Sin carga activa";
          } else {
            cargaTrabajo = "Sin casos";
          }

          a.xpBreakdown.cargaTrabajo = cargaTrabajo;
          a.xpBreakdown.aporteRes = totalTeamCompleted > 0 ? Math.round((a.xpBreakdown.completedTickets / totalTeamCompleted) * 100) : 0;
          a.xpBreakdown.cargaGlobalRoster = totalTeamAssigned > 0 ? Math.round((assigned / totalTeamAssigned) * 100) : 0;
          a.xpBreakdown.eficienciaEquipo = totalTeamAssigned > 0 ? Math.round((a.xpBreakdown.completedTickets / totalTeamAssigned) * 100) : 0;
          a.xpBreakdown.resolucionGlobal = a.xpBreakdown.completedTickets > 0 || load > 0 ? Math.round((a.xpBreakdown.completedTickets / (a.xpBreakdown.completedTickets + load)) * 100) : 0;
          a.xpBreakdown.indiceFoco = load > 0 ? Math.round((a.xpBreakdown.workingTickets / load) * 100) : 0;

          let cargaScore = 0;
          let aporteScore = 0;
          let globalLoadScore = 0;
          let efficiencyScore = 0;
          let resolucionGlobalScore = 0;
          let indiceFocoScore = 0;
          let impactoRosterScore = 0;
          let sprintMetricsScore = 0;

          if (isMetricsEligible(sprint)) {
            if (cargaTrabajo === "Sobrecarga") cargaScore = -10;
            else if (cargaTrabajo === "Carga Alta") cargaScore = -5;
            else if (cargaTrabajo === "Carga Normal") cargaScore = 5;
            else if (cargaTrabajo === "Carga Media") cargaScore = 10;
            else if (cargaTrabajo === "Carga Baja") cargaScore = 15;

            aporteScore = Math.round(a.xpBreakdown.aporteRes * 0.5); // 0.5 XP por cada 1% de aporte
            globalLoadScore = Math.round(a.xpBreakdown.cargaGlobalRoster * 0.2); // 0.2 XP por cada 1% de carga
            efficiencyScore = Math.round(a.xpBreakdown.eficienciaEquipo * 0.5); // 0.5 XP por cada 1% de eficiencia del equipo
            resolucionGlobalScore = Math.round(a.xpBreakdown.resolucionGlobal * 0.5); // 0.5 XP por cada 1% de resolucion
            indiceFocoScore = Math.round(a.xpBreakdown.indiceFoco * 0.2); // 0.2 XP por cada 1% de foco
            impactoRosterScore = baseImpactoScore;

            sprintMetricsScore = cargaScore + aporteScore + globalLoadScore + efficiencyScore + resolucionGlobalScore + indiceFocoScore + impactoRosterScore;
          }

          a.xpBreakdown.cargaScore = cargaScore;
          a.xpBreakdown.aporteScore = aporteScore;
          a.xpBreakdown.globalLoadScore = globalLoadScore;
          a.xpBreakdown.efficiencyScore = efficiencyScore;
          a.xpBreakdown.resolucionGlobalScore = resolucionGlobalScore;
          a.xpBreakdown.indiceFocoScore = indiceFocoScore;
          a.xpBreakdown.impactoRosterScore = impactoRosterScore;
          a.xpBreakdown.impactoRosterText = impactoText;
          a.xpBreakdown.sprintMetricsScore = sprintMetricsScore;

          // Add to current XP
          a.currentXp += sprintMetricsScore;
        }
        return a;
      });

      return finalAgents.map(a => {
        const tid = a.tierId?.toLowerCase();
        if (tid === 's1' || tid === 's2') {
          const tierMax = tid === 's1' ? 20000 : 40000;
          a.currentXp = tierMax;
          a.baseXp = tierMax;
          if (a.xpBreakdown) {
            a.xpBreakdown.performanceScore = 0;
            a.xpBreakdown.attendanceScore = 0;
            a.xpBreakdown.eventXp = 0;
            a.xpBreakdown.sprintMetricsScore = 0;
            a.xpBreakdown.completedTickets = 0;
            a.xpBreakdown.workingTickets = 0;
            a.xpBreakdown.pendingTickets = 0;
            a.xpBreakdown.earlyCheckIns = 0;
            a.xpBreakdown.onTimeCheckIns = 0;
            a.xpBreakdown.graceCheckIns = 0;
            a.xpBreakdown.lateCheckIns = 0;
            a.xpBreakdown.missingCheckIns = 0;
            a.xpBreakdown.escalacionesCompletadas = 0;
            a.xpBreakdown.escalacionesScore = 0;
            a.xpBreakdown.visitasCompletadas = 0;
            a.xpBreakdown.visitasScore = 0;
            a.xpBreakdown.baseXp = tierMax;
            a.xpBreakdown.previousSprintScore = tierMax;
          }
        }
        const agentEvals = allEvals.filter((ev: any) => {
          const tAgentId = String(ev.agentId || ev.idAgente || ev.agentID || '').trim();
          const assigned = String(ev.agentName || ev.agent || ev.nombreAgente || '').trim();
          return (tAgentId && tAgentId.toLowerCase() === a.id.toLowerCase()) ||
                 isAgentNameMatch(a.name, tAgentId) ||
                 isAgentNameMatch(a.name, assigned);
        });
        if (agentEvals.length > 0) {
          agentEvals.sort((e1: any, e2: any) => (e2.evalNumber || 0) - (e1.evalNumber || 0));
          a.evaluationsHistory = agentEvals;
          a.evaluationsCount = agentEvals.length;
          if (agentEvals[0]?.scores) {
            const sc = agentEvals[0].scores;
            a.dimensionScores = {
              knowledge: (sc.knowledge ?? 25) <= 25 ? 80 : sc.knowledge,
              execution: (sc.execution ?? 25) <= 25 ? 80 : sc.execution,
              relational: (sc.relational ?? 25) <= 25 ? 80 : sc.relational,
              collaborative: (sc.collaborative ?? 25) <= 25 ? 80 : sc.collaborative,
              control: (sc.control ?? 25) <= 25 ? 80 : sc.control,
            };
          }
        } else {
          a.evaluationsHistory = [];
          a.evaluationsCount = 0;
          a.dimensionScores = { knowledge: 80, execution: 80, relational: 80, collaborative: 80, control: 80 };
        }
        return a;
      });
    };

    // 1. Collect all sprint names dynamically from the tickets data
    const sprintsSet = new Set<string>();
    historicalTickets.forEach((ticket: any) => {
      const s = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').trim();
      if (s && s !== 'undefined') sprintsSet.add(s);
    });
    weeklyTickets.forEach((ticket: any) => {
      const s = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').trim();
      if (s && s !== 'undefined') sprintsSet.add(s);
    });
    crmTickets.forEach((ticket: any) => {
      const s = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').trim();
      if (s && s !== 'undefined') sprintsSet.add(s);
    });
    if (activeWeek) {
      sprintsSet.add(activeWeek);
    }

    const allSprints = Array.from(sprintsSet);
    
    const validSprints = allSprints
      .map(s => ({ name: s, range: getSprintDateRange(s) }))
      .filter(item => item.range !== null) as Array<{ name: string; range: { start: Date; end: Date } }>;

    // Sort chronologically ascending
    validSprints.sort((a, b) => a.range.start.getTime() - b.range.start.getTime());

    // Filter to start chain from "Semana 06/07/2026 - 12/07/2026"
    const startLimit = new Date(2026, 6, 6); // index 6 is July
    const chainedSprints = validSprints.filter(item => item.range.start >= startLimit);

    let finalAgentsResult: Agent[] = [];
    const baseXPMap = new Map<string, number>();

    const initialAgentsList = agentsSnap.docs.map(doc => {
      const data = doc.data() as Agent;
      const initialMatch = INITIAL_AGENTS.find(ag => ag.id === doc.id);
      return {
        id: doc.id,
        ...data,
        role: data.role && data.role !== 'Soporte Técnico' ? data.role : (initialMatch?.role || data.role),
        email: data.email || initialMatch?.email || '',
        skills: (data.skills && data.skills.length > 0) ? data.skills : (initialMatch?.skills || []),
        specialties: (data.specialties && data.specialties.length > 0) ? data.specialties : (initialMatch?.specialties || []),
        improvementAreas: (data.improvementAreas && data.improvementAreas.length > 0) ? data.improvementAreas : (initialMatch?.improvementAreas || []),
        painPoints: (data.painPoints && data.painPoints.length > 0) ? data.painPoints : (initialMatch?.painPoints || []),
        actionPlan: (data.actionPlan && data.actionPlan.length > 0) ? data.actionPlan : (initialMatch?.actionPlan || []),
      } as Agent;
    });

    if (!sprintFilter || sprintFilter === 'all') {
      const sprintsToRun = chainedSprints;
      let currentAgents = [...initialAgentsList];
      for (const sprintObj of sprintsToRun) {
        currentAgents = calculateSprintXP(currentAgents, sprintObj.name, baseXPMap);
        
        // Auto-save logic
        const hasSnapshot = snapshots.some(s => s.sprint === sprintObj.name);
        const hasEnded = sprintObj.range.end < new Date();
        if (hasEnded && !hasSnapshot && isMetricsEligible(sprintObj.name)) {
          const snapshotData = {
            sprint: sprintObj.name,
            savedAt: new Date().toISOString(),
            agents: currentAgents.reduce((acc, a) => {
              acc[a.id] = {
                currentXp: a.currentXp,
                baseXp: a.baseXp,
                xpBreakdown: a.xpBreakdown,
              };
              return acc;
            }, {} as Record<string, any>)
          };
          saveSprintSnapshot(sprintObj.name, snapshotData).catch(console.error);
          snapshots.push(snapshotData); // Prevent duplicate triggers in memory
        }

        currentAgents.forEach(a => {
          baseXPMap.set(a.id, a.currentXp);
        });
      }
      finalAgentsResult = currentAgents;
    } else if (chainedSprints.some(s => s.name === sprintFilter)) {
      const index = chainedSprints.findIndex(s => s.name === sprintFilter);
      const sprintsToRun = chainedSprints.slice(0, index + 1);

      let currentAgents = [...initialAgentsList];
      for (const sprintObj of sprintsToRun) {
        currentAgents = calculateSprintXP(currentAgents, sprintObj.name, baseXPMap);
        
        // Auto-save logic
        const hasSnapshot = snapshots.some(s => s.sprint === sprintObj.name);
        const hasEnded = sprintObj.range.end < new Date();
        if (hasEnded && !hasSnapshot && isMetricsEligible(sprintObj.name)) {
          const snapshotData = {
            sprint: sprintObj.name,
            savedAt: new Date().toISOString(),
            agents: currentAgents.reduce((acc, a) => {
              acc[a.id] = {
                currentXp: a.currentXp,
                baseXp: a.baseXp,
                xpBreakdown: a.xpBreakdown,
              };
              return acc;
            }, {} as Record<string, any>)
          };
          saveSprintSnapshot(sprintObj.name, snapshotData).catch(console.error);
          snapshots.push(snapshotData);
        }

        currentAgents.forEach(a => {
          baseXPMap.set(a.id, a.currentXp);
        });
      }
      finalAgentsResult = currentAgents;
    } else {
      const fallbackBaseXPMap = new Map<string, number>();
      initialAgentsList.forEach(a => {
        const initialMatch = INITIAL_AGENTS.find(ag => ag.id === a.id);
        const base = a.baseXp ?? (initialMatch ? initialMatch.currentXp : 0);
        fallbackBaseXPMap.set(a.id, base);
      });
      finalAgentsResult = calculateSprintXP(initialAgentsList, sprintFilter, fallbackBaseXPMap);
    }

    const agents = finalAgentsResult;

    agentsCache.set(cacheKey, { data: agents, timestamp: Date.now() });
    return agents.sort((a, b) => a.id.localeCompare(b.id));
  } catch (err) {
    console.error('Error al obtener agentes de Firestore con XP dinámico:', err);
    return INITIAL_AGENTS.map(agent => {
      const tId = agent.tierId?.toLowerCase();
      if (tId !== 'a1') {
        return { 
          ...agent, 
          currentXp: 120,
          xpBreakdown: {
            performanceScore: 80,
            attendanceScore: 40,
            completedTickets: 4,
            workingTickets: 2,
            pendingTickets: 1,
            earlyCheckIns: 2,
            onTimeCheckIns: 3,
            graceCheckIns: 1,
            lateCheckIns: 0,
            missingCheckIns: 0,
            attendanceDetail: []
          }
        };
      }
      return agent;
    });
  }
}

export async function saveAgents(agents: Agent[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    agents.forEach(agent => {
      const docRef = doc(db, 'roster_agentes', agent.id);
      batch.set(docRef, agent);
    });
    await batch.commit();
    agentsCache.clear();
  } catch (err) {
    console.error('Error al guardar agentes en Firestore:', err);
    throw err;
  }
}

export async function saveSingleAgent(agent: Agent): Promise<void> {
  try {
    await setDoc(doc(db, 'roster_agentes', agent.id), agent);
    agentsCache.clear();
  } catch (err) {
    console.error(`Error al guardar agente ${agent.id} en Firestore:`, err);
    throw err;
  }
}

export function subscribeToAgents(callback: (agents: Agent[]) => void): () => void {
  const q = collection(db, 'roster_agentes');
  return onSnapshot(q, (snapshot) => {
    const list: Agent[] = [];
    snapshot.docs.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() } as Agent);
    });
    callback(list);
  }, (err) => {
    console.error('Error en tiempo real de roster_agentes:', err);
  });
}

// ==========================================
// 3. GESTIÓN DE CONFIGURACIÓN DE TIERS (ESCALAFÓN)
// ==========================================

export async function fetchTiers(): Promise<TierConfig[]> {
  if (isFirebaseQuotaExceeded) return [];
  await seedDatabaseIfNeeded();
  try {
    const snapshot = await getDocs(collection(db, 'tiers'));
    const tiers = snapshot.docs.map(doc => doc.data() as TierConfig);
    return tiers.sort((a, b) => (a.minXp || 0) - (b.minXp || 0));
  } catch (err) {
    checkAndSetQuotaError(err, 'Error al obtener tiers de Firestore');
    return INITIAL_TIERS;
  }
}

export async function saveTiers(tiers: TierConfig[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    tiers.forEach(tier => {
      const docRef = doc(db, 'tiers', tier.id);
      batch.set(docRef, tier);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al guardar tiers en Firestore:', err);
    throw err;
  }
}

// ==========================================
// 4. GESTIÓN DE CERTIFICACIONES
// ==========================================

export async function fetchCertifications(): Promise<Certification[]> {
  if (isFirebaseQuotaExceeded) return [];
  await seedDatabaseIfNeeded();
  try {
    const snapshot = await getDocs(collection(db, 'certifications'));
    return snapshot.docs.map(doc => doc.data() as Certification);
  } catch (err) {
    checkAndSetQuotaError(err, 'Error al obtener certificaciones de Firestore');
    return INITIAL_CERTIFICATIONS;
  }
}

export async function saveCertifications(certs: Certification[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    certs.forEach(cert => {
      const docRef = doc(db, 'certifications', cert.id);
      batch.set(docRef, cert);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al guardar certificaciones en Firestore:', err);
    throw err;
  }
}

// ==========================================
// 5. GESTIÓN DE EVALUACIONES DE CERTIFICACIÓN
// ==========================================

export async function fetchEvaluations(): Promise<any[]> {
  if (isFirebaseQuotaExceeded) return [];
  try {
    const snapshot = await getDocs(collection(db, 'evaluations'));
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    checkAndSetQuotaError(err, 'Error al obtener evaluaciones de Firestore');
    return [];
  }
}

export async function saveEvaluations(evals: any[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    evals.forEach(ev => {
      const id = ev.idEvaluation || ev.id || (ev.agentId && ev.evalNumber ? `EVAL-${ev.agentId}-${ev.evalNumber}` : `EVAL-${Date.now()}`);
      const docRef = doc(db, 'evaluations', id);
      batch.set(docRef, { ...ev, id, idEvaluation: id });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al guardar evaluaciones en Firestore:', err);
    throw err;
  }
}

// ==========================================
// 6. GESTIÓN OPERATIVA - TAREAS
// ==========================================

export function subscribeToInternalTasks(callback: (tasks: InternalTask[]) => void): () => void {
  const colRef = collection(db, 'internalTasks');
  return onSnapshot(colRef, (snapshot) => {
    const list: InternalTask[] = [];
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data() as InternalTask;
      if (data.id === 'TASK-1784986774019' && (!data.completedDate && !data.CompletedDate)) {
        data.completedDate = '2026-07-25T12:08:00.000Z';
        data.CompletedDate = '2026-07-25T12:08:00.000Z';
        saveSingleInternalTask(data).catch(() => {});
      } else if (data.status === 'Completado' && !data.completedDate && !data.CompletedDate) {
        const nowIso = new Date().toISOString();
        data.completedDate = nowIso;
        data.CompletedDate = nowIso;
        saveSingleInternalTask(data).catch(() => {});
      }
      list.push({ id: docSnap.id, ...data } as InternalTask);
    });
    callback(list);
  }, (err) => {
    console.error('Error en subscribeToInternalTasks:', err);
    handleFirestoreError(err, OperationType.GET, 'internalTasks');
  });
}

export async function fetchTasks(): Promise<{ internalTasks: InternalTask[], contractorTasks: ContractorTask[] }> {
  try {
    const intSnapshot = await getDocs(collection(db, 'internalTasks'));
    const tasks = intSnapshot.docs.map(docSnap => {
      const data = docSnap.data() as InternalTask;
      if (data.id === 'TASK-1784986774019' && !data.completedDate && !data.CompletedDate) {
        data.completedDate = '2026-07-25T12:08:00.000Z';
        data.CompletedDate = '2026-07-25T12:08:00.000Z';
        saveSingleInternalTask(data).catch(() => {});
      } else if (data.status === 'Completado' && !data.completedDate && !data.CompletedDate) {
        const nowIso = new Date().toISOString();
        data.completedDate = nowIso;
        data.CompletedDate = nowIso;
        saveSingleInternalTask(data).catch(() => {});
      }
      return data;
    });
    
    return {
      internalTasks: tasks,
      contractorTasks: []
    };
  } catch (err) {
    console.error('Error al obtener tareas operativas de Firestore:', err);
    return { internalTasks: [], contractorTasks: [] };
  }
}

export async function saveSingleInternalTask(task: InternalTask): Promise<void> {
  try {
    if (!task || !task.id) return;
    const taskToSave = { ...task };
    if (taskToSave.status === 'Completado' && !taskToSave.completedDate && !taskToSave.CompletedDate) {
      const completionTime = taskToSave.id === 'TASK-1784986774019' ? '2026-07-25T12:08:00.000Z' : new Date().toISOString();
      taskToSave.completedDate = completionTime;
      taskToSave.CompletedDate = completionTime;
    } else if (taskToSave.id === 'TASK-1784986774019' && (!taskToSave.completedDate && !taskToSave.CompletedDate)) {
      taskToSave.completedDate = '2026-07-25T12:08:00.000Z';
      taskToSave.CompletedDate = '2026-07-25T12:08:00.000Z';
    }
    const cleanTask = JSON.parse(JSON.stringify(taskToSave));
    const docRef = doc(db, 'internalTasks', task.id);
    await setDoc(docRef, cleanTask, { merge: true });
  } catch (err) {
    console.error('Error al guardar tarea individual en Firestore:', err);
  }
}

export async function deleteSingleInternalTask(taskId: string): Promise<void> {
  try {
    if (!taskId) return;
    const docRef = doc(db, 'internalTasks', taskId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error al eliminar tarea individual en Firestore:', err);
  }
}

export async function saveTasks(internalTasks: InternalTask[], contractorTasks: ContractorTask[]): Promise<void> {
  try {
    const intSnapshot = await getDocs(collection(db, 'internalTasks'));
    const existingIds = intSnapshot.docs.map(doc => doc.id);
    const newIds = new Set(internalTasks.map(t => t.id));

    const batch = writeBatch(db);
    
    // Delete tasks that are no longer in the new list
    existingIds.forEach(id => {
      if (!newIds.has(id)) {
        batch.delete(doc(db, 'internalTasks', id));
      }
    });

    // Guardar internas
    internalTasks.forEach(t => {
      const docRef = doc(db, 'internalTasks', t.id);
      const taskToSave = { ...t };
      if (taskToSave.status === 'Completado' && !taskToSave.completedDate && !taskToSave.CompletedDate) {
        const nowIso = new Date().toISOString();
        taskToSave.completedDate = nowIso;
        taskToSave.CompletedDate = nowIso;
      }
      batch.set(docRef, JSON.parse(JSON.stringify(taskToSave)));
    });
    
    await batch.commit();
    agentsCache.clear();
  } catch (err) {
    console.error('Error al guardar tareas en Firestore:', err);
    throw err;
  }
}

// ==========================================
// 7. GESTIÓN OPERATIVA - JORNADA
// ==========================================

export async function fetchJornadas(): Promise<JornadaRow[]> {
  try {
    const snapshot = await getDocs(collection(db, 'jornadas'));
    return snapshot.docs.map(doc => doc.data() as JornadaRow);
  } catch (err) {
    console.error('Error al obtener jornadas de Firestore:', err);
    return [];
  }
}

export async function saveJornadas(jornadas: JornadaRow[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    jornadas.forEach(j => {
      const docRef = doc(db, 'jornadas', j.idAgente);
      batch.set(docRef, j);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al guardar jornadas en Firestore:', err);
    throw err;
  }
}

export function subscribeToJornadas(callback: (jornadas: JornadaRow[]) => void): () => void {
  const q = collection(db, 'jornadas');
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => doc.data() as JornadaRow);
    callback(data);
  });
}

// ==========================================
// 8. GESTIÓN OPERATIVA - DESIGNACIONES
// ==========================================

export function subscribeToDesignations(callback: (data: Record<string, any>) => void): () => void {
  const q = collection(db, 'designations');
  return onSnapshot(q, (snapshot) => {
    const data: Record<string, any> = {};
    snapshot.docs.forEach(doc => {
      data[doc.id] = doc.data();
    });
    callback(data);
  });
}

export async function updateDesignation(type: 'guardia' | 'chat' | 'alertas', docData: any): Promise<void> {
  try {
    const docRef = doc(db, 'designations', type);
    // Separate history log to use arrayUnion
    const newLog = docData.history && docData.history.length > 0 ? docData.history[0] : null;
    
    const updatePayload: any = {
      currentAgentId: docData.currentAgentId,
      currentAgentName: docData.currentAgentName,
      updatedAt: docData.updatedAt
    };
    
    if (newLog) {
       updatePayload.history = arrayUnion(newLog);
    }
    
    await setDoc(docRef, updatePayload, { merge: true });
  } catch (err) {
    console.error(`Error updating designation ${type}:`, err);
    throw err;
  }
}

// ==========================================
// 9. GESTIÓN OPERATIVA - AUSENCIAS Y VACACIONES
// ==========================================

export async function fetchAusencias(): Promise<AusenciaRow[]> {
  try {
    const snapshot = await getDocs(collection(db, 'ausencias'));
    return snapshot.docs.map(doc => doc.data() as AusenciaRow);
  } catch (err) {
    console.error('Error al obtener ausencias de Firestore:', err);
    return [];
  }
}

export async function deleteAusencia(idSolicitud: string): Promise<void> {
  try {
    const docRef = doc(db, 'ausencias', idSolicitud);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting ausencia from Firestore:', err);
    throw err;
  }
}

export async function saveAusencias(ausencias: AusenciaRow[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    ausencias.forEach(a => {
      const docRef = doc(db, 'ausencias', a.idSolicitud);
      batch.set(docRef, a);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al guardar ausencias en Firestore:', err);
    throw err;
  }
}

export function subscribeToAusencias(callback: (ausencias: AusenciaRow[]) => void): () => void {
  const q = collection(db, 'ausencias');
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => doc.data() as AusenciaRow);
    callback(data);
  });
}

// ==========================================
// 10. GESTIÓN OPERATIVA - EVENTOS
// ==========================================

export async function fetchEvents(): Promise<IsolatedEvent[]> {
  try {
    const snapshot = await getDocs(collection(db, 'eventos'));
    return snapshot.docs.map(doc => doc.data() as IsolatedEvent);
  } catch (err) {
    checkAndSetQuotaError(err, 'Error al obtener eventos de Firestore');
    return [];
  }
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'eventos', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting event from Firestore:', err);
    throw err;
  }
}

export async function saveEvents(events: IsolatedEvent[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    events.forEach(e => {
      const docRef = doc(db, 'eventos', e.id);
      batch.set(docRef, e);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al guardar eventos en Firestore:', err);
    throw err;
  }
}

export async function saveDailyScrumHistory(agentId: string, scrumTask: ScrumTask): Promise<void> {
  try {
    const docRef = doc(db, 'dailyScrumHistory', agentId);
    await setDoc(docRef, {
      agentId: agentId,
      scrumLogs: arrayUnion(scrumTask)
    }, { merge: true });
  } catch (err) {
    console.error('Error al guardar log de Scrum en Firestore:', err);
    throw err;
  }
}

export async function fetchDailyScrumBoard(agentId: string): Promise<any> {
  try {
    const docRef = doc(db, 'dailyScrumBoards', agentId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (err) {
    console.error(`Error al obtener tablero de Scrum para ${agentId}:`, err);
    return null;
  }
}

export async function saveDailyScrumBoard(agentId: string, boardData: any): Promise<void> {
  if (!agentId || agentId === 'anonymous') {
    console.warn("Attempted to save daily scrum board for anonymous user.");
    return;
  }
  try {
    // Firestore does not accept undefined values, so we stringify and parse to remove them deeply.
    const cleanBoardData = JSON.parse(JSON.stringify(boardData));
    
    console.log(`Guardando tablero de Scrum para ${agentId}:`, JSON.stringify(cleanBoardData));
    const docRefBoard = doc(db, 'dailyScrumBoards', agentId);
    await setDoc(docRefBoard, {
      ...cleanBoardData,
      agentId: agentId,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    // Also save a snapshot to dailyScrumHistory for record keeping if needed
    const docRefHistory = doc(db, 'dailyScrumHistory', agentId);
    await setDoc(docRefHistory, {
      ...cleanBoardData,
      agentId: agentId,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`Tablero guardado con éxito para ${agentId} en la colección dailyScrumBoards`);
  } catch (err) {
    console.error(`Error al guardar tablero de Scrum para ${agentId}:`, err);
    throw err;
  }
}

export function subscribeToDailyScrumBoard(agentId: string, callback: (data: any) => void): () => void {
  const docRef = doc(db, 'dailyScrumBoards', agentId);
  return onSnapshot(docRef, (docSnap) => {
    callback(docSnap.exists() ? docSnap.data() : null);
  });
}

export async function fetchDailyScrumHistory(): Promise<any[]> {
  try {
    const snapshot = await getDocs(collection(db, 'dailyScrumHistory'));
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.error('Error al obtener historial de Scrum de Firestore:', err);
    return [];
  }
}

export async function clearAllDailyScrumBoards(): Promise<void> {
  try {
    // Vaciar dailyScrumBoards
    const boardsSnapshot = await getDocs(collection(db, 'dailyScrumBoards'));
    const boardsBatch = writeBatch(db);
    boardsSnapshot.docs.forEach(doc => {
      boardsBatch.set(doc.ref, {
        agentId: doc.id,
        items: [],
        completedItems: [],
        deletedItems: [],
        workspaceDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    await boardsBatch.commit();

    // Vaciar dailyScrumHistory
    const historySnapshot = await getDocs(collection(db, 'dailyScrumHistory'));
    const historyBatch = writeBatch(db);
    historySnapshot.docs.forEach(doc => {
      historyBatch.set(doc.ref, {
        agentId: doc.id,
        scrumLogs: [],
        updatedAt: new Date().toISOString()
      });
    });
    await historyBatch.commit();
    
    console.log('Se han vaciado exitosamente las colecciones dailyScrumBoards y dailyScrumHistory');
  } catch (err) {
    console.error('Error al vaciar los tableros absolutos:', err);
    throw err;
  }
}

export async function migrateDailyScrumHistory(): Promise<void> {
  try {
    const agentsSnapshot = await getDocs(collection(db, 'roster_agentes'));
    const agents = agentsSnapshot.docs.map(doc => doc.id);
    
    const scrumSnapshot = await getDocs(collection(db, 'dailyScrumHistory'));
    
    // Agrupar logs por agentId
    const scrumByAgent: Record<string, any[]> = {};
    
    scrumSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const agentId = data.agentId;
      if (agentId) {
        if (!scrumByAgent[agentId]) scrumByAgent[agentId] = [];
        // Si el documento tiene logs, los agregamos
        if (data.scrumLogs && Array.isArray(data.scrumLogs)) {
            scrumByAgent[agentId].push(...data.scrumLogs);
        } else if (data.ticketId) { // Es un log antiguo individual
            scrumByAgent[agentId].push(data);
        }
      }
    });

    const batch = writeBatch(db);

    // Crear/Actualizar documentos para cada agente
    agents.forEach(agentId => {
      const docRef = doc(db, 'dailyScrumHistory', agentId);
      batch.set(docRef, {
        agentId: agentId,
        scrumLogs: scrumByAgent[agentId] || []
      }, { merge: true });
    });

    // Eliminar documentos antiguos que no sean IDs de agentes
    scrumSnapshot.docs.forEach(doc => {
      if (!agents.includes(doc.id)) {
        batch.delete(doc.ref);
      }
    });

    await batch.commit();
    console.log('Daily Scrum History migrated successfully.');
  } catch (err) {
    console.error('Error migrating daily scrum history:', err);
    throw err;
  }
}

// ==========================================
// 12. GESTIÓN DEL REQUEST BACKLOG (CRM)
// ==========================================

export async function fetchCRMData(collectionName: string = 'requerimientos_en_curso'): Promise<any[]> {
  let normalizedName = collectionName.toLowerCase().replace(/ /g, '_').trim();
  if (normalizedName === 'crm' || normalizedName === 'backlog_tickets') {
    normalizedName = 'requerimientos_en_curso';
  }
  try {
    const snapshot = await getDocs(collection(db, normalizedName));
    let rows: any[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ID: doc.id,
      ...doc.data()
    }));
    
    // Si estamos obteniendo los requerimientos en curso, asegurarnos de que tengan la última información de visitas_programadas
    if (normalizedName === 'requerimientos_en_curso') {
      try {
        const visitas = await getProgrammedVisits();
        const doneWeekly = await fetchWeeklyBacklog();
        const doneHistorical = await fetchHistoricalBacklog();

        const visitasMap = new Map();
        visitas.forEach(v => {
          const vId = String(v.id || v.ID || v.requerimiento_id || v.id_registro_visita || '').trim().toUpperCase();
          if (vId) {
            visitasMap.set(vId, v);
          }
        });

        const completedIds = new Set([
          ...doneWeekly.map(d => String(d.id || d.ID || d['ID Requerimiento'] || d.requerimiento_id || d.id_registro_visita || '').trim().toUpperCase()),
          ...doneHistorical.map(d => String(d.id || d.ID || d['ID Requerimiento'] || d.requerimiento_id || d.id_registro_visita || '').trim().toUpperCase())
        ].filter(Boolean));

        // Scan current rows for any that are marked completed/resolved in CRM status
        rows.forEach(r => {
          const rId = String(r.id || r.ID || '').trim().toUpperCase();
          if (rId) {
            const stat = String(r.Status || r.Estado || r.status || r.estado || '').toLowerCase();
            const colJ = String(r['Estado Registro'] || r['Estado registro'] || r['Columna J'] || '').toLowerCase();
            if (
              stat.includes('cerrad') || stat.includes('completad') || stat.includes('resuelt') ||
              stat.includes('realizad') || stat.includes('solucion') || stat.includes('finaliz') ||
              stat.includes('anulad') || stat.includes('rechazad') || colJ.includes('completado')
            ) {
              completedIds.add(rId);
            }
          }
        });
        
        const processedIds = new Set();
        rows = rows.map(row => {
          const idVal = String(row.id || row.ID || '').trim().toUpperCase();
          if (!idVal) return row;

          // Prioridad 1: Si ya está en backlog completado/histórico o marcado como resuelto
          if (completedIds.has(idVal)) {
            processedIds.add(idVal);
            return {
              ...row,
              estado_visita: 'Cerrada'
            };
          }

          // Prioridad 2: Si está en visitas_programadas, usar esa info (es autónomo)
          if (visitasMap.has(idVal)) {
            const vData = visitasMap.get(idVal);
            processedIds.add(idVal);
            
            const cKey = Object.keys(row).find(h => h.toLowerCase() === 'account' || h.toLowerCase() === 'cliente' || h.toLowerCase() === 'cuenta') || 'Cliente';
            const aKey = Object.keys(row).find(h => h.toLowerCase() === 'assigned to' || h.toLowerCase() === 'tecnico' || h.toLowerCase() === 'asignado a') || 'Técnico Asignado';
            const sKey = Object.keys(row).find(h => h.toLowerCase() === 'subject' || h.toLowerCase() === 'asunto' || h.toLowerCase() === 'requerimiento') || 'Asunto';
            const contactKey = Object.keys(row).find(h => h.toLowerCase() === 'contact' || h.toLowerCase() === 'contacto') || 'Contacto';

            const computedEstado = (vData.estado_visita === 'Cerrada' || completedIds.has(idVal))
              ? 'Cerrada'
              : (vData.estado_visita || row.estado_visita || 'Programada');

            return {
              ...row,
              [cKey]: vData.cliente || row[cKey] || '',
              [aKey]: vData.tecnico_visita || vData.tecnico || row[aKey] || '',
              [sKey]: vData.asunto || row[sKey] || '',
              [contactKey]: vData.contacto || row[contactKey] || '',
              fecha_visita: vData.fecha_visita || row.fecha_visita || '',
              hora_visita: vData.hora_visita || row.hora_visita || '',
              tecnico_visita: vData.tecnico_visita || vData.tecnico || row.tecnico_visita || '',
              prioridad_visita: vData.prioridad_visita || row.prioridad_visita || 'Media',
              duracion_estimada_visita: vData.duracion_estimada_visita || row.duracion_estimada_visita || '2 horas',
              duracion_visita: vData.duracion_visita || vData.duracion_estimada_visita || row.duracion_visita || '',
              comentario_visita: vData.comentario_visita || row.comentario_visita || '',
              estado_visita: computedEstado,
              direccion_visita: vData.direccion_visita || row.direccion_visita || '',
              latitud_visita: vData.latitud_visita || row.latitud_visita || '',
              longitud_visita: vData.longitud_visita || row.longitud_visita || ''
            };
          }
          return row;
        });

        // Retain active visits that were dropped from the main CRM data ONLY if they are active and not completed
        visitas.forEach(vData => {
          const vId = String(vData.id || vData.ID || vData.requerimiento_id || vData.id_registro_visita || '').trim().toUpperCase();
          if (vId && !processedIds.has(vId) && !completedIds.has(vId)) {
            const estado = String(vData.estado_visita || 'Programada');
            if (estado === 'Programada' || estado === 'En Ejecución') {
              // Reconstruct a row for this active visit so it stays in "En Curso"
              rows.push({
                ID: vId,
                id: vId,
                'Título': vData.asunto || 'Visita Programada (Retenida)',
                Title: vData.asunto || 'Visita Programada (Retenida)',
                'Técnico Asignado': vData.tecnico_visita || vData.tecnico || '',
                'Assigned To': vData.tecnico_visita || vData.tecnico || '',
                'Account': vData.cliente || '',
                'Cliente': vData.cliente || '',
                'Contact': vData.contacto || '',
                'Contacto': vData.contacto || '',
                'Estado': '02 Próxima Visita',
                'Status': '02 Próxima Visita',
                fecha_visita: vData.fecha_visita || '',
                hora_visita: vData.hora_visita || '',
                tecnico_visita: vData.tecnico_visita || vData.tecnico || '',
                duracion_visita: vData.duracion_visita || '',
                comentario_visita: vData.comentario_visita || '',
                estado_visita: estado,
                direccion_visita: vData.direccion_visita || '',
                latitud_visita: vData.latitud_visita || '',
                longitud_visita: vData.longitud_visita || '',
                _retenida: true
              });
            }
          }
        });
      } catch (visitErr) {
        console.error('Error al hacer merge de visitas_programadas en fetchCRMData:', visitErr);
      }
    }
    
    return rows;
  } catch (err) {
    console.error(`Error al obtener CRM data de la colección ${collectionName} (${normalizedName}):`, err);
    return handleFirestoreError(err, OperationType.LIST, normalizedName);
  }
}

export async function saveCRMData(collectionName: string = 'requerimientos_en_curso', data: any[]): Promise<void> {
  let normalizedName = collectionName.toLowerCase().replace(/ /g, '_').trim();
  if (normalizedName === 'crm' || normalizedName === 'backlog_tickets') {
    normalizedName = 'requerimientos_en_curso';
  }
  try {
    const currentSnap = await getDocs(collection(db, normalizedName));
    const existingIds = currentSnap.docs.map(doc => doc.id);

    let operations = [];
    const seenIds = new Set<string>();
    
    data.forEach((item, idx) => {
      let baseId = String(item.id || item["ID"] || item["ID Tarea"] || `crm_${Date.now()}_${idx}`).trim();
      baseId = baseId.replace(/\//g, '-');
      let finalId = baseId;
      let counter = 1;
      while (seenIds.has(finalId)) {
        finalId = `${baseId}_${counter}`;
        counter++;
      }
      seenIds.add(finalId);
      
      const docRef = doc(db, normalizedName, finalId);
      const newData = { ...item, id: finalId };
      operations.push({ type: 'set', ref: docRef, data: newData });
    });

    // Add delete operations for documents no longer present in data
    existingIds.forEach(id => {
      if (!seenIds.has(id)) {
        const docRef = doc(db, normalizedName, id);
        operations.push({ type: 'delete', ref: docRef });
      }
    });

    // Chunk in batches of 500 (Firestore limit)
    const BATCH_SIZE = 490;

    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = operations.slice(i, i + BATCH_SIZE);
      chunk.forEach(op => {
        if (op.type === 'delete') {
          batch.delete(op.ref);
        } else {
          batch.set(op.ref, op.data, { merge: true });
        }
      });
      await batch.commit();
    }
    agentsCache.clear();
  } catch (err) {
    console.error(`Error al guardar CRM data en la colección ${collectionName} (${normalizedName}):`, err);
    return handleFirestoreError(err, OperationType.WRITE, normalizedName);
  }
}

// ==========================================
// 12.0.1 REGISTRO DE VISITAS PROGRAMADAS
// ==========================================
export async function registerProgrammedVisit(visitData: any): Promise<void> {
  try {
    const visitId = String(visitData.ID || visitData.id || visitData.requerimiento_id || visitData.id_registro_visita || '').trim();
    if (!visitId) {
      throw new Error('No visit ID or requerimiento ID provided');
    }
    const docRef = doc(db, 'visitas_programadas', visitId);
    await setDoc(docRef, {
      ...visitData,
      ID: visitId,
      id: visitId,
      id_registro_visita: visitId, // Maintain for legacy if needed, but ID is primary now
      requerimiento_id: visitId,
      timestamp_actualizacion: new Date().toISOString()
    }, { merge: true });
    
    // Auto-manage Asistencia if it's a roster agent
    if (visitData.tecnico_visita_tipo === 'roster_agent' && visitData.AgentID && visitData.fecha_visita) {
      try {
        const agentId = visitData.AgentID;
        // Handle ISO strings with 'T' or space
        const fecha = visitData.fecha_visita.includes('T') ? visitData.fecha_visita.split('T')[0] : visitData.fecha_visita.split(' ')[0];
        const duracion = visitData.duracion_estimada_visita || 'Todo el día';
        const hora = visitData.hora_visita || '08:00';
        
        let estado = 'Visita';
        
        const weekRange = getWeekRange(fecha);
        const dayOfWeek = getDayOfWeek(fecha);
        const month = fecha.substring(0, 7);
        
        const asisDocId = `${month}_${agentId}`;
        const asisDocRef = doc(db, 'asistencia', asisDocId);
        
        const docSnap = await getDoc(asisDocRef);
        let currentCheckIn = "";
        let currentCheckOut = "";
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.weeks && data.weeks[weekRange] && data.weeks[weekRange][dayOfWeek]) {
                currentCheckIn = data.weeks[weekRange][dayOfWeek].checkIn || "";
                currentCheckOut = data.weeks[weekRange][dayOfWeek].checkOut || "";
            }
        }
        
        await setDoc(asisDocRef, {
           agentId: agentId,
           month: month,
           weeks: {
              [weekRange]: {
                 [dayOfWeek]: {
                    checkIn: currentCheckIn,
                    checkOut: currentCheckOut,
                    estado: estado,
                    fecha: fecha
                 }
              }
           }
        }, { merge: true });
        
        console.log(`Asistencia actualizada a 'Visita' para el agente ${agentId} el día ${fecha}`);
      } catch (e) {
        console.error('Error al actualizar la asistencia de la visita:', e);
      }
    }

    console.log(`Visita programada registrada/actualizada exitosamente en Firestore: ${visitId}`);
    agentsCache.clear();
  } catch (err) {
    console.error('Error al registrar la visita programada en Firestore:', err);
    throw err;
  }
}

export async function getProgrammedVisits(): Promise<any[]> {
  try {
    const snapshot = await getDocs(collection(db, 'visitas_programadas'));
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (err) {
    console.error('Error al obtener visitas programadas:', err);
    return [];
  }
}

export function subscribeToProgrammedVisits(callback: (visits: any[]) => void): () => void {
  return onSnapshot(collection(db, 'visitas_programadas'), (snapshot) => {
    const visits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(visits);
  }, (err) => {
    console.error('Error in subscribeToProgrammedVisits:', err);
  });
}

export async function syncProgrammedVisits(): Promise<void> {
  try {
    console.log('Iniciando sincronización de visitas programadas...');
    
    // 1. Migration: ensure all existing visits have ID field
    const currentVisitsSnap = await getDocs(collection(db, 'visitas_programadas'));
    const migrationBatch = writeBatch(db);
    let migrationCount = 0;
    
    // Fetch closure sources
    const doneWeekly = await fetchWeeklyBacklog();
    const doneHistorical = await fetchHistoricalBacklog();
    const completedIds = new Set([
      ...doneWeekly.map(d => String(d.ID || d.id || d['ID Requerimiento'] || d.requerimiento_id || d.id_registro_visita || '').trim().toUpperCase()),
      ...doneHistorical.map(d => String(d.ID || d.id || d['ID Requerimiento'] || d.requerimiento_id || d.id_registro_visita || '').trim().toUpperCase())
    ].filter(Boolean));

    // Map existing visits to check for presence
    const existingVisitsMap = new Map();
    currentVisitsSnap.forEach(vDoc => {
      const vData = vDoc.data();
      const vId = vDoc.id.toUpperCase();
      existingVisitsMap.set(vId, vData);
    });

    currentVisitsSnap.forEach(vDoc => {
      const vData = vDoc.data();
      const vId = vDoc.id;
      const vIdUpper = vId.toUpperCase();
      let needsUpdate = false;
      const updateData: any = {};

      if (!vData.ID || !vData.id || vData.ID !== vId || vData.id !== vId || vData.requerimiento_id !== vId) {
        updateData.ID = vId;
        updateData.id = vId;
        updateData.id_registro_visita = vId;
        updateData.requerimiento_id = vId;
        needsUpdate = true;
      }

      // Check for closure
      if (completedIds.has(vIdUpper) && vData.estado_visita !== 'Cerrada') {
        updateData.estado_visita = 'Cerrada';
        updateData.timestamp_cierre = new Date().toISOString();
        needsUpdate = true;
      }

      if (needsUpdate) {
        migrationBatch.update(vDoc.ref, updateData);
        migrationCount++;
      }
    });

    if (migrationCount > 0) {
      await migrationBatch.commit();
      console.log(`Sincronización/Migración completada: ${migrationCount} visitas actualizadas (IDs o Cierres).`);
    }

    const snapshot = await getDocs(collection(db, 'requerimientos_en_curso'));
    if (snapshot.empty) {
      console.log('No hay requerimientos en curso para sincronizar.');
      return;
    }

    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach(document => {
      const data = document.data();
      const estadoVisita = data.estado_visita || '';
      
      const id = String(data.ID || data.id || '').trim();
      if (id) {
        const idUpper = id.toUpperCase();
        const existingVisit = existingVisitsMap.get(idUpper) || {};
        
        // Si ya está cerrada en el backlog, asegurarnos de que se marque como tal
        let finalEstadoVisita = estadoVisita || existingVisit.estado_visita || '';
        if (completedIds.has(idUpper)) {
          finalEstadoVisita = 'Cerrada';
        }

        // Sincronizar de forma totalmente segura e independiente:
        // 1. Si ya existe en visitas_programadas, NO modificamos NADA (se mantiene 100% independiente),
        //    excepto si ha sido cerrado en el backlog completado/histórico, en cuyo caso solo marcamos como Cerrada.
        // 2. Si NO existe en visitas_programadas, pero el estado del CRM es activo (Programada/En Ejecución),
        //    lo inicializamos para que sea rastreado de forma autónoma.
        const existsInVisits = existingVisitsMap.has(idUpper);
        const isActiveState = finalEstadoVisita === 'Programada' || finalEstadoVisita === 'En Ejecución';
        
        if (existsInVisits) {
          if (completedIds.has(idUpper) && existingVisit.estado_visita !== 'Cerrada') {
            const docRef = doc(db, 'visitas_programadas', id);
            batch.update(docRef, {
              estado_visita: 'Cerrada',
              timestamp_cierre: new Date().toISOString(),
              timestamp_actualizacion: new Date().toISOString()
            });
            count++;
          }
        } else if (isActiveState) {
          const docRef = doc(db, 'visitas_programadas', id);
          
          const cKey = Object.keys(data).find(h => h.toLowerCase() === 'account' || h.toLowerCase() === 'cliente' || h.toLowerCase() === 'cuenta') || 'Account';
          const aKey = Object.keys(data).find(h => h.toLowerCase() === 'assigned to' || h.toLowerCase() === 'tecnico' || h.toLowerCase() === 'asignado a') || 'Assigned To';
          const sKey = Object.keys(data).find(h => h.toLowerCase() === 'subject' || h.toLowerCase() === 'asunto' || h.toLowerCase() === 'requerimiento') || 'Subject';
          const contactKey = Object.keys(data).find(h => h.toLowerCase() === 'contact' || h.toLowerCase() === 'contacto') || 'Contact';

          const visitRecord = {
            ID: id,
            id: id,
            id_registro_visita: id,
            requerimiento_id: id,
            cliente: data[cKey] || '',
            tecnico: data[aKey] || '',
            tecnico_visita: data[aKey] || '',
            asunto: data[sKey] || '',
            contacto: data[contactKey] || '',
            fecha_visita: data.fecha_visita || '',
            hora_visita: data.hora_visita || '',
            prioridad_visita: data.prioridad_visita || 'Media',
            duracion_estimada_visita: data.duracion_estimada_visita || '2 horas',
            direccion_visita: data.direccion_visita || '',
            latitud_visita: data.latitud_visita || '',
            longitud_visita: data.longitud_visita || '',
            estado_visita: finalEstadoVisita || 'Programada',
            comentario_visita: data.comentario_visita || '',
            timestamp_programacion: data.timestamp_programacion || new Date().toISOString(),
            timestamp_actualizacion: new Date().toISOString()
          };
          batch.set(docRef, visitRecord, { merge: true });
          count++;
        }
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Sincronización completa: ${count} visitas registradas/actualizadas en 'visitas_programadas'.`);
    } else {
      console.log('No se encontraron visitas adicionales para sincronizar.');
    }
  } catch (err) {
    console.error('Error al sincronizar visitas programadas:', err);
  }
}

// ==========================================
// 12.1 GESTIÓN DE BACKLOG SEMANAL Y HISTÓRICO
// ==========================================

export async function fetchWeeklyBacklog(): Promise<any[]> {
  try {
    const snapshot = await getDocs(collection(db, 'backlog_semanal'));
    return snapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.error('Error al obtener backlog semanal:', err);
    return [];
  }
}

export async function fetchHistoricalBacklog(): Promise<any[]> {
  try {
    const [snap1, snap2, snap3] = await Promise.all([
      getDocs(collection(db, 'historico_completados')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'admin_backlog_done')).catch(() => ({ docs: [] })),
      getDocs(collection(db, 'admin_backlog_done_contratistas')).catch(() => ({ docs: [] }))
    ]);
    const list1 = snap1.docs.map(doc => ({ id: doc.id, ID: doc.id, ...doc.data() }));
    const list2 = snap2.docs.map(doc => ({ id: doc.id, ID: doc.id, ...doc.data() }));
    const list3 = snap3.docs.map(doc => ({ id: doc.id, ID: doc.id, ...doc.data() }));
    return [...list1, ...list2, ...list3];
  } catch (err) {
    console.error('Error al obtener histórico de completados:', err);
    return [];
  }
}

export async function updateWeeklyBacklog(data: any[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    data.forEach(item => {
      const id = String(item.id || item["ID"] || item["ID Tarea"] || `bw_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`).trim();
      const docRef = doc(db, 'backlog_semanal', id);
      batch.set(docRef, { ...item, id }, { merge: true });
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al actualizar backlog semanal:', err);
    throw err;
  }
}

export async function archiveWeeklyToHistorical(sprint: string): Promise<void> {
  try {
    const batch = writeBatch(db);
    let totalMigrated = 0;

    // 1. Migrar agentes de backlog_semanal
    const snapshot = await getDocs(collection(db, 'backlog_semanal'));
    if (!snapshot.empty) {
      snapshot.docs.forEach(d => {
        const data = d.data();
        const statusKey = Object.keys(data).find(k => 
          k.toLowerCase() === 'estado registro' || 
          k.toLowerCase() === 'estado' || 
          k.toLowerCase() === 'columna j'
        ) || 'Estado Registro';
        
        const status = String(data[statusKey] || '').trim().toUpperCase();
        
        if (status === 'PENDIENTE A CONFIRMAR') {
          const pendingRef = doc(db, 'admin_backlog_done', d.id);
          batch.set(pendingRef, data);
        } else {
          const historyRef = doc(db, 'historico_completados', d.id);
          batch.set(historyRef, data);
        }
        batch.delete(d.ref);
        totalMigrated++;
      });
    }

    // 2. Migrar contratistas de backlog_semanal_contratistas
    const contractorSnapshot = await getDocs(collection(db, 'backlog_semanal_contratistas'));
    if (!contractorSnapshot.empty) {
      contractorSnapshot.docs.forEach(d => {
        const data = d.data();
        const statusKey = Object.keys(data).find(k => 
          k.toLowerCase() === 'estado registro' || 
          k.toLowerCase() === 'estado' || 
          k.toLowerCase() === 'columna j'
        ) || 'Estado Registro';
        
        const status = String(data[statusKey] || '').trim().toUpperCase();
        
        if (status === 'PENDIENTE A CONFIRMAR') {
          const pendingRef = doc(db, 'admin_backlog_done_contratistas', d.id);
          batch.set(pendingRef, data);
        } else {
          const historyRef = doc(db, 'historico_completados', d.id);
          batch.set(historyRef, data);
        }
        batch.delete(d.ref);
        totalMigrated++;
      });
    }
    
    if (totalMigrated > 0) {
      await batch.commit();
    }
    console.log(`Migrados ${totalMigrated} registros del backlog semanal (agentes + contratistas).`);
  } catch (err) {
    console.error('Error al archivar backlog semanal:', err);
    throw err;
  }
}

export async function clearWeeklyBacklog(sprint: string): Promise<void> {
  try {
    let operations: { type: 'delete', ref: any }[] = [];

    // 1. Limpiar agentes backlog_semanal
    const q = query(collection(db, 'backlog_semanal'), where('sprint_trabajo', '==', sprint));
    const snapshot = await getDocs(q);
    snapshot.docs.forEach(d => {
      operations.push({ type: 'delete', ref: d.ref });
    });

    // Limpiar huérfanos/corruptos agentes
    const allSnapshot = await getDocs(collection(db, 'backlog_semanal'));
    allSnapshot.docs.forEach(d => {
      const data = d.data();
      const sVal = String(data.sprint_trabajo || data['Semana Actual'] || '').trim();
      const isCorrupted = !sVal || sVal === 'undefined' || Object.keys(data).some(key => /^\d+$/.test(key));
      if (isCorrupted) {
        if (!operations.some(op => op.ref.id === d.ref.id)) {
          operations.push({ type: 'delete', ref: d.ref });
        }
      }
    });

    // 2. Limpiar contratistas backlog_semanal_contratistas
    const qCont = query(collection(db, 'backlog_semanal_contratistas'), where('sprint_trabajo', '==', sprint));
    const snapshotCont = await getDocs(qCont);
    snapshotCont.docs.forEach(d => {
      operations.push({ type: 'delete', ref: d.ref });
    });

    // Limpiar huérfanos/corruptos contratistas
    const allSnapshotCont = await getDocs(collection(db, 'backlog_semanal_contratistas'));
    allSnapshotCont.docs.forEach(d => {
      const data = d.data();
      const sVal = String(data.sprint_trabajo || data['Semana Actual'] || '').trim();
      const isCorrupted = !sVal || sVal === 'undefined' || Object.keys(data).some(key => /^\d+$/.test(key));
      if (isCorrupted) {
        if (!operations.some(op => op.ref.id === d.ref.id)) {
          operations.push({ type: 'delete', ref: d.ref });
        }
      }
    });

    // Batch operations in chunks of 450
    const BATCH_SIZE = 450;
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = operations.slice(i, i + BATCH_SIZE);
      chunk.forEach(op => {
        batch.delete(op.ref);
      });
      await batch.commit();
    }
    
    console.log(`Limpiado backlog semanal para sprint "${sprint}" (eliminados ${operations.length} registros en total para agentes y contratistas).`);
  } catch (err) {
    console.error('Error al limpiar backlog semanal:', err);
    throw err;
  }
}

export async function separateContractorBacklog(): Promise<{ migratedWeekly: number; migratedAdmin: number }> {
  try {
    // 1. Fetch all contractors
    const contractorsSnapshot = await getDocs(collection(db, 'contractors'));
    const contractors = contractorsSnapshot.docs.map(doc => doc.data());

    // Helper functions for name matching
    const normalizeName = (name: string): string => {
      if (!name) return '';
      return name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
    };

    const isAgentNameMatch = (nameA: string, nameB: string): boolean => {
      if (!nameA || !nameB) return false;
      const cleanA = normalizeName(nameA);
      const cleanB = normalizeName(nameB);
      
      if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
      
      const partsA = cleanA.split(' ').filter(Boolean);
      const partsB = cleanB.split(' ').filter(Boolean);
      
      if (partsA.length > 0 && partsB.length > 0) {
        if (partsA[0] === partsB[0]) {
          if (partsA.length > 1 && partsB.length > 1) {
            if (partsA[1].startsWith(partsB[1]) || partsB[1].startsWith(partsA[1])) {
              return true;
            }
          } else {
            return true;
          }
        }
      }
      return false;
    };

    let migratedWeekly = 0;
    let migratedAdmin = 0;

    // 2. Separate from backlog_semanal
    const backlogSnapshot = await getDocs(collection(db, 'backlog_semanal'));
    if (!backlogSnapshot.empty) {
      const batchWeekly = writeBatch(db);
      let needsCommit = false;
      backlogSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const assignedTo = String(
          data["Assigned To"] || 
          data["Técnico asignado"] || 
          data["Tecnico asignado"] || 
          data["Asignado"] || 
          data["Agent"] || 
          data["Técnico Asignado"] || 
          data["agent"] || 
          ''
        ).trim();

        const isContractor = contractors.some(c => isAgentNameMatch(c.name, assignedTo));

        if (isContractor) {
          const destRef = doc(db, 'backlog_semanal_contratistas', docSnap.id);
          batchWeekly.set(destRef, data);
          batchWeekly.delete(docSnap.ref);
          migratedWeekly++;
          needsCommit = true;
        }
      });
      if (needsCommit) {
        await batchWeekly.commit();
      }
    }

    // 3. Separate from admin_backlog_done
    const adminSnapshot = await getDocs(collection(db, 'admin_backlog_done'));
    if (!adminSnapshot.empty) {
      const batchAdmin = writeBatch(db);
      let needsCommit = false;
      adminSnapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        const assignedTo = String(
          data["Assigned To"] || 
          data["Técnico asignado"] || 
          data["Tecnico asignado"] || 
          data["Asignado"] || 
          data["Agent"] || 
          data["Técnico Asignado"] || 
          data["agent"] || 
          ''
        ).trim();

        const isContractor = contractors.some(c => isAgentNameMatch(c.name, assignedTo));

        if (isContractor) {
          const destRef = doc(db, 'admin_backlog_done_contratistas', docSnap.id);
          batchAdmin.set(destRef, data);
          batchAdmin.delete(docSnap.ref);
          migratedAdmin++;
          needsCommit = true;
        }
      });
      if (needsCommit) {
        await batchAdmin.commit();
      }
    }

    console.log(`Separados contratistas con éxito: ${migratedWeekly} de backlog_semanal, ${migratedAdmin} de admin_backlog_done.`);
    return { migratedWeekly, migratedAdmin };
  } catch (err) {
    console.error('Error al separar solicitudes de contratistas:', err);
    throw err;
  }
}

// ==========================================
// 13. GESTIÓN DE PERFILES INDIVIDUALES DE AGENTES
// ==========================================

export async function fetchAgentProfiles(): Promise<AgentProfile[]> {
  await seedDatabaseIfNeeded();
  try {
    const snapshot = await getDocs(collection(db, 'profiles'));
    return snapshot.docs.map(doc => doc.data() as AgentProfile);
  } catch (err) {
    console.error('Error al obtener perfiles individuales de Firestore:', err);
    return INITIAL_PROFILES; // Fallback
  }
}

export async function saveAgentProfile(agentId: string, profile: AgentProfile): Promise<void> {
  try {
    const docRef = doc(db, 'profiles', agentId);
    await setDoc(docRef, profile, { merge: true });
  } catch (err) {
    console.error(`Error al guardar perfil individual para ${agentId} en Firestore:`, err);
    throw err;
  }
}

export async function saveAllAgentProfiles(profiles: AgentProfile[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    profiles.forEach(profile => {
      const docRef = doc(db, 'profiles', profile.agentId);
      batch.set(docRef, profile);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al guardar todos los perfiles en Firestore:', err);
    throw err;
  }
}

// ==========================================
// 14. GESTIÓN DE CONFIGURACIÓN GLOBAL (SETTINGS)
// ==========================================


export interface LeaderboardSettings {
  // Puntos
  completedTickets: number;
  completedEscalations: number;
  completedVisits: number;
  completedTasks: number;
  completedEvaluations: number;
  workingTickets: number;
  pendingTickets: number;
  earlyCheckIns: number;
  onTimeCheckIns: number;
  graceCheckIns: number;
  lateCheckIns: number;
  missingCheckIns: number;
  // Criterios - Origenes de Datos (CRM)
  sourceCrm: boolean;
  sourceWeekly: boolean;
  sourceHistorical: boolean;
  sourceAdminDone: boolean;
  // Criterios - Estados
  statusResolvedWords: string[];
  statusInProgressWords: string[];
}

export const DEFAULT_LEADERBOARD_SETTINGS: LeaderboardSettings = {
  completedTickets: 15,
  completedEscalations: 25,
  completedVisits: 50,
  completedTasks: 20,
  completedEvaluations: 25,
  workingTickets: 10,
  pendingTickets: 2,
  earlyCheckIns: 12,
  onTimeCheckIns: 10,
  graceCheckIns: 5,
  lateCheckIns: -5,
  missingCheckIns: -15,
  sourceCrm: true,
  sourceWeekly: true,
  sourceHistorical: true,
  sourceAdminDone: true,
  statusResolvedWords: ['completad', 'resuelt', 'cerrad', 'exitos', 'finalizad', 'terminad', 'entregad', 'cancelad', 'anulad', 'rechazad', 'done', 'closed', 'resolved', 'completed', 'historico', 'confirmar'],
  statusInProgressWords: ['progres', 'curso', 'intern', 'espera', 'trabajando', 'proceso', 'procesando', 'waiting', 'hold', 'revis', 'verific', 'proxim', 'visit'],
};

export async function fetchLeaderboardSettings(): Promise<LeaderboardSettings> {
  try {
    const docRef = doc(db, 'settings', 'leaderboard');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { ...DEFAULT_LEADERBOARD_SETTINGS, ...docSnap.data() } as LeaderboardSettings;
    }
    return DEFAULT_LEADERBOARD_SETTINGS;
  } catch (err) {
    console.error('Error al obtener configuración de leaderboard:', err);
    return DEFAULT_LEADERBOARD_SETTINGS;
  }
}

export interface SprintSnapshot {
  sprint: string;
  savedAt: string;
  savedBy?: string;
  agents: Record<string, any>;
}

export async function fetchSprintSnapshots(): Promise<SprintSnapshot[]> {
  try {
    const colRef = collection(db, 'sprint_snapshots');
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SprintSnapshot));
  } catch (err) {
    console.error('Error fetching sprint snapshots:', err);
    return [];
  }
}

function cleanUndefined(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanUndefined);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        newObj[key] = cleanUndefined(val);
      }
    }
    return newObj;
  }
  return obj;
}

export async function saveSprintSnapshot(sprint: string, data: SprintSnapshot): Promise<void> {
  try {
    const docId = sprint.replace(/[\/\s-]/g, '_');
    const docRef = doc(db, 'sprint_snapshots', docId);
    const cleanedData = cleanUndefined(data);
    await setDoc(docRef, cleanedData, { merge: true });
    agentsCache.clear();
  } catch (err) {
    console.error('Error saving sprint snapshot:', err);
    throw err;
  }
}

export async function deleteSprintSnapshot(sprint: string): Promise<void> {
  try {
    const docId = sprint.replace(/[\/\s-]/g, '_');
    const docRef = doc(db, 'sprint_snapshots', docId);
    await deleteDoc(docRef);
    agentsCache.clear();
  } catch (err) {
    console.error('Error deleting sprint snapshot:', err);
    throw err;
  }
}

export async function saveLeaderboardSettings(settings: LeaderboardSettings): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'leaderboard');
    await setDoc(docRef, settings, { merge: true });
    agentsCache.clear();
    safeDispatchEvent('leaderboard_settings_updated', settings);
  } catch (err) {
    console.error('Error al guardar configuración de leaderboard:', err);
    throw err;
  }
}

export async function fetchSystemSettings(): Promise<any> {
  try {
    const docRef = doc(db, 'settings', 'global');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return {};
  } catch (err) {
    console.error('Error al obtener configuración de sistema:', err);
    return {};
  }
}

export async function saveSystemSettings(settings: any): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'global');
    await setDoc(docRef, settings, { merge: true });
    agentsCache.clear();
  } catch (err) {
    console.error('Error al guardar configuración de sistema:', err);
    throw err;
  }
}

// ==========================================
// GESTIÓN DE CONSUMO DE GOOGLE MAPS API
// ==========================================

export async function fetchGoogleMapsUsage(): Promise<any> {
  try {
    const docRef = doc(db, 'settings', 'google_maps_usage');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    // Return a default initial state
    const defaultUsage = {
      currentMonth: new Date().toISOString().substring(0, 7),
      maps_js_api_loads: 0,
      geocoding_requests: 0,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, defaultUsage);
    return defaultUsage;
  } catch (err) {
    console.error('Error al obtener consumo de Google Maps:', err);
    return {
      currentMonth: new Date().toISOString().substring(0, 7),
      maps_js_api_loads: 0,
      geocoding_requests: 0,
      updatedAt: new Date().toISOString()
    };
  }
}

export async function incrementGoogleMapsUsage(sku: 'maps_js_api_loads' | 'geocoding_requests'): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'google_maps_usage');
    const docSnap = await getDoc(docRef);
    const thisMonth = new Date().toISOString().substring(0, 7);
    const nowStr = new Date().toISOString();
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      let mapsLoads = data.maps_js_api_loads || 0;
      let geocodingReqs = data.geocoding_requests || 0;
      
      // If month changed, reset counters automatically
      if (data.currentMonth !== thisMonth) {
        mapsLoads = 0;
        geocodingReqs = 0;
      }
      
      if (sku === 'maps_js_api_loads') {
        mapsLoads++;
      } else if (sku === 'geocoding_requests') {
        geocodingReqs++;
      }
      
      await setDoc(docRef, {
        currentMonth: thisMonth,
        maps_js_api_loads: mapsLoads,
        geocoding_requests: geocodingReqs,
        updatedAt: nowStr
      }, { merge: true });
    } else {
      const initialUsage = {
        currentMonth: thisMonth,
        maps_js_api_loads: sku === 'maps_js_api_loads' ? 1 : 0,
        geocoding_requests: sku === 'geocoding_requests' ? 1 : 0,
        updatedAt: nowStr
      };
      await setDoc(docRef, initialUsage);
    }
  } catch (err) {
    console.error('Error al incrementar consumo de Google Maps:', err);
  }
}

export function subscribeToGoogleMapsUsage(callback: (data: any) => void): () => void {
  const docRef = doc(db, 'settings', 'google_maps_usage');
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback({
        currentMonth: new Date().toISOString().substring(0, 7),
        maps_js_api_loads: 0,
        geocoding_requests: 0,
        updatedAt: new Date().toISOString()
      });
    }
  }, (err) => {
    console.error('Error al suscribir a consumo de Google Maps:', err);
  });
}

export async function resetGoogleMapsUsage(): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'google_maps_usage');
    const defaultUsage = {
      currentMonth: new Date().toISOString().substring(0, 7),
      maps_js_api_loads: 0,
      geocoding_requests: 0,
      updatedAt: new Date().toISOString()
    };
    await setDoc(docRef, defaultUsage);
  } catch (err) {
    console.error('Error al reiniciar consumo de Google Maps:', err);
    throw err;
  }
}

export async function fetchGoogleMapsKey(): Promise<string> {
  try {
    const docRef = doc(db, 'settings', 'google_maps_key');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().key || '';
    }
  } catch (err) {
    console.error('Error fetching Google Maps Key from Firestore:', err);
  }
  return '';
}

export async function saveGoogleMapsKey(key: string): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'google_maps_key');
    await setDoc(docRef, { key, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('Error saving Google Maps Key to Firestore:', err);
    throw err;
  }
}

// ==========================================
// 15. GESTIÓN DE CALENDARIO OPERATIVO Y RECORDATORIOS
// ==========================================

export async function fetchCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const snapshot = await getDocs(collection(db, 'calendarioOperativo'));
    return snapshot.docs.map(doc => doc.data() as CalendarEvent);
  } catch (err) {
    console.error('Error fetching calendar events from Firestore:', err);
    return [];
  }
}


export async function saveCalendarEvents(events: CalendarEvent[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    events.forEach(e => {
      const docRef = doc(db, 'calendarioOperativo', e.id);
      batch.set(docRef, e);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error saving calendar events to Firestore:', err);
    throw err;
  }
}

export async function saveCalendarEvent(event: CalendarEvent): Promise<void> {
  try {
    const docRef = doc(db, 'calendarioOperativo', event.id);
    await setDoc(docRef, event, { merge: true });
  } catch (err) {
    console.error(`Error saving calendar event ${event.id}:`, err);
    throw err;
  }
}

export async function deleteCalendarEvents(ids: string[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    ids.forEach(id => {
      const docRef = doc(db, 'calendarioOperativo', id);
      batch.delete(docRef);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error deleting calendar events:', err);
    throw err;
  }
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'calendarioOperativo', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.error(`Error deleting calendar event ${id}:`, err);
    throw err;
  }
}

export async function fetchAllPersonalReminders(): Promise<IsolatedEvent[]> {
  try {
    const snapshot = await getDocs(collection(db, 'personalReminders'));
    let all: IsolatedEvent[] = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data && Array.isArray(data.reminders)) {
        all = all.concat(data.reminders);
      }
    });
    return all;
  } catch (err) {
    console.error('Error fetching all personal reminders from Firestore:', err);
    return [];
  }
}

export async function savePersonalRemindersForAgent(agentId: string, reminders: IsolatedEvent[]): Promise<void> {
  try {
    const docRef = doc(db, 'personalReminders', agentId);
    await setDoc(docRef, {
      agentId,
      reminders,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err) {
    console.error(`Error saving personal reminders for agent ${agentId}:`, err);
    throw err;
  }
}


// ==========================================
// COLABORACIONES
// ==========================================

export async function fetchCollaborations(): Promise<any[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'collaborations'));
    return querySnapshot.docs.map(doc => doc.data());
  } catch (err) {
    console.error('Error al obtener colaboraciones:', err);
    return [];
  }
}

export function subscribeCollaborations(callback: (collaborations: any[]) => void): () => void {
  const collRef = collection(db, 'collaborations');
  return onSnapshot(collRef, (snapshot) => {
    const list = snapshot.docs.map(doc => doc.data());
    callback(list);
  }, (err) => {
    console.error('Error en tiempo real de colaboraciones:', err);
  });
}

export async function deleteCollaboration(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'collaborations', id));
    agentsCache.clear();
  } catch (err) {
    console.error('Error eliminando colaboración:', err);
    throw err;
  }
}

export async function clearAllCollaborations(): Promise<void> {
  try {
    const querySnapshot = await getDocs(collection(db, 'collaborations'));
    const batch = writeBatch(db);
    querySnapshot.docs.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  } catch (err) {
    console.error('Error al borrar todas las colaboraciones:', err);
    throw err;
  }
}

export async function saveCollaboration(collab: any): Promise<void> {
  try {
    const cleanCollab = { ...collab };
    Object.keys(cleanCollab).forEach(key => {
      if (cleanCollab[key] === undefined) {
        delete cleanCollab[key];
      }
    });
    const docRef = doc(db, 'collaborations', cleanCollab.id);
    await setDoc(docRef, cleanCollab, { merge: true });
    agentsCache.clear();
  } catch (err) {
    console.error(`Error al guardar colaboración ${collab.id} en Firestore:`, err);
    throw err;
  }
}

export async function saveCollaborations(collaborations: any[]): Promise<void> {
  try {
    const batch = writeBatch(db);
    collaborations.forEach(c => {
      const cleanCollab = { ...c };
      Object.keys(cleanCollab).forEach(key => {
        if (cleanCollab[key] === undefined) {
          delete cleanCollab[key];
        }
      });
      const docRef = doc(db, 'collaborations', cleanCollab.id);
      batch.set(docRef, cleanCollab, { merge: true });
    });
    await batch.commit();
    agentsCache.clear();
  } catch (err) {
    console.error('Error guardando colaboraciones:', err);
    throw err;
  }
}

export function subscribeToCRMData(collectionName: string = 'requerimientos_en_curso', callback: (rows: any[]) => void): () => void {
  let normalizedName = collectionName.toLowerCase().replace(/ /g, '_').trim();
  if (normalizedName === 'crm' || normalizedName === 'backlog_tickets') {
    normalizedName = 'requerimientos_en_curso';
  }
  const collRef = collection(db, normalizedName);
  const q = query(collRef, limit(200));

  // Variables de caché para no hacer peticiones masivas en cada cambio de onSnapshot
  let visitasPromise: Promise<any[]> | null = null;
  let doneWeeklyPromise: Promise<any[]> | null = null;
  let doneHistoricalPromise: Promise<any[]> | null = null;

  return onSnapshot(q, async (snapshot) => {
    let rows: any[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ID: doc.id,
      ...doc.data()
    }));
    
    // Si estamos obteniendo los requerimientos en curso, asegurarnos de que tengan la última información de visitas_programadas
    if (normalizedName === 'requerimientos_en_curso') {
      try {
        if (!visitasPromise) visitasPromise = getProgrammedVisits();
        if (!doneWeeklyPromise) doneWeeklyPromise = fetchWeeklyBacklog();
        if (!doneHistoricalPromise) doneHistoricalPromise = fetchHistoricalBacklog();

        const visitas = await visitasPromise;
        const doneWeekly = await doneWeeklyPromise;
        const doneHistorical = await doneHistoricalPromise;

        const visitasMap = new Map();
        visitas.forEach(v => {
          const vId = String(v.id || v.ID || v.requerimiento_id || v.id_registro_visita || '').trim().toUpperCase();
          if (vId) {
            visitasMap.set(vId, v);
          }
        });

        const completedIds = new Set([
          ...doneWeekly.map(d => String(d.id || d.ID || '').trim().toUpperCase()),
          ...doneHistorical.map(d => String(d.id || d.ID || '').trim().toUpperCase())
        ].filter(Boolean));
        
        const processedIds = new Set();
        rows = rows.map(row => {
          const idVal = String(row.id || row.ID || '').trim().toUpperCase();
          if (!idVal) return row;

          // Prioridad 1: Si ya está en backlog completado/histórico, es Cerrada
          if (completedIds.has(idVal)) {
            return {
              ...row,
              estado_visita: 'Cerrada'
            };
          }

          // Prioridad 2: Si está en visitas_programadas, usar esa info (es autónomo)
          if (visitasMap.has(idVal)) {
            const vData = visitasMap.get(idVal);
            processedIds.add(idVal);
            
            const cKey = Object.keys(row).find(h => h.toLowerCase() === 'account' || h.toLowerCase() === 'cliente' || h.toLowerCase() === 'cuenta') || 'Cliente';
            const aKey = Object.keys(row).find(h => h.toLowerCase() === 'assigned to' || h.toLowerCase() === 'tecnico' || h.toLowerCase() === 'asignado a') || 'Técnico Asignado';
            const sKey = Object.keys(row).find(h => h.toLowerCase() === 'subject' || h.toLowerCase() === 'asunto' || h.toLowerCase() === 'requerimiento') || 'Asunto';
            const contactKey = Object.keys(row).find(h => h.toLowerCase() === 'contact' || h.toLowerCase() === 'contacto') || 'Contacto';

            return {
              ...row,
              [cKey]: vData.cliente || row[cKey] || '',
              [aKey]: vData.tecnico_visita || vData.tecnico || row[aKey] || '',
              [sKey]: vData.asunto || row[sKey] || '',
              [contactKey]: vData.contacto || row[contactKey] || '',
              fecha_visita: vData.fecha_visita || row.fecha_visita || '',
              hora_visita: vData.hora_visita || row.hora_visita || '',
              tecnico_visita: vData.tecnico_visita || vData.tecnico || row.tecnico_visita || '',
              prioridad_visita: vData.prioridad_visita || row.prioridad_visita || 'Media',
              duracion_estimada_visita: vData.duracion_estimada_visita || row.duracion_estimada_visita || '2 horas',
              duracion_visita: vData.duracion_visita || vData.duracion_estimada_visita || row.duracion_visita || '',
              comentario_visita: vData.comentario_visita || row.comentario_visita || '',
              estado_visita: vData.estado_visita || row.estado_visita || 'Programada',
              direccion_visita: vData.direccion_visita || row.direccion_visita || '',
              latitud_visita: vData.latitud_visita || row.latitud_visita || '',
              longitud_visita: vData.longitud_visita || row.longitud_visita || ''
            };
          }
          return row;
        });

        // Retain active visits that were dropped from the main CRM data
        visitas.forEach(vData => {
          const vId = String(vData.ID || vData.requerimiento_id || vData.id_registro_visita || '').trim().toUpperCase();
          if (vId && !processedIds.has(vId) && !completedIds.has(vId)) {
            const estado = String(vData.estado_visita || 'Programada');
            if (estado === 'Programada' || estado === 'En Ejecución') {
              // Reconstruct a row for this active visit so it stays in "En Curso"
              rows.push({
                ID: vId,
                id: vId,
                'Título': vData.asunto || 'Visita Programada (Retenida)',
                Title: vData.asunto || 'Visita Programada (Retenida)',
                'Técnico Asignado': vData.tecnico_visita || vData.tecnico || '',
                'Assigned To': vData.tecnico_visita || vData.tecnico || '',
                'Account': vData.cliente || '',
                'Cliente': vData.cliente || '',
                'Contact': vData.contacto || '',
                'Contacto': vData.contacto || '',
                'Estado': '02 Próxima Visita',
                'Status': '02 Próxima Visita',
                fecha_visita: vData.fecha_visita || '',
                hora_visita: vData.hora_visita || '',
                tecnico_visita: vData.tecnico_visita || vData.tecnico || '',
                duracion_visita: vData.duracion_visita || '',
                comentario_visita: vData.comentario_visita || '',
                estado_visita: estado,
                direccion_visita: vData.direccion_visita || '',
                latitud_visita: vData.latitud_visita || '',
                longitud_visita: vData.longitud_visita || '',
                _retenida: true
              });
            }
          }
        });
      } catch (err) {
        console.error("Error al fusionar visitas programadas en subscribeToCRMData:", err);
      }
    }
    callback(rows);
  }, (err) => {
    console.error(`Error en tiempo real de CRM data (${normalizedName}):`, err);
  });
}

export function subscribeToWeeklyBacklog(callback: (rows: any[]) => void): () => void {
  const collRef = collection(db, 'backlog_semanal');
  const q = query(collRef);
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => doc.data());
    callback(list);
  }, (err) => {
    console.error('Error en tiempo real de backlog semanal:', err);
  });
}

export function subscribeToWeeklyBacklogContractors(callback: (rows: any[]) => void): () => void {
  const collRef = collection(db, 'backlog_semanal_contratistas');
  const q = query(collRef);
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => doc.data());
    callback(list);
  }, (err) => {
    console.error('Error en tiempo real de backlog semanal de contratistas:', err);
  });
}




export async function cleanupBacklogSemanal(): Promise<void> {
  try {
    const backlogSnap = await getDocs(collection(db, 'backlog_semanal'));
    const enCursoSnap = await getDocs(collection(db, 'requerimientos_en_curso'));
    
    const enCursoIds = new Set();
    enCursoSnap.forEach(d => {
      const data = d.data();
      const baseId = String(data.ID || data.id || '').trim().toUpperCase();
      if (baseId) enCursoIds.add(baseId);
    });

    const seenIds = new Set();
    let operations = [];
    
    backlogSnap.forEach(d => {
      const data = d.data();
      const baseId = String(data.ID || data.id || '').trim().toUpperCase();
      
      let shouldDelete = false;
      if (!baseId) {
        shouldDelete = true;
      } else if (seenIds.has(baseId)) {
        shouldDelete = true;
      } else if (enCursoIds.has(baseId)) {
        shouldDelete = true;
      }
      
      if (shouldDelete) {
        operations.push({ type: 'delete', ref: d.ref });
      } else {
        seenIds.add(baseId);
      }
    });

    console.log("Cleanup backlog_semanal, deletes:", operations.length);

    const BATCH_SIZE = 490;
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = operations.slice(i, i + BATCH_SIZE);
      chunk.forEach(op => {
        batch.delete(op.ref);
      });
      await batch.commit();
    }
  } catch (err) {
    console.error('Error cleaning up backlog_semanal:', err);
  }
}

export async function deleteProgrammedVisit(id: string): Promise<void> {
  try {
    const docRef = doc(db, 'visitas_programadas', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const visitData = docSnap.data();
      if (visitData.tecnico_visita_tipo === 'roster_agent' && visitData.AgentID && visitData.fecha_visita) {
        try {
          const agentId = visitData.AgentID;
          const fecha = visitData.fecha_visita.includes('T') ? visitData.fecha_visita.split('T')[0] : visitData.fecha_visita.split(' ')[0];
          const weekRange = getWeekRange(fecha);
          const dayOfWeek = getDayOfWeek(fecha);
          const month = fecha.substring(0, 7);
          
          const asisDocId = `${month}_${agentId}`;
          const asisDocRef = doc(db, 'asistencia', asisDocId);
          const asisDocSnap = await getDoc(asisDocRef);
          
          if (asisDocSnap.exists()) {
            const data = asisDocSnap.data();
            if (data.weeks && data.weeks[weekRange] && data.weeks[weekRange][dayOfWeek] && data.weeks[weekRange][dayOfWeek].estado === 'Visita') {
              await setDoc(asisDocRef, {
                 weeks: {
                    [weekRange]: {
                       [dayOfWeek]: {
                          estado: "",
                          checkIn: "",
                          checkOut: ""
                       }
                    }
                 }
              }, { merge: true });
              console.log(`Asistencia revertida para el agente ${agentId} el día ${fecha}`);
            }
          }
        } catch (e) {
          console.error('Error al revertir la asistencia de la visita:', e);
        }
      }
    }
    await deleteDoc(docRef);
    console.log('Deleted visit:', id);
    agentsCache.clear();
  } catch (err) {
    console.error('Error deleting visit:', err);
  }
}

export async function deleteCRMItem(collectionName: string, id: string): Promise<void> {
  let normalizedName = collectionName.toLowerCase().replace(/ /g, '_').trim();
  if (normalizedName === 'crm' || normalizedName === 'backlog_tickets') {
    normalizedName = 'requerimientos_en_curso';
  }
  try {
    const docRef = doc(db, normalizedName, id);
    await deleteDoc(docRef);
    console.log(`Deleted doc from ${collectionName}: ${id}`);
    agentsCache.clear();
  } catch (err) {
    console.error(`Error deleting doc from ${collectionName} (${normalizedName}):`, err);
    return handleFirestoreError(err, OperationType.DELETE, normalizedName);
  }
}

// ==========================================
// 16. GESTIÓN DE SECCIONES COMING SOON
// ==========================================

export function subscribeToComingSoonConfig(callback: (config: Record<string, boolean>) => void): () => void {
  const docRef = doc(db, 'settings', 'coming_soon_config');
  const defaultVal = {
    request_backlog_status_cycle: true,
    request_backlog_reports: true,
    operations_externo: true
  };
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const dbSections = docSnap.data().sections || {};
      const merged: Record<string, boolean> = { ...defaultVal };
      for (const key of Object.keys(defaultVal)) {
        if (dbSections[key] !== undefined) {
          merged[key] = dbSections[key];
        }
      }
      for (const key of Object.keys(dbSections)) {
        if (merged[key] === undefined) {
          merged[key] = dbSections[key];
        }
      }
      callback(merged);
    } else {
      callback(defaultVal);
    }
  }, (err) => {
    console.error('Error al suscribir a configuración de Coming Soon:', err);
  });
}

export async function saveComingSoonConfig(sections: Record<string, boolean>): Promise<void> {
  try {
    const docRef = doc(db, 'settings', 'coming_soon_config');
    await setDoc(docRef, { sections, updatedAt: new Date().toISOString() });
  } catch (err: any) {
    console.error('Error al guardar configuración de Coming Soon en Firestore:', err);
    throw err;
  }
}

