import { db } from '../src/db/firebaseService';
import { doc, getDoc } from 'firebase/firestore';

async function test() {
  try {
    console.log('Testing DB connection...');
    const docRef = doc(db, 'agents', 'AG-RQ-371');
    const snap = await getDoc(docRef);
    console.log('Doc AG-RQ-371 exists:', snap.exists());
    if (snap.exists()) {
        console.log('Data:', JSON.stringify(snap.data()));
    }
  } catch (e) {
    console.error('Test failed:', e);
  }
}
test();
