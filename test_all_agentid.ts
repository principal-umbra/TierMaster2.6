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
    let count = 0;
    snap.docs.forEach(d => {
       const data = d.data();
       if ('agentid' in data || 'agentId' in data || 'Agent ID' in data) count++;
    });
    console.log(`Collection ${c} has ${count} docs with agentid`);
  }
}
check().catch(console.error).then(() => process.exit(0));
