// Formateo de montos en CLP (enteros, sin decimales), igual que en el móvil.
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Formato compacto para gráficos (ej: $450k, $1.2M).
export function formatCompact(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `$${Math.round(n / 1000)}k`;
  return `$${n}`;
}

export const CATEGORY_LABELS: Record<string, string> = {
  HOUSING: 'Vivienda',
  FOOD: 'Comida',
  TRANSPORT: 'Transporte',
  HEALTH: 'Salud',
  RECREATION: 'Recreación',
  CLOTHING: 'Vestuario',
  EDUCATION: 'Educación',
  SERVICES: 'Servicios',
  OTHER: 'Otros',
};

export const ALERT_COLORS: Record<string, string> = {
  BUDGET_EXCEEDED: '#D32F2F',
  BUDGET_WARNING: '#F57C00',
  LOW_BALANCE: '#D32F2F',
  SPENDING_INCREASE: '#F57C00',
  SPENDING_DECREASE: '#388E3C',
  GOAL_ACHIEVED: '#388E3C',
  GOAL_AT_RISK: '#F57C00',
  PROPOSAL_PENDING: '#1976D2',
};
