import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  console.warn(
    "[kbm] DATABASE_URL is not set. Authentication and per-user storage will not work until a Neon Postgres connection string is provided.",
  );
}

export const db = drizzle(process.env.DATABASE_URL!, { schema });
