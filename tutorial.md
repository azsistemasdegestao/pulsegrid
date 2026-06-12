# Building Pulsegrid: A Fullstack SaaS Landing Page with Angular 21, Drizzle, and Docker

This tutorial walks through building **Pulsegrid**, a B2B SaaS landing page template with a
real, working lead-capture backend embedded directly in the Angular app — no separate API
server. It's meant to be both a **portfolio project** and a **starter template** you can
rebrand and reuse for your own product launches.

By the end, you'll have:

- A dark-themed, mobile-first marketing site (hero, features, how-it-works, testimonials, FAQ)
- A "Request a Demo" form that writes to PostgreSQL and sends an email notification
- Honeypot + rate-limiting antispam with no external services
- A GDPR/CCPA-style privacy policy page
- A password-protected `/admin/leads` dashboard
- A full Docker Compose stack (app + Postgres + nginx)
- Unit tests, Playwright E2E tests, and a GitHub Actions CI pipeline

> **Audience**: this guide assumes you're comfortable with TypeScript, the command line, and
> basic SQL. Angular-specific syntax (signals, the new control-flow syntax, standalone
> components) is explained as we go.

---

## Table of Contents

1. [What We're Building](#1-what-were-building)
2. [Tech Stack & Architecture](#2-tech-stack--architecture)
3. [Prerequisites](#3-prerequisites)
4. [Part 1 — Scaffold the Angular 21 SSR App](#4-part-1--scaffold-the-angular-21-ssr-app)
5. [Part 2 — Dark Design System with Tailwind CSS v4](#5-part-2--dark-design-system-with-tailwind-css-v4)
6. [Part 3 — Landing Page Sections](#6-part-3--landing-page-sections)
7. [Part 4 — PostgreSQL + Drizzle ORM](#7-part-4--postgresql--drizzle-orm)
8. [Part 5 — Embedded API: Lead Capture, Honeypot, Rate Limiting](#8-part-5--embedded-api-lead-capture-honeypot-rate-limiting)
9. [Part 6 — Email Notifications with Nodemailer + Brevo](#9-part-6--email-notifications-with-nodemailer--brevo)
10. [Part 7 — Privacy Policy Page](#10-part-7--privacy-policy-page)
11. [Part 8 — Admin Panel (Auth + Leads Dashboard)](#11-part-8--admin-panel-auth--leads-dashboard)
12. [Part 9 — Docker & Docker Compose](#12-part-9--docker--docker-compose)
13. [Part 10 — Going to Production (TLS / Custom Domain)](#13-part-10--going-to-production-tls--custom-domain)
14. [Part 11 — Testing & CI](#14-part-11--testing--ci)
15. [Customizing This Template for Your Own SaaS](#15-customizing-this-template-for-your-own-saas)
16. [Wrap-up](#16-wrap-up)

---

## 1. What We're Building

Most "Next.js SaaS landing page" templates pair a marketing site with API routes that live in
the same project. We do the same thing with **Angular's SSR server**: Angular 21's
`@angular/ssr` package gives every app an Express server (`src/server.ts`) that normally just
renders pages. We extend that *same* Express app with our own `/api/*` routes, so:

- The marketing site and the lead-capture API ship as **one container**.
- There's no CORS configuration, no second deployment, no separate repo.
- Form submissions hit `/api/leads`, which is served by the exact same Node process that
  rendered the page.

```
┌─────────────────────────────────────────────┐
│              Node process (Express)          │
│                                               │
│  /api/leads   ─┐                             │
│  /api/admin/* ─┼─► custom Express routes     │
│                │   (Drizzle → Postgres,      │
│                │    Nodemailer → Brevo)       │
│                │                             │
│  /, /privacy-* ─► Angular SSR renderer       │
│  /admin/*       ─► Angular CSR shell         │
└─────────────────────────────────────────────┘
```

---

## 2. Tech Stack & Architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Angular 21 (standalone components, signals, `@if`/`@for`) | Modern Angular with SSR built in via `@angular/ssr` |
| Styling | Tailwind CSS v4 (CSS-first config) | Fast to build a polished dark UI; v4's `@theme` block keeps design tokens in CSS |
| Backend | Express, embedded in `src/server.ts` | Reuses the SSR server process — no second deployment |
| Database | PostgreSQL + Drizzle ORM | Type-safe queries, lightweight migrations, plays well with `postgres-js` |
| Email | Nodemailer + Brevo SMTP relay | Free tier SMTP relay, no vendor SDK lock-in |
| Antispam | Honeypot field + in-memory rate limiting | No external CAPTCHA service, no API keys |
| Admin auth | Signed cookie (HMAC-SHA256), no session store | One admin user, no need for a sessions table |
| Tests | Vitest (unit) + Playwright (E2E) | Vitest is Angular 21's default test runner; Playwright covers the fullstack flow |
| Infra | Docker Compose: app + Postgres + nginx | Realistic local "prod-like" setup, one command to start everything |
| CI | GitHub Actions | Lint, unit tests, build, and E2E tests against a real Postgres service container |

---

## 3. Prerequisites

- Node.js 22+ and npm
- Docker and Docker Compose (for Parts 9–11)
- A free [Brevo](https://www.brevo.com/) account if you want real outbound email (optional —
  the app degrades gracefully without it)

---

## 4. Part 1 — Scaffold the Angular 21 SSR App

Start from the Angular CLI with SSR enabled:

```bash
npx @angular/cli@latest new pulsegrid --style=css --ssr --routing
cd pulsegrid
```

This generates a standalone-component app with:

- `src/main.ts` — browser bootstrap
- `src/main.server.ts` — server bootstrap
- `src/server.ts` — the Express server used for SSR
- `src/app/app.config.ts` / `app.config.server.ts` — providers split between browser and server
- `angular.json` — build config, including the new `@angular/build:application` builder with
  `outputMode: "server"` and an `ssr.entry` pointing at `src/server.ts`

A few Angular 21 conventions worth knowing before we continue:

- **No `Component` suffix.** A component class generated for `lead-form` is named `LeadForm`,
  not `LeadFormComponent`. The same applies to services, pipes, etc.
- **New control flow.** Templates use `@if`, `@for`, and `@switch` instead of
  `*ngIf`/`*ngFor`/`*ngSwitch`.
- **Signals** (`signal()`, `input()`, `input.required()`) are the default way to hold and
  expose component state.
- **Vitest** is the default unit test runner (`ng test`), configured via
  `tsconfig.spec.json` and the `@angular/build:unit-test` builder in `angular.json`.

### Routing

`src/app/app.routes.ts` defines four lazy-loaded pages:

```ts
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'privacy-policy',
    loadComponent: () =>
      import('./pages/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  {
    path: 'admin/login',
    loadComponent: () => import('./pages/admin/admin-login/admin-login').then((m) => m.AdminLogin),
  },
  {
    path: 'admin/leads',
    loadComponent: () => import('./pages/admin/admin-leads/admin-leads').then((m) => m.AdminLeads),
  },
];
```

### Hybrid rendering with `ServerRoute[]`

`@angular/ssr` lets you choose a rendering strategy **per route** via
`src/app/app.routes.server.ts`. We prerender the public marketing pages at build time (great
for SEO and TTFB), but render the admin pages purely client-side:

```ts
import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Auth-gated admin pages are client-rendered: there's no SEO benefit, and it
  // avoids forwarding the admin session cookie through SSR data fetches.
  {
    path: 'admin/login',
    renderMode: RenderMode.Client,
  },
  {
    path: 'admin/leads',
    renderMode: RenderMode.Client,
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
```

- `RenderMode.Prerender` — pages are rendered to static HTML at build time (`/` and
  `/privacy-policy`).
- `RenderMode.Client` — the server sends an empty `<app-root></app-root>` shell, and the
  browser does the rendering and data fetching. This sidesteps a whole class of problems
  around forwarding the admin's auth cookie into SSR `HttpClient` calls.

### `provideRouter` with anchor scrolling

The landing page uses in-page anchors (`#features`, `#demo`, etc.) from the header/footer
navigation. `app.config.ts` enables Angular Router's built-in scrolling support so
`routerLink="/" fragment="features"` smooth-scrolls to `<section id="features">`:

```ts
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch()),
  ],
};
```

`provideHttpClient(withFetch())` is important: it makes `HttpClient` use the `fetch` API,
which works in both the browser and Angular's server-side rendering context (Node's
`fetch`), so the same `HttpClient` code can run during SSR without extra polyfills.

`app.config.server.ts` merges in `provideServerRendering(withRoutes(serverRoutes))`:

```ts
import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [provideServerRendering(withRoutes(serverRoutes))],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
```

### A gotcha: `allowedHosts`

By default, a freshly-generated `angular.json` has:

```jsonc
"security": { "allowedHosts": [] }
```

`@angular/ssr`'s dev/prod server validates the incoming `Host` header against this list (plus
the `NG_ALLOWED_HOSTS` env var at runtime, comma-separated). An **empty array does *not* mean
"allow everything"** — it means *nothing* matches, so every request (including `/`) falls back
to a client-side-rendered shell with a console warning:

```
ERROR: Bad Request... Header 'host' with value 'localhost:4000' is not allowed... Falling back to client side rendering
```

Fix it by adding at least `localhost` for local development:

```jsonc
"security": { "allowedHosts": ["localhost"] }
```

For production, you don't need to rebuild — set the `NG_ALLOWED_HOSTS` environment variable
(comma-separated hostnames, `*` wildcard supported) at runtime to your real domain. We wire
this up in [Part 9](#12-part-9--docker--docker-compose).

---

## 5. Part 2 — Dark Design System with Tailwind CSS v4

Tailwind v4 moves configuration into CSS via `@theme`, so there's no `tailwind.config.js` for
basic theming.

```bash
npm install tailwindcss @tailwindcss/postcss postcss
npm install @fontsource/inter
```

`.postcssrc.json`:

```json
{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}
```

`src/styles.css` defines the entire dark palette as CSS custom properties using **OKLCH**
colors (perceptually uniform, easy to tweak lightness/chroma independently):

```css
@import 'tailwindcss';

@import '@fontsource/inter/400.css';
@import '@fontsource/inter/500.css';
@import '@fontsource/inter/600.css';
@import '@fontsource/inter/700.css';
@import '@fontsource/inter/800.css';

@theme {
  --font-sans: 'Inter', ui-sans-serif, system-ui, sans-serif;

  /* Surfaces */
  --color-background: oklch(9% 0.015 280);
  --color-surface: oklch(14% 0.018 280);
  --color-surface-hover: oklch(18% 0.02 280);
  --color-border: oklch(24% 0.02 280);

  /* Text */
  --color-foreground: oklch(96% 0.005 280);
  --color-muted: oklch(63% 0.02 280);

  /* Brand gradient accents */
  --color-accent: oklch(63% 0.25 293);
  --color-accent-secondary: oklch(70% 0.16 230);
}

@layer base {
  html {
    color-scheme: dark;
  }

  body {
    @apply bg-background text-foreground font-sans antialiased;
  }
}
```

Because these are registered in `@theme`, Tailwind generates utility classes for free:
`bg-background`, `text-foreground`, `border-border`, `bg-surface`, `text-accent`,
`from-accent to-accent-secondary` (for gradients), etc. Every component in this project is
built entirely from these tokens plus Tailwind's spacing/typography scale — change six CSS
variables and the whole site re-themes.

`color-scheme: dark` on `<html>` tells the browser to render native form controls (checkboxes,
scrollbars) using dark-mode styling, so they match the rest of the UI without extra CSS.

---

## 6. Part 3 — Landing Page Sections

The landing page is a `Landing` component that composes a `Header`, a `Footer`, and six
`<section>` components inside `<main>`:

```ts
// src/app/pages/landing/landing.ts
import { Component } from '@angular/core';
import { Header } from '../../layout/header/header';
import { Footer } from '../../layout/footer/footer';
import { Hero } from './sections/hero/hero';
import { Features } from './sections/features/features';
import { HowItWorks } from './sections/how-it-works/how-it-works';
import { Testimonials } from './sections/testimonials/testimonials';
import { Faq } from './sections/faq/faq';
import { LeadForm } from './sections/lead-form/lead-form';

@Component({
  selector: 'app-landing',
  imports: [Header, Footer, Hero, Features, HowItWorks, Testimonials, Faq, LeadForm],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
})
export class Landing {}
```

```html
<!-- src/app/pages/landing/landing.html -->
<app-header />
<main>
  <app-hero />
  <app-features />
  <app-how-it-works />
  <app-testimonials />
  <app-faq />
  <app-lead-form />
</main>
<app-footer />
```

Each section lives in its own folder under `src/app/pages/landing/sections/<name>/` with
`.ts`, `.html`, `.css`, and `.spec.ts` files — standard Angular CLI component structure
(`ng generate component pages/landing/sections/hero`).

### Pattern: data-driven sections

Most sections are just a typed array rendered with `@for`. `Features` is a good example:

```ts
// src/app/pages/landing/sections/features/features.ts
import { Component } from '@angular/core';
import { Icon, IconName } from '../../../../shared/icon/icon';

interface Feature {
  title: string;
  description: string;
  icon: IconName;
}

@Component({
  selector: 'app-features',
  imports: [Icon],
  templateUrl: './features.html',
  styleUrl: './features.css',
})
export class Features {
  protected readonly features: Feature[] = [
    { title: 'Real-time dashboards', description: '...', icon: 'chart' },
    { title: 'AI-powered insights', description: '...', icon: 'sparkles' },
    // ...
  ];
}
```

```html
@for (feature of features; track feature.title) {
  <div class="rounded-2xl border border-border bg-surface p-6">
    <app-icon [name]="feature.icon" iconClass="h-6 w-6 text-accent" />
    <h3 class="mt-4 font-semibold">{{ feature.title }}</h3>
    <p class="mt-2 text-sm text-muted">{{ feature.description }}</p>
  </div>
}
```

### Pattern: a shared icon component

Rather than pulling in an icon library, `Icon` (`src/app/shared/icon/icon.ts`) is a tiny
component with a typed `name` input and an inline SVG `@switch` in its template:

```ts
import { Component, input } from '@angular/core';

export type IconName =
  | 'activity' | 'menu' | 'close' | 'check' | 'chart' | 'sparkles'
  | 'link' | 'bell' | 'users' | 'shield' | 'chevron-down' | 'arrow-right';

@Component({
  selector: 'app-icon',
  imports: [],
  templateUrl: './icon.html',
  styleUrl: './icon.css',
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly iconClass = input('h-6 w-6');
}
```

`IconName` is a union type, so every `<app-icon name="...">` usage is type-checked at compile
time — a typo in an icon name is a build error, not a silent blank icon.

### Pattern: local state with signals

`Faq` shows the signals pattern for simple local UI state (an accordion):

```ts
import { Component, signal } from '@angular/core';

@Component({ /* ... */ })
export class Faq {
  protected readonly openIndex = signal<number | null>(0);

  protected readonly items: FaqItem[] = [ /* ... */ ];

  toggle(index: number): void {
    this.openIndex.update((current) => (current === index ? null : index));
  }
}
```

```html
@for (item of items; track item.question; let i = $index) {
  <button (click)="toggle(i)" [attr.aria-expanded]="openIndex() === i">
    {{ item.question }}
  </button>
  @if (openIndex() === i) {
    <div class="px-6 pb-5 text-sm text-muted">{{ item.answer }}</div>
  }
}
```

`Header` uses the same `signal<boolean>` pattern for the mobile nav toggle
(`isMenuOpen`/`toggleMenu`/`closeMenu`).

The remaining sections (`HowItWorks`, `Testimonials`, `Hero`) follow the same
data-array-plus-template approach — open them in `src/app/pages/landing/sections/` if you want
to see the full content. The one section with real logic is `LeadForm`, covered in detail in
[Part 5](#8-part-5--embedded-api-lead-capture-honeypot-rate-limiting).

---

## 7. Part 4 — PostgreSQL + Drizzle ORM

### Install

```bash
npm install drizzle-orm postgres dotenv
npm install -D drizzle-kit tsx
```

- `postgres` — a fast, pure-JS Postgres driver (`postgres-js`)
- `drizzle-orm` — type-safe query builder on top of it
- `drizzle-kit` — generates SQL migrations from your schema
- `tsx` — runs TypeScript files directly (used for the migration script)
- `dotenv` — loads `.env` for local tooling (drizzle-kit, the migration script)

### Schema

`src/server/db/schema.ts` defines a single `leads` table:

```ts
import { boolean, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const leads = pgTable('leads', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  company: text('company').notNull(),
  message: text('message'),
  consent: boolean('consent').notNull().default(false),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Lead = typeof leads.$inferSelect;
export type NewLead = typeof leads.$inferInsert;
```

Drizzle infers `Lead` (a row as returned from `SELECT`) and `NewLead` (the shape accepted by
`INSERT`) directly from the table definition — these types flow through the API routes and the
email notification function with zero duplication.

### `drizzle.config.ts`

```ts
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/server/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL']!,
  },
});
```

Generate the migration SQL:

```bash
npm run db:generate   # drizzle-kit generate
```

This produces `drizzle/0000_abnormal_scream.sql` (drizzle-kit names migrations with a random
adjective+noun) plus metadata under `drizzle/meta/`:

```sql
CREATE TABLE "leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"company" text NOT NULL,
	"message" text,
	"consent" boolean DEFAULT false NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

### The database client — and a key gotcha

The naive approach is:

```ts
// DON'T do this
const connectionString = process.env['DATABASE_URL']!;
export const db = drizzle(postgres(connectionString));
```

This **throws at import time** if `DATABASE_URL` isn't set. That's fine for the running
server (where env vars are always set), but Angular's production build *also* statically
analyzes and executes the server module graph during **route prerendering** — even for routes
that are `RenderMode.Client` and never touch the database. The build would fail with:

```
Error: DATABASE_URL environment variable is required
```

...even though `/api/*` routes are never prerendered. The fix is a **lazy-initialization
Proxy**: the module loads fine with no env vars, and `DATABASE_URL` is only read the first time
a property of `db` is actually accessed — which only happens inside a real request handler.

```ts
// src/server/db/client.ts
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Db = PostgresJsDatabase<typeof schema>;

let instance: Db | null = null;

function getDb(): Db {
  if (!instance) {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    instance = drizzle(postgres(connectionString), { schema });
  }
  return instance;
}

export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
```

Every call site (`db.select()`, `db.insert()`, ...) looks completely normal — the Proxy is
invisible to callers. This is a useful general pattern any time a module needs an env-var-gated
singleton but must also be **safely importable** in build-time/static-analysis contexts.

### Migration script

`src/server/db/migrate.ts` runs `drizzle-orm`'s migrator against `./drizzle`:

```ts
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

const queryClient = postgres(connectionString, { max: 1 });
const db = drizzle(queryClient);

async function main() {
  await migrate(db, { migrationsFolder: './drizzle' });
  await queryClient.end();
  console.log('Migrations applied successfully.');
}

main();
```

> **Gotcha**: `tsx` runs this file with CommonJS-compatible output by default, which doesn't
> support **top-level `await`**. Wrapping the logic in an `async function main()` and calling
> it avoids `Error: Top-level await is currently not supported with the "cjs" output format`.

`package.json` script:

```json
"db:migrate": "tsx src/server/db/migrate.ts"
```

### Local Postgres for development

```bash
docker run --name pulsegrid-pg -e POSTGRES_USER=pulsegrid -e POSTGRES_PASSWORD=pulsegrid \
  -e POSTGRES_DB=pulsegrid -p 5432:5432 -d postgres:17-alpine
```

Then copy `.env.example` to `.env`, set `DATABASE_URL=postgres://pulsegrid:pulsegrid@localhost:5432/pulsegrid`,
and run:

```bash
npm run db:migrate
```

---

## 8. Part 5 — Embedded API: Lead Capture, Honeypot, Rate Limiting

### Wiring the API into the SSR server

`src/server.ts` is the entry point Angular generated for SSR. We add four lines to mount our
own API router *before* Angular's catch-all renderer:

```ts
import cookieParser from 'cookie-parser';
import express from 'express';
import { apiRouter } from './server/api';

const app = express();
const angularApp = new AngularNodeAppEngine();

// Required for accurate `req.ip` (and rate limiting) behind the nginx reverse proxy.
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use('/api', apiRouter);

// ... static file serving, then the Angular SSR catch-all
```

`app.set('trust proxy', 1)` tells Express to trust the immediate upstream proxy's
`X-Forwarded-For` / `X-Forwarded-Proto` / `X-Forwarded-Host` headers. This makes `req.ip`
return the real client IP (not nginx's container IP) and `req.secure` reflect whether the
*original* request was HTTPS — both matter later.

`src/server/api.ts` is just a router that mounts feature routers:

```ts
import { Router } from 'express';
import { adminRouter } from './routes/admin';
import { leadsRouter } from './routes/leads';

export const apiRouter = Router();

apiRouter.use('/leads', leadsRouter);
apiRouter.use('/admin', adminRouter);
```

### Rate limiting without Redis

For a single-instance app, an in-memory `Map<ip, { count, resetAt }>` is enough:

```ts
// src/server/lib/rate-limit.ts
import type { NextFunction, Request, Response } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
}

interface Hit {
  count: number;
  resetAt: number;
}

export function rateLimit({ windowMs, max, message }: RateLimitOptions) {
  const hits = new Map<string, Hit>();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? 'unknown';
    const now = Date.now();
    const hit = hits.get(key);

    if (!hit || hit.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (hit.count >= max) {
      res.status(429).json({ message });
      return;
    }

    hit.count += 1;
    next();
  };
}
```

Each route gets its own `rateLimit({...})` instance with its own `Map`, so the leads form
(5 requests / 10 minutes) and the admin login (10 attempts / 10 minutes) are tracked
independently. This is intentionally simple — if you ever run multiple app instances behind a
load balancer, swap the `Map` for a Redis-backed store, but for a single container it's zero
extra infrastructure.

### Validation with Zod, honeypot, and the leads route

```ts
// src/server/routes/leads.ts
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { leads } from '../db/schema';
import { sendLeadNotification } from '../email/send-lead-notification';
import { rateLimit } from '../lib/rate-limit';

const leadSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().toLowerCase().email(),
  company: z.string().trim().min(1),
  message: z.string().trim().optional().default(''),
  consent: z.literal(true),
  // Honeypot field: real visitors never fill this in.
  website: z.string().optional().default(''),
});

export const leadsRouter = Router();

leadsRouter.post(
  '/',
  rateLimit({ windowMs: 10 * 60 * 1000, max: 5, message: 'Too many requests. Please try again later.' }),
  async (req, res) => {
    const result = leadSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({ message: 'Please check your information and try again.' });
      return;
    }

    const { website, ...lead } = result.data;

    if (website) {
      // Honeypot tripped: respond as if successful without persisting anything.
      res.status(201).json({ success: true });
      return;
    }

    try {
      const [inserted] = await db
        .insert(leads)
        .values({ ...lead, ipAddress: req.ip })
        .returning();

      sendLeadNotification(inserted).catch((err: unknown) => {
        console.error('Failed to send lead notification email', err);
      });

      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Failed to save lead', err);
      res.status(500).json({ message: 'Something went wrong. Please try again in a moment.' });
    }
  },
);
```

A few design choices worth calling out:

- **`consent: z.literal(true)`** — the consent checkbox must be checked; anything else fails
  validation with a 400. This is also enforced client-side (`Validators.requiredTrue`), but
  the server is the source of truth.
- **Honeypot returns `201` without writing to the database.** A bot that fills in every field
  (including the hidden `website` field) gets a "success" response and never knows it was
  rejected — it just silently never reaches your inbox or database.
- **Email sending is fire-and-forget** (`.catch(...)`, not `await`ed before responding). A
  flaky SMTP relay should never turn a successful lead capture into a 500 for the visitor.

### The lead form component

`LeadForm` (`src/app/pages/landing/sections/lead-form/lead-form.ts`) is a Reactive Form with a
hidden honeypot field and a `state` signal driving the UI:

```ts
import { Component, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Icon } from '../../../../shared/icon/icon';

type SubmitState = 'idle' | 'submitting' | 'success' | 'error';

@Component({
  selector: 'app-lead-form',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './lead-form.html',
  styleUrl: './lead-form.css',
})
export class LeadForm {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  protected readonly state = signal<SubmitState>('idle');
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    company: ['', [Validators.required]],
    message: [''],
    consent: [false, [Validators.requiredTrue]],
    // Honeypot field: hidden from real visitors via CSS, left empty by humans.
    // Bots that auto-fill every field will trip this and get silently rejected server-side.
    website: [''],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.state.set('submitting');
    this.errorMessage.set('');

    this.http.post('/api/leads', this.form.getRawValue()).subscribe({
      next: () => {
        this.state.set('success');
        this.form.reset({ name: '', email: '', company: '', message: '', consent: false, website: '' });
      },
      error: (err: HttpErrorResponse) => {
        this.state.set('error');
        this.errorMessage.set(err.error?.message ?? 'Something went wrong. Please try again in a moment.');
      },
    });
  }

  submitAnother(): void {
    this.state.set('idle');
  }
}
```

The honeypot field in the template is hidden **visually**, not with `display:none` or
`hidden` (which some bots specifically check for):

```html
<!-- Honeypot field: hidden from real visitors, left empty by humans. -->
<div class="absolute h-0 w-0 overflow-hidden" aria-hidden="true">
  <label for="website">Website</label>
  <input id="website" type="text" formControlName="website" tabindex="-1" autocomplete="off" />
</div>
```

`aria-hidden="true"` and `tabindex="-1"` keep it out of the accessibility tree and tab order
for real users, while still being present in the DOM (and thus auto-filled) for naive bots.

When `state() === 'success'`, the form is swapped for a confirmation card with a checkmark
icon and a "Submit another request" button that resets `state` back to `'idle'`.

---

## 9. Part 6 — Email Notifications with Nodemailer + Brevo

```bash
npm install nodemailer
npm install -D @types/nodemailer
```

[Brevo](https://www.brevo.com/) (formerly Sendinblue) offers a free-tier SMTP relay — no SDK,
just SMTP credentials from **Transactional → SMTP & API** in their dashboard.

### A transporter that's optional by design

```ts
// src/server/email/client.ts
import nodemailer, { type Transporter } from 'nodemailer';

let transporter: Transporter | null = null;

/**
 * Lazily creates a shared SMTP transporter from env vars. Returns `null` when
 * SMTP isn't configured so local development can run without Brevo credentials.
 */
export function getTransporter(): Transporter | null {
  if (transporter) {
    return transporter;
  }

  const host = process.env['SMTP_HOST'];
  const port = process.env['SMTP_PORT'];
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];

  if (!host || !port || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  return transporter;
}
```

```ts
// src/server/email/send-lead-notification.ts
import { getTransporter } from './client';
import type { NewLead } from '../db/schema';

export async function sendLeadNotification(lead: NewLead): Promise<void> {
  const transporter = getTransporter();
  const to = process.env['EMAIL_TO'];
  const from = process.env['EMAIL_FROM'];

  if (!transporter || !to || !from) {
    console.warn('Email notification skipped: SMTP not configured.');
    return;
  }

  await transporter.sendMail({
    from,
    to,
    replyTo: lead.email,
    subject: `New Pulsegrid demo request from ${lead.company}`,
    text: [
      `Name: ${lead.name}`,
      `Email: ${lead.email}`,
      `Company: ${lead.company}`,
      `Message: ${lead.message || '(none)'}`,
    ].join('\n'),
    html: [
      `<p><strong>Name:</strong> ${lead.name}</p>`,
      `<p><strong>Email:</strong> ${lead.email}</p>`,
      `<p><strong>Company:</strong> ${lead.company}</p>`,
      `<p><strong>Message:</strong> ${lead.message || '(none)'}</p>`,
    ].join('\n'),
  });
}
```

If `SMTP_USER`/`SMTP_PASS` (or `EMAIL_TO`/`EMAIL_FROM`) aren't set, the function logs a warning
and returns — **the lead is still saved to the database**, only the notification email is
skipped. This means the app runs end-to-end in local development and CI without ever touching
Brevo.

`replyTo: lead.email` means hitting "Reply" on the notification email goes straight to the
prospect, not back to your own `EMAIL_FROM` address.

### Environment variables for email

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM="Pulsegrid <no-reply@example.com>"
EMAIL_TO=sales@example.com
```

---

## 10. Part 7 — Privacy Policy Page

The lead form's consent checkbox links to `/privacy-policy`, and the footer links to it too.
The page is a standalone component (`src/app/pages/privacy-policy/privacy-policy.ts`) wrapped
in the same `Header`/`Footer` as the landing page, prerendered at build time (it's covered by
the `RenderMode.Prerender` catch-all in `app.routes.server.ts`).

The policy itself is **deliberately generic** — GDPR/CCPA-flavored rather than tied to any one
jurisdiction, since the template targets an international/US audience rather than a specific
country's regulator. It covers:

1. Information We Collect (form data, IP address, cookies)
2. How We Use Your Information
3. Legal Basis for Processing (GDPR)
4. Cookies and Similar Technologies
5. How We Share Your Information
6. Data Retention
7. Your Privacy Rights (separate subsections for EEA/UK, California, and "other regions")
8. Data Security & International Transfers
9. Contact Us
10. Changes to This Policy

Because this is a **template**, the page opens with a visible disclaimer banner explaining
that the policy is a starting point and a real business must adapt it with a lawyer before
launch, and replace the placeholder contact email and company name.

> ⚠️ **If you reuse this template**: search for the placeholder company name/email in
> `privacy-policy.html` and replace them, then have the policy reviewed for your actual
> jurisdiction and data practices. This page is a structural starting point, not legal advice.

---

## 11. Part 8 — Admin Panel (Auth + Leads Dashboard)

The admin panel has two routes: `/admin/login` and `/admin/leads`. Both are
`RenderMode.Client` (see [Part 1](#4-part-1--scaffold-the-angular-21-ssr-app)) — the server
sends an empty shell, and `AdminLeads`'s constructor immediately calls `/api/admin/leads` via
`HttpClient`.

### Signed-cookie auth, no session table

There's exactly one admin user (a shared password from an env var), so a full sessions table
would be overkill. Instead, `src/server/lib/admin-auth.ts` issues a cookie containing an
**expiry timestamp signed with HMAC-SHA256**:

```ts
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

const COOKIE_NAME = 'pulsegrid_admin';
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

function getSessionSecret(): string {
  const secret = process.env['SESSION_SECRET'];
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required');
  }
  return secret;
}

function sign(value: string): string {
  return createHmac('sha256', getSessionSecret()).update(value).digest('hex');
}

/** Builds a signed `expiry.signature` token proving the admin authenticated before `expiresAt`. */
export function createAdminToken(): string {
  const expiresAt = Date.now() + SESSION_TTL_MS;
  return `${expiresAt}.${sign(String(expiresAt))}`;
}

function isValidAdminToken(token: string): boolean {
  const [expiresAt, signature] = token.split('.');
  if (!expiresAt || !signature) {
    return false;
  }

  const expected = sign(expiresAt);
  const signatureBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (signatureBuf.length !== expectedBuf.length || !timingSafeEqual(signatureBuf, expectedBuf)) {
    return false;
  }

  return Number(expiresAt) > Date.now();
}

export const ADMIN_COOKIE_NAME = COOKIE_NAME;
export const ADMIN_COOKIE_MAX_AGE_MS = SESSION_TTL_MS;

export function verifyAdminPassword(password: string): boolean {
  const expected = process.env['ADMIN_PASSWORD'];
  if (!expected) {
    throw new Error('ADMIN_PASSWORD environment variable is required');
  }

  const providedBuf = Buffer.from(password);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[COOKIE_NAME];

  if (typeof token !== 'string' || !isValidAdminToken(token)) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  next();
}
```

Two security details worth understanding:

- **`timingSafeEqual`** compares the password and the cookie signature in constant time,
  preventing timing attacks that could otherwise leak how many leading characters of a guess
  are correct. Both `verifyAdminPassword` and `isValidAdminToken` check buffer *lengths* first
  (a cheap, non-secret-dependent check) before calling `timingSafeEqual`, since
  `timingSafeEqual` throws if the buffers differ in length.
- **The token is a signature, not an opaque ID.** There's nothing to look up in a database —
  `isValidAdminToken` just recomputes the HMAC of the embedded expiry and compares it. If the
  `SESSION_SECRET` ever leaks, rotate it and *all* existing admin cookies become invalid
  immediately.

### Admin routes

```ts
// src/server/routes/admin.ts
import { desc } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db/client';
import { leads } from '../db/schema';
import {
  ADMIN_COOKIE_MAX_AGE_MS,
  ADMIN_COOKIE_NAME,
  createAdminToken,
  requireAdmin,
  verifyAdminPassword,
} from '../lib/admin-auth';
import { rateLimit } from '../lib/rate-limit';

const loginSchema = z.object({
  password: z.string().min(1),
});

export const adminRouter = Router();

adminRouter.post(
  '/login',
  rateLimit({ windowMs: 10 * 60 * 1000, max: 10, message: 'Too many attempts. Please try again later.' }),
  (req, res) => {
    const result = loginSchema.safeParse(req.body);

    if (!result.success || !verifyAdminPassword(result.data.password)) {
      res.status(401).json({ message: 'Incorrect password.' });
      return;
    }

    res.cookie(ADMIN_COOKIE_NAME, createAdminToken(), {
      httpOnly: true,
      sameSite: 'lax',
      // `req.secure` reflects X-Forwarded-Proto (trust proxy is enabled), so the
      // cookie is only marked Secure when the original request was over HTTPS.
      // This keeps the admin panel working over plain HTTP (default Docker Compose setup)
      // while still adding the Secure flag once TLS is in front of the app.
      secure: req.secure,
      maxAge: ADMIN_COOKIE_MAX_AGE_MS,
    });
    res.json({ success: true });
  },
);

adminRouter.post('/logout', (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME);
  res.json({ success: true });
});

adminRouter.get('/leads', requireAdmin, async (_req, res) => {
  const allLeads = await db.select().from(leads).orderBy(desc(leads.createdAt));
  res.json({ leads: allLeads });
});
```

> **Gotcha**: an earlier version of this code set `secure: process.env.NODE_ENV === 'production'`.
> That's a *very* common pattern, but it breaks this project's default deployment: Docker
> Compose runs `NODE_ENV=production` while serving over **plain HTTP** (TLS is an optional
> add-on, see [Part 10](#13-part-10--going-to-production-tls--custom-domain)). A cookie with
> the `Secure` attribute is **never sent by the browser over an insecure connection** — so the
> admin login would appear to succeed (the `Set-Cookie` header is present) but every subsequent
> request to `/api/admin/leads` would come back `401`, because the browser silently dropped the
> cookie. Deriving `secure` from `req.secure` (which respects `X-Forwarded-Proto` thanks to
> `trust proxy`) makes the cookie work correctly in both the default HTTP setup and the
> TLS-terminated production setup, with no extra configuration.

### Admin login & dashboard components

`AdminLogin` is a small reactive form that POSTs to `/api/admin/login` and navigates to
`/admin/leads` on success:

```ts
// src/app/pages/admin/admin-login/admin-login.ts
@Component({
  selector: 'app-admin-login',
  imports: [ReactiveFormsModule, RouterLink, Icon],
  templateUrl: './admin-login.html',
  styleUrl: './admin-login.css',
})
export class AdminLogin {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.http.post('/api/admin/login', this.form.getRawValue()).subscribe({
      next: () => this.router.navigateByUrl('/admin/leads'),
      error: (err: HttpErrorResponse) => {
        this.submitting.set(false);
        this.errorMessage.set(err.error?.message ?? 'Something went wrong. Please try again.');
      },
    });
  }
}
```

`AdminLeads` fetches the leads list on construction and redirects back to `/admin/login` if it
gets a `401` (e.g. the cookie expired):

```ts
// src/app/pages/admin/admin-leads/admin-leads.ts
type LoadState = 'loading' | 'loaded' | 'error';

@Component({
  selector: 'app-admin-leads',
  imports: [RouterLink, Icon, DatePipe],
  templateUrl: './admin-leads.html',
  styleUrl: './admin-leads.css',
})
export class AdminLeads {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  protected readonly state = signal<LoadState>('loading');
  protected readonly leads = signal<LeadRow[]>([]);

  constructor() {
    this.fetchLeads();
  }

  fetchLeads(): void {
    this.state.set('loading');
    this.http.get<{ leads: LeadRow[] }>('/api/admin/leads').subscribe({
      next: ({ leads }) => {
        this.leads.set(leads);
        this.state.set('loaded');
      },
      error: (err: HttpErrorResponse) => {
        if (err.status === 401) {
          this.router.navigateByUrl('/admin/login');
          return;
        }
        this.state.set('error');
      },
    });
  }

  logout(): void {
    this.http.post('/api/admin/logout', {}).subscribe({
      complete: () => this.router.navigateByUrl('/admin/login'),
    });
  }
}
```

The template uses `@switch (state())` to render a loading state, an error state with a "Try
again" button, an empty state, or a table of leads (Submitted date via `DatePipe`, Name, Email
as a `mailto:` link, Company, Message, IP address).

---

## 12. Part 9 — Docker & Docker Compose

### Multi-stage `Dockerfile`

```dockerfile
# ---- Dependencies (incl. devDependencies, needed to build) ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Build the Angular SSR app ----
FROM deps AS build
COPY . .
RUN npm run build

# ---- Production-only dependencies ----
FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ---- Runtime image ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/src/server/db ./src/server/db
COPY package.json ./
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

EXPOSE 4000

ENTRYPOINT ["./entrypoint.sh"]
```

Four stages, two of which (`deps`/`prod-deps`) exist purely to produce two different
`node_modules` trees:

- **`deps`** — full `npm ci` (including devDependencies like `@angular/cli`, Tailwind,
  TypeScript) needed to run `ng build`.
- **`build`** — copies the full source and runs `npm run build`, producing
  `dist/pulsegrid/{browser,server}`.
- **`prod-deps`** — a *separate*, clean `npm ci --omit=dev`. This is **not** a subset of
  `deps`'s `node_modules` — it's installed from scratch so the final image never contains
  devDependencies (smaller image, smaller attack surface).
- **`runner`** — copies only what's needed at runtime: the production `node_modules`, the
  build output, the Drizzle schema + migrations (needed by `db:migrate` at startup), and the
  entrypoint script.

> **Note**: `tsx` is listed in `dependencies` (not `devDependencies`) in `package.json`,
> because the entrypoint script runs `npm run db:migrate` — i.e. `tsx src/server/db/migrate.ts`
> — *inside the production container*, where `prod-deps` only installed `dependencies`.

### Entrypoint: migrate, then serve

```sh
#!/bin/sh
set -e

npm run db:migrate

exec node dist/pulsegrid/server/server.mjs
```

`exec` replaces the shell process with `node`, so the Node process becomes PID 1 and receives
signals (`SIGTERM` from `docker stop`) directly — important for graceful shutdown.

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-pulsegrid}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-pulsegrid}
      POSTGRES_DB: ${POSTGRES_DB:-pulsegrid}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-pulsegrid}']
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    build: .
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: postgres://${POSTGRES_USER:-pulsegrid}:${POSTGRES_PASSWORD:-pulsegrid}@postgres:5432/${POSTGRES_DB:-pulsegrid}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      SESSION_SECRET: ${SESSION_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      EMAIL_FROM: ${EMAIL_FROM}
      EMAIL_TO: ${EMAIL_TO}
      NG_ALLOWED_HOSTS: ${NG_ALLOWED_HOSTS:-localhost}
      NG_TRUST_PROXY_HEADERS: x-forwarded-for,x-forwarded-host,x-forwarded-proto

  nginx:
    image: nginx:alpine
    restart: unless-stopped
    depends_on:
      - app
    ports:
      - '80:80'
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/conf.d/default.conf:ro

volumes:
  pgdata:
```

Key points:

- **Only nginx publishes a port.** `app` and `postgres` are reachable only on the internal
  Compose network (`app:4000`, `postgres:5432`) — nginx is the single entry point.
- **`DATABASE_URL` is assembled from the `POSTGRES_*` vars**, so you only set the Postgres
  credentials once.
- **`depends_on: condition: service_healthy`** ensures the app container — and therefore its
  `db:migrate` entrypoint step — doesn't start until Postgres's `pg_isready` healthcheck
  passes.
- **`NG_ALLOWED_HOSTS=${NG_ALLOWED_HOSTS:-localhost}`** — defaults to `localhost` (matches
  nginx forwarding `Host: localhost` for `http://localhost`), but can be overridden per
  environment without rebuilding the image.
- **`NG_TRUST_PROXY_HEADERS=x-forwarded-for,x-forwarded-host,x-forwarded-proto`** — by default,
  `@angular/ssr` does **not** trust `X-Forwarded-For` (only `x-forwarded-host` and
  `x-forwarded-proto`), and will fall back to CSR with a console warning if it sees an
  untrusted forwarded header. Since nginx sends `X-Forwarded-For`, we explicitly allow it.

### nginx reverse proxy

```nginx
server {
  listen 80;
  server_name _;

  location / {
    proxy_pass http://app:4000;
    proxy_http_version 1.1;

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

`proxy_set_header Host $host` forwards the original `Host` header — combined with
`app.set('trust proxy', 1)` and `NG_ALLOWED_HOSTS`, this is what lets the Angular SSR server
correctly validate requests arriving via nginx.

### Running it

```bash
cp .env.example .env
# edit .env: set ADMIN_PASSWORD, SESSION_SECRET to real random values

docker compose up -d --build
```

Then visit `http://localhost`. The app container's entrypoint runs `db:migrate` automatically
on every start (it's idempotent — Drizzle's migrator records applied migrations in a
`__drizzle_migrations` table and skips ones already applied).

To tear everything down (including the Postgres volume):

```bash
docker compose down -v
```

---

## 13. Part 10 — Going to Production (TLS / Custom Domain)

The Compose setup above is intentionally HTTP-only and `localhost`-oriented, so it works
out of the box on any machine with Docker. For a real deployment on a domain you own, two
things change:

### 1. Point `NG_ALLOWED_HOSTS` at your domain

No rebuild needed — just set the environment variable for the `app` service (e.g. in your
`.env` file or your hosting platform's environment settings):

```
NG_ALLOWED_HOSTS=example.com,www.example.com
```

### 2. Terminate TLS in front of nginx

The simplest approach is **[Caddy](https://caddyhq.com/)** as a drop-in replacement for the
nginx service — it gets you automatic Let's Encrypt certificates with a 5-line config:

```caddyfile
example.com, www.example.com {
  reverse_proxy app:4000
}
```

If you'd rather keep nginx, use [certbot](https://certbot.eff.org/) to obtain certificates and
extend `nginx/nginx.conf` with a `listen 443 ssl` server block plus `ssl_certificate` /
`ssl_certificate_key` directives, and an HTTP→HTTPS redirect on `listen 80`.

Either way, make sure your edge proxy sets:

```
X-Forwarded-Proto: https
X-Forwarded-Host: <your-domain>
X-Forwarded-For: <client-ip>
```

Once `X-Forwarded-Proto: https` reaches the app (via `trust proxy` + `NG_TRUST_PROXY_HEADERS`),
`req.secure` becomes `true`, and the admin session cookie automatically gets the `Secure`
attribute (see [Part 8](#11-part-8--admin-panel-auth--leads-dashboard)) — no code changes
required.

### 3. Use real secrets

Generate strong random values for `ADMIN_PASSWORD` and `SESSION_SECRET`, e.g.:

```bash
openssl rand -base64 32
```

And configure real Brevo SMTP credentials for `SMTP_USER`/`SMTP_PASS` so lead notifications
actually go out.

---

## 14. Part 11 — Testing & CI

### Unit tests (Vitest)

Angular 21's `ng test` runs **Vitest** and discovers `*.spec.ts` files across the whole `src/`
tree — including plain TypeScript files that have nothing to do with Angular components. We
use this to put fast, dependency-free unit tests right next to the server logic that most
needs them: rate limiting and admin auth.

`src/server/lib/rate-limit.spec.ts` uses `vi.useFakeTimers()` to test the time-window logic
without real delays:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rateLimit } from './rate-limit';

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows requests under the limit and blocks once the limit is exceeded', () => {
    const middleware = rateLimit({ windowMs: 1000, max: 2, message: 'Too many requests.' });
    // ... call middleware 3 times with a mock req/res, assert the 3rd is a 429
  });

  it('resets the count once the window has elapsed', () => {
    // ... call middleware, then vi.setSystemTime(1001) and call again — should be allowed
  });
});
```

`src/server/lib/admin-auth.spec.ts` covers the security-sensitive paths: correct/incorrect
passwords, a valid token, an **expired** token (advance fake time past the 8-hour TTL), and a
token with a **tampered signature**. Both spec files use lightweight hand-rolled mocks for
Express's `Request`/`Response` rather than pulling in a mocking library — just objects with the
handful of methods/properties the code under test actually touches.

Run everything with:

```bash
npm test
```

This runs all 16 spec files (Angular components + server logic) in one Vitest run.

### End-to-end tests (Playwright)

Two E2E specs under `e2e/` exercise the app through a real browser against a running server:

- **`e2e/landing.spec.ts`** — the landing page renders its hero heading and header/footer
  links (SSR sanity check), and navigating to the privacy policy works.
- **`e2e/lead-form.spec.ts`** — fills out and submits the "Request a Demo" form and asserts the
  success message appears (a full round trip through `HttpClient` → `/api/leads` → Zod
  validation → Drizzle insert → Postgres), plus a negative case asserting the consent
  validation error shows when the checkbox is left unchecked.

```ts
// e2e/lead-form.spec.ts (excerpt)
test('submits the lead form and shows a success message', async ({ page }) => {
  await page.goto('/');

  const form = page.locator('#demo form');
  await form.locator('#name').fill('Ada Lovelace');
  await form.locator('#email').fill(`ada.${Date.now()}@example.com`);
  await form.locator('#company').fill('Analytical Engines Ltd');
  await form.locator('#message').fill('Would love to see the anomaly detection in action.');
  await form.getByRole('checkbox').check();

  await form.getByRole('button', { name: 'Request a Demo' }).click();

  await expect(page.getByText('Thanks, we got it!')).toBeVisible();
});
```

`playwright.config.ts` keeps things simple — it does **not** start the server itself; instead
it points at `E2E_BASE_URL` (defaulting to `http://localhost:4000`). You bring your own running
server, either via `docker compose up` or a local build:

```ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env['CI'] ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env['E2E_BASE_URL'] ?? 'http://localhost:4000',
    trace: 'retain-on-failure',
  },
});
```

To run the E2E suite locally:

```bash
npx playwright install --with-deps chromium   # one-time
npm run build
npm run db:migrate
npm run serve:ssr:pulsegrid &
npm run e2e
```

### GitHub Actions CI

`.github/workflows/ci.yml` defines two jobs:

1. **`build-and-test`** — checks formatting (`prettier --check .`), runs the full Vitest suite,
   and runs `npm run build`. This build step also doubles as a regression test for the lazy DB
   Proxy from [Part 4](#7-part-4--postgresql--drizzle-orm): the job has **no `DATABASE_URL`**
   set, so if the build ever started eagerly connecting to a database again, it would fail
   here first.

2. **`e2e`** — spins up a `postgres:17-alpine` **service container**, runs `npm run build` and
   `npm run db:migrate` against it, starts the server in the background, waits for it to
   respond, runs `npm run e2e`, and finally uploads the Playwright HTML report as a build
   artifact (useful for debugging a failed run — screenshots and traces are included via
   `trace: 'retain-on-failure'`).

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: build-and-test

    services:
      postgres:
        image: postgres:17-alpine
        env:
          POSTGRES_USER: pulsegrid
          POSTGRES_PASSWORD: pulsegrid
          POSTGRES_DB: pulsegrid
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U pulsegrid"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgres://pulsegrid:pulsegrid@localhost:5432/pulsegrid
      ADMIN_PASSWORD: test-admin-password
      SESSION_SECRET: test-session-secret
      NG_ALLOWED_HOSTS: localhost
      PORT: 4000

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run build
      - run: npm run db:migrate
      - name: Run E2E tests
        run: |
          npm run serve:ssr:pulsegrid &
          SERVER_PID=$!
          for i in $(seq 1 30); do
            curl -sf http://localhost:4000/ > /dev/null && break
            sleep 1
          done
          npm run e2e
          EXIT_CODE=$?
          kill $SERVER_PID
          exit $EXIT_CODE
```

Note that `SMTP_*`/`EMAIL_*` env vars are deliberately **not** set in CI — this exercises the
"SMTP not configured" path from [Part 6](#9-part-6--email-notifications-with-nodemailer--brevo)
and confirms the app degrades gracefully rather than erroring.

---

## 15. Customizing This Template for Your Own SaaS

To turn Pulsegrid into your own product's landing page:

1. **Rebrand**: replace "Pulsegrid" in `Header`, `Footer`, `<title>` (`src/index.html`), and the
   admin panel header. Update the OKLCH color tokens in `src/styles.css` (`--color-accent`,
   `--color-accent-secondary`) to your brand colors — everything else derives from them.
2. **Rewrite copy**: each landing section's data array (`Features.features`, `Faq.items`,
   `Testimonials`, etc.) is plain TypeScript — edit the strings, add/remove entries.
3. **Extend the `leads` schema**: add columns to `src/server/db/schema.ts` (e.g. `phone`,
   `companySize`), run `npm run db:generate` to create a new migration, add the matching form
   field + `Validators` in `LeadForm`, and add a column to the admin table.
4. **Adjust antispam thresholds**: tune `windowMs`/`max` in the `rateLimit(...)` calls in
   `src/server/routes/leads.ts` and `admin.ts` to taste.
5. **Replace the privacy policy placeholders** and have it reviewed for your jurisdiction (see
   [Part 7](#10-part-7--privacy-policy-page)).
6. **Add more admin users**: the current design assumes a single shared password. For multiple
   admins, you'd add a `users` table, hash passwords (e.g. with `bcrypt`), and look up the user
   in `requireAdmin` instead of comparing against a single env var.

---

## 16. Wrap-up

What started as "a landing page" ended up exercising a surprising amount of fullstack surface
area: SSR hybrid rendering, a Proxy-based lazy database client, signed-cookie auth with
constant-time comparisons, an in-memory rate limiter, a multi-stage Docker build, and a CI
pipeline that spins up Postgres and a real browser.

The result is a single repository that:

- `npm run build && npm test` — builds and tests with **zero environment variables required**
- `docker compose up` — runs the entire stack (app + Postgres + nginx) with one command
- `npm run e2e` — proves the marketing site, the lead-capture API, the database, and the admin
  panel all work together

If you're using this as a template for your own project, start with
[Part 15](#15-customizing-this-template-for-your-own-saas) — and good luck with the launch!
