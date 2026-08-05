import { db } from '../src/db/firebaseService';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';

const mapping: Record<string, { agentId: string, username: string }> = {
  "admin": { agentId: "AD-MIN-01", username: "admin" },
  "af": { agentId: "AG-AF-145", username: "af" },
  "cf": { agentId: "AG-CF-409", username: "cf" },
  "rq": { agentId: "AG-RQ-371", username: "rq" },
  "rr": { agentId: "AG-RR-943", username: "rr" },
  "rp": { agentId: "AG-RP-509", username: "rp" },
  "hh": { agentId: "AG-HH-691", username: "hh" },
  "rb": { agentId: "AG-RB-101", username: "rb" },
  "fr": { agentId: "AG-FR-765", username: "fr" },
  "ad": { agentId: "AG-AD-712", username: "ad" }
};

async function update() {
  console.log('--- Starting Agents Update ---');
  const agentsSnap = await getDocs(collection(db, 'agents'));
  
  for (const agentDoc of agentsSnap.docs) {
    const data = agentDoc.data();
    // Use email to map
    const email = data.email?.toLowerCase().trim();
    if (!email) continue;
    
    // Find mapping by email
    const userKey = Object.keys(mapping).find(key => {
        // This is a bit of a guess, need to check email map
        const emailMap: Record<string, string> = {
            "rquintana@fhons.com": "rq",
            "admin@fhons.com": "admin",
            "afernandez@fhons.com": "af",
            "cfernandez@fhons.com": "cf",
            "rreinoso@fhons.com": "rr",
            "rpichardo@fhons.com": "rp",
            "hherrera@fhons.com": "hh",
            "rbello@fhons.com": "rb",
            "framirez@fhons.com": "fr",
            "adominguez@fhons.com": "ad"
        };
        return emailMap[email] === key;
    });

    if (userKey && mapping[userKey]) {
      await updateDoc(doc(db, 'agents', agentDoc.id), {
        agentId: mapping[userKey].agentId,
        username: mapping[userKey].username
      });
      console.log(`Updated agent ${agentDoc.id} with agentId ${mapping[userKey].agentId} and username ${mapping[userKey].username}`);
    }
  }
  console.log('--- Finished Agents Update ---');
}

update();
