import { createServerSupabase } from '@/lib/supabase/server';
import { AuctionCard, type AuctionListItem } from '@/components/AuctionCard';

export default async function PreferitiPage() {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let items: AuctionListItem[] = [];
  if (user) {
    const { data: favs } = await supabase
      .from('favorites')
      .select('auction_id, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(200);
    const ids = (favs ?? []).map((f) => f.auction_id);
    if (ids.length) {
      const { data: aste } = await supabase
        .from('pvp_aste')
        .select(
          'id,tipo_lotto,categoria_lotto,via,numero_civico,comune,provincia,latitudine,longitudine,prezzo_base,offerta_minima,data_ora_vendita,tribunale,disponibilita'
        )
        .in('id', ids);
      // Mantiene l'ordine dei preferiti.
      const byId = new Map((aste ?? []).map((a) => [a.id, a]));
      items = ids
        .map((id) => byId.get(id))
        .filter(Boolean) as AuctionListItem[];
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold">I tuoi preferiti</h1>
      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-card">
          <p className="font-semibold">Nessun preferito salvato</p>
          <p className="mt-1 text-sm text-slate-500">
            Apri un&apos;asta e premi «Salva nei preferiti».
          </p>
          <a
            href="/"
            className="mt-4 inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white"
          >
            Cerca aste
          </a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => (
            <AuctionCard key={a.id} auction={a} />
          ))}
        </div>
      )}
    </div>
  );
}
