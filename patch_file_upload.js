import fs from 'fs';
const content = fs.readFileSync('src/components/request-backlog/RequestBacklogTab.tsx', 'utf-8');

const helpers = `
function parseExcelDate(val) {
  if (!val) return null;
  const str = String(val).trim();
  if (/^\\d+$/.test(str)) { 
      const num = parseInt(str, 10);
      const excelEpoch = new Date(1899, 11, 30);
      return new Date(excelEpoch.getTime() + num * 86400000);
  }
  if (str.includes('/')) {
    const parts = str.split('/');
    if (parts.length >= 3) {
      let yearPart = parts[2].split(' ')[0];
      if (yearPart.length === 4) {
          return new Date(Number(yearPart), Number(parts[1]) - 1, Number(parts[0]));
      }
    }
  } else if (str.includes('-')) {
    const parts = str.split('-');
    if (parts.length >= 3) {
        if (parts[0].length === 4) {
           return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2].split(' ')[0]));
        } else if (parts[2].split(' ')[0].length === 4) {
           return new Date(Number(parts[2].split(' ')[0]), Number(parts[1]) - 1, Number(parts[0]));
        }
    }
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;
  return null;
}

function isDateInWeekRange(dateStr, currentWeekRange) {
    if (!currentWeekRange || !dateStr) return true; // Si no hay fecha o rango, asumimos válido para no bloquear
    const parts = currentWeekRange.split(' - ');
    if (parts.length !== 2) return true; 
    
    const startStr = parts[0].replace('Semana ', '').trim();
    const endStr = parts[1].trim();
    
    const parseDDMMYYYY = (s) => {
        const [d,m,y] = s.split('/').map(Number);
        return new Date(y, m-1, d);
    };
    
    const startDate = parseDDMMYYYY(startStr);
    const endDate = parseDDMMYYYY(endStr);
    const targetDate = parseExcelDate(dateStr);
    if (!targetDate) return true; // si no pudimos parsear, mejor pasarlo que bloquearlo
    
    targetDate.setHours(0,0,0,0);
    startDate.setHours(0,0,0,0);
    endDate.setHours(23,59,59,999);
    
    return targetDate >= startDate && targetDate <= endDate;
}
`;

const originalCode = `          if (doneName) {
            const worksheet = workbook.Sheets[doneName];
            const rawDoneRows = xlsx.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });
            const headers = rawDoneRows.length > 0 ? Object.keys(rawDoneRows[0]) : [];
            const doneRows = standardizeCRMData({ headers, rows: rawDoneRows }).rows;
            
            doneRows.forEach(row => {
              const idVal = String(row.ID || row.id || '').trim();
              const idValUpper = idVal.toUpperCase();
              if (!idVal) return;
              
              const isInEnCurso = enCursoRows.some(er => String(er.ID || er.id || '').trim().toUpperCase() === idValUpper);
              const isAlreadyInNewDone = newDoneRows.some(dr => String(dr.ID || dr.id || '').trim().toUpperCase() === idValUpper);
              if (!historicalIdsSet.has(idValUpper) && !doneIdsSet.has(idValUpper) && !isInEnCurso && !isAlreadyInNewDone) {
                const newRow = { ...row };
                newRow['Estado Registro'] = 'PENDIENTE A CONFIRMAR';
                newRow['sprint_trabajo'] = activeWeek;
                newDoneRows.push(newRow);
              }
            });
          }
          
          const discrepancies: Record<string, string>[] = [];`;

const replacementCode = `          const discrepancies: Record<string, string>[] = [];
          
${helpers}

          if (doneName) {
            const worksheet = workbook.Sheets[doneName];
            const rawDoneRows = xlsx.utils.sheet_to_json<Record<string, string>>(worksheet, { defval: '' });
            const headers = rawDoneRows.length > 0 ? Object.keys(rawDoneRows[0]) : [];
            const doneRows = standardizeCRMData({ headers, rows: rawDoneRows }).rows;
            
            doneRows.forEach(row => {
              const idVal = String(row.ID || row.id || '').trim();
              const idValUpper = idVal.toUpperCase();
              if (!idVal) return;
              
              const isInEnCurso = enCursoRows.some(er => String(er.ID || er.id || '').trim().toUpperCase() === idValUpper);
              const isAlreadyInNewDone = newDoneRows.some(dr => String(dr.ID || dr.id || '').trim().toUpperCase() === idValUpper);
              if (!historicalIdsSet.has(idValUpper) && !doneIdsSet.has(idValUpper) && !isInEnCurso && !isAlreadyInNewDone) {
                const resolvedDateVal = row['Resolved Date'] || row['resolved date'] || row['Fecha Resuelto'] || '';
                const inRange = isDateInWeekRange(resolvedDateVal, activeWeek);
                
                if (inRange) {
                    const newRow = { ...row };
                    newRow['Estado Registro'] = 'PENDIENTE A CONFIRMAR';
                    newRow['sprint_trabajo'] = activeWeek;
                    newDoneRows.push(newRow);
                } else {
                    discrepancies.push({
                         ID: idValUpper,
                         Title: row['Título'] || row.Title || row.title || 'S/N',
                         AssignedTo: row['Técnico Asignado'] || row['Assigned To'] || row.agent || 'N/A',
                         Status: \`Fecha Completado fuera de la semana en curso (\${resolvedDateVal})\`
                    });
                }
              }
            });
          }`;

if (!content.includes('const discrepancies: Record<string, string>[] = [];')) {
  console.log("Could not find original code block.");
  process.exit(1);
}

fs.writeFileSync('src/components/request-backlog/RequestBacklogTab.tsx', content.replace(originalCode, replacementCode));
console.log("Patched file upload logic to check date range");
