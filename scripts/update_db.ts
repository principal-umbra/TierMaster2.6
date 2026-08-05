import { db } from '../src/db/firebaseService';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

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

async function update() {
  console.log('--- Starting Update ---');
  const agentsSnap = await getDocs(collection(db, 'agents'));
  for (const agentDoc of agentsSnap.docs) {
    const data = agentDoc.data();
    // Try username or user field
    const username = data.username || data.user || data.USER;
    if (username && mapping[username]) {
      await updateDoc(doc(db, 'agents', agentDoc.id), {
        agentId: mapping[username]
      });
      console.log(`Updated agent ${agentDoc.id} with agentId ${mapping[username]}`);
    }
  }

  const credsSnap = await getDocs(collection(db, 'credentials'));
  for (const credDoc of credsSnap.docs) {
    const data = credDoc.data();
    const username = data.username || data.user || data.USER;
    if (username && mapping[username]) {
      await updateDoc(doc(db, 'credentials', credDoc.id), {
        agentId: mapping[username]
      });
      console.log(`Updated credential ${credDoc.id} with agentId ${mapping[username]}`);
    }
  }
  console.log('--- Finished Update ---');
}

update();
