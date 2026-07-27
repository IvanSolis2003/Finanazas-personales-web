'use client';

import {
  Stack,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Chip,
} from '@mui/material';
import { useGroupStore } from '@/store/groupStore';
import { useMonthStore } from '@/store/monthStore';
import { MonthSelector } from '@/components/MonthSelector';
import { useMe } from '@/hooks/useAuth';
import { useMembersBreakdown, useMetrics } from '@/hooks/useGroupData';
import { formatCurrency, formatCompact, CATEGORY_LABELS } from '@/lib/format';

export default function MyBalancePage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { month, year } = useMonthStore();
  const { data: me } = useMe();

  // Datos del mes puntual elegido (desglose personal).
  const { data: breakdown, isLoading } = useMembersBreakdown(groupId, month, year);
  const mine = breakdown?.find((m) => m.isSelf);

  // Evolución: mis últimos 6 meses (se va acumulando con el tiempo).
  const { data: metrics } = useMetrics(groupId, 6, me?.id);
  const series = metrics?.series ?? [];
  const income = metrics?.income ?? mine?.income ?? 0;
  const max = Math.max(income, ...series.map((s) => s.expenses), 1);

  const spent = mine?.spent ?? 0;
  const myIncome = mine?.income ?? 0;
  const available = myIncome - spent;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Mi balance
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Tu análisis personal por mes: cuánto aportas de ingreso y cuánto gastas tú (tus gastos
        individuales + tu parte de los compartidos). Elige el mes que quieras ver.
      </Typography>

      <MonthSelector />

      {isLoading || !me ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPIs del mes elegido */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <Kpi title="Mi ingreso" value={formatCurrency(myIncome)} hint="mensual" />
            <Kpi title="Mi gasto" value={formatCurrency(spent)} hint="este mes" color="error.main" />
            <Kpi
              title="Mi disponible"
              value={formatCurrency(available)}
              hint="este mes"
              color={available < 0 ? 'error.main' : 'success.main'}
            />
          </Box>

          {/* Mis categorías del mes elegido */}
          {mine && Object.keys(mine.byCategory).length > 0 ? (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  En qué gasté yo este mes
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {Object.entries(mine.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => (
                      <Chip key={cat} label={`${CATEGORY_LABELS[cat]}: ${formatCurrency(amount)}`} size="small" />
                    ))}
                </Stack>
              </CardContent>
            </Card>
          ) : (
            <Typography color="text.secondary">No tienes gastos registrados este mes.</Typography>
          )}

          {/* Evolución: se va acumulando mes a mes */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2">Mi evolución (últimos meses)</Typography>
              <Typography variant="caption" color="text.secondary">
                Tu gasto mes a mes. Se va sumando un mes nuevo a medida que pasa el tiempo. La línea
                verde es tu ingreso.
              </Typography>
              <Box sx={{ position: 'relative', height: 150, display: 'flex', alignItems: 'flex-end', gap: 1, mt: 4 }}>
                {income > 0 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: `${(income / max) * 100}%`,
                      borderTop: '2px dashed',
                      borderColor: 'success.main',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ position: 'absolute', right: 0, top: -15, color: 'success.main', bgcolor: 'background.paper', px: 0.5 }}
                    >
                      Ingreso {formatCompact(income)}
                    </Typography>
                  </Box>
                )}
                {series.map((s) => {
                  const isSelected = s.month === month && s.year === year;
                  return (
                    <Box key={s.key} sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                      <Typography variant="caption" color="text.secondary" fontSize={10}>
                        {formatCompact(s.expenses)}
                      </Typography>
                      <Box
                        sx={{
                          width: '68%',
                          height: `${(s.expenses / max) * 100}%`,
                          minHeight: s.expenses > 0 ? 4 : 0,
                          bgcolor: s.expenses > income && income > 0 ? 'error.main' : 'primary.main',
                          opacity: s.future ? 0.45 : 1,
                          outline: isSelected ? '2px solid' : 'none',
                          outlineColor: 'secondary.main',
                          borderRadius: '4px 4px 0 0',
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {series.map((s) => (
                  <Typography
                    key={s.key}
                    variant="caption"
                    sx={{ flex: 1, textAlign: 'center', fontWeight: s.month === month && s.year === year ? 700 : 400 }}
                    fontSize={10}
                  >
                    {s.label}
                    {s.future ? ' (próx.)' : ''}
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>
        </>
      )}
    </Stack>
  );
}

function Kpi({ title, value, hint, color }: { title: string; value: string; hint: string; color?: string }) {
  return (
    <Card variant="outlined" sx={{ flex: '1 1 30%', minWidth: 100 }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography variant="caption" color="text.secondary">
          {title}
        </Typography>
        <Typography variant="h6" fontWeight="bold" color={color ?? 'text.primary'} lineHeight={1.2}>
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}
