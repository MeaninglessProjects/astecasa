import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client PRIVILEGIATO — SOLO SERVER.
 * Usa SUPABASE_SECRET_KEY (o SERVICE_ROLE). MAI importato nel bundle client.
 *
 * Nota tipi: usiamo `SupabaseClient<any>` perché le tabelle del progetto
 * (pvp_aste, profiles, ...) non hanno tipi generati nel client; i controlli
 * di correttezza restano a runtime + RLS + validazione server-side.
 *
 * Usato per:
 * - verifica ruolo admin server-side
 * - statistiche aggregate admin
 * - import PVP (upsert pvp_aste + pvp_sync_state + audit)
 * - salvataggio contact_messages + search_logs
 */
let cached: SupabaseClient<any> | null = null;

export function getSupabaseAdminClient(): SupabaseClient<any> {
  const url =
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secret) {
    throw new Error(
      'Variabili SUPABASE_URL / SUPABASE_SECRET_KEY mancanti (solo server).'
    );
  }
  if (!cached) {
    cached = createClient<any>(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return cached;
}

/**
 * Verifica che il Bearer token corrisponda a un utente con role='admin'
 * nella tabella public.profiles. MAI fidarsi del frontend.
 */
export async function requireAdminByToken(bearer: string | null) {
  if (!bearer) return { ok: false as const, status: 401, message: 'Autenticazione richiesta.' };
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.auth.getUser(bearer);
  if (error || !data.user) {
    return { ok: false as const, status: 401, message: 'Sessione non valida.' };
  }
  const { data: profile, error: pErr } = (await admin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle()) as unknown as {
    data: { role: string | null } | null;
    error: { message: string } | null;
  };
  if (pErr) return { ok: false as const, status: 500, message: pErr.message };
  if (profile?.role !== 'admin') {
    return { ok: false as const, status: 403, message: 'Accesso riservato agli amministratori.' };
  }
  return { ok: true as const, userId: data.user.id };
}
