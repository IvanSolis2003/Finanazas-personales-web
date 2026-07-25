'use client';

import {
  Stack,
  Typography,
  Card,
  CardContent,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Switch,
  Chip,
  Alert,
} from '@mui/material';
import { useAdminUsers, useSetApproval } from '@/hooks/useAdmin';

// Gestión de usuarios — link exclusivo del admin dentro de la app normal.
export default function UsersAdminPage() {
  const { data: users, isLoading, isError, error } = useAdminUsers();
  const setApproval = useSetApproval();

  const pending = users?.filter((u) => !u.isApproved).length ?? 0;

  return (
    <Stack spacing={2}>
      <Typography variant="h5" fontWeight="bold" color="primary">
        Administrar usuarios
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Habilita o deshabilita el acceso de cada cuenta. Los datos financieros de cada usuario son
        privados y no se muestran aquí.
      </Typography>

      {isError && <Alert severity="error">{(error as Error).message}</Alert>}
      {pending > 0 && (
        <Alert severity="warning">{pending} cuenta(s) pendiente(s) de aprobación.</Alert>
      )}
      {setApproval.isError && <Alert severity="error">{setApproval.error.message}</Alert>}

      <Card variant="outlined">
        <CardContent sx={{ overflowX: 'auto' }}>
          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell align="center">Rol</TableCell>
                  <TableCell align="center">Habilitado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users?.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell align="center">
                      {u.isAdmin ? <Chip size="small" color="primary" label="Admin" /> : 'Usuario'}
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        checked={u.isApproved}
                        disabled={setApproval.isPending}
                        onChange={(e) =>
                          setApproval.mutate({ id: u.id, isApproved: e.target.checked })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Stack>
  );
}
