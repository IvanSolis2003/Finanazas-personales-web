'use client';

import {
  Stack,
  Typography,
  Card,
  CardContent,
  Box,
  IconButton,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import { useGroupStore } from '@/store/groupStore';
import { useRecurring, useDeleteRecurring } from '@/hooks/useRecurring';
import { formatCurrency, CATEGORY_LABELS } from '@/lib/format';

export default function RecurringPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: recurring, isLoading } = useRecurring(groupId);
  const del = useDeleteRecurring(groupId);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Gastos fijos
      </Typography>
      <Alert severity="info" icon={<AutorenewIcon />}>
        Los gastos fijos (como Internet, arriendo, etc.) se agregan{' '}
        <b>automáticamente cada mes</b>, sin que los cargues a mano. Para crear uno, marca la opción{' '}
        <b>“Gasto fijo”</b> al registrar un gasto.
      </Alert>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : recurring && recurring.length > 0 ? (
        <Stack spacing={1}>
          {recurring.map((r) => (
            <Card key={r.id} variant="outlined">
              <CardContent sx={{ display: 'flex', alignItems: 'center', '&:last-child': { pb: 2 } }}>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography fontWeight={600}>{r.description}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {CATEGORY_LABELS[r.category]} ·{' '}
                    {r.type === 'SHARED' ? 'Compartido' : 'Individual'}
                  </Typography>
                </Box>
                <Chip label="cada mes" size="small" color="primary" variant="outlined" sx={{ mr: 1 }} />
                <Typography fontWeight="bold" color="error.main" mr={0.5}>
                  {formatCurrency(r.amount)}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => del.mutate(r.id)}
                  disabled={del.isPending}
                  aria-label="Quitar gasto fijo"
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </CardContent>
            </Card>
          ))}
        </Stack>
      ) : (
        <Typography color="text.secondary" py={2}>
          Aún no tienes gastos fijos. Cuando registres un gasto, marca “Gasto fijo” para que se
          repita cada mes.
        </Typography>
      )}

      <Typography variant="caption" color="text.secondary">
        Quitar un gasto fijo detiene las futuras repeticiones; los gastos ya generados se conservan.
      </Typography>
    </Stack>
  );
}
