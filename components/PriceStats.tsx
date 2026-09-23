import { discountPct } from '@/lib/format';
import { formatEUR } from '@/lib/format';

export type PriceHistoryRow = {
  recorded_at: string;
  base_price: number | null;
  minimum_offer: number | null;
  source: string | null;
};

/**
 * Statistiche prezzo della singola asta.
 * NON inventa alcuno storico: mostra solo ciò che esiste in
 * `auction_price_history` + i valori correnti (base/offerta/sconto %).
 */
export function PriceStats({
  base,
  minima,
  history,
}: {
  base: number | null;
  minima: number | null;
  history: PriceHistoryRow[];
}) {
  const pct = discountPct(base, minima);

  return (
    <section className="rounded-2xl bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">Statistiche prezzo</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Prezzo base</p>
          <p className="text-lg font-bold">{formatEUR(base)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Offerta minima</p>
          <p className="text-lg font-bold">{formatEUR(minima)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Sconto base → minima</p>
          <p className="text-lg font-bold">
            {pct == null ? 'Non disponibile' : `${pct.toFixed(1)} %`}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-sm font-semibold">Storico variazioni</h3>
        {history.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">
            Nessuno storico disponibile per questa asta.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase text-slate-500">
                  <th className="py-1 pr-3">Data rilevazione</th>
                  <th className="py-1 pr-3">Prezzo base</th>
                  <th className="py-1 pr-3">Offerta minima</th>
                  <th className="py-1">Fonte</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1 pr-3">
                      {new Date(h.recorded_at).toLocaleString('it-IT')}
                    </td>
                    <td className="py-1 pr-3">{formatEUR(h.base_price)}</td>
                    <td className="py-1 pr-3">{formatEUR(h.minimum_offer)}</td>
                    <td className="py-1">{h.source || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
