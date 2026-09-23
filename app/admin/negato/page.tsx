export default function NegatoPage() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">403 — Accesso negato</h1>
      <p className="mt-2 text-slate-600">
        Questa area è riservata agli amministratori. Il tuo ruolo risulta{' '}
        <code>user</code> nel database.
      </p>
      <a
        href="/"
        className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white"
      >
        Torna alla ricerca
      </a>
    </div>
  );
}
