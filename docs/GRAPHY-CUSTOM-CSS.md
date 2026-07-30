# Sheetomatic × Graphy — custom CSS / scripts

Inspected live on https://sheetomatic.graphy.com/products#nav_bar

**What was wrong**
1. Cover images were washed out by `.digital-product-cover-overlay` (60% dark)
2. Ugly “Image” badge on every card
3. Cards had no border/radius (generic `[class*="Card"]` missed lowercase `digital-product-card`)
4. Nav / products page looked sparse and default-Graphy
5. Black “Launch your Graphy” promo in footer

Paste below into Graphy **Add custom scripts and CSS**.

| Field | Paste |
|-------|--------|
| **Custom scripts in `<head>` tag** | **Block A** |
| **Custom scripts in `<body>` tag** | **Block B** |

> Graphy runs custom scripts mainly for **learner** role. If public storefront doesn’t pick up head CSS, also paste the inner `<style>` rules into Graphy’s separate Custom CSS box (if available).

Brand: Navy `#0A1B2E` · Blue `#2563EB` · Cyan `#06B6D4` · Green `#10B981`

---

## Block A — Custom scripts in `<head>` tag

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
<script>
(function () {
  try {
    document.documentElement.classList.add("sm-graphy");
    document.documentElement.style.setProperty("--sm-navy", "#0A1B2E");
    document.documentElement.style.setProperty("--sm-blue", "#2563EB");
    document.documentElement.style.setProperty("--sm-cyan", "#06B6D4");
    document.documentElement.style.setProperty("--sm-green", "#10B981");
  } catch (e) {}
})();
</script>
<style id="sheetomatic-graphy-skin">
:root {
  --sm-navy: #0a1b2e;
  --sm-blue: #2563eb;
  --sm-blue-dark: #1d4ed8;
  --sm-cyan: #06b6d4;
  --sm-green: #10b981;
  --sm-ink: #0f172a;
  --sm-slate: #334155;
  --sm-muted: #64748b;
  --sm-border: #e2e8f0;
  --sm-soft: #f8fafc;
  --sm-font: Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
}

html { scroll-behavior: smooth; }

body {
  font-family: var(--sm-font) !important;
  color: var(--sm-ink) !important;
  background: var(--sm-soft) !important;
  -webkit-font-smoothing: antialiased;
}

a { color: var(--sm-blue); }
a:hover { color: var(--sm-blue-dark); }

/* ========== NAV (header.navbar) ========== */
header.navbar.container {
  position: sticky !important;
  top: 0 !important;
  z-index: 1000 !important;
  min-height: 72px !important;
  padding: 0 24px !important;
  background: #ffffff !important;
  border-bottom: 1px solid var(--sm-border) !important;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.04) !important;
  align-items: center !important;
}

header.navbar .navbar-section img {
  height: 40px !important;
  width: auto !important;
  object-fit: contain !important;
}

header.navbar .nav-link {
  color: var(--sm-slate) !important;
  font-weight: 600 !important;
  font-size: 14px !important;
  padding: 8px 14px !important;
  border-radius: 999px !important;
  text-decoration: none !important;
}

header.navbar .nav-link:hover {
  color: var(--sm-navy) !important;
  background: #f1f5f9 !important;
}

/* Active Digital Products / current store links */
header.navbar .nav-link[href*="/products"],
header.navbar .nav-link[href*="/s/store"] {
  color: var(--sm-blue-dark) !important;
}

header.navbar a.loginBtn,
header.navbar a.btn.btn-primary.loginBtn {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 60%) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 999px !important;
  padding: 10px 22px !important;
  font-weight: 700 !important;
  box-shadow: 0 8px 18px rgba(37, 99, 235, 0.25) !important;
  text-decoration: none !important;
}

#header-collapse-btn,
#navbar-section-btn .btn-link {
  color: var(--sm-navy) !important;
}

/* ========== DIGITAL PRODUCTS PAGE ========== */
.product-container {
  max-width: 1120px !important;
  margin-left: auto !important;
  margin-right: auto !important;
}

.product-title {
  padding: 36px 16px 8px !important;
  font-size: clamp(1.75rem, 3vw, 2.25rem) !important;
  color: var(--sm-navy) !important;
  letter-spacing: -0.03em !important;
  font-weight: 800 !important;
}

.list-heading {
  margin: 0 0 20px !important;
  color: var(--sm-muted) !important;
  font-size: 15px !important;
  font-weight: 500 !important;
}

.digital-product-main.my-12 {
  margin-top: 12px !important;
  margin-bottom: 48px !important;
  padding: 0 16px !important;
}

.digital-product-grid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 24px !important;
}

@media (max-width: 960px) {
  .digital-product-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
}
@media (max-width: 640px) {
  .digital-product-grid { grid-template-columns: 1fr !important; }
}

.digital-product-card {
  background: #fff !important;
  border: 1px solid var(--sm-border) !important;
  border-radius: 16px !important;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06) !important;
  overflow: hidden !important;
  transition: transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease !important;
}

.digital-product-card:hover {
  transform: translateY(-3px) !important;
  border-color: rgba(37, 99, 235, 0.35) !important;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.1) !important;
}

.digital-product-link {
  display: block !important;
  color: inherit !important;
  text-decoration: none !important;
}

.digital-product-cover {
  position: relative !important;
  height: 200px !important;
  overflow: hidden !important;
  margin: 0 !important;
  background: linear-gradient(135deg, #0a1b2e, #1e293b) !important;
}

.digital-product-cover img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
}

