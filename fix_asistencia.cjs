const fs = require('fs');
let code = fs.readFileSync('src/db/firebaseService.ts', 'utf8');

const t = `          let points = 0;
          let isMissing = false;
          
          let eCheckIns = 0, oCheckIns = 0, gCheckIns = 0, lCheckIns = 0, mCheckIns = 0;

          if (isRemoto) {
            // Remoto: no cuenta checkin ni checkout
            points = lbSettings.onTimeCheckIns; // Assuming it gives normal points like vacations? Or maybe 0. Let's give 10 so it's not penalized, or 0. Let's give 0 points but not penalize. Actually, standard present is 10. Let's give 10.
            oCheckIns++;
          } else if (expectedCheckIn && att.checkIn) {
            try {
              const [cHour, cMin] = att.checkIn.split(':').map(Number);
              const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
              
              if (!isNaN(cHour) && !isNaN(cMin) && !isNaN(eHour) && !isNaN(eMin)) {
                const diff = (cHour * 60 + cMin) - (eHour * 60 + eMin);
                if (diff < 0) {
                  points = lbSettings.earlyCheckIns;
                  eCheckIns++;
                } else if (diff === 0) {
                  points = lbSettings.onTimeCheckIns;
                  oCheckIns++;
                } else if (diff > 0 && diff <= 15) {
                  points = lbSettings.graceCheckIns;
                  gCheckIns++;
                } else {
                  points = lbSettings.lateCheckIns;
                  lCheckIns++;
                }
              }
            } catch (e) {
              console.error('Error parsing checkIn', e);
            }
          } else if (expectedCheckIn && !att.checkIn && att.estado !== 'Permiso' && att.estado !== 'Vacaciones' && att.estado !== 'Visita') {
            points = lbSettings.missingCheckIns; // Inasistencia
            mCheckIns++;
            isMissing = true;
          } else if (att.estado === 'Permiso' || att.estado === 'Vacaciones' || att.estado === 'Visita') {
            points = lbSettings.onTimeCheckIns;
            oCheckIns++;
          }

          attendanceScore += points;
          
          earlyCheckIns += eCheckIns;
          onTimeCheckIns += oCheckIns;
          graceCheckIns += gCheckIns;
          lateCheckIns += lCheckIns;
          missingCheckIns += mCheckIns;

          if (isRemoto || expectedCheckIn || att.estado === 'Permiso' || att.estado === 'Vacaciones' || att.estado === 'Visita') {
            let finalEstado = att.estado;
            if (isRemoto) {
              finalEstado = "Remoto";
            } else if (!finalEstado) {
              if (isMissing) finalEstado = "Falta";
              else if (points > 0) finalEstado = points === 12 ? "Temprano" : "A Tiempo";
              else if (points === 5) finalEstado = "Gracia";
              else finalEstado = "Tardanza";
            }
            attendanceDetail.push({
              fecha: att.fecha,
              checkIn: isRemoto ? "--:--" : (att.checkIn || "--:--"),
              expectedCheckIn: isRemoto ? "Remoto" : (expectedCheckIn || "N/A"),
              points: points,
              estado: finalEstado
            });
          }`;

const r = `          let points = 0;
          let isMissing = false;
          let isFuture = false;
          let isJustified = false;
          let eCheckIns = 0, oCheckIns = 0, gCheckIns = 0, lCheckIns = 0, mCheckIns = 0;

          // Convert current date in local timezone to YYYY-MM-DD
          const todayStr = new Date().toLocaleDateString('en-CA');
          if (att.fecha && att.fecha > todayStr) {
             isFuture = true;
          }

          if (isRemoto || att.estado === 'Permiso' || att.estado === 'Vacaciones' || att.estado === 'Visita' || att.estado === 'Justificado' || att.esJustificacion) {
            // Justificados y remoto valen 0 puntos, no restan ni suman
            points = 0;
            isJustified = true;
          } else if (expectedCheckIn && att.checkIn) {
            try {
              const [cHour, cMin] = att.checkIn.split(':').map(Number);
              const [eHour, eMin] = expectedCheckIn.split(':').map(Number);
              
              if (!isNaN(cHour) && !isNaN(cMin) && !isNaN(eHour) && !isNaN(eMin)) {
                const diff = (cHour * 60 + cMin) - (eHour * 60 + eMin);
                if (diff < 0) {
                  points = lbSettings.earlyCheckIns;
                  eCheckIns++;
                } else if (diff === 0) {
                  points = lbSettings.onTimeCheckIns;
                  oCheckIns++;
                } else if (diff > 0 && diff <= 15) {
                  points = lbSettings.graceCheckIns;
                  gCheckIns++;
                } else {
                  points = lbSettings.lateCheckIns;
                  lCheckIns++;
                }
              }
            } catch (e) {
              console.error('Error parsing checkIn', e);
            }
          } else if (expectedCheckIn && !att.checkIn) {
            if (isFuture) {
               points = 0; // No se penaliza dias futuros
            } else {
               points = lbSettings.missingCheckIns; // Inasistencia (-15 por ejemplo)
               mCheckIns++;
               isMissing = true;
            }
          }

          attendanceScore += points;
          
          earlyCheckIns += eCheckIns;
          onTimeCheckIns += oCheckIns;
          graceCheckIns += gCheckIns;
          lateCheckIns += lCheckIns;
          missingCheckIns += mCheckIns;

          if (isRemoto || expectedCheckIn || att.estado === 'Permiso' || att.estado === 'Vacaciones' || att.estado === 'Visita' || att.estado === 'Justificado' || att.esJustificacion) {
            let finalEstado = att.estado;
            if (isRemoto) {
              finalEstado = "Remoto";
            } else if (!finalEstado) {
              if (isFuture && !att.checkIn) finalEstado = "Pendiente";
              else if (isMissing) finalEstado = "Falta";
              else if (points > 0) finalEstado = points === 12 ? "Temprano" : "A Tiempo";
              else if (points === 5) finalEstado = "Gracia";
              else finalEstado = "Tardanza";
            }
            if (isJustified && !finalEstado) {
                finalEstado = att.estado || "Justificado";
            }
            attendanceDetail.push({
              fecha: att.fecha,
              checkIn: isRemoto ? "--:--" : (att.checkIn || "--:--"),
              expectedCheckIn: isRemoto ? "Remoto" : (expectedCheckIn || "N/A"),
              points: points,
              estado: finalEstado
            });
          }`;

if (code.includes(t)) {
  code = code.replace(t, r);
  fs.writeFileSync('src/db/firebaseService.ts', code);
  console.log('Fixed asistencia!');
} else {
  console.log('Not found!');
}
