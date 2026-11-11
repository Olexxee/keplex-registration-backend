import { NotFoundError } from "../../classes/errorClasses.js";
import * as db from "./faq.db.js";

export const getPublicFaqs = () => db.listPublicFaqs();

export const getAdminFaqs = () => db.listAdminFaqs();

export const createFaq = (data) =>
  db.createFaq({
    ...data,
    status: "DRAFT",
  });

export const updateFaq = async (id, data) => {
  const existing = await db.findFaq(id);
  if (!existing) throw new NotFoundError("FAQ not found");

  const update = { ...data };
  if (data.status === "PUBLISHED" && existing.status !== "PUBLISHED") {
    update.publishedAt = new Date();
  } else if (data.status && data.status !== "PUBLISHED") {
    update.publishedAt = null;
  }

  return db.updateFaq(id, update);
};

export const deleteFaq = async (id) => {
  if (!(await db.findFaq(id))) throw new NotFoundError("FAQ not found");
  return db.deleteFaq(id);
};
