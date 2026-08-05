import { db } from '../src/db/firebaseService';
import { getFirestore, getDocs, collection } from 'firebase/firestore';

async function listCollections() {
  console.log('--- Listing Collections ---');
  // Firestore SDK doesn't have a direct "listCollections" method for security reasons
  // but we can try to guess or just list known ones
  const collections = ['agents', 'credentials', 'dailyScrumHistory', 'crmData', 'tasks'];
  
  for (const col of collections) {
    try {
      const snap = await getDocs(collection(db, col));
      console.log(`Collection ${col} has ${snap.size} docs`);
    } catch (e) {
      console.log(`Could not access ${col}:`, e);
    }
  }
}
listCollections();
