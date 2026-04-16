import { getSession } from "@/lib/auth";
import { BookingController, respond } from "@/controllers";

export async function POST(req: Request) {
  const session = await getSession();
  const body = await req.json();
  return respond(await BookingController.create(session, body));
}
