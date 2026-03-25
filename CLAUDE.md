# CLAUDE.md — GrupoFinanzas

## Descripción del Proyecto

**GrupoFinanzas** es una aplicación móvil para grupos de personas (parejas, roommates, familias, amigos) que comparten gastos. Permite registrar ingresos individuales, gastos comunes e individuales, proponer compras con sistema de aprobación, definir metas de ahorro grupales y recibir alertas automáticas basadas en reglas fijas.

---

## Stack Técnico

### Frontend
- React Native con Expo SDK 55
- TypeScript
- React Navigation v6 (Stack + Bottom Tabs)
- React Native Paper (componentes UI)
- Expo Push Notifications
- Zustand (estado global)
- React Query (fetching y caché)
- date-fns (manejo de fechas)

### Backend
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL (Railway)
- JWT con refresh token (autenticación)
- Zod (validación de datos)
- node-cron (evaluación periódica de alertas)

### Infraestructura
- Backend deploy: Railway
- Frontend dev: Expo Go
- Frontend producción: EAS Build (Expo Application Services)
- DB: PostgreSQL en Railway

---

## Estructura de Carpetas

```
grupofinanzas/
├── apps/
│   └── mobile/                        # Expo app
│       ├── app/
│       │   ├── (auth)/                # Login, Register, JoinGroup
│       │   ├── (tabs)/                # Dashboard, Gastos, Propuestas, Metas
│       │   └── _layout.tsx
│       ├── components/
│       │   ├── ui/                    # Button, Card, Badge, etc.
│       │   ├── expenses/              # ExpenseItem, ExpenseForm
│       │   ├── proposals/             # ProposalCard, VoteButtons
│       │   ├── goals/                 # GoalProgress, GoalCard
│       │   └── alerts/                # AlertBanner, AlertList
│       ├── hooks/                     # useGroup, useExpenses, useAlerts
│       ├── store/                     # Zustand stores
│       ├── services/                  # API calls
│       └── utils/                     # formatCurrency, calcBalance, etc.
│
└── apps/
    └── api/                           # Express API
        ├── src/
        │   ├── routes/
        │   │   ├── auth.ts
        │   │   ├── groups.ts
        │   │   ├── expenses.ts
        │   │   ├── proposals.ts
        │   │   ├── goals.ts
        │   │   ├── budgets.ts
        │   │   └── alerts.ts
        │   ├── controllers/
        │   ├── services/
        │   │   ├── alertEngine.ts     # Motor de reglas fijas
        │   │   └── balanceCalc.ts     # Cálculo de quién debe a quién
        │   ├── middlewares/
        │   │   ├── auth.ts
        │   │   └── validate.ts
        │   ├── prisma/
        │   │   └── schema.prisma
        │   └── app.ts
        └── package.json
```

---

## Modelo de Datos (Prisma Schema)

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  email         String   @unique
  passwordHash  String
  pushToken     String?
  createdAt     DateTime @default(now())

  memberships   GroupMember[]
  expensesPaid  Expense[]
  proposalsMade Proposal[]
  votes         ProposalVote[]
}

model Group {
  id              String   @id @default(cuid())
  name            String
  inviteCode      String   @unique
  approvalMode    ApprovalMode @default(MAJORITY)  // MAJORITY | UNANIMOUS
  personalThreshold Int    @default(50000)          // monto en CLP
  createdAt       DateTime @default(now())

  members         GroupMember[]
  expenses        Expense[]
  proposals       Proposal[]
  budgets         Budget[]
  goals           SavingGoal[]
  alerts          Alert[]
}

model GroupMember {
  id          String   @id @default(cuid())
  userId      String
  groupId     String
  monthlySalary Int    @default(0)
  salaryVisible Boolean @default(true)  // si otros miembros pueden ver su sueldo
  role        MemberRole @default(MEMBER)  // ADMIN | MEMBER
  joinedAt    DateTime @default(now())

  user        User     @relation(fields: [userId], references: [id])
  group       Group    @relation(fields: [groupId], references: [id])

  @@unique([userId, groupId])
}

model Expense {
  id          String   @id @default(cuid())
  groupId     String
  paidById    String
  description String
  amount      Int                        // en CLP, sin decimales
  category    ExpenseCategory
  type        ExpenseType                // SHARED | INDIVIDUAL
  splitBetween String[]                  // array de userId (para gastos compartidos)
  date        DateTime @default(now())
  createdAt   DateTime @default(now())

  group       Group    @relation(fields: [groupId], references: [id])
  paidBy      User     @relation(fields: [paidById], references: [id])
}

