import {asyncWrapper} from "../../lib/asyncWrapper.js";
import * as testimonialService from "./testimonial.service.js";

export const getPublicTestimonials = asyncWrapper(async (_req, res) => {
  const testimonials = await testimonialService.getPublicTestimonials();

  return res.status(200).json({
    success: true,
    message: "Testimonials retrieved successfully",
    data: testimonials,
  });
});

export const createTestimonial = asyncWrapper(async (req, res) => {
  const testimonial = await testimonialService.createTestimonial(
    req.validated.body,
  );

  return res.status(201).json({
    success: true,
    message: "Testimonial submitted successfully and is awaiting approval",
    data: testimonial,
  });
});

export const listTestimonials = asyncWrapper(async (req, res) => {
  const result = await testimonialService.listTestimonials(req.validated.query);

  return res.status(200).json({
    success: true,
    message: "Testimonials retrieved successfully",
    data: result.items,
    meta: result.meta,
  });
});

export const getTestimonialStats = asyncWrapper(async (_req, res) => {
  const stats = await testimonialService.getTestimonialStats();

  return res.status(200).json({
    success: true,
    message: "Testimonial statistics retrieved successfully",
    data: stats,
  });
});

export const updateTestimonialStatus = asyncWrapper(async (req, res) => {
  const { id } = req.validated.params;
  const { status } = req.validated.body;

  const testimonial = await testimonialService.updateTestimonialStatus(
    id,
    status,
  );

  return res.status(200).json({
    success: true,
    message: "Testimonial status updated successfully",
    data: testimonial,
  });
});

export const deleteTestimonial = asyncWrapper(async (req, res) => {
  const { id } = req.validated.params;

  const result = await testimonialService.deleteTestimonial(id);

  return res.status(200).json({
    success: true,
    message: "Testimonial deleted successfully",
    data: result,
  });
});
