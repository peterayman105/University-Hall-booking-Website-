export const ROLES = {
  SUPERADMIN: "SUPERADMIN",
  CUSTOMER: "CUSTOMER",
  VIEWER: "VIEWER",
} as const;

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  REJECTED: "REJECTED",
} as const;

export const REVIEW_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;

export const SEATING = {
  FLAT: "FLAT",
  ESCALATED: "ESCALATED",
} as const;

export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 22;

export const MAX_BOOKING_HOURS = 8;

export const BLOCKING_BOOKING_STATUSES = [
  BOOKING_STATUS.PENDING,
  BOOKING_STATUS.CONFIRMED,
] as const;
