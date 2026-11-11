import { randomUUID } from "node:crypto";

const RESEND_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 3;

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getConfig = () => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CERTIFICATE_FROM_EMAIL?.trim();
  const replyTo = process.env.SUPPORT_REPLY_TO_EMAIL?.trim() || undefined;

  if (!apiKey || !from) {
    throw new Error("Certificate email is not configured. Set RESEND_API_KEY and CERTIFICATE_FROM_EMAIL.");
  }
  return { apiKey, from, replyTo };
};

// Resend returns JSON like {"message": "...", "name": "validation_error", "statusCode": 403}.
// Turn it into a short readable message for the admin UI.
const readProviderError = async (response) => {
  const raw = await response.text();
  try {
    const parsed = JSON.parse(raw);
    return {
      name: parsed.name || null,
      message: parsed.message || raw,
    };
  } catch {
    return { name: null, message: raw };
  }
};

const buildHtml = (certificate) => `
  <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
    <h2>Congratulations, ${escapeHtml(certificate.studentName)}!</h2>
    <p>Your KPX Academy certificate for <strong>${escapeHtml(certificate.trainingProgramTitle)}</strong> is attached to this email.</p>
    <p>Certificate number: <strong>${escapeHtml(certificate.certificateNumber)}</strong></p>
    <p>Keep this certificate number for future verification.</p>
    <p>Regards,<br/>KPX Academy</p>
  </div>
`;

const buildText = (certificate) =>
  [
    `Congratulations, ${certificate.studentName}!`,
    "",
    `Your KPX Academy certificate for ${certificate.trainingProgramTitle} is attached to this email.`,
    `Certificate number: ${certificate.certificateNumber}`,
    "Keep this certificate number for future verification.",
    "",
    "Regards,",
    "KPX Academy",
  ].join("\n");

export const sendCertificateEmail = async ({ certificate, pdfBuffer, idempotencyKey: requestedIdempotencyKey }) => {
  const { apiKey, from, replyTo } = getConfig();

  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error("Certificate email failed: the certificate PDF is missing or empty.");
  }

  if (typeof certificate.studentEmail !== "string" || !certificate.studentEmail.trim() || /[,;\s]/.test(certificate.studentEmail.trim())) {
    throw new Error("Certificate email requires exactly one valid recipient address.");
  }

  // Keep the same key across network retries for this one explicit send action.
  // A later admin resend gets a fresh key and is a separate intentional email.
  const idempotencyKey = requestedIdempotencyKey || `certificate-email-${certificate.id}-${randomUUID()}`;
  const payload = JSON.stringify({
    from,
    to: [certificate.studentEmail],
    ...(replyTo ? { reply_to: replyTo } : {}),
    subject: `Your KPX Academy certificate — ${certificate.trainingProgramTitle}`,
    html: buildHtml(certificate),
    text: buildText(certificate),
    attachments: [
      {
        filename: `${certificate.certificateNumber}.pdf`,
        content: pdfBuffer.toString("base64"),
      },
    ],
  });

  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    let response;
    try {
      response = await fetch(RESEND_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: payload,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (networkError) {
      // Timeout or network failure: retry.
      lastError = new Error(`Certificate email failed (network): ${networkError.message}`);
      lastError.retryable = true;
      if (attempt < MAX_ATTEMPTS) {
        await sleep(500 * 2 ** (attempt - 1));
        continue;
      }
      throw lastError;
    }

    if (response.ok) {
      // Resend responds with { id: "..." }.
      return response.json();
    }

    const providerError = await readProviderError(response);
    const detail = providerError.name
      ? `${providerError.name}: ${providerError.message}`
      : providerError.message;

    lastError = new Error(`Certificate email failed (${response.status}): ${detail.slice(0, 500)}`);
    lastError.status = response.status;
    lastError.code = providerError.name;

    // Retry only on rate limit (Resend default is 2 requests/second) and server errors.
    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < MAX_ATTEMPTS) {
      const retryAfter = Number(response.headers.get("retry-after"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 500 * 2 ** (attempt - 1);
      await sleep(delay);
      continue;
    }

    throw lastError;
  }

  throw lastError;
};