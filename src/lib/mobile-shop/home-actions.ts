export const MOBILE_SHOP_HOME_ACTIONS = [
  {
    href: "/app/mobile-shop/sales",
    label: "New sale",
    hi: "नया सेल",
  },
  {
    href: "/app/mobile-shop/sales?type=used",
    label: "Used sale",
    hi: "पुराना सेल",
  },
  {
    href: "/app/mobile-shop/repairs",
    label: "Repair",
    hi: "रिपेयर",
  },
  {
    href: "/app/mobile-shop/accessories",
    label: "Accessories",
    hi: "एक्सेसरी",
  },
  {
    href: "/app/mobile-shop/stock-in",
    label: "Stock in",
    hi: "स्टॉक इन",
  },
] as const;

export const MOBILE_SHOP_NAV_LINKS = [
  { href: "/app/mobile-shop", label: "Home", hi: "होम", exact: true as const },
  { href: "/app/mobile-shop/stock", label: "Stock", hi: "स्टॉक", exact: true as const },
  { href: "/app/mobile-shop/sales", label: "Sale", hi: "सेल" },
  { href: "/app/mobile-shop/repairs", label: "Repair", hi: "रिपेयर" },
  { href: "/app/mobile-shop/accessories", label: "Accessories", hi: "एक्सेसरी" },
  { href: "/app/mobile-shop/stock-in", label: "Stock in", hi: "स्टॉक इन" },
] as const;
