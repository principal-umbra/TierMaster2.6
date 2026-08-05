import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);

const actualDbId = (config.firestoreDatabaseId && 
                    config.firestoreDatabaseId !== config.projectId && 
                    config.firestoreDatabaseId !== '(default)')
    ? config.firestoreDatabaseId
    : '(default)';

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, actualDbId);

async function run() {
  const contSnap = await getDocs(collection(db, 'contractors')).catch(() => ({docs:[]}));
  const contractors = contSnap.docs.map(d => d.data());
  console.log(`Total contractors: ${contractors.length}`);
  console.log(contractors.map(c => c.name));
  process.exit(0);
}
run();
