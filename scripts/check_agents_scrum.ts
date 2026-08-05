import { db } from '../src/db/firebaseService';
import { collection, getDocs } from 'firebase/firestore';

async function checkAgentsScrum() {
  console.log('--- Checking all agents scrumLogs ---');
  const snap = await getDocs(collection(db, 'agents'));
  
  snap.forEach(doc => {
    const data = doc.data();
    if (data.scrumLogs && data.scrumLogs.length > 0) {
      console.log('Agent:', doc.id, 'ScrumLogs:', JSON.stringify(data.scrumLogs));
    }
  });
  console.log('--- Finished Check ---');
}
checkAgentsScrum();
