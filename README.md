# AsteCasa — Portale Aste Immobiliari Residenziali

Next.js 14 + TypeScript + App Router · Supabase (DB/Auth) · Resend (email) · Leaflet + OpenStreetMap (mappe gratuite) · Recharts · Vercel.

**Solo immobili residenziali non scaduti.** Importazione PVP **esclusivamente manuale** da dashboard admin (nessun cron).

## Avvio rapido

```bash
npm install
cp .env.example .env.local   # compila con i tuoi valori
npm run dev                  # http://localhost:3000
```

## Script

| Comando | Cosa fa |
|---|---|
| `npm run dev` | sviluppo locale |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Next lint |
| `npm run build` | build produzione (eseguita anche da Vercel) |

## Struttura

```
app/                  pagine + API routes
  page.tsx            home / ricerca (protetta da login)
  login/ register/ reset-password/ auth/callback/
  aste/[id]/          dettaglio asta
  preferiti/          aste salvate
  admin/              dashboard (solo role=admin)
  api/
    aste/search/      ricerca server-side paginata
    aste/[id]/        dettaglio JSON
    contact/          modulo contatti + Resend
    auth/signout/
    admin/stats/      statistiche reali
    admin/pvp-sync/   importazione PVP manuale a batch
    admin/contacts/   gestione richieste
components/           SearchPanel, HomeSearch, AuctionCard, AuctionMap, ContactForm, PriceStats, FavoriteButton, AdminDashboard, AdminCharts, ContactsManager
lib/
  supabase/           client (browser) / server (RLS) / admin (secret, solo server) / admin-check
  residential.ts      classificazione residenziale (DOCUMENTATA, modificabile)
  validity.ts         regola non-scadute (data_ora_vendita > now())
  pvp.ts              client PVP + mapping (solo server)
  format.ts           formattazione EUR/date
supabase/migrations/  SQL 001 (pvp_aste+indici+RLS), 002 (profiles+trigger), 003 (favorites, contact_messages, pvp_sync_state, auction_price_history, admin_audit_logs, search_logs)
```

## Regole fondamentali (implementate server-side)

1. **Solo residenziali**: `lib/residential.ts` — OR di ILIKE su `tipo_lotto/categoria_lotto/descrizione` + verifica coerente. Modifica le keyword lì.
2. **Solo non scadute**: `WHERE data_ora_vendita > now()` in `app/api/aste/search/route.ts`. Record con data NULL esclusi di default.
3. **Nessun cron**: verificabile con `grep -ri cron` — zero occorrenze di scheduling. Solo `POST /api/admin/pvp-sync` da click admin.
4. **Admin server-side**: ogni API admin verifica `profiles.role='admin'` via secret key; le pagine admin reindirizzano a `/admin/negato`.
5. **Segreti mai nel browser**: `SUPABASE_SECRET_KEY` e `RESEND_API_KEY` usati solo in `lib/supabase/admin.ts` e `app/api/contact/route.ts` (server).

Vedi `GUIDA-OPERATIVA.md` per la procedura passo-passo completa (Supabase, Auth senza conferma email, Resend, mappe, Vercel, test, troubleshooting).
