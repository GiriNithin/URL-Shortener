import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.RDS_HOST || 'localhost',
  port: parseInt(process.env.RDS_PORT || '5432', 10),
  database: process.env.RDS_DATABASE || 'urlshortener',
  user: process.env.RDS_USER || 'postgres',
  password: process.env.RDS_PASSWORD || 'postgres',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return (result.rows as T[]) || [];
  } finally {
    client.release();
  }
}

export async function getClient() {
  return pool.connect();
}

export default pool;
