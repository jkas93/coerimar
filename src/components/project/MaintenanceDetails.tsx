'use client';

import React, { useState } from 'react';
import type { Project } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface Props {
  project: Project;
  partidas: any[];
  dailyProgress: any[];
}

export function MaintenanceDetails({ project, partidas, dailyProgress }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cliente: project.cliente || '',
    embarcacion: project.embarcacion || '',
    orden_compra: project.orden_compra || '',
    fecha_ingreso: project.fecha_ingreso || '',
    cant_aparejos_reparar: project.cant_aparejos_reparar || 0,
    cant_aparejos_irreparables: project.cant_aparejos_irreparables || 0,
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
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const DisplayField = ({ label, value, name, type = "text" }: { label: string, value: any, name: string, type?: string }) => (
    <div>
      <p className="text-[10px] font-black text-surface-200/30 uppercase mb-1 tracking-tighter">
        {label}
      </p>
      {isEditing ? (
        <input
          name={name}
          type={type}
          value={value}
          onChange={handleChange}
          className="w-full text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-1.5 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all"
        />
      ) : (
        <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-1.5 rounded-lg border border-surface-200/5 min-h-[34px] flex items-center">
          {type === 'date' ? formatDate(value) : (value || 'N/A')}
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
          <DisplayField label="CANTIDAD DE APAREJOS A REPARAR" value={formData.cant_aparejos_reparar} name="cant_aparejos_reparar" type="number" />
          <DisplayField label="CANTIDAD DE APAREJOS IRREPARABLES" value={formData.cant_aparejos_irreparables} name="cant_aparejos_irreparables" type="number" />
          
          <div className="pt-2">
            <p className="text-[10px] font-black text-surface-200/30 uppercase mb-1 tracking-tighter">DETALLAR CODIGOS DE APAREJOS</p>
            {isEditing ? (
              <textarea
                name="codigos_aparejos"
                value={formData.codigos_aparejos}
                onChange={handleChange}
                className="w-full text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all resize-none h-16"
              />
            ) : (
              <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/5 whitespace-pre-wrap min-h-[40px]">
                {formData.codigos_aparejos || 'N/A'}
              </p>
            )}
          </div>

          <DisplayField label="CANTIDAD DE RODAMIENTOS POR CAMBIAR" value={formData.cant_rodamientos_cambiar} name="cant_rodamientos_cambiar" type="number" />
          
          <div className="pt-2">
            <p className="text-[10px] font-black text-surface-200/30 uppercase mb-1 tracking-tighter">DETALLAR CODIGOS DE RODAMIENTOS</p>
            {isEditing ? (
              <textarea
                name="codigos_rodamientos"
                value={formData.codigos_rodamientos}
                onChange={handleChange}
                className="w-full text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all resize-none h-16"
              />
            ) : (
              <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/5 whitespace-pre-wrap min-h-[40px]">
                {formData.codigos_rodamientos || 'N/A'}
              </p>
            )}
          </div>

          <DisplayField label="CANTIDAD DE CANCAMOS POR CAMBIAR" value={formData.cant_cancamos_cambiar} name="cant_cancamos_cambiar" type="number" />
          
          <div className="pt-2">
            <p className="text-[10px] font-black text-surface-200/30 uppercase mb-1 tracking-tighter">DETALLAR CODIGOS DE CANCAMOS</p>
            {isEditing ? (
              <textarea
                name="codigos_cancamos"
                value={formData.codigos_cancamos}
                onChange={handleChange}
                className="w-full text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all resize-none h-16"
              />
            ) : (
              <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/5 whitespace-pre-wrap min-h-[40px]">
                {formData.codigos_cancamos || 'N/A'}
              </p>
            )}
          </div>

          <DisplayField label="CANTIDAD DE PINES POR CAMBIAR" value={formData.cant_pines_cambiar} name="cant_pines_cambiar" type="number" />
          
          <div className="pt-2">
            <p className="text-[10px] font-black text-surface-200/30 uppercase mb-1 tracking-tighter">DETALLAR CODIGOS DE PINES</p>
            {isEditing ? (
              <textarea
                name="codigos_pines"
                value={formData.codigos_pines}
                onChange={handleChange}
                className="w-full text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/20 focus:border-accent-400 outline-none transition-all resize-none h-16"
              />
            ) : (
              <p className="text-sm text-surface-100 font-medium bg-surface-100/5 px-3 py-2 rounded-lg border border-surface-200/5 whitespace-pre-wrap min-h-[40px]">
                {formData.codigos_pines || 'N/A'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

