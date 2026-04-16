import { getSession } from "@/lib/auth";
import { AssistantController, respond } from "@/controllers";

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  return respond(await AssistantController.chat(session, body));
}
