import { db } from '../src/db/firebaseService';
import { collection, getDocs } from 'firebase/firestore';

async function inspect() {
  console.log('--- Inspecting all dailyScrumHistory ---');
  const snap = await getDocs(collection(db, 'dailyScrumHistory'));
  
  snap.forEach(doc => {
    console.log('Doc ID:', doc.id);
    console.log('Data:', JSON.stringify(doc.data()));
  });
  console.log('--- Finished Inspection ---');
}

inspect();
