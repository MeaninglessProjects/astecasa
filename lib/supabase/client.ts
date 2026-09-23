import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase per il BROWSER.
 * Usa SOLO la publishable/anon key pubblica. MAI la secret key qui.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  if (!url || !key) {
    throw new Error(
      'Variabili NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY mancanti.'
    );
  }
  return createBrowserClient(url, key);
}
