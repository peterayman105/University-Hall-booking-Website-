import { getSession } from "@/lib/auth";
import { BookingController, respond } from "@/controllers";

export async function GET() {
  const session = await getSession();
  return respond(await BookingController.completed(session));
}
