import type { Metadata } from "next";
import { MobileShopComboPreview } from "@/components/saas/mobile-shop-combo-preview";
import "@/components/saas/mobile-shop.css";

export const metadata: Metadata = {
  title: "Mobile shop combo preview",
  robots: { index: false, follow: false },
};

export default function MobileShopComboPreviewPage() {
  return <MobileShopComboPreview />;
}
