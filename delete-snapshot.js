import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore/lite';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const actualDbId = (fbConfig.firestoreDatabaseId && fbConfig.firestoreDatabaseId !== fbConfig.projectId && fbConfig.firestoreDatabaseId !== 'default') ? fbConfig.firestoreDatabaseId : '(default)';
const db = initializeFirestore(app, {}, actualDbId);

async function run() {
  const snap = await getDocs(collection(db, 'sprint_snapshots'));
  for (const d of snap.docs) {
     const data = d.data();
     console.log('Found snapshot:', data.sprint);
     if (data.sprint === 'Semana 06/07/2026 - 12/07/2026') {
        console.log('Deleting snapshot for', data.sprint);
        await deleteDoc(doc(db, 'sprint_snapshots', d.id));
     }
  }
}
run();
