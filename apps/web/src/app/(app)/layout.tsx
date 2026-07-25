import { redirect } from 'next/navigation';
import { getSessionUserId } from '@/lib/auth';
import { AppShell } from '@/components/AppShell';

// Área principal autenticada (requiere sesión; el grupo activo se valida en el
// cliente vía AppShell porque vive en localStorage).
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const userId = await getSessionUserId();
  if (!userId) redirect('/login');

  return <AppShell>{children}</AppShell>;
}
