import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs } from 'firebase/firestore/lite';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const actualDbId = (fbConfig.firestoreDatabaseId && fbConfig.firestoreDatabaseId !== fbConfig.projectId && fbConfig.firestoreDatabaseId !== 'default') ? fbConfig.firestoreDatabaseId : '(default)';
const db = initializeFirestore(app, {}, actualDbId);

async function run() {
  const snap = await getDocs(collection(db, 'sprint_snapshots'));
  for (const d of snap.docs) {
     const data = d.data();
     if (data.sprint === 'Semana 13/07/2026 - 19/07/2026') {
         console.log(data.agents['AG-AD-871']);
     }
  }
}
run();
