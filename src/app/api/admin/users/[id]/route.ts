import { getSession } from "@/lib/auth";
import { AdminController, respond } from "@/controllers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Ctx) {
  try {
    const session = await getSession();
    const { id } = await context.params;
    const body = await req.json();
    return respond(await AdminController.patchUser(session, id, body));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function DELETE(_req: Request, context: Ctx) {
  const session = await getSession();
  const { id } = await context.params;
  return respond(await AdminController.deleteUser(session, id));
}
