# GrupoFinanzas — Finanzas Personales Web

![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript) ![MUI](https://img.shields.io/badge/UI-Material%20UI%20v6-007FFF?logo=mui) ![Prisma](https://img.shields.io/badge/ORM-Prisma-2D3748?logo=prisma) ![Postgres](https://img.shields.io/badge/DB-Neon%20Postgres-336791?logo=postgresql)

App para grupos de personas (parejas, roommates, familias, amigos) que comparten gastos: registra ingresos y gastos, propone compras con sistema de votación/aprobación, define metas de ahorro grupales y avisa automáticamente cuando algo se sale de rango.

## Qué resuelve

Llevar cuentas compartidas a mano (o en un Excel que nadie actualiza) genera peleas y desconfianza. GrupoFinanzas centraliza gastos, calcula automáticamente quién le debe a quién, y convierte cualquier compra grande en una propuesta que el grupo aprueba por mayoría o unanimidad antes de gastar.

## Monorepo

```
apps/
├── web/      # Next.js + MUI — app principal, funcional (foco de este repo)
├── api/      # Express + Prisma — backend original para el cliente móvil
└── mobile/   # Expo (React Native) — cliente móvil original
```

`apps/web` es una aplicación Next.js **autocontenida**: tiene su propio Prisma Client y sus propias API routes que leen/escriben directo en la misma base Neon, sin pasar por `apps/api`. `apps/api` + `apps/mobile` son el par backend/cliente móvil original (Express + Expo) con el que arrancó el proyecto.

## Features (apps/web)

- **Grupos**: crear, unirse con código de invitación, elegir grupo activo, configuración (modo de aprobación mayoría/unánime, umbral de gasto "personal").
- **Gastos**: registrar gastos compartidos o individuales por categoría, con división entre miembros (`splitBetween`).
- **Gastos recurrentes**: definir gastos que se repiten y aplicarlos automáticamente al mes.
- **Balance**: cálculo automático de quién le debe a quién, con algoritmo de simplificación de deudas (minimiza transacciones).
- **Propuestas y votación**: cualquier compra por sobre el umbral del grupo pasa a votación (mayoría o unanimidad); bajo el umbral queda como aviso personal.
- **Presupuestos** por categoría y mes, con alertas al acercarse o superar el límite.
- **Metas de ahorro** grupales con aportes y progreso.
- **Alertas automáticas**: presupuesto en 80%/100%, gasto mensual subió o bajó fuerte, saldo disponible bajo, propuesta sin votar hace +24h, meta en riesgo o cumplida.
- **Panel de administración** (`/users`) para gestión de usuarios.
- **Métricas** del grupo (`/metrics`) y seguimiento de uso vía [iasmPulse](https://github.com/IvanSolis2003/iasmPulse).

## Stack

| | `apps/web` | `apps/api` + `apps/mobile` |
|---|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + MUI v6 | Expo (React Native) + React Native Paper |
| Backend | API routes de Next.js | Express + TypeScript |
| Datos | Prisma directo sobre Neon Postgres | Prisma sobre la misma base Neon |
| Estado/datos | TanStack React Query + Zustand | TanStack React Query + Zustand |
| Auth | JWT propio en cookie httpOnly (`jose`) | JWT (access + refresh) vía SecureStore |
| Validación | Zod | Zod |

Todos los montos se manejan en **CLP enteros** (sin decimales).

## Modelo de datos

`User`, `Group` (código de invitación, modo de aprobación, umbral personal), `GroupMember` (sueldo mensual, visibilidad, rol), `Expense` / `RecurringExpense`, `Proposal` + `ProposalVote`, `Budget`, `SavingGoal` + `GoalVote` + `GoalContribution`, `Alert`. Ver [apps/web/prisma/schema.prisma](apps/web/prisma/schema.prisma).

## Puesta en marcha (apps/web)

```bash
npm install               # instala todos los workspaces
npm run web                # atajo del root: npm run dev --workspace=apps/web
```

O directamente dentro de `apps/web`:

```bash
cd apps/web
cp .env.example .env.local
npx prisma generate
npx prisma db push
node --env-file=.env.local prisma/seed.mjs
npm run dev
```

## Variables de entorno (apps/web)

```env
DATABASE_URL="postgresql://...pooler.../db?sslmode=require"   # Neon, connection pooling
JWT_SECRET="genera con: openssl rand -base64 32"
```

## Scripts útiles (root)

```bash
npm run web      # levanta apps/web
npm run api      # levanta apps/api (Express)
npm run mobile   # levanta apps/mobile (Expo)
```

## Estado del proyecto

`apps/web` es la versión activa y funcional del producto. `apps/api` y `apps/mobile` corresponden a la implementación móvil original (arquitectura documentada en `CLAUDE.md`); el backend Express se evaluó reutilizar para la web pero, en la práctica, `apps/web` terminó con su propio Prisma Client sobre la misma base de datos en vez de consumir `apps/api` (ver `INVESTIGACION-VERSION-WEB-RESULTADO.md` para el análisis completo de esa decisión).

## Autor

**Iván Solís Manqueo** — Full Stack Developer, Talca, Chile
[iasmtech.com](https://iasmtech.com) · [ivan.solis20.m@gmail.com](mailto:ivan.solis20.m@gmail.com)
