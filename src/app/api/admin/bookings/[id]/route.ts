import { getSession } from "@/lib/auth";
import { AdminController, respond } from "@/controllers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Ctx) {
  try {
    const session = await getSession();
    const { id } = await context.params;
    const body = await req.json();
    return respond(await AdminController.patchBooking(session, id, body));
  } catch (error) {
    console.error("PATCH /api/admin/bookings/[id] failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Server error while updating booking: ${detail}` }, { status: 500 });
  }
}
