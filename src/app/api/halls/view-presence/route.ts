import { getSession } from "@/lib/auth";
import { manyHallPresenceCounts } from "@/lib/view-presence";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const hallIds = (searchParams.get("hallIds") || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return Response.json({ counts: manyHallPresenceCounts(hallIds) });
}
