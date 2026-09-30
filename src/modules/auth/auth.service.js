import bcrypt from "bcryptjs";
import * as adminDb from "./adminUser.db.js";
import {
  BadRequestError,
  UnauthorizedError,
} from "../../classes/errorClasses.js";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
  hashRefreshToken,
} from "../../config/authTokens.js";



const sanitizeAdmin = (admin) => ({
  id: admin.id,
  name: admin.name,
  email: admin.email,
  role: admin.role,
  active: admin.active,
});

export const createAdmin = async ({
  name,
  email,
  password,
  role = "ADMIN",
}) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingAdmin = await adminDb.findAdminUserByEmail(normalizedEmail);

  if (existingAdmin) {
    throw new BadRequestError("An admin with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await adminDb.createAdminUser({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
    role,
  });

  return sanitizeAdmin(admin);
};

export const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const admin = await adminDb.findAdminUserByEmail(normalizedEmail);

  if (!admin) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (!admin.active) {
    throw new UnauthorizedError("Admin account is disabled");
  }

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);

  if (!passwordMatches) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const accessToken = generateAccessToken(admin);

  const refreshToken = generateRefreshToken();

  await adminDb.createAdminSession({
    adminUserId: admin.id,
    refreshTokenHash: hashRefreshToken(refreshToken),
    expiresAt: getRefreshTokenExpiry(),
  });

  return {
    admin: sanitizeAdmin(admin),
    accessToken,
    refreshToken,
  };
};

export const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new UnauthorizedError("Refresh token is required");
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const session = await adminDb.findAdminSessionByTokenHash(tokenHash);

  if (!session) {
    throw new UnauthorizedError("Invalid refresh token");
  }

  if (session.revokedAt) {
    throw new UnauthorizedError("Refresh session has been revoked");
  }

  if (session.expiresAt <= new Date()) {
    throw new UnauthorizedError("Refresh session has expired");
  }

  if (!session.adminUser.active) {
    throw new UnauthorizedError("Admin account is disabled");
  }

  const accessToken = generateAccessToken(session.adminUser);

  return {
    admin: sanitizeAdmin(session.adminUser),
    accessToken,
  };
};

export const logout = async (refreshToken) => {
  if (!refreshToken) {
    return;
  }

  const tokenHash = hashRefreshToken(refreshToken);

  const session = await adminDb.findAdminSessionByTokenHash(tokenHash);

  if (!session) {
    return;
  }

  if (!session.revokedAt) {
    await adminDb.revokeAdminSession(session.id);
  }
};

export const getCurrentAdmin = async (adminId) => {
  const admin = await adminDb.findAdminUserById(adminId);

  if (!admin || !admin.active) {
    throw new UnauthorizedError("Admin account is unavailable");
  }

  return sanitizeAdmin(admin);
};
