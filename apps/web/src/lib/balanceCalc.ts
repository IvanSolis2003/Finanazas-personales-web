// Funciones puras de cálculo de balance — reutilizadas VERBATIM desde el
// backend Express (apps/api/src/services/balanceCalc.ts). Sin dependencias de
// framework: sirven igual en Node, Next.js API Routes o Server Actions.

export type BalanceMap = Record<string, number>;

export interface Transaction {
  from: string;
  to: string;
  amount: number;
}

/** Tipo mínimo de gasto que necesita el cálculo (subset del modelo Prisma). */
export interface ExpenseForBalance {
  amount: number;
  type: 'SHARED' | 'INDIVIDUAL';
  splitBetween: string[];
  paidById: string;
}

/**
 * Calcula cuánto debe o se le debe a cada userId.
 * Positivo → le deben dinero. Negativo → debe dinero.
 */
export function calculateBalance(expenses: ExpenseForBalance[]): BalanceMap {
  const balance: BalanceMap = {};

  for (const expense of expenses) {
    if (expense.type !== 'SHARED' || expense.splitBetween.length === 0) continue;

    const share = Math.round(expense.amount / expense.splitBetween.length);

    for (const memberId of expense.splitBetween) {
      if (!(memberId in balance)) balance[memberId] = 0;
      if (!(expense.paidById in balance)) balance[expense.paidById] = 0;

      if (memberId !== expense.paidById) {
        balance[expense.paidById] += share;
        balance[memberId] -= share;
      }
    }
  }

  return balance;
}

/**
 * Algoritmo greedy para minimizar la cantidad de transacciones necesarias
 * para saldar todas las deudas.
 */
export function simplifyDebts(balance: BalanceMap): Transaction[] {
  const transactions: Transaction[] = [];

  const creditors: { id: string; amount: number }[] = [];
  const debtors: { id: string; amount: number }[] = [];

  for (const [id, amount] of Object.entries(balance)) {
    if (amount > 0) creditors.push({ id, amount });
    else if (amount < 0) debtors.push({ id, amount: -amount });
  }

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const transfer = Math.min(creditor.amount, debtor.amount);

    transactions.push({ from: debtor.id, to: creditor.id, amount: transfer });

    creditor.amount -= transfer;
    debtor.amount -= transfer;

    if (creditor.amount === 0) i++;
    if (debtor.amount === 0) j++;
  }

  return transactions;
}
