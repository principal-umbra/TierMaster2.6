const fs = require('fs');

let content = fs.readFileSync('src/App.tsx', 'utf8');

// 1. Add imports to App.tsx
if (!content.includes('subscribeToCRMData')) {
    content = content.replace(/import { fetchAgents, fetchTiers, fetchCertifications, fetchTasks, subscribeToAgents, subscribeToContractors, saveEvents, subscribeToIsolatedEvents, updateAgentData } from '\.\/db\/firebaseService';/,
    "import { fetchAgents, fetchTiers, fetchCertifications, fetchTasks, subscribeToAgents, subscribeToContractors, saveEvents, subscribeToIsolatedEvents, updateAgentData, subscribeToCRMData } from './db/firebaseService';");
}

if (!content.includes('const DEFAULT_HEADERS =')) {
    content = content.replace(/const \[crmData, setCrmData\] = useState<any\[\]>\(\(\) => \{/,
    "const DEFAULT_HEADERS = ['ID', 'Título', 'Técnico Asignado', 'Cliente', 'Estado'];\n" +
    "  const [crmData, setCrmData] = useState<any[]>(() => {");
}

// We need the `standardizeCRMData` function logic or at least we need to save the rows directly.
// Actually, `RequestBacklogTab` standardizes it. If we subscribe directly, we might not have `standardizeCRMData` in App.tsx.
// It's better to just leave App.tsx reading from localStorage but ensure it polls or something, OR we can copy standardizeCRMData to App.tsx?
