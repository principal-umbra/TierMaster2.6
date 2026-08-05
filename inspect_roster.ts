import { db } from './src/db/firebaseService';
import { collection, getDocs } from 'firebase/firestore';

async function run() {
  const snap = await getDocs(collection(db, 'roster_agentes'));
  snap.docs.forEach(doc => {
    console.log(doc.id, doc.data().name, doc.data().role);
  });
}

run().catch(console.error);
