import { AuthController, respond } from "@/controllers";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    return respond(await AuthController.login(body));
  } catch (e) {
    console.error(e);
    if (e instanceof SyntaxError) {
      return Response.json({ error: "Invalid request body" }, { status: 400 });
    }
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error ? e.message : "Server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
