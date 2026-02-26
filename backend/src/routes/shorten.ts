import { Router } from 'express';
import { createShortUrl } from '../db/urls.js';
import { idToShortCode } from '../shortCode.js';

export const shortenRouter = Router();

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';

shortenRouter.post('/', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url' });
    }

    let parsed: URL;
    try {
      parsed = new URL(url.trim());
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return res.status(400).json({ error: 'URL must be http or https' });
    }

    const longUrl = parsed.href;
    const row = await createShortUrl(longUrl);
    const shortCode = idToShortCode(row.id);
    const shortUrl = `${BASE_URL.replace(/\/$/, '')}/${shortCode}`;

    res.status(201).json({
      shortUrl,
      shortCode,
      longUrl,
    });
  } catch (err: unknown) {
    console.error('Shorten error:', err);
    const message =
      err && typeof (err as NodeJS.ErrnoException).code === 'string'
        ? 'Database error. Ensure PostgreSQL is running, the database exists, and you’ve run backend/schema.sql.'
        : 'Failed to shorten URL';
    res.status(500).json({ error: message });
  }
});
