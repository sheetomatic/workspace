# Brand images

Placeholder SVGs ship in-repo so marketing and workspace pages do not 404 during development.

**Founder action before production launch:** replace placeholders with final assets:

| File | Used by |
|------|---------|
| `sheetomatic-logo.svg` | Full lockup (icon + wordmark) — `site-content.ts`, headers |
| `sheetomatic-logo.png` | PNG lockup for exports, YouTube art script |
| `sheetomatic-icon.svg` | Icon-only mark for favicons |
| `founder-shyam.jpg` | About page founder photo (primary) |
| `founder-shyam-optimized.jpg` | High-res founder photo source |
| `founder-shyam.svg` | Placeholder fallback only |
| `og-default.png` | Social share card (1200×630) |

Regenerate PNG/ICO assets after SVG changes:

```bash
python3 scripts/generate-brand-assets.py
```
