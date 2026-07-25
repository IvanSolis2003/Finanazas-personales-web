import { redirect } from 'next/navigation';
import { Box } from '@mui/material';
import { getSessionUserId } from '@/lib/auth';

// Área autenticada previa a elegir grupo (select/create/join).
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) redirect('/login');

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        bgcolor: 'background.default',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 480 }}>{children}</Box>
    </Box>
  );
}
