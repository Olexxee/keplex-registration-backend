import crypto from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../classes/errorClasses.js";
import * as paymentDb from "./payment.db.js";
import * as registrationService from "../registration/registration.service.js";
import * as souvenirDb from "../souvenirs/souvenir.db.js";
import * as emailOutboxService from "../notifications/emailOutbox.service.js";
import {
  initializePaystackTransaction,
  verifyPaystackTransaction,
} from "./paystack.service.js";



const toMinorUnits = (amount) => {
  const value = amount.toString();

  const match = value.match(/^(\d+)(?:\.(\d{1,2}))?$/);

  if (!match) {
    throw new BadRequestError(
      "The training program has an invalid payment amount",
    );
  }

  const major = Number(match[1]);
  const minor = Number((match[2] || "").padEnd(2, "0"));

  return major * 100 + minor;
};

const createReference = () =>
  `KPX-TRN-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

const getPaymentStatus = (status) => {
  switch (status) {
    case "success":
      return "SUCCESS";

    case "failed":
      return "FAILED";

    case "abandoned":
      return "ABANDONED";

    case "reversed":
      return "REVERSED";

    default:
      return "PENDING";
  }
};

export const initializeSouvenirPayment = async ({ orderId, accessToken }) => {
  const order = await souvenirDb.findSouvenirOrderById(orderId);
  if (!order) throw new NotFoundError("Souvenir order not found");
  if (order.status !== "SUBMITTED" && order.status !== "AWAITING_PAYMENT") throw new BadRequestError("This souvenir order is not awaiting payment");
  if (order.currency !== "NGN") throw new BadRequestError("Only NGN payments are currently supported");
  const pendingPayment = await paymentDb.findPendingSouvenirPayment(order.id);
  if (pendingPayment?.authorizationUrl) {
    if (order.status === "SUBMITTED") {
      await souvenirDb.updateSouvenirOrder(order.id, { status: "AWAITING_PAYMENT" });
    }
    return {
      paymentId: pendingPayment.id,
      reference: pendingPayment.reference,
      authorizationUrl: pendingPayment.authorizationUrl,
      accessCode: pendingPayment.accessCode,
      amount: pendingPayment.amount,
      currency: pendingPayment.currency,
    };
  }
  if (pendingPayment) throw new BadRequestError("Secure checkout is still being prepared. Try again shortly.");
  const amountInMinorUnits = toMinorUnits(order.totalPriceSnapshot);
  if (amountInMinorUnits <= 0) throw new BadRequestError("Souvenir order amount must be greater than zero");
  const payment = await paymentDb.createPayment({
    souvenirOrderId: order.id, provider: "PAYSTACK",
    reference: "KPX-SOUV-" + Date.now() + "-" + crypto.randomBytes(6).toString("hex"),
    amount: order.totalPriceSnapshot, currency: order.currency, status: "PENDING",
  });
  try {
    const result = await initializePaystackTransaction({
      email: order.customerEmail, amount: String(amountInMinorUnits), currency: order.currency,
      reference: payment.reference,
      callback_url: process.env.FRONTEND_URL && accessToken
        ? process.env.FRONTEND_URL.replace(/\/+$/, "") + "/souvenirs/orders/access/" + accessToken + "?reference=" + payment.reference
        : process.env.PAYSTACK_CALLBACK_URL,
      metadata: { paymentId: payment.id, souvenirOrderId: order.id, paymentType: "SOUVENIR_ORDER" },
    });
    await paymentDb.updatePayment(payment.id, { authorizationUrl: result.authorization_url, accessCode: result.access_code });
    await souvenirDb.updateSouvenirOrder(order.id, { status: "AWAITING_PAYMENT" });
    return { paymentId: payment.id, reference: payment.reference, authorizationUrl: result.authorization_url, accessCode: result.access_code, amount: payment.amount, currency: payment.currency };
  } catch (error) {
    await paymentDb.updatePayment(payment.id, { status: "FAILED" });
    throw error;
  }
};
const createWorkshopPaymentReference = () =>
  `KPX-WKS-${Date.now()}-${crypto.randomBytes(6).toString("hex")}`;

const workshopPaymentResponse = (payment) => ({
  paymentId: payment.id,
  reference: payment.reference,
  authorizationUrl: payment.authorizationUrl,
  accessCode: payment.accessCode,
  amount: payment.amount,
  currency: payment.currency,
});

export const initializeWorkshopPayment = async ({ reference, token }) => {
  const accessTokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const booking = await paymentDb.findGuestWorkshopBookingForPayment(reference, accessTokenHash);
  if (!booking) throw new NotFoundError("Workshop booking not found");
  if (booking.status !== "ACCEPTED") {
    throw new ConflictError("Only an accepted workshop proposal can proceed to payment");
  }
  if (booking.proposalPrice == null) {
    throw new ConflictError("This accepted proposal has no payable amount. Contact KPX Academy");
  }
  if (booking.currency !== "NGN") {
    throw new BadRequestError("Only NGN payments are currently supported");
  }

  const latestPayment = await paymentDb.findLatestWorkshopPayment(booking.id);
  if (latestPayment?.status === "SUCCESS") {
    throw new ConflictError("This workshop proposal has already been paid");
  }

  const pendingPayment = await paymentDb.findPendingWorkshopPayment(booking.id);
  if (pendingPayment?.authorizationUrl) return workshopPaymentResponse(pendingPayment);
  if (pendingPayment) {
    throw new ConflictError("Secure checkout is already being prepared. Try again shortly");
  }

  const amountInMinorUnits = toMinorUnits(booking.proposalPrice);
  if (amountInMinorUnits <= 0) {
    throw new BadRequestError("Workshop proposal amount must be greater than zero");
  }

  let payment;
  try {
    payment = await paymentDb.createPayment({
      workshopBookingId: booking.id,
      provider: "PAYSTACK",
      reference: createWorkshopPaymentReference(),
      amount: booking.proposalPrice,
      currency: booking.currency,
      status: "PENDING",
    });
  } catch (error) {
    if (error?.code === "P2002") {
      const concurrentPayment = await paymentDb.findPendingWorkshopPayment(booking.id);
      if (concurrentPayment?.authorizationUrl) return workshopPaymentResponse(concurrentPayment);
      throw new ConflictError("A workshop checkout is already being prepared. Try again shortly");
    }
    throw error;
  }

  try {
    const result = await initializePaystackTransaction({
      email: booking.customerEmail,
      amount: String(amountInMinorUnits),
      currency: booking.currency,
      reference: payment.reference,
      callback_url: process.env.FRONTEND_URL
        ? `${process.env.FRONTEND_URL.replace(/\\/+$/, "")}/workshops/access/${encodeURIComponent(reference)}/${token}?payment_reference=${encodeURIComponent(payment.reference)}`
        : process.env.PAYSTACK_CALLBACK_URL,
      metadata: {
        paymentId: payment.id,
        workshopBookingId: booking.id,
        publicReference: booking.publicReference,
        paymentType: "WORKSHOP_BOOKING",
      },
    });
    const updated = await paymentDb.updatePayment(payment.id, {
      authorizationUrl: result.authorization_url,
      accessCode: result.access_code,
    });
    return workshopPaymentResponse(updated);
  } catch (error) {
    await paymentDb.updatePayment(payment.id, { status: "FAILED" });
    throw error;
  }
};

export const initializePayment = async ({ name, email, trainingProgramId }) => {
  /*
   * Load authoritative programme configuration before creating
   * a registration, so incomplete onboarding setup cannot leave
   * an unnecessary pending registration behind.
   */
  const program = await paymentDb.findTrainingProgram(trainingProgramId);

  if (!program) {
    throw new NotFoundError("Training program not found");
  }

  if (!program.telegramGroupUrl) {
    throw new BadRequestError("This training program is not ready for paid registration. Contact the academy.");
  }

  if (program.currency !== "NGN") {
    throw new BadRequestError("Only NGN payments are currently supported");
  }

  const registration = await registrationService.createRegistration({
    name,
    email,
    trainingProgramId,
  });

  const amountInMinorUnits = toMinorUnits(program.price);

  if (amountInMinorUnits <= 0) {
    throw new BadRequestError(
      "The training program price must be greater than zero",
    );
  }

  /*
   * Create the payment record before contacting Paystack.
   */
  const payment = await paymentDb.createPayment({
    registrationId: registration.id,
    provider: "PAYSTACK",
    reference: createReference(),
    amount: program.price,
    currency: program.currency,
    status: "PENDING",
    onboardingSnapshot: {
      name: registration.name,
      email: registration.email,
      programTitle: program.title,
      telegramGroupUrl: program.telegramGroupUrl,
    },
  });

  try {
    const paystackResult = await initializePaystackTransaction({
      email: registration.email,
      amount: String(amountInMinorUnits),
      currency: program.currency,
      reference: payment.reference,
      callback_url: process.env.PAYSTACK_CALLBACK_URL,

      metadata: {
        registrationId: registration.id,
        paymentId: payment.id,
        trainingProgramId: program.id,
      },
    });

    await paymentDb.updatePayment(payment.id, {
      authorizationUrl: paystackResult.authorization_url,
      accessCode: paystackResult.access_code,
    });

    return {
      registrationId: registration.id,
      paymentId: payment.id,
      reference: payment.reference,
      authorizationUrl: paystackResult.authorization_url,
      accessCode: paystackResult.access_code,
      amount: payment.amount,
      currency: payment.currency,
    };
  } catch (error) {
    await paymentDb.updatePayment(payment.id, {
      status: "FAILED",
    });

    throw error;
  }
};

const applyVerifiedTransaction = async (reference, transaction) => {
  return prisma.$transaction(async (tx) => {
    const payment = await paymentDb.findPaymentByReference(reference, tx);

    if (!payment) {
      throw new NotFoundError("Payment reference not found");
    }

    if (transaction.reference !== payment.reference) {
      throw new BadRequestError(
        "The verified payment reference does not match",
      );
    }

    const expectedAmount = toMinorUnits(payment.amount);

    if (Number(transaction.amount) !== expectedAmount) {
      throw new BadRequestError("The verified payment amount does not match");
    }

    if (transaction.currency !== payment.currency) {
      throw new BadRequestError("The verified payment currency does not match");
    }

    const status = getPaymentStatus(transaction.status);

    /*
     * Never downgrade an already successful payment,
     * except when Paystack explicitly reports it reversed.
     */
    if (payment.status === "SUCCESS" && status !== "REVERSED") {
      return {
        reference: payment.reference,
        status: payment.status,
        registrationStatus: payment.registration?.status ?? null,
        souvenirOrderStatus: payment.souvenirOrder?.status ?? null,
        alreadyProcessed: true,
      };
    }

    const updatedPayment = await paymentDb.updatePayment(
      payment.id,
      {
        status,

        providerReference:
          transaction.id != null ? String(transaction.id) : undefined,

        providerPayload: transaction,

        paidAt:
          status === "SUCCESS" ? payment.paidAt || new Date() : payment.paidAt,
      },
      tx,
    );

    /*
     * Registration state is owned by the registration module.
     *
     * We use its DB operation here because this transition
     * must happen inside the same Prisma transaction as the
     * payment update.
     */
    let registrationStatus = payment.registration?.status ?? null;
    let souvenirOrderStatus = payment.souvenirOrder?.status ?? null;\n    let workshopBookingStatus = payment.workshopBooking?.status ?? null;\n    let workshopPaymentNeedsReview = false;

    if (payment.registrationId && status === "SUCCESS") {
      const updatedRegistration = await registrationService.markRegistrationPaid(payment.registrationId, tx);
      registrationStatus = updatedRegistration.status;
      const onboardingSnapshot = payment.onboardingSnapshot ?? (payment.registration ? {
        name: payment.registration.name,
        email: payment.registration.email,
        programTitle: payment.registration.trainingProgram?.title,
        telegramGroupUrl: payment.registration.trainingProgram?.telegramGroupUrl,
      } : null);
      if (onboardingSnapshot?.telegramGroupUrl && payment.registrationId) {
        await emailOutboxService.enqueueTrainingTelegramAccessEmail(
          payment.registrationId,
          onboardingSnapshot,
          tx,
        );
      } else {
        console.error("[Payment] Payment confirmed without onboarding email: Telegram link snapshot is missing.", {
          paymentId: payment.id,
          registrationId: payment.registrationId,
        });
      }
    } else if (payment.registrationId && status === "REVERSED") {
      const updatedRegistration = await registrationService.markRegistrationPending(payment.registrationId, tx);
      registrationStatus = updatedRegistration.status;
    }

    if (payment.souvenirOrderId && status === "SUCCESS") {
      const updatedOrder = await tx.souvenirOrder.update({ where: { id: payment.souvenirOrderId }, data: { status: "PAID" } });
      souvenirOrderStatus = updatedOrder.status;
    } else if (payment.souvenirOrderId && status === "REVERSED") {
      const updatedOrder = await tx.souvenirOrder.update({ where: { id: payment.souvenirOrderId }, data: { status: "AWAITING_PAYMENT" } });
      souvenirOrderStatus = updatedOrder.status;
    }

    if (payment.workshopBookingId && status === "SUCCESS") {
      if (payment.workshopBooking?.status === "ACCEPTED") {
        const transitioned = await tx.workshopBooking.updateMany({
          where: { id: payment.workshopBookingId, status: "ACCEPTED" },
          data: { status: "CONFIRMED" },
        });
        if (transitioned.count === 1) {
          const booking = await tx.workshopBooking.findUnique({ where: { id: payment.workshopBookingId } });
          await tx.workshopBookingHistory.create({
            data: {
              bookingId: payment.workshopBookingId,
              action: "STATUS_CHANGED",
              previousStatus: "ACCEPTED",
              newStatus: "CONFIRMED",
              previousEventDate: booking.eventDate,
              newEventDate: booking.eventDate,
              customerMessage: "Payment was verified successfully. Your workshop booking is confirmed.",
            },
          });
          workshopBookingStatus = "CONFIRMED";
        } else {
          const booking = await tx.workshopBooking.findUnique({ where: { id: payment.workshopBookingId } });
          workshopBookingStatus = booking?.status ?? null;
          workshopPaymentNeedsReview = true;
        }
      } else if (payment.workshopBooking?.status !== "CONFIRMED") {
        workshopPaymentNeedsReview = true;
      }
    } else if (payment.workshopBookingId && status === "REVERSED") {
      if (payment.workshopBooking?.status === "CONFIRMED") {
        const transitioned = await tx.workshopBooking.updateMany({
          where: { id: payment.workshopBookingId, status: "CONFIRMED" },
          data: { status: "ACCEPTED" },
        });
        if (transitioned.count === 1) {
          const booking = await tx.workshopBooking.findUnique({ where: { id: payment.workshopBookingId } });
          await tx.workshopBookingHistory.create({
            data: {
              bookingId: payment.workshopBookingId,
              action: "STATUS_CHANGED",
              previousStatus: "CONFIRMED",
              newStatus: "ACCEPTED",
              previousEventDate: booking.eventDate,
              newEventDate: booking.eventDate,
              customerMessage: "The payment was reversed. Contact KPX Academy before making another payment.",
            },
          });
          workshopBookingStatus = "ACCEPTED";
        } else {
          workshopPaymentNeedsReview = true;
        }
      } else {
        workshopPaymentNeedsReview = true;
      }
    }

    return {
      reference: updatedPayment.reference,
      status: updatedPayment.status,
      registrationStatus,
      souvenirOrderStatus,
      workshopBookingStatus,
      workshopPaymentNeedsReview,
      alreadyProcessed: false,
    };
  });
};

export const verifyPayment = async (reference) => {
  const existing = await paymentDb.findPaymentByReference(reference);

  if (!existing) {
    throw new NotFoundError("Payment reference not found");
  }

  const transaction = await verifyPaystackTransaction(reference);

  return applyVerifiedTransaction(reference, transaction);
};
