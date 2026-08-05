import { db } from '../src/db/firebaseService';
import { collection, getDocs, updateDoc, doc, deleteDoc, setDoc } from 'firebase/firestore';

const mapping: Record<string, string> = {
  "admin": "AD-MIN-01",
  "af": "AG-AF-145",
  "cf": "AG-CF-409",
  "rq": "AG-RQ-371",
  "rr": "AG-RR-943",
  "rp": "AG-RP-509",
  "hh": "AG-HH-691",
  "rb": "AG-RB-101",
  "fr": "AG-FR-765",
  "ad": "AG-AD-712"
};

async function migrate() {
  console.log('--- Migrating dailyScrumHistory ---');
  const snap = await getDocs(collection(db, 'dailyScrumHistory'));
  
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const oldId = docSnap.id;
    
    // Check if ID is one of the usernames
    if (mapping[oldId]) {
      const newId = mapping[oldId];
      console.log(`Migrating ${oldId} to ${newId}`);
      
      // Create new doc
      await setDoc(doc(db, 'dailyScrumHistory', newId), {
        ...data,
        agentId: newId
      });
      
      // Delete old doc
      await deleteDoc(doc(db, 'dailyScrumHistory', oldId));
    }
  }
  console.log('--- Finished Migration ---');
}

migrate();
