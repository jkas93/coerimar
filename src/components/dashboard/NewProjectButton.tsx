'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function NewProjectButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Maintenance fields
  const [cliente, setCliente] = useState('');
  const [embarcacion, setEmbarcacion] = useState('');
  const [ordenCompra, setOrdenCompra] = useState('');
  const [fechaIngreso, setFechaIngreso] = useState('');
  const [cantAparejosReparar, setCantAparejosReparar] = useState(0);
  const [codigosAparejos, setCodigosAparejos] = useState('');
  const [cantRodamientosCambiar, setCantRodamientosCambiar] = useState(0);
  const [codigosRodamientos, setCodigosRodamientos] = useState('');
  const [cantCancamosCambiar, setCantCancamosCambiar] = useState(0);
  const [codigosCancamos, setCodigosCancamos] = useState('');
  const [cantPinesCambiar, setCantPinesCambiar] = useState(0);
  const [codigosPines, setCodigosPines] = useState('');

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
        cant_aparejos_reparar: cantAparejosReparar,
        codigos_aparejos: codigosAparejos,
        cant_rodamientos_cambiar: cantRodamientosCambiar,
        codigos_rodamientos: codigosRodamientos,
        cant_cancamos_cambiar: cantCancamosCambiar,
        codigos_cancamos: codigosCancamos,
        cant_pines_cambiar: cantPinesCambiar,
        codigos_pines: codigosPines,
      })
      .select()
      .single();

    if (insertError) {
      console.error(insertError);
      setError('Error al crear proyecto: ' + insertError.message);
      setLoading(false);
    } else {
      // 1. Add owner as admin
      await supabase.from('project_members').insert({
        project_id: data.id,
        user_id: user.id,
        role: 'admin',
      });

      // 2. Auto-generate maintenance stages (Gantt)
      const stages = [
        'INSPECCION VISUAL INICIAL',
        'DESMONTAJE DE APAREJOS',
        'ARENADO DE APAREJOS',
        'BASE EPOXICA INICIAL',
        'SOLDADO DE POLEAS',
        'MECANIZADO DE POLEAS',
        'BASE EPOXICA DE POLEAS',
        'SOLDADO DE CASCOS',
        'ESMERILADO DE CASCOS',
        'BASE EPOXICA DE CASCOS',
        'MECANIZADO O CAMBIO DE PINES',
        'CONTROL DE CALIDAD DE COMPONENTES',
        'ENSAMBLE DE APAREJOS DE IZAJE',
        'PINTURA Y PROTECCION DE APAREJO',
        'EMBALADO DE APAREJOS',
        'PRODUCTO TERMINADO'
      ];

      const { data: partida } = await supabase
        .from('partidas')
        .insert({ project_id: data.id, name: 'ETAPA DE MANTENIMIENTO', sort_order: 1 })
        .select()
        .single();

      if (partida) {
        const { data: item } = await supabase
          .from('items')
          .insert({ partida_id: partida.id, name: 'PROCESO', sort_order: 1 })
          .select()
          .single();

        if (item) {
          const taskPromises = stages.map((stage, index) => {
            return supabase.from('activities').insert({
              item_id: item.id,
              name: stage,
              start_date: calculatedStartDate,
              end_date: calculatedEndDate,
              sort_order: index + 1,
              weight: Number((100 / stages.length).toFixed(2))
            });
          });
          await Promise.all(taskPromises);
        }
      }

      setOpen(false);
      resetForm();
      router.refresh();
    }
  };

  const resetForm = () => {
    setCliente('');
    setEmbarcacion('');
    setOrdenCompra('');
    setFechaIngreso('');
    setCantAparejosReparar(0);
    setCodigosAparejos('');
    setCantRodamientosCambiar(0);
    setCodigosRodamientos('');
    setCantCancamosCambiar(0);
    setCodigosCancamos('');
    setCantPinesCambiar(0);
    setCodigosPines('');
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

          <div className="relative glass-card w-full max-w-2xl max-h-[95vh] flex flex-col fade-in shadow-2xl rounded-2xl overflow-hidden bg-white">
            <div className="px-8 py-6 shrink-0 border-b border-surface-200/5 bg-surface-50/50 flex items-center justify-between">
              <h2 className="text-xl font-black text-surface-200 uppercase tracking-wide">Nuevo Proyecto de Mantenimiento</h2>
              <button onClick={() => { setOpen(false); resetForm(); }} className="text-surface-200/50 hover:text-danger-500 transition-colors">
                 <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-8 overflow-y-auto custom-scrollbar flex-1">
              <form id="newProjectForm" onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-surface-200/40 mb-1 uppercase">Cliente</label>
                      <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} className="input-field py-2" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-surface-200/40 mb-1 uppercase">Embarcación *</label>
                      <input type="text" value={embarcacion} onChange={(e) => setEmbarcacion(e.target.value)} required className="input-field py-2" placeholder="Ej: Ribar I" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-surface-200/40 mb-1 uppercase">OC</label>
                      <input type="text" value={ordenCompra} onChange={(e) => setOrdenCompra(e.target.value)} className="input-field py-2" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-surface-200/40 mb-1 uppercase">Ingreso *</label>
                      <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} required className="input-field py-2" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-100/5 p-6 rounded-2xl border border-surface-200/5">
                  {/* Category: Aparejos */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-accent-400/70 uppercase tracking-widest">Aparejos a Reparar</label>
                    <input type="number" min="0" value={cantAparejosReparar} onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setCantAparejosReparar(val);
                    }} className="input-field py-1.5" placeholder="Cant" />
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {Array.from({ length: cantAparejosReparar }).map((_, i) => {
                        const codesArray = codigosAparejos ? codigosAparejos.split(',') : [];
                        return (
                          <input
                            key={i}
                            type="text"
                            placeholder={`A-${i + 1}`}
                            value={codesArray[i] || ''}
                            onChange={(e) => {
                              const newCodes = [...codesArray];
                              while (newCodes.length < cantAparejosReparar) newCodes.push('');
                              newCodes[i] = e.target.value;
                              setCodigosAparejos(newCodes.slice(0, cantAparejosReparar).join(','));
                            }}
                            className="input-field py-1 text-[9px]"
                          />
                        );
                      })}
                      {cantAparejosReparar === 0 && (
                        <p className="col-span-full text-[9px] text-surface-200/20 italic py-2">Sin códigos</p>
                      )}
                    </div>
                  </div>

                  {/* Category: Rodamientos */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-accent-400/70 uppercase tracking-widest">Rodamientos</label>
                    <input type="number" min="0" value={cantRodamientosCambiar} onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setCantRodamientosCambiar(val);
                    }} className="input-field py-1.5" placeholder="Cant" />
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {Array.from({ length: cantRodamientosCambiar }).map((_, i) => {
                        const codesArray = codigosRodamientos ? codigosRodamientos.split(',') : [];
                        return (
                          <input
                            key={i}
                            type="text"
                            placeholder={`R-${i + 1}`}
                            value={codesArray[i] || ''}
                            onChange={(e) => {
                              const newCodes = [...codesArray];
                              while (newCodes.length < cantRodamientosCambiar) newCodes.push('');
                              newCodes[i] = e.target.value;
                              setCodigosRodamientos(newCodes.slice(0, cantRodamientosCambiar).join(','));
                            }}
                            className="input-field py-1 text-[9px]"
                          />
                        );
                      })}
                      {cantRodamientosCambiar === 0 && (
                        <p className="col-span-full text-[9px] text-surface-200/20 italic py-2">Sin códigos</p>
                      )}
                    </div>
                  </div>

                  {/* Category: Cárcamos */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-accent-400/70 uppercase tracking-widest">Cárcamos</label>
                    <input type="number" min="0" value={cantCancamosCambiar} onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setCantCancamosCambiar(val);
                    }} className="input-field py-1.5" placeholder="Cant" />
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {Array.from({ length: cantCancamosCambiar }).map((_, i) => {
                        const codesArray = codigosCancamos ? codigosCancamos.split(',') : [];
                        return (
                          <input
                            key={i}
                            type="text"
                            placeholder={`C-${i + 1}`}
                            value={codesArray[i] || ''}
                            onChange={(e) => {
                              const newCodes = [...codesArray];
                              while (newCodes.length < cantCancamosCambiar) newCodes.push('');
                              newCodes[i] = e.target.value;
                              setCodigosCancamos(newCodes.slice(0, cantCancamosCambiar).join(','));
                            }}
                            className="input-field py-1 text-[9px]"
                          />
                        );
                      })}
                      {cantCancamosCambiar === 0 && (
                        <p className="col-span-full text-[9px] text-surface-200/20 italic py-2">Sin códigos</p>
                      )}
                    </div>
                  </div>

                  {/* Category: Pines */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-black text-accent-400/70 uppercase tracking-widest">Pines</label>
                    <input type="number" min="0" value={cantPinesCambiar} onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setCantPinesCambiar(val);
                    }} className="input-field py-1.5" placeholder="Cant" />
                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                      {Array.from({ length: cantPinesCambiar }).map((_, i) => {
                        const codesArray = codigosPines ? codigosPines.split(',') : [];
                        return (
                          <input
                            key={i}
                            type="text"
                            placeholder={`P-${i + 1}`}
                            value={codesArray[i] || ''}
                            onChange={(e) => {
                              const newCodes = [...codesArray];
                              while (newCodes.length < cantPinesCambiar) newCodes.push('');
                              newCodes[i] = e.target.value;
                              setCodigosPines(newCodes.slice(0, cantPinesCambiar).join(','));
                            }}
                            className="input-field py-1 text-[9px]"
                          />
                        );
                      })}
                      {cantPinesCambiar === 0 && (
                        <p className="col-span-full text-[9px] text-surface-200/20 italic py-2">Sin códigos</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 mt-6 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm font-medium">
                  {error}
                </div>
              )}
              </form>
            </div>
            
            <div className="px-8 py-6 shrink-0 border-t border-surface-200/5 bg-surface-50/50 flex gap-4 mt-auto">
              <button type="button" onClick={() => { setOpen(false); resetForm(); }} className="btn-secondary flex-1 py-3 text-sm font-bold uppercase tracking-widest rounded-xl">Cancelar</button>
              <button type="submit" form="newProjectForm" disabled={loading} className="btn-primary flex-1 py-3 text-sm font-bold uppercase tracking-widest rounded-xl flex items-center justify-center gap-2">
                {loading ? (<><span className="spinner border-2 border-primary-900 border-t-transparent rounded-full w-4 h-4 animate-spin" /><span>Procesando...</span></>) : (<span>Generar Proyecto</span>)}
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
