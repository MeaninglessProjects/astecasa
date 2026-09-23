'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Charts } from '@/components/AdminCharts';

type Stats = {
  utenti: { totali: number; ultimi7gg: number };
  aste: { totali: number; attive: number; scaduteONull: number };
  contatti: { totali: number; recenti: { id: string; created_at: string; status: string; auction_id: string }[] };
  ricerche: { totali: number };
  byProvincia: { provincia: string; count: number }[];
  byTribunale: { tribunale: string; count: number }[];
  prezzi: { fascia: string; count: number }[];
  audit: { id: string; created_at: string; action: string; admin_user_id: string }[];
  note: string;
};

type SyncState = {
  source: string;
  next_page: number;
  page_size: number;
  total_pages: number | null;
  total_elements: number | null;
  last_page_synced: number | null;
  status: string;
  last_run_count: number | null;
  last_new_count: number | null;
  last_updated_count: number | null;
  last_error: string | null;
  last_finished_at: string | null;
};

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [sync, setSync] = useState<SyncState | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [pages, setPages] = useState(10);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const h = await authHeader();
      const [sRes, pRes] = await Promise.all([
        fetch('/api/admin/stats', { headers: h }),
        fetch('/api/admin/pvp-sync', { headers: h }),
      ]);
      const sJson = await sRes.json();
      const pJson = await pRes.json();
      if (!sRes.ok) throw new Error(sJson.error || 'Errore statistiche.');
      if (!pRes.ok) throw new Error(pJson.error || 'Errore stato sync.');
      setStats(sJson);
      setSync(pJson.state);
      setImportedCount(pJson.importedCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore caricamento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function runImport(reset = false) {
    setImporting(true);
    setResult(null);
    try {
      const h = await authHeader();
      const res = await fetch('/api/admin/pvp-sync', {
        method: 'POST',
        headers: { ...h, 'content-type': 'application/json' },
        body: JSON.stringify(reset ? { reset: true } : { pages }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Errore importazione.");
      if (json.reset) {
        setResult('Stato importazione azzerato: si riparte da pagina 0.');
      } else {
        setResult(
          `Batch completato: pagine ${json.startPage}→${json.lastPageSynced ?? '?'} · ` +
            `importati ${json.totalImported} (nuovi ${json.nuovi}, aggiornati ${json.aggiornati}) · ` +
            `progresso ${json.nextPage}/${json.totalPages ?? '?'} pagine` +
            (json.completed ? ' · IMPORTAZIONE COMPLETATA' : '')
        );
      }
      await load();
    } catch (err) {
      setResult(`Errore: ${err instanceof Error ? err.message : 'sconosciuto'}`);
    } finally {
      setImporting(false);
    }
  }

  if (loading && !stats) {
    return <p className="px-4 py-8">Caricamento dashboard…</p>;
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Admin</h1>
          <p className="text-sm text-slate-500">
            Statistiche reali da Supabase · importazione PVP solo manuale
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/pvp" className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Vai a Importazione PVP →
          </a>
          <button onClick={load} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium">
            Ricarica
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}

      {stats && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { k: 'Utenti registrati', v: stats.utenti.totali.toLocaleString('it-IT'), s: `+${stats.utenti.ultimi7gg} ultimi 7gg` },
              { k: 'Aste totali nel DB', v: stats.aste.totali.toLocaleString('it-IT'), s: 'tutte le importate' },
              { k: 'Aste attive (mostrate)', v: stats.aste.attive.toLocaleString('it-IT'), s: 'data futura + residenziali' },
              { k: 'Richieste contatto', v: stats.contatti.totali.toLocaleString('it-IT'), s: `${stats.ricerche.totali} ricerche loggate` },
            ].map((c) => (
              <div key={c.k} className="rounded-2xl bg-white p-5 shadow-card">
                <p className="text-xs uppercase tracking-wide text-slate-500">{c.k}</p>
                <p className="mt-1 text-3xl font-bold">{c.v}</p>
                <p className="text-xs text-slate-500">{c.s}</p>
              </div>
            ))}
          </div>

          <Charts byProvincia={stats.byProvincia} prezzi={stats.prezzi} />

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h3 className="font-bold">Top tribunali (aste attive)</h3>
              <ul className="mt-2 divide-y text-sm">
                {stats.byTribunale.map((t) => (
                  <li key={t.tribunale} className="flex justify-between py-1.5">
                    <span className="truncate pr-3">{t.tribunale}</span>
                    <strong>{t.count}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-card">
              <h3 className="font-bold">Ultime azioni admin (audit)</h3>
              <ul className="mt-2 divide-y text-sm">
                {stats.audit.length === 0 && (
                  <li className="py-2 text-slate-500">Nessuna azione registrata.</li>
                )}
                {stats.audit.map((a) => (
                  <li key={a.id} className="flex justify-between py-1.5">
                    <span>{a.action}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(a.created_at).toLocaleString('it-IT')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <h3 className="font-bold">Richieste contatto recenti</h3>
              <a href="/admin/contatti" className="text-sm font-medium text-brand-700 hover:underline">
                Gestisci tutte →
              </a>
            </div>
            <ul className="mt-2 divide-y text-sm">
              {stats.contatti.recenti.length === 0 && (
                <li className="py-2 text-slate-500">Nessuna richiesta.</li>
              )}
              {stats.contatti.recenti.map((c) => (
                <li key={c.id} className="flex flex-wrap justify-between gap-2 py-1.5">
                  <span>
                    Asta <a className="font-mono text-brand-700" href={`/aste/${c.auction_id}`}>{c.auction_id}</a>
                    {' '}· {c.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleString('it-IT')}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-slate-500">{stats.note}</p>
        </>
      )}

      {/* Sezione importazione rapida */}
      <section className="rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50/50 p-5">
        <h2 className="text-lg font-bold">Importazione PVP manuale</h2>
        <p className="text-sm text-slate-600">
          Nessun cron o job automatico: l&apos;import parte SOLO da qui.
        </p>
        {sync && (
          <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p>Pagina: <strong>{sync.next_page} / {sync.total_pages ?? '?'}</strong></p>
            <p>Record DB: <strong>{importedCount.toLocaleString('it-IT')}</strong></p>
            <p>Stato: <strong>{sync.status}</strong></p>
            <p>Ultimo batch: <strong>{sync.last_run_count ?? 0}</strong> (nuovi {sync.last_new_count ?? 0}, agg. {sync.last_updated_count ?? 0})</p>
          </div>
        )}
        {sync?.last_error && (
          <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            Ultimo errore: {sync.last_error}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            Pagine per batch
            <input
              type="number"
              min={1}
              max={25}
              value={pages}
              onChange={(e) => setPages(Number(e.target.value))}
              className="w-20 rounded-lg border border-slate-300 px-2 py-1.5"
            />
          </label>
          <button
            onClick={() => runImport(false)}
            disabled={importing}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {importing ? 'Importazione…' : 'Importa/Aggiorna aste PVP'}
          </button>
          <button
            onClick={() => runImport(true)}
            disabled={importing}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium"
          >
            Reset a pagina 0
          </button>
        </div>
        {result && (
          <p className="mt-3 rounded-lg bg-white px-3 py-2 text-sm shadow">{result}</p>
        )}
      </section>
    </div>
  );
}
