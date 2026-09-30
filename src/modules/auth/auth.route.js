import express from "express";
import * as controller from "./auth.controller.js";
import { authMiddleware } from "../../middlewares/authMiddleware.js";
import { roleMiddleware } from "../../middlewares/roleMiddleware.js";
import { validateBody } from "../../middlewares/validateMiddleware.js";
import { loginSchema, createAdminSchema } from "./auth.validation.js";


const authRouter = express.Router();

// Public
authRouter.post("/login", validateBody(loginSchema), controller.login);

authRouter.post("/refresh", controller.refresh);

authRouter.post("/logout", controller.logout);

// Authenticated
authRouter.get("/me", authMiddleware, controller.me);

// Super admin only
authRouter.post(
  "/admins",
  authMiddleware,
  roleMiddleware("SUPER_ADMIN"),
  validateBody(createAdminSchema),
  controller.createAdmin,
);

export default authRouter;
