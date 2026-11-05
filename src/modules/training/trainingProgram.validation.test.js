import test from "node:test";
import assert from "node:assert/strict";
import {
  createTrainingProgramSchema,
  updateTrainingProgramSchema,
} from "./trainingProgram.validation.js";

test("training programme accepts HTTPS Telegram invite links", () => {
  const result = createTrainingProgramSchema.safeParse({
    title: "Resin Art Training",
    price: 25000,
    telegramGroupUrl: "https://t.me/+ExampleInvite",
  });
  assert.equal(result.success, true);
});

test("training programme rejects non-Telegram and non-HTTPS links", () => {
  for (const telegramGroupUrl of [
    "http://t.me/example",
    "https://example.com/group",
    "https://t.me.evil.example/group",
    "not-a-url",
  ]) {
    const result = updateTrainingProgramSchema.safeParse({ telegramGroupUrl });
    assert.equal(result.success, false, telegramGroupUrl);
  }
});

test("training programme allows an unset Telegram link for drafts/admin editing", () => {
  const result = updateTrainingProgramSchema.safeParse({ telegramGroupUrl: null });
  assert.equal(result.success, true);
});
