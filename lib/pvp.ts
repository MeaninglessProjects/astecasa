/**
 * Client PVP (Portale Vendite Pubbliche) — SOLO SERVER.
 * Usato ESCLUSIVAMENTE dall'importazione MANUALE admin (route /api/admin/pvp-sync).
 * Nessun cron, nessun job automatico in tutto il progetto.
 */

export type PvpAddress = {
  via?: string | null;
  numeroCivico?: string | number | null;
  cap?: string | null;
  citta?: string | null;
  provincia?: string | null;
  coordinate?: {
    latitudine?: number | string | null;
    longitudine?: number | string | null;
  } | null;
};

export type PvpAuction = {
  id?: string | number | null;
  tipoLotto?: string | null;
  categoriaLotto?: string | null;
  categoriaBene?: string[] | null;
  indirizzo?: PvpAddress | null;
  numeroLotto?: string | null;
  procedura?: string | null;
  prezzoBaseAsta?: number | string | null;
  offertaMinima?: number | string | null;
  rialzoMinimo?: number | string | null;
  dataVendita?: string | null;
  orarioVendita?: string | null;
  dataOraVendita?: string | null;
  dataPubblicazione?: string | null;
  disponibilita?: string[] | null;
  descLotto?: string | null;
  tribunale?: string | null;
  codiceTribunale?: string | null;
  esito?: string | null;
  [key: string]: unknown;
};

export type PvpPage = {
  content: PvpAuction[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first?: boolean;
  last?: boolean;
};

export type PvpResponse = {
  messaggio?: string;
  body?: PvpPage;
};

export const DEFAULT_PVP_URL =
  'https://pvp.giustizia.it/ric-496b258c-986a1b71/ric-ms/ricerca/vendite';

/** Ricerca solo IMMOBILI: il filtro residenziale rigoroso avviene dopo, in `lib/residential`. */
export const DEFAULT_PVP_BODY = {
  tipoLotto: 'IMMOBILI',
  categoriaBene: [],
  flagRicerca: 0,
  coordIndirizzo: '',
  raggioIndirizzo: '25',
};

export function envInt(name: string, fallback: number, min = 1): number {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value >= min ? value : fallback;
}

export function euroToNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toIsoOrNull(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function toDateOrNull(value: unknown): string | null {
  if (!value) return null;
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function mapAuction(item: PvpAuction) {
  const address = item.indirizzo ?? {};
  const coords = address.coordinate ?? {};
  const id = item.id == null ? null : String(item.id);
  if (!id) return null;

  const lat = coords.latitudine == null ? null : Number(coords.latitudine);
  const lng = coords.longitudine == null ? null : Number(coords.longitudine);

  return {
    id,
    tipo_lotto: item.tipoLotto ?? null,
    categoria_lotto: item.categoriaLotto ?? null,
    categoria_bene: item.categoriaBene ?? [],
    via: address.via ?? null,
    numero_civico:
      address.numeroCivico == null ? null : String(address.numeroCivico),
    cap: address.cap ?? null,
    comune: address.citta ?? null,
    provincia: address.provincia ?? null,
    latitudine: Number.isFinite(lat ?? NaN) ? lat : null,
    longitudine: Number.isFinite(lng ?? NaN) ? lng : null,
    numero_lotto: item.numeroLotto ?? null,
    procedura: item.procedura ?? null,
    prezzo_base: euroToNumber(item.prezzoBaseAsta),
    offerta_minima: euroToNumber(item.offertaMinima),
    rialzo_minimo: euroToNumber(item.rialzoMinimo),
    data_vendita: toDateOrNull(item.dataVendita),
    orario_vendita: item.orarioVendita ?? null,
    data_ora_vendita: toIsoOrNull(item.dataOraVendita),
    data_pubblicazione: toIsoOrNull(item.dataPubblicazione),
    disponibilita: item.disponibilita ?? [],
    descrizione: item.descLotto ?? null,
    tribunale: item.tribunale ?? null,
    codice_tribunale: item.codiceTribunale ?? null,
    esito: item.esito ?? null,
    raw: item,
    last_seen_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function fetchPvpPage(options: {
  page: number;
  size: number;
  sort: string[];
  signal?: AbortSignal;
}): Promise<PvpPage> {
  const url = process.env.PVP_SEARCH_URL || DEFAULT_PVP_URL;
  const params = new URLSearchParams({
    language: 'it',
    page: String(options.page),
    size: String(options.size),
  });
  for (const sort of options.sort) params.append('sort', sort);

  const response = await fetch(`${url}?${params.toString()}`, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      origin: 'https://pvp.giustizia.it',
      referer: 'https://pvp.giustizia.it/pvp/it/lista_annunci.page',
      'user-agent': 'Mozilla/5.0',
    },
    body: JSON.stringify(DEFAULT_PVP_BODY),
    cache: 'no-store',
    signal: options.signal,
  });

  const text = await response.text();
  if (!response.ok)
    throw new Error(`PVP HTTP ${response.status}: ${text.slice(0, 500)}`);
  const data = JSON.parse(text) as PvpResponse;
  if (!data.body)
    throw new Error(`PVP response missing body: ${text.slice(0, 500)}`);
  return data.body;
}
