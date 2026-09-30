import { NotFoundError } from "../../classes/errorClasses.js";

import * as testimonialDb from "./testimonial.db.js";

const normalizeTestimonialData = (data) => ({
  name: data.name.trim(),
  role: data.role?.trim() || null,
  message: data.message.trim(),
  rating: Number(data.rating),
  imageUrl: data.imageUrl?.trim() || null,
});

export const createTestimonial = async (data) => {
  const normalizedData = normalizeTestimonialData(data);

  return testimonialDb.createTestimonial({
    ...normalizedData,
    status: "PENDING",
  });
};

export const getPublicTestimonials = async () => {
  return testimonialDb.findPublicTestimonials();
};

export const getTestimonialById = async (id) => {
  const testimonial = await testimonialDb.findTestimonialById(id);

  if (!testimonial) {
    throw new NotFoundError("Testimonial not found");
  }

  return testimonial;
};

export const listTestimonials = async ({
  page = 1,
  limit = 20,
  search,
  status,
}) => {
  const skip = (page - 1) * limit;

  const where = {};

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        role: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        message: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  const [items, total] = await Promise.all([
    testimonialDb.findTestimonials({
      where,
      skip,
      take: limit,
    }),
    testimonialDb.countTestimonials(where),
  ]);

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export const getTestimonialStats = async () => {
  const [total, pending, approved, rejected] = await Promise.all([
    testimonialDb.countTestimonials(),
    testimonialDb.countTestimonialsByStatus("PENDING"),
    testimonialDb.countTestimonialsByStatus("APPROVED"),
    testimonialDb.countTestimonialsByStatus("REJECTED"),
  ]);

  return {
    total,
    pending,
    approved,
    rejected,
  };
};

export const updateTestimonialStatus = async (id, status) => {
  const testimonial = await testimonialDb.findTestimonialById(id);

  if (!testimonial) {
    throw new NotFoundError("Testimonial not found");
  }

  return testimonialDb.updateTestimonial(id, {
    status,
  });
};

export const deleteTestimonial = async (id) => {
  const testimonial = await testimonialDb.findTestimonialById(id);

  if (!testimonial) {
    throw new NotFoundError("Testimonial not found");
  }

  await testimonialDb.deleteTestimonial(id);

  return {
    id,
  };
};
