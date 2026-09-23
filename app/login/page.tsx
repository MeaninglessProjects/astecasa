'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
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
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      router.push(params.get('redirect') || '/');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login non riuscito.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
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
        <span className="text-sm font-medium">Password</span>
        <input
          type="password"
          required
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
        {loading ? 'Accesso…' : 'Accedi'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <div className="rounded-2xl bg-white p-8 shadow-card">
        <h1 className="text-2xl font-bold">Accedi ad AsteCasa</h1>
        <p className="mt-1 text-sm text-slate-500">
          Solo aste di case, appartamenti e ville ancora disponibili.
        </p>
        <Suspense fallback={<p className="mt-6 text-sm text-slate-500">Caricamento…</p>}>
          <LoginForm />
        </Suspense>
        <div className="mt-4 flex items-center justify-between text-sm">
          <a href="/register" className="font-medium text-brand-700 hover:underline">
            Crea un account
          </a>
          <a
            href="/reset-password"
            className="font-medium text-slate-600 hover:underline"
          >
            Password dimenticata?
          </a>
        </div>
      </div>
    </div>
  );
}
