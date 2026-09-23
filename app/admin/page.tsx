import { requireAdminPage } from '@/lib/supabase/admin-check';
import { AdminDashboard } from '@/components/AdminDashboard';

export default async function AdminPage() {
  await requireAdminPage();
  return <AdminDashboard />;
}
