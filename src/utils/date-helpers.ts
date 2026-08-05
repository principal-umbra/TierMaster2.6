export const formatFlexibleDate = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('es-ES', { 
      day: '2-digit', month: '2-digit', year: '2-digit', 
      hour: '2-digit', minute: '2-digit' 
    });
  } catch (e) {
    return dateStr;
  }
};

export const parseFlexibleDateToDateTimeLocal = (dateStr?: string) => {
  if (!dateStr) return '';
  try {
    // If it's already YYYY-MM-DDThh:mm
    if (dateStr.includes('T')) return dateStr;
    
    // If it's DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const formatted = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}T00:00`;
      return formatted;
    }
    
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 16);
    }
  } catch (e) {}
  return '';
};
