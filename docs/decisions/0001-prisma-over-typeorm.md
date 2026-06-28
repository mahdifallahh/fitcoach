# ADR 0001 — Prisma over TypeORM

**Status:** Accepted

## Context
The brief allows TypeORM but expresses a preference for Prisma "unless there is a strong reason otherwise,"
and asks for a brief justification.

## Decision
Use **Prisma** as the ORM/data layer for the NestJS backend with PostgreSQL.

## Rationale
- **Type safety:** Prisma Client generates fully-typed query methods from the schema, eliminating a class of
  runtime errors that TypeORM's repository/decorator approach can miss.
- **Migrations:** `prisma migrate` produces reviewable SQL migrations with a clear dev/deploy split —
  smoother than TypeORM's migration generation, which often needs hand-fixing.
- **Single source of truth:** one declarative `schema.prisma` drives the client, migrations, and docs.
- **DX:** Prisma Studio, clear relation syntax, and excellent autocomplete speed up the large surface area
  of this project (programs ↔ days ↔ exercises ↔ supersets).

## Consequences
- Complex/raw queries use `prisma.$queryRaw` when needed (rare here).
- A thin repository wrapper is used only where a query is reused widely; otherwise services call
  `PrismaService` directly.
