export function formatEUR(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return 'Non disponibile';
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n)) return 'Non disponibile';
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatDateTimeIT(value: string | null | undefined): string {
  if (!value) return 'Non disponibile';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'Non disponibile';
  return new Intl.DateTimeFormat('it-IT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

export function formatDateIT(value: string | null | undefined): string {
  if (!value) return 'Non disponibile';
  const d = new Date(value.length === 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(d.getTime())) return 'Non disponibile';
  return new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium' }).format(d);
}

export function shortAddress(a: {
  via?: string | null;
  numero_civico?: string | null;
  comune?: string | null;
  provincia?: string | null;
}): string {
  const street = [a.via, a.numero_civico].filter(Boolean).join(' ');
  const city = [a.comune, a.provincia ? `(${a.provincia})` : null]
    .filter(Boolean)
    .join(' ');
  return [street, city].filter(Boolean).join(', ') || 'Indirizzo non disponibile';
}

export function discountPct(
  base: number | string | null | undefined,
  minima: number | string | null | undefined
): number | null {
  const b = Number(base);
  const m = Number(minima);
  if (!Number.isFinite(b) || !Number.isFinite(m) || b <= 0) return null;
  return ((b - m) / b) * 100;
}
