# LyricSync Studio

A professional web-based lyric video production tool for your YouTube channel.
Auto-sync lyrics to audio with WhisperX forced alignment, highlight words Spotify-style, and render 1080p/4K MP4 videos — all in a clean Turborepo monorepo.

---

## Monorepo Structure

```text
.
├── apps/
│   ├── web/                     # Next.js 14 — frontend + all API routes + BullMQ workers
│   └── alignment-service/       # Python FastAPI + WhisperX microservice
├── packages/
│   ├── types/                   # @lyric-sync/types — shared TypeScript contracts
│   └── config/                  # @lyric-sync/config — ESLint + Tailwind presets
├── docker-compose.yml           # Local dev infrastructure (Redis + alignment service)
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Quick Start (local dev)

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 — `npm i -g pnpm`
- Docker + Docker Compose (for Redis and the alignment service)
- A [Neon](https://neon.tech/) PostgreSQL project
- A [Cloudinary](https://cloudinary.com/) account

### 1. Install JS dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example apps/web/.env.local
```

Open `apps/web/.env.local` and fill in every value marked as required:

```text
DATABASE_URL=...          ← Neon connection string
NEXTAUTH_SECRET=...       ← openssl rand -base64 32
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
ALIGNMENT_WEBHOOK_SECRET=...  ← any random string
OPENAI_API_KEY=...        ← optional, needed for translation
GENIUS_API_TOKEN=...      ← optional, for lyric search fallback
```

### 3. Start background infrastructure (Redis + alignment service)

```bash
pnpm infra:up
# Starts two containers:  lyric-sync-redis  +  lyric-sync-alignment
# alignment service logs: pnpm infra:logs
```

> First run downloads the WhisperX Whisper model (~145 MB for `base`). Subsequent starts use the cached volume.

### 4. Run database migrations

```bash
pnpm db:generate   # generates SQL from schema.ts
pnpm db:migrate    # applies to Neon
```

### 5. Start the Next.js app

```bash
pnpm dev           # http://localhost:3000
```

### 6. Start BullMQ workers (separate terminal)

```bash
pnpm workers:dev   # tsx watch — auto-reloads on file changes
```

---

## Full Workflow (end-to-end)

```text
1. Upload MP3/MP4  →  ID3 metadata auto-fills title + artist
2. Fetch or paste lyrics  →  optional GPT-4o translation
3. Click "Auto-Sync Lyrics"  →  WhisperX aligns every word (~1–3 min)
4. Review timings in Sync Editor  →  drag handles to fine-tune
5. Pick a background template  →  configure font, colors, highlight style
6. "Finalise & Render"  →  FFmpeg renders 1080p/4K MP4 (background job)
7. Download MP4 or copy Cloudinary URL  →  upload to YouTube
```

---

## Features

| Feature                                          | Done |
| ------------------------------------------------ | ---- |
| Email + Google OAuth sign-in                     | ✅   |
| Audio upload (MP3/MP4) + ID3 metadata            | ✅   |
| AI lyric fetch (LRCLIB + Genius fallback)        | ✅   |
| AI translation via GPT-4o (natural, singable)    | ✅   |
| WhisperX forced alignment (word-level)           | ✅   |
| Interactive sync editor + WaveSurfer.js          | ✅   |
| Drag handles for per-word timing adjustment      | ✅   |
| Text style config (font, size, colors)           | ✅   |
| Highlight styles (color / scale / glow / under)  | ✅   |
| Live style preview before render                 | ✅   |
| Template gallery with upload and tags            | ✅   |
| FFmpeg video rendering frame-by-frame            | ✅   |
| Spotify-style active word highlight              | ✅   |
| BullMQ background jobs (alignment + render)      | ✅   |
| Live render progress bar with polling            | ✅   |
| Re-render with different settings                | ✅   |
| Project deletion with confirmation dialog        | ✅   |
| Download MP4 and copy Cloudinary URL             | ✅   |
| Docker Compose local dev setup                   | ✅   |
| BullMQ workers entry script                      | ✅   |
| Loading skeletons + error boundaries             | ✅   |
| Environment variable validation at startup       | ✅   |
| Python alignment service tests                   | ✅   |

---

## Tech Stack

| Layer       | Technology                                        |
| ----------- | ------------------------------------------------- |
| Frontend    | Next.js 14 (App Router), Tailwind CSS, shadcn/ui  |
| Waveform    | WaveSurfer.js                                     |
| State       | Zustand                                           |
| Auth        | NextAuth.js — email+password + Google OAuth       |
| Database    | Drizzle ORM → Neon (serverless PostgreSQL)        |
| Queue       | BullMQ + Redis                                    |
| Storage     | Cloudinary                                        |
| AI          | OpenAI GPT-4o, LRCLIB API, Genius API             |
| Video       | FFmpeg (fluent-ffmpeg) + Node canvas              |
| Alignment   | WhisperX (Python FastAPI microservice)            |
| Monorepo    | Turborepo + pnpm workspaces                       |

---

## Deployment

| Service           | Platform                     |
| ----------------- | ---------------------------- |
| Next.js app       | Vercel                       |
| BullMQ workers    | Railway (Node process)       |
| Alignment service | Railway or Render (Docker)   |
| Database          | Neon (serverless PostgreSQL) |
| Redis             | Railway or Upstash           |
| Storage           | Cloudinary                   |

### Vercel env vars

Copy every key from `apps/web/.env.local` into your Vercel project environment settings.

### Railway worker deployment

Create a separate Railway service from the same repo, set the start command to:

```bash
cd apps/web && pnpm workers
```

### Alignment service deployment

Use the `apps/alignment-service/Dockerfile`. Set `WHISPER_DEVICE=cuda` on a GPU-enabled instance for 10–20× faster alignment.
