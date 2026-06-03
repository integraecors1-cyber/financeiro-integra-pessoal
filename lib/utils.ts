export function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function uid(): string {
  return crypto.randomUUID();
}

export function yyyymm(d: string) {
  if (!d) return '';
  return d.substring(0, 7);
}

export function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}
