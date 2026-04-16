import { AuthController, respond } from "@/controllers";

export async function POST() {
  try {
    return respond(await AuthController.viewerLogin());
  } catch (e) {
    console.error(e);
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error ? e.message : "Server error";
    return Response.json({ error: message }, { status: 500 });
  }
}
