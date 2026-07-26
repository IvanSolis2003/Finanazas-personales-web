'use client';

import { create } from 'zustand';

const now = new Date();

interface MonthState {
  month: number; // 1-12
  year: number;
  prev: () => void;
  next: () => void;
  reset: () => void;
}

// Mes seleccionado para filtrar dashboard, gastos y presupuestos.
export const useMonthStore = create<MonthState>((set) => ({
  month: now.getMonth() + 1,
  year: now.getFullYear(),
  prev: () =>
    set((s) => {
      const d = new Date(s.year, s.month - 2, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }),
  next: () =>
    set((s) => {
      const d = new Date(s.year, s.month, 1);
      return { month: d.getMonth() + 1, year: d.getFullYear() };
    }),
  reset: () => set({ month: new Date().getMonth() + 1, year: new Date().getFullYear() }),
}));

export const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
