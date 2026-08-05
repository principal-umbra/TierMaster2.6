import { initializeApp } from "firebase/app";
import { initializeFirestore, collection, getDocs } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);

const actualDbId = (config.firestoreDatabaseId && 
                    config.firestoreDatabaseId !== config.projectId && 
                    config.firestoreDatabaseId !== '(default)')
    ? config.firestoreDatabaseId
    : '(default)';

const db = initializeFirestore(app, {
  experimentalForceLongPolling: true
}, actualDbId);

async function run() {
  const crmSnap = await getDocs(collection(db, 'requerimientos_en_curso'));
  const rows = crmSnap.docs.map(d => d.data());
  
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const agentKey = headers.find(h => 
      h.toLowerCase() === 'técnico asignado' || 
      h.toLowerCase() === 'tecnico asignado' || 
      h.toLowerCase() === 'asignado' || 
      h.toLowerCase() === 'agent' || 
      h.toLowerCase() === 'assigned to' ||
      h.toLowerCase() === 'tecnico' ||
      h.toLowerCase() === 'asignado a' ||
      h.toLowerCase() === 'contratista' ||
      h.toLowerCase() === 'contractor'
  ) || 'Assigned To';

  function normalize(name) {
      if(!name) return '';
      return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }
  function isMatch(nameA, nameB) {
      if(!nameA || !nameB) return false;
      const cA = normalize(nameA);
      const cB = normalize(nameB);
      if(cA === cB || cA.includes(cB) || cB.includes(cA)) return true;
      const pA = cA.split(' ').filter(Boolean);
      const pB = cB.split(' ').filter(Boolean);
      if(pA.length > 0 && pB.length > 0 && pA[0] === pB[0]) {
         if (pA.length > 1 && pB.length > 1) {
             if (pA[1].startsWith(pB[1]) || pB[1].startsWith(pA[1])) {
                 return true;
             }
         } else {
             return true;
         }
      }
      return false;
  }

  const contSnap = await getDocs(collection(db, 'contractors')).catch(() => ({docs:[]}));
  const contractors = contSnap.docs.map(d => d.data());

  let found = [];
  rows.forEach(r => {
      const val = r[agentKey] || '';
      if (contractors.some(c => isMatch(c.name, val))) {
          found.push({id: r.ID || r.id, assigned: val, status: r['Estado'] || r['Status']});
      }
  });

  console.log("Contractor assigned requests:", found);
  process.exit(0);
}
run();
