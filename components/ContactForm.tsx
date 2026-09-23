'use client';

import { useState } from 'react';

export function ContactForm({ auctionId }: { auctionId: string }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('sending');
    setMsg(null);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ auctionId, ...form }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Invio non riuscito.');
      setStatus('ok');
      setMsg('Richiesta inviata! Ti ricontatteremo al più presto.');
      setForm({ firstName: '', lastName: '', email: '', phone: '', message: '' });
    } catch (err) {
      setStatus('err');
      setMsg(err instanceof Error ? err.message : 'Errore di invio.');
    }
  }

  const inp =
    'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">Richiedi informazioni</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-medium">Nome *</span>
          <input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className={inp} />
        </label>
        <label className="block">
          <span className="text-xs font-medium">Cognome *</span>
          <input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className={inp} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs font-medium">Email *</span>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Telefono *</span>
        <input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inp} placeholder="+39 …" />
      </label>
      <label className="block">
        <span className="text-xs font-medium">Messaggio</span>
        <textarea rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className={inp} placeholder="Vorrei maggiori informazioni su quest'asta…" />
      </label>
      {msg && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            status === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'
          }`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {status === 'sending' ? 'Invio…' : 'Invia richiesta'}
      </button>
      <p className="text-[11px] text-slate-500">
        La richiesta viene salvata nel database e inoltrata via email. Nessun
        dato sensibile è esposto nel browser.
      </p>
    </form>
  );
}
