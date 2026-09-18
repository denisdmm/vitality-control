export interface DateRange {
  from: Date | undefined;
  to?: Date | undefined;
}

/** "yyyy-MM-dd" a partir de Date local ou string ISO do backend. */
export function toYMD(d: Date | string): string {
  if (typeof d === 'string') return d.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Interpreta datas do backend ("2026-09-17T00:00:00.000Z") e também
 * "yyyy-MM-dd" como data LOCAL (evita drift de fuso horário no pt-BR).
 */
export function parseIsoDate(value: string): Date {
  const ymd = value.slice(0, 10);
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** dd/MM/yyyy */
export function fmtDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** dd/MM/yyyy a partir de string ISO do backend. */
export function fmtIso(d: string | null | undefined): string {
  if (!d) return '-';
  return fmtDate(parseIsoDate(d));
}

/** dd/MM/yy */
export function fmtShort(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear()).slice(2)}`;
}

export function fmtIsoShort(d: string | null | undefined): string {
  if (!d) return '-';
  return fmtShort(parseIsoDate(d));
}

/** Padroniza com a primeira letra de cada palavra maiúscula. */
export function capitalizeName(name: string): string {
  return name
    .split(' ')
    .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** dias atrás (local) */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Nomes de dias/meses em pt-BR. */
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MONTHS_PT = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const MONTHS_PT_SHORT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

/** "17 de setembro de 2026" */
export function fmtLong(d: Date): string {
  return `${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}

/** "sábado, 17 de setembro de 2026" */
export const WEEKDAYS_FULL = [
  'domingo', 'segunda-feira', 'terça-feira', 'quarta-feira',
  'quinta-feira', 'sexta-feira', 'sábado',
];
export function fmtWeekdayLong(d: Date): string {
  return `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS_PT[d.getMonth()]} de ${d.getFullYear()}`;
}