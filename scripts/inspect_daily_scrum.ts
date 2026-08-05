import { db } from '../src/db/firebaseService';
import { collection, getDocs, limit, query } from 'firebase/firestore';

async function inspect() {
  console.log('--- Inspecting dailyScrumHistory ---');
  const q = query(collection(db, 'dailyScrumHistory'), limit(5));
  const snap = await getDocs(q);
  
  snap.forEach(doc => {
    console.log('Doc ID:', doc.id);
    console.log('Data:', JSON.stringify(doc.data()));
  });
  console.log('--- Finished Inspection ---');
}

inspect();
