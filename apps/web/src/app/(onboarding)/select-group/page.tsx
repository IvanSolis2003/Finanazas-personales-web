'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  CircularProgress,
  Box,
} from '@mui/material';
import GroupsIcon from '@mui/icons-material/Groups';
import AddIcon from '@mui/icons-material/Add';
import LoginIcon from '@mui/icons-material/Login';
import { useMyGroups } from '@/hooks/useGroups';
import { useGroupStore, type Group } from '@/store/groupStore';
import { useLogout } from '@/hooks/useAuth';

export default function SelectGroupPage() {
  const router = useRouter();
  const { data: memberships, isLoading } = useMyGroups();
  const setCurrentGroup = useGroupStore((s) => s.setCurrentGroup);
  const logout = useLogout();

  function pick(group: Group) {
    setCurrentGroup(group);
    router.replace('/dashboard');
  }

  return (
    <Card elevation={3}>
      <CardContent sx={{ p: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
          <GroupsIcon color="primary" />
          <Typography variant="h5" fontWeight="bold">
            Tus grupos
          </Typography>
        </Stack>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Elige un grupo para continuar, o crea/únete a uno.
        </Typography>

        {isLoading ? (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress />
          </Box>
        ) : memberships && memberships.length > 0 ? (
          <List>
            {memberships.map(({ group }) => (
              <ListItemButton key={group.id} onClick={() => pick(group)} divider>
                <ListItemText primary={group.name} secondary={`#${group.inviteCode}`} />
              </ListItemButton>
            ))}
          </List>
        ) : (
          <Typography variant="body2" color="text.secondary" py={2}>
            Aún no perteneces a ningún grupo.
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.5}>
          <Button component={Link} href="/create-group" variant="contained" startIcon={<AddIcon />}>
            Crear un grupo
          </Button>
          <Button component={Link} href="/join-group" variant="outlined" startIcon={<LoginIcon />}>
            Unirme con código
          </Button>
          <Button onClick={() => logout.mutate()} color="error" variant="text">
            Cerrar sesión
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
