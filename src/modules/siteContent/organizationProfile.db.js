import { prisma } from "../../config/prisma.js";

const organizationProfileId = "organization-profile";

export const getOrganizationProfile = (tx = prisma) =>
  tx.OrganizationProfile.findUnique({ where: { id: organizationProfileId } });

export const upsertOrganizationProfile = (data, tx = prisma) =>
  tx.OrganizationProfile.upsert({
    where: { id: organizationProfileId },
    create: { id: organizationProfileId, ...data },
    update: data,
  });
