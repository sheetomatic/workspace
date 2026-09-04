import { describe, expect, it } from "vitest";
import {
  parseVoiceLeadConfig,
  parseVoiceProviderConfig,
  isVoiceProviderReady,
  voiceLeadWebhookUrl,
} from "@/lib/leads/connection-config";
import { isLeadSourceComingSoon } from "@/lib/leads/channels";
import {
  buildTwilioTwiml,
  buildVoiceCallRequest,
  confirmationFromMappedCall,
  e164PatientPhone,
  mapVoiceCallPayload,
  parseConfirmationTranscript,
  previewConfirmWrite,
  toConfirmWrite,
} from "@/lib/leads/voice-receptionist";

describe("voice receptionist config", () => {
  it("is a live connector", () => {
    expect(isLeadSourceComingSoon("VOICE")).toBe(false);
  });

  it("requires Exotel keys plus webhook secret", () => {
    expect(
      parseVoiceProviderConfig({
        provider: "EXOTEL",
        exotelSid: "sid",
        exotelApiKey: "key",
        exotelApiToken: "token",
        exotelCallerId: "02212345678",
      }),
    ).toMatchObject({ provider: "EXOTEL", exotelSid: "sid" });
    expect(
      parseVoiceLeadConfig({
        provider: "EXOTEL",
        exotelSid: "sid",
        exotelApiKey: "key",
        exotelApiToken: "token",
        exotelCallerId: "02212345678",
      }),
    ).toBeNull();
    expect(
      parseVoiceLeadConfig({
        provider: "EXOTEL",
        exotelSid: "sid",
        exotelApiKey: "key",
        exotelApiToken: "token",
        exotelCallerId: "02212345678",
        webhookSecret: "vc_abc",
      }),
    ).toMatchObject({ webhookSecret: "vc_abc", provider: "EXOTEL" });
  });

  it("rejects incomplete Twilio", () => {
    expect(
      isVoiceProviderReady({
        provider: "TWILIO",
        twilioAccountSid: "AC1",
        twilioAuthToken: "",
        twilioFromNumber: "+91112",
      }),
    ).toBe(false);
  });
});

describe("voice call payload mapping", () => {
  it("maps Twilio status callbacks", () => {
    const mapped = mapVoiceCallPayload({
      CallSid: "CA123",
      CallStatus: "completed",
      From: "+911100000000",
      To: "+919876543210",
      Direction: "outbound-api",
      Digits: "1",
      RecordingUrl: "https://api.twilio.com/rec",
    });
    expect(mapped?.callSid).toBe("CA123");
    expect(mapped?.to).toBe("+919876543210");
    expect(mapped?.digits).toBe("1");
    expect(mapped?.direction).toBe("outbound");
  });

  it("maps Exotel callbacks", () => {
    const mapped = mapVoiceCallPayload({
      CallSid: "ex-99",
      Status: "completed",
      CallFrom: "09876543210",
      CallTo: "02211112222",
      Direction: "incoming",
      RecordingUrl: "https://recordings.exotel.com/x.mp3",
    });
    expect(mapped?.callSid).toBe("ex-99");
    expect(mapped?.direction).toBe("inbound");
    expect(mapped?.from).toBe("09876543210");
  });
});

