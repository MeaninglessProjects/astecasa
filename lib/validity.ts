/**
 * Regole di VALIDITÀ temporale (aste non scadute).
 *
 * Fonte primaria: `data_ora_vendita` (timestamptz).
 * - data_ora_vendita > now()        → VALIDA (mostrabile)
 * - data_ora_vendita <= now()       → SCADUTA (mai mostrare in ricerca pubblica)
 * - data_ora_vendita IS NULL        → gestione SICURA e documentata:
 *     default = ESCLUSA dalla ricerca pubblica (evita di mostrare per errore
 *     aste già terminate). L'admin può includerle con filtro esplicito
 *     `includeWithoutDate=true` per revisione manuale.
 *     Fallback secondario: se `data_vendita` (date) è presente e >= oggi,
 *     l'asta può essere considerata "potenzialmente valida" solo in quel
 *     flusso admin esplicito, mai nel default pubblico.
 *
 * Tutta la logica è applicata SERVER-SIDE (SQL: WHERE data_ora_vendita > now()),
 * mai solo con JavaScript nel browser.
 */

export function isAuctionValidNow(dataOraVendita: string | null | undefined): boolean {
  if (!dataOraVendita) return false; // sicuro: NULL = non mostrare
  const t = new Date(dataOraVendita).getTime();
  if (Number.isNaN(t)) return false;
  return t > Date.now();
}

/** Frammento SQL per "solo valide". */
export const VALID_AUCTION_SQL = `data_ora_vendita IS NOT NULL AND data_ora_vendita > now()`;
