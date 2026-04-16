import { BOOKING_STATUS, CLOSE_HOUR, MAX_BOOKING_HOURS, OPEN_HOUR } from "./constants";

export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export type BookingLike = {
  startHour: number;
  endHour: number;
  status: string;
};

function blocksSlot(status: string) {
  return status === BOOKING_STATUS.PENDING || status === BOOKING_STATUS.CONFIRMED;
}

export function isSlotBlocked(
  startHour: number,
  endHour: number,
  existing: BookingLike[]
): boolean {
  return existing.some(
    (b) => blocksSlot(b.status) && rangesOverlap(startHour, endHour, b.startHour, b.endHour)
  );
}

export function availableStartHours(
  open: number,
  close: number,
  existing: BookingLike[],
  duration: number
): number[] {
  const out: number[] = [];
  for (let h = open; h + duration <= close; h++) {
    if (!isSlotBlocked(h, h + duration, existing)) out.push(h);
  }
  return out;
}

export type TimeRange = { startHour: number; endHour: number };

/** All valid [start, end) integer-hour ranges that do not overlap blocking bookings. */
export function availableTimeRanges(
  open: number,
  close: number,
  existing: BookingLike[],
  maxHours: number = MAX_BOOKING_HOURS
): TimeRange[] {
  const out: TimeRange[] = [];
  for (let s = open; s < close; s++) {
    for (let e = s + 1; e <= close; e++) {
      if (e - s > maxHours) break;
      if (!isSlotBlocked(s, e, existing)) out.push({ startHour: s, endHour: e });
    }
  }
  return out;
}

/** One-hour blocks [h, h+1) that are fully free (for viewer / simple availability UI). */
export function availableHourlyRanges(
  open: number,
  close: number,
  existing: BookingLike[]
): TimeRange[] {
  return availableStartHours(open, close, existing, 1).map((h) => ({
    startHour: h,
    endHour: h + 1,
  }));
}

export { OPEN_HOUR, CLOSE_HOUR, MAX_BOOKING_HOURS };
