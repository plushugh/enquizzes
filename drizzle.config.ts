import type { Config } from 'drizzle-kit';

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    host: "localdev-postgres.databases.orb.local",
    user: "postgres",
    password: "12345678",
    database: "enquizzes-db",
  },
} satisfies Config;