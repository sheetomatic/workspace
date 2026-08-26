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
  if (device === "desktop") {
    return (
      <div className="device-frame is-desktop">
        <div className="device-chrome">
          <i />
          <i />
          <i />
          <span>app.sheetomatic.com/app</span>
        </div>
        <div className="device-screen">{children}</div>
      </div>
    );
  }
  return (
    <div className={`device-frame is-${device}`}>
      {device === "phone" ? <div className="island" /> : <div className="device-cam" />}
      <div className="device-screen">{children}</div>
    </div>
  );
}
