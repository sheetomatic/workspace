export type MarketingButtonVariant = "primary" | "secondary" | "whatsapp";

export function marketingButtonClass(
  variant: MarketingButtonVariant = "primary",
  extra = "",
) {
  const base = {
    primary: "btn-cta btn-primary",
    secondary: "btn-cta btn-secondary",
    whatsapp: "btn-cta btn-whatsapp",
  }[variant];

  return extra ? `${base} ${extra}`.trim() : base;
}
