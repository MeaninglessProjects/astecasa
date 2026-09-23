import { requireAdminPage } from '@/lib/supabase/admin-check';
import { ContactsManager } from '@/components/ContactsManager';

export default async function AdminContactsPage() {
  await requireAdminPage();
  return <ContactsManager />;
}
