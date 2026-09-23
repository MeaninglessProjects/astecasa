import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'AsteCasa — Aste Immobiliari Residenziali',
    template: '%s | AsteCasa',
  },
  description:
    'Trova casa all\u2019asta: solo immobili residenziali (appartamenti, case, ville) ancora disponibili, con mappe, filtri e aggiornamenti dal Portale Vendite Pubbliche.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <div className="min-h-screen flex flex-col">
          <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
              <a href="/" className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 font-bold text-white">
                  AC
                </span>
                <span className="leading-tight">
                  <span className="block text-base font-bold text-slate-900">
                    AsteCasa
                  </span>
                  <span className="block text-xs text-slate-500">
                    Solo aste immobiliari residenziali
                  </span>
                </span>
              </a>
              <nav className="flex items-center gap-2 text-sm">
                <a
                  href="/"
                  className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cerca
                </a>
                <a
                  href="/preferiti"
                  className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Preferiti
                </a>
                <a
                  href="/admin"
                  className="rounded-lg px-3 py-2 font-medium text-slate-700 hover:bg-slate-100"
                >
                  Admin
                </a>
                <form action="/api/auth/signout" method="post">
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-900 px-3 py-2 font-medium text-white hover:bg-slate-700"
                  >
                    Logout
                  </button>
                </form>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <p>
                AsteCasa — dati dal Portale delle Vendite Pubbliche. Solo
                immobili residenziali non scaduti.
              </p>
              <p>Mappe © OpenStreetMap contributors · Leaflet</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
