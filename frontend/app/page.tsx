'use client';

import { useState } from 'react';
import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const [longUrl, setLongUrl] = useState('');
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShortUrl(null);
    if (!longUrl.trim()) {
      setError('Please enter a URL');
      return;
    }
    try {
      const parsed = new URL(longUrl.trim());
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        setError('URL must start with http:// or https://');
        return;
      }
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/shorten`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: longUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to shorten URL');
        return;
      }
      setShortUrl(data.shortUrl);
    } catch (err) {
      setError('Could not reach the server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard() {
    if (!shortUrl) return;
    navigator.clipboard.writeText(shortUrl);
    // Optional: show a brief "Copied!" toast
  }

  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <h1 className={styles.title}>URL Shortener</h1>
        <p className={styles.subtitle}>
          Paste a long URL and get a minified link (Base62 encoded)
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="url"
            placeholder="https://example.com/very/long/url..."
            value={longUrl}
            onChange={(e) => setLongUrl(e.target.value)}
            className={styles.input}
            disabled={loading}
          />
          <button type="submit" className={styles.button} disabled={loading}>
            {loading ? 'Shortening…' : 'Shorten'}
          </button>
        </form>

        {error && <p className={styles.error}>{error}</p>}

        {shortUrl && (
          <div className={styles.result}>
            <p className={styles.resultLabel}>Short URL</p>
            <div className={styles.resultRow}>
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.shortLink}
              >
                {shortUrl}
              </a>
              <button
                type="button"
                onClick={copyToClipboard}
                className={styles.copyBtn}
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
