import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/** GET /api/aste/[id] — dettaglio singola asta (server-side, con blocco scadute). */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from('pvp_aste')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Asta non trovata.' }, { status: 404 });
    }
    const expired =
      !data.data_ora_vendita ||
      new Date(data.data_ora_vendita).getTime() <= Date.now();
    return NextResponse.json({ ...data, _expired: expired });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Errore.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
