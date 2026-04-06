'use client';

import React, { useMemo, useState } from 'react';
import { Producto, ElementCheck, ProductElement, STAGE_ELEMENT_MAP, ELEMENT_TYPES, ELEMENT_LABELS } from '@/lib/types';
import { toggleElementCheck } from '@/app/actions/products';

interface StageDetailPanelProps {
  activity: { id: string; name: string; progress: number };
  productos: Producto[];
  productElements: ProductElement[];
  elementChecks: ElementCheck[];
  onCheckUpdate: () => void;
  recordDate: string;
}

export function StageDetailPanel({ activity, productos, productElements, elementChecks, onCheckUpdate, recordDate }: StageDetailPanelProps) {
  const [loadingChecks, setLoadingChecks] = useState<Set<string>>(new Set());

  // Tipos de elementos permitidos para esta etapa (ej. solo 'poleas')
  const elementsToShow = useMemo(() => {
    const mapped = STAGE_ELEMENT_MAP[activity.name];
    if (mapped === undefined || mapped === null) return [...ELEMENT_TYPES];
    return mapped;
  }, [activity.name]);

  // Checks relevantes SOLO a esta actividad
  const stageChecks = useMemo(() => {
    return elementChecks.filter(c => c.activity_id === activity.id);
  }, [elementChecks, activity.id]);

  // Total de elementos físicos del proyecto que califican para esta etapa
  const applicableElements = productElements.filter(pe => elementsToShow.includes(pe.element_type));
  const totalChecks = applicableElements.length;
  
  // Total completados para esta etapa
  const completedChecks = stageChecks.filter(c => {
    const pe = applicableElements.find(e => e.id === c.product_element_id);
    return c.is_completed && pe !== undefined;
  }).length;
  
  const handleToggle = async (checkId: string | undefined, isCompleted: boolean) => {
    if (!checkId) return; 
    
    setLoadingChecks(prev => {
      const newSet = new Set(prev);
      newSet.add(checkId);
      return newSet;
    });

    try {
      await toggleElementCheck(checkId, !isCompleted, recordDate);
      onCheckUpdate();
    } catch (err) {
      console.error(err);
      alert('Error updating check');
    } finally {
      setLoadingChecks(prev => {
        const newSet = new Set(prev);
        newSet.delete(checkId);
        return newSet;
      });
    }
  };

  return (
    <div className="w-full bg-[#f8fbfc] shadow-inner py-6 px-4 sm:px-10 border-t border-sky-100/50 animate-slide-down">
        
      {/* Content (Product List) */}
      <div className="space-y-4">
        {productos.length === 0 ? (
          <div className="py-8 text-center text-gray-400 font-medium">
            <p>No hay equipos registrados en el proyecto.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {productos.map(prod => {
              const prodElems = applicableElements.filter(pe => pe.producto_id === prod.id);
              
              if (prodElems.length === 0) {
                return (
                  <div key={prod.id} className="rounded-xl border bg-gray-50 border-gray-100 px-4 py-3 flex items-center justify-between opacity-50">
                    <span className="text-sm font-bold text-gray-500">{prod.codigo_unico}</span>
                    <span className="text-[10px] text-gray-400 font-medium">0 elementos</span>
                  </div>
                );
              }

              const prodChecksForDocs = stageChecks.filter(c => prodElems.find(pe => pe.id === c.product_element_id));
              const prodCompleted = prodChecksForDocs.filter(c => c.is_completed).length;
              const isFullCompleted = prodCompleted === prodElems.length;

              return (
                <div key={prod.id} className={`rounded-xl border shadow-sm transition-colors overflow-hidden ${isFullCompleted ? 'bg-[#f4f9f9] border-[#caeaf5]' : 'bg-white border-gray-200'}`}>
                  
                  {/* Product Header */}
                  <div className={`px-4 py-2 flex items-center justify-between border-b ${isFullCompleted ? 'bg-[#eaf5fa] border-[#caeaf5]' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${isFullCompleted ? 'bg-sky-400' : 'bg-gray-300'}`}></div>
                      <span className="text-[13px] font-bold text-gray-700">{prod.codigo_unico}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isFullCompleted ? 'text-sky-600 bg-sky-100' : 'text-gray-500 bg-gray-200'}`}>
                      {prodCompleted} / {prodElems.length}
                    </span>
                  </div>

                  {/* Checkboxes Grid by Element */}
                  <div className="p-3 grid grid-cols-1 gap-2">
                    {prodElems.map(pe => {
                      const checkObj = stageChecks.find(c => c.product_element_id === pe.id);
                      const isChecked = checkObj?.is_completed || false;
                      const checkId = checkObj?.id;
                      const isLoading = checkId ? loadingChecks.has(checkId) : false;

                      return (
                        <label 
                          key={pe.id} 
                          onClick={(e) => {
                             e.preventDefault();
                             if (!isLoading) handleToggle(checkId, isChecked);
                          }}
                          className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer select-none transition-all min-h-[44px]
                            ${isChecked 
                              ? 'bg-sky-50 border-sky-200 shadow-sm' 
                              : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                            }
                            ${isLoading ? 'opacity-50 pointer-events-none' : ''}
                          `}
                        >
                          <div className={`shrink-0 flex items-center justify-center w-5 h-5 rounded border shadow-sm transition-colors
                            ${isChecked 
                              ? 'bg-sky-500 border-sky-500 text-white' 
                              : 'bg-white border-gray-300 text-transparent'
                            }
                          `}>
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className={`text-[11px] font-bold truncate leading-tight ${isChecked ? 'text-sky-900' : 'text-gray-700'}`}>
                              {pe.codigo_unico || "Sin Código"}
                            </span>
                            <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider mt-[1px]">
                              {ELEMENT_LABELS[pe.element_type]}
                            </span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
