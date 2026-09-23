'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { formatDateTimeIT, formatEUR, shortAddress } from '@/lib/format';

const AuctionMiniMap = dynamic(
  () => import('./AuctionMap').then((m) => m.AuctionMiniMap),
  { ssr: false, loading: () => <div className="h-40 animate-pulse bg-slate-100" /> }
);

export type AuctionListItem = {
  id: string;
  tipo_lotto?: string | null;
  categoria_lotto?: string | null;
  via?: string | null;
  numero_civico?: string | null;
  comune?: string | null;
  provincia?: string | null;
  latitudine?: number | null;
  longitudine?: number | null;
  prezzo_base?: number | null;
  offerta_minima?: number | null;
  data_ora_vendita?: string | null;
  tribunale?: string | null;
  disponibilita?: unknown;
};

function dispLabel(d: unknown): string {
  if (Array.isArray(d)) return d.map(String).join(', ') || '—';
  return String(d ?? '—');
}

export function AuctionCard({ auction }: { auction: AuctionListItem }) {
  return (
    <Link
      href={`/aste/${auction.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <AuctionMiniMap lat={auction.latitudine ?? null} lng={auction.longitudine ?? null} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-brand-700">
            {(auction.categoria_lotto || auction.tipo_lotto || 'Immobile residenziale').slice(0, 60)}
          </p>
          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            Attiva
          </span>
        </div>
        <h3 className="font-bold leading-snug text-slate-900">
          {shortAddress(auction)}
        </h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Prezzo base</p>
            <p className="font-bold">{formatEUR(auction.prezzo_base)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-2">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Offerta min.</p>
            <p className="font-bold">{formatEUR(auction.offerta_minima)}</p>
          </div>
        </div>
        <div className="mt-auto space-y-1 text-[13px] text-slate-600">
          <p>📅 {formatDateTimeIT(auction.data_ora_vendita)}</p>
          <p>⚖️ {auction.tribunale || 'Tribunale non disponibile'}</p>
          <p>📦 Disponibilità: {dispLabel(auction.disponibilita)}</p>
        </div>
        <span className="mt-2 inline-flex items-center text-sm font-semibold text-brand-700 group-hover:underline">
          Vedi dettaglio →
        </span>
      </div>
    </Link>
  );
}