/* Was washing images to grey */
.digital-product-cover-overlay {
  opacity: 0 !important;
  display: none !important;
  pointer-events: none !important;
}

/* Hide useless "Image" badge */
.product-type-badge {
  display: none !important;
}

.digital-product-details {
  padding: 16px 18px 18px !important;
}

.digital-product-title {
  margin: 0 0 10px !important;
  font-size: 16px !important;
  line-height: 1.35 !important;
  color: var(--sm-ink) !important;
  font-weight: 700 !important;
  min-height: 44px !important;
}

.digital-product-price {
  color: var(--sm-navy) !important;
  font-size: 18px !important;
  font-weight: 800 !important;
}

.digital-product-mrp {
  color: #94a3b8 !important;
  text-decoration: line-through !important;
  margin-left: 8px !important;
  font-weight: 500 !important;
  font-size: 13px !important;
}

/* ========== STORE / COURSE CARDS (common Graphy) ========== */
.course-card,
[class*="coursecard"],
.sp-course-card {
  border-radius: 16px !important;
  border: 1px solid var(--sm-border) !important;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.06) !important;
  overflow: hidden !important;
  background: #fff !important;
}

button.primary,
.btn-primary,
[class*="BuyNow"],
[class*="buy-now"],
[class*="enroll-btn"] {
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 55%, #0ea5e9 130%) !important;
  color: #fff !important;
  border: none !important;
  border-radius: 999px !important;
  font-weight: 700 !important;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28) !important;
}

/* ========== LEARNER SIDEBAR ========== */
.sidebar,
[class*="Sidebar"],
[class*="LessonList"] {
  background: var(--sm-navy) !important;
  color: rgba(248, 250, 252, 0.92) !important;
}

/* ========== FOOTER ========== */
.yogya-footer {
  background: var(--sm-navy) !important;
  color: rgba(248, 250, 252, 0.85) !important;
  padding: 28px 16px 36px !important;
}

/* Hide Graphy promo CTA (inline styles — also removed in body script) */
.yogya-footer > a[href*="graphy.com/products/create-and-sell"],
.yogya-footer a[href*="graphy.com/products/create-and-sell"] img {
  display: none !important;
}

.yogya-footer .text-center {
  display: none !important;
}

.yogya-footer a {
  color: rgba(248, 250, 252, 0.9) !important;
}

.yogya-footer a:hover {
  color: var(--sm-cyan) !important;
}

input:focus,
textarea:focus,
select:focus {
  border-color: var(--sm-blue) !important;
  outline: 2px solid rgba(37, 99, 235, 0.2) !important;
}
</style>
```

---

## Block B — Custom scripts in `<body>` tag

```html
<script>
(function () {
  function applySheetomaticGraphyPolish() {
    try {
      if (!/sheetomatic/i.test(document.title)) {
        document.title = "Sheetomatic · " + document.title;
      }
      document.body.classList.add("sm-graphy-body");

      // Hide Graphy "Launch your Graphy" promo (fights inline styles)
      document.querySelectorAll(
        '.yogya-footer a[href*="graphy.com/products/create-and-sell"], .yogya-footer .text-center'
      ).forEach(function (el) {
        el.style.setProperty("display", "none", "important");
      });

      // Primary CTAs
      var nodes = document.querySelectorAll(
        "a.loginBtn, a.btn-primary, button.btn-primary, [class*='Buy'], [class*='buy'], [class*='Enroll'], [class*='enroll']"
      );
      nodes.forEach(function (el) {
        var text = (el.textContent || "").trim().toLowerCase();
        var looksPrimary =
          el.classList.contains("loginBtn") ||
          /buy|enroll|start|continue|join|pay|get access|login|watch now/.test(text);
        if (!looksPrimary) return;
        el.style.setProperty(
          "background",
          "linear-gradient(135deg, #2563EB 0%, #1D4ED8 55%, #0EA5E9 130%)",
          "important"
        );
        el.style.setProperty("color", "#ffffff", "important");
        el.style.setProperty("border", "none", "important");
        el.style.setProperty("border-radius", "999px", "important");
        el.style.setProperty("font-weight", "700", "important");
        el.style.setProperty("box-shadow", "0 8px 20px rgba(37, 99, 235, 0.28)", "important");
      });

      // Mark active nav for products / store
      document.querySelectorAll("header.navbar .nav-link").forEach(function (a) {
        var href = a.getAttribute("href") || "";
        var path = location.pathname || "";
        var active =
          (path.indexOf("/products") === 0 && href.indexOf("/products") !== -1) ||
          (path.indexOf("/s/store") === 0 && href.indexOf("/s/store") !== -1);
        if (active) {
          a.style.setProperty("background", "rgba(37,99,235,.08)", "important");
          a.style.setProperty("color", "#1d4ed8", "important");
        }
      });
    } catch (e) {}
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applySheetomaticGraphyPolish);
  } else {
    applySheetomaticGraphyPolish();
  }

  var t;
  try {
    new MutationObserver(function () {
      clearTimeout(t);
      t = setTimeout(applySheetomaticGraphyPolish, 400);
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch (e) {}
})();
</script>
```

---

## After paste

1. Replace any **old** head/body custom scripts with Block A + Block B (don’t stack duplicates).
2. Hard-refresh https://sheetomatic.graphy.com/products#nav_bar
3. You should see: clear product cover images, card borders, sticky navy-clean nav, no “Image” badge, no black Graphy promo.
4. Still upload real product covers in Graphy admin if any card is blank (these three already have covers — they were just hidden by the overlay).