describe("confirm then add mapping", () => {
  const now = new Date("2026-09-04T12:00:00+05:30");

  it("parses spoken confirm into CRM write fields", () => {
    const confirmation = parseConfirmationTranscript(
      "Haan confirm. My name is Priya Sharma, tomorrow 4 pm checkup.",
      now,
    );
    expect(confirmation.outcome).toBe("confirmed");
    expect(confirmation.name).toBe("Priya Sharma");
    expect(confirmation.visitType).toBe("checkup");
    expect(confirmation.visitAt).not.toBeNull();
    const write = toConfirmWrite(confirmation);
    expect(write.status).toBe("SCHEDULE_MEETING");
    expect(write.callingStatus).toBe("CONNECTED");
    expect(write.createMeetingFollowUp).toBe(true);
    expect(write.nextFollowUpAt).not.toBeNull();
  });

  it("treats press 1 as confirmed", () => {
    const mapped = mapVoiceCallPayload({
      CallSid: "CA1",
      CallStatus: "completed",
      To: "9876543210",
      Direction: "outbound-api",
      Digits: "1",
    });
    const confirmation = confirmationFromMappedCall(mapped!, null, now);
    expect(confirmation.outcome).toBe("confirmed");
    expect(confirmation.phone).toBe("9876543210");
    const write = toConfirmWrite(confirmation);
    expect(write.callingStatus).toBe("CONNECTED");
    expect(write.status).toBe("SCHEDULE_MEETING");
  });

  it("maps no-answer without opening a meeting", () => {
    const mapped = mapVoiceCallPayload({
      CallSid: "CA2",
      CallStatus: "no-answer",
      To: "9876543210",
      Direction: "outbound-api",
    });
    const write = toConfirmWrite(confirmationFromMappedCall(mapped!, null, now));
    expect(write.callingStatus).toBe("NO_ANSWER");
    expect(write.createMeetingFollowUp).toBe(false);
  });

  it("maps decline to not interested, still one CRM row", () => {
    const confirmation = parseConfirmationTranscript(
      "Nahi, cancel the visit",
      now,
    );
    expect(confirmation.outcome).toBe("declined");
    const write = toConfirmWrite(confirmation);
    expect(write.callingStatus).toBe("NOT_INTERESTED");
    expect(write.status).toBe("FOLLOW_UP");
  });

  it("previews what Test would write", () => {
    const preview = previewConfirmWrite(
      "Yes I confirm, this is Amit, Monday 11 am follow-up",
      now,
    );
    expect(preview.write.status).toBe("SCHEDULE_MEETING");
    expect(preview.confirmation.name).toBe("Amit");
  });
});

describe("outbound call request", () => {
  it("builds Twilio Calls.json with tenant TwiML URL", () => {
    const request = buildVoiceCallRequest({
      config: {
        provider: "TWILIO",
        clinicName: "Sharma Clinic",
        twilioAccountSid: "ACxx",
        twilioAuthToken: "secret",
        twilioFromNumber: "+911140000000",
      },
      patientPhone: "9876543210",
      leadId: "lead_1",
      webhookSecret: "vc_test",
    });
    if ("error" in request) throw new Error(request.error);
    expect(request.url).toContain("ACxx/Calls.json");
    expect(request.body).toContain("To=%2B919876543210");
    expect(request.body).toContain("Url=");
    expect(decodeURIComponent(request.body)).toContain("leadId=lead_1");
    expect(e164PatientPhone("9876543210")).toBe("+919876543210");
  });

  it("builds Exotel connect with StatusCallback secret, not org id", () => {
    const request = buildVoiceCallRequest({
      config: {
        provider: "EXOTEL",
        clinicName: "Sharma Clinic",
        exotelSid: "sid1",
        exotelApiKey: "key",
        exotelApiToken: "tok",
        exotelSubdomain: "api.in.exotel.com",
        exotelCallerId: "02240000000",
        exotelAppId: "app9",
      },
      patientPhone: "9988776655",
      webhookSecret: "vc_ex",
    });
    if ("error" in request) throw new Error(request.error);
    expect(request.url).toContain("api.in.exotel.com");
    expect(request.body).toContain("StatusCallback=");
    expect(request.body).not.toContain("organizationId");
    expect(request.url).not.toContain("organizationId");
    expect(voiceLeadWebhookUrl("vc_ex")).toContain("/api/webhooks/voice/leads/vc_ex");
  });

  it("builds TwiML that asks to confirm", () => {
    const xml = buildTwilioTwiml({
      clinicName: "Sharma Clinic",
      webhookUrl: "https://sheetomatic.com/api/webhooks/voice/leads/vc_x",
    });
    expect(xml).toContain("Sharma Clinic");
    expect(xml).toContain("Press 1");
    expect(xml).toContain("<Gather");
    expect(xml).toContain("<Record");
  });
});
