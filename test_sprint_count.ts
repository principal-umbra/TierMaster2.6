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
  const histSnap = await getDocs(query(collection(db, 'historico_completados')));
  
  let count = 0;
  histSnap.docs.forEach(doc => {
     const data = doc.data();
     const sprintValue = String(data.sprint_trabajo || data['Semana Actual'] || '').toLowerCase().trim();
     if (sprintValue === sprint.toLowerCase() || sprintValue.includes('06/07/2026 - 12/07/2026')) {
         count++;
     }
  });
  console.log(`Total tickets in historico_completados for sprint ${sprint}:`, count);
}
check().catch(console.error).then(() => process.exit(0));
