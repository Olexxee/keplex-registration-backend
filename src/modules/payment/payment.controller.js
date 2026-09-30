import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as paymentService from "./payment.service.js";

export const initializePayment = asyncWrapper(async (req, res) => {
  const result = await paymentService.initializePayment({
    name: req.body.name,
    email: req.body.email,
    trainingProgramId: req.body.trainingProgramId,
  });

  return res.status(201).json({
    success: true,
    message: "Payment initialized successfully",
    data: result,
  });
});

export const verifyPayment = asyncWrapper(async (req, res) => {
  const result = await paymentService.verifyPayment(req.params.reference);

  return res.status(200).json({
    success: true,
    message:
      result.status === "SUCCESS"
        ? "Payment verified successfully"
        : "Payment status retrieved",
    data: result,
  });
});
