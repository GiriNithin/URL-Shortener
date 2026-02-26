# URL Shortener

A URL shortener that turns long URLs into short, shareable links using **base62 encoding**. Built with **Next.js** (frontend) and a **Node.js** backend, designed to run on **AWS**: frontend on **S3**, backend on **EC2**, and data in **Amazon RDS**.

## Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                         AWS                               │
                    │                                                           │
  User browser      │   ┌─────────────┐     ┌─────────────┐     ┌────────────┐  │
  ───────────────►  │   │   S3 +      │     │    EC2      │     │    RDS     │  │
                    │   │ CloudFront  │     │   Backend   │────►│ (Postgres) │  │
                    │   │ (Frontend)  │     │  (Node.js)  │     │   urls     │  │
                    │   └──────┬──────┘     └──────┬──────┘     └────────────┘  │
                    │          │                   │                             │
                    │          │  POST /api/shorten│  GET /:code → redirect      │
                    │          └──────────────────┘                             │
                    └─────────────────────────────────────────────────────────┘
```

- **Frontend (Next.js)**  
  Static export served from **S3** (optionally behind **CloudFront**). Users enter a long URL; the app calls the backend to create a short link.

- **Backend (EC2)**  
  **Node.js + Express**:
  - `POST /api/shorten` — accepts a long URL, stores it in RDS, returns a short URL (base62 of the DB id).
  - `GET /:code` — looks up the id from the code, fetches long URL from RDS, responds with **302 redirect** to the original URL.
  - `GET /` — redirects to the frontend (e.g. your S3/CloudFront URL).

- **Database (RDS)**  
  **PostgreSQL** with a single table `urls (id, long_url, created_at)`. The “short code” is the base62 encoding of `id` (no extra column needed).

## Project structure

```
URL-Shortener/
├── frontend/          # Next.js app (static export for S3)
│   ├── app/
│   ├── next.config.js
│   └── package.json
├── backend/           # Node.js API + redirect (for EC2)
│   ├── src/
│   │   ├── index.ts
│   │   ├── db.ts
│   │   ├── shortCode.ts      # base62 encode/decode
│   │   ├── db/urls.ts
│   │   └── routes/
│   ├── schema.sql     # RDS table
│   ├── .env.example
│   └── package.json
└── README.md
```

## Run locally

### 1. Database (PostgreSQL)

Create a DB and run the schema:

```bash
createdb urlshortener
psql -d urlshortener -f backend/schema.sql
```

### 2. Backend (EC2-style)

```bash
cd backend
cp .env.example .env
# Edit .env: RDS_* → your local Postgres (or keep defaults)
npm install
npm run build
npm start
```

Runs on `http://localhost:3001`.  
- Shorten: `POST http://localhost:3001/api/shorten` with `{ "url": "https://example.com/..." }`.  
- Redirect: open `http://localhost:3001/<code>`.

### 3. Frontend (S3-style static build)

```bash
cd frontend
npm install
# Point to local backend (default in next.config.js)
npm run build
```

- **Static export** is in `frontend/out/` (ready to upload to S3).  
- Dev server (hits backend on port 3001):

  ```bash
  npm run dev
  ```

  Open `http://localhost:3000`, paste a long URL, get a short link.  
  Short links like `http://localhost:3001/Ab3` will redirect through the backend.

## Deploy on AWS

### RDS (PostgreSQL)

1. Create a PostgreSQL instance (e.g. db.t3.micro).
2. Create a database (e.g. `urlshortener`).
3. Run `backend/schema.sql` on it (e.g. via psql or RDS query editor).
4. Note endpoint, port, user, password for the backend `.env`.

### EC2 (Backend)

1. Launch an EC2 instance (e.g. Amazon Linux 2, Node 18+).
2. Install Node.js, clone the repo, then:
   ```bash
   cd backend
   npm ci
   npm run build
   ```
3. Set environment variables (e.g. in `.env` or systemd/PM2):
   - `PORT=3001`
   - `BASE_URL=https://short.yourdomain.com` (or your EC2/ALB URL)
   - `FRONTEND_URL=https://app.yourdomain.com` (S3/CloudFront URL)
   - `RDS_HOST`, `RDS_PORT`, `RDS_DATABASE`, `RDS_USER`, `RDS_PASSWORD`
4. Run the app (e.g. `node dist/index.js` or PM2) and open port 3001 (or put an ALB in front with HTTPS).
5. Point your short domain (e.g. `short.yourdomain.com`) to this instance or ALB.

### S3 + CloudFront (Frontend)

1. Build static export:
   ```bash
   cd frontend
   NEXT_PUBLIC_API_URL=https://short.yourdomain.com npm run build
   ```
2. Create an S3 bucket, enable static website hosting (or use CloudFront origin).
3. Upload the contents of `frontend/out/` to the bucket (e.g. `aws s3 sync out/ s3://your-bucket/ --delete`).
4. Optionally create a CloudFront distribution with the S3 bucket as origin, and use that URL (or a custom domain) as `FRONTEND_URL` and for users.

After this, the frontend (on S3) will call your EC2 backend for shortening, and visiting `https://short.yourdomain.com/<code>` will redirect via EC2 and RDS to the original URL.

## Base62 encoding (short codes)

Short codes are **base62** encodings of the numeric `id` from the `urls` table (0–9, a–z, A–Z). This keeps codes URL-safe and short without storing a separate “code” column. Decoding the code gives the `id` used to look up `long_url` in RDS.

## License

MIT
