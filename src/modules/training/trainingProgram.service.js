import slugify from "slugify";
import * as trainingDb from "./trainingProgram.db.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../classes/errorClasses.js";

const generateUniqueSlug = async (title, currentId = null) => {
  const baseSlug = slugify(title, {
    lower: true,
    strict: true,
    trim: true,
  });

  if (!baseSlug) {
    throw new BadRequestError(
      "Unable to generate a valid slug from the title",
    );
  }

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing =
      await trainingDb.findTrainingProgramBySlugOnly(slug);

    if (!existing || existing.id === currentId) {
      return slug;
    }

    counter += 1;
    slug = `${baseSlug}-${counter}`;
  }
};

const validateDates = ({
  startDate,
  endDate,
  registrationDeadline,
}) => {
  if (startDate && endDate && endDate < startDate) {
    throw new BadRequestError(
      "End date cannot be before start date",
    );
  }

  if (
    registrationDeadline &&
    startDate &&
    registrationDeadline > startDate
  ) {
    throw new BadRequestError(
      "Registration deadline cannot be after the training start date",
    );
  }
};

const normalizeContent = (value) => {
  if (value === undefined || value === null) {
    return value;
  }

  return value.map((item) => item.trim()).filter(Boolean);
};

export const createTrainingProgram = async (data) => {
  validateDates(data);

  const slug = data.slug
    ? await generateUniqueSlug(data.slug)
    : await generateUniqueSlug(data.title);

  return trainingDb.createTrainingProgram({
    ...data,
    slug,

    highlights: normalizeContent(data.highlights),
    curriculum: normalizeContent(data.curriculum),
    requirements: normalizeContent(data.requirements),
    benefits: normalizeContent(data.benefits),
  });
};

export const updateTrainingProgram = async (
  id,
  data,
) => {
  const existing =
    await trainingDb.findTrainingProgramById(id);

  if (!existing) {
    throw new NotFoundError("Training program not found");
  }

  const merged = {
    ...existing,
    ...data,
  };

  validateDates({
    startDate: merged.startDate,
    endDate: merged.endDate,
    registrationDeadline:
      merged.registrationDeadline,
  });

  let slug = existing.slug;

  if (data.slug && data.slug !== existing.slug) {
    slug = await generateUniqueSlug(
      data.slug,
      id,
    );
  }

  if (
    data.title &&
    !data.slug &&
    data.title !== existing.title
  ) {
    slug = await generateUniqueSlug(
      data.title,
      id,
    );
  }

  const updateData = {
    ...data,
    slug,

    ...(data.highlights !== undefined && {
      highlights: normalizeContent(data.highlights),
    }),

    ...(data.curriculum !== undefined && {
      curriculum: normalizeContent(data.curriculum),
    }),

    ...(data.requirements !== undefined && {
      requirements: normalizeContent(data.requirements),
    }),

    ...(data.benefits !== undefined && {
      benefits: normalizeContent(data.benefits),
    }),
  };

  return trainingDb.updateTrainingProgram(
    id,
    updateData,
  );
};

export const deleteTrainingProgram = async (id) => {
  const existing =
    await trainingDb.findTrainingProgramById(id);

  if (!existing) {
    throw new NotFoundError("Training program not found");
  }

  return trainingDb.deleteTrainingProgram(id);
};

export const getTrainingProgramById = async (id) => {
  const program =
    await trainingDb.findTrainingProgramById(id);

  if (!program) {
    throw new NotFoundError("Training program not found");
  }

  return program;
};

export const getTrainingProgramBySlug = async (
  slug,
) => {
  const program =
    await trainingDb.findTrainingProgramBySlug(slug);

  if (!program) {
    throw new NotFoundError("Training program not found");
  }

  return program;
};

export const getPublicTrainingPrograms = async () => {
  return trainingDb.listTrainingPrograms({
    where: {
      active: true,
    },
    orderBy: [
      { featured: "desc" },
      { displayOrder: "asc" },
      { createdAt: "desc" },
    ],
  });
};

export const getAdminTrainingPrograms = async () => {
  return trainingDb.listTrainingPrograms({
    orderBy: [
      { displayOrder: "asc" },
      { createdAt: "desc" },
    ],
  });
};

export const setTrainingProgramStatus = async (
  id,
  active,
) => {
  const existing =
    await trainingDb.findTrainingProgramById(id);

  if (!existing) {
    throw new NotFoundError("Training program not found");
  }

  return trainingDb.updateTrainingProgram(id, {
    active,
  });
};

export const setTrainingProgramFeatured = async (
  id,
  featured,
) => {
  const existing =
    await trainingDb.findTrainingProgramById(id);

  if (!existing) {
    throw new NotFoundError("Training program not found");
  }

  return trainingDb.updateTrainingProgram(id, {
    featured,
  });
};