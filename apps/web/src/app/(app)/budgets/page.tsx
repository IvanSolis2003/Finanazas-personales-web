'use client';

import { useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Box,
  LinearProgress,
  CircularProgress,
  TextField,
  Button,
  MenuItem,
  Alert,
} from '@mui/material';
import { useGroupStore } from '@/store/groupStore';
import { useBudgets, useUpsertBudget } from '@/hooks/useMisc';
import { useSummary } from '@/hooks/useGroupData';
import { formatCurrency, CATEGORY_LABELS } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/validations';

export default function BudgetsPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: budgets, isLoading } = useBudgets(groupId);
  const { data: summary } = useSummary(groupId);
  const upsert = useUpsertBudget(groupId);

  const [category, setCategory] = useState('FOOD');
  const [limit, setLimit] = useState('');

  const spent = summary?.byCategory ?? {};

  function save() {
    upsert.mutate(
      { category, monthlyLimit: Number(limit) },
      { onSuccess: () => setLimit('') },
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Presupuestos del mes
      </Typography>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : budgets && budgets.length > 0 ? (
        <Stack spacing={1.5}>
          {budgets.map((b) => {
            const used = spent[b.category] ?? 0;
            const pct = Math.min(100, Math.round((used / b.monthlyLimit) * 100));
            const over = used > b.monthlyLimit;
            const warn = pct >= 80;
            return (
              <Card key={b.id} variant="outlined">
                <CardContent>
                  <Box display="flex" justifyContent="space-between">
                    <Typography fontWeight={600}>{CATEGORY_LABELS[b.category]}</Typography>
                    <Typography variant="body2" color={over ? 'error.main' : 'text.secondary'}>
                      {formatCurrency(used)} / {formatCurrency(b.monthlyLimit)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={pct}
                    color={over ? 'error' : warn ? 'warning' : 'primary'}
                    sx={{ mt: 1, height: 8, borderRadius: 4 }}
                  />
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      ) : (
        <Typography color="text.secondary" py={1}>
          Aún no hay presupuestos configurados.
        </Typography>
      )}

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Configurar presupuesto (solo admin)
          </Typography>
          {upsert.isError && <Alert severity="error" sx={{ mb: 1 }}>{upsert.error.message}</Alert>}
          <Stack direction="row" spacing={1}>
            <TextField
              select
              label="Categoría"
              size="small"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              sx={{ minWidth: 130 }}
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <MenuItem key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Límite (CLP)"
              type="number"
              size="small"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              fullWidth
            />
            <Button variant="contained" onClick={save} disabled={upsert.isPending || !limit}>
              Guardar
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
