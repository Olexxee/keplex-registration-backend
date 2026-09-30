import * as trainingService from "./trainingProgram.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";

export const createTrainingProgram = asyncWrapper(async (req, res) => {
  const program = await trainingService.createTrainingProgram(req.body);

  return res.status(201).json({
    success: true,
    data: program,
  });
});

export const updateTrainingProgram = asyncWrapper(async (req, res) => {
  const program = await trainingService.updateTrainingProgram(
    req.params.id,
    req.body,
  );

  return res.json({
    success: true,
    data: program,
  });
});

export const deleteTrainingProgram = asyncWrapper(async (req, res) => {
  await trainingService.deleteTrainingProgram(req.params.id);

  return res.json({
    success: true,
    message: "Training program deleted successfully",
  });
});

export const getTrainingProgramById = asyncWrapper(async (req, res) => {
  const program = await trainingService.getTrainingProgramById(req.params.id);

  return res.json({
    success: true,
    data: program,
  });
});

export const getTrainingProgramBySlug = asyncWrapper(async (req, res) => {
  const program = await trainingService.getTrainingProgramBySlug(
    req.params.slug,
  );

  return res.json({
    success: true,
    data: program,
  });
});

export const getPublicTrainingPrograms = asyncWrapper(async (_req, res) => {
  const programs = await trainingService.getPublicTrainingPrograms();

  return res.json({
    success: true,
    data: programs,
  });
});

export const getAdminTrainingPrograms = asyncWrapper(async (_req, res) => {
  const programs = await trainingService.getAdminTrainingPrograms();

  return res.json({
    success: true,
    data: programs,
  });
});

export const toggleTrainingProgramStatus = asyncWrapper(async (req, res) => {
  const program = await trainingService.setTrainingProgramStatus(
    req.params.id,
    req.body.active,
  );

  return res.json({
    success: true,
    data: program,
  });
});

export const toggleTrainingProgramFeatured = asyncWrapper(async (req, res) => {
  const program = await trainingService.setTrainingProgramFeatured(
    req.params.id,
    req.body.featured,
  );

  return res.json({
    success: true,
    data: program,
  });
});
