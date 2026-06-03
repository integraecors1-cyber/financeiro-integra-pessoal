export function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export function uid() {
  return crypto.randomUUID();
}

export function yyyymm(d: string) {
  if (!d) return '';
  return d.substring(0, 7);
}
