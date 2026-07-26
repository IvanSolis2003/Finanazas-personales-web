'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Tabs,
  Tab,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useGroupStore } from '@/store/groupStore';
import { useLogout, useMe } from '@/hooks/useAuth';

const TABS = [
  { label: 'Inicio', href: '/dashboard' },
  { label: 'Gastos', href: '/expenses' },
  { label: 'Propuestas', href: '/proposals' },
  { label: 'Metas', href: '/goals' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentGroup = useGroupStore((s) => s.currentGroup);
  const logout = useLogout();
  const { data: me } = useMe();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const [hydrated, setHydrated] = useState(false);

  // Esperar a que Zustand rehidrate desde localStorage antes de decidir.
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && !currentGroup) router.replace('/select-group');
  }, [hydrated, currentGroup, router]);

  if (!hydrated || !currentGroup) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const activeTab = TABS.findIndex((t) => pathname.startsWith(t.href));

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <Box
            component="img"
            src="/logo_2.png"
            alt="Iasmtech"
            sx={{ height: 38, width: 38, mr: 1.5, borderRadius: 1.5, objectFit: 'contain' }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" fontWeight="bold" lineHeight={1.1}>
              {currentGroup.name}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              #{currentGroup.inviteCode}
            </Typography>
          </Box>
          <IconButton color="inherit" onClick={(e) => setAnchor(e.currentTarget)}>
            <MoreVertIcon />
          </IconButton>
          <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
            <MenuItem onClick={() => { setAnchor(null); router.push('/balance'); }}>
              Balance entre miembros
            </MenuItem>
            <MenuItem onClick={() => { setAnchor(null); router.push('/metrics'); }}>
              Métricas por mes
            </MenuItem>
            <MenuItem onClick={() => { setAnchor(null); router.push('/budgets'); }}>
              Presupuestos
            </MenuItem>
            <MenuItem onClick={() => { setAnchor(null); router.push('/settings'); }}>
              Configuración del grupo
            </MenuItem>
            <MenuItem onClick={() => { setAnchor(null); router.push('/profile'); }}>
              Mi perfil / sueldo
            </MenuItem>
            <MenuItem onClick={() => { setAnchor(null); router.push('/select-group'); }}>
              Cambiar de grupo
            </MenuItem>
            {me?.isAdmin && (
              <MenuItem onClick={() => { setAnchor(null); router.push('/users'); }} sx={{ color: 'primary.main' }}>
                Administrar usuarios
              </MenuItem>
            )}
            <MenuItem onClick={() => { setAnchor(null); logout.mutate(); }} sx={{ color: 'error.main' }}>
              Cerrar sesión
            </MenuItem>
          </Menu>
        </Toolbar>
        <Tabs
          value={activeTab === -1 ? false : activeTab}
          variant="fullWidth"
          textColor="inherit"
          indicatorColor="secondary"
        >
          {TABS.map((t) => (
            <Tab key={t.href} label={t.label} onClick={() => router.push(t.href)} />
          ))}
        </Tabs>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
