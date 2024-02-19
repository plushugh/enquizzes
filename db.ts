import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connection = postgres("postgres://postgres:12345678@localdev-postgres.databases.orb.local:5432/enquizzes-db");

const db = drizzle(connection);

export default db;
export { db, connection }