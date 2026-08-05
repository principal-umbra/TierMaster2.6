import { db } from '../src/db/firebaseService';
import { collection, getDocs } from 'firebase/firestore';

async function checkTasks() {
  console.log('--- Checking tasks ---');
  for (const col of ['internalTasks', 'contractorTasks']) {
    console.log(`--- Checking ${col} ---`);
    try {
      const snap = await getDocs(collection(db, col));
      snap.forEach(doc => {
        console.log('Doc ID:', doc.id, 'Data:', JSON.stringify(doc.data()));
      });
    } catch (e) {
      console.log(`Could not access ${col}:`, e);
    }
  }
}
checkTasks();
