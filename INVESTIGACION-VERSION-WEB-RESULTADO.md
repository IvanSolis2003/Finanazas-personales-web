# Resultado de Investigación: Migración a Versión Web (Next.js + MUI + Neon)

> Análisis del proyecto **GrupoFinanzas** (React Native/Expo) realizado sobre el código real del repositorio. Responde punto por punto el documento `INVESTIGACION-VERSION-WEB.md`. **No se ha escrito código de la versión web.**

---

## 1. Resumen ejecutivo

El proyecto **ya tiene una arquitectura ideal para una versión web**: es un **monorepo** con un **backend Express + Prisma + PostgreSQL totalmente separado** del cliente móvil. La web NO necesita reescribir lógica de servidor ni base de datos: **puede consumir el mismo backend tal cual existe hoy.**

- **Lo que se reutiliza tal cual (~backend completo):** API Express, schema Prisma, motor de alertas, cálculo de balance, auth JWT, validaciones Zod.
- **Lo que se adapta (lógica de cliente):** hooks de React Query, stores de Zustand, servicio `api` → cambiar solo el almacenamiento del token (SecureStore → cookie/localStorage).
- **Lo que se reescribe (solo la capa visual):** las ~15 pantallas hechas con **React Native Paper** → reconstruir en **MUI**. Es lo único realmente nuevo, y son pantallas simples.

**Veredicto:** no es una reescritura, es un **frontend web nuevo sobre un backend ya existente y funcional.**

---

## 2. Respuestas a las preguntas de investigación

### 2.1 Arquitectura general

| Pregunta | Respuesta | Evidencia |
|---|---|---|
| ¿Monorepo o carpeta única? | **Monorepo** con npm workspaces | `package.json` raíz → `"workspaces": ["apps/api", "apps/mobile"]` |
| ¿Backend separado o lógica embebida? | **Backend propio separado**, no hay SDK de DB en el cliente | `apps/api/` (Express) vs `apps/mobile/` (Expo); el móvil solo hace `fetch` en `apps/mobile/services/api.ts` |
| ¿Stack del backend? | **Node + Express + TypeScript**, ORM **Prisma** | `apps/api/src/app.ts`, `apps/api/src/prisma/schema.prisma` |
| ¿Dónde está desplegado? | **Railway** (actualmente CAÍDO, ver riesgos) | `railway.toml`; `EXPO_PUBLIC_API_URL=https://grupofinanzas-production.up.railway.app` |
| ¿Motor de base de datos y hosting? | **PostgreSQL en Neon** | `schema.prisma` → `provider = "postgresql"`; commit `b67d5f0` menciona `directUrl` para el pooling de Neon |

**Punto a favor de la migración:** el destino de DB pedido (Neon) **ya es la base de datos actual.** No hay migración de motor.

### 2.2 Modelo de datos

Schema Prisma completo en `apps/api/src/prisma/schema.prisma`. **10 modelos + 6 enums.** Todos los montos son **enteros en CLP** (sin decimales).

**Entidades y relaciones:**
- `User` (id, name, email, passwordHash, pushToken) — 1:N con memberships, gastos pagados, propuestas, votos.
- `Group` (name, inviteCode único, `approvalMode`, `personalThreshold`) — raíz de todo; 1:N con members, expenses, proposals, budgets, goals, alerts.
- `GroupMember` (join User↔Group; `monthlySalary`, `salaryVisible`, `role`) — único por `[userId, groupId]`. **⚠️ Los "ingresos" NO son una tabla propia: son el campo `monthlySalary` en la membresía.**
- `Expense` (amount, category, `type` SHARED/INDIVIDUAL, `splitBetween: String[]`, paidBy).
- `Proposal` (amount, category, `isPersonal`, `status`) — 1:N con `ProposalVote` (único por `[proposalId, userId]`, voto APPROVE/REJECT/POSTPONE).
- `Budget` (presupuesto por `[groupId, category, month, year]`).
- `SavingGoal` (targetAmount, savedAmount, targetDate).
- `Alert` (type, message, isRead) — generada por el motor de alertas.
- Enums: `MemberRole`, `ApprovalMode`, `ExpenseType`, `ProposalStatus`, `VoteType`, `AlertType` (8 tipos), `ExpenseCategory` (9 categorías).

**¿Documentado?** Sí, el schema está replicado y explicado en `CLAUDE.md`. El schema real coincide con la documentación.

### 2.3 Lógica de negocio

**Está en el servidor y es reutilizable.** Ubicaciones:

