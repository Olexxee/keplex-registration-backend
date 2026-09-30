import {asyncWrapper} from "../../lib/asyncWrapper.js";

import * as registrationService from "./registration.service.js";

export const createRegistration = asyncWrapper(
  async (req, res) => {
    const registration =
      await registrationService.createRegistration(
        req.validated.body,
      );

    return res.status(201).json({
      success: true,
      message: "Registration created successfully",
      data: registration,
    });
  },
);

export const getRegistration = asyncWrapper(
  async (req, res) => {
    const registration =
      await registrationService.getRegistrationById(
        req.validated.params.id,
      );

    return res.status(200).json({
      success: true,
      data: registration,
    });
  },
);

export const getRegistrationByReference = asyncWrapper(
  async (req, res) => {
    const registration =
      await registrationService.getRegistrationByPaymentReference(
        req.validated.params.reference,
      );

    return res.status(200).json({
      success: true,
      data: registration,
    });
  },
);

export const listRegistrations = asyncWrapper(
  async (req, res) => {
    const result =
      await registrationService.listRegistrations(
        req.validated.query,
      );

    return res.status(200).json({
      success: true,
      data: result.registrations,
      pagination: result.pagination,
    });
  },
);

export const cancelRegistration = asyncWrapper(
  async (req, res) => {
    const registration =
      await registrationService.cancelRegistration(
        req.validated.params.id,
      );

    return res.status(200).json({
      success: true,
      message: "Registration cancelled successfully",
      data: registration,
    });
  },
);