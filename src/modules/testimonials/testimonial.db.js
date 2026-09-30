import { prisma } from "../../config/prisma.js";

export const createTestimonial = async (data, tx = prisma) => {
  return tx.Testimonial.create({
    data,
  });
};

export const findTestimonialById = async (id, tx = prisma) => {
  return tx.Testimonial.findUnique({
    where: { id },
  });
};

export const findPublicTestimonials = async (tx = prisma) => {
  return tx.Testimonial.findMany({
    where: {
      status: "APPROVED",
    },
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const countTestimonials = async (where = {}, tx = prisma) => {
  return tx.Testimonial.count({
    where,
  });
};

export const findTestimonials = async (
  { where = {}, skip = 0, take = 20 },
  tx = prisma,
) => {
  return tx.Testimonial.findMany({
    where,
    skip,
    take,
    orderBy: {
      createdAt: "desc",
    },
  });
};

export const updateTestimonial = async (id, data, tx = prisma) => {
  return tx.Testimonial.update({
    where: { id },
    data,
  });
};

export const deleteTestimonial = async (id, tx = prisma) => {
  return tx.Testimonial.delete({
    where: { id },
  });
};

export const countTestimonialsByStatus = async (status, tx = prisma) => {
  return tx.Testimonial.count({
    where: { status },
  });
};
