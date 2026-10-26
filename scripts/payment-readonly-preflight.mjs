// Run only inside the existing authorized Vercel project's environment.
// No secrets or provider response bodies are printed. No orders are created.
const required = ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET'];
for (const name of required) {
  if (!process.env[name]?.trim()) throw Error(`[payment-preflight] Missing ${name}`);
}
const key = process.env.RAZORPAY_KEY_ID;
if (!/^rzp_live_[a-zA-Z0-9]+$/.test(key)) throw Error('[payment-preflight] Live Key ID format invalid; value withheld');
if (process.env.TEMPLATE_CHECKOUT_ENABLED === 'true') throw Error('[payment-preflight] Checkout must remain disabled during verification');
console.log('[payment-preflight] PASS required configuration present; checkout disabled');
const response = await fetch('https://api.razorpay.com/v1/orders?count=1', {
  method: 'GET', redirect: 'error', cache: 'no-store',
  signal: AbortSignal.timeout(15000),
  headers: { Authorization: `Basic ${Buffer.from(`${key}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64')}` },
});
if (!response.ok) throw Error(`[payment-preflight] Razorpay read-only authentication failed (HTTP ${response.status}); values withheld`);
const result = await response.json();
if (result.entity !== 'collection' || !Array.isArray(result.items)) throw Error('[payment-preflight] Unexpected provider response; body withheld');
console.log('[payment-preflight] PASS Razorpay live read-only authentication; no order/payment created');
console.log('[payment-preflight] UNRUN real webhook delivery, settlement, seller tax certification, activation and notification delivery');
