'use client';

import { useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useGroupStore } from '@/store/groupStore';
import { useGoals, useCreateGoal, useUpdateGoal, type Goal } from '@/hooks/useGoals';
import { formatCurrency } from '@/lib/format';

export default function GoalsPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: goals, isLoading } = useGoals(groupId);
  const [open, setOpen] = useState(false);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Metas de ahorro
      </Typography>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : goals && goals.length > 0 ? (
        <Stack spacing={1.5}>
          {goals.map((g) => (
            <GoalCard key={g.id} goal={g} groupId={groupId} />
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary" py={2}>
          Aún no hay metas de ahorro.
        </Typography>
      )}

      <Fab
        color="primary"
        onClick={() => setOpen(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        aria-label="Nueva meta"
      >
        <AddIcon />
      </Fab>

      <AddGoalDialog open={open} onClose={() => setOpen(false)} groupId={groupId} />
    </Stack>
  );
}

function GoalCard({ goal, groupId }: { goal: Goal; groupId: string }) {
  const updateGoal = useUpdateGoal(groupId);
  const [saved, setSaved] = useState(String(goal.savedAmount));
  const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
  const achieved = goal.savedAmount >= goal.targetAmount;

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="baseline">
          <Typography fontWeight={700}>{goal.name}</Typography>
          <Typography variant="body2" color={achieved ? 'success.main' : 'text.secondary'}>
            {pct}%{achieved ? ' 🎉' : ''}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          {formatCurrency(goal.savedAmount)} de {formatCurrency(goal.targetAmount)} · meta{' '}
          {new Date(goal.targetDate).toLocaleDateString('es-CL')}
        </Typography>
        <LinearProgress
          variant="determinate"
          value={pct}
          color={achieved ? 'success' : 'primary'}
          sx={{ my: 1, height: 8, borderRadius: 4 }}
        />
        <Stack direction="row" spacing={1} mt={1}>
          <TextField
            size="small"
            type="number"
            label="Ahorrado (CLP)"
            value={saved}
            onChange={(e) => setSaved(e.target.value)}
            fullWidth
          />
          <Button
            variant="outlined"
            onClick={() => updateGoal.mutate({ goalId: goal.id, savedAmount: Number(saved) })}
            disabled={updateGoal.isPending}
          >
            Actualizar
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

function AddGoalDialog({
  open,
  onClose,
  groupId,
}: {
  open: boolean;
  onClose: () => void;
  groupId: string;
}) {
  const createGoal = useCreateGoal(groupId);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');

  function submit() {
    createGoal.mutate(
      { name: name.trim(), targetAmount: Number(targetAmount), targetDate },
      {
        onSuccess: () => {
          setName('');
          setTargetAmount('');
          setTargetDate('');
          onClose();
        },
      },
    );
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Nueva meta</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          {createGoal.isError && <Alert severity="error">{createGoal.error.message}</Alert>}
          <TextField label="Nombre" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
          <TextField
            label="Monto objetivo (CLP)"
            type="number"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            fullWidth
          />
          <TextField
            label="Fecha objetivo"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={createGoal.isPending || !name.trim() || !targetAmount || !targetDate}
        >
          Crear
        </Button>
      </DialogActions>
    </Dialog>
  );
}
