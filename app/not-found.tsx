export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">Asta non trovata</h1>
      <p className="mt-2 text-slate-600">
        L&apos;asta richiesta non esiste o è stata rimossa dai dati PVP.
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
