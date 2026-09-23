import { requireAdminPage } from '@/lib/supabase/admin-check';
import { AdminDashboard } from '@/components/AdminDashboard';

/** Pagina dedicata all'importazione (riusa la dashboard, anchor alla sezione import). */
export default async function PvpPage() {
  await requireAdminPage();
  return <AdminDashboard />;
}
