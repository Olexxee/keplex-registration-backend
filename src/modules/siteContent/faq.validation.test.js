import test from "node:test";
import assert from "node:assert/strict";
import { createFaqSchema, updateFaqSchema } from "./faq.validation.js";

test("FAQ creation requires a useful question and a non-empty answer", () => {
  assert.equal(createFaqSchema.safeParse({ question: "How do I register?", answer: "Visit the programmes page." }).success, true);
  assert.equal(createFaqSchema.safeParse({ question: "Hi?", answer: "" }).success, false);
});

test("FAQ creation rejects client-controlled publication status", () => {
  assert.equal(createFaqSchema.safeParse({ question: "How do I register?", answer: "Visit the programmes page.", status: "PUBLISHED" }).success, false);
});

test("FAQ updates accept status and display order changes", () => {
  assert.equal(updateFaqSchema.safeParse({ status: "PUBLISHED", displayOrder: 2 }).success, true);
  assert.equal(updateFaqSchema.safeParse({}).success, false);
  assert.equal(updateFaqSchema.safeParse({ status: "LIVE" }).success, false);
});
