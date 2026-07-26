'use client';

import { useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  ToggleButtonGroup,
  ToggleButton,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
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
import { formatCurrency, CATEGORY_LABELS } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/validations';

export default function ExpensesPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { month, year } = useMonthStore();
  const { data: expenses, isLoading } = useExpenses(groupId, month, year);
  const { data: group } = useGroupDetail(groupId);
  const deleteExpense = useDeleteExpense(groupId);
  // null = cerrado; 'new' = crear; Expense = editar ese gasto
  const [dialog, setDialog] = useState<Expense | 'new' | null>(null);

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
                  <Typography fontWeight={600}>{e.description}</Typography>
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
  const createExpense = useCreateExpense(groupId);
  const updateExpense = useUpdateExpense(groupId);
  const mutation = isEdit ? updateExpense : createExpense;

  const [description, setDescription] = useState(expense?.description ?? '');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [category, setCategory] = useState<string>(expense?.category ?? 'FOOD');
  const [type, setType] = useState<'SHARED' | 'INDIVIDUAL'>(expense?.type ?? 'SHARED');
  const [date, setDate] = useState(
    (expense ? new Date(expense.date) : new Date()).toISOString().slice(0, 10),
  );
  const [split, setSplit] = useState<string[]>(
    expense && expense.type === 'SHARED' ? expense.splitBetween : members.map((m) => m.userId),
  );

  function toggle(userId: string) {
    setSplit((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function submit() {
    const data = {
      description: description.trim(),
      amount: Number(amount),
      category,
      type,
      splitBetween: type === 'SHARED' ? split : [],
      date: date ? new Date(date).toISOString() : undefined,
    };
    if (isEdit) {
      updateExpense.mutate({ expId: expense.id, data }, { onSuccess: onClose });
    } else {
      createExpense.mutate(data, { onSuccess: onClose });
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
              <Typography variant="caption" color="text.secondary">
                Dividir entre:
              </Typography>
              <FormGroup>
                {members.map((m) => (
                  <FormControlLabel
                    key={m.userId}
                    control={
                      <Checkbox checked={split.includes(m.userId)} onChange={() => toggle(m.userId)} />
                    }
                    label={m.name}
                  />
                ))}
              </FormGroup>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={mutation.isPending || !description.trim() || !amount}
        >
          {isEdit ? 'Guardar cambios' : 'Guardar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
