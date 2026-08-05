import { 
  AsistenciaRow,
} from '../types';
import {
  db,
  getWeekRange,
  getDayOfWeek
} from './firebaseService';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { fetchAgents } from './firebaseService';

export async function fetchAsistencia(): Promise<AsistenciaRow[] | null> {
  try {
    const snapshot = await getDocs(collection(db, 'asistencia'));
    const rows: AsistenciaRow[] = [];
    
    // We also need agent names
    const agents = await fetchAgents();
    const agentMap = new Map(agents.map(a => [a.id, a.name]));

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.weeks) return;
      
      const agentId = data.agentId;
      const nombreAgente = agentMap.get(agentId) || 'Desconocido';
      
      for (const [weekRange, days] of Object.entries(data.weeks)) {
        for (const [dayOfWeek, dayData] of Object.entries(days as any)) {
            rows.push({
                id: `${(dayData as any).fecha || weekRange}_${agentId}`,
                fecha: (dayData as any).fecha || weekRange,
                idAgente: agentId,
                nombreAgente: nombreAgente,
                checkIn: (dayData as any).checkIn,
                checkOut: (dayData as any).checkOut,
                estado: (dayData as any).estado,
                ultimaActualizacion: ''
            });
        }
      }
    });
    return rows;
  } catch (err) {
    console.error("Error al obtener asistencia de Firestore:", err);
    return [];
  }
}

export async function pushAsistencia(
  rows: any[]
): Promise<void> {
  try {
    for (const row of rows) {
      const agentId = row.idAgente;
      const month = row.fecha.substring(0, 7); // YYYY-MM
      const docId = `${month}_${agentId}`;
      const weekRange = getWeekRange(row.fecha);
      const dayOfWeek = getDayOfWeek(row.fecha);
      
      const docRef = doc(db, 'asistencia', docId);

      await setDoc(docRef, {
        agentId: agentId,
        month: month,
        weeks: {
          [weekRange]: {
            [dayOfWeek]: {
              checkIn: row.checkIn !== undefined ? row.checkIn : "",
              checkOut: row.checkOut !== undefined ? row.checkOut : "",
              estado: row.estado !== undefined ? row.estado : "",
              fecha: row.fecha || ""
            }
          }
        }
      }, { merge: true });
    }
  } catch (err) {
    console.error("Error al guardar asistencia en Firestore:", err);
  }
}

export function subscribeToAsistencia(
  agents: any[],
  callback: (rows: AsistenciaRow[]) => void
): () => void {
  const agentMap = new Map(agents.map(a => [a.id, a.name]));
  return onSnapshot(collection(db, 'asistencia'), (snapshot) => {
    const rows: AsistenciaRow[] = [];
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (!data.weeks) return;
      
      const agentId = data.agentId;
      const nombreAgente = agentMap.get(agentId) || 'Desconocido';
      
      for (const [weekRange, days] of Object.entries(data.weeks)) {
        for (const [dayOfWeek, dayData] of Object.entries(days as any)) {
          rows.push({
            id: `${(dayData as any).fecha || weekRange}_${agentId}`,
            fecha: (dayData as any).fecha || weekRange,
            idAgente: agentId,
            nombreAgente: nombreAgente,
            checkIn: (dayData as any).checkIn || "",
            checkOut: (dayData as any).checkOut || "",
            estado: (dayData as any).estado || "",
            ultimaActualizacion: ''
          });
        }
      }
    });
    callback(rows);
  });
}

export async function fixExistingAsistenciaDocuments(docIds: string[]): Promise<void> {
  try {
    for (const docId of docIds) {
      const docRef = doc(db, 'asistencia', docId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updatedWeeks = { ...data.weeks };
        for (const week in updatedWeeks) {
          for (const day in updatedWeeks[week]) {
            if (!updatedWeeks[week][day].fecha) {
              updatedWeeks[week][day].fecha = "";
            }
          }
        }
        await updateDoc(docRef, { weeks: updatedWeeks });
      }
    }
    console.log("Asistencia documents fixed successfully.");
  } catch (err) {
    console.error("Error fixing asistencia documents:", err);
  }
}
