import { db } from './src/db/firebaseService';
import { doc, setDoc, getDoc } from 'firebase/firestore';

async function run() {
  const docRef = doc(db, 'asistencia', 'test_merge_doc');
  await setDoc(docRef, {
    agentId: 'test_agent',
    month: '2026-07',
    weeks: {
      'week1': {
        'Mon': {
          checkIn: '08:00',
          checkOut: '17:00'
        }
      }
    }
  });

  await setDoc(docRef, {
    weeks: {
      'week1': {
        'Tue': {
          checkIn: '09:00'
        }
      }
    }
  }, { merge: true });

  const snap = await getDoc(docRef);
  console.log(JSON.stringify(snap.data(), null, 2));
}
run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
