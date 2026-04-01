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
    cant_rodamientos_cambiar: project.cant_rodamientos_cambiar || 0,
    codigos_rodamientos: project.codigos_rodamientos || '',
    cant_cancamos_cambiar: project.cant_cancamos_cambiar || 0,
    codigos_cancamos: project.codigos_cancamos || '',
    cant_pines_cambiar: project.cant_pines_cambiar || 0,
    codigos_pines: project.codigos_pines || '',
    cant_poleas_cambiar: project.cant_poleas_cambiar || 0,
    codigos_poleas: project.codigos_poleas || '',
    cant_cascos_cambiar: project.cant_cascos_cambiar || 0,
    codigos_cascos: project.codigos_cascos || '',
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

  const renderDisplayField = (label: string, value: string | number | null | undefined, name: string, type = "text") => (
    <div key={name}>
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

  const renderCategory = (title: string, qtyName: string, codesName: string, prefix: string) => {
    const qty = formData[qtyName as keyof typeof formData] as number;
    const codes = formData[codesName as keyof typeof formData] as string;

    return (
      <div className="space-y-3">
        <p className="text-[10px] font-black text-accent-400/70 uppercase tracking-widest">{title}</p>
        {isEditing ? (
          <>
            <input
              type="number"
              min="0"
              name={qtyName}
              value={qty}
              onChange={handleChange}
              className="w-full text-sm text-surface-100 font-medium bg-surface-100/10 px-3 py-1.5 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all"
            />
            <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
              {Array.from({ length: qty }).map((_, i) => {
                const codesArray = codes ? codes.split(',') : [];
                return (
                  <input
                    key={i}
                    type="text"
                    placeholder={`${prefix}-${i + 1}`}
                    value={codesArray[i] || ''}
                    onChange={(e) => {
                      const newCodes = [...codesArray];
                      while (newCodes.length < qty) newCodes.push('');
                      newCodes[i] = e.target.value;
                      setFormData(prev => ({ ...prev, [codesName]: newCodes.slice(0, qty).join(',') }));
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
              Cant: {qty}
            </p>
            <CodeStatusList codes={codes} dailyProgress={dailyProgress} />
          </div>
        )}
      </div>
    );
  };

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
          {renderDisplayField("CLIENTE", formData.cliente, "cliente")}
          {renderDisplayField("EMBARCACIÓN PESQUERA", formData.embarcacion, "embarcacion")}
          {renderDisplayField("ORDEN DE COMPRA", formData.orden_compra, "orden_compra")}
          {renderDisplayField("FECHA DE INGRESO", formData.fecha_ingreso, "fecha_ingreso", "date")}
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-black text-surface-200 uppercase tracking-widest mb-4">APAREJOS A REPARAR</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-surface-100/5 p-6 rounded-2xl border border-surface-200/5 mt-4">
            {renderCategory('Rodamientos', 'cant_rodamientos_cambiar', 'codigos_rodamientos', 'R')}
            {renderCategory('Cáncamos', 'cant_cancamos_cambiar', 'codigos_cancamos', 'C')}
            {renderCategory('Pines', 'cant_pines_cambiar', 'codigos_pines', 'P')}
            {renderCategory('Poleas', 'cant_poleas_cambiar', 'codigos_poleas', 'PL')}
            {renderCategory('Cascos', 'cant_cascos_cambiar', 'codigos_cascos', 'CS')}
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

