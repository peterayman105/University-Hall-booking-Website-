import { getSession } from "@/lib/auth";
import { HallController, respond } from "@/controllers";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const session = await getSession();
  const { id } = await context.params;
  return respond(await HallController.getById(session, id));
}

export async function PATCH(req: Request, context: Ctx) {
  const session = await getSession();
  const { id } = await context.params;
  const body = await req.json();
  return respond(await HallController.update(session, id, body));
}

export async function DELETE(_req: Request, context: Ctx) {
  const session = await getSession();
  const { id } = await context.params;
  return respond(await HallController.remove(session, id));
}
