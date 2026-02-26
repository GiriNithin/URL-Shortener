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

Run the schema against your database (default `postgres`):

```bash
psql -d postgres -f backend/schema.sql
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

### Before running `npm run build`

**Backend (EC2):**
- Node.js 18+ installed.
- Run `npm install` in the `backend/` directory first (so TypeScript and devDependencies are available for the build).
- No need for a database connection at build time; `.env` is only required when you run the app (`npm start`).

**Frontend (S3):**
- Node.js 18+ installed.
- Run `npm install` in the `frontend/` directory first.
- Set `NEXT_PUBLIC_API_URL` when building (e.g. your backend/short-domain URL), or it will default to `http://localhost:3001`.

---

### RDS (PostgreSQL)

1. Create a PostgreSQL instance (e.g. db.t3.micro).
2. Create a database (or use the default `postgres`).
3. Run `backend/schema.sql` on it (e.g. via psql or RDS query editor).
4. Note endpoint, port, user, password for the backend `.env`.

### EC2 (Backend)

1. Launch an EC2 instance (e.g. Amazon Linux 2, Node 18+).
2. Install Node.js, clone the repo, then:
   ```bash
   cd backend
   npm install
   npm run build
   ```
   **Note:** Use `npm install` (not `npm install --production`) so TypeScript is in `node_modules` for the build. You should see `Build complete: dist/ ready` after a successful build.
3. Set environment variables (e.g. in `.env` or systemd/PM2):
   - `PORT=3001`
   - `BASE_URL=https://short.yourdomain.com` (or your EC2/ALB URL)
   - `FRONTEND_URL=https://app.yourdomain.com` (S3/CloudFront URL)
   - `RDS_HOST`, `RDS_PORT`, `RDS_DATABASE`, `RDS_USER`, `RDS_PASSWORD`
4. Run the app (e.g. `node dist/index.js` or PM2) and open port 3001 (or put an ALB in front with HTTPS).
5. Point your short domain (e.g. `short.yourdomain.com`) to this instance or ALB.

### S3 + CloudFront (Frontend)

1. Build the static export (this creates the `frontend/out/` folder; it is not in the repo):
   ```bash
   cd frontend
   NEXT_PUBLIC_API_URL=https://short.yourdomain.com npm run build
   ```
2. Create an S3 bucket, enable static website hosting (or use CloudFront origin).
3. Upload the built files from `out/` to the bucket (run from the `frontend` directory after the build):
   ```bash
   aws s3 sync out/ s3://your-bucket/ --delete
   ```
4. **After uploading**, do the following:
   - **Enable static website hosting** on the bucket (if not already): S3 → bucket → Properties → Static website hosting → Enable, set index document to `index.html`, error document to `404.html` (or `index.html` if your app handles 404s).
   - **Get your frontend URL**: either the S3 website endpoint (`http://your-bucket.s3-website-<region>.amazonaws.com`) or your CloudFront URL/domain.
   - **Set `FRONTEND_URL` on the backend** (EC2 `.env` or process env) to this URL so that `GET /` on the backend redirects users to the app.
   - **(Optional)** Create a **CloudFront** distribution with the S3 bucket as origin for HTTPS and custom domain; then use that URL as `FRONTEND_URL` and for sharing the app.
5. **(Optional)** For clean URLs (e.g. `/some-path` instead of `/some-path.html`), configure CloudFront or S3 to serve `index.html` for 404s, or use CloudFront error pages to redirect 403/404 to `/index.html` with 200 (for client-side routing).

## Base62 encoding (short codes)

Short codes are **base62** encodings of the numeric `id` from the `urls` table (0–9, a–z, A–Z). This keeps codes URL-safe and short without storing a separate “code” column. Decoding the code gives the `id` used to look up `long_url` in RDS.

## License

MIT
