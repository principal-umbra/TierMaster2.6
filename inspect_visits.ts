import { db } from './src/db/firebaseService';
import { getDocs, collection } from 'firebase/firestore';

async function inspectVisits() {
  console.log("=== INSPECTING VISITS ===");
  try {
    const snap = await getDocs(collection(db, 'visitas_programadas'));
    console.log(`Total visits: ${snap.size}`);
    if (snap.size > 0) {
      console.log("First visit sample:");
      console.log(JSON.stringify(snap.docs[0].data(), null, 2));
    }
  } catch (err: any) {
    console.error("Error inspecting visits:", err.message);
  }
}

inspectVisits();
