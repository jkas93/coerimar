import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';
import { UsersTable } from '@/components/users/UsersTable';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_superadmin) {
    redirect('/dashboard');
  }

  // FUSIONAMOS la tabla secreta de Auth con tus perfiles públicos
  const admin = createAdminClient();
  
  // 1. Conseguimos todos los correos e info oculta desde el núcleo
  const { data: authData, error: authError } = await admin.auth.admin.listUsers();
  
  if (authError) {
    console.error("Error fetching auth users:", authError);
  }

  // 2. Conseguimos las configuraciones de Dios desde tu tabla profiles
  const { data: profilesData } = await admin
    .from('profiles')
    .select('id, is_superadmin')
    .order('created_at', { ascending: false });

  // 3. Mezclamos ambos mundos en un solo arreglo rico en datos
  const profiles = authData?.users.map((u: any) => {
    const p = profilesData?.find((profile: any) => profile.id === u.id);
    return {
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || null,
      is_superadmin: p?.is_superadmin || false,
    };
  }) || [];

  return (
    <div className="p-8 max-w-7xl mx-auto fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-surface-100">Gestión de Personal</h1>
          <p className="text-sm text-surface-200/60 mt-1">
            Módulo Administrativo P.U.L.S.O. - Creación y control de accesos.
          </p>
        </div>
      </div>
      
      <UsersTable initialProfiles={profiles || []} currentUser={user} />
    </div>
  );
}