- **Cálculo de balance** → `apps/api/src/services/balanceCalc.ts`. **Funciones PURAS** (`calculateBalance`, `simplifyDebts`), sin dependencias de React Native ni de Express — solo importan el tipo `Expense` de Prisma. **Copiables verbatim a cualquier entorno Node/Next.js.**
- **Reglas de aprobación de propuestas** → `apps/api/src/controllers/proposals.controller.ts`. Lógica de mayoría/unanimidad, propuesta personal, rechazo inmediato. Vive en el controlador (mezclada con acceso a DB), pero es lógica de servidor → se reutiliza al mantener el backend.
- **Umbral de compra** (`personalThreshold`) → en `createProposal`: `isPersonal = amount <= group.personalThreshold`.
- **Motor de alertas** → `apps/api/src/services/alertEngine.ts` (con `node-cron`).

**Validaciones:** **Zod** (usado en 8 archivos). Hay un middleware genérico `apps/api/src/middlewares/validate.ts` y esquemas inline en los controladores (ej. `registerSchema`, `proposalSchema`). **Los esquemas Zod son 100% reutilizables en el frontend web** para validar formularios (mismo paquete en Next.js).

### 2.4 Autenticación y sesión

- **Mecanismo:** **JWT propio** — access token (15 min) + refresh token (7 días), firma con `jsonwebtoken`, hash de contraseñas con **bcryptjs**. Ver `apps/api/src/controllers/auth.controller.ts` y `apps/api/src/middlewares/auth.ts`.
- **NO depende de ningún SDK móvil.** El servidor es agnóstico: recibe `Authorization: Bearer <token>`.
- **Único punto de adaptación:** el **almacenamiento del token en el cliente.**
  - Móvil: `expo-secure-store` (`apps/mobile/store/authStore.ts`, `services/api.ts`).
  - Web: reemplazar por **cookie httpOnly** (recomendado, más seguro contra XSS) o `localStorage`. La lógica de login/refresh/logout no cambia.

**Reutilizable desde web: SÍ, casi al 100%.**

### 2.5 Estructura de pantallas → rutas Next.js

Rutas actuales con **expo-router** (`apps/mobile/app/`). ⚠️ Las carpetas `apps/mobile/components/*` están **vacías**: toda la UI vive en los archivos de pantalla.

| Pantalla móvil (expo-router) | Descripción | Ruta Next.js (App Router) propuesta |
|---|---|---|
| `app/index.tsx` | Redirect según sesión | `app/page.tsx` (redirect) |
| `app/(auth)/login.tsx` | Iniciar sesión | `app/(auth)/login/page.tsx` |
| `app/(auth)/register.tsx` | Registro | `app/(auth)/register/page.tsx` |
| `app/(auth)/join-group.tsx` | Unirse con código | `app/(auth)/join-group/page.tsx` |
| `app/select-group.tsx` | Elegir grupo activo | `app/select-group/page.tsx` |
| `app/create-group.tsx` | Crear grupo | `app/create-group/page.tsx` |
| `app/(tabs)/dashboard.tsx` | Balance/disponible/alertas | `app/(app)/dashboard/page.tsx` |
| `app/(tabs)/expenses.tsx` | Lista + alta de gastos | `app/(app)/expenses/page.tsx` |
| `app/(tabs)/proposals.tsx` | Propuestas | `app/(app)/proposals/page.tsx` |
| `app/(tabs)/goals.tsx` | Metas de ahorro | `app/(app)/goals/page.tsx` |
| `app/balance.tsx` | Quién le debe a quién | `app/(app)/balance/page.tsx` |
| `app/proposal-detail.tsx` | Detalle/votación | `app/(app)/proposals/[id]/page.tsx` |
| `app/group-settings.tsx` | Config del grupo | `app/(app)/settings/page.tsx` |
| `app/profile.tsx` | Perfil / sueldo | `app/(app)/profile/page.tsx` |

Los **tabs** (`(tabs)`) se convierten en un **layout con navegación lateral/superior** en web (`app/(app)/layout.tsx`).

**Pantallas que dependen de APIs nativas:** ninguna pantalla depende de cámara/biometría. La única dependencia nativa transversal es **notificaciones push** (`expo-notifications`) y **almacenamiento seguro** (`expo-secure-store`), no ligadas a una pantalla concreta.

### 2.6 Dependencias clave y equivalentes web

De `apps/mobile/package.json`:

