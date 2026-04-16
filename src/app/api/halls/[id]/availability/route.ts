import { getSession } from "@/lib/auth";
import { HallController, respond } from "@/controllers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: Ctx) {
  const session = await getSession();
  const { id } = await context.params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  return respond(await HallController.availability(session, id, date));
}
