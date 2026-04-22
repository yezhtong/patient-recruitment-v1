import "dotenv/config";
import { defineConfig } from "prisma/config";

const url = process.env.DATABASE_URL ?? (process.env.NODE_ENV === "production"
  ? (() => { throw new Error("DATABASE_URL is required in production"); })()
  : "file:./dev.db");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: { url },
});
