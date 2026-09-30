import * as authService from "./auth.service.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import { authConfig } from "../../config/auth.js";



const accessCookieOptions = {
  httpOnly: true,
  secure: authConfig.cookieSecure,
  sameSite: authConfig.cookieSameSite,
  path: "/",
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: authConfig.cookieSecure,
  sameSite: authConfig.cookieSameSite,
  path: "/api/auth",
};

const setAuthCookies = (res, { accessToken, refreshToken }) => {
  res.cookie(authConfig.accessCookieName, accessToken, accessCookieOptions);

  res.cookie(authConfig.refreshCookieName, refreshToken, {
    ...refreshCookieOptions,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
};

const clearAuthCookies = (res) => {
  res.clearCookie(authConfig.accessCookieName, accessCookieOptions);

  res.clearCookie(authConfig.refreshCookieName, refreshCookieOptions);
};

export const login = asyncWrapper(async (req, res) => {
  const result = await authService.login({
    email: req.body.email,
    password: req.body.password,
  });

  setAuthCookies(res, result);

  return res.json({
    success: true,
    data: {
      admin: result.admin,
      accessToken: result.accessToken,
    },
  });
});

export const refresh = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies?.[authConfig.refreshCookieName];

  const result = await authService.refresh(refreshToken);

  res.cookie(
    authConfig.accessCookieName,
    result.accessToken,
    accessCookieOptions,
  );

  return res.json({
    success: true,
    data: {
      admin: result.admin,
      accessToken: result.accessToken,
    },
  });
});

export const logout = asyncWrapper(async (req, res) => {
  const refreshToken = req.cookies?.[authConfig.refreshCookieName];

  await authService.logout(refreshToken);

  clearAuthCookies(res);

  return res.json({
    success: true,
    message: "Logged out successfully",
  });
});

export const me = asyncWrapper(async (req, res) => {
  const admin = await authService.getCurrentAdmin(req.user.id);

  return res.json({
    success: true,
    data: admin,
  });
});

export const createAdmin = asyncWrapper(async (req, res) => {
  const admin = await authService.createAdmin({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    role: req.body.role,
  });

  return res.status(201).json({
    success: true,
    data: admin,
  });
});