| Librería | Rol | En web |
|---|---|---|
| `@tanstack/react-query` | Fetching/caché | ✅ **Idéntica**, funciona en Next.js |
| `zustand` | Estado global | ✅ **Idéntica** |
| `date-fns` | Fechas | ✅ **Idéntica** |
| `zod` (en API) | Validación | ✅ **Idéntica**, reutilizable en forms web |
| `react-native-paper` | UI | ❌ **Reemplazar por MUI** |
| `expo-router` | Navegación | 🔄 Reemplazar por **Next.js App Router** |
| `expo-secure-store` | Token storage | 🔄 Reemplazar por **cookie httpOnly / localStorage** |
| `expo-notifications` | Push | 🔄 Reemplazar por **Web Push API** o descartar en v1 web |
| `@react-native-async-storage/async-storage` | Storage | 🔄 `localStorage` / cookies |
| `react-native-screens`, `-safe-area-context`, `-gesture-handler`, `expo-status-bar`, `expo-splash-screen`, `expo-device`, `expo-constants`, `expo-font` | Runtime nativo Expo | ❌ No aplican en web (los cubre el navegador/Next) |

**Estado/datos/fechas/validación → portables. UI/navegación/storage/push → adaptar.**

### 2.7 Riesgos y bloqueadores

1. **🔴 Backend caído (bloqueador operativo inmediato).** `grupofinanzas-production.up.railway.app` responde `"Application not found"` (404 del borde de Railway → sin deploy activo). **Nada funciona (móvil ni web) hasta reactivarlo.** No es un problema de código.
2. **🟡 Notificaciones push.** El envío server-side usa la API de Expo Push (`apps/api/src/services/pushNotifications.ts`), atada a tokens `ExponentPushToken[...]` de dispositivos. En web hay que usar **Web Push (VAPID)** o **omitir push en la v1 web** (las alertas ya se ven en el dashboard vía API, así que no es bloqueante).
3. **🟡 Almacenamiento de sesión.** SecureStore no existe en web → decidir cookie httpOnly (recomendado) vs localStorage. Afecta a `authStore` y al servicio `api`.
4. **🟢 Datos en producción.** El destino (Neon) **ya es la DB actual** → **no hay migración de datos**. Si el deploy está caído pero la DB Neon persiste, los usuarios/datos siguen ahí. Conviene confirmar que la instancia Neon sigue viva y no expiró.
5. **🟢 CORS.** El backend hoy usa `cors()` abierto (`app.ts`). Para web conviene restringir a los dominios permitidos.
6. **🟡 Refresh token en el cliente web.** El móvil guarda `refreshToken` en SecureStore; en web, si se usa cookie httpOnly, el flujo de refresh debe rediseñarse (idealmente refresh en cookie httpOnly + endpoint que la lee).

---

## 3. Recomendación

**Construir un frontend Next.js (App Router) + MUI que consuma el backend Express existente, sin tocar el servidor salvo ajustes menores (CORS + endpoint de refresh por cookie).**

Justificación: el backend ya está separado, probado y desplegable; reescribirlo o moverlo a API routes de Next sería trabajo sin retorno. La única capa nueva real es la UI en MUI.

| Componente | Acción | Motivo |
|---|---|---|
| Backend Express + Prisma | **Reutilizar tal cual** | Ya separado y funcional; Neon ya es el destino |
| `balanceCalc.ts`, esquemas Zod | **Reutilizar (copiar)** | Puras/portables |
| Hooks React Query, stores Zustand | **Adaptar** | Cambiar solo el token storage |
| Servicio `api` | **Reescribir ligero** | fetch + cookies en vez de SecureStore |
| Pantallas (UI) | **Reescribir en MUI** | RN Paper no existe en web; son pantallas simples |
| Push notifications | **Diferir / Web Push** | No bloqueante para v1 |

### Plan de migración por fases

- **Fase 0 — Reactivar backend.** Redeploy en Railway (o mover a otro host) + confirmar que Neon vive. Sin esto no se prueba nada.
- **Fase 1 — Scaffold web.** `apps/web` con Next.js (App Router) + MUI + React Query + Zustand dentro del monorepo. Configurar `NEXT_PUBLIC_API_URL`.
- **Fase 2 — Auth web.** Login/register/refresh con cookies httpOnly; ajustar CORS en el backend; portar `authStore`.
- **Fase 3 — Grupos.** Select-group, create-group, join-group (reutiliza endpoints `/api/groups`).
- **Fase 4 — Núcleo financiero.** Dashboard (summary), gastos (CRUD), balance (reutiliza `balanceCalc`).
- **Fase 5 — Propuestas + votación** y **metas de ahorro**.
- **Fase 6 — Presupuestos y visualización de alertas** (sin push).
- **Fase 7 (opcional) — Web Push** con VAPID si se quiere paridad de notificaciones.

**Regla:** una página web por cada pantalla móvil, respetando el mismo flujo. No escribir código web hasta aprobar este plan (ya cumplido: esto es solo análisis).

---

_Documento generado a partir del análisis del código en `apps/api` y `apps/mobile`._
