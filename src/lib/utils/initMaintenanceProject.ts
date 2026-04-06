import { createClient } from '@/lib/supabase/client';
import { MAINTENANCE_STAGES } from '@/lib/types';

/**
 * Initializes the 17 maintenance stages for a newly created project.
 * Uses placeholder dates (start_date = end_date = project start_date).
 * The user will manually configure these dates later in the Gantt.
 */
export async function initializeMaintenanceStages(projectId: string, projectStartDate: string) {
  const supabase = createClient();

  // 1. Create the single fixed Partida
  const { data: partida, error: partidaError } = await supabase
    .from('partidas')
    .insert({
      project_id: projectId,
      name: 'ETAPA DE MANTENIMIENTO',
      sort_order: 0
    })
    .select()
    .single();

  if (partidaError || !partida) {
    throw new Error('No se pudo crear la etapa principal de mantenimiento');
  }

  // 2. Create the single fixed Item
  const { data: item, error: itemError } = await supabase
    .from('items')
    .insert({
      partida_id: partida.id,
      name: 'PROCESO COMPLETO',
      sort_order: 0
    })
    .select()
    .single();

  if (itemError || !item) {
    throw new Error('No se pudo crear el item de proceso');
  }

  // 3. Create the 17 fixed Activities
  const activitiesToInsert = MAINTENANCE_STAGES.map((stageName, index) => ({
    item_id: item.id,
    name: stageName,
    start_date: projectStartDate,
    end_date: projectStartDate,
    weight: 1.0,
    sort_order: index
  }));

  const { error: actError } = await supabase
    .from('activities')
    .insert(activitiesToInsert);

  if (actError) {
    throw new Error('No se pudieron inicializar las etapas obligatorias');
  }
}
