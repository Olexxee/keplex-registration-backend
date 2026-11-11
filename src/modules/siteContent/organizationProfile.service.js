import * as db from "./organizationProfile.db.js";

const defaultProfile = {
  id: "organization-profile",
  organizationName: "KPX Academy",
  tagline: "Practical Skills. More Possibilities.",
  description: "Practical training and detailed knowledge to help learners develop useful skills and put what they learn into practice.",
  contactEmail: null,
  phone: null,
  whatsapp: null,
  address: null,
  operatingHours: null,
  instagramUrl: null,
  facebookUrl: null,
  linkedinUrl: null,
  tiktokUrl: null,
  youtubeUrl: null,
  copyrightText: null,
};

export const getOrganizationProfile = async () =>
  (await db.getOrganizationProfile()) ?? defaultProfile;

export const updateOrganizationProfile = async (data) =>
  db.upsertOrganizationProfile(data);
