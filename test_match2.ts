const isDateInActiveWeek = (dateStr: string, activeWeekStr: string): boolean => {
  return false; // Stub
};

const checkSprintMatch = (ticket: any, sprintFilter: string): boolean => {
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
};

const ticket = {
  'Semana Actual': '',
  'Resolved Date': '',
  sprint_trabajo: 'Semana 06/07/2026 - 12/07/2026',
  fecha_visita: '',
  'Assigned To': 'Andri Domínguez',
  'Request Type': '',
  Status: 'Closed',
  'Estado Registro': 'COMPLETADO',
  'Created Date': 'Mar 6, 2026 12:58 PM',
  'Nota Interna': '',
  id: '32281',
  'Clasificación Log': '',
  ID: '32281',
  estado_visita: '',
  Contact: 'Christian Fernández',
  'Merged Into': '',
  Subject: 'FHONS - Cambio de PC CF HOME por una MFF y la actual convertir en UNTANGLE',
  Priority: 'Mantenimiento',
  Account: 'F.H.O.N.S.'
};

console.log('Sprint match:', checkSprintMatch(ticket, 'Semana 06/07/2026 - 12/07/2026'));
