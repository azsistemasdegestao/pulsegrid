# Pulsegrid — Notes for Claude Code

Fullstack Angular 21 SSR landing page + embedded lead-capture API. See `tutorial.md` for the full build walkthrough and rationale; this file is the quick-reference for working in the codebase.

## Conventions

- Standalone components only, no NgModules. File/class names do **not** use a `Component`/`Service`/etc. suffix (e.g. `hero.ts` exports `Hero`).
- Use signals (`signal`, `input`, `input.required`, `computed`) over `@Input()`/RxJS where possible.
- Use the new control-flow syntax (`@if`, `@for`, `@switch`) in templates, not `*ngIf`/`*ngFor`.
- Landing page sections live under `src/app/pages/landing/sections/<name>/` and are composed in `landing.html`. Data-driven sections (e.g. `features`, `faq`) define their content as typed arrays/signals in the `.ts` file.

## Testing

- Unit tests: Vitest via `npm test`. It picks up `*.spec.ts` **and** `*.test.ts` anywhere under `src/` — stick to `.spec.ts` to match existing files.
- Server-side unit tests live next to their source in `src/server/**/*.spec.ts` and run in the same Vitest pass as component tests (jsdom env, but `node:crypto` etc. still work fine).
- E2E tests: Playwright, in `e2e/`, run with `npm run e2e` against a server on `:4000` (`playwright.config.ts` sets `baseURL`). CI builds, runs migrations, starts the SSR server, and runs Playwright against it.
- Run `npx prettier --check .` before committing — CI enforces formatting. `.prettierignore` excludes `/dist` and `/drizzle/meta` (generated).

## Key gotchas (don't reintroduce these bugs)

- **`src/server/db/client.ts`** uses a lazy `Proxy` so importing it doesn't connect to Postgres or read `DATABASE_URL` at build time. `npm run build` must succeed with **zero env vars set** — this is what makes the CI `build-and-test` job (no `DATABASE_URL`) work. Don't eagerly call `postgres(...)` / `drizzle(...)` at module scope.
- **`src/server/db/migrate.ts`** uses `tsx`, which doesn't support top-level `await` in this setup — keep migration logic inside an `async function main()`.
- **Admin auth cookie** (`src/server/routes/admin.ts`): the `Secure` flag must be set via `secure: req.secure`, **not** `process.env['NODE_ENV'] === 'production'`. `req.secure` only reflects HTTPS when `app.set('trust proxy', 1)` is enabled and `X-Forwarded-Proto` is forwarded by nginx. Using `NODE_ENV` breaks admin login over plain HTTP (the default Docker Compose setup) because browsers silently drop `Secure` cookies on HTTP.
- **Honeypot field** (lead form) must be hidden via CSS (off-screen positioning), not `display:none`, `hidden`, or removed from the DOM — those are detectable/stripped by some bots and form-fillers.
- **`angular.json` → `security.allowedHosts`** must include `"localhost"` (and any prod domain). An empty array silently falls back to CSR for every route. Runtime override via `NG_ALLOWED_HOSTS` (comma-separated) is read in `src/server.ts`.
- **Admin routes** (`/admin/login`, `/admin/leads`) are `RenderMode.Client` in `app.routes.server.ts` — they're CSR-only shells, not prerendered/SSR'd, since they're behind auth.

## Environment

`.env.example` documents every variable. For local dev without Docker, only `DATABASE_URL`, `ADMIN_PASSWORD`, and `SESSION_SECRET` are required; SMTP vars are optional (email sending no-ops if unset).

## Docker

`docker compose up --build` runs `app` + `postgres` + `nginx`. The `app` container runs `docker/entrypoint.sh`, which applies migrations (`npm run db:migrate`) before starting the server — `tsx` is a runtime dependency for this reason, not just a dev tool.
