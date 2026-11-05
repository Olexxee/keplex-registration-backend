import * as outboxDb from "./emailOutbox.db.js";

export const enqueueTrainingTelegramAccessEmail = async (registrationId, snapshot, tx) => {
  if (!snapshot?.telegramGroupUrl) throw new Error("Training program Telegram group link is missing; cannot enqueue access email.");
  await outboxDb.enqueueEmail({
    type: "TRAINING_TELEGRAM_ACCESS",
    registrationId,
    payload: snapshot,
  }, tx);
};
