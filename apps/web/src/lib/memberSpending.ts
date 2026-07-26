// Atribuye el gasto a cada miembro:
// - Gasto INDIVIDUAL → se atribuye a quien lo pagó (su gasto propio).
// - Gasto COMPARTIDO → se reparte en partes iguales entre splitBetween.
// Devuelve el total por miembro y el desglose por categoría (para presupuestos
// individuales).

export interface ExpenseForAttribution {
  amount: number;
  category: string;
  type: 'SHARED' | 'INDIVIDUAL';
  splitBetween: string[];
  paidById: string;
}

export interface Attribution {
  total: Record<string, number>;
  byCategory: Record<string, Record<string, number>>; // userId -> categoría -> monto
}

export function attributeSpending(
  expenses: ExpenseForAttribution[],
  memberIds: string[],
): Attribution {
  const total: Record<string, number> = {};
  const byCategory: Record<string, Record<string, number>> = {};
  for (const id of memberIds) {
    total[id] = 0;
    byCategory[id] = {};
  }

  const add = (userId: string, category: string, amount: number) => {
    if (!(userId in total)) {
      total[userId] = 0;
      byCategory[userId] = {};
    }
    total[userId] += amount;
    byCategory[userId][category] = (byCategory[userId][category] ?? 0) + amount;
  };

  for (const e of expenses) {
    if (e.type === 'INDIVIDUAL') {
      add(e.paidById, e.category, e.amount);
    } else {
      const parts = e.splitBetween.length || 1;
      const share = Math.round(e.amount / parts);
      for (const id of e.splitBetween) add(id, e.category, share);
    }
  }

  return { total, byCategory };
}
