import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createServerSupabase } from '@/lib/supabase/server';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';
import { formatEUR, formatDateTimeIT } from '@/lib/format';

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * POST /api/contact — modulo richiesta informazioni.
 * 1) valida input, 2) salva in Supabase (contact_messages),
 * 3) invia email via Resend (SOLO server, chiave mai esposta al frontend).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const auctionId = String(body.auctionId || '').trim();
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim();
    const phone = String(body.phone || '').trim();
    const message = String(body.message || '').slice(0, 5000);

    if (!auctionId) return NextResponse.json({ error: 'Asta mancante.' }, { status: 400 });
    if (!firstName || !lastName)
      return NextResponse.json({ error: 'Nome e cognome obbligatori.' }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ error: 'Email non valida.' }, { status: 400 });
    if (phone.length < 5)
      return NextResponse.json({ error: 'Telefono non valido.' }, { status: 400 });

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const admin = getSupabaseAdminClient();

    // Dati asta per arricchire email e record (mai inventati: solo dal DB).
    const { data: auction } = await admin
      .from('pvp_aste')
      .select('id,comune,provincia,via,numero_civico,prezzo_base,tribunale,data_ora_vendita')
      .eq('id', auctionId)
      .maybeSingle();

    const { data: inserted, error: insErr } = await admin
      .from('contact_messages')
      .insert({
        user_id: user?.id ?? null,
        auction_id: auctionId,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        message: message || null,
        subject: `Richiesta info asta ${auctionId}`,
        status: 'new',
      })
      .select('id')
      .single();
    if (insErr) throw insErr;

    // Invio Resend (se configurato). Il fallimento email NON cancella il salvataggio.
    let resendId: string | null = null;
    let emailError: string | null = null;
    const apiKey = process.env.RESEND_API_KEY;
    // SENZA dominio proprio: Resend mette a disposizione il mittente di test
    // "onboarding@resend.dev", che funziona senza verifiche DNS ma può inviare
    // SOLO all'email con cui ti sei registrato su Resend. Per questo progetto
    // va benissimo: il destinatario delle richieste è sempre e solo la tua
    // casella (CONTACT_DESTINATION_EMAIL = la tua email di registrazione Resend).
    const from =
      process.env.RESEND_FROM_EMAIL || 'Aste Immobiliari <onboarding@resend.dev>';
    const to = process.env.CONTACT_DESTINATION_EMAIL;
    if (apiKey && to) {
      try {
        const resend = new Resend(apiKey);
        const now = new Date().toLocaleString('it-IT');
        const { data: sent, error: sendErr } = await resend.emails.send({
          from,
          to,
          replyTo: email,
          subject: `Nuova richiesta info — asta ${auctionId} (${auction?.comune || '?'})`,
          html: `
            <h2>Nuova richiesta informazioni</h2>
            <ul>
              <li><b>Nome:</b> ${esc(firstName)}</li>
              <li><b>Cognome:</b> ${esc(lastName)}</li>
              <li><b>Email:</b> ${esc(email)}</li>
              <li><b>Telefono:</b> ${esc(phone)}</li>
              <li><b>Data/ora richiesta:</b> ${esc(now)}</li>
            </ul>
            <h3>Immobile / asta interessata</h3>
            <ul>
              <li><b>ID asta:</b> ${esc(auctionId)}</li>
              <li><b>Comune:</b> ${esc(String(auction?.comune ?? 'non disponibile'))}</li>
              <li><b>Provincia:</b> ${esc(String(auction?.provincia ?? 'non disponibile'))}</li>
              <li><b>Indirizzo:</b> ${esc([auction?.via, auction?.numero_civico].filter(Boolean).join(' ') || 'non disponibile')}</li>
              <li><b>Prezzo base:</b> ${esc(formatEUR(auction?.prezzo_base ?? null))}</li>
              <li><b>Data asta:</b> ${esc(formatDateTimeIT(auction?.data_ora_vendita ?? null))}</li>
              <li><b>Link:</b> ${esc(`${process.env.NEXT_PUBLIC_APP_URL || ''}/aste/${auctionId}`)}</li>
            </ul>
            <h3>Messaggio</h3>
            <p>${esc(message || '(nessun messaggio)')}</p>
          `,
        });
        if (sendErr) throw sendErr;
        resendId = sent?.id ?? null;
      } catch (err) {
        emailError = err instanceof Error ? err.message : 'Errore Resend';
      }
    } else {
      emailError = 'Resend non configurato (RESEND_API_KEY / FROM / DESTINATION mancanti).';
    }

    await admin
      .from('contact_messages')
      .update({
        resend_message_id: resendId,
        status: resendId ? 'sent' : 'email_failed',
      })
      .eq('id', inserted.id);

    return NextResponse.json({
      ok: true,
      id: inserted.id,
      emailSent: !!resendId,
      emailError,
    });
  } catch (err) {
    // Gli errori Supabase (PostgrestError) sono oggetti semplici, non istanze
    // di Error: estraiamo il messaggio in modo esplicito così l'utente vede
    // la causa reale invece di un generico "Errore invio."
    let message = 'Errore invio.';
    if (err instanceof Error && err.message) message = err.message;
    else if (err && typeof err === 'object' && 'message' in err && err.message) {
      message = String((err as { message: unknown }).message);
    }
    try {
      console.error('[contact] errore:', message, err);
    } catch {
      // mai bloccare la risposta per un log
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
