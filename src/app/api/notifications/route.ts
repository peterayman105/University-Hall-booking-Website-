import { getSession } from "@/lib/auth";
import { NotificationController, respond } from "@/controllers";

export async function GET() {
  const session = await getSession();
  return respond(await NotificationController.listMine(session));
}
