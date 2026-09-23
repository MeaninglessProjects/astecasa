import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import dynamic from 'next/dynamic';
import { createServerSupabase } from '@/lib/supabase/server';
import { formatDateIT, formatDateTimeIT, formatEUR, shortAddress } from '@/lib/format';
import { ContactForm } from '@/components/ContactForm';
import { FavoriteButton } from '@/components/FavoriteButton';
import { PriceStats } from '@/components/PriceStats';

const AuctionBigMap = dynamic(
  () => import('@/components/AuctionMap').then((m) => m.AuctionBigMap),
  { ssr: false, loading: () => <div className="min-h-[420px] animate-pulse rounded-2xl bg-slate-100" /> }
);

type Props = { params: { id: string } };

async function getAuction(id: string) {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from('pvp_aste')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const a = await getAuction(params.id);
    if (!a) return { title: 'Asta non trovata' };
    const title = `${a.categoria_lotto || 'Immobile'} a ${a.comune || ''} — €${a.prezzo_base ?? '?'}`;
    return {
      title,
      description: (a.descrizione || '').slice(0, 160) || 'Dettaglio asta immobiliare residenziale.',
    };
  } catch {
    return { title: 'Dettaglio asta' };
  }
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-right font-medium text-slate-900">{v}</dd>
    </div>
  );
}

function str(v: unknown): string {
  if (v == null) return 'Non disponibile';
  if (Array.isArray(v)) return v.length ? v.map(String).join(', ') : 'Non disponibile';
  const s = String(v).trim();
  return s || 'Non disponibile';
}

export default async function AuctionDetailPage({ params }: Props) {
  const auction = await getAuction(params.id).catch(() => null);
  if (!auction) notFound();

  const expired =
    !auction.data_ora_vendita ||
    new Date(auction.data_ora_vendita).getTime() <= Date.now();

  // Storico prezzi reale (può essere vuoto: non inventiamo nulla).
  let history: { recorded_at: string; base_price: number | null; minimum_offer: number | null; source: string | null }[] = [];
  try {
    const supabase = createServerSupabase();
    const { data } = await supabase
      .from('auction_price_history')
      .select('recorded_at,base_price,minimum_offer,source')
      .eq('auction_id', params.id)
      .order('recorded_at', { ascending: true });
    history = data ?? [];
  } catch {
    history = [];
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <a href="/" className="text-sm font-medium text-brand-700 hover:underline">
        ← Torna alla ricerca
      </a>

      {expired && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Questa asta risulta scaduta o senza data valida</strong> nei
          dati PVP e non è più mostrata in ricerca. La pagina resta
          raggiungibile via link diretto ma la richiesta informazioni è
          disabilitata.
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand-700">
            {str(auction.categoria_lotto || auction.tipo_lotto)}
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
            {shortAddress(auction)}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            ID asta {auction.id} · {str(auction.tribunale)}
          </p>
        </div>
        <FavoriteButton auctionId={auction.id} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AuctionBigMap
          lat={auction.latitudine ?? null}
          lng={auction.longitudine ?? null}
        />
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-xs text-slate-500">Prezzo base</p>
              <p className="text-xl font-bold">{formatEUR(auction.prezzo_base)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-xs text-slate-500">Offerta minima</p>
              <p className="text-xl font-bold">{formatEUR(auction.offerta_minima)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-xs text-slate-500">Data e ora asta</p>
              <p className="font-bold">{formatDateTimeIT(auction.data_ora_vendita)}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-card">
              <p className="text-xs text-slate-500">Rialzo minimo</p>
              <p className="font-bold">{formatEUR(auction.rialzo_minimo)}</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-card">
            <h2 className="font-bold">Informazioni principali</h2>
            <dl className="mt-2">
              <Row k="Indirizzo" v={[auction.via, auction.numero_civico].filter(Boolean).join(' ') || 'Non disponibile'} />
              <Row k="CAP" v={str(auction.cap)} />
              <Row k="Comune" v={str(auction.comune)} />
              <Row k="Provincia" v={str(auction.provincia)} />
              <Row k="Tribunale" v={str(auction.tribunale)} />
              <Row k="Procedura" v={str(auction.procedura)} />
              <Row k="Numero lotto" v={str(auction.numero_lotto)} />
              <Row k="Disponibilità" v={str(auction.disponibilita)} />
              <Row k="Esito" v={str(auction.esito)} />
              <Row k="Data pubblicazione" v={formatDateIT(auction.data_pubblicazione)} />
              <Row k="Categoria bene" v={str(auction.categoria_bene)} />
            </dl>
          </div>

          {!expired && <ContactForm auctionId={auction.id} />}
        </div>
      </div>

      {auction.descrizione && (
        <section className="rounded-2xl bg-white p-5 shadow-card">
          <h2 className="text-lg font-bold">Descrizione</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
            {auction.descrizione}
          </p>
        </section>
      )}

      <PriceStats
        base={auction.prezzo_base != null ? Number(auction.prezzo_base) : null}
        minima={auction.offerta_minima != null ? Number(auction.offerta_minima) : null}
        history={history}
      />
    </div>
  );
}
