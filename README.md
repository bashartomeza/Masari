# Masari

Masari is a Palestine-focused smart route-sharing logistics MVP.

Current implementation scope: M1 Foundation + Demo Reset only.

## Setup

1. Copy `apps/api/.env.example` to `apps/api/.env`.
2. Set `DATABASE_URL`, `JWT_SECRET`, and `DEMO_RESET_KEY`.
3. Install dependencies:

```bash
npm install
```

4. Validate Prisma schema:

```bash
npm run prisma:validate
```

5. Push schema to PostgreSQL:

```bash
npm run db:push
```

6. Start the API:

```bash
npm run dev:api
```

7. Reset deterministic demo data:

```bash
curl -X POST http://localhost:3000/api/v1/demo/reset -H "x-demo-reset-key: <DEMO_RESET_KEY>"
```
