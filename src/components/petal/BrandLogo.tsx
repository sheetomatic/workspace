export const LOGO_SRC = "/petal/petal-surya.png";
export const QR_SRC = "/petal/phonepe-qr.png";

export function BrandLogo({
  size = 40,
  wide,
}: {
  size?: number;
  wide?: boolean;
}) {
  return (
    <img
      src={LOGO_SRC}
      alt="Petal — Surya Minerals"
      width={wide ? Math.round(size * 4 / 3) : size}
      height={size}
      style={{
        width: wide ? Math.round(size * 4 / 3) : size,
        height: size,
        objectFit: "cover",
        objectPosition: "center",
        borderRadius: 6,
        background: "#111",
        flexShrink: 0,
        display: "block",
      }}
    />
  );
}
