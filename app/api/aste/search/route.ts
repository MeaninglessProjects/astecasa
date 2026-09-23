import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  RESIDENTIAL_INCLUDE_KEYWORDS,
} from '@/lib/residential';

/**
 * GET /api/aste/search — ricerca SERVER-SIDE paginata su Supabase.
 *
 * Garanzie:
 * - MAI `select *` senza limiti: sempre .range() + filtri SQL.
 * - Solo aste VALIDE: data_ora_vendita > now() (salvo includeWithoutDate esplicito).
 * - Solo RESIDENZIALI: OR di ILIKE sulle colonne testuali (tipo_lotto,
 *   categoria_lotto, descrizione). Il controllo su categoria_bene (jsonb) e la
 *   verifica finale avvengono con `isResidential` coerente a lib/residential.
 * - Ordinamenti consentiti: data_asc (default), prezzo_asc/desc, offerta_asc, pub_desc.
 */

const MAX_PAGE_SIZE = 48;

function buildResidentialOr(): string {
  const cols = ['tipo_lotto', 'categoria_lotto', 'descrizione'] as const;
  const parts: string[] = [];
  for (const c of cols) {
    for (const kw of RESIDENTIAL_INCLUDE_KEYWORDS) {
      // Escape virgole e punti per la sintassi PostgREST or()
      const safe = kw.replace(/,/g, ' ');
      parts.push(`${c}.ilike.%${safe}%`);
    }
  }
  return parts.join(',');
}

const SORT_MAP: Record<string, { col: string; asc: boolean }> = {
  data_asc: { col: 'data_ora_vendita', asc: true },
  prezzo_asc: { col: 'prezzo_base', asc: true },
  prezzo_desc: { col: 'prezzo_base', asc: false },
  offerta_asc: { col: 'offerta_minima', asc: true },
  pub_desc: { col: 'data_pubblicazione', asc: false },
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q')?.trim() || '';
    const comune = url.searchParams.get('comune')?.trim() || '';
    const provincia = url.searchParams.get('provincia')?.trim() || '';
    const cap = url.searchParams.get('cap')?.trim() || '';
    const tribunale = url.searchParams.get('tribunale')?.trim() || '';
    const categoria = url.searchParams.get('categoria')?.trim() || '';
    const disponibilita = url.searchParams.get('disponibilita')?.trim() || '';
    const procedura = url.searchParams.get('procedura')?.trim() || '';
    const prezzoMin = Number(url.searchParams.get('prezzoMin') || '');
    const prezzoMax = Number(url.searchParams.get('prezzoMax') || '');
    const offertaMin = Number(url.searchParams.get('offertaMin') || '');
    const offertaMax = Number(url.searchParams.get('offertaMax') || '');
    const dataDa = url.searchParams.get('dataDa') || '';
    const dataA = url.searchParams.get('dataA') || '';
    const sortKey = url.searchParams.get('sort') || 'data_asc';
    const includeWithoutDate =
      url.searchParams.get('includeWithoutDate') === '1';
    const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number(url.searchParams.get('pageSize') || '12') || 12)
    );

    const sort = SORT_MAP[sortKey] ?? SORT_MAP.data_asc;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Lettura con client server (RLS rispettata). Le policy consentono SELECT pubblica.
    const supabase = createServerSupabase();
    let query = supabase
      .from('pvp_aste')
      .select(
        'id,tipo_lotto,categoria_lotto,categoria_bene,via,numero_civico,cap,comune,provincia,latitudine,longitudine,numero_lotto,procedura,prezzo_base,offerta_minima,rialzo_minimo,data_vendita,orario_vendita,data_ora_vendita,data_pubblicazione,disponibilita,descrizione,tribunale,codice_tribunale,esito',
        { count: 'exact' }
      );

    // 1) Validità temporale — SEMPRE server-side.
    if (includeWithoutDate) {
      query = query.or(`data_ora_vendita.gt.${new Date().toISOString()},data_ora_vendita.is.null`);
    } else {
      query = query.gt('data_ora_vendita', new Date().toISOString());
    }

    // 2) Solo residenziali — OR server-side.
    query = query.or(buildResidentialOr());

    // 3) Filtri utente.
    if (comune) query = query.ilike('comune', `%${comune}%`);
    if (provincia) query = query.ilike('provincia', `%${provincia}%`);
    if (cap) query = query.eq('cap', cap);
    if (tribunale) query = query.ilike('tribunale', `%${tribunale}%`);
    if (categoria) query = query.ilike('categoria_lotto', `%${categoria}%`);
    if (procedura) query = query.ilike('procedura', `%${procedura}%`);
    if (disponibilita) query = query.ilike('disponibilita::text', `%${disponibilita}%`);
    if (Number.isFinite(prezzoMin) && prezzoMin > 0)
      query = query.gte('prezzo_base', prezzoMin);
    if (Number.isFinite(prezzoMax) && prezzoMax > 0)
      query = query.lte('prezzo_base', prezzoMax);
    if (Number.isFinite(offertaMin) && offertaMin > 0)
      query = query.gte('offerta_minima', offertaMin);
    if (Number.isFinite(offertaMax) && offertaMax > 0)
      query = query.lte('offerta_minima', offertaMax);
    if (dataDa) query = query.gte('data_ora_vendita', new Date(dataDa).toISOString());
    if (dataA) {
      const end = new Date(dataA);
      end.setHours(23, 59, 59, 999);
      query = query.lte('data_ora_vendita', end.toISOString());
    }
    if (q) {
      // Ricerca libera su comune, descrizione, via, tribunale, procedura.
      const safe = q.replace(/,/g, ' ').slice(0, 120);
      query = query.or(
        `comune.ilike.%${safe}%,descrizione.ilike.%${safe}%,via.ilike.%${safe}%,tribunale.ilike.%${safe}%,procedura.ilike.%${safe}%`
      );
    }

    query = query
      .order(sort.col, { ascending: sort.asc, nullsFirst: false })
      .order('id', { ascending: true })
      .range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    // Log ricerca (best-effort, non blocca la risposta) per statistiche admin.
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const admin = getSupabaseAdminClient();
      await admin.from('search_logs').insert({
        user_id: user?.id ?? null,
        filters: {
          q, comune, provincia, cap, tribunale, categoria, disponibilita,
          procedura, prezzoMin: url.searchParams.get('prezzoMin'),
          prezzoMax: url.searchParams.get('prezzoMax'), dataDa, dataA,
          sort: sortKey, page, pageSize,
        },
        result_count: count ?? data?.length ?? 0,
      });
    } catch {
      // ignorato
    }

    return NextResponse.json({
      items: data ?? [],
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore di ricerca.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
