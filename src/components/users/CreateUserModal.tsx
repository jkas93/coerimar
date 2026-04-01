'use client';

import { useState } from 'react';
import { createUser, toggleSuperadmin, deleteUser } from '@/app/actions/users';
import { useRouter } from 'next/navigation';

export function CreateUserModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<{ email: string, psw: string } | null>(null);
  const router = useRouter();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    isSuperadmin: false
  });

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const result = await createUser(formData);
      if (result.success) {
        setSuccessMsg({ email: result.email!, psw: result.tempPassword! });
        setFormData({ fullName: '', email: '', isSuperadmin: false });
        // The modal stays open to show the password. 
        // We shouldn't close it instantly.
      }
    } catch (err: any) {
      setError(err.message || "Ocurrió un error inesperado al crear el usuario.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-surface-900 border border-surface-700/50 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative fade-in">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-surface-800 bg-surface-800/50">
          <h3 className="text-lg font-bold text-surface-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Nuevo Personal
          </h3>
          <button 
            onClick={() => {
               setSuccessMsg(null); 
               onClose(); 
            }} 
            className="text-surface-400 hover:text-surface-100 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6">
          {successMsg ? (
            <div className="bg-success-400/10 border border-success-400/20 p-5 rounded-xl text-center fade-in">
              <div className="w-12 h-12 bg-success-400/20 text-success-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
              </div>
              <h4 className="text-lg font-bold text-success-300 mb-2">¡Usuario Creado!</h4>
              <p className="text-sm text-surface-200 mb-4">Entrega estas credenciales a <strong>{successMsg.email}</strong> para que inicie sesión. Recomiéndale cambiarlas en su perfil.</p>
              
              <div className="bg-surface-950 p-4 rounded-lg font-mono text-center flex flex-col gap-2">
                <p className="text-xs text-surface-400 uppercase tracking-widest">Contraseña Temporal</p>
                <div className="text-xl font-bold text-accent-400 tracking-wider select-all">{successMsg.psw}</div>
              </div>

              <button 
                onClick={() => { setSuccessMsg(null); onClose(); }}
                className="btn-primary w-full mt-6"
              >
                Entendido, Cerrar
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-black text-surface-200 uppercase tracking-widest mb-2">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                  className="input-field"
                  placeholder="Ej. Ing. Carlos Romero"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-surface-200 uppercase tracking-widest mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="input-field"
                  placeholder="ejemplo@coerimar.com"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-surface-700/50 bg-surface-800/20 hover:bg-surface-800/50 transition-colors group">
                  <div className="relative flex items-center">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={formData.isSuperadmin}
                      onChange={(e) => setFormData({...formData, isSuperadmin: e.target.checked})}
                    />
                    <div className={`w-10 h-6 bg-surface-950 rounded-full border transition-colors ${formData.isSuperadmin ? 'border-danger-500' : 'border-surface-600'}`}></div>
                    <div className={`absolute left-1 top-1 bg-surface-400 w-4 h-4 rounded-full transition-transform ${formData.isSuperadmin ? 'translate-x-4 bg-danger-400' : ''}`}></div>
                  </div>
                  <div>
                    <span className={`block text-sm font-bold ${formData.isSuperadmin ? 'text-danger-400' : 'text-surface-100'}`}>Otorgar Modo Dios (Superadmin)</span>
                    <span className="block text-[10px] text-surface-400">Tendrá acceso global e ilimitado para ver y editar todo.</span>
                  </div>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-danger-500/10 border border-danger-500/20 rounded-lg text-danger-400 text-xs">
                  {error}
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={onClose} className="btn-secondary text-sm px-4">
                  Cancelar
                </button>
                <button type="submit" disabled={loading} className="btn-primary text-sm px-6">
                  {loading ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
