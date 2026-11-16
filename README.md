# Reservas de salas

Sistema mínimo para reservar salas de reunión sin solapamientos (prueba técnica fullstack).

> En construcción: por ahora solo está el esqueleto del monorepo.

## Stack

- **Monorepo:** pnpm workspaces (`apps/*`)
- **API (`apps/api`):** NestJS 12 sobre Express, TypeORM + PostgreSQL 17, class-validator / class-transformer, Swagger
- **Web (`apps/web`):** React 19 + TypeScript (Vite), Tailwind CSS 4, Vitest + Testing Library

## Requisitos

- Node 22+
- pnpm (`corepack enable`)
- Docker

## Arranque

```bash
cp .env.example .env
pnpm install
pnpm db:up        # Postgres en Docker; datos en ./data_postgres
pnpm dev:api      # http://localhost:3000/api  ·  Swagger: http://localhost:3000/docs
pnpm dev:web      # http://localhost:5173
```

## Tests

```bash
pnpm test                               # unitarios de api y web
pnpm --filter @reservas/api test:e2e    # e2e de la API (requiere pnpm db:up)
```

## Decisiones técnicas

Pendiente: se resumirán aquí a partir de los ADR.
