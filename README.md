# Sunday Pick'em

A family Sunday football pick'em app starter, following the neighboring Clover Basket (`cozyfood`) project's React + TypeScript + Vite approach, optional Supabase configuration, localStorage demo fallback, and GitHub Pages deployment. The visuals use an original retro scoreboard/playbook style and do not include official NFL logos or broadcast artwork.

## Status

Working: responsive matchup dashboard, early/afternoon/night game groups, winner selection, localStorage persistence, unpicked/live/final filters, family pick distribution and missing-pick labels, demo weekly standings, historical-week shell, league-settings shell, fixture/demo labels, GitHub Pages workflow, and initial Supabase schema/security functions.

Not yet live: schedule/results are synthetic fixtures; this build does not authenticate or fetch/write league records in Supabase; invitations, history, import, commissioner tools, scoring, realtime and provider synchronization are not connected. Picks currently remain in this browser's localStorage, so they are not shared with family. Do not use fixture scores as real football data.

## Run locally

Requires Node.js 22+ and npm.

```sh
npm ci
npm run dev
```

Use the local URL printed by Vite. Build and preview the static site with:

```sh
npm run build
npm run preview
npm test
```

No credentials are needed for the fixture demo. Picks are saved under `sunday-pickem-picks-v1` in browser localStorage.

## Supabase foundation

The optional client follows cozyfood's Vite environment pattern. Copy `.env.example` to `.env.local` and set:

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=your-supabase-publishable-key
```

Only the Supabase publishable/anon key belongs in browser configuration. Never put a service-role key in a `VITE_` variable or static-site secret. At present, the UI only detects whether both variables are present; demo picks are not yet connected to Supabase.

Apply `supabase/migrations/202610250001_initial_schema.sql` in Supabase SQL Editor, or use the Supabase CLI after linking your project. It creates profiles, private leagues/memberships, games, picks, scoring results, invitations, and audit records with RLS enabled. Picks are not directly writable by authenticated clients. Use `submit_pick(league_id, game_id, team_id)`, which checks membership, regular-season Sunday eligibility in the league timezone, team validity, game status, and the strict kickoff deadline atomically. SQL functions also support league creation and expiring, hashed, one-time invitations.

Review and test policies in a non-production Supabase project before inviting family. No Supabase project is configured here. Auth UI, client data access, result scoring/sync, admin corrections/audit actions, and profile management remain to be implemented.

## GitHub Pages

1. Push the repository to GitHub on the `main` branch.
2. Under **Settings → Pages**, choose **GitHub Actions** as the source.
3. Push to `main` or manually run **Actions → Deploy to GitHub Pages**.
4. GitHub Actions runs `npm ci`, builds `dist`, and deploys it.

Vite uses `base: './'`, like cozyfood, so assets load from a repository subpath. The demo needs no GitHub secrets. If Supabase browser access is implemented, its publishable key is public by design; protect all records with RLS.

## NFL data and imports

No NFL provider has been chosen or configured, so the schedule shown is fixture data. Before selecting a provider, verify current docs, licensing, pricing, rate limits, freshness, and commercial-use terms. Keep provider secrets on a server-side scheduled job, never in GitHub Pages code. CSV/Excel import, preview, conflict policy, and historical migration are not implemented yet.

## Scripts

- `npm run dev` — local Vite server.
- `npm run build` — TypeScript build and production bundle.
- `npm run preview` — preview the production bundle.
- `npm run lint` — Oxlint.
- `npm test` — timezone, kickoff-lock, and scoring-rule tests.
