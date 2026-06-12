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
