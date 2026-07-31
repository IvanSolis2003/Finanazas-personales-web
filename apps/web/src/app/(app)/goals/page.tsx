'use client';

import { useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  Button,
  Box,
  Chip,
  LinearProgress,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Alert,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useGroupStore } from '@/store/groupStore';
import { useMe } from '@/hooks/useAuth';
import {
  useGoals,
  useCreateGoal,
  useContributeGoal,
  useVoteGoal,
  useDeleteGoal,
  type Goal,
} from '@/hooks/useGoals';
import { formatCurrency } from '@/lib/format';

const STATUS: Record<string, { label: string; color: 'warning' | 'success' | 'error' | 'default' }> = {
  PENDING: { label: 'Pendiente de aprobación', color: 'warning' },
  APPROVED: { label: 'Aprobada', color: 'success' },
  REJECTED: { label: 'Rechazada', color: 'error' },
  POSTPONED: { label: 'Pospuesta', color: 'default' },
};

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
      <Typography variant="body2" color="text.secondary">
        Las metas deben ser <b>aprobadas por los miembros</b>. Cada <b>aporte</b> que registres se
        descuenta de tu disponible del mes.
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
  const { data: me } = useMe();
  const vote = useVoteGoal(groupId);
  const contribute = useContributeGoal(groupId);
  const del = useDeleteGoal(groupId);
  const [amount, setAmount] = useState('');

  const st = STATUS[goal.status];
  const pct = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
  const achieved = goal.savedAmount >= goal.targetAmount;
  const myVote = goal.votes.find((v) => v.userId === me?.id)?.vote;
  const approveCount = goal.votes.filter((v) => v.vote === 'APPROVE').length;
  const canDelete = goal.proposedById === me?.id;

  return (
    <Card variant="outlined">
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Typography fontWeight={700}>{goal.name}</Typography>
          <Chip size="small" label={st.label} color={st.color} />
        </Box>
        <Typography variant="caption" color="text.secondary">
          Objetivo {formatCurrency(goal.targetAmount)} · meta{' '}
          {new Date(goal.targetDate).toLocaleDateString('es-CL')}
        </Typography>

        {/* PENDIENTE: votación */}
        {goal.status === 'PENDING' && (
          <Box mt={1}>
            <Typography variant="caption" color="text.secondary" display="block">
              {approveCount} voto(s) a favor{myVote ? ` · tu voto: ${myVote}` : ''}
            </Typography>
            <Stack direction="row" spacing={1} mt={1}>
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={vote.isPending}
                onClick={() => vote.mutate({ goalId: goal.id, vote: 'APPROVE' })}
              >
                Aprobar
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={vote.isPending}
                onClick={() => vote.mutate({ goalId: goal.id, vote: 'REJECT' })}
              >
                Rechazar
              </Button>
              {canDelete && (
                <IconButton size="small" onClick={() => del.mutate(goal.id)} aria-label="Eliminar">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Box>
        )}

        {/* APROBADA: progreso + aporte */}
        {goal.status === 'APPROVED' && (
          <Box mt={1}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="caption" color="text.secondary">
                {formatCurrency(goal.savedAmount)} de {formatCurrency(goal.targetAmount)}
              </Typography>
              <Typography variant="caption" color={achieved ? 'success.main' : 'text.secondary'}>
                {pct}%{achieved ? ' 🎉' : ''}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={pct}
              color={achieved ? 'success' : 'primary'}
              sx={{ my: 1, height: 8, borderRadius: 4 }}
            />
            {contribute.isError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {contribute.error.message}
              </Alert>
            )}
            <Stack direction="row" spacing={1} mt={0.5}>
              <TextField
                size="small"
                type="number"
                label="Aportar (CLP)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                onClick={() =>
                  contribute.mutate(
                    { goalId: goal.id, amount: Number(amount) },
                    { onSuccess: () => setAmount('') },
                  )
                }
                disabled={contribute.isPending || !amount || Number(amount) <= 0}
              >
                Aportar
              </Button>
              {canDelete && (
                <IconButton size="small" onClick={() => del.mutate(goal.id)} aria-label="Eliminar">
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              )}
            </Stack>
          </Box>
        )}

        {/* RECHAZADA */}
        {goal.status === 'REJECTED' && canDelete && (
          <Box mt={1}>
            <Button size="small" color="error" onClick={() => del.mutate(goal.id)}>
              Eliminar meta rechazada
            </Button>
          </Box>
        )}
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
          <Alert severity="info">La meta quedará pendiente hasta que los miembros la aprueben.</Alert>
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
