import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore/lite';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const actualDbId = (fbConfig.firestoreDatabaseId && fbConfig.firestoreDatabaseId !== fbConfig.projectId && fbConfig.firestoreDatabaseId !== 'default') ? fbConfig.firestoreDatabaseId : '(default)';
const db = initializeFirestore(app, {}, actualDbId);

async function run() {
  const crmSnap = await getDocs(collection(db, 'requerimientos_en_curso')).catch(() => ({ docs: [] }));
  const historicalSnap = await getDocs(collection(db, 'historico_completados')).catch(() => ({ docs: [] }));
  const adminDoneSnap = await getDocs(collection(db, 'admin_backlog_done')).catch(() => ({ docs: [] }));
  
  const crmTickets = crmSnap.docs.map(doc => doc.data());
  const historicalTickets = historicalSnap.docs.map(doc => doc.data());
  const adminDoneTickets = adminDoneSnap.docs.map(doc => doc.data());

  const allTickets = [...crmTickets, ...historicalTickets, ...adminDoneTickets];
  
  const sprintsSet = new Set();
  allTickets.forEach(ticket => {
      const s = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').trim();
      if (s && s !== 'undefined') sprintsSet.add(s);
  });
  console.log(Array.from(sprintsSet));
}
run();
