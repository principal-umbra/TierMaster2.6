import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const actualDbId = (firebaseConfig.firestoreDatabaseId && 
                    firebaseConfig.firestoreDatabaseId !== firebaseConfig.projectId &&
                    firebaseConfig.firestoreDatabaseId !== 'default')
  ? firebaseConfig.firestoreDatabaseId
  : '(default)';
const db = getFirestore(app, actualDbId);

async function check() {
  const colls = ['admin_backlog_done', 'asistencia', 'backlog_semanal', 'evaluaciones', 'historico_completados', 'jornadas', 'planes_accion', 'requerimientos_en_curso', 'roster_agentes'];
  for (const c of colls) {
    const snap = await getDocs(query(collection(db, c)));
    console.log(`Collection ${c} has ${snap.docs.length} docs`);
    if (snap.docs.length > 0) {
      console.log(`First doc keys: ${Object.keys(snap.docs[0].data()).join(', ')}`);
    }
  }
}
check().catch(console.error).then(() => process.exit(0));
