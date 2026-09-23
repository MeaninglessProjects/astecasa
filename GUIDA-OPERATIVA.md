# GUIDA OPERATIVA — AsteCasa (passo-passo)

> Leggi tutto prima di iniziare. Tempo stimato: 45–90 minuti (esclusa attesa importazione PVP).

---

## 1. Prerequisiti

- Node.js 20+ (`node --version`), npm, git
- Account Supabase (free), Vercel (free), Resend (free)
- Il database Supabase contiene già `public.pvp_aste` con i dati PVP

## 2. File da creare / modificare (già pronti nel progetto)

| File | Azione |
|---|---|
| `.env.local` | **creare** da `.env.example`, compilare (punto 5) |
| `supabase/migrations/*.sql` | **applicare** in Supabase SQL Editor (punto 6) |
| tutto il resto | già pronto, non modificare salvo personalizzazioni |

## 3. Comandi base

```bash
cd "ASTE SUP+COD+WEB"
npm install
npm run dev        # http://localhost:3000
npm run typecheck  # deve dare 0 errori
npm run lint
npm run build      # deve completare senza errori
```

## 4. Configurare Supabase — progetto e chiavi

1. https://supabase.com → New project (regione UE, es. West EU).
2. Project Settings → API: annota
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_URL`
   - `publishable key` (o `anon key` nei progetti meno recenti) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `secret key` (o `service_role`) → `SUPABASE_SECRET_KEY` (**solo server/Vercel, mai nel browser**)

## 5. Environment variables locali (`.env.local`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_URL=https://xyz.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=Aste Immobiliari <noreply@tunodominio.it>
CONTACT_DESTINATION_EMAIL=tua@email.it
PVP_SEARCH_URL=https://pvp.giustizia.it/ric-496b258c-986a1b71/ric-ms/ricerca/vendite
PVP_PAGE_SIZE=100
PVP_PAGES_PER_RUN=10
PVP_SLEEP_MS=350
PVP_BACKFILL_SORT=dataOraVendita,asc
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> MAI committare `.env.local` (è in `.gitignore`). Solo `.env.example` va in git.

## 6. Creare tabelle / RLS / indici (SQL)

Nel Supabase Dashboard → SQL Editor → New query, esegui **in ordine**:

1. `supabase/migrations/001_pvp_aste.sql` — aggiunge colonne mancanti a `pvp_aste`, crea indici (data, comune, provincia, prezzi, tribunale, coordinate, GIN trigram), abilita RLS con sola lettura pubblica.
2. `supabase/migrations/002_profiles.sql` — `profiles(id, full_name, role)`, trigger auto-creazione su signup, RLS (l'utente legge solo il proprio profilo; il ruolo non è scrivibile dal browser).
3. `supabase/migrations/003_app_tables.sql` — `favorites`, `contact_messages`, `pvp_sync_state`, `auction_price_history`, `admin_audit_logs`, `search_logs` con RLS e indici.

Verifica: Table Editor deve mostrare tutte le tabelle; `select count(*) from pvp_aste;` deve dare il numero atteso.

## 7. Configurare Auth — NESSUNA conferma email

1. Supabase → Authentication → Providers → Email → **ON**.
2. **Confirm email → OFF / disabilitato** (in alcuni progetti: "Enable email confirmations" OFF). Così `signUp` crea subito la sessione senza link email.
3. Site URL: `http://localhost:3000` (in produzione l'URL Vercel).
4. Redirect URLs: aggiungi `http://localhost:3000/auth/callback` e l'equivalente di produzione.
5. Sicurezza mantenuta: password min 6 char, sessioni via cookie httpOnly (`@supabase/ssr`), RLS attive, secret key solo server.

## 8. Creare / controllare utenti admin

1. Registrati dal sito (`/register`) oppure crea l'utente in Authentication → Users.
2. Recupera l'UUID: `select id, email from auth.users;` oppure Authentication → Users.
3. SQL Editor:
   ```sql
   update public.profiles set role = 'admin' where id = '<UUID>';
   select id, full_name, role from public.profiles where role = 'admin';
   ```
4. Fai logout/login per rinnovare la sessione.

## 9. Configurare Resend (NESSUN dominio richiesto)

1. https://resend.com → registrati con **la tua email personale** (es. Gmail) → API Keys → Create → copia in `RESEND_API_KEY` (solo `.env.local` e Vercel, **mai nel frontend** — usata solo in `app/api/contact/route.ts`).
2. **Non serve alcun dominio**: il codice usa in automatico il mittente di test gratuito `onboarding@resend.dev` se `RESEND_FROM_EMAIL` non è impostato. L'unico vincolo del mittente di test è che può inviare **solo alla tua email di registrazione Resend** — ed è esattamente il nostro caso, perché tutte le richieste del modulo arrivano alla tua casella.
3. Imposta quindi `CONTACT_DESTINATION_EMAIL` = **la stessa email con cui ti sei registrato su Resend**.
4. (Solo futuro, facoltativo) Se un giorno avrai un dominio: Resend → Domains → Add → verifica DNS → imposta `RESEND_FROM_EMAIL=Aste Immobiliari <noreply@tunodominio.it>`.

## 10. Mappe (Leaflet + OpenStreetMap, gratis)

- Nessuna chiave, nessuna carta di credito. Tile `https://{s}.tile.openstreetmap.org/...` con attribuzione OSM (già nel codice).
- Limite d'uso OSM: tile usage policy (uso leggero OK). Il sito usa **solo** lat/lng già presenti nel PVP: **zero geocoding**, quindi nessun costo/limite aggiuntivo.
- Se le tile fossero lente, in futuro si può cambiare provider gratuito (es. CartoDB light) in un solo punto: `components/AuctionMap.tsx`.

## 11. Avvio locale e test

