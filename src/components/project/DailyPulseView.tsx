'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { isBefore, isAfter, parseISO, startOfDay, format, subDays, addDays } from 'date-fns';
import { Project, PartidaWithItems, Producto, ElementCheck, ProductElement, STAGE_ELEMENT_MAP, ELEMENT_TYPES } from '@/lib/types';
import { StageDetailPanel } from '@/components/gantt/StageDetailPanel';

interface Props {
  projectId: string;
  project: Project;
  partidas: PartidaWithItems[];
  productos?: Producto[];
  productElements?: ProductElement[];
  elementChecks?: ElementCheck[];
}

export function DailyPulseView({ partidas, productos = [], productElements = [], elementChecks = [] }: Props) {
  const [activeStage, setActiveStage] = useState<{ id: string; name: string; progress: number } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();

  // Fecha que el usuario elige para reportar o verificar su avance
  const initialDateStr = new Date().toLocaleDateString('en-CA'); // 'YYYY-MM-DD'
  const [recordDate, setRecordDate] = useState<string>(initialDateStr);

  const handlePrevDay = () => setRecordDate(format(subDays(parseISO(recordDate), 1), 'yyyy-MM-dd'));
  const handleNextDay = () => setRecordDate(format(addDays(parseISO(recordDate), 1), 'yyyy-MM-dd'));

  // Obtenemos todas las actividades activas
  const allActivities = partidas.flatMap(p => p.items?.flatMap(i => i.activities || []) || []);

  const totalChecksProject = productElements.length > 0 ? allActivities.reduce((acc, act) => {
    const show = STAGE_ELEMENT_MAP[act.name] || ELEMENT_TYPES;
    return acc + productElements.filter(pe => show.includes(pe.element_type)).length;
  }, 0) : 0;

  const totalCompletedProject = elementChecks.filter(c => c.is_completed).length;
  const projectProgress = totalChecksProject > 0 ? Math.round((totalCompletedProject / totalChecksProject) * 100) : 0;

  // Hoy lógico (evaluamos atraso o futuro en base a la fecha seleccionada por el supervisor)
  const logicalDate = startOfDay(parseISO(recordDate));

  const activitiesWithStatus = allActivities.map(activity => {
    const elementsToShow = STAGE_ELEMENT_MAP[activity.name] || ELEMENT_TYPES;
    const targetElements = productElements.filter(pe => elementsToShow.includes(pe.element_type));
    const actChecks = elementChecks.filter(c => c.activity_id === activity.id && targetElements.find(pe => pe.id === c.product_element_id));
    const completed = actChecks.filter(c => c.is_completed).length;
    const total = targetElements.length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const startDate = activity.start_date ? startOfDay(parseISO(activity.start_date)) : null;
    const endDate = activity.end_date ? startOfDay(parseISO(activity.end_date)) : null;

    let isCurrent = false;
    let isDelayed = false;
    let isFuture = false;

    if (startDate && endDate) {
       if (isBefore(endDate, logicalDate) && pct < 100) {
           isDelayed = true;
       } else if (isAfter(startDate, logicalDate)) {
           isFuture = true;
       } else {
           isCurrent = true;
       }
    } else {
       isCurrent = true;
    }

    return { ...activity, pct, completed, total, elementsToShow, isCurrent, isDelayed, isFuture };
  });

  const filteredActivities = showAll 
    ? activitiesWithStatus
    : activitiesWithStatus.filter(a => a.isCurrent || a.isDelayed);

  const activeCount = filteredActivities.length;
  const activeCompleted = filteredActivities.filter(a => a.pct === 100).length;

  return (
    <div className="flex flex-col gap-6 fade-in pb-12">
      {/* HEADER / PULSE CONTROL */}
      <div className="bg-white border border-gray-100 rounded-[2rem] p-6 sm:px-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
        
        {/* IZQUIERDA: FECHA */}
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-10 mb-1">PULSO DEL DÍA</span>
          <div className="flex items-center gap-6">
            <button onClick={handlePrevDay} className="text-gray-400 hover:text-sky-500 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="relative flex items-center gap-3 cursor-pointer group">
              <span className="text-xl font-black text-gray-800 tracking-wider group-hover:text-sky-500 transition-colors">
                 {format(parseISO(recordDate), 'dd/MM/yyyy')}
              </span>
              <svg className="w-5 h-5 text-gray-800 group-hover:text-sky-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <input 
                type="date" 
                value={recordDate} 
                onChange={(e) => setRecordDate(e.target.value)} 
                className="absolute inset-0 opacity-0 cursor-pointer w-full" 
              />
            </div>
            <button onClick={handleNextDay} className="text-gray-400 hover:text-sky-500 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>

        {/* CENTRO: PROGRESO DEL DÍA */}
        <div className="flex-1 w-full max-w-sm flex flex-col justify-center border-l md:border-l-0 md:border-y-0 border-gray-100 pl-4 md:pl-0">
          <div className="flex justify-between items-end mb-2 px-1">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Progreso de registro hoy</span>
            <span className="text-[11px] font-bold text-sky-400 tracking-wide">{activeCompleted} / {activeCount} activas</span>
          </div>
          <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
             <div className="h-full bg-sky-400 transition-all duration-1000 ease-out" style={{ width: `${activeCount > 0 ? (activeCompleted / activeCount) * 100 : 0}%` }} />
          </div>
        </div>

        {/* DERECHA: BOTÓN GUARDAR (Nativo Fake de Mockup) */}
        <div className="shrink-0 flex justify-end">
          <button onClick={() => router.refresh()} className="bg-sky-400 hover:bg-sky-500 text-white px-8 py-3.5 rounded-xl font-bold text-[13px] shadow-sm transition-colors flex items-center gap-2.5 whitespace-nowrap">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
             Guardar Cambios
          </button>
        </div>
      </div>

      {/* STAGES LIST */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden pb-12 w-full">
        {allActivities.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <p>No hay etapas programadas en el proyecto.</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="p-12 text-center text-warning-500 bg-warning-50/50">
            <p className="font-bold">Requiere Configuración</p>
            <p className="text-sm mt-2">Ddebe agregar al menos un Producto en la pestaña de &quot;Detalles de Mantenimiento&quot; para poder registrar checklist.</p>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 bg-white">
               <h3 className="font-bold text-gray-400 uppercase text-xs tracking-widest">
                  {showAll ? 'Todas las Etapas del Proyecto' : 'Etapas del Día (En curso y Atrasadas)'}
               </h3>
               <button 
                 onClick={() => setShowAll(!showAll)}
                 className="text-xs font-bold px-4 py-2 rounded-xl text-sky-500 border border-sky-100 hover:bg-sky-50 transition-colors"
               >
                 {showAll ? 'Ocultar Etapas Futuras' : 'Ver Todas las Etapas'}
               </button>
            </div>

            {filteredActivities.length === 0 && !showAll ? (
              <div className="p-12 text-center text-gray-400">
                <p>No hay etapas programadas en progreso o atrasadas para el día de hoy.</p>
                <button onClick={() => setShowAll(true)} className="mt-4 px-5 py-2.5 bg-gray-50 rounded-lg text-sm font-bold text-sky-500 border border-gray-200 hover:bg-gray-100 transition-colors">
                  Ver Etapas Futuras
                </button>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-gray-100 text-[11px] font-bold text-gray-500 uppercase tracking-widest text-center">
                      <th className="py-4 px-6 text-left w-1/3">ACTIVIDAD</th>
                      <th className="py-4 px-4 w-24">PESO</th>
                      <th className="py-4 px-4 w-32">ACUMULADO</th>
                      <th className="py-4 px-4 w-32 bg-[#f4f9f9] text-[#71c3e3] border-x border-[#f4f9f9] relative"><div className="absolute inset-x-0 -top-[1px] h-[1px] bg-[#f4f9f9]"></div>HOY (%)</th>
                      <th className="py-4 px-4 w-24">MARCAR</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px] font-medium text-gray-500">
                    <tr className="bg-[#004d95] text-white">
                      <td colSpan={5} className="py-2.5 px-6 font-bold text-[11px] tracking-wide">ETAPA DE MANTENIMIENTO</td>
                    </tr>
                    <tr className="bg-[#f8f9fc]">
                      <td colSpan={5} className="py-2 px-6 font-bold text-[10px] text-gray-500 uppercase">PROCESO</td>
                    </tr>
                    {filteredActivities.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((activity) => {
                       const weight = (100 / (allActivities.length || 1)).toFixed(2);
                       const isExpanded = activeStage?.id === activity.id;
                       return (
                        <React.Fragment key={activity.id}>
                          <tr className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${isExpanded ? 'bg-sky-50/30' : ''}`}>
                            <td className="py-4 px-6 text-gray-600 font-semibold uppercase">{activity.name}</td>
                            <td className="py-4 px-4 text-center text-gray-500">{weight}</td>
                            <td className="py-4 px-4 text-center">
                              <span className="bg-gray-100 text-gray-500 font-bold px-2.5 py-1 rounded-md text-[11px]">{activity.pct.toFixed(1)}%</span>
                            </td>
                            <td className="py-4 px-4 text-center bg-[#f4f9f9] border-x border-gray-50">
                              <div className="flex items-center justify-center">
                                <div className="border border-gray-200 bg-white rounded-md px-3 py-1.5 w-[72px] text-center shadow-sm relative text-gray-500 font-bold">
                                  {activity.pct} <span className="absolute -right-5 top-1.5 text-[11px] text-gray-600">%</span>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button 
                                onClick={() => setActiveStage(isExpanded ? null : { id: activity.id, name: activity.name, progress: activity.pct })}
                                className={`transition-all p-2 ${isExpanded ? 'text-sky-500 bg-sky-50 rounded-lg shadow-[inset_0_1px_3px_rgba(0,0,0,0.05)] border border-sky-100' : 'text-gray-400 hover:text-[#004e98]'}`}
                                title={isExpanded ? "Cerrar Checklist" : "Marcar Checklist"}
                              >
                                {isExpanded ? (
                                  <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
                                ) : (
                                  <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                )}
                              </button>
                            </td>
                          </tr>
                          {isExpanded && activeStage && (
                            <tr>
                              <td colSpan={5} className="p-0 border-b border-gray-200 p-0 m-0 relative">
                                <StageDetailPanel
                                  activity={activeStage}
                                  productos={productos}
                                  productElements={productElements}
                                  elementChecks={elementChecks}
                                  onCheckUpdate={() => router.refresh()}
                                  recordDate={recordDate}
                                />
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                       );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
