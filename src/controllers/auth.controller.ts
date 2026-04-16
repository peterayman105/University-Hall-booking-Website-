import { signToken, type SessionPayload } from "@/lib/auth";
import { ROLES } from "@/lib/constants";
import { validatePassword } from "@/lib/password-validation";
import { UserModel } from "@/models/user.model";
import { fail, ok, type ActionResult } from "./types";

function publicUser(u: {
  id: string;
  email: string;
  name: string;
  role: string;
  photoUrl?: string | null;
}) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    photoUrl: u.photoUrl ?? null,
  };
}

export const AuthController = {
  async register(body: unknown): Promise<ActionResult<{ user: ReturnType<typeof publicUser> }>> {
    try {
      const b = body as Record<string, unknown>;
      const email = String(b.email || "").trim().toLowerCase();
      const password = String(b.password || "");
      const name = String(b.name || "").trim();
      const role = String(b.role || "").toUpperCase();

      if (!email || !password || !name) return fail(400, "Missing fields");
      if (role !== ROLES.SUPERADMIN && role !== ROLES.CUSTOMER) return fail(400, "Invalid role");

      const pwErr = validatePassword(password);
      if (pwErr) return fail(400, pwErr);

      if (await UserModel.emailTaken(email)) return fail(409, "Email already registered");

      if (role === ROLES.SUPERADMIN) {
        const n = await UserModel.countSuperadmins();
        if (n > 0) {
          return fail(
            403,
            "A super admin already exists. Sign in or use customer signup."
          );
        }
      }

      let photoUrl: string | null = null;
      if (b.photoUrl !== undefined && b.photoUrl !== null && String(b.photoUrl).trim()) {
        photoUrl = String(b.photoUrl).trim();
      }

      const passwordHash = await UserModel.hashPassword(password);
      const user = await UserModel.create({ email, passwordHash, name, role, photoUrl });
      const token = await signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      return ok({ user: publicUser(user) }, 200, token);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("JWT_SECRET")) {
        return fail(500, "Server misconfiguration: set JWT_SECRET in environment");
      }
      return fail(500, "Server error");
    }
  },

  async login(body: unknown): Promise<ActionResult<{ user: ReturnType<typeof publicUser> }>> {
    try {
      const b = body as Record<string, unknown>;
      const email = String(b.email || "").trim().toLowerCase();
      const password = String(b.password || "");

      if (!email || !password) return fail(400, "Missing credentials");

      const user = await UserModel.findByEmail(email);
      if (!user) return fail(401, "Invalid email or password");

      const valid = await UserModel.verifyPassword(password, user.passwordHash);
      if (!valid) return fail(401, "Invalid email or password");

      const token = await signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      });

      return ok({ user: publicUser(user) }, 200, token);
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("JWT_SECRET")) {
        return fail(500, "Server misconfiguration: set JWT_SECRET in environment");
      }
      return fail(500, "Server error");
    }
  },

  async viewerLogin(): Promise<
    ActionResult<{ user: { id: string; email: string; name: string; role: string; photoUrl: null } }>
  > {
    const viewerId = `viewer-${crypto.randomUUID()}`;
    const user = {
      id: viewerId,
      email: "viewer@guest.local",
      name: "Viewer",
      role: ROLES.VIEWER,
      photoUrl: null as const,
    };
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    return ok({ user }, 200, token);
  },

  async me(session: SessionPayload | null): Promise<ActionResult<{ user: Awaited<ReturnType<typeof UserModel.findByIdForMe>> }>> {
    if (!session) return ok({ user: null });
    if (session.role === ROLES.VIEWER) {
      return ok({
        user: {
          id: session.sub,
          email: session.email,
          name: session.name || "Viewer",
          role: session.role,
          photoUrl: null,
          createdAt: new Date(0),
        },
      });
    }
    const user = await UserModel.findByIdForMe(session.sub);
    return ok({ user });
  },

  async patchProfile(
    session: SessionPayload | null,
    body: unknown
  ): Promise<ActionResult<{ user: NonNullable<Awaited<ReturnType<typeof UserModel.findByIdForMe>>> }>> {
    if (
      !session ||
      (session.role !== ROLES.CUSTOMER && session.role !== ROLES.SUPERADMIN)
    ) {
      return fail(401, "Unauthorized");
    }
    const b = body as Record<string, unknown>;
    const updates: {
      name?: string;
      email?: string;
      photoUrl?: string | null;
    } = {};

    if (b.name !== undefined) {
      const name = String(b.name || "").trim();
      if (!name) return fail(400, "Name required");
      updates.name = name;
    }
    if (b.email !== undefined) {
      const email = String(b.email || "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, "Invalid email");
      if (await UserModel.emailTakenByOther(email, session.sub)) return fail(409, "Email in use");
      updates.email = email;
    }
    if (b.photoUrl !== undefined) {
      updates.photoUrl = b.photoUrl ? String(b.photoUrl).trim() : null;
    }

    if (Object.keys(updates).length === 0) return fail(400, "Nothing to update");

    await UserModel.updateById(session.sub, updates);
    const user = await UserModel.findByIdForMe(session.sub);
    if (!user) return fail(500, "Server error");

    const needToken = updates.email !== undefined || updates.name !== undefined;
    const token = needToken
      ? await signToken({
          sub: session.sub,
          email: user.email,
          role: user.role,
          name: user.name,
        })
      : undefined;

    return ok({ user }, 200, token);
  },
};
