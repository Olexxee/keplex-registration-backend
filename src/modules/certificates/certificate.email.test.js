import assert from "node:assert/strict";
import test from "node:test";

process.env.RESEND_API_KEY ||= "resend-test-key";
process.env.CERTIFICATE_FROM_EMAIL ||= "KPX Academy <certificates@example.test>";

const { sendCertificateEmail } = await import("./certificate.email.js");

const certificate = {
  id: "certificate-test-1",
  certificateNumber: "KPX-2026-TEST000001",
  studentName: "Student Example",
  studentEmail: "student@example.test",
  trainingProgramTitle: "Practical Resin Art",
};

test("sends to one certificate owner using the persisted outbox idempotency key", async (t) => {
  const originalFetch = globalThis.fetch;
  let capturedRequest;

  globalThis.fetch = async (url, options) => {
    capturedRequest = { url: String(url), options };
    return new Response(JSON.stringify({ id: "resend-message-1" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const result = await sendCertificateEmail({
    certificate,
    pdfBuffer: Buffer.from("%PDF-1.7\ncertificate"),
    idempotencyKey: "certificate-email-outbox-job-123",
  });

  assert.equal(result.id, "resend-message-1");
  assert.equal(capturedRequest.url, "https://api.resend.com/emails");
  assert.deepEqual(JSON.parse(capturedRequest.options.body).to, ["student@example.test"]);
  assert.equal(capturedRequest.options.headers["Idempotency-Key"], "certificate-email-outbox-job-123");
  assert.equal(JSON.parse(capturedRequest.options.body).attachments.length, 1);
});

test("rejects a certificate recipient field containing more than one address", async (t) => {
  const originalFetch = globalThis.fetch;
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return new Response("unexpected", { status: 500 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  await assert.rejects(
    sendCertificateEmail({
      certificate: { ...certificate, studentEmail: "one@example.test,two@example.test" },
      pdfBuffer: Buffer.from("%PDF-1.7\ncertificate"),
      idempotencyKey: "certificate-email-outbox-job-456",
    }),
    /exactly one valid recipient/,
  );
  assert.equal(called, false);
});
