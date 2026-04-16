import { isCustomer, isSuperadmin, isViewer, type SessionPayload } from "@/lib/auth";
import { CLOSE_HOUR, OPEN_HOUR, SEATING } from "@/lib/constants";
import { availableHourlyRanges, availableTimeRanges, isSlotBlocked } from "@/lib/booking-utils";
import { BookingModel } from "@/models/booking.model";
import { HallModel } from "@/models/hall.model";
import { ReviewModel } from "@/models/review.model";
import { fail, ok, type ActionResult } from "./types";

function parseBool(v: string | null): boolean | undefined {
  if (v === null || v === "") return undefined;
  return v === "true" || v === "1";
}

function buildHallListWhere(searchParams: URLSearchParams): Record<string, unknown> {
  const minPrice = searchParams.get("minPrice");
  const maxPrice = searchParams.get("maxPrice");
  const minSeats = searchParams.get("minSeats");
  const hasProjector = parseBool(searchParams.get("hasProjector"));
  const hasAC = parseBool(searchParams.get("hasAC"));
  const seatingFlat = searchParams.get("seatingFlat") === "1";
  const seatingEscalated = searchParams.get("seatingEscalated") === "1";

  const where: Record<string, unknown> = {};
  const price: { gte?: number; lte?: number } = {};
  if (minPrice != null && minPrice !== "") price.gte = Number(minPrice);
  if (maxPrice != null && maxPrice !== "") price.lte = Number(maxPrice);
  if (Object.keys(price).length) where.pricePerHour = price;
  if (minSeats != null && minSeats !== "") where.capacity = { gte: Number(minSeats) };
  if (hasProjector === true) where.hasProjector = true;
  if (hasAC === true) where.hasAC = true;
  if (seatingFlat !== seatingEscalated) {
    if (seatingFlat) where.seatingType = SEATING.FLAT;
    if (seatingEscalated) where.seatingType = SEATING.ESCALATED;
  }
  return where;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanPhotoEntries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x || "").trim())
    .filter((x) => x.length > 0);
}

function hallWithPhotos<T extends { photoUrl?: string | null; images?: { url: string }[] }>(hall: T) {
  const fromImages = Array.isArray(hall.images) ? hall.images.map((img) => img.url).filter(Boolean) : [];
  const photos = fromImages.length > 0 ? fromImages : hall.photoUrl ? [hall.photoUrl] : [];
  return { ...hall, photos };
}

