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
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { useGroupStore } from '@/store/groupStore';
import { useMetrics } from '@/hooks/useGroupData';
import { formatCurrency, formatCompact, CATEGORY_LABELS } from '@/lib/format';

export default function MetricsPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useMetrics(groupId, months);

  const series = data?.series ?? [];
  const income = data?.income ?? 0;
  const max = Math.max(income, ...series.map((s) => s.expenses), 1);
  const latest = series[series.length - 1];

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Métricas
      </Typography>

      <ToggleButtonGroup
        value={months}
        exclusive
        size="small"
        onChange={(_, v) => v && setMonths(v)}
      >
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
          {/* Gráfico de barras: gasto por mes con línea de ingreso */}
          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Gasto por mes
              </Typography>
              <Box sx={{ position: 'relative', height: 180, display: 'flex', alignItems: 'flex-end', gap: 1, mt: 3 }}>
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
                  </Typography>
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Tabla comparativa con variación mes a mes */}
          <Card variant="outlined">
            <CardContent sx={{ overflowX: 'auto' }}>
              <Typography variant="subtitle2" gutterBottom>
                Comparativa mensual
              </Typography>
              <Table size="small">
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
                    const prev = series[i - 1];
                    const change =
                      prev && prev.expenses > 0
                        ? ((s.expenses - prev.expenses) / prev.expenses) * 100
                        : null;
                    return (
                      <TableRow key={s.key}>
                        <TableCell>{s.label}</TableCell>
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

          {/* Top categorías del último mes */}
          {latest && Object.keys(latest.byCategory).length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Categorías en {latest.label}
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {Object.entries(latest.byCategory)
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, amount]) => (
                      <Chip
                        key={cat}
                        label={`${CATEGORY_LABELS[cat]}: ${formatCurrency(amount)}`}
                        size="small"
                      />
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
