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
  const sprint = 'Semana 06/07/2026 - 12/07/2026';
  const snap = await getDocs(query(collection(db, 'admin_backlog_done')));
  const done = snap.docs.map(d=>d.data());
  const andri = done.filter(t => (t['Assigned To'] || '').includes('Andri') || (t['Técnico asignado'] || '').includes('Andri'));
  console.log('Andri in admin_backlog_done:', andri.length);
  const sprintAndri = andri.filter(t => t.sprint_trabajo === sprint);
  console.log('Andri sprint admin_backlog_done:', sprintAndri.length);
  if (sprintAndri.length > 0) {
      console.log('sample', sprintAndri[0]);
  }
}
check().catch(console.error).then(() => process.exit(0));
