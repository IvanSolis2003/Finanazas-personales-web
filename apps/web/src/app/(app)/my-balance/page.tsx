'use client';

import { useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
} from '@mui/material';
import { useGroupStore } from '@/store/groupStore';
import { useMe } from '@/hooks/useAuth';
import { useMetrics } from '@/hooks/useGroupData';
import { formatCurrency, formatCompact, CATEGORY_LABELS } from '@/lib/format';

export default function MyBalancePage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: me } = useMe();
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useMetrics(groupId, months, me?.id);

  const series = data?.series ?? [];
  const income = data?.income ?? 0;
  const max = Math.max(income, ...series.map((s) => s.expenses), 1);
  const past = series.filter((s) => !s.future);
  const curr = past[past.length - 1];
  const avgSpend = past.length ? Math.round(past.reduce((a, s) => a + s.expenses, 0) / past.length) : 0;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Mi balance
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Tu análisis personal: cuánto aportas de ingreso y cuánto gastas tú (tus gastos individuales
        + tu parte de los compartidos).
      </Typography>

      <ToggleButtonGroup value={months} exclusive size="small" onChange={(_, v) => v && setMonths(v)}>
        <ToggleButton value={3}>3 meses</ToggleButton>
        <ToggleButton value={6}>6 meses</ToggleButton>
        <ToggleButton value={12}>12 meses</ToggleButton>
      </ToggleButtonGroup>

      {isLoading || !me ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPIs personales del mes actual */}
          {curr && (
            <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
              <Kpi title="Mi ingreso" value={formatCurrency(curr.income)} hint="mensual" />
              <Kpi title="Mi gasto" value={formatCurrency(curr.expenses)} hint={curr.label} color="error.main" />
              <Kpi
                title="Mi disponible"
                value={formatCurrency(curr.available)}
                hint={curr.label}
                color={curr.available < 0 ? 'error.main' : 'success.main'}
              />
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">
            Tu gasto promedio: {formatCurrency(avgSpend)} por mes.
          </Typography>

          {/* Gráfico de mi gasto por mes */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2">Mi gasto por mes</Typography>
              <Typography variant="caption" color="text.secondary">
                La línea verde es tu ingreso. Si una barra la supera (roja), gastaste más de lo que
                ganas ese mes.
              </Typography>
              <Box sx={{ position: 'relative', height: 160, display: 'flex', alignItems: 'flex-end', gap: 1, mt: 4 }}>
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
                {series.map((s) => (
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
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {series.map((s) => (
                  <Typography key={s.key} variant="caption" sx={{ flex: 1, textAlign: 'center' }} fontSize={10}>
                    {s.label}
                    {s.future ? ' (próx.)' : ''}
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Mis categorías del mes actual */}
          {curr && Object.keys(curr.byCategory).length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  En qué gasté yo ({curr.label})
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {Object.entries(curr.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => (
                      <Chip key={cat} label={`${CATEGORY_LABELS[cat]}: ${formatCurrency(amount)}`} size="small" />
                    ))}
                </Stack>
              </CardContent>
            </Card>
          )}
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
