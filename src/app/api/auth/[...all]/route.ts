import { toNextJsHandler } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const handler = toNextJsHandler(auth);

export const GET = handler.GET;

export async function POST(request: Request) {
  if (new URL(request.url).pathname.endsWith("/sign-in/email")) {
    try {
      const body = (await request.clone().json()) as { email?: unknown };
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      const user = email
        ? await prisma.user.findUnique({ where: { email }, select: { isActive: true } })
        : null;

      if (user && !user.isActive) {
        return Response.json(
          { message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" },
          { status: 401 },
        );
      }
    } catch (error) {
      console.error("Failed to verify user status before sign-in", { error });
    }
  }

  return handler.POST(request);
}
