import { calculateBalance, simplifyDebts } from '../services/balanceCalc';
import { Expense, ExpenseCategory, ExpenseType } from '@prisma/client';

function makeExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: 'exp1',
    groupId: 'g1',
    paidById: 'u1',
    description: 'Test',
    amount: 30000,
    category: ExpenseCategory.FOOD,
    type: ExpenseType.SHARED,
    splitBetween: ['u1', 'u2', 'u3'],
    date: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

describe('calculateBalance', () => {
  it('retorna objeto vacío si no hay gastos', () => {
    expect(calculateBalance([])).toEqual({});
  });

  it('ignora gastos INDIVIDUAL', () => {
    const expense = makeExpense({ type: ExpenseType.INDIVIDUAL, splitBetween: [] });
    expect(calculateBalance([expense])).toEqual({});
  });

  it('ignora gastos SHARED sin splitBetween', () => {
    const expense = makeExpense({ splitBetween: [] });
    expect(calculateBalance([expense])).toEqual({});
  });

  it('calcula balance correcto para 3 personas con pago igualado', () => {
    // u1 paga $30.000 dividido entre u1, u2, u3 → cada uno debe $10.000
    // u1 ya pagó → u2 y u3 le deben $10.000 a u1
    const expense = makeExpense({ amount: 30000, splitBetween: ['u1', 'u2', 'u3'] });
    const balance = calculateBalance([expense]);

    expect(balance['u1']).toBe(20000);  // se le deben 2 x $10.000
    expect(balance['u2']).toBe(-10000); // debe $10.000
    expect(balance['u3']).toBe(-10000); // debe $10.000
  });

  it('calcula balance con múltiples gastos de distintos pagadores', () => {
    const exp1 = makeExpense({ id: 'e1', paidById: 'u1', amount: 20000, splitBetween: ['u1', 'u2'] });
    const exp2 = makeExpense({ id: 'e2', paidById: 'u2', amount: 20000, splitBetween: ['u1', 'u2'] });
    const balance = calculateBalance([exp1, exp2]);

    // u1 paga $20k → u2 le debe $10k
    // u2 paga $20k → u1 le debe $10k
    // Neto: ambos en 0
    expect(balance['u1']).toBe(0);
    expect(balance['u2']).toBe(0);
  });

  it('redondea correctamente cuando el monto no es divisible', () => {
    // $10.000 / 3 = $3.333 (redondeado)
    const expense = makeExpense({ amount: 10000, splitBetween: ['u1', 'u2', 'u3'] });
    const balance = calculateBalance([expense]);

    // u1 pagó: le deben 2 x round(10000/3) = 2 x 3333 = 6666
    expect(balance['u1']).toBe(6666);
    expect(balance['u2']).toBe(-3333);
    expect(balance['u3']).toBe(-3333);
  });
});

describe('simplifyDebts', () => {
  it('retorna vacío si no hay deudas', () => {
    expect(simplifyDebts({})).toEqual([]);
  });

  it('retorna vacío si todos en cero', () => {
    expect(simplifyDebts({ u1: 0, u2: 0 })).toEqual([]);
  });

  it('genera una transacción simple A → B', () => {
    const transactions = simplifyDebts({ u1: 10000, u2: -10000 });
    expect(transactions).toHaveLength(1);
    expect(transactions[0]).toEqual({ from: 'u2', to: 'u1', amount: 10000 });
  });

  it('minimiza transacciones con 3 deudores y 1 acreedor', () => {
    // u1 se le deben $30k, u2 debe $10k, u3 debe $10k, u4 debe $10k
    const transactions = simplifyDebts({ u1: 30000, u2: -10000, u3: -10000, u4: -10000 });
    expect(transactions).toHaveLength(3);
    transactions.forEach((t) => {
      expect(t.to).toBe('u1');
      expect(t.amount).toBe(10000);
    });
  });

  it('minimiza transacciones en caso cruzado', () => {
    // u1 se le debe $20k, u2 se le debe $10k, u3 debe $30k
    const transactions = simplifyDebts({ u1: 20000, u2: 10000, u3: -30000 });
    // u3 paga a u1 $20k y a u2 $10k = 2 transacciones
    expect(transactions).toHaveLength(2);
    const total = transactions.reduce((s, t) => s + t.amount, 0);
    expect(total).toBe(30000);
  });
});
