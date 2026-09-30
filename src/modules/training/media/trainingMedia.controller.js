import * as mediaService from "./trainingMedia.service.js";
import { asyncWrapper } from "../../../lib/asyncWrapper.js";

export const uploadTrainingMedia = asyncWrapper(async (req, res) => {
  const media = await mediaService.uploadTrainingMedia({
    trainingProgramId: req.params.trainingProgramId,

    file: req.file,

    isPrimary: req.body.isPrimary,

    sortOrder:
      req.body.sortOrder !== undefined ? Number(req.body.sortOrder) : undefined,
  });

  return res.status(201).json({
    success: true,
    data: media,
  });
});

export const getTrainingMedia = asyncWrapper(async (req, res) => {
  const media = await mediaService.listTrainingMedia(
    req.params.trainingProgramId,
  );

  return res.json({
    success: true,
    data: media,
  });
});

export const setPrimaryTrainingMedia = asyncWrapper(async (req, res) => {
  const media = await mediaService.setPrimaryTrainingMedia({
    trainingProgramId: req.params.trainingProgramId,

    mediaId: req.params.mediaId,
  });

  return res.json({
    success: true,
    data: media,
  });
});

export const reorderTrainingMedia = asyncWrapper(async (req, res) => {
  const media = await mediaService.reorderTrainingMedia({
    trainingProgramId: req.params.trainingProgramId,

    mediaId: req.params.mediaId,

    sortOrder: Number(req.body.sortOrder),
  });

  return res.json({
    success: true,
    data: media,
  });
});

export const deleteTrainingMedia = asyncWrapper(async (req, res) => {
  await mediaService.deleteTrainingMedia({
    trainingProgramId: req.params.trainingProgramId,

    mediaId: req.params.mediaId,
  });

  return res.json({
    success: true,
    message: "Training media deleted successfully",
  });
});
