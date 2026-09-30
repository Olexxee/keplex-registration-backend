import { prisma } from "../../config/prisma.js";

const trainingProgramInclude = {
  media: {
    orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
  },
};

export const createTrainingProgram = async (data, tx = prisma) => {
  return tx.trainingProgram.create({
    data,
    include: trainingProgramInclude,
  });
};

export const updateTrainingProgram = async (id, data, tx = prisma) => {
  return tx.trainingProgram.update({
    where: { id },
    data,
    include: trainingProgramInclude,
  });
};

export const deleteTrainingProgram = async (id, tx = prisma) => {
  return tx.trainingProgram.update({
    where: { id },
    data: {
      isDeleted: true,
      active: false,
    },
  });
};

export const findTrainingProgramById = async (id, tx = prisma) => {
  return tx.trainingProgram.findUnique({
    where: { id },
    include: trainingProgramInclude,
  });
};

export const findTrainingProgramBySlug = async (slug, tx = prisma) => {
  return tx.trainingProgram.findUnique({
    where: { slug },
    include: trainingProgramInclude,
  });
};

export const listTrainingPrograms = async (
  { where = {}, skip, take, orderBy = { displayOrder: "asc" } } = {},
  tx = prisma,
) => {
  return tx.trainingProgram.findMany({
    where,
    skip,
    take,
    orderBy,
    include: trainingProgramInclude,
  });
};

export const countTrainingPrograms = async (where = {}, tx = prisma) => {
  return tx.trainingProgram.count({
    where,
  });
};

export const findTrainingProgramBySlugOnly = async (slug, tx = prisma) => {
  return tx.trainingProgram.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
    },
  });
};
