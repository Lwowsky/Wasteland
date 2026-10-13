# Wasteland King

React + Vite frontend and Cloudflare Worker + D1 backend for Wasteland registration, player administration, registration cycles, public player lists, site settings, imports/exports, backups and admin access.

## Requirements

- Node.js compatible with Vite 8
- npm
- Cloudflare Wrangler (available through `npx wrangler`)
- Firebase project for admin authentication
- Cloudflare D1 database for the Worker

## Local setup

1. Install dependencies with `npm ci`.
2. Copy `.env.example` to `.env.local` and fill the Firebase values.
3. Apply local D1 migrations:

```bash
npx wrangler d1 migrations apply wasteland-king --local
```

4. Start the Worker in one terminal:

```bash
npx wrangler dev
```

5. Start the Vite frontend in another terminal:

```bash
npm run dev
```

By default `.env.example` points `VITE_API_URL` to `http://localhost:8787` for this two-process setup.

## Verification

Run the complete project verification before a commit or deployment:

```bash
npm run verify
```

It checks translation consistency, project imports/reachability, ESLint, Node tests and the production Vite build.

Individual commands:

```bash
npm run audit:translations
npm run audit:project
npm run lint
npm test
npm run build
```

## D1 migrations

Migrations live in `worker/migrations`. Apply them locally with:

```bash
npx wrangler d1 migrations apply wasteland-king --local
```

Apply them to the configured remote D1 database with:

```bash
npx wrangler d1 migrations apply wasteland-king --remote
```

Do not edit an already-applied migration. Add the next numbered migration instead.

## Main project areas

- `src/` — React UI and client-side services.
- `worker/src/` — Cloudflare Worker routes, authorization and D1 services.
- `worker/migrations/` — D1 schema migrations.
- `shared/` — rules/configuration reused by frontend and Worker.
- `tests/` — Node tests for registration and public-player logic.
- `scripts/` — project and translation audits.
- `public/` — static assets.

## Repository hygiene

Do not commit `node_modules`, `dist`, `.env.local` or `.wrangler`. Install dependencies on the current OS with `npm ci`; copying `node_modules` between Windows and Linux/macOS can break native Vite/Rolldown bindings.
