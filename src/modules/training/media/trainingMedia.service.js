import * as trainingDb from "../trainingProgram.db.js";
import * as mediaDb from "./trainingMedia.db.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../../classes/errorClasses.js";
import {
  deleteMedia as deleteCloudinaryMedia,
  uploadMedia as uploadCloudinaryMedia,
} from "../../../lib/cloudinaryMedia.js";



const getMediaType = (mimeType) => {
  if (mimeType.startsWith("video/")) {
    return "VIDEO";
  }

  return "IMAGE";
};

export const uploadTrainingMedia = async ({
  trainingProgramId,
  file,
  isPrimary = false,
  sortOrder,
}) => {
  if (!file) {
    throw new BadRequestError("Media file is required");
  }

  const program = await trainingDb.findTrainingProgramById(trainingProgramId);

  if (!program) {
    throw new NotFoundError("Training program not found");
  }

  const type = getMediaType(file.mimetype);

  const finalSortOrder =
    sortOrder ?? (await mediaDb.getNextSortOrder(trainingProgramId));

  const shouldBePrimary = isPrimary || program.media.length === 0;

  const uploaded = await uploadCloudinaryMedia({
    buffer: file.buffer,
    mimeType: file.mimetype,
    folder: `keplex/training/${trainingProgramId}`,
  });

  try {
    if (shouldBePrimary) {
      await mediaDb.clearPrimaryMedia(trainingProgramId);
    }

    return await mediaDb.createTrainingMedia({
      trainingProgramId,

      url: uploaded.url,
      publicId: uploaded.publicId,

      type,

      mimeType: file.mimetype,
      format: uploaded.format,
      bytes: uploaded.bytes,

      width: uploaded.width,
      height: uploaded.height,
      duration: uploaded.duration,

      isPrimary: shouldBePrimary,
      sortOrder: finalSortOrder,
    });
  } catch (error) {
    // Database failed after Cloudinary succeeded.
    // Clean up the orphaned Cloudinary asset.
    await deleteCloudinaryMedia({
      publicId: uploaded.publicId,
      resourceType: uploaded.resourceType,
    }).catch(() => {});

    throw error;
  }
};

export const listTrainingMedia = async (trainingProgramId) => {
  const program = await trainingDb.findTrainingProgramById(trainingProgramId);

  if (!program) {
    throw new NotFoundError("Training program not found");
  }

  return mediaDb.listTrainingMedia(trainingProgramId);
};

export const setPrimaryTrainingMedia = async ({
  trainingProgramId,
  mediaId,
}) => {
  const media = await mediaDb.findTrainingMediaById(mediaId);

  if (!media || media.trainingProgramId !== trainingProgramId) {
    throw new NotFoundError("Training media not found");
  }

  await mediaDb.clearPrimaryMedia(trainingProgramId);

  return mediaDb.updateTrainingMedia(mediaId, {
    isPrimary: true,
  });
};

export const reorderTrainingMedia = async ({
  trainingProgramId,
  mediaId,
  sortOrder,
}) => {
  if (!Number.isInteger(sortOrder) || sortOrder < 0) {
    throw new BadRequestError("sortOrder must be a non-negative integer");
  }

  const media = await mediaDb.findTrainingMediaById(mediaId);

  if (!media || media.trainingProgramId !== trainingProgramId) {
    throw new NotFoundError("Training media not found");
  }

  return mediaDb.updateTrainingMedia(mediaId, {
    sortOrder,
  });
};

export const deleteTrainingMedia = async ({ trainingProgramId, mediaId }) => {
  const media = await mediaDb.findTrainingMediaById(mediaId);

  if (!media || media.trainingProgramId !== trainingProgramId) {
    throw new NotFoundError("Training media not found");
  }

  await mediaDb.deleteTrainingMedia(mediaId);

  await deleteCloudinaryMedia({
    publicId: media.publicId,
    resourceType: media.type === "VIDEO" ? "video" : "image",
  }).catch(() => {});

  if (media.isPrimary) {
    const remaining = await mediaDb.listTrainingMedia(trainingProgramId);

    const nextMedia = remaining[0];

    if (nextMedia) {
      await mediaDb.updateTrainingMedia(nextMedia.id, {
        isPrimary: true,
      });
    }
  }
};
