'use client';

import { useEffect, useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  MenuItem,
  Alert,
  List,
  ListItem,
  ListItemText,
  Chip,
} from '@mui/material';
import { useGroupStore } from '@/store/groupStore';
import { useGroupDetail } from '@/hooks/useGroupData';
import { useUpdateGroupConfig } from '@/hooks/useMisc';
import { formatCurrency } from '@/lib/format';

export default function SettingsPage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const setCurrentGroup = useGroupStore((s) => s.setCurrentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: group } = useGroupDetail(groupId);
  const updateConfig = useUpdateGroupConfig(groupId);

  const [name, setName] = useState('');
  const [approvalMode, setApprovalMode] = useState<'MAJORITY' | 'UNANIMOUS'>('MAJORITY');
  const [threshold, setThreshold] = useState('');

  useEffect(() => {
    if (group) {
      setName(group.name);
      setApprovalMode(group.approvalMode);
      setThreshold(String(group.personalThreshold));
    }
  }, [group]);

  function save() {
    updateConfig.mutate(
      { name: name.trim(), approvalMode, personalThreshold: Number(threshold) },
      {
        onSuccess: () => {
          if (currentGroup) {
            setCurrentGroup({
              ...currentGroup,
              name: name.trim(),
              approvalMode,
              personalThreshold: Number(threshold),
            });
          }
        },
      },
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Configuración del grupo
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="caption" color="text.secondary">
            Código de invitación
          </Typography>
          <Typography variant="h6" fontFamily="monospace" letterSpacing={2}>
            {group?.inviteCode ?? '…'}
          </Typography>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Ajustes (solo admin)
          </Typography>
          {updateConfig.isError && (
            <Alert severity="error" sx={{ mb: 1 }}>{updateConfig.error.message}</Alert>
          )}
          {updateConfig.isSuccess && (
            <Alert severity="success" sx={{ mb: 1 }}>Configuración guardada.</Alert>
          )}
          <Stack spacing={1.5}>
            <TextField label="Nombre del grupo" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
            <TextField
              select
              label="Modo de aprobación"
              value={approvalMode}
              onChange={(e) => setApprovalMode(e.target.value as 'MAJORITY' | 'UNANIMOUS')}
              fullWidth
            >
              <MenuItem value="MAJORITY">Mayoría</MenuItem>
              <MenuItem value="UNANIMOUS">Unanimidad</MenuItem>
            </TextField>
            <TextField
              label="Umbral personal (CLP)"
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              helperText="Bajo este monto, una propuesta se considera personal."
              fullWidth
            />
            <Button variant="contained" onClick={save} disabled={updateConfig.isPending}>
              Guardar
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Miembros ({group?.members.length ?? 0})
          </Typography>
          <List dense>
            {group?.members.map((m) => (
              <ListItem
                key={m.id}
                secondaryAction={
                  m.salaryVisible ? (
                    <Chip size="small" label={formatCurrency(m.monthlySalary)} />
                  ) : null
                }
              >
                <ListItemText
                  primary={m.user.name}
                  secondary={m.role === 'ADMIN' ? 'Administrador' : 'Miembro'}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Stack>
  );
}
