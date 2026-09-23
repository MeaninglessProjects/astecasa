import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Client Supabase SERVER-SIDE per Route Handler / Server Component.
 * Usa la chiave PUBBLICA (anon/publishable): rispetta RLS.
 * Da usare per letture utente (ricerca aste, dettaglio, preferiti).
 *
 * Tipi `any`: le tabelle del progetto non hanno tipi generati; la
 * correttezza è garantita da validazione server-side + RLS.
 */
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options?: CookieOptions;
          }[]
        ) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Chiamato da Server Component: il set dei cookie è ignorato.
          }
        },
      },
    }
  );
}
