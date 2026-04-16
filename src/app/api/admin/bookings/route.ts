import { getSession } from "@/lib/auth";
import { AdminController, respond } from "@/controllers";

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  return respond(await AdminController.listBookings(session, status));
}
