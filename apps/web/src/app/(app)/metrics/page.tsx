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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Alert,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useGroupStore } from '@/store/groupStore';
import { useMetrics, type MonthMetric } from '@/hooks/useGroupData';
import { formatCurrency, formatCompact, CATEGORY_LABELS } from '@/lib/format';

type CatChange = { cat: string; pct: number } | null;

// Categoría que más subió y la que más bajó entre dos meses.
function biggestChanges(curr?: MonthMetric, prev?: MonthMetric): { inc: CatChange; dec: CatChange } {
  const out: { inc: CatChange; dec: CatChange } = { inc: null, dec: null };
  if (!curr || !prev) return out;
  let incDiff = 0;
  let decDiff = 0;
  const cats = new Set([...Object.keys(curr.byCategory), ...Object.keys(prev.byCategory)]);
  cats.forEach((cat) => {
    const c = curr.byCategory[cat] ?? 0;
    const p = prev.byCategory[cat] ?? 0;
    const diff = c - p;
    const pct = p > 0 ? (diff / p) * 100 : c > 0 ? 100 : 0;
    if (diff > incDiff) {
      incDiff = diff;
      out.inc = { cat, pct };
    }
    if (diff < decDiff) {
      decDiff = diff;
      out.dec = { cat, pct };
    }
  });
  return out;
}

export default function MetricsPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useMetrics(groupId, months);

  const series = data?.series ?? [];
  const income = data?.income ?? 0;
  const max = Math.max(income, ...series.map((s) => s.expenses), 1);

  // Solo meses ya transcurridos (sin los anticipados) para promedios.
  const past = series.filter((s) => !s.future);
  const avgSpend = past.length ? Math.round(past.reduce((a, s) => a + s.expenses, 0) / past.length) : 0;
  const withData = past.filter((s) => s.expenses > 0);
  const mostExpensive = withData.length
    ? withData.reduce((a, s) => (s.expenses > a.expenses ? s : a))
    : null;
  const avgSavingsPct =
    income > 0 && past.length
      ? Math.round((past.reduce((a, s) => a + s.available / income, 0) / past.length) * 100)
      : null;

  // Insight: categoría con mayor cambio entre los dos últimos meses transcurridos.
  const curr = past[past.length - 1];
  const prev = past[past.length - 2];
  const { inc, dec } = biggestChanges(curr, prev);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Métricas
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Compara cómo cambian tus finanzas mes a mes. Los meses con “próx.” son anticipados (gastos
        que ya cargaste para el futuro).
      </Typography>

      <ToggleButtonGroup value={months} exclusive size="small" onChange={(_, v) => v && setMonths(v)}>
        <ToggleButton value={3}>3 meses</ToggleButton>
        <ToggleButton value={6}>6 meses</ToggleButton>
        <ToggleButton value={12}>12 meses</ToggleButton>
      </ToggleButtonGroup>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* KPIs */}
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <KpiCard title="Gasto promedio" value={formatCurrency(avgSpend)} hint="por mes" />
            {mostExpensive && (
              <KpiCard
                title="Mes más caro"
                value={formatCurrency(mostExpensive.expenses)}
                hint={mostExpensive.label}
              />
            )}
            {avgSavingsPct !== null && (
              <KpiCard
                title="Ahorro promedio"
                value={`${avgSavingsPct}%`}
                hint="de tu ingreso"
                color={avgSavingsPct < 0 ? 'error.main' : 'success.main'}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary">
            Promedios calculados sobre los meses ya transcurridos que se muestran.
          </Typography>

          {/* Insight automático */}
          {inc && (
            <Alert severity="warning" icon={<ArrowUpwardIcon />}>
              Tu mayor aumento fue <b>{CATEGORY_LABELS[inc.cat]}</b> (+{Math.abs(inc.pct).toFixed(0)}%
              vs el mes anterior). Ojo con esa categoría.
            </Alert>
          )}
          {dec && (
            <Alert severity="success" icon={<ArrowDownwardIcon />}>
              ¡Bien! Donde más bajaste fue <b>{CATEGORY_LABELS[dec.cat]}</b> (
              {Math.abs(dec.pct).toFixed(0)}% menos que el mes anterior).
            </Alert>
          )}

          {/* Gráfico */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2">Gasto por mes vs ingreso</Typography>
              <Typography variant="caption" color="text.secondary">
                Cada barra es lo que gastaron ese mes. La línea verde es el ingreso: si la barra la
                supera (roja), gastaron más de lo que ganan.
              </Typography>
              <Box sx={{ position: 'relative', height: 170, display: 'flex', alignItems: 'flex-end', gap: 1, mt: 4 }}>
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
                  <Box
                    key={s.key}
                    sx={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}
                  >
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
                        border: s.future ? '1px dashed' : 'none',
                        borderColor: 'primary.main',
                        borderRadius: '4px 4px 0 0',
                      }}
                    />
                  </Box>
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                {series.map((s) => (
                  <Box key={s.key} sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" display="block" fontSize={10}>
                      {s.label}
                    </Typography>
                    {s.future && (
                      <Typography variant="caption" color="primary" fontSize={9}>
                        próx.
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Tabla comparativa */}
          <Card variant="outlined">
            <CardContent sx={{ overflowX: 'auto' }}>
              <Typography variant="subtitle2">Comparativa mensual</Typography>
              <Typography variant="caption" color="text.secondary">
                “Variación” = cuánto subió (▲ rojo) o bajó (▼ verde) el gasto respecto al mes anterior.
              </Typography>
              <Table size="small" sx={{ mt: 1 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Mes</TableCell>
                    <TableCell align="right">Gasto</TableCell>
                    <TableCell align="right">Disponible</TableCell>
                    <TableCell align="right">Variación</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {series.map((s, i) => {
                    const p = series[i - 1];
                    const change = p && p.expenses > 0 ? ((s.expenses - p.expenses) / p.expenses) * 100 : null;
                    return (
                      <TableRow key={s.key}>
                        <TableCell>
                          {s.label}
                          {s.future && <Chip label="próx." size="small" sx={{ ml: 0.5, height: 18 }} />}
                        </TableCell>
                        <TableCell align="right">{formatCurrency(s.expenses)}</TableCell>
                        <TableCell align="right" sx={{ color: s.available < 0 ? 'error.main' : 'text.primary' }}>
                          {formatCurrency(s.available)}
                        </TableCell>
                        <TableCell align="right">
                          {change === null ? (
                            '—'
                          ) : (
                            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', color: change > 0 ? 'error.main' : 'success.main' }}>
                              {change > 0 ? <ArrowUpwardIcon fontSize="inherit" /> : <ArrowDownwardIcon fontSize="inherit" />}
                              {Math.abs(change).toFixed(0)}%
                            </Box>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Categorías del mes actual */}
          {curr && Object.keys(curr.byCategory).length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2">En qué se fue la plata ({curr.label})</Typography>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  Gasto por categoría del mes en curso, de mayor a menor.
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

function KpiCard({
  title,
  value,
  hint,
  color,
}: {
  title: string;
  value: string;
  hint: string;
  color?: string;
}) {
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
