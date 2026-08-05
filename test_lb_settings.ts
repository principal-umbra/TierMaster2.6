import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

const app = initializeApp(firebaseConfig);
const actualDbId = (firebaseConfig.firestoreDatabaseId && 
                    firebaseConfig.firestoreDatabaseId !== firebaseConfig.projectId &&
                    firebaseConfig.firestoreDatabaseId !== 'default')
  ? firebaseConfig.firestoreDatabaseId
  : '(default)';
const db = getFirestore(app, actualDbId);

import { fetchLeaderboardSettings } from './src/db/firebaseService';

async function run() {
  const lbSettings = await fetchLeaderboardSettings();
  console.log(JSON.stringify(lbSettings, null, 2));
}

run().catch(console.error).then(() => process.exit(0));
