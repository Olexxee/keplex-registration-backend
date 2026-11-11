import { prisma } from "../../config/prisma.js";

export const listPublicFaqs = (tx = prisma) =>
  tx.faqItem.findMany({
    where: { status: "PUBLISHED" },
    select: { id: true, question: true, answer: true, displayOrder: true },
    orderBy: [{ displayOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "asc" }],
  });

export const listAdminFaqs = (tx = prisma) =>
  tx.faqItem.findMany({
    orderBy: [{ displayOrder: "asc" }, { updatedAt: "desc" }],
  });

export const findFaq = (id, tx = prisma) =>
  tx.faqItem.findUnique({ where: { id } });

export const createFaq = (data, tx = prisma) =>
  tx.faqItem.create({ data });

export const updateFaq = (id, data, tx = prisma) =>
  tx.faqItem.update({ where: { id }, data });

export const deleteFaq = (id, tx = prisma) =>
  tx.faqItem.delete({ where: { id } });
