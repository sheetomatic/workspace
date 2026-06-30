export const SHEETOMATIC_UPI_PAYMENT = {
  upiId: "9329103106@ybl",
  payeeName: "SHYAM KUMAR BANJARE",
  qrImageSrc: "/images/payments/phonepe-qr-shyam-kumar-banjare.png",
} as const;

export function buildPlanPaymentNote(plan: {
  messages: string;
  duration: string;
}) {
  const messages = plan.messages === "Unlimited" ? "Unlimited" : `${plan.messages} msgs`;
  return `Sheetomatic WA API ${messages} ${plan.duration}`;
}

export function buildUpiPayUrl(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  const query = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.note.slice(0, 80),
  });
  return `upi://pay?${query.toString()}`;
}

/** Opens PhonePe on mobile when the app is installed. */
export function buildPhonePePayUrl(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  const query = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.note.slice(0, 80),
  });
  return `phonepe://pay?${query.toString()}`;
}

export function buildAndroidPhonePeIntent(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  const query = new URLSearchParams({
    pa: params.upiId,
    pn: params.payeeName,
    am: params.amount.toFixed(2),
    cu: "INR",
    tn: params.note.slice(0, 80),
  });
  return `intent://pay?${query.toString()}#Intent;scheme=upi;package=com.phonepe.app;end`;
}

export function isMobileDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function openPhonePePayment(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}) {
  const phonePeUrl = buildPhonePePayUrl(params);
  const upiUrl = buildUpiPayUrl(params);
  const androidIntent = buildAndroidPhonePeIntent(params);

  if (/Android/i.test(navigator.userAgent)) {
    window.location.href = androidIntent;
    window.setTimeout(() => {
      window.location.href = phonePeUrl;
      window.setTimeout(() => {
        window.location.href = upiUrl;
      }, 700);
    }, 700);
    return;
  }

  window.location.href = phonePeUrl;
  window.setTimeout(() => {
    window.location.href = upiUrl;
  }, 600);
}
