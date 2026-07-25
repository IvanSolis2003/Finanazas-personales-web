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
import { useGroupStore } from '@/store/groupStore';
import {
  useExpenses,
  useCreateExpense,
  useDeleteExpense,
  useGroupDetail,
} from '@/hooks/useGroupData';
import { formatCurrency, CATEGORY_LABELS } from '@/lib/format';
import { EXPENSE_CATEGORIES } from '@/lib/validations';

export default function ExpensesPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: expenses, isLoading } = useExpenses(groupId);
  const { data: group } = useGroupDetail(groupId);
  const deleteExpense = useDeleteExpense(groupId);
  const [open, setOpen] = useState(false);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Gastos
      </Typography>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : expenses && expenses.length > 0 ? (
        <Stack spacing={1}>
          {expenses.map((e) => (
            <Card key={e.id} variant="outlined">
              <CardContent
                sx={{ display: 'flex', alignItems: 'center', '&:last-child': { pb: 2 } }}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography fontWeight={600}>{e.description}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {CATEGORY_LABELS[e.category]} · {e.type === 'SHARED' ? 'Compartido' : 'Individual'} ·{' '}
                    {e.paidBy.name}
                  </Typography>
                </Box>
                <Typography fontWeight="bold" color="error.main" mr={1}>
                  {formatCurrency(e.amount)}
                </Typography>
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
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        aria-label="Agregar gasto"
      >
        <AddIcon />
      </Fab>

      {group && (
        <AddExpenseDialog
          open={open}
          onClose={() => setOpen(false)}
          groupId={groupId}
          members={group.members.map((m) => ({ userId: m.userId, name: m.user.name }))}
        />
      )}
    </Stack>
  );
}

function AddExpenseDialog({
  open,
  onClose,
  groupId,
  members,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
  members: { userId: string; name: string }[];
}) {
  const createExpense = useCreateExpense(groupId);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string>('FOOD');
  const [type, setType] = useState<'SHARED' | 'INDIVIDUAL'>('SHARED');
  const [split, setSplit] = useState<string[]>(members.map((m) => m.userId));

  function toggle(userId: string) {
    setSplit((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
    );
  }

  function submit() {
    createExpense.mutate(
      {
        description: description.trim(),
        amount: Number(amount),
        category,
        type,
        splitBetween: type === 'SHARED' ? split : [],
      },
      {
        onSuccess: () => {
          setDescription('');
          setAmount('');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Nuevo gasto</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {createExpense.isError && <Alert severity="error">{createExpense.error.message}</Alert>}
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
                      <Checkbox
                        checked={split.includes(m.userId)}
                        onChange={() => toggle(m.userId)}
                      />
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
          disabled={createExpense.isPending || !description.trim() || !amount}
        >
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
