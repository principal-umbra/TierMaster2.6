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

import { fetchAgents } from './src/db/firebaseService';

async function run() {
  const sprint = 'Semana 06/07/2026 - 12/07/2026';
  const agents = await fetchAgents(sprint);
  const andri = agents.find(a => a.name.includes('Andri'));
  console.log(JSON.stringify(andri, null, 2));
}

run().catch(console.error).then(() => process.exit(0));
