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
  const crmSnap = await getDocs(query(collection(db, 'requerimientos_en_curso')));
  const andri = crmSnap.docs.map(d=>d.data()).filter(t => (t['Assigned To'] || '').includes('Andri'));
  console.log(`Andri in CRM: ${andri.length}`);
  andri.forEach(t => {
     console.log(`Status: ${t.Status}, Created: ${t['Created Date']}, Resolved: ${t['Resolved Date']}, Sprint_Trabajo: ${t.sprint_trabajo}`);
  });
}
check().catch(console.error).then(() => process.exit(0));
