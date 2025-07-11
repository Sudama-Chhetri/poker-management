import { Pool } from 'pg';

let conn: Pool;

export async function getConnection() {
  if (!conn) {
    conn = new Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      ssl: {
        rejectUnauthorized: false, // Use this for Supabase if you encounter SSL issues
      },
    });
  }
  return conn.connect();
}
