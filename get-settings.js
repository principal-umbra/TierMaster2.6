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
    console.log(lbSettingsSnap.data());
  } else {
    console.log("No settings doc");
  }
}
run();
