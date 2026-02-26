import { Router } from 'express';
import { getLongUrlByShortCode } from '../db/urls.js';
import { shortCodeToId } from '../shortCode.js';

export const redirectRouter = Router();

redirectRouter.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) return res.redirect(302, '/');

    const id = shortCodeToId(code);
    if (id === 0) return res.status(404).send('Short link not found');

    const row = await getLongUrlByShortCode(id);
    if (!row) return res.status(404).send('Short link not found');

    res.redirect(302, row.long_url);
  } catch (err) {
    console.error('Redirect error:', err);
    res.status(500).send('Server error');
  }
});
