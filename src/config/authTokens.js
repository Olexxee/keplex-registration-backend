import crypto from "crypto";
import jwt from "jsonwebtoken";

import { authConfig } from "../config/auth.js";

export const generateAccessToken = (admin) => {
  return jwt.sign(
    {
      sub: admin.id,
      role: admin.role,
      type: "access",
    },
    authConfig.accessTokenSecret,
    {
      expiresIn: authConfig.accessTokenExpiresIn,
    },
  );
};

export const generateRefreshToken = () => {
  return crypto.randomBytes(64).toString("hex");
};

export const hashRefreshToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};

export const verifyAccessToken = (token) => {
  return jwt.verify(token, authConfig.accessTokenSecret);
};

export const getRefreshTokenExpiry = () => {
  const days = 30;

  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
};
