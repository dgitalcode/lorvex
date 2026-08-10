# LORVEX

Maison d'e-commerce horloger de luxe pour le Maroc.

## Stack

Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 · PostgreSQL · Auth.js · Framer Motion · Zod

## Quick start

```bash
docker compose up -d
cp .env.example .env
# DATABASE_URL uses port 5433 by default
npx prisma db push
npx tsx prisma/seed.ts
npm run dev
```

- Storefront: http://localhost:3000/fr
- Admin: http://localhost:3000/admin
- Admin login: `admin@lorvex.ma` / `LorvexAdmin2026!`
- Client login: `client@lorvex.ma` / `LorvexClient2026!`

## Docs

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for clean architecture, Prisma domains, component system, admin model, and the phased roadmap.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Push Prisma schema |
| `npm run db:seed` | Seed luxury catalog |

## Locales

`fr` · `en` · `ar` (RTL)
