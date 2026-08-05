import { InternalTask } from '../types';

export const DAYS_OF_WEEK = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export function createDefaultWeeklySchedule(baseSchedule: string): { [day: string]: any } { // Using any for DailySchedule for now to avoid circular deps or import it
  let start = "08:00";
  let end = "17:00";
  if (baseSchedule && baseSchedule.includes('-')) {
    const parts = baseSchedule.split('-');
    start = parts[0]?.trim() || "08:00";
    end = parts[1]?.trim() || "17:00";
  }
  
  const schedule: { [day: string]: any } = {};
  DAYS_OF_WEEK.forEach((day, index) => {
    schedule[day] = {
      start,
      end: (day === 'Sábado' || day === 'Domingo') ? '13:00' : end,
      isRemote: false,
      isActive: true
    };
  });
  return schedule;
}

export function getRecurrenceDescription(task: InternalTask): string {
  if (task.type !== 'Recurrente') {
    if (task.type === 'Programada') {
      return `Programada para el ${task.scheduledDate || 'Sin fecha'}`;
    }
    return task.hasNoDate ? 'Tarea Única (Sin fecha definida)' : `Tarea Única (Programada: ${task.scheduledDate || 'Sin fecha'})`;
  }
  let baseDesc = '';
  switch (task.frequency) {
    case 'Diario':
      baseDesc = 'Todos los días';
      break;
    case 'Semanal':
      baseDesc = 'Semanal';
      break;
    default:
      baseDesc = 'Periódica';
  }
  return baseDesc;
}
