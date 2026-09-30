import { prisma } from "../../../config/prisma.js";

export const createTrainingMedia = async (data, tx = prisma) => {
  return tx.trainingMedia.create({
    data,
  });
};

export const findTrainingMediaById = async (id, tx = prisma) => {
  return tx.trainingMedia.findUnique({
    where: { id },
  });
};

export const listTrainingMedia = async (trainingProgramId, tx = prisma) => {
  return tx.trainingMedia.findMany({
    where: {
      trainingProgramId,
    },
    orderBy: [
      { isPrimary: "desc" },
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
  });
};

export const updateTrainingMedia = async (id, data, tx = prisma) => {
  return tx.trainingMedia.update({
    where: { id },
    data,
  });
};

export const deleteTrainingMedia = async (id, tx = prisma) => {
  return tx.trainingMedia.delete({
    where: { id },
  });
};

export const clearPrimaryMedia = async (trainingProgramId, tx = prisma) => {
  return tx.trainingMedia.updateMany({
    where: {
      trainingProgramId,
      isPrimary: true,
    },
    data: {
      isPrimary: false,
    },
  });
};

export const getNextSortOrder = async (trainingProgramId, tx = prisma) => {
  const lastMedia = await tx.trainingMedia.findFirst({
    where: {
      trainingProgramId,
    },
    orderBy: {
      sortOrder: "desc",
    },
    select: {
      sortOrder: true,
    },
  });

  return (lastMedia?.sortOrder ?? -1) + 1;
};
