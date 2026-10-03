# Community Member Shelves

Web (Next.js) + API (Express + Postgres) for book-club member-owned curated shelves.

## Prerequisites

Shared Postgres (see `D:\DEVELOPMENT\shared`):

```bash
cd D:/DEVELOPMENT/shared
docker compose up -d
```

## Quick start

### API

```bash
cd api
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:4000`. Database: `postgresql://dev:dev@localhost:5433/community_member_shelves`.

Seeded admin: `admin@club.local` / `password123`.

When you approve a member, the temporary password is printed in the API console. See [docs/smtp-setup.md](docs/smtp-setup.md) for real SMTP later.

### Web

```bash
cd web
cp .env.local.example .env.local
npm install
npm run dev
```

- Public landing: `http://localhost:3000`
- Login: `/auth/v1/login`
- Register: `/auth/v1/register`

## Product flow

1. Anyone registers → status `pending`
2. Admin approves at **Dashboard → Members** → temp password to console
3. Member logs in → **change password** → propose shelf
4. Admin reviews proposals (can change category) → accept
5. Landing shows accepted shelves (filter by category) + events
6. Join event requires approved account
7. Borrowing is offline; admin marks books borrowed/returned on the shelf

## Tests

```bash
cd api && npm test
```