model Proposal {
  id              String   @id @default(cuid())
  groupId         String
  proposedById    String
  title           String
  description     String?
  amount          Int
  category        ExpenseCategory
  isPersonal      Boolean  @default(false)
  status          ProposalStatus @default(PENDING)
  createdAt       DateTime @default(now())
  resolvedAt      DateTime?

  group           Group    @relation(fields: [groupId], references: [id])
  proposedBy      User     @relation(fields: [proposedById], references: [id])
  votes           ProposalVote[]
}

model ProposalVote {
  id          String   @id @default(cuid())
  proposalId  String
  userId      String
  vote        VoteType               // APPROVE | REJECT | POSTPONE
  createdAt   DateTime @default(now())

  proposal    Proposal @relation(fields: [proposalId], references: [id])
  user        User     @relation(fields: [userId], references: [id])

  @@unique([proposalId, userId])
}

model Budget {
  id          String   @id @default(cuid())
  groupId     String
  category    ExpenseCategory
  monthlyLimit Int
  month       Int                        // 1-12
  year        Int

  group       Group    @relation(fields: [groupId], references: [id])

  @@unique([groupId, category, month, year])
}

model SavingGoal {
  id          String   @id @default(cuid())
  groupId     String
  name        String
  targetAmount Int
  savedAmount  Int     @default(0)
  targetDate  DateTime
  createdAt   DateTime @default(now())

  group       Group    @relation(fields: [groupId], references: [id])
}

model Alert {
  id          String   @id @default(cuid())
  groupId     String
  type        AlertType
  message     String
  isRead      Boolean  @default(false)
  createdAt   DateTime @default(now())

  group       Group    @relation(fields: [groupId], references: [id])
}

// Enums
enum MemberRole      { ADMIN MEMBER }
enum ApprovalMode    { MAJORITY UNANIMOUS }
enum ExpenseType     { SHARED INDIVIDUAL }
enum ProposalStatus  { PENDING APPROVED REJECTED POSTPONED }
enum VoteType        { APPROVE REJECT POSTPONE }
enum AlertType       {
  BUDGET_WARNING       // categoría al 80%
  BUDGET_EXCEEDED      // categoría superada
  SPENDING_INCREASE    // gasto subió >20% vs mes anterior
  SPENDING_DECREASE    // gasto bajó >15% vs mes anterior (positivo)
  LOW_BALANCE          // disponible bajo umbral
  PROPOSAL_PENDING     // propuesta sin respuesta >24hrs
  GOAL_AT_RISK         // ritmo de ahorro no alcanza la meta
  GOAL_ACHIEVED        // meta completada
}
enum ExpenseCategory {
  HOUSING
  FOOD
  TRANSPORT
  HEALTH
  RECREATION
  CLOTHING
  EDUCATION
  SERVICES      // luz, agua, internet
  OTHER
}
```

---

## Motor de Alertas (alertEngine.ts)

El motor se ejecuta con `node-cron` cada día a las 20:00 y evalúa todas las reglas para cada grupo activo.

```typescript
// Reglas implementadas:

// 1. BUDGET_WARNING
// Si gastos en categoría >= 80% del presupuesto mensual → alerta amarilla

// 2. BUDGET_EXCEEDED
// Si gastos en categoría >= 100% del presupuesto mensual → alerta roja

// 3. SPENDING_INCREASE
// Si gasto total del mes actual > mes anterior en >20% → alerta informativa

// 4. SPENDING_DECREASE
// Si gasto total del mes actual < mes anterior en >15% → alerta positiva 🎉

// 5. LOW_BALANCE
// Si (ingresos totales - gastos totales del mes) < umbral configurado → alerta roja

// 6. PROPOSAL_PENDING
// Si hay propuestas con status PENDING y createdAt > 24hrs → notificación push a los miembros que no han votado

// 7. GOAL_AT_RISK
// Si (savedAmount / targetAmount) < (diasTranscurridos / diasTotalesHastaFecha) → alerta

// 8. GOAL_ACHIEVED
// Si savedAmount >= targetAmount → notificación de celebración push a todo el grupo
```

---

## Cálculo de Balance (balanceCalc.ts)

```typescript
// Para cada gasto compartido:
// - Monto total / cantidad de miembros en splitBetween = cuota individual
// - Si paidBy !== miembro → ese miembro le debe al que pagó

// Resultado final por grupo:
// balance[userId] = suma de lo que pagó por otros - suma de lo que otros pagaron por él
// Positivo → le deben dinero
// Negativo → debe dinero

// Simplificación de deudas:
// Algoritmo greedy: el que más debe paga al que más se le debe
// Minimiza la cantidad de transacciones necesarias para saldar todo
```

---

## API Endpoints

```
AUTH
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

