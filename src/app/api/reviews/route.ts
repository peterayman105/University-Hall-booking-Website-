import { getSession } from "@/lib/auth";
import { ReviewController, respond } from "@/controllers";

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  return respond(await ReviewController.create(session, body));
}
