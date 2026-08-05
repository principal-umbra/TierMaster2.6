const fs = require('fs');
let code = fs.readFileSync('src/db/firebaseService.ts', 'utf8');

const target = `const isDateInActiveWeek = (dateStr: string, activeWeekStr: string): boolean => {
  if (!activeWeekStr || !dateStr) return true;
  try {
    const match = activeWeekStr.match(/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s*-\\s*(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/);
    if (!match) return true;
    const [, d1, m1, y1, d2, m2, y2] = match;
    const startDate = new Date(Number(y1), Number(m1) - 1, Number(d1), 0, 0, 0);
    const endDate = new Date(Number(y2), Number(m2) - 1, Number(d2), 23, 59, 59);
    
    let checkDate: Date;
    if (dateStr.includes('-')) {
      const [y, m, d] = dateStr.split('-').map(Number);
      checkDate = new Date(y, m - 1, d, 12, 0, 0);
    } else if (dateStr.includes('/')) {
      const [d, m, y] = dateStr.split('/').map(Number);
      checkDate = new Date(y, m - 1, d, 12, 0, 0);
    } else {
      return true;
    }
    return checkDate >= startDate && checkDate <= endDate;
  } catch (e) {
    return true;
  }
};`;

const replacement = `const isDateInActiveWeek = (dateStr: string, activeWeekStr: string): boolean => {
  if (!activeWeekStr || !dateStr) return false;
  try {
    const match = activeWeekStr.match(/(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})\\s*-\\s*(\\d{1,2})\\/(\\d{1,2})\\/(\\d{4})/);
    if (!match) return false;
    const [, d1, m1, y1, d2, m2, y2] = match;
    const startDate = new Date(Number(y1), Number(m1) - 1, Number(d1), 0, 0, 0);
    const endDate = new Date(Number(y2), Number(m2) - 1, Number(d2), 23, 59, 59);
    
    let checkDate: Date;
    
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      checkDate = parsed;
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length >= 3) {
        const [d, m, y] = parts.map(Number);
        checkDate = new Date(y, m - 1, d, 12, 0, 0);
      } else {
        return false;
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split(' ')[0].split('-');
      if (parts.length >= 3) {
        const [d, m, y] = parts.map(Number);
        if (y > 31) {
           checkDate = new Date(y, m - 1, d, 12, 0, 0);
        } else {
           checkDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]), 12, 0, 0);
        }
      } else {
        return false;
      }
    } else {
      return false;
    }
    
    return checkDate >= startDate && checkDate <= endDate;
  } catch (e) {
    return false;
  }
};

const isTicketInSprint = (ticket: any, sprintFilter: string): boolean => {
  if (!sprintFilter || sprintFilter === 'all') return true;
  
  const ticketSprint = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').trim();
  if (ticketSprint && ticketSprint === sprintFilter) return true;
  if (ticketSprint && ticketSprint !== sprintFilter) return false;
  
  const dateStr = String(ticket['Resolved Date'] || ticket.fecha || ticket['Created Date'] || ticket.Date || '').trim();
  if (dateStr) {
     return isDateInActiveWeek(dateStr, sprintFilter);
  }
  
  return false;
};`;

if (!code.includes(target)) {
  console.log("Could not find target!");
  process.exit(1);
}
code = code.replace(target, replacement);

// Replace in agentTickets
const targetCrm = `        const agentTickets = !lbSettings.sourceCrm ? [] : crmTickets.filter((ticket: any) => {
          if (sprintFilter && sprintFilter !== 'all') {
            const ticketSprint = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').trim();
            // crmTickets usually don't have sprint_trabajo, they might be skipped or matched if active sprint
            // Let's assume if it has no sprint_trabajo it belongs to current activeWeek. 
            // We'll filter strictly:
            if (ticketSprint && ticketSprint !== sprintFilter) return false;
            // If it doesn't have sprint, we could optionally filter by activeWeek, but let's just check if it matches
          }
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || "";
          return isAgentNameMatch(a.name, assigned);
        });`;
        
const replaceCrm = `        const agentTickets = !lbSettings.sourceCrm ? [] : crmTickets.filter((ticket: any) => {
          if (!isTicketInSprint(ticket, sprintFilter || 'all')) return false;
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || "";
          return isAgentNameMatch(a.name, assigned);
        });`;

if (!code.includes(targetCrm)) {
   console.log("Could not find CRM target!");
   process.exit(1);
}
code = code.replace(targetCrm, replaceCrm);

// Replace in agentWeeklyTickets
const targetWeekly = `        const agentWeeklyTickets = !lbSettings.sourceWeekly ? [] : weeklyTickets.filter((ticket: any) => {
          if (sprintFilter && sprintFilter !== 'all') {
            const ticketSprint = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').trim();
            if (ticketSprint !== sprintFilter && ticketSprint) return false;
          }
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || "";
          return isAgentNameMatch(a.name, assigned);
        });`;

const replaceWeekly = `        const agentWeeklyTickets = !lbSettings.sourceWeekly ? [] : weeklyTickets.filter((ticket: any) => {
          if (!isTicketInSprint(ticket, sprintFilter || 'all')) return false;
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || "";
          return isAgentNameMatch(a.name, assigned);
        });`;
        
if (!code.includes(targetWeekly)) {
   console.log("Could not find Weekly target!");
   process.exit(1);
}
code = code.replace(targetWeekly, replaceWeekly);

// Replace in agentHistoricalTickets
const targetHist = `        const agentHistoricalTickets = !(lbSettings.sourceHistorical || lbSettings.sourceAdminDone) ? [] : historicalTickets.filter((ticket: any) => {
          if (sprintFilter && sprintFilter !== 'all') {
            const ticketSprint = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').trim();
            if (ticketSprint !== sprintFilter) return false;
          }
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || "";
          return isAgentNameMatch(a.name, assigned);
        });`;

const replaceHist = `        const agentHistoricalTickets = !(lbSettings.sourceHistorical || lbSettings.sourceAdminDone) ? [] : historicalTickets.filter((ticket: any) => {
          if (!isTicketInSprint(ticket, sprintFilter || 'all')) return false;
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || "";
          return isAgentNameMatch(a.name, assigned);
        });`;

if (!code.includes(targetHist)) {
   console.log("Could not find Hist target!");
   process.exit(1);
}
code = code.replace(targetHist, replaceHist);

fs.writeFileSync('src/db/firebaseService.ts', code);
console.log("Done patching firebaseService.ts");
