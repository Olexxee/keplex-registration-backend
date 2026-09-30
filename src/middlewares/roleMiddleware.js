import { ForbiddenError } from "../classes/errorClasses.js";

export const roleMiddleware = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      throw new ForbiddenError("Authentication required");
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        "You do not have permission to perform this action",
      );
    }

    return next();
  };
};
