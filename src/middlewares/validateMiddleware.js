import { ZodError } from "zod";

export const validateBody = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(result.error),
      });
    }

    req.validated = {
      ...(req.validated || {}),
      body: result.data,
    };

    next();
  };
};

export const validateQuery = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(result.error),
      });
    }

    req.validated = {
      ...(req.validated || {}),
      query: result.data,
    };

    next();
  };
};

export const validateParams = (schema) => {
  return (req, res, next) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formatZodErrors(result.error),
      });
    }

    req.validated = {
      ...(req.validated || {}),
      params: result.data,
    };

    next();
  };
};

const formatZodErrors = (error) => {
  if (!(error instanceof ZodError)) {
    return [];
  }

  return error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message,
  }));
};