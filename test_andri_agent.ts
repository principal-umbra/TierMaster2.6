import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const actualDbId = (firebaseConfig.firestoreDatabaseId && 
                    firebaseConfig.firestoreDatabaseId !== firebaseConfig.projectId &&
                    firebaseConfig.firestoreDatabaseId !== 'default')
  ? firebaseConfig.firestoreDatabaseId
  : '(default)';
const db = getFirestore(app, actualDbId);

async function check() {
  const agentsSnap = await getDocs(query(collection(db, 'agents')));
  const agents = agentsSnap.docs.map(doc => doc.data());
  const andri = agents.find(a => a.name.includes('Andri'));
  console.log(andri);
}
check().catch(console.error).then(() => process.exit(0));
