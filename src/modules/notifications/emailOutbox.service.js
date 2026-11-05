import * as outboxDb from "./emailOutbox.db.js";

export const enqueueTrainingTelegramAccessEmail = async (registration, tx) => {
  const program = registration.trainingProgram;
  if (!program?.telegramGroupUrl) throw new Error("Training program Telegram group link is missing; cannot enqueue access email.");
  await outboxDb.enqueueEmail({
    type: "TRAINING_TELEGRAM_ACCESS",
    registrationId: registration.id,
    payload: {
      name: registration.name,
      email: registration.email,
      programTitle: program.title,
      telegramGroupUrl: program.telegramGroupUrl,
    },
  }, tx);
};
