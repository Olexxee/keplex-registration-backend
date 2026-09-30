import { UnauthorizedError } from "../classes/errorClasses.js";
import { verifyAccessToken } from "../config/authTokens.js";

const getAccessToken = (req) => {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }
  return req.cookies?.keplex_access_token;
};

export const authMiddleware = (req, _res, next) => {
  const token = getAccessToken(req);
  if (!token) {
    throw new UnauthorizedError("Authentication required");
  }
  try {
    const payload = verifyAccessToken(token);

    if (payload.type !== "access" || !payload.sub || !payload.role) {
      throw new UnauthorizedError("Invalid access token");
    }
    req.user = {
      id: payload.sub,
      role: payload.role,
    };
    return next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError("Invalid or expired access token");
  }
};
