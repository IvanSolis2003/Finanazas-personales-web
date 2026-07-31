// Valida el reparto de un gasto compartido con monto por persona.
// Los montos por persona deben sumar exactamente el total.
export function validateSplit(
  type: 'SHARED' | 'INDIVIDUAL',
  amount: number,
  splitBetween: string[] | undefined,
  splitShares: Record<string, number> | undefined,
):
  | { ok: true; splitBetween: string[]; splitShares: Record<string, number> | null }
  | { ok: false; error: string } {
  if (type !== 'SHARED') {
    return { ok: true, splitBetween: [], splitShares: null };
  }

  if (splitShares && Object.keys(splitShares).length > 0) {
    const sum = Object.values(splitShares).reduce((a, b) => a + b, 0);
    if (sum !== amount) {
      return {
        ok: false,
        error: `Los montos por persona deben sumar el total ($${amount.toLocaleString('es-CL')}). Suma actual: $${sum.toLocaleString('es-CL')}.`,
      };
    }
    return { ok: true, splitBetween: Object.keys(splitShares), splitShares };
  }

  // Sin montos personalizados → reparto igualitario entre los seleccionados.
  return { ok: true, splitBetween: splitBetween ?? [], splitShares: null };
}
