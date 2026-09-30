import { z } from "zod";

export const uploadTrainingMediaSchema = z.object({
  isPrimary: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === undefined) {
        return false;
      }

      if (value === true || value === "true") {
        return true;
      }

      return false;
    }),

  sortOrder: z.coerce.number().int().min(0).optional(),

  type: z.enum(["IMAGE", "VIDEO"]).optional(),
});

export const reorderTrainingMediaSchema = z.object({
  sortOrder: z.coerce.number().int().min(0),
});
