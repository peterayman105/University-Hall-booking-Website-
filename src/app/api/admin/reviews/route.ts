import { getSession } from "@/lib/auth";
import { AdminController, respond } from "@/controllers";

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  const pendingOnly = searchParams.get("pending") === "1";
  return respond(await AdminController.listReviews(session, pendingOnly));
}
