import Image from "next/image";
import Link from "next/link";
import {
  whatsappDisplayNumber,
  whatsappUrl,
} from "@/app/site-content";

export function WhatsAppFooterQr() {
  return (
    <div className="footer-whatsapp-qr">
      <Link
        aria-label={`Chat on WhatsApp ${whatsappDisplayNumber}`}
        href={whatsappUrl}
        rel="noopener noreferrer"
        target="_blank"
      >
        <Image
          alt={`WhatsApp QR code for ${whatsappDisplayNumber}`}
          className="footer-whatsapp-qr-image"
          height={160}
          src="/images/whatsapp-qr.png"
          width={160}
        />
      </Link>
      <p className="footer-whatsapp-qr-label">Scan to WhatsApp</p>
      <span className="footer-whatsapp-qr-number">{whatsappDisplayNumber}</span>
    </div>
  );
}
