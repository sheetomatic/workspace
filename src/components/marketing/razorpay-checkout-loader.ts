"use client";

let loading: Promise<void> | null = null;

/** Shared by Courses and Templates. Failed script loads can be retried safely. */
export function loadRazorpayCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const src = "https://checkout.razorpay.com/v1/checkout.js";
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    const script = existing ?? document.createElement("script");
    const cleanup = () => {
      clearTimeout(timer);
      script.removeEventListener("load", done);
      script.removeEventListener("error", fail);
    };
    const fail = () => {
      cleanup();
      script.remove();
      reject(
        new Error("Razorpay could not load. Check your connection and retry."),
      );
    };
    const done = () => {
      if (!window.Razorpay) {
        fail();
        return;
      }
      cleanup();
      resolve();
    };
    const timer = setTimeout(fail, 15000);
    script.addEventListener("load", done, { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      document.body.appendChild(script);
    }
  }).finally(() => {
    loading = null;
  });
  return loading;
}
