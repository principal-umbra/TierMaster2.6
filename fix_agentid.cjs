const fs = require('fs');
let code = fs.readFileSync('src/db/firebaseService.ts', 'utf8');

const t = `        // 1. Desempeño por Backlog Tickets (CRM)
        const agentTickets = !lbSettings.sourceCrm ? [] : crmTickets.filter((ticket: any) => {
          if (!checkSprintMatch(ticket, sprintFilter || 'all')) return false;
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || "";
          return isAgentNameMatch(a.name, assigned);
        });

        const agentWeeklyTickets = !lbSettings.sourceWeekly ? [] : weeklyTickets.filter((ticket: any) => {
          if (!checkSprintMatch(ticket, sprintFilter || 'all')) return false;
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || "";
          return isAgentNameMatch(a.name, assigned);
        });

        const agentHistoricalTickets = !(lbSettings.sourceHistorical || lbSettings.sourceAdminDone) ? [] : historicalTickets.filter((ticket: any) => {
          if (!checkSprintMatch(ticket, sprintFilter || 'all')) return false;
          const assigned = ticket["Assigned To"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || "";
          return isAgentNameMatch(a.name, assigned);
        });`;

const r = `        // 1. Desempeño por Backlog Tickets (CRM)
        const isTicketForAgent = (ticket: any, agent: Agent): boolean => {
           const tAgentId = String(ticket.agentid || ticket.agentId || ticket['Agent ID'] || ticket.idAgente || '').trim();
           if (tAgentId && tAgentId.toLowerCase() === agent.id.toLowerCase()) return true;
           
           const assigned = ticket["Assigned To"] || ticket["assignedTo"] || ticket["Técnico asignado"] || ticket["Tecnico asignado"] || ticket["Asignado"] || ticket["Agent"] || "";
           return isAgentNameMatch(agent.name, assigned);
        };

        const agentTickets = !lbSettings.sourceCrm ? [] : crmTickets.filter((ticket: any) => {
          if (!checkSprintMatch(ticket, sprintFilter || 'all')) return false;
          return isTicketForAgent(ticket, a);
        });

        const agentWeeklyTickets = !lbSettings.sourceWeekly ? [] : weeklyTickets.filter((ticket: any) => {
          if (!checkSprintMatch(ticket, sprintFilter || 'all')) return false;
          return isTicketForAgent(ticket, a);
        });

        const agentHistoricalTickets = !(lbSettings.sourceHistorical || lbSettings.sourceAdminDone) ? [] : historicalTickets.filter((ticket: any) => {
          if (!checkSprintMatch(ticket, sprintFilter || 'all')) return false;
          return isTicketForAgent(ticket, a);
        });`;

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/db/firebaseService.ts', code);
  console.log('Fixed agentid mapping!');
} else {
  console.log('Not found!');
}
