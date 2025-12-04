import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString || typeof connectionString !== "string") {
  throw new Error("Missing or invalid DATABASE_URL environment variable");
}

export const pool = new Pool({
  connectionString,
});
