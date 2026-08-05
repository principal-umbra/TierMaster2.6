import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const ids = ["35038", "35188", "34154"];
  const currentSprint = 'Semana 13/07/2026 - 19/07/2026';
  
  for (const id of ids) {
    const docRef = doc(db, "backlog_semanal", id);
    const d = await getDoc(docRef);
    if (d.exists()) {
      await updateDoc(docRef, { "sprint_trabajo": currentSprint, "Semana Actual": currentSprint });
      console.log(`Updated ${id} sprint_trabajo to ${currentSprint}`);
    } else {
      console.log(`${id} not found`);
    }
  }
  process.exit(0);
}
run();
