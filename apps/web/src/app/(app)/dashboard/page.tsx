'use client';

import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useGroupStore } from '@/store/groupStore';
import { useSummary } from '@/hooks/useGroupData';
import { useAlerts, useMarkAlertsRead } from '@/hooks/useMisc';
import { formatCurrency, ALERT_COLORS } from '@/lib/format';

export default function DashboardPage() {
  const router = useRouter();
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: summary, isLoading } = useSummary(groupId);
  const { data: alerts } = useAlerts(groupId);
  const markRead = useMarkAlertsRead(groupId);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Resumen del mes
      </Typography>

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : summary ? (
        <>
          <Card sx={{ bgcolor: '#E3F2FD' }}>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                Disponible este mes
              </Typography>
              <Typography
                variant="h4"
                fontWeight="bold"
                color={summary.available >= 0 ? 'primary' : 'error'}
              >
                {formatCurrency(summary.available)}
              </Typography>
            </CardContent>
          </Card>

          <Stack direction="row" spacing={2}>
            <Card sx={{ flex: 1, bgcolor: '#E8F5E9' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Ingresos
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="success.main">
                  {formatCurrency(summary.totalIncome)}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, bgcolor: '#FFEBEE' }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  Gastos
                </Typography>
                <Typography variant="h6" fontWeight="bold" color="error.main">
                  {formatCurrency(summary.totalExpenses)}
                </Typography>
              </CardContent>
            </Card>
          </Stack>

          {summary.goals.length > 0 && (
            <Card>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Metas de ahorro
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {summary.goals.map((g) => (
                    <Chip
                      key={g.id}
                      label={`${g.name}: ${Math.round((g.savedAmount / g.targetAmount) * 100)}%`}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          {alerts && alerts.length > 0 && (
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="subtitle2">Alertas</Typography>
                  <Button size="small" onClick={() => markRead.mutate()} disabled={markRead.isPending}>
                    Marcar leídas
                  </Button>
                </Box>
                <Stack spacing={0.5}>
                  {alerts.slice(0, 5).map((a) => (
                    <Chip
                      key={a.id}
                      label={a.message}
                      sx={{
                        justifyContent: 'flex-start',
                        bgcolor: (ALERT_COLORS[a.type] ?? '#1976D2') + '22',
                        color: ALERT_COLORS[a.type] ?? '#1976D2',
                        height: 'auto',
                        py: 0.5,
                        '& .MuiChip-label': { whiteSpace: 'normal' },
                      }}
                    />
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}

          <Button variant="outlined" startIcon={<SwapHorizIcon />} onClick={() => router.push('/balance')}>
            Ver balance entre miembros
          </Button>
        </>
      ) : (
        <Typography color="text.secondary">No se pudo cargar el resumen.</Typography>
      )}
    </Stack>
  );
}
