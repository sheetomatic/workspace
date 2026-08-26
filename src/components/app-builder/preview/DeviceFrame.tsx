import type { ReactNode } from "react";

export type PreviewDevice = "phone" | "tablet" | "desktop";

export const PREVIEW_DEVICES: { id: PreviewDevice; label: string }[] = [
  { id: "phone", label: "Phone" },
  { id: "tablet", label: "Tablet" },
  { id: "desktop", label: "Desktop" },
];

export function DeviceFrame({
  device,
  children,
}: {
  device: PreviewDevice;
  children: ReactNode;
}) {
  return (
    <figure className={`device-frame is-${device}`}>
      {device === "desktop" ? (
        <div className="device-chrome">
          <i />
          <i />
          <i />
          <span>app.sheetomatic.com/app</span>
        </div>
      ) : device === "phone" ? (
        <div className="island" />
      ) : (
        <div className="device-cam" />
      )}
      <div className="device-screen">{children}</div>
      <figcaption className="device-caption">
        {device === "phone" ? "Phone" : device === "tablet" ? "Tablet" : "Desktop"}
      </figcaption>
    </figure>
  );
}
