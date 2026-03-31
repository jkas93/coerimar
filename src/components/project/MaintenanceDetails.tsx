'use client';

import React, { useState } from 'react';
import type { Project, DailyProgress } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  project: Project;
  dailyProgress: DailyProgress[];
}

export function MaintenanceDetails({ project, dailyProgress }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cliente: project.cliente || '',
    embarcacion: project.embarcacion || '',
    orden_compra: project.orden_compra || '',
    fecha_ingreso: project.fecha_ingreso || '',
    cant_aparejos_reparar: project.cant_aparejos_reparar || 0,
    codigos_aparejos: project.codigos_aparejos || '',
    cant_rodamientos_cambiar: project.cant_rodamientos_cambiar || 0,
    codigos_rodamientos: project.codigos_rodamientos || '',
    cant_cancamos_cambiar: project.cant_cancamos_cambiar || 0,
    codigos_cancamos: project.codigos_cancamos || '',
    cant_pines_cambiar: project.cant_pines_cambiar || 0,
    codigos_pines: project.codigos_pines || '',
  });

  const supabase = createClient();
  const router = useRouter();

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return format(parseISO(dateStr), 'PPP', { locale: es });
    } catch {
      return dateStr;
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update(formData)
        .eq('id', project.id);

      if (error) throw error;
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      console.error('Error saving maintenance details:', err);
      alert('Error al guardar los cambios');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Math.max(0, parseInt(value) || 0) : value
    }));
  };

  const DisplayField = ({ label, value, name, type = "text" }: { label: string, value: string | number | null | undefined, name: string, type?: string }) => (
    <div>
      <p className="text-[10px] font-black text-surface-200/30 uppercase mb-1 tracking-tighter">
        {label}
      </p>
      {isEditing ? (
        <input
          name={name}
          type={type}
          value={value ?? ''}
          onChange={handleChange}
          className="w-full text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-1.5 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all"
        />
      ) : (
        <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-1.5 rounded-lg border border-surface-200/5 min-h-[34px] flex items-center">
          {type === 'date' ? formatDate(value as string) : (value || 'N/A')}
        </p>
      )}
    </div>
  );

  return (
    <div className="space-y-6 fade-in pb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-surface-100">PROCESOS DE MANTENIMIENTO</h2>
        <button
          onClick={() => isEditing ? handleSave() : setIsEditing(true)}
          disabled={loading}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
            isEditing 
              ? 'bg-accent-400 text-primary-900 hover:bg-accent-500 shadow-lg shadow-accent-400/20' 
              : 'bg-surface-100/5 text-surface-200 hover:bg-surface-100/10 border border-surface-200/10'
          }`}
        >
          {loading ? (
            <span className="spinner w-4 h-4 border-2" />
          ) : isEditing ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Guardar Cambios
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              Editar Información
            </>
          )}
        </button>
      </div>

      <div className="glass-card p-6 border-accent-400/5 shadow-sm rounded-2xl bg-white max-w-4xl">
        <div className="space-y-3">
          <DisplayField label="CLIENTE" value={formData.cliente} name="cliente" />
          <DisplayField label="EMBARCACIÓN PESQUERA" value={formData.embarcacion} name="embarcacion" />
          <DisplayField label="ORDEN DE COMPRA" value={formData.orden_compra} name="orden_compra" />
          <DisplayField label="FECHA DE INGRESO" value={formData.fecha_ingreso} name="fecha_ingreso" type="date" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-surface-100/5 p-6 rounded-2xl border border-surface-200/5 mt-4">
            {/* Category: Aparejos */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-accent-400/70 uppercase tracking-widest">Aparejos a Reparar</p>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    min="0"
                    name="cant_aparejos_reparar"
                    value={formData.cant_aparejos_reparar}
                    onChange={handleChange}
                    className="w-full text-sm text-surface-100 font-medium bg-surface-100/10 px-3 py-1.5 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {Array.from({ length: formData.cant_aparejos_reparar }).map((_, i) => {
                      const codesArray = formData.codigos_aparejos ? formData.codigos_aparejos.split(',') : [];
                      return (
                        <input
                          key={i}
                          type="text"
                          placeholder={`A-${i + 1}`}
                          value={codesArray[i] || ''}
                          onChange={(e) => {
                            const newCodes = [...codesArray];
                            const total = formData.cant_aparejos_reparar;
                            while (newCodes.length < total) newCodes.push('');
                            newCodes[i] = e.target.value;
                            setFormData(prev => ({ ...prev, codigos_aparejos: newCodes.slice(0, total).join(',') }));
                          }}
                          className="w-full text-[10px] text-surface-100 font-medium bg-surface-100/10 px-2 py-1 rounded border border-surface-200/10 focus:border-accent-400 outline-none"
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-1.5 rounded-lg border border-surface-200/5">
                    Cant: {formData.cant_aparejos_reparar}
                  </p>
                  <CodeStatusList codes={formData.codigos_aparejos} dailyProgress={dailyProgress} />
                </div>
              )}
            </div>

            {/* Category: Rodamientos */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-accent-400/70 uppercase tracking-widest">Rodamientos</p>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    min="0"
                    name="cant_rodamientos_cambiar"
                    value={formData.cant_rodamientos_cambiar}
                    onChange={handleChange}
                    className="w-full text-sm text-surface-100 font-medium bg-surface-100/10 px-3 py-1.5 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {Array.from({ length: formData.cant_rodamientos_cambiar }).map((_, i) => {
                      const codesArray = formData.codigos_rodamientos ? formData.codigos_rodamientos.split(',') : [];
                      return (
                        <input
                          key={i}
                          type="text"
                          placeholder={`R-${i + 1}`}
                          value={codesArray[i] || ''}
                          onChange={(e) => {
                            const newCodes = [...codesArray];
                            const total = formData.cant_rodamientos_cambiar;
                            while (newCodes.length < total) newCodes.push('');
                            newCodes[i] = e.target.value;
                            setFormData(prev => ({ ...prev, codigos_rodamientos: newCodes.slice(0, total).join(',') }));
                          }}
                          className="w-full text-[10px] text-surface-100 font-medium bg-surface-100/10 px-2 py-1 rounded border border-surface-200/10 focus:border-accent-400 outline-none"
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-1.5 rounded-lg border border-surface-200/5">
                    Cant: {formData.cant_rodamientos_cambiar}
                  </p>
                  <CodeStatusList codes={formData.codigos_rodamientos} dailyProgress={dailyProgress} />
                </div>
              )}
            </div>

            {/* Category: Cárcamos */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-accent-400/70 uppercase tracking-widest">Cárcamos</p>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    min="0"
                    name="cant_cancamos_cambiar"
                    value={formData.cant_cancamos_cambiar}
                    onChange={handleChange}
                    className="w-full text-sm text-surface-100 font-medium bg-surface-100/10 px-3 py-1.5 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {Array.from({ length: formData.cant_cancamos_cambiar }).map((_, i) => {
                      const codesArray = formData.codigos_cancamos ? formData.codigos_cancamos.split(',') : [];
                      return (
                        <input
                          key={i}
                          type="text"
                          placeholder={`C-${i + 1}`}
                          value={codesArray[i] || ''}
                          onChange={(e) => {
                            const newCodes = [...codesArray];
                            const total = formData.cant_cancamos_cambiar;
                            while (newCodes.length < total) newCodes.push('');
                            newCodes[i] = e.target.value;
                            setFormData(prev => ({ ...prev, codigos_cancamos: newCodes.slice(0, total).join(',') }));
                          }}
                          className="w-full text-[10px] text-surface-100 font-medium bg-surface-100/10 px-2 py-1 rounded border border-surface-200/10 focus:border-accent-400 outline-none"
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-1.5 rounded-lg border border-surface-200/5">
                    Cant: {formData.cant_cancamos_cambiar}
                  </p>
                  <CodeStatusList codes={formData.codigos_cancamos} dailyProgress={dailyProgress} />
                </div>
              )}
            </div>

            {/* Category: Pines */}
            <div className="space-y-3">
              <p className="text-[10px] font-black text-accent-400/70 uppercase tracking-widest">Pines</p>
              {isEditing ? (
                <>
                  <input
                    type="number"
                    min="0"
                    name="cant_pines_cambiar"
                    value={formData.cant_pines_cambiar}
                    onChange={handleChange}
                    className="w-full text-sm text-surface-100 font-medium bg-surface-100/10 px-3 py-1.5 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all"
                  />
                  <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                    {Array.from({ length: formData.cant_pines_cambiar }).map((_, i) => {
                      const codesArray = formData.codigos_pines ? formData.codigos_pines.split(',') : [];
                      return (
                        <input
                          key={i}
                          type="text"
                          placeholder={`P-${i + 1}`}
                          value={codesArray[i] || ''}
                          onChange={(e) => {
                            const newCodes = [...codesArray];
                            const total = formData.cant_pines_cambiar;
                            while (newCodes.length < total) newCodes.push('');
                            newCodes[i] = e.target.value;
                            setFormData(prev => ({ ...prev, codigos_pines: newCodes.slice(0, total).join(',') }));
                          }}
                          className="w-full text-[10px] text-surface-100 font-medium bg-surface-100/10 px-2 py-1 rounded border border-surface-200/10 focus:border-accent-400 outline-none"
                        />
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-1.5 rounded-lg border border-surface-200/5">
                    Cant: {formData.cant_pines_cambiar}
                  </p>
                  <CodeStatusList codes={formData.codigos_pines} dailyProgress={dailyProgress} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CodeStatusList({ codes, dailyProgress }: { codes: string, dailyProgress: DailyProgress[] }) {
  const codeList = codes ? codes.split(',').filter(c => c.trim()) : [];
  
  // All completed codes across all activities/dates
  const allCompletedCodes = new Set(
    dailyProgress
      .map(dp => dp.completed_codes?.split(',') || [])
      .flat()
      .filter(c => c.trim())
  );

  if (codeList.length === 0) return <p className="text-xs text-surface-100/40 italic">Sin códigos</p>;

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar pr-1 mt-2">
      {codeList.map((code, i) => {
        const isDone = allCompletedCodes.has(code);
        return (
          <div key={i} className="flex items-center justify-between bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/5 group hover:border-accent-400/20 transition-all">
            <span className="text-xs font-bold text-surface-100">{code}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
              isDone 
                ? 'bg-success-500/10 text-success-500 border-success-500/20' 
                : 'bg-warning-500/10 text-warning-500 border-warning-500/20'
            }`}>
              {isDone ? 'Realizado' : 'Por atención'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

