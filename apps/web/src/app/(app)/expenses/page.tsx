'use client';

import { useState, useEffect } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Box,
  Chip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  FormControlLabel,
  Checkbox,
  Alert,
  Fab,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { useGroupStore } from '@/store/groupStore';
import { useMonthStore } from '@/store/monthStore';
import { MonthSelector } from '@/components/MonthSelector';
import {
  useExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useGroupDetail,
  type Expense,
} from '@/hooks/useGroupData';
import { useCreateRecurring, useApplyRecurring } from '@/hooks/useRecurring';
import { formatCurrency, CATEGORY_LABELS } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/validations';

export default function ExpensesPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { month, year } = useMonthStore();
  const { data: expenses, isLoading } = useExpenses(groupId, month, year);
  const { data: group } = useGroupDetail(groupId);
  const deleteExpense = useDeleteExpense(groupId);
  const applyRecurring = useApplyRecurring(groupId);
  // null = cerrado; 'new' = crear; Expense = editar ese gasto
  const [dialog, setDialog] = useState<Expense | 'new' | null>(null);

  // Auto-genera los gastos fijos al ver el mes actual o uno futuro (anticipar).
  useEffect(() => {
    if (!groupId) return;
    const now = new Date();
    const targetYM = year * 12 + month;
    const currentYM = now.getFullYear() * 12 + (now.getMonth() + 1);
    if (targetYM >= currentYM) applyRecurring.mutate({ month, year });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, month, year]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Gastos
      </Typography>

      <MonthSelector />

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : expenses && expenses.length > 0 ? (
        <Stack spacing={1}>
          {expenses.map((e) => (
            <Card key={e.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', '&:last-child': { pb: 2 } }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography fontWeight={600}>{e.description}</Typography>
                    {e.recurringId && (
                      <Chip
                        icon={<AutorenewIcon />}
                        label="fijo"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ height: 20 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {CATEGORY_LABELS[e.category]} ·{' '}
                    {e.type === 'SHARED' ? 'Compartido' : 'Individual'} · {e.paidBy.name} ·{' '}
                    {new Date(e.date).toLocaleDateString('es-CL')}
                  </Typography>
                </Box>
                <Typography fontWeight="bold" color="error.main" mr={0.5}>
                  {formatCurrency(e.amount)}
                </Typography>
                <IconButton size="small" onClick={() => setDialog(e)} aria-label="Editar">
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => deleteExpense.mutate(e.id)}
                  aria-label="Eliminar"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary" py={2}>
          Aún no hay gastos registrados.
        </Typography>
      )}

      <Fab
        color="primary"
        onClick={() => setDialog('new')}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        aria-label="Agregar gasto"
      >
        <AddIcon />
      </Fab>

      {group && dialog && (
        <ExpenseDialog
          key={dialog === 'new' ? 'new' : dialog.id}
          expense={dialog === 'new' ? undefined : dialog}
          onClose={() => setDialog(null)}
          groupId={groupId}
          members={group.members.map((m) => ({ userId: m.userId, name: m.user.name }))}
        />
      )}
    </Stack>
  );
}

function ExpenseDialog({
  expense,
  onClose,
  groupId,
  members,
}: {
  expense?: Expense;
  onClose: () => void;
  groupId: string;
  members: { userId: string; name: string }[];
}) {
  const isEdit = !!expense;
  const { month: selMonth, year: selYear } = useMonthStore();
  const createExpense = useCreateExpense(groupId);
  const updateExpense = useUpdateExpense(groupId);
  const createRecurring = useCreateRecurring(groupId);
  const mutation = isEdit ? updateExpense : createExpense;
  const [makeFixed, setMakeFixed] = useState(false);

  // Formato yyyy-mm-dd en hora local (evita corrimientos de zona horaria).
  const toInput = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const defaultDate = () => {
    if (expense) return toInput(new Date(expense.date));
    const now = new Date();
    // Si estás viendo el mes actual → hoy; si ves otro mes → día 1 de ese mes.
    if (selMonth === now.getMonth() + 1 && selYear === now.getFullYear()) return toInput(now);
    return toInput(new Date(selYear, selMonth - 1, 1));
  };

  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [category, setCategory] = useState<string>(expense?.category ?? 'FOOD');
  const [type, setType] = useState<'SHARED' | 'INDIVIDUAL'>(expense?.type ?? 'SHARED');
  const [date, setDate] = useState(defaultDate);
  const [split, setSplit] = useState<string[]>(
    expense && expense.type === 'SHARED' ? expense.splitBetween : members.map((m) => m.userId),
  );
  // Monto por persona (strings para el input). Vacío = reparto igualitario.
  const [shares, setShares] = useState<Record<string, string>>(() => {
    const s: Record<string, string> = {};
    if (expense?.splitShares) {
      for (const [id, amt] of Object.entries(expense.splitShares)) s[id] = String(amt);
    }
    return s;
  });

  function toggle(userId: string) {
    setSplit((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
    setShares((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }

  function splitEqually() {
    const total = Number(amount);
    const n = split.length;
    if (!total || !n) return;
    const base = Math.floor(total / n);
    const rem = total - base * n;
    const next: Record<string, string> = {};
    split.forEach((id, i) => {
      next[id] = String(base + (i === 0 ? rem : 0));
    });
    setShares(next);
  }

  const anyShareEntered = split.some((id) => (shares[id] ?? '').trim() !== '');
  const sharesSum = split.reduce((sum, id) => sum + (Number(shares[id]) || 0), 0);
  const sharesMismatch = type === 'SHARED' && anyShareEntered && sharesSum !== Number(amount);

  function submit() {
    const data = {
      description: description.trim(),
      amount: Number(amount),
      category,
      type,
      splitBetween: type === 'SHARED' ? split : [],
      splitShares:
        type === 'SHARED' && anyShareEntered
          ? Object.fromEntries(split.map((id) => [id, Number(shares[id]) || 0]))
          : undefined,
      // Mediodía UTC: cae siempre dentro del día elegido sin importar la zona
      // horaria del servidor (evita que un gasto "salte" de mes por el huso).
      date: date ? `${date}T12:00:00.000Z` : undefined,
    };
    if (isEdit) {
      updateExpense.mutate({ expId: expense.id, data }, { onSuccess: onClose });
    } else {
      createExpense.mutate(data, {
        onSuccess: () => {
          if (makeFixed) {
            createRecurring.mutate({
              description: data.description,
              amount: data.amount,
              category: data.category,
              type: data.type,
              splitBetween: data.splitBetween,
            });
          }
          onClose();
        },
      });
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{isEdit ? 'Editar gasto' : 'Nuevo gasto'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {mutation.isError && <Alert severity="error">{mutation.error.message}</Alert>}
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            autoFocus
          />
          <TextField
            label="Monto (CLP)"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            fullWidth
          />
          <TextField
            label="Fecha"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            select
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            fullWidth
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </MenuItem>
            ))}
          </TextField>

          <ToggleButtonGroup
            value={type}
            exclusive
            onChange={(_, v) => v && setType(v)}
            fullWidth
            size="small"
          >
            <ToggleButton value="SHARED">Compartido</ToggleButton>
            <ToggleButton value="INDIVIDUAL">Individual</ToggleButton>
          </ToggleButtonGroup>

          {type === 'SHARED' && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  Cuánto pone cada uno (opcional):
                </Typography>
                <Button size="small" onClick={splitEqually} disabled={!amount || split.length === 0}>
                  Partes iguales
                </Button>
              </Box>
              <Stack spacing={0.5} mt={0.5}>
                {members.map((m) => {
                  const checked = split.includes(m.userId);
                  return (
                    <Box key={m.userId} display="flex" alignItems="center" gap={1}>
                      <Checkbox
                        checked={checked}
                        onChange={() => toggle(m.userId)}
                        size="small"
                        sx={{ p: 0.5 }}
                      />
                      <Typography sx={{ flexGrow: 1 }}>{m.name}</Typography>
                      <TextField
                        size="small"
                        type="number"
                        placeholder="Igual"
                        value={shares[m.userId] ?? ''}
                        onChange={(e) =>
                          setShares((s) => ({ ...s, [m.userId]: e.target.value }))
                        }
                        disabled={!checked}
                        sx={{ width: 110 }}
                      />
                    </Box>
                  );
                })}
              </Stack>
              {anyShareEntered && (
                <Typography
                  variant="caption"
                  color={sharesMismatch ? 'error.main' : 'success.main'}
                  display="block"
                  mt={0.5}
                >
                  Suma {formatCurrency(sharesSum)} / {formatCurrency(Number(amount) || 0)}
                  {sharesMismatch ? ' — debe sumar el total' : ' ✓'}
                </Typography>
              )}
              {!anyShareEntered && (
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  Si lo dejas vacío, se reparte en partes iguales.
                </Typography>
              )}
            </Box>
          )}

          {!isEdit && (
            <>
              <Divider />
              <FormControlLabel
                control={
                  <Checkbox checked={makeFixed} onChange={(e) => setMakeFixed(e.target.checked)} />
                }
                label="Gasto fijo (se repite cada mes automáticamente)"
              />
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={mutation.isPending || !description.trim() || !amount || sharesMismatch}
        >
          {isEdit ? 'Guardar cambios' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
