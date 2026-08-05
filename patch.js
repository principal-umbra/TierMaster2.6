import fs from 'fs';
let code = fs.readFileSync('src/db/firebaseService.ts', 'utf8');

code = code.replace(
`            const isVisita = ticket.estado_visita !== undefined || ticket.direccion_visita !== undefined || String(ticket.Tipo || ticket.tipo || ticket.Type || '').toLowerCase().includes('visita');
            const isEscalacion = String(ticket.Tipo || ticket.tipo || ticket.Type || '').toLowerCase().includes('escalaci') || String(ticket.Escalado || '').toLowerCase() === 'sí' || String(ticket.Escalado || '').toLowerCase() === 'si';`,
`            const isMetricsOn = isMetricsEligible(sprint);
            const isVisita = isMetricsOn && (ticket.estado_visita !== undefined || ticket.direccion_visita !== undefined || String(ticket.Tipo || ticket.tipo || ticket.Type || '').toLowerCase().includes('visita'));
            const isEscalacion = isMetricsOn && (String(ticket.Tipo || ticket.tipo || ticket.Type || '').toLowerCase().includes('escalaci') || String(ticket.Escalado || '').toLowerCase() === 'sí' || String(ticket.Escalado || '').toLowerCase() === 'si');`
);

fs.writeFileSync('src/db/firebaseService.ts', code);
