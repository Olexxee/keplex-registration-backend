import { prisma } from "../../config/prisma.js";

export const enqueueEmail = (data, tx = prisma) =>
  tx.emailOutbox.createMany({ data: [data], skipDuplicates: true });

export const claimNextEmail = async (tx = prisma) => {
  const staleBefore = new Date(Date.now() - 5 * 60 * 1000);
  const rows = await tx.$queryRaw`
    UPDATE "EmailOutbox"
    SET "status" = 'PROCESSING'::"EmailOutboxStatus",
        "attempts" = "attempts" + 1,
        "lockedAt" = NOW(),
        "updatedAt" = NOW()
    WHERE "id" = (
      SELECT "id" FROM "EmailOutbox"
      WHERE (
        ("status" = 'PENDING'::"EmailOutboxStatus" AND "availableAt" <= NOW())
        OR ("status" = 'PROCESSING'::"EmailOutboxStatus" AND "lockedAt" < ${staleBefore})
      )
      ORDER BY "availableAt" ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED LIMIT 1
    )
    RETURNING *
  `;
  return rows[0] ?? null;
};

export const markEmailSent = (id, providerMessageId, tx = prisma) =>
  tx.emailOutbox.update({ where: { id }, data: {
    status: "SENT", sentAt: new Date(), providerMessageId, lockedAt: null, lastError: null,
  }});

export const scheduleEmailRetry = (id, availableAt, error, tx = prisma) =>
  tx.emailOutbox.update({ where: { id }, data: {
    status: "PENDING", availableAt, lockedAt: null, lastError: String(error).slice(0, 4000),
  }});

export const markEmailDead = (id, error, tx = prisma) =>
  tx.emailOutbox.update({ where: { id }, data: {
    status: "DEAD", lockedAt: null, lastError: String(error).slice(0, 4000),
  }});
