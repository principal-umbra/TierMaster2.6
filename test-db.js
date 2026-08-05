import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore/lite';
import fs from 'fs';

const fbConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(fbConfig.firebase);
const db = getFirestore(app);

async function run() {
  const snap = await getDocs(collection(db, 'roster_agentes'));
  snap.docs.forEach(d => {
     const data = d.data();
     if (data.name === 'Francisco Ramirez') {
        console.log(data);
     }
  });
}
run();
