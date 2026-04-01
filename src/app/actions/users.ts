'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Middleware privado para chequear permisos
async function requireSuperadmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No autenticado");

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_superadmin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_superadmin) {
    throw new Error("Acceso Denegado. Se requieren permisos de Superadmin.");
  }
  return user;
}

export async function createUser(data: { email: string; fullName: string; isSuperadmin: boolean }) {
  await requireSuperadmin();
  
  const admin = createAdminClient();
  
  // Generar contraseña provisional fuerte de 8 caracteres
  const tempPassword = Math.random().toString(36).slice(-6).toUpperCase() + "x1!"; 
  
  // 1. Crear usuario bypassing auth constraints
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: data.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      full_name: data.fullName,
    }
  });

  if (authError) {
    throw new Error(authError.message);
  }

  const userId = authData.user.id;
  
  // 2. Darle unas milésimas para que Trigger (handle_new_user) termine de insertar el profile
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 3. Forzar nivel de Superadmin si fue checkeado
  if (data.isSuperadmin) {
    await admin.from('profiles').update({ is_superadmin: true }).eq('id', userId);
  }

  revalidatePath('/users');
  
  return { success: true, tempPassword, email: authData.user.email };
}

export async function toggleSuperadmin(targetUserId: string, newStatus: boolean) {
  const currentUser = await requireSuperadmin();
  
  if (currentUser.id === targetUserId) {
    throw new Error("Seguridad: No puedes modificar tus propios permisos maestros.");
  }

  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ is_superadmin: newStatus }).eq('id', targetUserId);
  
  if (error) throw new Error(error.message);
  
  revalidatePath('/users');
  return { success: true };
}

export async function deleteUser(targetUserId: string) {
  const currentUser = await requireSuperadmin();
  if (currentUser.id === targetUserId) {
    throw new Error("Seguridad: No puedes eliminar tu propia cuenta.");
  }

  const admin = createAdminClient();
  // Esto elimina la cuenta de Autenticación, lo cual por llave foránea (CASCADE) 
  // debería también borrar el registro en profiles o dejarlo inaccesible.
  const { error } = await admin.auth.admin.deleteUser(targetUserId);
  
  if (error) throw new Error(error.message);
  
  // Opcional: limpiar manualmente profile si no hay CASCADE, pero lo normal es que sí lo hay
  await admin.from('profiles').delete().eq('id', targetUserId);
  
  revalidatePath('/users');
  return { success: true };
}
