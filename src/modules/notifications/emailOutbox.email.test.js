import test from "node:test";
import assert from "node:assert/strict";
import { sendTrainingTelegramAccessEmail } from "./emailOutbox.email.js";

test("sends the paid training email through Resend with safe HTML and stable idempotency", async (t) => {
  const previous = {
    key: process.env.RESEND_API_KEY,
    from: process.env.TRANSACTIONAL_FROM_EMAIL,
    replyTo: process.env.SUPPORT_REPLY_TO_EMAIL,
  };
  t.after(() => {
    if (previous.key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.key;
    if (previous.from === undefined) delete process.env.TRANSACTIONAL_FROM_EMAIL;
    else process.env.TRANSACTIONAL_FROM_EMAIL = previous.from;
    if (previous.replyTo === undefined) delete process.env.SUPPORT_REPLY_TO_EMAIL;
    else process.env.SUPPORT_REPLY_TO_EMAIL = previous.replyTo;
  });

  process.env.RESEND_API_KEY = "test-key";
  process.env.TRANSACTIONAL_FROM_EMAIL = "KPX Academy <admissions@example.com>";
  process.env.SUPPORT_REPLY_TO_EMAIL = "support@example.com";

  let request;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ id: "resend_test_123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const result = await sendTrainingTelegramAccessEmail({
    id: "outbox_123",
    name: "<script>alert(1)</script>",
    email: "student@example.com",
    programTitle: "Resin & Art",
    telegramGroupUrl: "https://t.me/example",
  });

  assert.equal(result.id, "resend_test_123");
  assert.equal(request.url, "https://api.resend.com/emails");
  assert.equal(request.options.headers["Idempotency-Key"], "training-telegram-access-outbox_123");
  assert.equal(request.body.reply_to, "support@example.com");
  assert.ok(request.body.html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.equal(request.body.html.includes("<script>alert(1)</script>"), false);
  assert.ok(request.body.text.includes("https://t.me/example"));
});

test("sends workshop status notifications without exposing private access credentials", async (t) => {
  const previous = {
    key: process.env.RESEND_API_KEY,
    from: process.env.TRANSACTIONAL_FROM_EMAIL,
    replyTo: process.env.SUPPORT_REPLY_TO_EMAIL,
  };
  t.after(() => {
    if (previous.key === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.key;
    if (previous.from === undefined) delete process.env.TRANSACTIONAL_FROM_EMAIL;
    else process.env.TRANSACTIONAL_FROM_EMAIL = previous.from;
    if (previous.replyTo === undefined) delete process.env.SUPPORT_REPLY_TO_EMAIL;
    else process.env.SUPPORT_REPLY_TO_EMAIL = previous.replyTo;
  });

  process.env.RESEND_API_KEY = "test-key";
  process.env.TRANSACTIONAL_FROM_EMAIL = "KPX Academy <admissions@example.com>";
  delete process.env.SUPPORT_REPLY_TO_EMAIL;

  let request;
  t.mock.method(globalThis, "fetch", async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return new Response(JSON.stringify({ id: "resend_workshop_123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });

  const { sendWorkshopBookingNotification } = await import("./emailOutbox.email.js");
  const result = await sendWorkshopBookingNotification({
    id: "outbox_workshop_123",
    notificationType: "RESCHEDULED",
    name: "Ada <script>",
    email: "ada@example.com",
    publicReference: "KPX-WKS-ABC123",
    workshopTitle: "Resin Art",
    previousEventDate: "2026-12-01T10:00:00.000Z",
    newEventDate: "2026-12-03T10:00:00.000Z",
    customerMessage: "We need to move the date.",
  });

  assert.equal(result.id, "resend_workshop_123");
  assert.equal(request.options.headers["Idempotency-Key"], "workshop-booking-notification-outbox_workshop_123");
  assert.equal(request.body.subject, "Your KPX Academy workshop date has changed");
  assert.ok(request.body.html.includes("&lt;script&gt;"));
  assert.ok(request.body.text.includes("KPX-WKS-ABC123"));
  assert.equal(request.body.text.includes("private token"), false);
});
