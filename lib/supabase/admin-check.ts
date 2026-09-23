import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

/** Ritorna userId se admin, altrimenti null. Verifica SEMPRE server-side su public.profiles. */
export async function getAdminUserId(): Promise<string | null> {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = getSupabaseAdminClient();
  const { data } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  return data?.role === 'admin' ? user.id : null;
}

export async function requireAdminPage() {
  const id = await getAdminUserId();
  if (!id) redirect('/admin/negato');
  return id;
}
