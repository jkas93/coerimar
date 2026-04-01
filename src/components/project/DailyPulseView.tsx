'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { triggerProjectAlerts } from '@/app/actions/alerts';

import { Project, DailyProgress, PartidaWithItems, Activity, Item, Partida } from '@/lib/types';

interface DecoratedActivity extends Activity {
  totalProgress: number;
  existingTodayPercent: number | null;
}

interface DecoratedItem extends Item {
  activities: DecoratedActivity[];
}

interface DecoratedPartida extends Partida {
  items: DecoratedItem[];
}

interface Props {
  projectId: string;
  project: Project;
  partidas: PartidaWithItems[];
  dailyProgress?: DailyProgress[];
}

export function DailyPulseView({ projectId, project, partidas, dailyProgress = [] }: Props) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [editedValues, setEditedValues] = useState<Record<string, { 
    percent: string, 
    completedCodes: string[] 
  }>>({});
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  // Reset edited values when date changes
  useEffect(() => {
    setEditedValues({});
    setExpandedRows(new Set());
    setError(null);
    setSuccess(false);
  }, [selectedDate]);

  // Flatten and filter activities active on the selected date
  const activeActivitiesByPartida = useMemo(() => {
    const active: DecoratedPartida[] = [];
    partidas.forEach((p: PartidaWithItems) => {
      const itemsWithActivities: DecoratedItem[] = [];
      (p.items || []).forEach((i) => {
        const validActivities = (i.activities || []).filter((a) => {
          return a.start_date <= selectedDate && a.end_date >= selectedDate;
        }).map((a): DecoratedActivity => {
          const taskProgressLogs = dailyProgress.filter(dp => dp.activity_id === a.id);
          const totalProgress = taskProgressLogs.reduce((sum, dp) => sum + Number(dp.progress_percent), 0);
          const existingToday = taskProgressLogs.find(dp => dp.date === selectedDate);
          
          return {
            ...a,
            totalProgress,
            existingTodayPercent: existingToday ? existingToday.progress_percent : null,
          };
        });

        if (validActivities.length > 0) {
          itemsWithActivities.push({ ...i, activities: validActivities });
        }
      });

      if (itemsWithActivities.length > 0) {
        active.push({ ...p, items: itemsWithActivities });
      }
    });
    return active;
  }, [partidas, dailyProgress, selectedDate]);

  const flatActiveActivitiesCount = useMemo(() => {
    return activeActivitiesByPartida.reduce((sum, p) => 
      sum + p.items.reduce((itemSum: number, i: DecoratedItem) => itemSum + i.activities.length, 0), 0
    );
  }, [activeActivitiesByPartida]);

  const registeredTodayCount = useMemo(() => {
    let count = 0;
    activeActivitiesByPartida.forEach((p: DecoratedPartida) => {
      p.items.forEach((i: DecoratedItem) => {
        i.activities.forEach((a: DecoratedActivity) => {
          if (editedValues[a.id]?.percent || a.existingTodayPercent !== null) {
            count++;
          }
        });
      });
    });
    return count;
  }, [activeActivitiesByPartida, editedValues]);



  const handlePercentChange = (activityId: string, value: string) => {
    setEditedValues(prev => ({
      ...prev,
      [activityId]: { 
        ...prev[activityId], 
        percent: value, 
        completedCodes: prev[activityId]?.completedCodes || []
      }
    }));
  };

  const handleCodeToggle = (activityId: string, code: string, totalCodes: number) => {
    setEditedValues(prev => {
      const currentCodes = prev[activityId]?.completedCodes || [];
      const newCodes = currentCodes.includes(code)
        ? currentCodes.filter(c => c !== code)
        : [...currentCodes, code];
      
      const newPercent = totalCodes > 0 ? ((newCodes.length / totalCodes) * 100).toFixed(1) : '0';
      
      return {
        ...prev,
        [activityId]: {
          ...prev[activityId],
          percent: newPercent,
          completedCodes: newCodes,
        }
      };
    });
  };



  const toggleRowExpanded = (activityId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(activityId)) {
        newSet.delete(activityId);
      } else {
        newSet.add(activityId);
      }
      return newSet;
    });
  };

  const changeDate = (days: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + days);
    setSelectedDate(current.toISOString().split('T')[0]);
  };

  const handleSaveAll = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const activitiesToSave = Object.keys(editedValues).filter(id => {
        const val = editedValues[id];
        return val.percent !== '' || (val.completedCodes && val.completedCodes.length > 0);
      });

      if (activitiesToSave.length === 0) {
        throw new Error("No hay cambios para guardar.");
      }

      const allActiveActivities = activeActivitiesByPartida.flatMap(p => 
        p.items.flatMap(i => i.activities)
      );

      // Validations
      for (const activityId of activitiesToSave) {
        const act = allActiveActivities.find(a => a.id === activityId);

        if (act) {
          const proposedPercent = parseFloat(editedValues[activityId].percent);
          const previousTodayPercent = act.existingTodayPercent ? Number(act.existingTodayPercent) : 0;
          const accumulatedWithoutToday = act.totalProgress - previousTodayPercent;

          if (accumulatedWithoutToday + proposedPercent > 100) {
            throw new Error(`Progreso inválido en "${act.name}". Acumulado > 100%.`);
          }
        }
      }

      const promises = activitiesToSave.map(async (activityId) => {
        const { percent, completedCodes } = editedValues[activityId] || {};
        const activityInfo = allActiveActivities.find(a => a.id === activityId);

        const finalPercent = percent !== '' && percent !== undefined 
          ? parseFloat(percent) 
          : (activityInfo?.existingTodayPercent || 0);
        const finalCodes = completedCodes ? completedCodes.join(',') : null;

        const { error: insertError } = await supabase
          .from('daily_progress')
          .upsert(
            {
              activity_id: activityId,
              date: selectedDate,
              progress_percent: finalPercent,
              created_by: user?.id,
              completed_codes: finalCodes
            },
            { onConflict: 'activity_id,date' }
          );

        if (insertError) {
          console.warn("Primary upsert failed, trying fallback without completed_codes:", insertError.message);
          // Fallback without completed_codes
          const { error: fallbackError } = await supabase
            .from('daily_progress')
            .upsert(
              {
                activity_id: activityId,
                date: selectedDate,
                progress_percent: finalPercent,
                created_by: user?.id,
              },
              { onConflict: 'activity_id,date' }
            );
          
          if (fallbackError) throw fallbackError;
        }
      });

      await Promise.all(promises);
      
      setSuccess(true);
      setEditedValues({});
      setExpandedRows(new Set());
      triggerProjectAlerts(projectId).catch(console.error);
      
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
      
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Error al guardar los avances.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-col gap-6">
      {/* HEADER / PULSE CONTROL */}
      <div className="glass-card p-6 flex flex-col md:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => changeDate(-1)} className="p-2 hover:bg-surface-800 rounded-full transition-colors" title="Día anterior">
            <svg className="w-5 h-5 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex flex-col items-center">
            <label className="text-xs font-semibold tracking-wider text-surface-200/60 uppercase mb-1">Pulso del Día</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-lg font-bold text-surface-100 outline-none text-center cursor-pointer"
              />
            </div>
          </div>
          <button onClick={() => changeDate(1)} className="p-2 hover:bg-surface-800 rounded-full transition-colors" title="Día siguiente">
            <svg className="w-5 h-5 text-surface-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="flex-1 max-w-md w-full">
          <div className="flex justify-between text-xs mb-1.5 font-medium">
            <span className="text-surface-200">Progreso de registro hoy</span>
            <span className="text-accent-400">{registeredTodayCount} / {flatActiveActivitiesCount} activas</span>
          </div>
          <div className="w-full bg-surface-800 rounded-full h-2.5 overflow-hidden">
            <div 
              className="bg-accent-400 h-2.5 rounded-full transition-all duration-500" 
              style={{ width: `${flatActiveActivitiesCount > 0 ? (registeredTodayCount / flatActiveActivitiesCount) * 100 : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveAll} 
            disabled={loading || Object.keys(editedValues).length === 0}
            className="btn-primary flex items-center gap-2 whitespace-nowrap"
          >
            {loading ? <span className="spinner w-4 h-4 border-2" /> : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            )}
            Guardar Cambios
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-danger-500/10 border border-danger-500/20 text-danger-400 text-sm flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-success-500/10 border border-success-500/20 text-success-500 text-sm flex items-center gap-3">
           <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
           Avances guardados correctamente.
        </div>
      )}

      {/* COMPACT TABLE */}
      <div className="glass-card overflow-hidden">
        {activeActivitiesByPartida.length === 0 ? (
          <div className="p-12 text-center text-surface-200">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <p>No hay actividades programadas para esta fecha.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-800/50 border-b border-surface-700/50 text-xs font-semibold text-surface-200 uppercase tracking-wider">
                  <th className="py-3 px-4">Actividad</th>
                  <th className="py-3 px-4 w-24 text-center">Peso</th>
                  <th className="py-3 px-4 w-32 border-l border-surface-700/30 text-center">Acumulado</th>
                  <th className="py-3 px-4 w-40 text-center bg-accent-400/5 text-accent-400/80">Hoy (%)</th>
                  <th className="py-3 px-4 w-28 text-center text-surface-300">Marcar</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {activeActivitiesByPartida.map((partida: DecoratedPartida) => (
                  <React.Fragment key={partida.id}>
                    {/* Partida Header */}
                    <tr>
                      <td colSpan={5} className="py-2 px-4 bg-primary-600 border-y border-primary-700/50">
                        <span className="font-bold text-white text-xs tracking-wider uppercase">{partida.name}</span>
                      </td>
                    </tr>
                    
                    {partida.items.map((item: DecoratedItem) => (
                      <React.Fragment key={item.id}>
                        {/* Item line */}
                        <tr>
                           <td colSpan={5} className="py-1.5 px-4 bg-surface-800/80 pl-6 border-b border-surface-700/50">
                             <span className="font-semibold text-surface-200 text-xs">{item.name}</span>
                           </td>
                        </tr>

                        {/* Activities */}
                        {item.activities.map((activity: DecoratedActivity) => {
                          const isExpanded = expandedRows.has(activity.id);
                          const editState = editedValues[activity.id];
                          const hasUnsavedChanges = editState?.percent !== undefined || (editState?.completedCodes && editState.completedCodes.length > 0);
                          const displayPercent = editState?.percent !== undefined 
                            ? editState.percent 
                            : (activity.existingTodayPercent !== null ? activity.existingTodayPercent.toString() : '');
                          const trClass = `hover:bg-surface-800/30 transition-colors border-b border-l-4 border-l-transparent border-surface-700/50 ${hasUnsavedChanges ? 'bg-accent-400/5' : ''}`;

                          return (
                            <React.Fragment key={activity.id}>
                              <tr className={trClass}>
                                <td className="py-3 px-4 pl-6">
                                  <div className="flex items-center gap-2">
                                    <span className="text-surface-100 font-medium">{activity.name}</span>
                                    {hasUnsavedChanges && <span className="w-1.5 h-1.5 rounded-full bg-accent-400"></span>}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center text-surface-200 font-mono text-xs">
                                  {activity.weight}
                                </td>
                                <td className="py-3 px-4 text-center border-l border-surface-700/30">
                                  <span className="px-2 py-1 rounded-md bg-surface-800 text-surface-200 text-xs font-semibold">
                                    {activity.totalProgress.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="py-2 px-4 bg-accent-400/5 text-center">
                                  <div className="flex items-center justify-center gap-2">
                                    <input 
                                      type="number" 
                                      min="0" max="100" step="0.5"
                                      placeholder="0"
                                      value={displayPercent}
                                      onChange={(e) => handlePercentChange(activity.id, e.target.value)}
                                      className="w-16 h-8 text-center text-sm font-semibold rounded-md bg-white border border-surface-600 focus:border-accent-400 focus:ring-1 focus:ring-accent-400 outline-none transition-colors text-surface-100"
                                    />
                                    <span className="text-surface-300 font-bold">%</span>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <button 
                                    onClick={() => toggleRowExpanded(activity.id)}
                                    className={`p-1.5 rounded-md transition-colors relative ${isExpanded ? 'bg-surface-700 text-surface-100' : 'text-surface-300 hover:bg-surface-800 hover:text-surface-200'}`}
                                    title="Marcar códigos"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                                    {editState?.completedCodes && editState.completedCodes.length > 0 && (
                                       <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent-400 rounded-full border border-surface-900"></span>
                                    )}
                                  </button>
                                </td>
                              </tr>
                              
                              {/* Expanded Row for Codes */}
                              {isExpanded && (
                                <tr className="bg-surface-800/50 border-b border-surface-700/50">
                                  <td colSpan={5} className="py-4 px-8">
                                    <div className="bg-surface-900 p-6 rounded-xl border border-surface-700/50 shadow-inner mt-2">
                                        <div className="p-4 bg-surface-800 rounded-xl border border-surface-700/50">
                                          <label className="block text-xs font-black text-accent-400 uppercase tracking-widest mb-4 text-center">Marcado de Códigos atendidos</label>
                                          <div className="space-y-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                                            {[
                                              { label: 'Poleas', codes: project.codigos_poleas },
                                              { label: 'Cascos', codes: project.codigos_cascos },
                                              { label: 'Rodamientos', codes: project.codigos_rodamientos },
                                              { label: 'Cáncamos', codes: project.codigos_cancamos },
                                              { label: 'Pines', codes: project.codigos_pines },
                                            ].map((cat, catIdx) => {
                                              const codeList = cat.codes ? cat.codes.split(',').filter(c => c.trim()) : [];
                                              if (codeList.length === 0) return null;

                                              // Calculate project total codes for percentage
                                              const totalProjCodes = (project.codigos_poleas?.split(',').filter(c => c.trim()).length || 0) +
                                                                     (project.codigos_cascos?.split(',').filter(c => c.trim()).length || 0) +
                                                                     (project.codigos_rodamientos?.split(',').filter(c => c.trim()).length || 0) +
                                                                     (project.codigos_cancamos?.split(',').filter(c => c.trim()).length || 0) +
                                                                     (project.codigos_pines?.split(',').filter(c => c.trim()).length || 0);

                                              return (
                                                <div key={catIdx} className="space-y-3">
                                                  <span className="text-[10px] font-black text-surface-200/50 uppercase tracking-tighter border-b border-surface-700 pb-1 block">{cat.label}</span>
                                                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
                                                    {codeList.map((code, codeIdx) => {
                                                      const isChecked = editState?.completedCodes 
                                                        ? editState.completedCodes.includes(code)
                                                        : (dailyProgress.find(dp => dp.activity_id === activity.id && dp.date === selectedDate)?.completed_codes?.split(',') || []).includes(code);

                                                      return (
                                                        <label key={codeIdx} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-all border ${isChecked ? 'bg-accent-400/10 border-accent-400/30 text-accent-400 shadow-sm' : 'bg-surface-900/50 border-surface-700 hover:border-surface-600 text-surface-200'}`}>
                                                          <input 
                                                            type="checkbox" 
                                                            checked={isChecked}
                                                            onChange={() => handleCodeToggle(activity.id, code, totalProjCodes)}
                                                            className="w-3.5 h-3.5 accent-accent-400 rounded"
                                                          />
                                                          <span className="text-[11px] font-bold truncate">{code}</span>
                                                        </label>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
