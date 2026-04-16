import { getSession } from "@/lib/auth";
import { hallPresenceCounts, removeViewer, upsertViewer } from "@/lib/view-presence";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, context: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  return Response.json(hallPresenceCounts(id));
}

export async function POST(req: Request, context: Ctx) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "CUSTOMER" && session.role !== "VIEWER") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = (await req.json().catch(() => ({}))) as { action?: string };
  const action = body.action || "heartbeat";
  const sessionKey = session.sub;

  if (action === "leave") {
    removeViewer(id, sessionKey);
  } else {
    upsertViewer(id, sessionKey, session.role);
  }

  return Response.json(hallPresenceCounts(id));
}
