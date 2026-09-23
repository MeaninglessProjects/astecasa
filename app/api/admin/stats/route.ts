import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, requireAdminByToken } from '@/lib/supabase/admin';

function bearer(request: NextRequest): string | null {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

/**
 * GET /api/admin/stats — statistiche REALI da Supabase (solo admin, server-side).
 * Nessun numero inventato: tutti i conteggi/guasti provengono dal DB.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAdminByToken(bearer(request));
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  try {
    const admin = getSupabaseAdminClient();
    const nowIso = new Date().toISOString();

    const [
      profiles,
      totalAste,
      attive,
      contatti,
      ricerche,
      audit,
      perProvincia,
      perTribunale,
      prezzi,
    ] = await Promise.all([
      admin.from('profiles').select('id,created_at', { count: 'exact', head: false }).limit(1),
      admin.from('pvp_aste').select('*', { count: 'exact', head: true }),
      admin.from('pvp_aste').select('*', { count: 'exact', head: true }).gt('data_ora_vendita', nowIso),
      admin.from('contact_messages').select('id,created_at,status', { count: 'exact' }).order('created_at', { ascending: false }).limit(10),
      admin.from('search_logs').select('*', { count: 'exact', head: true }),
      admin.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(20),
      // Top province tra aste attive (campione 5000 per restare leggeri sul free tier).
      admin.from('pvp_aste').select('provincia').gt('data_ora_vendita', nowIso).limit(5000),
      admin.from('pvp_aste').select('tribunale').gt('data_ora_vendita', nowIso).limit(5000),
      admin.from('pvp_aste').select('prezzo_base').gt('data_ora_vendita', nowIso).not('prezzo_base', 'is', null).limit(5000),
    ]);

    if (profiles.error) throw profiles.error;

    const totalCount = totalAste.count ?? 0;
    const attiveCount = attive.count ?? 0;
    const scaduteStimate = Math.max(0, totalCount - attiveCount);

    // Aggregazioni in JS sul campione (documentato in UI).
    const provMap = new Map<string, number>();
    for (const r of perProvincia.data ?? []) {
      const k = (r.provincia || 'N/D').toString().toUpperCase().slice(0, 10);
      provMap.set(k, (provMap.get(k) ?? 0) + 1);
    }
    const byProvincia = [...provMap.entries()]
      .map(([provincia, count]) => ({ provincia, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    const tribMap = new Map<string, number>();
    for (const r of perTribunale.data ?? []) {
      const k = (r.tribunale || 'N/D').toString().slice(0, 40);
      tribMap.set(k, (tribMap.get(k) ?? 0) + 1);
    }
    const byTribunale = [...tribMap.entries()]
      .map(([tribunale, count]) => ({ tribunale, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Distribuzione prezzi in fasce.
    const buckets = [
      { fascia: '< 50k', min: 0, max: 50000, count: 0 },
      { fascia: '50–100k', min: 50000, max: 100000, count: 0 },
      { fascia: '100–200k', min: 100000, max: 200000, count: 0 },
      { fascia: '200–500k', min: 200000, max: 500000, count: 0 },
      { fascia: '> 500k', min: 500000, max: Infinity, count: 0 },
    ];
    for (const r of prezzi.data ?? []) {
      const p = Number(r.prezzo_base);
      if (!Number.isFinite(p)) continue;
      const b = buckets.find((x) => p >= x.min && p < x.max);
      if (b) b.count++;
    }

    // Utenti: conteggio totale + ultimi 7 giorni (query leggera).
    const weekAgo = new Date(Date.now() - 7 * 864e5).toISOString();
    const { count: recentUsers } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo);

    return NextResponse.json({
      utenti: { totali: profiles.count ?? 0, ultimi7gg: recentUsers ?? 0 },
      aste: { totali: totalCount, attive: attiveCount, scaduteONull: scaduteStimate },
      contatti: { totali: contatti.count ?? 0, recenti: contatti.data ?? [] },
      ricerche: { totali: ricerche.count ?? 0 },
      byProvincia,
      byTribunale,
      prezzi: buckets.map(({ fascia, count }) => ({ fascia, count })),
      audit: audit.data ?? [],
      note: 'Aggregazioni per provincia/tribunale/prezzi calcolate su campione di max 5000 aste attive (limite piano free).',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore statistiche.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
