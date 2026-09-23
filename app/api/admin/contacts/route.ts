import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient, requireAdminByToken } from '@/lib/supabase/admin';

function bearer(request: NextRequest): string | null {
  const h = request.headers.get('authorization');
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

/** GET /api/admin/contacts — ultime richieste contatto (solo admin). */
export async function GET(request: NextRequest) {
  const auth = await requireAdminByToken(bearer(request));
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  try {
    const admin = getSupabaseAdminClient();
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get('page') || '1') || 1);
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const { data, error, count } = await admin
      .from('contact_messages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return NextResponse.json({ items: data, total: count, page, pageSize });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore.' },
      { status: 500 }
    );
  }
}

/** PATCH /api/admin/contacts — aggiorna stato richiesta. Body: { id, status } */
export async function PATCH(request: NextRequest) {
  const auth = await requireAdminByToken(bearer(request));
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  try {
    const { id, status } = await request.json();
    if (!id || !['new', 'read', 'contacted', 'closed', 'sent', 'email_failed'].includes(status)) {
      return NextResponse.json({ error: 'Stato non valido.' }, { status: 400 });
    }
    const admin = getSupabaseAdminClient();
    const { error } = await admin
      .from('contact_messages')
      .update({ status })
      .eq('id', id);
    if (error) throw error;
    await admin.from('admin_audit_logs').insert({
      admin_user_id: auth.userId,
      action: 'contact_status',
      target_type: 'contact_messages',
      target_id: String(id),
      metadata: { status },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Errore.' },
      { status: 500 }
    );
  }
}
