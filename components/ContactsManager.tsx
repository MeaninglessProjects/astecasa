'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Msg = {
  id: string;
  created_at: string;
  auction_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  message: string | null;
  status: string;
};

export function ContactsManager() {
  const [items, setItems] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/contacts', {
        headers: data.session ? { authorization: `Bearer ${data.session.access_token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setItems(json.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    await fetch('/api/admin/contacts', {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
        ...(data.session ? { authorization: `Bearer ${data.session.access_token}` } : {}),
      },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  if (loading) return <p className="px-4 py-8">Caricamento…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-8">
      <h1 className="text-2xl font-bold">Richieste di contatto</h1>
      {error && <p className="rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-card">
        <table className="w-full min-w-[800px] text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-3 py-2">Data</th>
              <th className="px-3 py-2">Asta</th>
              <th className="px-3 py-2">Nome</th>
              <th className="px-3 py-2">Email / Telefono</th>
              <th className="px-3 py-2">Messaggio</th>
              <th className="px-3 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 align-top">
                <td className="px-3 py-2 text-xs">{new Date(m.created_at).toLocaleString('it-IT')}</td>
                <td className="px-3 py-2">
                  <a href={`/aste/${m.auction_id}`} className="font-mono text-brand-700 hover:underline">
                    {m.auction_id}
                  </a>
                </td>
                <td className="px-3 py-2">{m.first_name} {m.last_name}</td>
                <td className="px-3 py-2 text-xs">{m.email}<br />{m.phone}</td>
                <td className="px-3 py-2 text-xs">{m.message || '—'}</td>
                <td className="px-3 py-2">
                  <select
                    value={m.status}
                    onChange={(e) => setStatus(m.id, e.target.value)}
                    className="rounded-lg border border-slate-300 px-2 py-1 text-xs"
                  >
                    {['new', 'read', 'contacted', 'closed', 'sent', 'email_failed'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
