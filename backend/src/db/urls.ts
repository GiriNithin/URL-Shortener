import { query, getClient } from '../db.js';

export interface UrlRow {
  id: number;
  long_url: string;
  created_at: Date;
}

export async function createShortUrl(longUrl: string): Promise<UrlRow> {
  const client = await getClient();
  try {
    const result = await client.query<UrlRow>(
      'INSERT INTO urls (long_url) VALUES ($1) RETURNING id, long_url, created_at',
      [longUrl]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getLongUrlByShortCode(id: number): Promise<UrlRow | null> {
  const rows = await query<UrlRow>('SELECT id, long_url, created_at FROM urls WHERE id = $1', [id]);
  return rows[0] || null;
}
