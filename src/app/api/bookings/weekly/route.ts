import { getSession } from "@/lib/auth";
import { BookingController, respond } from "@/controllers";

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  return respond(await BookingController.weeklySchedule(session, searchParams.get("weekStart")));
}
