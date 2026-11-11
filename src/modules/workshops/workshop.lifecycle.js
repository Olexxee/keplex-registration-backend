export const WORKSHOP_BOOKING_TRANSITIONS = Object.freeze({
  NEW: ["UNDER_REVIEW", "CANCELLED"],
  UNDER_REVIEW: ["PROPOSAL_SENT", "ACCEPTED", "CANCELLED"],
  PROPOSAL_SENT: ["ACCEPTED", "CANCELLED"],
  ACCEPTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
});

export const isWorkshopBookingTransitionAllowed = (currentStatus, nextStatus) =>
  currentStatus === nextStatus
  || (WORKSHOP_BOOKING_TRANSITIONS[currentStatus] ?? []).includes(nextStatus);
