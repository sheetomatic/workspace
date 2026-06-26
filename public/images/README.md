# Brand images

Placeholder SVGs ship in-repo so marketing and workspace pages do not 404 during development.

**Founder action before production launch:** replace placeholders with final assets:

| File | Used by |
|------|---------|
| `sheetomatic-logo.svg` (or `.png`) | `site-content.ts`, root layout Open Graph, workspace shell |
| `founder-shyam.svg` (or `.jpg`) | About page founder photo |
| `og-default.png` (optional) | Social share card if you prefer a dedicated OG image over the logo |

Update paths in `src/app/site-content.ts` and `src/app/layout.tsx` if you switch formats.
