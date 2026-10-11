// Timezone utilities for El Salvador (America/El_Salvador / UTC-6)
// El Salvador does not observe Daylight Saving Time (UTC-6 year-round)
export const EL_SALVADOR_TZ = 'America/El_Salvador';

function parseDateInput(input?: Date | string | number | null): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Returns 'YYYY-MM-DD' for current or given date strictly in El Salvador timezone (UTC-6)
 */
export function getElSalvadorDate(date?: Date | string | number | null): string {
  const d = parseDateInput(date);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: EL_SALVADOR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * Returns formatted 12-hour time 'hh:mm:ss a' strictly in El Salvador timezone (UTC-6)
 * Example: '01:49:54 p. m.' or '07:15:20 a. m.'
 */
export function getElSalvadorTime(date?: Date | string | number | null): string {
  const d = parseDateInput(date);
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: EL_SALVADOR_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Returns formatted 24-hour time 'HH:mm:ss' strictly in El Salvador timezone (UTC-6)
 * Example: '13:49:54'
 */
export function getElSalvadorTime24(date?: Date | string | number | null): string {
  const d = parseDateInput(date);
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: EL_SALVADOR_TZ,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
}

/**
 * Returns formatted short time 'hh:mm a' strictly in El Salvador timezone (UTC-6)
 * Example: '01:49 p. m.'
 */
export function getElSalvadorShortTime(date?: Date | string | number | null): string {
  const d = parseDateInput(date);
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: EL_SALVADOR_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Returns full date and time 'DD/MM/YYYY, hh:mm:ss a' strictly in El Salvador timezone (UTC-6)
 */
export function getElSalvadorDateTime(date?: Date | string | number | null): string {
  const d = parseDateInput(date);
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: EL_SALVADOR_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Returns long human readable date in Spanish for El Salvador
 * Example: 'Sábado, 10 de octubre de 2026'
 */
export function getElSalvadorLongDate(date?: Date | string | number | null): string {
  const d = parseDateInput(date);
  return new Intl.DateTimeFormat('es-SV', {
    timeZone: EL_SALVADOR_TZ,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}
