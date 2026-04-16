import { getSession } from "@/lib/auth";
import { AdminController, respond } from "@/controllers";

export async function GET() {
  const session = await getSession();
  return respond(await AdminController.menuCounts(session));
}
