'use client';

import { useEffect, useState } from 'react';
import {
  Stack,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  FormControlLabel,
  Switch,
  Alert,
  Divider,
} from '@mui/material';
import { useGroupStore } from '@/store/groupStore';
import { useMe, useLogout } from '@/hooks/useAuth';
import { useGroupDetail } from '@/hooks/useGroupData';
import { useUpdateSalary } from '@/hooks/useMisc';
import { formatCurrency } from '@/lib/format';

export default function ProfilePage() {
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const groupId = currentGroup?.id ?? '';
  const { data: me } = useMe();
  const { data: group } = useGroupDetail(groupId);
  const updateSalary = useUpdateSalary(groupId);
  const logout = useLogout();

  const myMember = group?.members.find((m) => m.userId === me?.id);
  const [salary, setSalary] = useState('');
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (myMember) {
      setSalary(String(myMember.monthlySalary));
      setVisible(myMember.salaryVisible);
    }
  }, [myMember]);

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Mi perfil
      </Typography>

      <Card variant="outlined">
        <CardContent>
          <Typography fontWeight={600}>{me?.name}</Typography>
          <Typography variant="body2" color="text.secondary">
            {me?.email}
          </Typography>
          {myMember && (
            <Typography variant="caption" color="text.secondary">
              Rol en {currentGroup?.name}: {myMember.role === 'ADMIN' ? 'Administrador' : 'Miembro'}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>
            Mi sueldo mensual en este grupo
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Se usa para calcular el disponible del grupo. Actual: {formatCurrency(myMember?.monthlySalary ?? 0)}
          </Typography>
          {updateSalary.isError && (
            <Alert severity="error" sx={{ my: 1 }}>{updateSalary.error.message}</Alert>
          )}
          {updateSalary.isSuccess && (
            <Alert severity="success" sx={{ my: 1 }}>Sueldo actualizado.</Alert>
          )}
          <Stack spacing={1.5} mt={1}>
            <TextField
              label="Sueldo mensual (CLP)"
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              fullWidth
            />
            <FormControlLabel
              control={<Switch checked={visible} onChange={(e) => setVisible(e.target.checked)} />}
              label="Visible para otros miembros"
            />
            <Button
              variant="contained"
              onClick={() =>
                updateSalary.mutate({ monthlySalary: Number(salary), salaryVisible: visible })
              }
              disabled={updateSalary.isPending}
            >
              Guardar sueldo
            </Button>
          </Stack>
        </CardContent>
      </Card>

      <Divider />
      <Button color="error" variant="outlined" onClick={() => logout.mutate()}>
        Cerrar sesión
      </Button>
    </Stack>
  );
}
