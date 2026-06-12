# Pulsegrid

A fullstack landing page template for a B2B SaaS product, built with **Angular 21 (SSR)** and **Tailwind CSS v4**. It ships with an embedded lead-capture API (PostgreSQL + Drizzle ORM), antispam (honeypot + rate limiting), email notifications (Nodemailer + Brevo SMTP), a privacy policy page, and a password-protected admin panel for reviewing submitted leads — all wrapped in a Docker Compose stack with nginx.

📖 **New here?** [`tutorial.md`](./tutorial.md) walks through the entire build from scratch, section by section — use it to understand the codebase or to adapt this template for your own product.

## Quick start (Docker Compose)

The fastest way to run the full stack (app + Postgres + nginx):

```bash
cp .env.example .env
# edit .env: set ADMIN_PASSWORD, SESSION_SECRET, and (optionally) SMTP_* for email
docker compose up --build
```

Then open http://localhost.

- Landing page: `/`
- Privacy policy: `/privacy-policy`
- Admin panel: `/admin/login` (password from `ADMIN_PASSWORD`)

## Local development

Requires Node.js 22+ and a PostgreSQL instance (e.g. `docker compose up postgres`).

```bash
npm install
cp .env.example .env   # set DATABASE_URL, ADMIN_PASSWORD, SESSION_SECRET
npm run db:migrate
npm start               # ng serve, http://localhost:4200
```

## Scripts

| Command                       | Description                                                         |
| ----------------------------- | ------------------------------------------------------------------- |
| `npm start`                   | Angular dev server (CSR, `ng serve`)                                |
| `npm run build`               | Production build (SSR) into `dist/`                                 |
| `npm run serve:ssr:pulsegrid` | Run the built SSR server                                            |
| `npm test`                    | Unit tests (Vitest)                                                 |
| `npm run e2e`                 | End-to-end tests (Playwright) — requires the app running on `:4000` |
| `npm run db:generate`         | Generate a Drizzle migration from `schema.ts`                       |
| `npm run db:migrate`          | Apply pending migrations                                            |

## Project structure

```
src/
  app/
    layout/         # Header, footer
    pages/
      landing/      # Hero, features, how-it-works, testimonials, FAQ, lead form
      privacy-policy/
      admin/        # Login + leads dashboard (CSR-only, auth-gated)
    shared/         # Reusable UI (icon component)
  server/
    api.ts          # Express router mounted by the SSR server
    routes/         # /api/leads, /api/admin/*
    db/             # Drizzle schema, client, migrations
    email/          # Nodemailer + Brevo
    lib/            # Rate limiting, admin auth
e2e/                 # Playwright tests
docker/              # Container entrypoint
nginx/               # Reverse proxy config
```

## Tech stack

- **Frontend**: Angular 21 (standalone components, signals, SSR via `@angular/ssr`), Tailwind CSS v4
- **Backend**: Express (embedded in the Angular SSR server), Zod validation
- **Database**: PostgreSQL + Drizzle ORM
- **Email**: Nodemailer via Brevo SMTP
- **Testing**: Vitest (unit), Playwright (E2E)
- **Infra**: Docker Compose (app + Postgres + nginx), GitHub Actions CI

## Environment variables

See [`.env.example`](./.env.example) for the full list with descriptions.

---

For the full build walkthrough — architecture decisions, gotchas, and how to customize this template for your own product — see [`tutorial.md`](./tutorial.md).
