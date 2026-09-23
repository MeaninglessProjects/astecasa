/**
 * CLASSIFICAZIONE RESIDENZIALE — logica centrale e documentata.
 *
 * Obiettivo: mostrare SOLO abitazioni / immobili residenziali ed escludere
 * tutto ciò che è chiaramente non residenziale (veicoli, terreni, mobili,
 * commerciali, industriali, ecc.).
 *
 * Strategia (modificabile qui in un unico punto):
 *  1. Se il testo contiene segnali ESCLUSIVI non-residenziali E nessun segnale
 *     residenziale → ESCLUSO.
 *  2. Se contiene almeno un segnale residenziale → INCLUSO (anche se cita
 *     pertinenze come box/cantina, tipiche delle abitazioni).
 *  3. Altrimenti (testo ambiguo/vuoto) → ESCLUSO in modalità "rigorosa"
 *     (default per la ricerca pubblica), INCLUSO solo se l'admin abilita
 *     esplicitamente `includeUnclassified`.
 *
 * Per modificare il comportamento: aggiungere/rimuovere keyword negli array
 * sotto. Le funzioni SQL in `buildResidentialSqlFilter()` riusano le stesse
 * liste per filtrare server-side (Postgres ILIKE), così frontend e DB restano
 * coerenti.
 */

export const RESIDENTIAL_INCLUDE_KEYWORDS = [
  'appartamento',
  'appartamenti',
  'abitazione',
  'abitazioni',
  'casa',
  'villetta',
  'villa',
  'villino',
  'alloggio',
  'alloggi',
  'residenziale',
  'residenziali',
  'uso abitativo',
  'ad uso abitazione',
  'civile abitazione',
  'unità immobiliare ad uso abitativo',
  'porzione di fabbricato ad uso abitativo',
  'fabbricato residenziale',
];

export const RESIDENTIAL_EXCLUDE_KEYWORDS = [
  // Veicoli / mobili — mai immobili residenziali
  'autovettura',
  'autoveicolo',
  'motoveicolo',
  'autocarro',
  'rimorchio',
  'imbarcazione',
  'macchinario',
  'macchinari',
  'arredamento',
  'bene mobile',
  'beni mobili',
  // Terreni / agricoli
  'terreno agricolo',
  'fondo agricolo',
  'fondo rustico',
  'terreno edificabile',
  // Commerciale / industriale / uffici (quando NON accompagnati da abitazione)
  'capannone industriale',
  'opificio',
  'locale commerciale',
  'unità commerciale',
  'ufficio',
  'uffici',
  'negozio',
  'magazzino industriale',
  'laboratorio artigianale',
  // Solo pertinenze/box isolati (senza abitazione)
  'solo box',
  'solo garage',
  'solo posto auto',
];

export type ClassifiableAuction = {
  tipo_lotto?: string | null;
  categoria_lotto?: string | null;
  categoria_bene?: unknown;
  descrizione?: string | null;
};

function norm(v: unknown): string {
  if (Array.isArray(v)) return v.map(String).join(' | ').toLowerCase();
  return String(v ?? '').toLowerCase();
}

function haystack(a: ClassifiableAuction): string {
  return [a.tipo_lotto, a.categoria_lotto, a.categoria_bene, a.descrizione]
    .map(norm)
    .join('\n');
}

function containsAny(hay: string, words: string[]): boolean {
  return words.some((w) => hay.includes(w.toLowerCase()));
}

/**
 * Ritorna true se l'asta è classificabile come residenziale.
 * Documenta il motivo in `reason` per debug/admin.
 */
export function isResidential(
  auction: ClassifiableAuction,
  opts: { includeUnclassified?: boolean } = {}
): { residential: boolean; reason: string } {
  const hay = haystack(auction);
  if (!hay.trim()) {
    return {
      residential: opts.includeUnclassified === true,
      reason: 'testo vuoto: escluso in modalità rigorosa',
    };
  }
  const hasInclude = containsAny(hay, RESIDENTIAL_INCLUDE_KEYWORDS);
  const hasExclude = containsAny(hay, RESIDENTIAL_EXCLUDE_KEYWORDS);

  if (hasInclude) {
    return { residential: true, reason: 'trovata keyword residenziale' };
  }
  if (hasExclude) {
    return { residential: false, reason: 'solo keyword non-residenziale' };
  }
  // Ambiguo: nessuna keyword nota.
  return {
    residential: opts.includeUnclassified === true,
    reason: 'nessuna keyword nota: escluso in modalità rigorosa',
  };
}

/**
 * Genera condizioni SQL parametrizzate per filtrare SOLO residenziali
 * direttamente in Postgres (server-side, niente download massivo).
 *
 * Uso: `const { text, params } = buildResidentialSqlFilter(startIdx)`.
 * Ritorna frammento tipo: `(col1 ILIKE $1 OR ...)`.
 * Applica regola: (match INCLUDE) — gli EXCLUDE puri non matchano mai
 * gli INCLUDE, quindi sono automaticamente fuori in modalità rigorosa.
 */
export function buildResidentialIlikeConditions(
  columns: string[],
  startIdx = 1
): { text: string; params: string[] } {
  const params: string[] = [];
  const ors: string[] = [];
  let idx = startIdx;
  for (const col of columns) {
    for (const kw of RESIDENTIAL_INCLUDE_KEYWORDS) {
      ors.push(`${col} ILIKE $${idx}`);
      params.push(`%${kw}%`);
      idx++;
    }
  }
  // categoria_bene / disponibilita sono jsonb: cast a text per ILIKE
  return { text: `(${ors.join(' OR ')})`, params };
}

/** Colonne testuali su cui cercare i segnali residenziali. */
export const RESIDENTIAL_SEARCH_COLUMNS = [
  'tipo_lotto',
  'categoria_lotto',
  "categoria_bene::text",
  'descrizione',
] as const;