```bash
npm run dev
```

| # | Verifica | Come |
|---|---|---|
| 1 | Registrazione senza email | `/register` → crea utente → entra subito in `/` senza aprire email |
| 2 | Login/logout | `/login`, poi Logout in header |
| 3 | Recupero password | `/reset-password` → ricevi link |
| 4 | Ricerca | home → Cerca → card con risultati; URL `GET /api/aste/search?...` dà JSON paginato |
| 5 | Filtri | prova provincia, prezzi, date, tribunale, ordinamenti |
| 6 | Solo non scadute | confronta `data_ora_vendita` dei risultati con ora attuale (devono essere tutte future) |
| 7 | Solo residenziali | cerca parole come "terreno"/"capannone": non devono apparire risultati puri non-residenziali |
| 8 | Card + minimappa | ogni card mostra mappa OSM col marker; senza coordinate → messaggio elegante |
| 9 | Dettaglio | click card → `/aste/[id]` con mappa grande interattiva + info + statistiche prezzo |
| 10 | Condivisione/SEO | copia URL `/aste/xxx` in finestra anonima (dopo login) → si apre; `<title>` dedicato |
| 11 | Contatti | in dettaglio → compila → Invia → record in `contact_messages` + email Resend |
| 12 | Resend | controlla casella `CONTACT_DESTINATION_EMAIL` + `resend_message_id` nel DB |
| 13 | Preferiti | ☆ su dettaglio → `/preferiti` la mostra |
| 14 | Admin negato | da utente user apri `/admin` → 403 `/admin/negato` |
| 15 | Admin dashboard | da admin: `/admin` → numeri reali, grafici, audit |
| 16 | Importazione manuale | `/admin` → Importa/Aggiorna → batch da N pagine, progresso `next_page/total_pages`, nuovi/aggiornati |
| 17 | Ripresa | riesegui: riparte da `next_page` salvato in `pvp_sync_state` |
| 18 | Mobile | DevTools responsive: card, mappe, admin usabili |

Query utili:

```sql
-- Stato sync
select * from pvp_sync_state;
-- Ultime richieste
select created_at, auction_id, email, status, resend_message_id from contact_messages order by created_at desc limit 10;
-- Audit
select created_at, action, metadata from admin_audit_logs order by created_at desc limit 10;
-- Aste attive conteggio reale
select count(*) from pvp_aste where data_ora_vendita > now();
```

## 12. Deployment su Vercel

1. `git init && git add -A && git commit -m "AsteCasa"`, pusha su GitHub.
2. Vercel → Add New Project → importa repo → Framework: Next.js.
3. Environment Variables (Production + Preview): **tutte** quelle di `.env.example` con valori reali; `NEXT_PUBLIC_APP_URL=https://tuo-progetto.vercel.app`.
4. Deploy. Verifica online: login, ricerca, dettaglio, contatti, `/admin` (admin), mappe.
5. **Nessun cron da configurare** (il progetto non ne contiene: `vercel.json` non dichiara crons).

## 13. Errori comuni

| Sintomo | Causa probabile | Fix |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL mancanti` | `.env.local` assente | crealo da `.env.example`, riavvia `dev` |
| Registrazione chiede conferma email | Confirm email ON | spegnilo (punto 7) |
| `/admin` sempre negato | `profiles.role` ancora `user` | punto 8, poi logout/login |
| Ricerca 0 risultati | DB vuoto su quel Supabase / filtri troppo stretti | azzera filtri; verifica `select count(*) from pvp_aste where data_ora_vendita > now()` |
| PVP HTTP 4xx/5xx | PVP irraggiungibile o URL cambiato | riprova più tardi; aggiorna `PVP_SEARCH_URL` se il Ministero lo cambia |
| Email non arriva | Resend non configurato / dominio non verificato | punto 9; controlla `emailError` in risposta API e colonna `status=email_failed` |
| Tile OSM lente | policy/limiti OSM | riduci zoom minimap o passa a CartoDB in `AuctionMap.tsx` |
| Build Vercel fallita per env | variabili mancanti in Vercel | aggiungi tutte le env in Project Settings |

## 14. Checklist finale

- [ ] `npm run typecheck` verde
- [ ] `npm run lint` verde
- [ ] `npm run build` verde
- [ ] registrazione senza conferma email OK
- [ ] ricerca paginata solo future + residenziali OK
- [ ] card con minimappa OK / fallback coordinate OK
- [ ] dettaglio con mappa grande + statistiche OK
- [ ] contatto salva + email Resend OK (chiavi solo server)
- [ ] preferiti OK con RLS
- [ ] `/admin` negato a user, aperto ad admin
- [ ] statistiche reali + grafici OK
- [ ] importazione manuale a batch con ripresa OK, **nessun cron**
- [ ] deploy Vercel + env prod OK

## 15. Limiti dei piani FREE (dichiarati)

- **Supabase Free**: 500 MB DB, banda/egress limitata, pause dopo inattività. Con centinaia di migliaia di righe: pagination/range sempre attivi, aggregazioni admin su campione 5000, indici dedicati. Se il DB supera il free, serve upgrade o pulizia storiche.
- **Vercel Free/Hobby**: 10s timeout per function (il batch PVP è limitato a max 25 pagine/request proprio per questo), banda limitata, niente cron (qui non servono).
- **Resend Free**: ~100 email/giorno e 3000/mese (valori 2025–2026, verificare dashboard Resend); dominio di test invia solo al proprietario.
- **OpenStreetMap tile**: gratis ma con usage policy (no scraping massivo, attribuzione obbligatoria). Nessun geocoding = nessun costo.
- **PVP Ministero**: endpoint non documentato ufficialmente, può cambiare o rate-limitare: l'import ha `PVP_SLEEP_MS` e batch piccoli apposta.
