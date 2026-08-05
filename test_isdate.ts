const isDateInActiveWeek = (dateStr: string, activeWeekStr: string): boolean => {
  if (!activeWeekStr || !dateStr || dateStr === 'N/A') return false;
  try {
    const match = activeWeekStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s*-\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return false;
    const [, d1, m1, y1, d2, m2, y2] = match;
    const startDate = new Date(Number(y1), Number(m1) - 1, Number(d1), 0, 0, 0);
    const endDate = new Date(Number(y2), Number(m2) - 1, Number(d2), 23, 59, 59);
    
    let checkDate: Date | null = null;
    
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      checkDate = parsed;
    } else if (dateStr.includes('/')) {
      const parts = dateStr.split(' ')[0].split('/');
      if (parts.length >= 3) {
        const [d, m, y] = parts.map(Number);
        checkDate = new Date(y, m - 1, d, 12, 0, 0);
      }
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split(' ')[0].split('-');
      if (parts.length >= 3) {
        const p0 = Number(parts[0]);
        const p1 = Number(parts[1]);
        const p2 = Number(parts[2]);
        if (p0 > 1900) { // YYYY-MM-DD
          checkDate = new Date(p0, p1 - 1, p2, 12, 0, 0);
        } else if (p2 > 1900) { // DD-MM-YYYY
          checkDate = new Date(p2, p1 - 1, p0, 12, 0, 0);
        }
      }
    }
    
    if (!checkDate || isNaN(checkDate.getTime())) return false;
    
    console.log(`checkDate: ${checkDate.toISOString()}, startDate: ${startDate.toISOString()}, endDate: ${endDate.toISOString()}`);
    return checkDate >= startDate && checkDate <= endDate;
  } catch (e) {
    return false;
  }
};

console.log(isDateInActiveWeek("2026-07-09", "Semana 13/07/2026 - 19/07/2026"));
