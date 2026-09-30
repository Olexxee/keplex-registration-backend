import { prisma } from "../../config/prisma.js";

export const createAdminUser = async (data, tx = prisma) => {
  return tx.adminUser.create({
    data,
  });
};

export const findAdminUserById = async (id, tx = prisma) => {
  return tx.adminUser.findUnique({
    where: { id },
  });
};

export const findAdminUserByEmail = async (email, tx = prisma) => {
  return tx.adminUser.findUnique({
    where: {
      email: email.toLowerCase(),
    },
  });
};

export const updateAdminUser = async (id, data, tx = prisma) => {
  return tx.adminUser.update({
    where: { id },
    data,
  });
};

export const createAdminSession = async (data, tx = prisma) => {
  return tx.adminSession.create({
    data,
  });
};

export const findAdminSessionByTokenHash = async (
  refreshTokenHash,
  tx = prisma,
) => {
  return tx.adminSession.findUnique({
    where: {
      refreshTokenHash,
    },
    include: {
      adminUser: true,
    },
  });
};

export const revokeAdminSession = async (id, tx = prisma) => {
  return tx.adminSession.update({
    where: { id },
    data: {
      revokedAt: new Date(),
    },
  });
};

export const revokeAllAdminSessions = async (adminUserId, tx = prisma) => {
  return tx.adminSession.updateMany({
    where: {
      adminUserId,
      revokedAt: null,
    },
    data: {
      revokedAt: new Date(),
    },
  });
};
