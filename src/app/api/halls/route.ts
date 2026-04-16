import { getSession } from "@/lib/auth";
import { HallController, respond } from "@/controllers";

export async function GET(req: Request) {
  const session = await getSession();
  const { searchParams } = new URL(req.url);
  return respond(await HallController.list(session, searchParams));
}

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  return respond(await HallController.create(session, body));
}
