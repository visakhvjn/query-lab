import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "Missing DATABASE_URL. Add your Supabase connection string to .env.local",
  );
}

/**
 * Shared Postgres client for Supabase.
 * prepare: false is required when using the Transaction pooler (port 6543 / PgBouncer).
 */
const sql = postgres(connectionString, {
  ssl: "require",
  prepare: false,
  max: 10,
});

export default sql;
