import express from "express";
import * as controller from "./payment.controller.js";
import { handlePaystackWebhook } from "./payment.webhook.js";
import {
  validateBody,
  validateParams,
} from "../../middlewares/validateMiddleware.js";
import {
  initializePaymentSchema,
  paymentReferenceSchema,
  initializeWorkshopPaymentSchema,
} from "./payment.validation.js";



const paymentRouter = express.Router();

paymentRouter.post("/webhook", handlePaystackWebhook);

paymentRouter.post(
  "/workshops/initialize",
  validateBody(initializeWorkshopPaymentSchema),
  controller.initializeWorkshopPayment,
);

paymentRouter.post(
  "/initialize",
  validateBody(initializePaymentSchema),
  controller.initializePayment,
);

paymentRouter.get(
  "/verify/:reference",
  validateParams(paymentReferenceSchema),
  controller.verifyPayment,
);

export default paymentRouter;
