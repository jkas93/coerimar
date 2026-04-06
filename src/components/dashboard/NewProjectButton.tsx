'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { initializeMaintenanceStages } from '@/lib/utils/initMaintenanceProject';

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Clean Maintenance fields (No Legacy CSV)
  const [cliente, setCliente] = useState('');
  const [embarcacion, setEmbarcacion] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');

  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Sesión no encontrada');
      setLoading(false);
      return;
    }

    // Let's self-heal their profile just in case before inserting.
    await supabase.from('profiles').upsert({ id: user.id });

    const calculatedStartDate = fechaIngreso || new Date().toISOString().split('T')[0];
    const calculatedEndDate = new Date(new Date(calculatedStartDate).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const computedName = embarcacion ? `Mantenimiento ${embarcacion}` : 'Nuevo Proyecto';

    const { data, error: insertError } = await supabase
      .from('projects')
      .insert({
        name: computedName,
        description: null,
        start_date: calculatedStartDate,
        end_date: calculatedEndDate,
        owner_id: user.id,
        cliente,
        embarcacion,
        orden_compra: ordenCompra,
        fecha_ingreso: fechaIngreso || null,
        cant_productos: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      setError('Error al crear proyecto: ' + insertError.message);
      setLoading(false);
    } else {
      try {
        // 1. Add owner as admin
        await supabase.from('project_members').insert({
          project_id: data.id,
          user_id: user.id,
          role: 'admin',
        });

        // 2. Auto-generate the 17 constant maintenance stages via the utility
        await initializeMaintenanceStages(data.id, calculatedStartDate);

        setOpen(false);
        resetForm();
        router.refresh();
      } catch (err: any) {
        console.error(err);
        setError('Error al inicializar las etapas: ' + err.message);
        setLoading(false);
      }
    }
  };

  const resetForm = () => {
    setCliente('');
    setEmbarcacion('');
    setOrdenCompra('');
    setFechaIngreso('');
    setError(null);
    setLoading(false);
  };

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        Nuevo Proyecto
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-all"
            onClick={() => { setOpen(false); resetForm(); }}
          />

          <div className="relative glass-card w-full max-w-xl flex flex-col fade-in shadow-2xl rounded-2xl overflow-hidden bg-white">
            <div className="px-8 py-6 shrink-0 border-b border-surface-200/5 bg-surface-50/50 flex items-center justify-between">
              <h2 className="text-xl font-black text-surface-200 uppercase tracking-wide">Nuevo Proyecto de Mantenimiento</h2>
              <button onClick={() => { setOpen(false); resetForm(); }} className="text-surface-200/50 hover:text-danger-500 transition-colors">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8">
              <form id="newProjectForm" onSubmit={handleSubmit} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-surface-200/50 mb-1 uppercase tracking-wider">Cliente</label>
                    <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} className="w-full text-sm font-medium bg-surface-100/5 px-4 py-2.5 rounded-xl border border-surface-200/20 focus:border-accent-400 outline-none transition-all text-surface-100" placeholder="Nombre de la empresa" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-surface-200/50 mb-1 uppercase tracking-wider">Embarcación *</label>
                    <input type="text" value={embarcacion} onChange={(e) => setEmbarcacion(e.target.value)} required className="w-full text-sm font-medium bg-surface-100/5 px-4 py-2.5 rounded-xl border border-surface-200/20 focus:border-accent-400 outline-none transition-all text-surface-100" placeholder="Ej: Ribar I" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-surface-200/50 mb-1 uppercase tracking-wider">O.C.</label>
                    <input type="text" value={ordenCompra} onChange={(e) => setOrdenCompra(e.target.value)} className="w-full text-sm font-medium bg-surface-100/5 px-4 py-2.5 rounded-xl border border-surface-200/20 focus:border-accent-400 outline-none transition-all text-surface-100" placeholder="Orden de Compra" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-surface-200/50 mb-1 uppercase tracking-wider">Fecha Ingreso *</label>
                    <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} required className="w-full text-sm font-medium bg-surface-100/5 px-4 py-2.5 rounded-xl border border-surface-200/20 focus:border-accent-400 outline-none transition-all text-surface-100" />
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-accent-400/5 border border-accent-400/20">
                  <p className="text-xs text-accent-700 font-medium">Nota: Al crear el proyecto se generará automáticamente la estructura completa con las 17 etapas oficiales de mantenimiento P.U.L.S.O. Podrás agregar los productos a procesar desde el panel del proyecto.</p>
                </div>

                {error && (
                  <div className="p-4 mt-6 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm font-medium">
                    {error}
                  </div>
                )}
              </form>
            </div>
            
            <div className="px-8 py-6 shrink-0 border-t border-surface-200/5 bg-surface-50/50 flex gap-4 mt-auto">
              <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="btn-secondary flex-1 py-3 text-sm font-bold uppercase tracking-widest rounded-xl hover:bg-surface-200/10 transition-colors">Cancelar</button>
              <button type="submit" form="newProjectForm" disabled={loading} className="btn-primary flex-1 py-3 text-sm font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                {loading ? (<><span className="spinner border-2 border-primary-900 border-t-transparent rounded-full w-4 h-4 animate-spin" /><span>Configurando...</span></>) : (<span>Generar Proyecto</span>)}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
