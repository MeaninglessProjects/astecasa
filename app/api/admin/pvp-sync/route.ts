import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, requireAdminByToken } from '@/lib/supabase/admin';
import { envInt, fetchPvpPage, mapAuction } from '@/lib/pvp';
import { isResidential } from '@/lib/residential';

type Row = NonNullable<ReturnType<typeof mapAuction>>;

const SOURCE = 'pvp-immobili';
const DEFAULT_BATCH_PAGES = envInt('PVP_PAGES_PER_RUN', 10);
const SIZE = envInt('PVP_PAGE_SIZE', 100);
const SLEEP_MS = envInt('PVP_SLEEP_MS', 350, 0);
const SORT = [process.env.PVP_BACKFILL_SORT || 'dataOraVendita,asc', 'citta,asc'];

function bearerToken(request: NextRequest) {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
}

async function getState() {
  const { data, error } = await getSupabaseAdminClient()
    .from('pvp_sync_state')
    .select('*')
    .eq('source', SOURCE)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function writeState(values: Record<string, unknown>) {
  const { error } = await getSupabaseAdminClient()
    .from('pvp_sync_state')
    .upsert(
      { source: SOURCE, mode: 'backfill', page_size: SIZE, ...values },
      { onConflict: 'source' }
    );
  if (error) throw error;
}

/**
 * Importa UNA pagina PVP con upsert idempotente (id = pvp_aste.id).
 * Ritorna nuovi/aggiornati confrontando `first_seen_at`? Approssimiamo con
 * conteggio pre-esistenti via select id. Registra price history su variazione.
 */
async function importPage(page: number) {
  const admin = getSupabaseAdminClient();
  const body = await fetchPvpPage({ page, size: SIZE, sort: SORT });
  const records: Row[] = body.content
    .map(mapAuction)
    .filter((v): v is Row => v !== null);

  // Filtro residenziale coerente col sito (documentato): importiamo tutto ma
  // tracciamo quanti sono residenziali; il sito mostra solo i residenziali.
  let residential = 0;
  for (const r of records) {
    if (
      isResidential({
        tipo_lotto: r.tipo_lotto,
        categoria_lotto: r.categoria_lotto,
        categoria_bene: r.categoria_bene,
        descrizione: r.descrizione,
      }).residential
    )
      residential++;
  }

  // Distingue nuovi vs aggiornati (batch da 500 id per restare leggeri).
  let nuovi = 0;
  let aggiornati = 0;
  const ids = records.map((r) => r.id);
  const existing = new Set<string>();
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { data, error } = await admin
      .from('pvp_aste')
      .select('id,prezzo_base,offerta_minima')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data ?? []) existing.add(row.id);
  }
  const prevPrices = new Map<string, { prezzo_base: number | null; offerta_minima: number | null }>();
  // Raccogliamo prezzi precedenti per price history (solo chunk correnti).
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500);
    const { data } = await admin
      .from('pvp_aste')
      .select('id,prezzo_base,offerta_minima')
      .in('id', chunk);
    for (const row of data ?? []) {
      prevPrices.set(row.id, {
        prezzo_base: row.prezzo_base != null ? Number(row.prezzo_base) : null,
        offerta_minima: row.offerta_minima != null ? Number(row.offerta_minima) : null,
      });
    }
  }

  for (const r of records) {
    if (existing.has(r.id)) aggiornati++;
    else nuovi++;
  }

  // Upsert a batch da 250 (limite prudente).
  for (let i = 0; i < records.length; i += 250) {
    const batch = records.slice(i, i + 250);
    if (!batch.length) continue;
    const { error } = await admin.from('pvp_aste').upsert(batch, { onConflict: 'id' });
    if (error) throw error;
  }

  // Price history: registra punto quando il prezzo è cambiato o l'asta è nuova.
  const historyRows: {
    auction_id: string;
    base_price: number | null;
    minimum_offer: number | null;
    source: string;
  }[] = [];
  for (const r of records) {
    const prev = prevPrices.get(r.id);
    if (!prev) {
      historyRows.push({
        auction_id: r.id,
        base_price: r.prezzo_base,
        minimum_offer: r.offerta_minima,
        source: 'pvp-import',
      });
    } else if (prev.prezzo_base !== r.prezzo_base || prev.offerta_minima !== r.offerta_minima) {
      historyRows.push({
        auction_id: r.id,
        base_price: r.prezzo_base,
        minimum_offer: r.offerta_minima,
        source: 'pvp-import',
      });
    }
  }
  for (let i = 0; i < historyRows.length; i += 250) {
    const batch = historyRows.slice(i, i + 250);
    if (!batch.length) continue;
    await admin.from('auction_price_history').insert(batch);
  }

  return {
    page,
    totalPages: body.totalPages,
    totalElements: body.totalElements,
    imported: records.length,
    nuovi,
    aggiornati,
    residential,
    errori: 0,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminByToken(bearerToken(request));
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  try {
    const admin = getSupabaseAdminClient();
    const state = await getState();
    const { count, error } = await admin
      .from('pvp_aste')
      .select('*', { count: 'exact', head: true });
    if (error) throw error;
    return NextResponse.json({
      state: state ?? {
        source: SOURCE,
        next_page: 0,
        page_size: SIZE,
        status: 'idle',
      },
      importedCount: count ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/pvp-sync — esegue un BATCH manuale di N pagine PVP.
 * Body: { pages?: number (1..25), reset?: boolean }
 * - NESSUN cron chiama mai questa route: solo click admin dalla dashboard.
 * - A blocchi: ogni request elabora al max 25 pagine, aggiorna pvp_sync_state
 *   dopo OGNI pagina → riprendibile dopo interruzione (next_page persistito).
 */
export async function POST(request: NextRequest) {
  const auth = await requireAdminByToken(bearerToken(request));
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });

  let requestedPages = DEFAULT_BATCH_PAGES;
  let reset = false;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.pages === 'number' && Number.isFinite(body.pages)) {
      requestedPages = Math.max(1, Math.min(25, Math.floor(body.pages)));
    }
    reset = body.reset === true;
  } catch {
    // default
  }

  try {
    const admin = getSupabaseAdminClient();
    if (reset) {
      await writeState({
        status: 'idle',
        next_page: 0,
        total_pages: null,
        total_elements: null,
        last_page_synced: null,
        last_run_count: 0,
        last_new_count: 0,
        last_updated_count: 0,
        last_error: null,
        updated_at: new Date().toISOString(),
      });
      await admin.from('admin_audit_logs').insert({
        admin_user_id: auth.userId,
        action: 'pvp_import_reset',
        target_type: 'pvp_aste',
        metadata: { source: SOURCE },
      });
      return NextResponse.json({ ok: true, reset: true, nextPage: 0 });
    }

    const state = (await getState()) ?? { source: SOURCE, next_page: 0, status: 'idle' };
    if (state.status === 'running') {
      return NextResponse.json({ error: 'Importazione già in corso.' }, { status: 409 });
    }

    const startPage = Number(state.next_page ?? 0);
    await writeState({
      status: 'running',
      last_started_at: new Date().toISOString(),
      last_error: null,
    });

    let totalImported = 0;
    let totalNuovi = 0;
    let totalAggiornati = 0;
    let lastPageSynced: number | null = null;
    let totalPages: number | null = state.total_pages ?? null;
    let totalElements: number | null = state.total_elements ?? null;

    try {
      for (let offset = 0; offset < requestedPages; offset++) {
        const page = startPage + offset;
        if (offset > 0 && SLEEP_MS > 0) {
          await new Promise((r) => setTimeout(r, SLEEP_MS));
        }
        const result = await importPage(page);
        totalImported += result.imported;
        totalNuovi += result.nuovi;
        totalAggiornati += result.aggiornati;
        lastPageSynced = result.page;
        totalPages = result.totalPages;
        totalElements = result.totalElements;

        await writeState({
          status: 'running',
          next_page: result.page + 1,
          total_pages: result.totalPages,
          total_elements: result.totalElements,
          last_page_synced: result.page,
          last_run_count: totalImported,
          last_new_count: totalNuovi,
          last_updated_count: totalAggiornati,
          updated_at: new Date().toISOString(),
        });

        if (result.page + 1 >= result.totalPages) break;
      }

      const nextPage = lastPageSynced == null ? startPage : lastPageSynced + 1;
      const completed = totalPages != null && nextPage >= totalPages;

      await writeState({
        status: completed ? 'completed' : 'idle',
        next_page: nextPage,
        total_pages: totalPages,
        total_elements: totalElements,
        last_page_synced: lastPageSynced,
        last_finished_at: new Date().toISOString(),
        last_run_count: totalImported,
        last_new_count: totalNuovi,
        last_updated_count: totalAggiornati,
        last_error: null,
        updated_at: new Date().toISOString(),
      });

      await admin.from('admin_audit_logs').insert({
        admin_user_id: auth.userId,
        action: 'pvp_import',
        target_type: 'pvp_aste',
        metadata: {
          start_page: startPage,
          end_page: lastPageSynced,
          imported: totalImported,
          nuovi: totalNuovi,
          aggiornati: totalAggiornati,
          total_pages: totalPages,
          total_elements: totalElements,
          completed,
        },
      });

      return NextResponse.json({
        ok: true,
        completed,
        startPage,
        nextPage,
        lastPageSynced,
        totalImported,
        nuovi: totalNuovi,
        aggiornati: totalAggiornati,
        errori: 0,
        totalPages,
        totalElements,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore.';
      await writeState({
        status: 'failed',
        next_page: lastPageSynced == null ? startPage : lastPageSynced + 1,
        total_pages: totalPages,
        total_elements: totalElements,
        last_page_synced: lastPageSynced,
        last_finished_at: new Date().toISOString(),
        last_run_count: totalImported,
        last_new_count: totalNuovi,
        last_updated_count: totalAggiornati,
        last_error: message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      }).catch(() => undefined);
      return NextResponse.json(
        { ok: false, error: message, nextPage: lastPageSynced == null ? startPage : lastPageSynced + 1, totalImported, totalPages, totalElements },
        { status: 500 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
