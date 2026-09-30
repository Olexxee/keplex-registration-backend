import crypto from "node:crypto";
import { UnauthorizedError } from "../../classes/errorClasses.js";
import { asyncWrapper } from "../../lib/asyncWrapper.js";
import * as paymentService from "./payment.service.js";


export const handlePaystackWebhook = asyncWrapper(
  async (req, res) => {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;

    if (!secret) {
      throw new Error(
        "PAYSTACK_WEBHOOK_SECRET is not configured",
      );
    }

    const signature = req.headers["x-paystack-signature"];
    const rawBody = req.rawBody;

    if (
      typeof signature !== "string" ||
      !Buffer.isBuffer(rawBody)
    ) {
      throw new UnauthorizedError(
        "Invalid Paystack webhook signature",
      );
    }

    const expectedSignature = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    const supplied = Buffer.from(signature, "utf8");
    const expected = Buffer.from(expectedSignature, "utf8");

    if (
      supplied.length !== expected.length ||
      !crypto.timingSafeEqual(supplied, expected)
    ) {
      throw new UnauthorizedError(
        "Invalid Paystack webhook signature",
      );
    }

    const event = req.body;

    if (event?.event === "charge.success") {
      const reference = event.data?.reference;

      if (typeof reference === "string" && reference) {
        // Verify directly with Paystack before changing records.
        await paymentService.verifyPayment(reference);
      }
    }

    return res.status(200).json({ received: true });
  },
);