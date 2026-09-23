'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      // NESSUNA conferma email: l'utente è attivo subito (vedi guida Supabase Auth).
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName.trim() } },
      });
      if (err) throw err;
      if (!data.session) {
        // Se il progetto richiedesse conferma email, qui avviseremmo.
        // Con "Confirm email" DISABILITATO, la sessione esiste subito.
        const { error: signInErr } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
        if (signInErr) throw signInErr;
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registrazione non riuscita.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl bg-white p-8 shadow-card">
        <h1 className="text-2xl font-bold">Crea il tuo account</h1>
        <p className="mt-1 text-sm text-slate-500">
          Nessuna email di conferma richiesta: accedi subito.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium">Nome e cognome</span>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Mario Rossi"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="nome@esempio.it"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Password (min. 6 caratteri)</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="••••••••"
            />
          </label>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {loading ? 'Registrazione…' : 'Registrati'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-600">
          Hai già un account?{' '}
          <a href="/login" className="font-medium text-brand-700 hover:underline">
            Accedi
          </a>
        </p>
      </div>
    </div>
  );
}
