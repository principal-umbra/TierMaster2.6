import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

async function log() {
  console.log('--- Agents ---');
  const agentsSnap = await getDocs(collection(db, 'agents'));
  agentsSnap.forEach(doc => console.log(doc.id, JSON.stringify(doc.data())));

  console.log('--- Credentials ---');
  try {
    const credsSnap = await getDocs(collection(db, 'credentials'));
    credsSnap.forEach(doc => console.log(doc.id, JSON.stringify(doc.data())));
  } catch (e) {
    console.log('Credentials collection not found or error:', e);
  }
}

log();
