import * as outboxDb from "./emailOutbox.db.js";
import { sendTrainingTelegramAccessEmail } from "./emailOutbox.email.js";

const POLL_INTERVAL_MS = Number(process.env.EMAIL_OUTBOX_POLL_INTERVAL_MS) || 5000;
const MAX_ATTEMPTS = Number(process.env.EMAIL_OUTBOX_MAX_ATTEMPTS) || 8;
let timer = null;
let isPolling = false;
let stopped = false;

const retryDelayMs = (attempt) => Math.min(6 * 60 * 60 * 1000, 30 * 1000 * (2 ** Math.max(0, attempt - 1)));

const processOne = async () => {
  const job = await outboxDb.claimNextEmail();
  if (!job) return false;
  try {
    if (job.type !== "TRAINING_TELEGRAM_ACCESS") throw new Error(`Unsupported email outbox type: ${job.type}`);
    const result = await sendTrainingTelegramAccessEmail({ id: job.id, ...job.payload });
    await outboxDb.markEmailSent(job.id, result.id ?? null);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (job.attempts >= MAX_ATTEMPTS) {
      await outboxDb.markEmailDead(job.id, message);
      console.error("[EmailOutbox] Job moved to DEAD", { jobId: job.id, attempts: job.attempts, error: message });
    } else {
      await outboxDb.scheduleEmailRetry(job.id, new Date(Date.now() + retryDelayMs(job.attempts)), message);
      console.error("[EmailOutbox] Delivery failed; retry scheduled", { jobId: job.id, attempt: job.attempts, error: message });
    }
  }
  return true;
};

const poll = async () => {
  if (isPolling || stopped) return;
  isPolling = true;
  try {
    for (let index = 0; index < 5 && !stopped; index += 1) {
      if (!(await processOne())) break;
    }
  } catch (error) {
    console.error("[EmailOutbox] Worker poll failed:", error);
  } finally {
    isPolling = false;
  }
};

export const startEmailOutboxWorker = () => {
  if (timer) return;
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
