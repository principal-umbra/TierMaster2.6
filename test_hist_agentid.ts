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
  
  let hasAgentid = 0;
  histSnap.docs.forEach(doc => {
     const data = doc.data();
     if (data.agentid || data.agentId || data['Agent ID']) hasAgentid++;
  });
  console.log('Hist tickets with agentid:', hasAgentid);
  
  const sample = histSnap.docs.map(doc=>doc.data()).filter(t => t.sprint_trabajo === sprint && t['Assigned To']?.includes('Andri'));
  if (sample.length > 0) {
      console.log('Sample ticket keys:', Object.keys(sample[0]));
      console.log('agentid:', sample[0].agentid);
  }
}
check().catch(console.error).then(() => process.exit(0));
