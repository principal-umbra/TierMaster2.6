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
  const sprint = 'Semana 06/07/2026 - 12/07/2026';
  
  // Get Agent name
  const rosterSnap = await getDocs(query(collection(db, 'roster_agentes')));
  const agent = rosterSnap.docs.find(doc => doc.data().id === 'AG-AD-712')?.data();
  if (!agent) {
    console.log("Agent not found!");
    return;
  }
  const agentName = agent.name;
  console.log(`Agent Name for AG-AD-712: ${agentName}`);

  // Get historical docs
  const histSnap = await getDocs(query(collection(db, 'historico_completados')));
  
  let totalSprint = 0;
  let agentSprint = 0;
  
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  const isAgentMatch = (nameA: string, nameB: string) => {
    if (!nameA || !nameB) return false;
    const cleanA = normalize(nameA);
    const cleanB = normalize(nameB);
    if (cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA)) return true;
    const partsA = cleanA.split(' ').filter(Boolean);
    const partsB = cleanB.split(' ').filter(Boolean);
    if (partsA.length > 0 && partsB.length > 0) {
      if (partsA[0] === partsB[0]) {
        if (partsA.length > 1 && partsB.length > 1) {
          if (partsA[1].startsWith(partsB[1]) || partsB[1].startsWith(partsA[1])) return true;
        } else {
          return true;
        }
      }
    }
    return false;
  };
  
  histSnap.docs.forEach(doc => {
     const data = doc.data();
     const sprintValue = String(data.sprint_trabajo || data['Semana Actual'] || '').toLowerCase().trim();
     if (sprintValue === sprint.toLowerCase() || sprintValue.includes('06/07/2026 - 12/07/2026')) {
         totalSprint++;
         const assigned = data["Assigned To"] || data["assignedTo"] || data["Técnico asignado"] || data["Tecnico asignado"] || data["Asignado"] || data["Agent"] || "";
         if (isAgentMatch(agentName, assigned)) {
             agentSprint++;
         }
     }
  });
  console.log(`Total tickets in sprint ${sprint} for agent ${agentName}: ${agentSprint}`);
}
check().catch(console.error).then(() => process.exit(0));
