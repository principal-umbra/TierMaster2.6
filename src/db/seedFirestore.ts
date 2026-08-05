import { initializeApp } from 'firebase/app';
import { getFirestore, doc, writeBatch } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

import { INITIAL_AGENTS, INITIAL_TIERS, INITIAL_CERTIFICATIONS } from '../mockData';
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

// Leer firebase-applet-config.json de manera segura
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const DEFAULT_CREDENTIALS = [
  { username: 'rquintana', password: 'fhons2026', name: 'R. Quintana', email: 'rquintana@fhons.com.do', role: 'User' },
  { username: 'admin', password: 'admin2026', name: 'Administrador FHONS', email: 'admin@fhons.com.do', role: 'Admin' },
  { username: 'framirez', password: 'fhons2026', name: 'Francisco Ramirez', email: 'framirez@fhons.com', role: 'User' },
  { username: 'hherrera', password: 'fhons2026', name: 'Hendel Herrera', email: 'hherrera@fhons.com', role: 'User' },
  { username: 'rbello', password: 'fhons2026', name: 'Rafael Bello', email: 'rbello@fhons.co', role: 'User' },
  { username: 'rpichardo', password: 'fhons2026', name: 'Robert Pichardo', email: 'rpichardo@fhons.com', role: 'User' }
];

async function seedCollection(collectionName: string, defaultData: any[], idKey: string) {
  try {
    console.log(`Sembrando colección '${collectionName}' con ${defaultData.length} registros...`);
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
  } catch (err) {
    console.error(`Error al sembrar la colección '${collectionName}':`, err);
  }
}

async function runSeed() {
  console.log("Iniciando la siembra forzada de datos a Firestore...");
  await seedCollection('credentials', DEFAULT_CREDENTIALS, 'username');
  await seedCollection('tiers', INITIAL_TIERS, 'id');
  await seedCollection('certifications', INITIAL_CERTIFICATIONS, 'id');
  await seedCollection('agents', INITIAL_AGENTS, 'id');
  await seedCollection('jornadas', DEFAULT_JORNADAS, 'idAgente');
  await seedCollection('asistencia', DEFAULT_ASISTENCIAS, 'idAgente');
  await seedCollection('designations', DEFAULT_DESIGNATIONS, 'idDesignacion');
  await seedCollection('ausencias', DEFAULT_AUSENCIAS, 'idSolicitud');
  await seedCollection('internalTasks', DEFAULT_INTERNAL_TASKS, 'id');
  await seedCollection('eventos', DEFAULT_EVENTS, 'id');
  await seedCollection('dailyScrumHistory', DEFAULT_DAILY_SCRUMS, 'id');
  await seedCollection('backlog_tickets', DEFAULT_CRM_TICKETS, 'ID');
  console.log("¡Toda la base de datos se sembró con éxito en Firestore!");
  process.exit(0);
}

runSeed().catch(err => {
  console.error("Fallo durante el proceso de siembra:", err);
  process.exit(1);
});
