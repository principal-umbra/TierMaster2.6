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
  const hist = histSnap.docs.map(doc => doc.data());
  const andriHist = hist.filter(t => (t['Assigned To'] || '').includes('Andri') || (t['Técnico asignado'] || '').includes('Andri'));
  
  console.log(`Andri total in historico_completados: ${andriHist.length}`);
  const andriSprintHist = andriHist.filter(t => (t.sprint_trabajo === sprint || t['Semana Actual'] === sprint));
  console.log(`Andri in sprint ${sprint} (historico_completados): ${andriSprintHist.length}`);

  const weekSnap = await getDocs(query(collection(db, 'backlog_semanal')));
  const week = weekSnap.docs.map(doc => doc.data());
  const andriWeek = week.filter(t => (t['Assigned To'] || '').includes('Andri') || (t['Técnico asignado'] || '').includes('Andri'));
  
  console.log(`Andri total in backlog_semanal: ${andriWeek.length}`);
  const andriSprintWeek = andriWeek.filter(t => (t.sprint_trabajo === sprint || t['Semana Actual'] === sprint));
  console.log(`Andri in sprint ${sprint} (backlog_semanal): ${andriSprintWeek.length}`);

  const crmSnap = await getDocs(query(collection(db, 'requerimientos_en_curso')));
  const crm = crmSnap.docs.map(doc => doc.data());
  const andriCrm = crm.filter(t => (t['Assigned To'] || '').includes('Andri') || (t['Técnico asignado'] || '').includes('Andri'));
  
  console.log(`Andri total in requerimientos_en_curso: ${andriCrm.length}`);
  const andriSprintCrm = andriCrm.filter(t => (t.sprint_trabajo === sprint || t['Semana Actual'] === sprint));
  console.log(`Andri in sprint ${sprint} (requerimientos_en_curso): ${andriSprintCrm.length}`);

  if (andriSprintHist.length > 0) {
      console.log('Sample from hist:');
      console.log(andriSprintHist.slice(0, 2));
  }
}
check().catch(console.error).then(() => process.exit(0));
