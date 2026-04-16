import { getSession } from "@/lib/auth";
import { AuthController, respond } from "@/controllers";

export async function GET() {
  const session = await getSession();
  return respond(await AuthController.me(session));
}
