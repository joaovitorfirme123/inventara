import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations must prefer Neon's direct endpoint over the pooled runtime URL.
    url: process.env.DIRECT_URL?.trim() || env("DATABASE_URL"),
  },
});
