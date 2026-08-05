const isAgentNameMatch = (agentName: string, assignedTo: string): boolean => {
  if (!agentName || !assignedTo) return false;
  
  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  
  const nAgent = normalize(agentName);
  const nAssigned = normalize(assignedTo);
  
  if (nAgent === nAssigned) return true;
  
  const agentParts = nAgent.split(' ');
  const assignedParts = nAssigned.split(' ');
  
  if (agentParts.length >= 2 && assignedParts.length >= 2) {
    if (assignedParts[0] === agentParts[0] && assignedParts[1] === agentParts[1]) {
      return true;
    }
  }
  
  return nAssigned.includes(nAgent);
};

console.log(isAgentNameMatch('Andri Dominguez', 'Andri Domínguez'));
