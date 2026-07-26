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
import { useMonthStore } from '@/store/monthStore';
import { MonthSelector } from '@/components/MonthSelector';
import { useBudgets, useUpsertBudget } from '@/hooks/useMisc';
import { useSummary, useGroupDetail, useMembersBreakdown } from '@/hooks/useGroupData';
import { useMe } from '@/hooks/useAuth';
import { formatCurrency, CATEGORY_LABELS } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/validations';

export default function BudgetsPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { month, year } = useMonthStore();
  const { data: budgets, isLoading } = useBudgets(groupId, month, year);
  const { data: summary } = useSummary(groupId, month, year);
  const { data: breakdown } = useMembersBreakdown(groupId, month, year);
  const { data: group } = useGroupDetail(groupId);
  const { data: me } = useMe();
  const upsert = useUpsertBudget(groupId);

  // target: 'group' o el userId de un miembro
  const [target, setTarget] = useState<'group' | string>('group');
  const [category, setCategory] = useState('FOOD');
  const [limit, setLimit] = useState('');

  const myRole = group?.members.find((m) => m.userId === me?.id)?.role;
  const canEdit = target === 'group' ? myRole === 'ADMIN' : target === me?.id || myRole === 'ADMIN';

  // Gasto por categoría según el objetivo seleccionado.
  const spentByCategory: Record<string, number> =
    target === 'group'
      ? summary?.byCategory ?? {}
      : breakdown?.find((m) => m.userId === target)?.byCategory ?? {};

  const visibleBudgets = (budgets ?? []).filter((b) =>
    target === 'group' ? b.userId === null : b.userId === target,
  );

  function save() {
    upsert.mutate(
      {
        category,
        monthlyLimit: Number(limit),
        userId: target === 'group' ? null : target,
        month,
        year,
      },
      { onSuccess: () => setLimit('') },
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Presupuestos
      </Typography>

      <MonthSelector />

      <TextField
        select
        label="Presupuesto de"
        value={target}
        onChange={(e) => setTarget(e.target.value)}
        size="small"
        fullWidth
      >
        <MenuItem value="group">🏠 Grupo (compartido)</MenuItem>
        {group?.members.map((m) => (
          <MenuItem key={m.userId} value={m.userId}>
            {m.user.name}
            {m.userId === me?.id ? ' (tú)' : ''}
          </MenuItem>
        ))}
      </TextField>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : visibleBudgets.length > 0 ? (
        <Stack spacing={1.5}>
          {visibleBudgets.map((b) => {
            const used = spentByCategory[b.category] ?? 0;
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
          Sin presupuestos configurados para {target === 'group' ? 'el grupo' : 'este miembro'}.
        </Typography>
      )}

      {canEdit ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Configurar presupuesto {target === 'group' ? 'del grupo' : 'del miembro'}
            </Typography>
            {upsert.isError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {upsert.error.message}
              </Alert>
            )}
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
      ) : (
        <Typography variant="caption" color="text.secondary">
          Solo {target === 'group' ? 'un administrador' : 'este miembro o un administrador'} puede
          configurar este presupuesto.
        </Typography>
      )}
    </Stack>
  );
}
