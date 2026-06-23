/**
 * Paste into Google Form > Responses sheet > Extensions > Apps Script.
 * On each form submit, notifies Sheetomatic to send the WhatsApp thank-you
 * message immediately (no customer reply required).
 *
 * Set Script property WEBHOOK_SECRET to your CRON_SECRET from Vercel.
 */
function onFormSubmit(e) {
  var phone = extractPhoneFromSubmit(e);
  var payload = phone ? JSON.stringify({ phone: phone }) : "{}";
  var secret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");

  if (!secret) {
    throw new Error("Missing WEBHOOK_SECRET script property. Set it to your Vercel CRON_SECRET.");
  }

  var response = UrlFetchApp.fetch("https://sheetomatic.com/api/webhooks/google-form", {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: "Bearer " + secret,
    },
    payload: payload,
    muteHttpExceptions: true,
  });

  var code = response.getResponseCode();
  var body = response.getContentText();

  if (code < 200 || code >= 300) {
    throw new Error("Webhook failed HTTP " + code + ": " + body);
  }

  var result = JSON.parse(body);
  if (result.sent === 0) {
    Logger.log(
      "Webhook OK but no WhatsApp sent. checked=" +
        result.checked +
        " skipped=" +
        result.skipped +
        " reason=" +
        (result.reason || "unknown") +
        " phone=" +
        phone
    );
  }
}

function extractPhoneFromSubmit(e) {
  if (!e || !e.namedValues) {
    return "";
  }
  var keys = Object.keys(e.namedValues);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i].toLowerCase();
    if (
      key.indexOf("phone") !== -1 ||
      key.indexOf("whatsapp") !== -1 ||
      key.indexOf("mobile") !== -1
    ) {
      var value = (e.namedValues[keys[i]][0] || "").replace(/\D/g, "");
      if (value.length >= 10) {
        return value;
      }
    }
  }
  return "";
}
