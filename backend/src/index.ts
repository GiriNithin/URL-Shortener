import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { shortenRouter } from './routes/shorten.js';
import { redirectRouter } from './routes/redirect.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/shorten', shortenRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
app.get('/', (_req, res) => {
  res.redirect(302, FRONTEND_URL);
});

app.use('/', redirectRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`URL Shortener backend listening on port ${PORT}`);
});
