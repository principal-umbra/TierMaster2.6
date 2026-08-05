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
  const crmSnap = await getDocs(collection(db, 'requerimientos_en_curso'));
  const rows = crmSnap.docs.map(d => d.data());
  
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  console.log("Headers for crmData:", headers);
  process.exit(0);
}
run();