function localTodayYmd(): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = String(t.getMonth() + 1).padStart(2, "0");
  const d = String(t.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * MVC — Controller: halls list/detail/CRUD/availability.
 */
export const HallController = {
  async list(
    session: SessionPayload | null,
    searchParams: URLSearchParams
  ): Promise<
    ActionResult<{
      halls: Awaited<ReturnType<typeof HallModel.findAllOrdered>>;
      maxCapacity?: number;
      maxPrice?: number;
    }>
  > {
    if (!session || (!isCustomer(session.role) && !isSuperadmin(session.role) && !isViewer(session.role))) {
      return fail(401, "Unauthorized");
    }
    if (isSuperadmin(session.role)) {
      const halls = (await HallModel.findAllOrdered()).map(hallWithPhotos);
      return ok({ halls });
    }
    const where = buildHallListWhere(searchParams);
    const [maxCapacity, maxPrice, hallsFiltered] = await Promise.all([
      HallModel.maxCapacity(),
      HallModel.maxPricePerHour(),
      HallModel.findManyFiltered(where),
    ]);
    let halls = hallsFiltered.map(hallWithPhotos);

    const freeDate = searchParams.get("freeDate");
    const freeStartRaw = searchParams.get("freeStartHour");
    const freeEndRaw = searchParams.get("freeEndHour");
    if (freeDate && freeStartRaw !== null && freeStartRaw !== "" && freeEndRaw !== null && freeEndRaw !== "") {
      const startHour = Number(freeStartRaw);
      const endHour = Number(freeEndRaw);
      if (
        DATE_RE.test(freeDate) &&
        Number.isInteger(startHour) &&
        Number.isInteger(endHour) &&
        startHour >= OPEN_HOUR &&
        endHour <= CLOSE_HOUR &&
        endHour > startHour &&
        freeDate >= localTodayYmd()
      ) {
        const free: typeof halls = [];
        for (const h of halls) {
          const bookings = await HallModel.blockingBookingsForDay(h.id, freeDate);
          if (!isSlotBlocked(startHour, endHour, bookings)) free.push(h);
        }
        halls = free;
      }
    }

    return ok({ halls, maxCapacity, maxPrice });
  },

  async create(session: SessionPayload | null, body: unknown): Promise<ActionResult<{ hall: unknown }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    try {
      const b = body as Record<string, unknown>;
      const name = String(b.name || "").trim();
      const capacity = Number(b.capacity);
      const hasProjector = Boolean(b.hasProjector);
      const hasAC = Boolean(b.hasAC);
      const seatingType = String(b.seatingType || "").toUpperCase();
      const pricePerHour = Number(b.pricePerHour);
      const extras = b.extras ? String(b.extras).trim() : null;
      const photos = cleanPhotoEntries(b.photos);
      if (photos.length === 0 && b.photoUrl) {
        photos.push(String(b.photoUrl).trim());
      }
      const photoUrl = photos[0] || null;

      if (!name || !Number.isFinite(capacity) || capacity < 1) return fail(400, "Invalid hall data");
      if (seatingType !== SEATING.FLAT && seatingType !== SEATING.ESCALATED) {
        return fail(400, "Invalid seating type");
      }
      if (!Number.isFinite(pricePerHour) || pricePerHour < 0) return fail(400, "Invalid price");

      const hall = await HallModel.create({
        name,
        capacity,
        hasProjector,
        hasAC,
        seatingType,
        pricePerHour,
        photoUrl,
        photos,
        extras,
      });
      return ok({ hall: hallWithPhotos(hall) });
    } catch (e) {
      console.error(e);
      return fail(500, "Server error");
    }
  },

  async getById(
    session: SessionPayload | null,
    id: string
  ): Promise<
    ActionResult<{
      hall: NonNullable<Awaited<ReturnType<typeof HallModel.findById>>>;
      reviews: Awaited<ReturnType<typeof ReviewModel.findApprovedByHall>>;
      canReview: boolean;
    }>
  > {
    if (!session) return fail(401, "Unauthorized");
    const hallRaw = await HallModel.findById(id);
    const hall = hallRaw ? hallWithPhotos(hallRaw) : null;
    if (!hall) return fail(404, "Not found");
    const reviews = await ReviewModel.findApprovedByHall(id);
    let canReview = false;
    if (isCustomer(session.role)) {
      const eligible = await BookingModel.findEligibleForReview(session.sub, id);
      canReview = Boolean(eligible);
    }
    return ok({ hall, reviews, canReview });
  },

  async update(
    session: SessionPayload | null,
    id: string,
    body: unknown
  ): Promise<ActionResult<{ hall: unknown }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    try {
      const b = body as Record<string, unknown>;
      const data: Record<string, unknown> = {};
      if (b.name != null) data.name = String(b.name).trim();
      if (b.capacity != null) data.capacity = Number(b.capacity);
      if (b.hasProjector != null) data.hasProjector = Boolean(b.hasProjector);
      if (b.hasAC != null) data.hasAC = Boolean(b.hasAC);
      if (b.seatingType != null) {
        const st = String(b.seatingType).toUpperCase();
        if (st !== SEATING.FLAT && st !== SEATING.ESCALATED) return fail(400, "Invalid seating");
        data.seatingType = st;
      }
      if (b.pricePerHour != null) data.pricePerHour = Number(b.pricePerHour);
      if (b.extras !== undefined) data.extras = b.extras ? String(b.extras).trim() : null;
      let nextPhotos: string[] | undefined;
      if (b.photos !== undefined || b.photoUrl !== undefined) {
        nextPhotos = cleanPhotoEntries(b.photos);
        if (nextPhotos.length === 0 && b.photoUrl) {
          nextPhotos.push(String(b.photoUrl).trim());
        }
        data.photoUrl = nextPhotos[0] || null;
      }

      const hall = await HallModel.update(id, data, nextPhotos);
      return ok({ hall: hallWithPhotos(hall) });
    } catch {
      return fail(400, "Update failed");
    }
  },

  async remove(session: SessionPayload | null, id: string): Promise<ActionResult<{ ok: boolean }>> {
    if (!session || !isSuperadmin(session.role)) return fail(401, "Unauthorized");
    const blocking = await HallModel.countBlockingBookings(id);
    if (blocking > 0) {
      return fail(409, "Cannot delete hall with pending or confirmed bookings");
    }
    await HallModel.deleteByIdIfSafe(id);
    return ok({ ok: true });
  },

  async availability(
    session: SessionPayload | null,
    hallId: string,
    date: string | null
  ): Promise<
    ActionResult<{
      ranges: { startHour: number; endHour: number }[];
      hourlyRanges: { startHour: number; endHour: number }[];
      openHour: number;
      closeHour: number;
      pricePerHour: number;
    }>
  > {
    if (!session || (!isCustomer(session.role) && !isViewer(session.role))) return fail(401, "Unauthorized");
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(400, "Invalid date");
    const hall = await HallModel.findById(hallId);
    if (!hall) return fail(404, "Not found");
    const bookings = await HallModel.blockingBookingsForDay(hallId, date);
    const ranges = availableTimeRanges(OPEN_HOUR, CLOSE_HOUR, bookings);
    const hourlyRanges = availableHourlyRanges(OPEN_HOUR, CLOSE_HOUR, bookings);
    return ok({
      ranges,
      hourlyRanges,
      openHour: OPEN_HOUR,
      closeHour: CLOSE_HOUR,
      pricePerHour: hall.pricePerHour,
    });
  },
};
