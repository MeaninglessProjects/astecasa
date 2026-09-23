import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

/** Callback OAuth / magic-link / reset password. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = createServerSupabase();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}/`);
}
