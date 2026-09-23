'use client';

export type SearchFilters = {
  q: string;
  comune: string;
  provincia: string;
  cap: string;
  tribunale: string;
  categoria: string;
  disponibilita: string;
  procedura: string;
  prezzoMin: string;
  prezzoMax: string;
  offertaMin: string;
  offertaMax: string;
  dataDa: string;
  dataA: string;
  sort: string;
};

export const EMPTY_FILTERS: SearchFilters = {
  q: '',
  comune: '',
  provincia: '',
  cap: '',
  tribunale: '',
  categoria: '',
  disponibilita: '',
  procedura: '',
  prezzoMin: '',
  prezzoMax: '',
  offertaMin: '',
  offertaMax: '',
  dataDa: '',
  dataA: '',
  sort: 'data_asc',
};

const inputCls =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

export function SearchPanel({
  filters,
  onChange,
  onSearch,
  loading,
}: {
  filters: SearchFilters;
  onChange: (f: SearchFilters) => void;
  onSearch: () => void;
  loading: boolean;
}) {
  function set<K extends keyof SearchFilters>(k: K, v: string) {
    onChange({ ...filters, [k]: v });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className="rounded-2xl bg-white p-5 shadow-card"
    >
      <div className="grid gap-3 md:grid-cols-4">
        <label className="md:col-span-4">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ricerca libera (comune, indirizzo, tribunale, descrizione)
          </span>
          <input
            value={filters.q}
            onChange={(e) => set('q', e.target.value)}
            className={inputCls}
            placeholder="Es. Milano, via Roma, Tribunale di Roma…"
          />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Comune</span>
          <input value={filters.comune} onChange={(e) => set('comune', e.target.value)} className={inputCls} placeholder="Comune" />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Provincia (sigla)</span>
          <input value={filters.provincia} onChange={(e) => set('provincia', e.target.value)} className={inputCls} placeholder="MI, RM…" maxLength={4} />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">CAP</span>
          <input value={filters.cap} onChange={(e) => set('cap', e.target.value)} className={inputCls} placeholder="00100" />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Tribunale</span>
          <input value={filters.tribunale} onChange={(e) => set('tribunale', e.target.value)} className={inputCls} placeholder="Tribunale di…" />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Prezzo min (€)</span>
          <input type="number" min={0} value={filters.prezzoMin} onChange={(e) => set('prezzoMin', e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Prezzo max (€)</span>
          <input type="number" min={0} value={filters.prezzoMax} onChange={(e) => set('prezzoMax', e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Offerta min. da (€)</span>
          <input type="number" min={0} value={filters.offertaMin} onChange={(e) => set('offertaMin', e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Offerta min. a (€)</span>
          <input type="number" min={0} value={filters.offertaMax} onChange={(e) => set('offertaMax', e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Data asta da</span>
          <input type="date" value={filters.dataDa} onChange={(e) => set('dataDa', e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Data asta a</span>
          <input type="date" value={filters.dataA} onChange={(e) => set('dataA', e.target.value)} className={inputCls} />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Categoria</span>
          <input value={filters.categoria} onChange={(e) => set('categoria', e.target.value)} className={inputCls} placeholder="Es. Appartamento" />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Procedura</span>
          <input value={filters.procedura} onChange={(e) => set('procedura', e.target.value)} className={inputCls} placeholder="Es. Esecuzione immobiliare" />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Disponibilità</span>
          <input value={filters.disponibilita} onChange={(e) => set('disponibilita', e.target.value)} className={inputCls} placeholder="Es. Libero" />
        </label>
        <label>
          <span className="text-xs font-medium text-slate-600">Ordina per</span>
          <select value={filters.sort} onChange={(e) => set('sort', e.target.value)} className={inputCls}>
            <option value="data_asc">Data asta più vicina</option>
            <option value="prezzo_asc">Prezzo più basso</option>
            <option value="prezzo_desc">Prezzo più alto</option>
            <option value="offerta_asc">Offerta minima più bassa</option>
            <option value="pub_desc">Pubblicazione recente</option>
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand-600 px-8 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? 'Ricerca…' : 'Cerca'}
        </button>
        <button
          type="button"
          onClick={() => {
            onChange(EMPTY_FILTERS);
          }}
          className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Azzera filtri
        </button>
        <p className="text-xs text-slate-500">
          Solo immobili residenziali con asta futura · ricerca server-side paginata
        </p>
      </div>
    </form>
  );
}