GROUPS
POST   /api/groups                        → crear grupo
GET    /api/groups/:id                    → detalle del grupo
POST   /api/groups/join                   → unirse con inviteCode
PATCH  /api/groups/:id                    → editar configuración
GET    /api/groups/:id/balance            → balance entre miembros
GET    /api/groups/:id/summary            → resumen del mes actual

MEMBERS
PATCH  /api/groups/:id/members/salary     → actualizar sueldo mensual
DELETE /api/groups/:id/members/:userId    → salir o remover del grupo

EXPENSES
GET    /api/groups/:id/expenses           → listar (con filtros mes/categoría)
POST   /api/groups/:id/expenses           → registrar gasto
DELETE /api/groups/:id/expenses/:expId    → eliminar gasto

PROPOSALS
GET    /api/groups/:id/proposals          → listar propuestas
POST   /api/groups/:id/proposals          → crear propuesta
POST   /api/groups/:id/proposals/:propId/vote → votar
PATCH  /api/groups/:id/proposals/:propId  → actualizar estado

BUDGETS
GET    /api/groups/:id/budgets            → ver presupuestos del mes
POST   /api/groups/:id/budgets            → crear/actualizar presupuesto

GOALS
GET    /api/groups/:id/goals              → listar metas
POST   /api/groups/:id/goals              → crear meta
PATCH  /api/groups/:id/goals/:goalId      → actualizar aporte

ALERTS
GET    /api/groups/:id/alerts             → listar alertas no leídas
PATCH  /api/groups/:id/alerts/read-all   → marcar todas como leídas
```

---

## Pantallas de la App

```
(auth)
├── LoginScreen
├── RegisterScreen
└── JoinGroupScreen         → ingresar código de invitación

(tabs)
├── DashboardScreen         → balance del mes, disponible, alertas recientes
├── ExpensesScreen          → lista de gastos + botón agregar
├── ProposalsScreen         → propuestas pendientes y resueltas
└── GoalsScreen             → metas de ahorro con progreso

(modals / stack)
├── AddExpenseModal
├── AddProposalModal
├── ProposalDetailScreen    → ver votos, aprobar/rechazar
├── BalanceDetailScreen     → quién le debe a quién
├── GroupSettingsScreen
└── ProfileScreen
```

---

## Lógica de Aprobación de Propuestas

```typescript
// isPersonal = true → solo el proponente aprueba (es un registro/aviso)
// isPersonal = false:
//   ApprovalMode.MAJORITY  → Math.floor(totalMembers / 2) + 1 votos APPROVE
//   ApprovalMode.UNANIMOUS → todos los miembros deben votar APPROVE

// Si alguien vota REJECT → propuesta pasa a REJECTED inmediatamente
// Si alguien vota POSTPONE → queda en PENDING, se reagenda (futuro)

// isPersonal se determina automáticamente:
// amount <= group.personalThreshold → isPersonal = true (sugerido, editable)
```

---

## Variables de Entorno

```env
# Backend (.env)
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
PORT=3000
NODE_ENV=development

# Mobile (.env)
EXPO_PUBLIC_API_URL=https://tu-backend.railway.app
```

---

## Orden de Construcción (Build Order)

1. Setup del proyecto (monorepo o dos repos separados)
2. Schema Prisma + migraciones
3. Auth (register, login, JWT)
4. Grupos (crear, invitar, unirse)
5. Miembros (sueldo, roles)
6. Gastos (CRUD + categorías)
7. Balance calculator
8. Presupuestos
9. Propuestas + sistema de votos
10. Metas de ahorro
11. Motor de alertas (cron)
12. Expo Push Notifications
13. Navegación completa de la app
14. Pantallas en orden del build order
15. Pruebas de flujo completo

---

## Nombre Sugerido para el Proyecto

- **GrupoFinanzas** (funcional, claro)
- **NosApp** (corto, para grupos/familia)
- **SplitHogar** (enfocado en convivencia)
- **CuentasApp** (simple y directo para LATAM)

---

## Notas para el Agente

- Todos los montos se manejan en **CLP enteros** (sin decimales). Multiplicar por 100 si se necesita precisión futura.
- El campo `splitBetween` en Expense es un array de userId. Si está vacío en gasto INDIVIDUAL, solo aplica al que pagó.
- El `inviteCode` del grupo se genera con `nanoid(8)` — 8 caracteres alfanuméricos.
- Las alertas no se repiten más de una vez cada 24 horas por tipo por grupo (campo `createdAt` para validar).
- Los sueldos son opcionales — el sistema funciona aunque no todos los miembros los ingresen.
