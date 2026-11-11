import { prisma } from "../../config/prisma.js";
import * as certificateDb from "../certificates/certificate.db.js";
import { downloadCertificateDocument } from "../certificates/certificate.document.js";
import { sendCertificateEmail } from "../certificates/certificate.email.js";
import * as outboxDb from "./emailOutbox.db.js";
import { sendTrainingTelegramAccessEmail, sendWorkshopBookingNotification } from "./emailOutbox.email.js";

const POLL_INTERVAL_MS = Math.max(1000, Number(process.env.EMAIL_OUTBOX_POLL_INTERVAL_MS) || 5000);
const MAX_ATTEMPTS = Math.max(1, Number(process.env.EMAIL_OUTBOX_MAX_ATTEMPTS) || 8);
const ADVISORY_LOCK_NAMESPACE = 26111117;
const ADVISORY_LOCK_RESOURCE = 1;
let timer = null;
let isPolling = false;
let stopped = false;

const retryDelayMs = (attempt) => Math.min(6 * 60 * 60 * 1000, 30 * 1000 * (2 ** Math.max(0, attempt - 1)));

const processOne = async () => prisma.$transaction(async (tx) => {
  const lockRows = await tx.$queryRaw`
    SELECT pg_try_advisory_xact_lock(${ADVISORY_LOCK_NAMESPACE}::integer, ${ADVISORY_LOCK_RESOURCE}::integer) AS "locked"
  `;
  if (!lockRows[0]?.locked) return false;

  const job = await outboxDb.claimNextEmail(tx);
  if (!job) return false;

  let certificate = null;
  try {
    let result;
    if (job.type === "TRAINING_TELEGRAM_ACCESS") {
      result = await sendTrainingTelegramAccessEmail({ id: job.id, ...job.payload });
    } else if (job.type === "WORKSHOP_BOOKING_NOTIFICATION") {
      result = await sendWorkshopBookingNotification({ id: job.id, ...job.payload });
    } else if (job.type === "CERTIFICATE_DELIVERY") {
      if (!job.certificateId) {
        const error = new Error("Certificate delivery job has no certificate reference.");
        error.permanent = true;
        throw error;
      }
      // Serialize delivery against revocation. If revocation commits first,
      // this lock makes the worker observe REVOKED and decline the send.
      const certificateLock = await tx.$queryRaw`
        SELECT "id" FROM "Certificate" WHERE "id" = ${job.certificateId} FOR UPDATE
      `;
      if (!certificateLock.length) {
        const error = new Error("Certificate delivery job references a missing certificate.");
        error.permanent = true;
        throw error;
      }

      certificate = await certificateDb.findCertificateById(job.certificateId, tx);
      if (!certificate) {
        const error = new Error("Certificate delivery job references a missing certificate.");
        error.permanent = true;
        throw error;
      }
      if (certificate.status !== "ISSUED") {
        const error = new Error("A revoked certificate cannot be emailed.");
        error.permanent = true;
        throw error;
      }

      const pdfBuffer = await downloadCertificateDocument(certificate);
      result = await sendCertificateEmail({
        certificate,
        pdfBuffer,
        idempotencyKey: `certificate-email-${job.id}`,
      });
      await certificateDb.updateCertificate(certificate.id, {
        emailSentAt: new Date(),
        lastEmailError: null,
      }, tx);
    } else {
      const error = new Error(`Unsupported email outbox type: ${job.type}`);
      error.permanent = true;
      throw error;
    }

    await outboxDb.markEmailSent(job.id, result.id ?? null, tx);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (certificate) {
      await certificateDb.updateCertificate(certificate.id, {
        lastEmailError: message.slice(0, 1000),
      }, tx);
    }

    if (error?.permanent || job.attempts >= MAX_ATTEMPTS) {
      await outboxDb.markEmailDead(job.id, message, tx);
      console.error("[EmailOutbox] Job moved to DEAD", { jobId: job.id, attempts: job.attempts, error: message });
    } else {
      await outboxDb.scheduleEmailRetry(job.id, new Date(Date.now() + retryDelayMs(job.attempts)), message, tx);
      console.error("[EmailOutbox] Delivery failed; retry scheduled", { jobId: job.id, attempt: job.attempts, error: message });
    }
  }
  return true;
}, {
  maxWait: 10000,
  // Certificate retrieval plus Resend's bounded internal retries can take
  // longer than ordinary notification sends. The transaction-level advisory
  // lock is deliberately held through delivery to serialize all workers.
  timeout: 120000,
});

const poll = async () => {
  if (isPolling || stopped) return;
  isPolling = true;
  try {
    // One job per poll. The PostgreSQL advisory lock serializes delivery even
    // when multiple app processes are connected to the same database.
    await processOne();
  } catch (error) {
    console.error("[EmailOutbox] Worker poll failed:", error);
  } finally {
    isPolling = false;
  }
};

export const startEmailOutboxWorker = () => {
  if (timer) return;
  if (process.env.EMAIL_OUTBOX_WORKER_ENABLED?.trim().toLowerCase() !== "true") {
    console.info("[EmailOutbox] Worker disabled. Set EMAIL_OUTBOX_WORKER_ENABLED=true on the delivery host.");
    return;
  }
  if (!process.env.RESEND_API_KEY || !(process.env.TRANSACTIONAL_FROM_EMAIL || process.env.CERTIFICATE_FROM_EMAIL)) {
    console.warn("[EmailOutbox] Worker not started: Resend credentials/sender are missing.");
    return;
  }
  stopped = false;
  console.log(`[EmailOutbox] Worker started (poll interval: ${POLL_INTERVAL_MS}ms)`);
  void poll();
  timer = setInterval(() => void poll(), POLL_INTERVAL_MS);
  timer.unref?.();
};

export const stopEmailOutboxWorker = async () => {
  stopped = true;
  if (timer) clearInterval(timer);
  timer = null;
  while (isPolling) await new Promise((resolve) => setTimeout(resolve, 50));
};
