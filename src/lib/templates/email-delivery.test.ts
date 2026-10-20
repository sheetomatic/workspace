import { afterEach, describe, expect, it, vi } from "vitest";
import { sendPlainEmail } from "@/lib/integrations/email";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
describe("template transactional email transport", () => {
  it("sends a stable provider idempotency key and timeout for invoice retries", async () => {
    vi.stubEnv("RESEND_API_KEY", "local-test-only");
    vi.stubEnv("TASK_EMAIL_FROM", "test@example.test");
    const fetch = vi.fn(async () => Response.json({ id: "email-fixture" }));
    vi.stubGlobal("fetch", fetch);
    const payload = {
      toEmail: "buyer@example.test",
      subject: "Invoice",
      text: "Verified order",
      idempotencyKey: "template-invoice/test-order",
      attachments: [
        {
          filename: "invoice.html",
          content: "<p>Invoice</p>",
          contentType: "text/html",
        },
      ],
    };
    expect(await sendPlainEmail(payload)).toEqual({ sent: true });
    expect(await sendPlainEmail(payload)).toEqual({ sent: true });
    const calls = fetch.mock.calls as unknown as [string, RequestInit][];
    expect(calls[0][0]).toBe("https://api.resend.com/emails");
    expect(calls[0][1].headers).toMatchObject({
      "Idempotency-Key": payload.idempotencyKey,
    });
    expect(calls[0][1].signal).toBeInstanceOf(AbortSignal);
    expect(calls[1][1].body).toBe(calls[0][1].body);
    expect(calls[1][1].headers).toEqual(calls[0][1].headers);
  });
  it("keeps existing non-template email callers unchanged", async () => {
    vi.stubEnv("RESEND_API_KEY", "local-test-only");
    vi.stubEnv("TASK_EMAIL_FROM", "test@example.test");
    const fetch = vi.fn(async () => Response.json({ id: "email-fixture" }));
    vi.stubGlobal("fetch", fetch);
    await sendPlainEmail({
      toEmail: "buyer@example.test",
      subject: "Ordinary email",
      text: "Test",
    });
    const args = (fetch.mock.calls as unknown as [string, RequestInit][])[0][1];
    expect(args.headers).not.toHaveProperty("Idempotency-Key");
    expect(args.signal).toBeUndefined();
  });
});
