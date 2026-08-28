import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
  },
  user: {
    additionalFields: {
      organizationId: {
        type: "string",
        required: true,
        input: false,
      },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
      joins: true,
    },
  },
  plugins: [nextCookies()],
});
