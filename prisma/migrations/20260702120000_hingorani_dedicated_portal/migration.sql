-- Hingorani: dedicated client portal (hingorani.sheetomatic.com), not Sheetomatic Technologies bundle.
UPDATE "Organization"
SET
  plan = 'LEGAL_ADDON',
  "allowedModules" = ARRAY['CASES', 'REPORTS']::"WorkspaceModule"[],
  "workspaceAppearance" = '{
    "preset": "royal",
    "primary": "#7c3aed",
    "sidebar": "#1e1b4b",
    "sidebarHover": "#312e81",
    "background": "#f5f3ff",
    "productName": "Hingorani Law Chamber",
    "brandName": "Hingorani"
  }'::jsonb
WHERE slug = 'hingorani';
