import "dotenv/config";

const requiredEnvironmentVariables = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

for (const variable of requiredEnvironmentVariables) {
  if (!process.env[variable]) {
    throw new Error(`${variable} is not defined`);
  }
}

export const authConfig = {
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,

  accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",

  accessCookieName: "keplex_access_token",
  refreshCookieName: "keplex_refresh_token",

  cookieSecure: process.env.NODE_ENV === "production",

  cookieSameSite:
    process.env.NODE_ENV === "production"
      ? "none"
      : "lax",
};