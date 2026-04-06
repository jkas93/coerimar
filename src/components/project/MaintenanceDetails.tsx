'use client';

import React, { useState, useEffect } from 'react';
import type { Project, Producto, ElementCheck, ProductElement, ElementType, PartidaWithItems } from '@/lib/types';
import { ELEMENT_TYPES, ELEMENT_LABELS, STAGE_ELEMENT_MAP } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { addProducto, removeProducto, syncProductElements } from '@/app/actions/products';

interface Props {
  project: Project;
  partidas?: PartidaWithItems[];
  productos?: Producto[];
  productElements?: ProductElement[];
  elementChecks?: ElementCheck[];
}

export function MaintenanceDetails({ project, partidas = [], productos = [], productElements = [], elementChecks = [] }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    cliente: project.cliente || '',
    embarcacion: project.embarcacion || '',
    orden_compra: project.orden_compra || '',
    fecha_ingreso: project.fecha_ingreso || '',
  });

  const [newProdCode, setNewProdCode] = useState('');
  const [addingProd, setAddingProd] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const supabase = createClient();
  const router = useRouter();

  const activities = (partidas || []).flatMap(p => p.items?.flatMap(i => i.activities || []) || []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

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
      const { error } = await supabase.from('projects').update(formData).eq('id', project.id);
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
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdCode.trim()) return;
    
    setAddingProd(true);
    try {
      await addProducto(project.id, newProdCode);
      setNewProdCode('');
      router.refresh();
    } catch(err: any) {
      alert(err.message || 'Error al agregar producto');
    } finally {
      setAddingProd(false);
    }
  };

  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este producto? Se borrarán todos sus registros de progreso.')) return;
    
    try {
      await removeProducto(prodId, project.id);
      router.refresh();
    } catch(err: any) {
      alert(err.message || 'Error al eliminar producto');
    }
  };

  const DisplayField = ({ label, value, name, type = "text" }: { label: string, value: string | null | undefined, name: string, type?: string }) => (
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
      
      {/* SECCIÓN 1: DATOS GENERALES */}
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
            <>Guardar Cambios</>
          ) : (
            <>Editar Información</>
          )}
        </button>
      </div>

      <div className="glass-card p-6 border-accent-400/5 shadow-sm rounded-2xl bg-white max-w-4xl">
        <div className="space-y-3">
          <DisplayField label="CLIENTE" value={formData.cliente} name="cliente" />
          <DisplayField label="EMBARCACIÓN PESQUERA" value={formData.embarcacion} name="embarcacion" />
          <DisplayField label="ORDEN DE COMPRA" value={formData.orden_compra} name="orden_compra" />
          <DisplayField label="FECHA DE INGRESO" value={formData.fecha_ingreso} name="fecha_ingreso" type="date" />
        </div>
      </div>

      {/* SECCIÓN 2: GESTIÓN DE PRODUCTOS Y SUB-ELEMENTOS */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-surface-100 mb-4">INVENTARIO DEL PROYECTO ({productos.length})</h3>
        
        <div className="glass-card p-6 border-accent-400/5 shadow-sm rounded-2xl bg-white max-w-4xl space-y-6">
          <form onSubmit={handleAddProduct} className="flex gap-3">
            <input 
              type="text" 
              placeholder="Código del Equipo Principal (Ej: APAREJO APR-001)"
              value={newProdCode}
              onChange={e => setNewProdCode(e.target.value)}
              className="flex-1 bg-surface-100/5 border border-surface-200/20 rounded-lg px-4 py-2 text-sm text-surface-100 focus:outline-none focus:border-accent-400"
            />
            <button type="submit" disabled={addingProd || !newProdCode.trim()} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              {addingProd ? <span className="spinner w-4 h-4 border-2" /> : '+ Agregar Producto Principal'}
            </button>
          </form>

          {productos.length > 0 ? (
            <div className="space-y-4">
              {productos.map(prod => (
                <ProductRow 
                  key={prod.id} 
                  prod={prod} 
                  project={project}
                  elements={productElements.filter(e => e.producto_id === prod.id)}
                  checks={elementChecks}
                  onDelete={() => handleDeleteProduct(prod.id)}
                  isExpanded={expandedRow === prod.id}
                  onToggleExpand={() => setExpandedRow(prev => prev === prod.id ? null : prod.id)}
                  onRefresh={() => router.refresh()}
                />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-surface-400 text-sm">
              No hay productos registrados. Agregue el primer producto para iniciar.
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 3: RESUMEN MATRIZ CRUZADA */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-surface-100 mb-4">MATRIZ DE AVANCE CRUZADA</h3>
        <div className="glass-card p-6 border-accent-400/5 shadow-sm rounded-2xl bg-white w-full overflow-x-auto">
           {activities.length > 0 && productos.length > 0 ? (
             <div className="min-w-max pb-4">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr>
                     <th className="py-2 px-4 bg-surface-100/5 text-[11px] font-bold text-surface-300 uppercase sticky left-0 z-10 bg-white border-b border-surface-200/10 border-r min-w-[150px]">Producto</th>
                     {activities.map((act, index) => (
                        <th key={act.id} className="py-2 px-1 border-b border-surface-200/10 text-center align-bottom min-w-[40px]">
                           <div className="flex flex-col items-center justify-end h-40 relative">
                              <span className="text-[10px] font-bold text-surface-400 whitespace-nowrap -rotate-180 pb-2" style={{ writingMode: 'vertical-rl' }}>
                                {index + 1}. {act.name}
                              </span>
                           </div>
                        </th>
                     ))}
                   </tr>
                 </thead>
                 <tbody>
                    {productos.map(prod => (
                      <tr key={prod.id} className="border-b border-surface-200/5 hover:bg-surface-50/50 transition-colors">
                         <td className="py-3 px-4 font-bold text-surface-100 text-xs sticky left-0 z-10 bg-white border-r border-surface-200/10">{prod.codigo_unico}</td>
                         {activities.map(act => {
                            const elementsToShow = STAGE_ELEMENT_MAP[act.name] || ELEMENT_TYPES;
                            const targetElements = productElements.filter(pe => pe.producto_id === prod.id && elementsToShow.includes(pe.element_type));
                            const total = targetElements.length;
                            const completed = elementChecks.filter(c => c.activity_id === act.id && targetElements.find(pe => pe.id === c.product_element_id) && c.is_completed).length;
                            
                            let cellContent;
                            if (total === 0) {
                               cellContent = <span className="text-[10px] text-surface-200/30 font-bold">-</span>;
                            } else {
                               const pct = Math.round((completed / total) * 100);
                               let colorClass = 'bg-surface-100/10 text-surface-400';
                               if (pct === 100) colorClass = 'bg-success-400 text-white shadow-sm';
                               else if (pct > 0) colorClass = 'bg-accent-400 text-primary-900 shadow-sm';

                               cellContent = (
                                 <div title={`${completed}/${total} completados`} className={`text-[9px] font-black w-8 py-1 rounded mx-auto text-center ${colorClass}`}>
                                   {pct}%
                                 </div>
                               );
                            }
                            return (
                              <td key={act.id} className="py-3 px-1 text-center border-l border-surface-200/5">
                                 {cellContent}
                              </td>
                            );
                         })}
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
           ) : (
             <div className="py-8 text-center text-surface-400 text-sm">
               Agregue productos para visualizar la matriz de avance cruzada.
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

// CHILD COMPONENT FOR EACH PRODUCT TO MANAGE ITS ELEMENTS
function ProductRow({ prod, project, elements, checks, onDelete, isExpanded, onToggleExpand, onRefresh }: any) {
  const [localElements, setLocalElements] = useState(elements.map((e: any) => ({ type: e.element_type, code: e.codigo_unico })));
  const [syncing, setSyncing] = useState(false);

  // Auto-update if data changes from outside (refresh)
  useEffect(() => {
    setLocalElements(elements.map((e: any) => ({ type: e.element_type, code: e.codigo_unico })));
  }, [elements]);

  const prodChecks = checks.filter((c: any) => elements.find((pe: any) => pe.id === c.product_element_id));
  const isCompletedCount = prodChecks.filter((c: any) => c.is_completed).length;
  const totalCount = prodChecks.length;
  const pct = totalCount === 0 ? 0 : Math.round((isCompletedCount / totalCount) * 100);

  const addElement = (type: ElementType) => {
    setLocalElements([...localElements, { type, code: '' }]);
  };

  const removeElement = (index: number) => {
    const newItems = [...localElements];
    newItems.splice(index, 1);
    setLocalElements(newItems);
  };

  const updateElementCode = (index: number, code: string) => {
    const newItems = [...localElements];
    newItems[index].code = code;
    setLocalElements(newItems);
  };

  const saveElements = async () => {
    // validate
    if (localElements.some((e: any) => !e.code.trim())) {
      alert("Todos los elementos deben tener un código ingresado");
      return;
    }
    setSyncing(true);
    try {
      await syncProductElements(prod.id, project.id, localElements);
      alert('Inventario del producto guardado correctamente.');
      onRefresh();
    } catch(err: any) {
      alert(err.message || 'Error guardando elementos');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="bg-surface-100/5 border border-surface-200/5 rounded-xl overflow-hidden transition-all shadow-sm">
      <div 
        className={`px-5 py-4 cursor-pointer flex items-center justify-between hover:bg-surface-200/5 ${isExpanded ? 'bg-surface-200/10' : ''}`}
        onClick={onToggleExpand}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h4 className="font-bold text-surface-100 text-lg">{prod.codigo_unico}</h4>
            <span className="text-[10px] bg-surface-200/10 px-2 py-0.5 rounded-md text-surface-300 font-bold">{elements.length} Componentes</span>
          </div>
          <div className="flex items-center gap-3 pr-8 mt-2">
             <div className="h-1.5 flex-1 bg-surface-200/10 rounded-full overflow-hidden max-w-sm">
                <div className={`h-full ${pct === 100 ? 'bg-success-400' : 'bg-accent-400'} transition-all`} style={{ width: `${pct}%`}}></div>
             </div>
             <span className="text-[10px] font-bold text-surface-200">{pct}% Progreso del Equipo</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-surface-400 hover:text-danger-500 transition-colors bg-white p-2 rounded-full shadow-sm hover:shadow-md border border-surface-200/10">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
          <svg className={`w-5 h-5 text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 border-t border-surface-200/5 bg-white/50">
          <h5 className="text-xs font-bold text-surface-400 uppercase tracking-widest mb-4">Despiece del Producto (Elementos Físicos)</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ELEMENT_TYPES.map((type) => {
              const itemsOfType = localElements.filter((e: any) => e.type === type);
              return (
                <div key={type} className="bg-surface-50 p-4 rounded-xl border border-surface-200/10 relative">
                  <div className="flex items-center justify-between mb-3 border-b border-surface-200/5 pb-2">
                    <span className="text-xs font-black text-surface-200 uppercase">{ELEMENT_LABELS[type]}</span>
                    <button type="button" onClick={() => addElement(type)} className="text-[10px] font-bold text-accent-500 bg-accent-500/10 px-2 py-0.5 rounded hover:bg-accent-500/20 transition-colors">+ Añadir</button>
                  </div>
                  
                  <div className="space-y-2">
                    {itemsOfType.map((item: any, _i: number) => {
                      // find real index in localElements
                      const realIndex = localElements.findIndex((e: any, idx: number) => e === item);
                      return (
                        <div key={realIndex} className="flex gap-2">
                          <input 
                            type="text" 
                            placeholder={`Cod. ${ELEMENT_LABELS[type]}`}
                            value={item.code}
                            onChange={(e) => updateElementCode(realIndex, e.target.value)}
                            className="bg-white border border-surface-200/20 text-xs px-2 py-1.5 rounded w-full focus:outline-none focus:border-accent-400 shadow-sm transition-colors"
                          />
                          <button onClick={() => removeElement(realIndex)} className="text-danger-400 hover:text-danger-500 px-2"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                        </div>
                      );
                    })}
                    {itemsOfType.length === 0 && <p className="text-[10px] text-surface-400/50 italic">Cero componentes de este tipo registrados.</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end">
             <button onClick={saveElements} disabled={syncing} className="btn-primary py-2 px-5 text-xs rounded-lg flex items-center gap-2">
               {syncing ? <span className="spinner w-3 h-3" /> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
               Sincronizar y Guardar Inventario
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
