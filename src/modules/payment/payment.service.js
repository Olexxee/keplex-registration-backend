import crypto from "node:crypto";
import { prisma } from "../../config/prisma.js";
import { BadRequestError, NotFoundError } from "../../classes/errorClasses.js";
import * as paymentDb from "./payment.db.js";
import * as registrationService from "../registration/registration.service.js";
import * as souvenirDb from "../souvenirs/souvenir.db.js";
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
export const initializePayment = async ({ name, email, trainingProgramId }) => {
  /*
   * Registration creation and validation now belongs
   * to the registration module.
   */
  const registration = await registrationService.createRegistration({
    name,
    email,
    trainingProgramId,
  });

  /*
   * We still need the program's authoritative price/currency.
   * This comes from the database, never from the frontend.
   */
  const program = await paymentDb.findTrainingProgram(trainingProgramId);

  if (!program) {
    throw new NotFoundError("Training program not found");
  }

  if (program.currency !== "NGN") {
    throw new BadRequestError("Only NGN payments are currently supported");
  }

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
    let souvenirOrderStatus = payment.souvenirOrder?.status ?? null;

    if (payment.registrationId && status === "SUCCESS") {
      const updatedRegistration = await registrationService.markRegistrationPaid(payment.registrationId, tx);
      registrationStatus = updatedRegistration.status;
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

    return { reference: updatedPayment.reference, status: updatedPayment.status, registrationStatus, souvenirOrderStatus, alreadyProcessed: false };
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
