# CLAUDE.md — FlashKids

AI guidance for working with the FlashKids codebase.

## What This App Is

**FlashKids** is an AI-powered flashcard app for toddlers (ages 1–4). Parents create child profiles, build themed card decks (animals, colours, shapes, etc.), and the app uses AI (Claude + OpenAI) to generate images and audio for each card. Children swipe through cards; the app tracks which cards they know.

## Repository Structure

```
flashkids/
├── server.js          # Express entry point — mounts route modules
├── package.json
├── schema.sql         # PostgreSQL schema
├── .env.example
├── public/            # Static frontend (PWA)
│   └── index.html     # SPA shell
└── src/
    └── routes/
        ├── auth.js        # /api/auth — register, login, me
        ├── children.js    # /api/children — child profiles
        ├── cards.js       # /api/cards — individual flashcards
        └── decks.js       # /api/decks — card collections
```

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| HTTP | Express 4 |
| Database | PostgreSQL (via `pg`) |
| Auth | JWT (`jsonwebtoken`) + `bcryptjs` |
| AI | Anthropic Claude SDK + OpenAI SDK |
| Frontend | Vanilla JS PWA |

## API Routes

| Prefix | File | Description |
|---|---|---|
| `/api/auth` | `src/routes/auth.js` | Register, login, current user |
| `/api/children` | `src/routes/children.js` | CRUD for child profiles |
| `/api/cards` | `src/routes/cards.js` | CRUD for flashcards + AI generation |
| `/api/decks` | `src/routes/decks.js` | CRUD for card decks |

## Environment Variables

```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/flashkids
JWT_SECRET=...
ANTHROPIC_API_KEY=...
OPENAI_API_KEY=...
```

## Development Workflow

```bash
npm install
psql $DATABASE_URL -f schema.sql
npm run dev   # nodemon
```

## Conventions

1. Route files in `src/routes/` — one file per resource.
2. Use `bcryptjs` (not `bcrypt`) — pure-JS, no native bindings.
3. Both AI clients (Anthropic + OpenAI) are available; use Claude for text generation, OpenAI for image generation.
4. Frontend is a PWA in `public/` — no build step.
