import { getSession } from "@/lib/auth";
import { AdminController, respond } from "@/controllers";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: Ctx) {
  try {
    const session = await getSession();
    const { id } = await context.params;
    const body = await req.json();
    return respond(await AdminController.patchReview(session, id, body));
  } catch (error) {
    console.error("PATCH /api/admin/reviews/[id] failed:", error);
    const detail = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: `Server error while updating review: ${detail}` }, { status: 500 });
  }
}
