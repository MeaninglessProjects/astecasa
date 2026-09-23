'use client';

import { useCallback, useEffect, useState } from 'react';
import { AuctionCard, type AuctionListItem } from '@/components/AuctionCard';
import { EMPTY_FILTERS, SearchPanel, type SearchFilters } from '@/components/SearchPanel';

export function HomeSearch() {
  const [filters, setFilters] = useState<SearchFilters>(EMPTY_FILTERS);
  const [items, setItems] = useState<AuctionListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const pageSize = 12;

  const runSearch = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: filters.q,
          comune: filters.comune,
          provincia: filters.provincia,
          cap: filters.cap,
          tribunale: filters.tribunale,
          categoria: filters.categoria,
          disponibilita: filters.disponibilita,
          procedura: filters.procedura,
          prezzoMin: filters.prezzoMin,
          prezzoMax: filters.prezzoMax,
          offertaMin: filters.offertaMin,
          offertaMax: filters.offertaMax,
          dataDa: filters.dataDa,
          dataA: filters.dataA,
          sort: filters.sort,
          page: String(targetPage),
          pageSize: String(pageSize),
        });
        const res = await fetch(`/api/aste/search?${params.toString()}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Errore di ricerca.');
        setItems(json.items);
        setTotal(json.total);
        setPage(json.page);
        setTotalPages(json.totalPages);
        setSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Errore di ricerca.');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Prima ricerca automatica all'accesso.
  useEffect(() => {
    runSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white sm:p-8">
        <h1 className="text-2xl font-bold sm:text-3xl">
          Trova la tua casa all&apos;asta
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-brand-50 sm:text-base">
          Solo appartamenti, case e ville con asta ancora futura — dati dal
          Portale Vendite Pubbliche.
        </p>
      </div>

      <SearchPanel
        filters={filters}
        onChange={setFilters}
        onSearch={() => runSearch(1)}
        loading={loading}
      />

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">
          {searched
            ? `${total.toLocaleString('it-IT')} risultati`
            : 'Avvio ricerca…'}
          {totalPages > 0 && ` · pagina ${page} di ${totalPages}`}
        </p>
      </div>

      {loading && items.length === 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-96 animate-pulse rounded-2xl bg-white shadow-card" />
          ))}
        </div>
      ) : items.length === 0 && searched ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-card">
          <p className="font-semibold">Nessuna asta trovata</p>
          <p className="mt-1 text-sm text-slate-500">
            Prova ad allargare prezzi, date o rimuovere qualche filtro.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => runSearch(page - 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            ← Precedente
          </button>
          <span className="text-sm text-slate-600">
            Pagina {page} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => runSearch(page + 1)}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Successiva →
          </button>
        </div>
      )}
    </div>
  );
}
