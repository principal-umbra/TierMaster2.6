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
  const week = await getDocs(query(collection(db, 'backlog_semanal')));
  const d = week.docs.map(doc => doc.data());
  console.log('Total week tickets:', d.length);

  const cleanFilter = 'Semana 13/07/2026 - 19/07/2026'.toLowerCase().trim();
  const sprint6 = d.filter(t => {
     const ts = String(t.sprint_trabajo || t['Semana Actual'] || '').toLowerCase().trim();
     return ts === cleanFilter;
  });
  console.log('Sprint matches:', sprint6.length);

  const fran = d.filter(t => {
      const assigned = t["Assigned To"] || t["assignedTo"] || t["Técnico asignado"] || t["Tecnico asignado"] || t["Asignado"] || t["Agent"] || "";
      return assigned.includes("Fran");
  });
  console.log('Fran total in week:', fran.length);

  fran.forEach((f, i) => {
      console.log(`Fran #${i+1}: sprint='${f.sprint_trabajo}' date='${f['Resolved Date'] || f.fecha || f['Created Date']}'`);
  });
}
check().catch(console.error).then(() => process.exit(0));
