import { getSession } from "@/lib/auth";
import { AuthController, respond } from "@/controllers";

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    const body = await req.json();
    return respond(await AuthController.patchProfile(session, body));
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
}
