import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc } from 'firebase/firestore/lite';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig);
const actualDbId = (fbConfig.firestoreDatabaseId && fbConfig.firestoreDatabaseId !== fbConfig.projectId && fbConfig.firestoreDatabaseId !== 'default') ? fbConfig.firestoreDatabaseId : '(default)';
const db = initializeFirestore(app, {}, actualDbId);

async function run() {
  const lbSettingsSnap = await getDoc(doc(db, 'settings', 'leaderboard'));
  if (lbSettingsSnap.exists()) {
    const data = lbSettingsSnap.data();
    console.log("Val:", data.completedTickets);
    console.log("Type:", typeof data.completedTickets);
  } else {
    console.log("No settings doc");
  }
}
run();
