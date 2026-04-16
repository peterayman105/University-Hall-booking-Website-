/**
 * Booking end is interpreted as local wall time: date at endHour:00.
 * Server and browser should use the same expectation (institution local time).
 */
export function bookingEndMs(dateStr: string, endHour: number): number {
  const d = new Date(`${dateStr}T${String(endHour).padStart(2, "0")}:00:00`);
  return d.getTime();
}

export function isBookingEndInPast(
  dateStr: string,
  endHour: number,
  nowMs: number = Date.now()
): boolean {
  return nowMs > bookingEndMs(dateStr, endHour);
}
