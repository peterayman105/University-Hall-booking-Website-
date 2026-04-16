import { getSession } from "@/lib/auth";
import { AdminController, respond } from "@/controllers";

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  return respond(await AdminController.weeklySchedule(session, searchParams.get("weekStart")));
}
