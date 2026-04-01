'use client';

import { useState } from 'react';
import { CreateUserModal } from './CreateUserModal';
import { toggleSuperadmin, deleteUser } from '@/app/actions/users';

interface UserProfile {
  id: string;
  email?: string;
  full_name?: string | null;
  avatar_url?: string | null;
  is_superadmin?: boolean;
}

export function UsersTable({ initialProfiles, currentUser }: { initialProfiles: UserProfile[], currentUser: any }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`¿Estás seguro de ${currentStatus ? 'quitarle' : 'darle'} permisos de Superadmin a este usuario?`)) return;
    
    setLoadingId(userId);
    try {
      await toggleSuperadmin(userId, !currentStatus);
      setProfiles(profiles.map(p => p.id === userId ? { ...p, is_superadmin: !currentStatus } : p));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  const handleDelete = async (userId: string, email: string) => {
    if (!window.confirm(`⚠️ PELIGRO: ¿Estás seguro de eliminar PERMANENTEMENTE a ${email}? No se puede deshacer.`)) return;
    
    setLoadingId(userId);
    try {
      await deleteUser(userId);
      setProfiles(profiles.filter(p => p.id !== userId));
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between bg-surface-800/20 p-4 rounded-xl border border-surface-700/50 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-500/10 flex items-center justify-center text-accent-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-surface-100">Directorio de Equipo</h2>
            <p className="text-[10px] text-surface-400">Panel de Control de Nivel Dios</p>
          </div>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="btn-primary text-sm flex items-center gap-2 px-5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Añadir Miembro
        </button>
      </div>

      <div className="overflow-x-auto border border-surface-700/50 rounded-2xl bg-surface-900 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-800/80 text-[10px] font-black text-surface-200 uppercase tracking-widest border-b border-surface-700/50">
              <th className="p-4 pl-6">Usuario</th>
              <th className="p-4">Credenciales</th>
              <th className="p-4 text-center">Nivel de Acceso</th>
              <th className="p-4 text-right pr-6">Acciones Administrativas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-800/50">
            {profiles.map((p) => {
              const isAdmin = p.is_superadmin === true;
              const isMe = p.id === currentUser?.id;
              
              return (
                <tr key={p.id} className="hover:bg-surface-800/20 transition-colors group">
                  <td className="p-4 pl-6">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs uppercase shadow-inner border border-white/5 ${isAdmin ? 'bg-danger-500/20 text-danger-400 border-danger-500/20' : 'bg-surface-700 text-surface-200'}`}>
                        {p.full_name?.charAt(0) || p.email?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-surface-100 flex items-center gap-2">
                          {p.full_name || 'Sin Nombre'}
                          {isMe && <span className="bg-accent-500/20 text-accent-400 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Tú</span>}
                        </p>
                        <p className="text-[10px] text-surface-400 font-mono mt-0.5">{p.id.split('-')[0]}...</p>
                      </div>
                    </div>
                  </td>
                  
                  <td className="p-4">
                    <p className="text-sm text-surface-200">{p.email || 'Correo oculto'}</p>
                  </td>

                  <td className="p-4 text-center">
                    <div className="inline-flex items-center justify-center">
                      <span className={`text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full border ${isAdmin ? 'bg-danger-500/10 text-danger-500 border-danger-500/20' : 'bg-surface-800 text-surface-400 border-surface-700'}`}>
                        {isAdmin ? '🛡️ Modo Dios' : 'Estándar'}
                      </span>
                    </div>
                  </td>

                  <td className="p-4 text-right pr-6">
                    {loadingId === p.id ? (
                      <span className="spinner w-5 h-5 inline-block"></span>
                    ) : (
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!isMe && (
                          <>
                            <button 
                              onClick={() => handleToggle(p.id, !!p.is_superadmin)}
                              className={`text-xs px-3 py-1.5 rounded-md border font-bold transition-all ${isAdmin ? 'bg-surface-800 text-surface-200 border-surface-700 hover:bg-surface-700/80 hover:text-white' : 'bg-danger-500/10 text-danger-400 border-danger-500/20 hover:bg-danger-500/20 hover:text-danger-300'}`}
                            >
                              {isAdmin ? 'Quitar Modo Dios' : 'Volver Superadmin'}
                            </button>
                            
                            <button 
                              onClick={() => handleDelete(p.id, p.email || 'usuario')}
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-danger-500/10 text-danger-400 hover:bg-danger-500 hover:text-white transition-colors border border-danger-500/20"
                              title="Eliminar Cuenta"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                        {isMe && (
                          <span className="text-[10px] text-surface-400 uppercase tracking-widest">(Intocable)</span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {profiles.length === 0 && (
          <div className="p-8 text-center text-sm text-surface-400">
            Cargando directorio...
          </div>
        )}
      </div>

      <CreateUserModal isOpen={isModalOpen} onClose={() => {
        setIsModalOpen(false);
        // We can window.location.reload() to fetch newly created users easily
        window.location.reload(); 
      }} />
    </>
  );
}
