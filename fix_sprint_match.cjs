const fs = require('fs');
let code = fs.readFileSync('src/db/firebaseService.ts', 'utf8');

const targetHelper = `const isTicketInSprint = (ticket: any, sprintFilter: string): boolean => {
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

const newHelper = `const checkSprintMatch = (ticket: any, sprintFilter: string): boolean => {
  if (!sprintFilter || sprintFilter === 'all') return true;
  
  const cleanFilter = sprintFilter.toLowerCase().trim();
  const ticketSprint = String(ticket.sprint_trabajo || ticket['Semana Actual'] || '').toLowerCase().trim();
  
  if (ticketSprint) {
    return ticketSprint === cleanFilter;
  }
  
  const dateStr = String(ticket['Resolved Date'] || ticket['Fecha Completado'] || ticket.fecha || ticket['Created Date'] || ticket.Date || '').trim();
  if (dateStr) {
     return isDateInActiveWeek(dateStr, sprintFilter);
  }
  
  return false;
};`;

code = code.replace(targetHelper, newHelper);
code = code.replaceAll('isTicketInSprint', 'checkSprintMatch');

// Now update the CRM resolved condition
const targetCrmResolved = `          if (isStatusResolvedLocal(status)) {
            // CRM resolved tickets are excluded from working/pending count, mimicking Roster Analysis
          } else if (isStatusInProgressLocal(status)) {`;
          
const newCrmResolved = `          if (isStatusResolvedLocal(status)) {
            completedTickets++;
            performanceScore += lbSettings.completedTickets;
          } else if (isStatusInProgressLocal(status)) {`;

code = code.replace(targetCrmResolved, newCrmResolved);

fs.writeFileSync('src/db/firebaseService.ts', code);
console.log("Updated firebaseService.ts!");
